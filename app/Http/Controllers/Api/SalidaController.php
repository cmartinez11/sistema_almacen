<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kardex;
use App\Models\Producto;
use App\Models\SalidaCabecera;
use App\Models\SalidaDetalle;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class SalidaController extends Controller
{
    /**
     * Listar notas de salida con asignación a personal.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 20);

        $salidas = SalidaCabecera::with([
            'personal',
            'almacen',
            'salidasDetalle.producto',
        ])->latest()->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $salidas,
        ], 200);
    }

    /**
     * Registrar una nueva Nota de Salida (NS) con asignación automática de fecha, área y control por almacén.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'almacen_id' => 'nullable|exists:almacenes,id',
            'personal_id' => 'required|exists:personal,id',
            'area_trabajador' => 'nullable|string|max:150',
            'area_destino' => 'nullable|string|max:150',
            'justificacion' => 'nullable|string',
            'observaciones' => 'nullable|string',
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|exists:productos,id',
            'detalles.*.cantidad' => 'required|numeric|gt:0',
            'detalles.*.precio_unitario' => 'nullable|numeric|min:0',
        ]);

        try {
            $cabecera = DB::transaction(function () use ($validated) {
                $almacenId = (int) ($validated['almacen_id'] ?? 1);

                // Obtener trabajador seleccionado para recuperar automáticamente su área base de personal
                $personal = \App\Models\Personal::findOrFail($validated['personal_id']);
                $areaTrabajador = !empty($validated['area_trabajador'])
                    ? trim($validated['area_trabajador'])
                    : (!empty($personal->area) ? trim($personal->area) : 'General');

                // Área de destino / centro de costo especificado (por defecto el área base si no se indicó)
                $areaDestino = !empty($validated['area_destino'])
                    ? trim($validated['area_destino'])
                    : $areaTrabajador;

                $justificacion = !empty($validated['justificacion']) ? trim($validated['justificacion']) : null;
                $fechaEmisionAuto = now();
                $destinoAuto = "Asignación a " . $areaDestino;
                $tipoSalidaAuto = 'Asignación a Personal';

                // 1. VALIDACIÓN PREVIA DE STOCK POR ALMACÉN EN BASE DE DATOS
                foreach ($validated['detalles'] as $item) {
                    $producto = Producto::where('id', $item['producto_id'])
                        ->lockForUpdate()
                        ->first();

                    $pivot = DB::table('almacen_producto')
                        ->where('almacen_id', $almacenId)
                        ->where('producto_id', $item['producto_id'])
                        ->first();

                    $stockDisponibleAlm = $pivot ? (float) $pivot->stock : 0;
                    $cantidadSolicitada = (float) $item['cantidad'];

                    if ($stockDisponibleAlm < $cantidadSolicitada) {
                        $almNombre = DB::table('almacenes')->where('id', $almacenId)->value('nombre') ?? 'Almacén';
                        throw new \Exception(
                            "Stock insuficiente en '{$almNombre}' para el producto '{$producto->nombre}'. " .
                            "Stock disponible en este almacén: {$stockDisponibleAlm} u., Cantidad requerida: {$cantidadSolicitada} u."
                        );
                    }
                }

                // 2. Crear cabecera de salida con trazabilidad completa de áreas y justificación
                $cabecera = SalidaCabecera::create([
                    'almacen_id' => $almacenId,
                    'personal_id' => $personal->id,
                    'area_trabajador' => $areaTrabajador,
                    'area_destino' => $areaDestino,
                    'justificacion' => $justificacion,
                    'destino_cliente' => $destinoAuto,
                    'tipo_salida' => $tipoSalidaAuto,
                    'numero_referencia' => null,
                    'fecha_emision' => $fechaEmisionAuto,
                    'observaciones' => $validated['observaciones'] ?? $justificacion,
                    'estado' => 'emitido',
                ]);

                // 3. Registrar detalles y descontar stock por almacén automáticamente
                foreach ($validated['detalles'] as $item) {
                    $producto = Producto::where('id', $item['producto_id'])->first();
                    $cantidad = (float) $item['cantidad'];
                    $costoUnitario = (float) ($item['precio_unitario'] ?? $producto->costo_unitario);
                    $costoTotal = $cantidad * $costoUnitario;

                    SalidaDetalle::create([
                        'salida_cabecera_id' => $cabecera->id,
                        'producto_id' => $item['producto_id'],
                        'cantidad' => $cantidad,
                        'precio_unitario' => $costoUnitario,
                        'precio_total' => $costoTotal,
                    ]);

                    $pivot = DB::table('almacen_producto')
                        ->where('almacen_id', $almacenId)
                        ->where('producto_id', $item['producto_id'])
                        ->first();

                    $stockAnteriorAlm = $pivot ? (float) $pivot->stock : 0;
                    $stockNuevoAlm = max(0, $stockAnteriorAlm - $cantidad);

                    if ($pivot) {
                        DB::table('almacen_producto')
                            ->where('id', $pivot->id)
                            ->update([
                                'stock' => $stockNuevoAlm,
                                'updated_at' => now(),
                            ]);
                    }

                    // Actualizar el stock total sumando la existencia de todos los almacenes
                    $stockTotalGlobal = (float) DB::table('almacen_producto')->where('producto_id', $producto->id)->sum('stock');
                    $producto->update([
                        'stock_actual' => $stockTotalGlobal,
                    ]);

                    // Registrar en Kardex auditoría con la fecha auto-generada
                    Kardex::create([
                        'almacen_id' => $almacenId,
                        'producto_id' => $producto->id,
                        'fecha_hora' => $fechaEmisionAuto,
                        'tipo_operacion' => 'SALIDA',
                        'documento_referencia_id' => $cabecera->id,
                        'stock_anterior' => $stockAnteriorAlm,
                        'cantidad_movimiento' => $cantidad,
                        'stock_actual' => $stockNuevoAlm,
                        'costo_unitario' => $costoUnitario,
                        'costo_total_movimiento' => $costoTotal,
                        'saldo_valorizado_total' => $stockNuevoAlm * (float) $producto->costo_unitario,
                    ]);
                }

                return $cabecera;
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Nota de Salida y asignación a personal registrada correctamente.',
                'data' => $cabecera->load(['personal', 'almacen', 'salidasDetalle.producto']),
            ], 201);

        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al procesar la salida: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Mostrar una Nota de Salida.
     */
    public function show(string $id): JsonResponse
    {
        $salida = SalidaCabecera::with([
            'personal',
            'almacen',
            'salidasDetalle.producto',
        ])->find($id);

        if (!$salida) {
            return response()->json([
                'status' => 'error',
                'message' => 'Nota de salida no encontrada',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $salida,
        ], 200);
    }

    /**
     * Generar y descargar/visualizar la Nota de Salida / Asignación a Personal en PDF.
     */
    public function exportPdf(string $id)
    {
        $salida = SalidaCabecera::with([
            'personal',
            'almacen',
            'salidasDetalle.producto.unidadMedida',
        ])->find($id);

        if (!$salida) {
            return response()->json([
                'status' => 'error',
                'message' => 'Nota de salida no encontrada',
            ], 404);
        }

        $pdf = Pdf::loadView('pdf.nota_salida', compact('salida'))
            ->setPaper('a4', 'portrait');

        return $pdf->stream("NotaSalida_{$salida->id}.pdf");
    }
}
