<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kardex;
use App\Models\Producto;
use App\Models\SalidaCabecera;
use App\Models\SalidaDetalle;
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
            'salidasDetalle.producto',
        ])->latest()->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $salidas,
        ], 200);
    }

    /**
     * Registrar una nueva Nota de Salida (NS) con validación estricta de stock y asignación a personal.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'personal_id' => 'required|exists:personal,id',
            'destino_cliente' => 'nullable|string|max:255',
            'tipo_salida' => 'required|string|max:100',
            'numero_referencia' => 'nullable|string|max:100',
            'fecha_emision' => 'required|date',
            'observaciones' => 'nullable|string',
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|exists:productos,id',
            'detalles.*.cantidad' => 'required|numeric|gt:0',
            'detalles.*.precio_unitario' => 'nullable|numeric|min:0',
        ]);

        try {
            $cabecera = DB::transaction(function () use ($validated) {
                // 1. VALIDACIÓN PREVIA DE STOCK EN BASE DE DATOS CON LOCK FOR UPDATE
                foreach ($validated['detalles'] as $item) {
                    $producto = Producto::where('id', $item['producto_id'])
                        ->lockForUpdate()
                        ->first();

                    $stockDisponible = (float) $producto->stock_actual;
                    $cantidadSolicitada = (float) $item['cantidad'];

                    if ($stockDisponible < $cantidadSolicitada) {
                        throw new \Exception(
                            "Stock insuficiente para el producto '{$producto->nombre}'. " .
                            "Stock disponible actual: {$stockDisponible}, Cantidad requerida: {$cantidadSolicitada}"
                        );
                    }
                }

                // 2. Crear cabecera de salida asignada al trabajador (personal_id)
                $cabecera = SalidaCabecera::create([
                    'personal_id' => $validated['personal_id'],
                    'destino_cliente' => $validated['destino_cliente'] ?? 'Uso Interno / Personal',
                    'tipo_salida' => $validated['tipo_salida'],
                    'numero_referencia' => $validated['numero_referencia'] ?? null,
                    'fecha_emision' => $validated['fecha_emision'],
                    'observaciones' => $validated['observaciones'] ?? null,
                    'estado' => 'emitido',
                ]);

                // 3. Registrar detalles y descontar stock automáticamente
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

                    $stockAnterior = (float) $producto->stock_actual;
                    $stockNuevo = $stockAnterior - $cantidad;

                    // Descontar del stock actual
                    $producto->update([
                        'stock_actual' => $stockNuevo,
                    ]);

                    // Registrar en Kardex auditoría
                    Kardex::create([
                        'producto_id' => $producto->id,
                        'fecha_hora' => $validated['fecha_emision'],
                        'tipo_operacion' => 'SALIDA',
                        'documento_referencia_id' => $cabecera->id,
                        'stock_anterior' => $stockAnterior,
                        'cantidad_movimiento' => $cantidad,
                        'stock_actual' => $stockNuevo,
                        'costo_unitario' => $costoUnitario,
                        'costo_total_movimiento' => $costoTotal,
                        'saldo_valorizado_total' => $stockNuevo * (float) $producto->costo_unitario,
                    ]);
                }

                return $cabecera;
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Nota de Salida y asignación a personal registrada correctamente.',
                'data' => $cabecera->load(['personal', 'salidasDetalle.producto']),
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
}
