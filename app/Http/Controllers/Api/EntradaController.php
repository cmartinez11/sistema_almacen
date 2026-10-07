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
            'requerimiento_id' => 'nullable|exists:requerimientos,id',
            'personal_id' => 'required|exists:personal,id',
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
            $cabecera = DB::transaction(function () use ($validated) {
                // 1. Guardar cabecera de la entrada
                $cabecera = EntradaCabecera::create([
                    'requerimiento_id' => $validated['requerimiento_id'] ?? null,
                    'personal_id' => $validated['personal_id'],
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

                    $stockAnterior = (float) $producto->stock_actual;
                    $costoAnterior = (float) $producto->costo_unitario;

                    $stockNuevo = $stockAnterior + $cantidad;

                    // Cálculo del Costo Promedio Ponderado
                    $valorTotalAnterior = $stockAnterior * $costoAnterior;
                    $valorTotalNuevo = $valorTotalAnterior + $costoTotal;
                    $nuevoCostoUnitario = $stockNuevo > 0 ? ($valorTotalNuevo / $stockNuevo) : $costoUnitarioIngresado;

                    // Actualización automática de stock y costo promedio en Producto
                    $producto->update([
                        'stock_actual' => $stockNuevo,
                        'costo_unitario' => $nuevoCostoUnitario,
                    ]);

                    // Registro inmutable en Kardex
                    Kardex::create([
                        'producto_id' => $producto->id,
                        'fecha_hora' => $validated['fecha_emision'],
                        'tipo_operacion' => 'ENTRADA',
                        'documento_referencia_id' => $cabecera->id,
                        'stock_anterior' => $stockAnterior,
                        'cantidad_movimiento' => $cantidad,
                        'stock_actual' => $stockNuevo,
                        'costo_unitario' => $costoUnitarioIngresado,
                        'costo_total_movimiento' => $costoTotal,
                        'saldo_valorizado_total' => $valorTotalNuevo,
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
                'data' => $cabecera->load(['personal', 'proveedor', 'entradasDetalle.producto']),
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

        $pdf = Pdf::loadView('pdf.nota_ingreso', compact('entrada'))
            ->setPaper('a4', 'portrait');

        return $pdf->stream("NotaIngreso_{$entrada->correlativo}.pdf");
    }
}
