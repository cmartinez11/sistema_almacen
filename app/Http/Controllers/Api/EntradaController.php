<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EntradaCabecera;
use App\Models\EntradaDetalle;
use App\Models\Kardex;
use App\Models\Producto;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class EntradaController extends Controller
{
    /**
     * Listar notas de ingreso con sus relaciones.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 20);

        $entradas = EntradaCabecera::with([
            'user',
            'personal',
            'proveedor',
            'requerimiento',
            'entradasDetalle.producto',
        ])->latest()->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $entradas,
        ], 200);
    }

    /**
     * Registrar una nueva Nota de Ingreso (NI) dentro de una transacción DB.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'almacen_id' => 'nullable|exists:almacenes,id',
            'requerimiento_id' => 'nullable|exists:requerimientos,id',
            'personal_id' => 'nullable|exists:personal,id',
            'user_id' => 'nullable|exists:users,id',
            'proveedor_id' => 'required|exists:proveedores,id',
            'tipo_comprobante' => 'required|string|max:100',
            'numero_comprobante' => 'required|string|max:100',
            'fecha_emision' => 'required|date',
            'observaciones' => 'nullable|string',
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|exists:productos,id',
            'detalles.*.cantidad' => 'required|numeric|gt:0',
            'detalles.*.costo_unitario' => 'required|numeric|min:0',
        ]);

        try {
            $cabecera = DB::transaction(function () use ($validated, $request) {
                $almacenId = (int) ($validated['almacen_id'] ?? 1);

                // Determinar dinámicamente el usuario autenticado actual o el user_id enviado desde el frontend
                $authUser = $request->user() ?? auth()->user();
                $userId = $authUser?->id ?? $validated['user_id'] ?? null;
                $personalId = $validated['personal_id'] ?? null;

                // Si viene un userId de la tabla 'users':
                if ($userId) {
                    $userMatch = \App\Models\User::find($userId);
                    if ($userMatch) {
                        $userId = $userMatch->id;
                        $personalMatch = \App\Models\Personal::where('email', $userMatch->email)->first();
                        $personalId = $personalMatch ? $personalMatch->id : null;
                    }
                } elseif ($personalId) {
                    $personalMatch = \App\Models\Personal::find($personalId);
                    if ($personalMatch) {
                        $userMatch = \App\Models\User::where('email', $personalMatch->email)->first();
                        if ($userMatch) {
                            $userId = $userMatch->id;
                        }
                    }
                }

                if (!$userId && !$personalId) {
                    $firstUser = \App\Models\User::first();
                    $userId = $firstUser?->id;
                }

                // 1. Guardar cabecera de la entrada asociando almacen_id
                $cabecera = EntradaCabecera::create([
                    'almacen_id' => $almacenId,
                    'requerimiento_id' => $validated['requerimiento_id'] ?? null,
                    'user_id' => $userId,
                    'personal_id' => $personalId,
                    'proveedor_id' => $validated['proveedor_id'],
                    'tipo_comprobante' => $validated['tipo_comprobante'],
                    'numero_comprobante' => $validated['numero_comprobante'],
                    'fecha_emision' => $validated['fecha_emision'],
                    'observaciones' => $validated['observaciones'] ?? null,
                    'estado' => 'emitido',
                ]);

                // 2. Procesar cada detalle
                foreach ($validated['detalles'] as $item) {
                    $cantidad = (float) $item['cantidad'];
                    $costoUnitarioIngresado = (float) $item['costo_unitario'];
                    $costoTotal = $cantidad * $costoUnitarioIngresado;

                    EntradaDetalle::create([
                        'entrada_cabecera_id' => $cabecera->id,
                        'producto_id' => $item['producto_id'],
                        'cantidad' => $cantidad,
                        'costo_unitario' => $costoUnitarioIngresado,
                        'costo_total' => $costoTotal,
                    ]);

                    // Bloqueo pesimista para concurrencia
                    $producto = Producto::where('id', $item['producto_id'])
                        ->lockForUpdate()
                        ->first();

                    // Actualizar el inventario específico en la tabla almacen_producto
                    $pivot = DB::table('almacen_producto')
                        ->where('almacen_id', $almacenId)
                        ->where('producto_id', $item['producto_id'])
                        ->first();

                    $stockAnteriorAlm = $pivot ? (float) $pivot->stock : 0;
                    $costoAnteriorAlm = $pivot ? (float) $pivot->costo_unitario : (float) $producto->costo_unitario;
                    $stockNuevoAlm = $stockAnteriorAlm + $cantidad;
                    $valorTotalAnteriorAlm = $stockAnteriorAlm * $costoAnteriorAlm;
                    $valorTotalNuevoAlm = $valorTotalAnteriorAlm + $costoTotal;
                    $nuevoCostoUnitarioAlm = $stockNuevoAlm > 0 ? ($valorTotalNuevoAlm / $stockNuevoAlm) : $costoUnitarioIngresado;

                    if ($pivot) {
                        DB::table('almacen_producto')
                            ->where('id', $pivot->id)
                            ->update([
                                'stock' => $stockNuevoAlm,
                                'costo_unitario' => $nuevoCostoUnitarioAlm,
                                'updated_at' => now(),
                            ]);
                    } else {
                        DB::table('almacen_producto')->insert([
                            'almacen_id' => $almacenId,
                            'producto_id' => $item['producto_id'],
                            'stock' => $stockNuevoAlm,
                            'costo_unitario' => $nuevoCostoUnitarioAlm,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }

                    // Actualizar el stock total sumando la existencia de todos los almacenes
                    $stockTotalGlobal = (float) DB::table('almacen_producto')->where('producto_id', $producto->id)->sum('stock');
                    $producto->update([
                        'stock_actual' => $stockTotalGlobal,
                        'costo_unitario' => $nuevoCostoUnitarioAlm,
                    ]);

                    // Registro inmutable en Kardex por almacén
                    Kardex::create([
                        'almacen_id' => $almacenId,
                        'producto_id' => $producto->id,
                        'fecha_hora' => $validated['fecha_emision'],
                        'tipo_operacion' => 'ENTRADA',
                        'documento_referencia_id' => $cabecera->id,
                        'stock_anterior' => $stockAnteriorAlm,
                        'cantidad_movimiento' => $cantidad,
                        'stock_actual' => $stockNuevoAlm,
                        'costo_unitario' => $costoUnitarioIngresado,
                        'costo_total_movimiento' => $costoTotal,
                        'saldo_valorizado_total' => $valorTotalNuevoAlm,
                    ]);
                }

                // 3. Control de Cantidades Parciales y Faltantes para el Requerimiento / OC vinculado
                if (!empty($validated['requerimiento_id'])) {
                    $requerimiento = \App\Models\Requerimiento::with('detalles')->find($validated['requerimiento_id']);
                    if ($requerimiento) {
                        $esParcial = false;
                        foreach ($requerimiento->detalles as $reqDetalle) {
                            $totalIngresadoItem = EntradaDetalle::whereHas('entradaCabecera', function ($q) use ($requerimiento) {
                                $q->where('requerimiento_id', $requerimiento->id);
                            })->where('producto_id', $reqDetalle->producto_id)->sum('cantidad');

                            if ((float) $totalIngresadoItem < (float) $reqDetalle->cantidad_solicitada) {
                                $esParcial = true;
                            }
                        }

                        $requerimiento->update([
                            'estado' => $esParcial ? 'parcial' : 'cerrado',
                        ]);
                    }
                }

                return $cabecera;
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Nota de Ingreso registrada correctamente y stock/costos actualizados.',
                'data' => $cabecera->load(['user', 'personal', 'proveedor', 'entradasDetalle.producto']),
            ], 201);

        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error transaccional al registrar la entrada: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Mostrar detalle de una Nota de Ingreso.
     */
    public function show(string $id): JsonResponse
    {
        $entrada = EntradaCabecera::with([
            'user',
            'personal',
            'proveedor',
            'entradasDetalle.producto',
        ])->find($id);

        if (!$entrada) {
            return response()->json([
                'status' => 'error',
                'message' => 'Nota de ingreso no encontrada',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $entrada,
        ], 200);
    }

    /**
     * Generar y descargar/visualizar la Nota de Ingreso de Almacén en formato PDF.
     */
    public function exportPdf(string $id)
    {
        $entrada = EntradaCabecera::with([
            'user',
            'personal',
            'proveedor',
            'requerimiento.detalles',
            'entradasDetalle.producto.unidadMedida',
        ])->find($id);

        if (!$entrada) {
            return response()->json([
                'status' => 'error',
                'message' => 'Nota de ingreso no encontrada',
            ], 404);
        }

        // Calcular cantidad acumulada física recibida históricamente hasta esta Nota de Ingreso (inclusive)
        if ($entrada->requerimiento_id) {
            foreach ($entrada->entradasDetalle as $det) {
                $acumulado = EntradaDetalle::whereHas('entradaCabecera', function ($q) use ($entrada) {
                    $q->where('requerimiento_id', $entrada->requerimiento_id)
                      ->where('id', '<=', $entrada->id);
                })->where('producto_id', $det->producto_id)->sum('cantidad');

                $det->total_acumulado = (float) $acumulado;
            }
        }

        $pdf = Pdf::loadView('pdf.nota_ingreso', compact('entrada'))
            ->setPaper('a4', 'portrait');

        return $pdf->stream("NotaIngreso_{$entrada->correlativo}.pdf");
    }
}
