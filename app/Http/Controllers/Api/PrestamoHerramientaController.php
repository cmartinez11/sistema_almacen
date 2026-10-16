<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kardex;
use App\Models\PrestamoHerramienta;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PrestamoHerramientaController extends Controller
{
    /**
     * Listado filtrado y paginado con KPIs de préstamos de herramientas
     */
    public function index(Request $request)
    {
        try {
            // Actualizar préstamos vencidos automáticamente
            PrestamoHerramienta::where('estado', 'PENDIENTE_DEVOLUCION')
                ->whereDate('fecha_devolucion_estimada', '<', now()->toDateString())
                ->update(['estado' => 'VENCIDO']);

            $query = PrestamoHerramienta::with([
                'almacen',
                'trabajador',
                'producto.unidadMedida',
                'producto.categoria',
                'usuario',
            ]);

            // Filtro por Estado
            if ($request->filled('estado')) {
                $estado = strtoupper(trim($request->estado));
                if ($estado === 'PENDIENTES' || $estado === 'PENDIENTE_DEVOLUCION') {
                    $query->whereIn('estado', ['PENDIENTE_DEVOLUCION', 'VENCIDO']);
                } elseif ($estado === 'DEVUELTOS' || $estado === 'DEVUELTO') {
                    $query->where('estado', 'DEVUELTO');
                } elseif ($estado === 'VENCIDOS' || $estado === 'VENCIDO') {
                    $query->where('estado', 'VENCIDO');
                }
            }

            // Filtro por Almacén
            if ($request->filled('almacen_id')) {
                $query->where('almacen_id', $request->almacen_id);
            }

            // Buscador general (Código, Trabajador, DNI, Producto, SKU)
            if ($request->filled('search')) {
                $search = trim($request->search);
                $query->where(function ($q) use ($search) {
                    $q->where('codigo', 'ilike', "%{$search}%")
                        ->orWhere('observacion_prestamo', 'ilike', "%{$search}%")
                        ->orWhere('observacion_devolucion', 'ilike', "%{$search}%")
                        ->orWhereHas('trabajador', function ($qt) use ($search) {
                            $qt->where('nombres', 'ilike', "%{$search}%")
                                ->orWhere('apellidos', 'ilike', "%{$search}%")
                                ->orWhere('dni', 'ilike', "%{$search}%")
                                ->orWhere('area', 'ilike', "%{$search}%");
                        })
                        ->orWhereHas('producto', function ($qp) use ($search) {
                            $qp->where('nombre', 'ilike', "%{$search}%")
                                ->orWhere('sku', 'ilike', "%{$search}%");
                        });
                });
            }

            // KPIs generales sin filtro de paginación
            $kpis = [
                'activos' => PrestamoHerramienta::whereIn('estado', ['PENDIENTE_DEVOLUCION', 'VENCIDO'])->count(),
                'devueltos' => PrestamoHerramienta::where('estado', 'DEVUELTO')->count(),
                'vencidos' => PrestamoHerramienta::where('estado', 'VENCIDO')->count(),
                'total' => PrestamoHerramienta::count(),
            ];

            $prestamos = $query->orderBy('id', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $prestamos,
                'kpis' => $kpis,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al listar los préstamos: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Registrar un nuevo préstamo con descuento automático de stock
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'almacen_id' => 'required|exists:almacenes,id',
            'trabajador_id' => 'required|exists:personal,id',
            'producto_id' => 'required|exists:productos,id',
            'cantidad' => 'nullable|numeric|min:0.01',
            'fecha_prestamo' => 'nullable|date',
            'fecha_devolucion_estimada' => 'required|date',
            'observacion_prestamo' => 'nullable|string|max:1000',
        ]);

        try {
            $prestamo = DB::transaction(function () use ($validated, $request) {
                $almacenId = (int) $validated['almacen_id'];
                $productoId = (int) $validated['producto_id'];
                $cantidad = (float) ($validated['cantidad'] ?? 1);
                $fechaPrestamo = !empty($validated['fecha_prestamo']) ? $validated['fecha_prestamo'] : now();

                // 1. Bloquear y verificar stock de la herramienta en el almacén
                $producto = Producto::where('id', $productoId)->lockForUpdate()->firstOrFail();

                $pivot = DB::table('almacen_producto')
                    ->where('almacen_id', $almacenId)
                    ->where('producto_id', $productoId)
                    ->first();

                $stockDisponibleAlm = $pivot ? (float) $pivot->stock : 0;

                if ($stockDisponibleAlm < $cantidad) {
                    $almNombre = DB::table('almacenes')->where('id', $almacenId)->value('nombre') ?? 'Almacén';
                    throw new \Exception(
                        "Stock insuficiente en '{$almNombre}' para la herramienta '{$producto->nombre}'. " .
                        "Disponible: {$stockDisponibleAlm} u., Cantidad solicitada: {$cantidad} u."
                    );
                }

                // 2. Generar correlativo único (Ej. PRET-2026-0001)
                $year = date('Y');
                $count = PrestamoHerramienta::whereYear('created_at', $year)->count() + 1;
                $codigo = sprintf("PRET-%s-%04d", $year, $count);

                // Garantizar unicidad
                while (PrestamoHerramienta::where('codigo', $codigo)->exists()) {
                    $count++;
                    $codigo = sprintf("PRET-%s-%04d", $year, $count);
                }

                // 3. Descontar stock del almacén automáticamente
                $stockNuevoAlm = max(0, $stockDisponibleAlm - $cantidad);

                DB::table('almacen_producto')
                    ->where('id', $pivot->id)
                    ->update([
                        'stock' => $stockNuevoAlm,
                        'updated_at' => now(),
                    ]);

                // Actualizar stock global del producto
                $stockGlobal = (float) DB::table('almacen_producto')
                    ->where('producto_id', $producto->id)
                    ->sum('stock');

                $producto->update([
                    'stock_actual' => $stockGlobal,
                ]);

                // 4. Crear registro de préstamo
                $userId = Auth::id() ?? $request->user_id;

                $prestamo = PrestamoHerramienta::create([
                    'codigo' => $codigo,
                    'almacen_id' => $almacenId,
                    'trabajador_id' => $validated['trabajador_id'],
                    'producto_id' => $productoId,
                    'cantidad' => $cantidad,
                    'fecha_prestamo' => $fechaPrestamo,
                    'fecha_devolucion_estimada' => $validated['fecha_devolucion_estimada'],
                    'fecha_devolucion_real' => null,
                    'estado' => 'PENDIENTE_DEVOLUCION',
                    'observacion_prestamo' => $validated['observacion_prestamo'] ?? null,
                    'user_id' => $userId,
                ]);

                // 5. Registrar en Kardex como SALIDA_PRESTAMO para auditoría
                $costoUnitario = (float) ($producto->costo_unitario ?? 0);
                $costoTotal = $cantidad * $costoUnitario;

                Kardex::create([
                    'almacen_id' => $almacenId,
                    'producto_id' => $producto->id,
                    'fecha_hora' => now(),
                    'tipo_operacion' => 'SALIDA_PRESTAMO',
                    'documento_referencia_id' => $prestamo->id,
                    'stock_anterior' => $stockDisponibleAlm,
                    'cantidad_movimiento' => $cantidad,
                    'stock_actual' => $stockNuevoAlm,
                    'costo_unitario' => $costoUnitario,
                    'costo_total_movimiento' => $costoTotal,
                    'saldo_valorizado_total' => $stockNuevoAlm * $costoUnitario,
                ]);

                return $prestamo;
            });

            return response()->json([
                'success' => true,
                'message' => 'Préstamo de herramienta registrado exitosamente y stock descontado del inventario.',
                'data' => $prestamo->load(['almacen', 'trabajador', 'producto.unidadMedida', 'usuario']),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Registrar retorno / devolución de herramienta con reingreso automático de stock
     */
    public function devolver(Request $request, $id)
    {
        $validated = $request->validate([
            'condicion_fisica' => 'nullable|string|max:100', // Operativa, Desgastada, Dañada
            'observacion_devolucion' => 'nullable|string|max:1000',
            'fecha_devolucion_real' => 'nullable|date',
        ]);

        try {
            $prestamo = DB::transaction(function () use ($id, $validated) {
                $prestamo = PrestamoHerramienta::lockForUpdate()->findOrFail($id);

                if ($prestamo->estado === 'DEVUELTO') {
                    throw new \Exception("Este préstamo ({$prestamo->codigo}) ya fue devuelto anteriormente.");
                }

                $producto = Producto::where('id', $prestamo->producto_id)->lockForUpdate()->firstOrFail();
                $almacenId = $prestamo->almacen_id;
                $cantidad = (float) $prestamo->cantidad;

                // 1. Reingresar stock al almacén
                $pivot = DB::table('almacen_producto')
                    ->where('almacen_id', $almacenId)
                    ->where('producto_id', $producto->id)
                    ->first();

                $stockAnteriorAlm = $pivot ? (float) $pivot->stock : 0;
                $stockNuevoAlm = $stockAnteriorAlm + $cantidad;

                if ($pivot) {
                    DB::table('almacen_producto')
                        ->where('id', $pivot->id)
                        ->update([
                            'stock' => $stockNuevoAlm,
                            'updated_at' => now(),
                        ]);
                } else {
                    DB::table('almacen_producto')->insert([
                        'almacen_id' => $almacenId,
                        'producto_id' => $producto->id,
                        'stock' => $stockNuevoAlm,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                // 2. Actualizar stock global del producto
                $stockGlobal = (float) DB::table('almacen_producto')
                    ->where('producto_id', $producto->id)
                    ->sum('stock');

                $producto->update([
                    'stock_actual' => $stockGlobal,
                ]);

                // 3. Componer la observación de devolución con la condición física
                $condicion = $validated['condicion_fisica'] ?? 'Operativa / Buen Estado';
                $detalleNota = $validated['observacion_devolucion'] ?? '';
                $observacionFinal = trim("[Condición: {$condicion}] " . $detalleNota);

                $fechaReal = !empty($validated['fecha_devolucion_real'])
                    ? $validated['fecha_devolucion_real']
                    : now();

                // 4. Actualizar préstamo a DEVUELTO
                $prestamo->update([
                    'estado' => 'DEVUELTO',
                    'fecha_devolucion_real' => $fechaReal,
                    'observacion_devolucion' => $observacionFinal,
                ]);

                // 5. Registrar en Kardex como ENTRADA_RETORNO
                $costoUnitario = (float) ($producto->costo_unitario ?? 0);
                $costoTotal = $cantidad * $costoUnitario;

                Kardex::create([
                    'almacen_id' => $almacenId,
                    'producto_id' => $producto->id,
                    'fecha_hora' => now(),
                    'tipo_operacion' => 'ENTRADA_RETORNO',
                    'documento_referencia_id' => $prestamo->id,
                    'stock_anterior' => $stockAnteriorAlm,
                    'cantidad_movimiento' => $cantidad,
                    'stock_actual' => $stockNuevoAlm,
                    'costo_unitario' => $costoUnitario,
                    'costo_total_movimiento' => $costoTotal,
                    'saldo_valorizado_total' => $stockNuevoAlm * $costoUnitario,
                ]);

                return $prestamo;
            });

            return response()->json([
                'success' => true,
                'message' => 'Herramienta devuelta exitosamente. Se ha reingresado el stock al inventario.',
                'data' => $prestamo->load(['almacen', 'trabajador', 'producto.unidadMedida', 'usuario']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Ver detalle de un préstamo específico
     */
    public function show($id)
    {
        $prestamo = PrestamoHerramienta::with([
            'almacen',
            'trabajador',
            'producto.unidadMedida',
            'producto.categoria',
            'usuario',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $prestamo,
        ]);
    }
}
