<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Producto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductoController extends Controller
{
    /**
     * Listar productos con almacenes e inventario.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Producto::with(['categoria', 'unidadMedida', 'almacenes']);

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
        $productos = $query->latest()->paginate($perPage);

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
        ]);

        $stockInicial = (float) ($validated['stock_actual'] ?? 0);
        $costoUnitario = (float) ($validated['costo_unitario'] ?? 0);

        $producto = Producto::create([
            'categoria_id' => $validated['categoria_id'],
            'unidades_medida_id' => $validated['unidades_medida_id'],
            'sku' => $validated['sku'],
            'nombre' => $validated['nombre'],
            'stock_actual' => $stockInicial,
            'stock_minimo' => $validated['stock_minimo'] ?? 0,
            'costo_unitario' => $costoUnitario,
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

        $producto->load(['categoria', 'unidadMedida', 'almacenes']);

        return response()->json([
            'status' => 'success',
            'message' => 'Producto registrado correctamente en todos los almacenes.',
            'data' => $producto,
        ], 201);
    }

    /**
     * Mostrar detalles de un producto.
     */
    public function show(string $id): JsonResponse
    {
        $producto = Producto::with(['categoria', 'unidadMedida'])->find($id);

        if (!$producto) {
            return response()->json([
                'status' => 'error',
                'message' => 'Producto no encontrado',
            ], 404);
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
        ]);

        $producto->update($validated);
        $producto->load(['categoria', 'unidadMedida']);

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
}
