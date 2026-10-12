<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\InventarioFisico;
use App\Models\InventarioFisicoDetalle;
use App\Models\Kardex;
use App\Models\Producto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Throwable;

class InventarioFisicoController extends Controller
{
    /**
     * Listar tomas de inventario físico.
     */
    public function index(Request $request): JsonResponse
    {
        $almacenId = $request->input('almacen_id')
            ?? $request->header('X-Almacen-Id')
            ?? $request->attributes->get('active_almacen_id');

        $query = InventarioFisico::with([
            'almacen',
            'user',
            'detalles.producto.unidadMedida',
        ])->orderBy('id', 'desc');

        if ($almacenId) {
            $query->where('almacen_id', $almacenId);
        }

        $inventarios = $query->paginate($request->input('per_page', 20));

        return response()->json([
            'status' => 'success',
            'data' => $inventarios,
        ], 200);
    }

    /**
     * Registrar e implementar la toma de inventario físico con ajuste automático en Kardex.
     */
    public function store(Request $request): JsonResponse
    {
        $authUser = $request->user() ?? Auth::user();
        $rolNombre = strtolower($authUser?->rol?->nombre ?? '');
        if ($rolNombre && !in_array($rolNombre, ['administrador', 'admin', 'gerencia'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Acceso denegado: los almaceneros operativos no tienen autorización para realizar ajustes manuales de stock. La trazabilidad debe regirse únicamente por Notas de Ingreso, Salidas y Transferencias.',
            ], 403);
        }

        $validated = $request->validate([
            'almacen_id' => 'required|exists:almacenes,id',
            'observaciones' => 'nullable|string',
            'estado' => 'nullable|in:borrador,aplicado',
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|exists:productos,id',
            'detalles.*.stock_fisico' => 'required|numeric|min:0',
        ], [
            'almacen_id.required' => 'Debe seleccionar un almacén para el conteo de inventario.',
            'detalles.required' => 'Debe agregar al menos un producto a la lista de conteo.',
        ]);

        try {
            $inventario = DB::transaction(function () use ($validated, $request) {
                $almacenId = (int) $validated['almacen_id'];
                $estado = $validated['estado'] ?? 'aplicado';
                $now = now();

                // Generar correlativo único INV-2026-XXXX
                $year = date('Y');
                $ultimo = InventarioFisico::whereYear('created_at', $year)->max('id') ?? 0;
                $correlativo = sprintf('INV-%s-%04d', $year, $ultimo + 1);

                $authUser = $request->user() ?? Auth::user();

                // 1. Crear cabecera de Inventario Físico
                $inventario = InventarioFisico::create([
                    'correlativo' => $correlativo,
                    'almacen_id' => $almacenId,
                    'user_id' => $authUser?->id,
                    'fecha' => $now,
                    'estado' => $estado,
                    'observaciones' => $validated['observaciones'] ?? null,
                ]);

                // 2. Procesar detalles y calcular diferencias respecto al stock en sistema
                foreach ($validated['detalles'] as $item) {
                    $productoId = $item['producto_id'];
                    $stockFisico = (float) $item['stock_fisico'];

                    $producto = Producto::lockForUpdate()->find($productoId);

                    // Consultar stock actual del sistema en el almacén específico
                    $pivot = DB::table('almacen_producto')
                        ->where('almacen_id', $almacenId)
                        ->where('producto_id', $productoId)
                        ->first();

                    $stockSistema = $pivot ? (float) $pivot->stock : 0;
                    $costoUnitario = $pivot ? (float) $pivot->costo_unitario : (float) $producto->costo_unitario;
                    $diferencia = $stockFisico - $stockSistema;

                    // Crear detalle del conteo
                    InventarioFisicoDetalle::create([
                        'inventario_fisico_id' => $inventario->id,
                        'producto_id' => $productoId,
                        'stock_sistema' => $stockSistema,
                        'stock_fisico' => $stockFisico,
                        'diferencia' => $diferencia,
                        'costo_unitario' => $costoUnitario,
                    ]);

                    // 3. Si el estado es 'aplicado', ejecutar el ajuste de inventario y Kardex inmediatamente
                    if ($estado === 'aplicado' && abs($diferencia) > 0.0001) {
                        $tipoOperacion = $diferencia > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO';
                        $cantidadMovimiento = abs($diferencia);

                        // Actualizar la tabla pivote almacen_producto con el stock físico real
                        if ($pivot) {
                            DB::table('almacen_producto')
                                ->where('id', $pivot->id)
                                ->update([
                                    'stock' => $stockFisico,
                                    'updated_at' => $now,
                                ]);
                        } else {
                            DB::table('almacen_producto')->insert([
                                'almacen_id' => $almacenId,
                                'producto_id' => $productoId,
                                'stock' => $stockFisico,
                                'costo_unitario' => $costoUnitario,
                                'created_at' => $now,
                                'updated_at' => $now,
                            ]);
                        }

                        // Actualizar el stock total sumando la existencia de todos los almacenes
                        $stockGlobal = (float) DB::table('almacen_producto')->where('producto_id', $productoId)->sum('stock');
                        $producto->update([
                            'stock_actual' => $stockGlobal,
                        ]);

                        // Registrar movimiento inmutable en Kardex
                        Kardex::create([
                            'almacen_id' => $almacenId,
                            'producto_id' => $productoId,
                            'fecha_hora' => $now,
                            'tipo_operacion' => $tipoOperacion,
                            'documento_referencia_id' => $inventario->id,
                            'stock_anterior' => $stockSistema,
                            'cantidad_movimiento' => $cantidadMovimiento,
                            'stock_actual' => $stockFisico,
                            'costo_unitario' => $costoUnitario,
                            'costo_total_movimiento' => $cantidadMovimiento * $costoUnitario,
                            'saldo_valorizado_total' => $stockFisico * $costoUnitario,
                        ]);
                    }
                }

                return $inventario;
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Inventario físico y ajuste de stock registrados correctamente.',
                'data' => $inventario->load(['almacen', 'user', 'detalles.producto.unidadMedida']),
            ], 201);

        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error transaccional al procesar el inventario físico: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Mostrar detalles de un inventario físico.
     */
    public function show(string $id): JsonResponse
    {
        $inventario = InventarioFisico::with([
            'almacen',
            'user',
            'detalles.producto.unidadMedida',
        ])->find($id);

        if (!$inventario) {
            return response()->json([
                'status' => 'error',
                'message' => 'Toma de inventario físico no encontrada',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $inventario,
        ], 200);
    }
}
