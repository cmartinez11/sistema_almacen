<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EntradaDetalle;
use App\Models\Producto;
use App\Models\SalidaDetalle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductoController extends Controller
{
    /**
     * Listar productos con almacenes e inventario y su último precio de compra registrado.
     */
    public function index(Request $request): JsonResponse
    {
        $ultimoPrecioSql = '(
            SELECT ed.costo_unitario
            FROM entradas_detalle ed
            JOIN entradas_cabecera ec ON ec.id = ed.entrada_cabecera_id
            WHERE ed.producto_id = productos.id
            ORDER BY ec.fecha_emision DESC, ed.id DESC
            LIMIT 1
        )';

        $query = Producto::with(['categoria', 'unidadMedida', 'unidadSecundaria', 'almacenes'])
            ->select('productos.*')
            ->selectRaw("COALESCE({$ultimoPrecioSql}, productos.costo_unitario, 0.00) AS ultimo_precio_compra");

        if ($request->filled('buscar')) {
            $buscar = $request->input('buscar');
            $query->where(function ($q) use ($buscar) {
                $q->where('nombre', 'like', "%{$buscar}%")
                  ->orWhere('sku', 'like', "%{$buscar}%");
            });
        }

        if ($request->filled('categoria_id')) {
            $query->where('categoria_id', $request->input('categoria_id'));
        }

        $perPage = (int) $request->input('per_page', 50);
        $productos = $query->latest('productos.created_at')->paginate($perPage);

        if (!$this->userCanViewFinancials($request)) {
            $productos->getCollection()->transform(function ($prod) {
                $prod->costo_unitario = null;
                $prod->ultimo_precio_compra = null;
                if ($prod->relationLoaded('almacenes')) {
                    foreach ($prod->almacenes as $alm) {
                        if ($alm->pivot) {
                            $alm->pivot->costo_unitario = null;
                        }
                    }
                }
                return $prod;
            });
        }

        return response()->json([
            'status' => 'success',
            'data' => $productos,
        ], 200);
    }

    /**
     * Registrar un nuevo producto con asignación automática a todos los almacenes.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'categoria_id' => 'required|exists:categorias,id',
            'unidades_medida_id' => 'required|exists:unidades_medida,id',
            'sku' => 'required|string|max:100|unique:productos,sku',
            'nombre' => 'required|string|max:255',
            'stock_actual' => 'nullable|numeric|min:0',
            'stock_minimo' => 'nullable|numeric|min:0',
            'costo_unitario' => 'nullable|numeric|min:0',
            'maneja_conversion' => 'nullable|boolean',
            'unidad_secundaria_id' => 'nullable|exists:unidades_medida,id',
            'factor_conversion' => 'nullable|numeric|min:1',
        ]);

        $stockInicial = (float) ($validated['stock_actual'] ?? 0);
        $costoUnitario = (float) ($validated['costo_unitario'] ?? 0);
        $manejaConversion = filter_var($validated['maneja_conversion'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $unidadSecundariaId = $manejaConversion ? ($validated['unidad_secundaria_id'] ?? null) : null;
        $factorConversion = $manejaConversion ? (float) ($validated['factor_conversion'] ?? 1) : 1;

        $producto = Producto::create([
            'categoria_id' => $validated['categoria_id'],
            'unidades_medida_id' => $validated['unidades_medida_id'],
            'sku' => $validated['sku'],
            'nombre' => $validated['nombre'],
            'stock_actual' => $stockInicial,
            'stock_minimo' => $validated['stock_minimo'] ?? 0,
            'costo_unitario' => $costoUnitario,
            'maneja_conversion' => $manejaConversion,
            'unidad_secundaria_id' => $unidadSecundariaId,
            'factor_conversion' => $factorConversion,
        ]);

        // Asignar automáticamente en la tabla pivot almacen_producto para todos los almacenes activos
        $almacenes = \App\Models\Almacen::where('estado', 'activo')->get();
        foreach ($almacenes as $alm) {
            \Illuminate\Support\Facades\DB::table('almacen_producto')->insert([
                'almacen_id' => $alm->id,
                'producto_id' => $producto->id,
                'stock' => $alm->id === 1 ? $stockInicial : 0,
                'costo_unitario' => $costoUnitario,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $producto->load(['categoria', 'unidadMedida', 'unidadSecundaria', 'almacenes']);

        return response()->json([
            'status' => 'success',
            'message' => 'Producto registrado correctamente en todos los almacenes.',
            'data' => $producto,
        ], 201);
    }

    /**
     * Mostrar detalles de un producto con su último precio de compra registrado.
     */
    public function show(string $id): JsonResponse
    {
        $ultimoPrecioSql = '(
            SELECT ed.costo_unitario
            FROM entradas_detalle ed
            JOIN entradas_cabecera ec ON ec.id = ed.entrada_cabecera_id
            WHERE ed.producto_id = productos.id
            ORDER BY ec.fecha_emision DESC, ed.id DESC
            LIMIT 1
        )';

        $producto = Producto::with(['categoria', 'unidadMedida', 'unidadSecundaria', 'almacenes'])
            ->select('productos.*')
            ->selectRaw("COALESCE({$ultimoPrecioSql}, productos.costo_unitario, 0.00) AS ultimo_precio_compra")
            ->find($id);

        if (!$producto) {
            return response()->json([
                'status' => 'error',
                'message' => 'Producto no encontrado',
            ], 404);
        }

        if (!$this->userCanViewFinancials($request)) {
            $producto->costo_unitario = null;
            $producto->ultimo_precio_compra = null;
            if ($producto->relationLoaded('almacenes')) {
                foreach ($producto->almacenes as $alm) {
                    if ($alm->pivot) {
                        $alm->pivot->costo_unitario = null;
                    }
                }
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => $producto,
        ], 200);
    }

    /**
     * Actualizar datos del producto.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $producto = Producto::find($id);

        if (!$producto) {
            return response()->json([
                'status' => 'error',
                'message' => 'Producto no encontrado',
            ], 404);
        }

        $validated = $request->validate([
            'categoria_id' => 'sometimes|required|exists:categorias,id',
            'unidades_medida_id' => 'sometimes|required|exists:unidades_medida,id',
            'sku' => "sometimes|required|string|max:100|unique:productos,sku,{$id}",
            'nombre' => 'sometimes|required|string|max:255',
            'stock_actual' => 'nullable|numeric|min:0',
            'stock_minimo' => 'nullable|numeric|min:0',
            'costo_unitario' => 'nullable|numeric|min:0',
            'maneja_conversion' => 'nullable|boolean',
            'unidad_secundaria_id' => 'nullable|exists:unidades_medida,id',
            'factor_conversion' => 'nullable|numeric|min:1',
        ]);

        if (array_key_exists('maneja_conversion', $validated)) {
            $validated['maneja_conversion'] = filter_var($validated['maneja_conversion'], FILTER_VALIDATE_BOOLEAN);
            if (!$validated['maneja_conversion']) {
                $validated['unidad_secundaria_id'] = null;
                $validated['factor_conversion'] = 1;
            }
        }

        $producto->update($validated);
        $producto->load(['categoria', 'unidadMedida', 'unidadSecundaria', 'almacenes']);

        return response()->json([
            'status' => 'success',
            'message' => 'Producto actualizado correctamente',
            'data' => $producto,
        ], 200);
    }

    /**
     * Eliminar producto.
     */
    public function destroy(string $id): JsonResponse
    {
        $producto = Producto::find($id);

        if (!$producto) {
            return response()->json([
                'status' => 'error',
                'message' => 'Producto no encontrado',
            ], 404);
        }

        try {
            $producto->delete();
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se puede eliminar el producto porque registra movimientos de almacén.',
            ], 409);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Producto eliminado correctamente',
        ], 200);
    }

    /**
     * Obtener el reporte de productos con Stock Crítico (stock <= stock_minimo) por almacén o global.
     */
    public function stockCritico(Request $request): JsonResponse
    {
        $almacenId = $request->input('almacen_id')
            ?? $request->header('X-Almacen-Id')
            ?? $request->attributes->get('active_almacen_id');

        $query = Producto::with(['categoria', 'unidadMedida', 'almacenes']);

        $productos = $query->get();
        $criticos = [];

        foreach ($productos as $p) {
            $stockMinimo = (float) ($p->stock_minimo ?? 0);

            if ($almacenId) {
                $pivot = $p->almacenes->where('id', $almacenId)->first();
                $stockAlmacen = $pivot && $pivot->pivot ? (float) $pivot->pivot->stock : 0;
                $almNombre = $pivot ? $pivot->nombre : 'Almacén';

                if ($stockAlmacen <= $stockMinimo) {
                    $criticos[] = [
                        'id' => $p->id,
                        'sku' => $p->sku,
                        'nombre' => $p->nombre,
                        'categoria' => $p->categoria->nombre ?? 'General',
                        'unidad_medida' => $p->unidadMedida->nombre ?? 'UND',
                        'almacen_id' => (int) $almacenId,
                        'almacen_nombre' => $almNombre,
                        'stock_actual' => $stockAlmacen,
                        'stock_minimo' => $stockMinimo,
                        'deficit' => max(0, $stockMinimo - $stockAlmacen),
                        'costo_unitario' => (float) $p->costo_unitario,
                        'estado_alerta' => $stockAlmacen == 0 ? 'AGOTADO' : 'CRÍTICO',
                    ];
                }
            } else {
                foreach ($p->almacenes as $alm) {
                    $stockAlm = (float) $alm->pivot->stock;
                    if ($stockAlm <= $stockMinimo) {
                        $criticos[] = [
                            'id' => $p->id,
                            'sku' => $p->sku,
                            'nombre' => $p->nombre,
                            'categoria' => $p->categoria->nombre ?? 'General',
                            'unidad_medida' => $p->unidadMedida->nombre ?? 'UND',
                            'almacen_id' => $alm->id,
                            'almacen_nombre' => $alm->nombre,
                            'stock_actual' => $stockAlm,
                            'stock_minimo' => $stockMinimo,
                            'deficit' => max(0, $stockMinimo - $stockAlm),
                            'costo_unitario' => (float) $p->costo_unitario,
                            'estado_alerta' => $stockAlm == 0 ? 'AGOTADO' : 'CRÍTICO',
                        ];
                    }
                }
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => $criticos,
            'total_criticos' => count($criticos),
        ], 200);
    }

    /**
     * Obtener el historial estructurado de trazabilidad (entradas y salidas) para un producto.
     */
    public function movimientosHistorial(Request $request, string $id): JsonResponse
    {
        $request = $request ?: request();
        $producto = Producto::with(['categoria', 'unidadMedida', 'almacenes'])->find($id);

        if (!$producto) {
            return response()->json([
                'status' => 'error',
                'message' => 'Producto no encontrado',
            ], 404);
        }

        // 1. Consultar Historial de Entradas (Compras / Recepciones)
        $entradas = EntradaDetalle::where('producto_id', $producto->id)
            ->with(['entradaCabecera.proveedor', 'entradaCabecera.personal'])
            ->get()
            ->sortByDesc(function ($d) {
                return $d->entradaCabecera->fecha_emision ?? $d->created_at;
            })
            ->values()
            ->map(function ($det) {
                $cab = $det->entradaCabecera;
                $nroDoc = $cab ? ($cab->numero_comprobante ?: 'NI-' . str_pad($cab->id, 5, '0', STR_PAD_LEFT)) : 'NI-S/N';
                $fecha = $cab && $cab->fecha_emision ? $cab->fecha_emision->format('Y-m-d H:i') : $det->created_at->format('Y-m-d H:i');
                $proveedor = $cab && $cab->proveedor ? $cab->proveedor->razon_social : ($cab && $cab->personal ? "Ingreso: {$cab->personal->nombres} {$cab->personal->apellidos}" : 'Proveedor General');
                $ruc = $cab && $cab->proveedor ? $cab->proveedor->ruc : null;

                $almacenNombre = null;
                if ($cab && $cab->almacen_id) {
                    $almacenNombre = \App\Models\Almacen::find($cab->almacen_id)?->nombre;
                }

                return [
                    'id' => $det->id,
                    'documento' => $nroDoc,
                    'tipo_comprobante' => $cab->tipo_comprobante ?? 'Nota de Ingreso',
                    'fecha' => $fecha,
                    'cantidad' => (float) $det->cantidad,
                    'costo_unitario' => (float) $det->costo_unitario,
                    'costo_total' => (float) ($det->costo_total ?: ((float) $det->cantidad * (float) $det->costo_unitario)),
                    'proveedor' => $proveedor,
                    'proveedor_ruc' => $ruc,
                    'almacen' => $almacenNombre,
                    'observaciones' => $cab->observaciones ?? null,
                ];
            });

        // 2. Consultar Historial de Salidas (Despachos a Personal / Obras)
        $salidas = SalidaDetalle::where('producto_id', $producto->id)
            ->with(['salidaCabecera.personal'])
            ->get()
            ->sortByDesc(function ($d) {
                return $d->salidaCabecera->fecha_emision ?? $d->created_at;
            })
            ->values()
            ->map(function ($det) {
                $cab = $det->salidaCabecera;
                $nroDoc = $cab ? ($cab->numero_referencia ?: 'NS-' . str_pad($cab->id, 5, '0', STR_PAD_LEFT)) : 'NS-S/N';
                $fecha = $cab && $cab->fecha_emision ? $cab->fecha_emision->format('Y-m-d H:i') : $det->created_at->format('Y-m-d H:i');
                $trabajador = $cab && $cab->personal ? "{$cab->personal->nombres} {$cab->personal->apellidos}" : 'Personal / Operador';
                $cargo = $cab && $cab->personal ? $cab->personal->cargo : null;
                $destino = $cab ? ($cab->destino_cliente ?: 'Asignación Interna') : 'General';

                $almacenNombre = null;
                if ($cab && $cab->almacen_id) {
                    $almacenNombre = \App\Models\Almacen::find($cab->almacen_id)?->nombre;
                }

                return [
                    'id' => $det->id,
                    'documento' => $nroDoc,
                    'fecha' => $fecha,
                    'cantidad' => (float) $det->cantidad,
                    'trabajador' => $trabajador,
                    'cargo' => $cargo,
                    'destino' => $destino,
                    'almacen' => $almacenNombre,
                    'observaciones' => $cab->observaciones ?? null,
                ];
            });

        $totalIngresado = $entradas->sum('cantidad');
        $totalDespachado = $salidas->sum('cantidad');

        $canViewPrices = $this->userCanViewFinancials($request);
        if (!$canViewPrices) {
            $entradas = $entradas->map(function ($ent) {
                $ent['costo_unitario'] = null;
                $ent['costo_total'] = null;
                return $ent;
            });
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'producto' => [
                    'id' => $producto->id,
                    'sku' => $producto->sku,
                    'nombre' => $producto->nombre,
                    'categoria' => $producto->categoria->nombre ?? 'General',
                    'unidad_medida' => $producto->unidadMedida->nombre ?? 'UND',
                    'stock_actual' => (float) $producto->stock_actual,
                    'stock_minimo' => (float) $producto->stock_minimo,
                    'ultimo_precio_compra' => $canViewPrices ? (float) ($producto->ultimo_precio_compra ?? $producto->costo_unitario ?? 0) : null,
                    'total_ingresado' => $totalIngresado,
                    'total_despachado' => $totalDespachado,
                ],
                'entradas' => $entradas,
                'salidas' => $salidas,
            ],
        ], 200);
    }
}
