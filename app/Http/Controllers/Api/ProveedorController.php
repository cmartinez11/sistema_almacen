<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Proveedor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProveedorController extends Controller
{
    /**
     * Listar proveedores con opción de búsqueda y filtrado.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Proveedor::query();

        if ($request->filled('buscar')) {
            $buscar = $request->input('buscar');
            $query->where(function ($q) use ($buscar) {
                $q->where('razon_social', 'like', "%{$buscar}%")
                  ->orWhere('ruc', 'like', "%{$buscar}%")
                  ->orWhere('email', 'like', "%{$buscar}%");
            });
        }

        $proveedores = $query->orderBy('razon_social', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $proveedores,
        ], 200);
    }

    /**
     * Crear un nuevo proveedor.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ruc' => 'required|string|size:11|unique:proveedores,ruc',
            'razon_social' => 'required|string|max:255',
            'telefono' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'direccion' => 'nullable|string|max:255',
            'estado' => 'nullable|in:activo,inactivo',
        ]);

        $proveedor = Proveedor::create([
            'ruc' => $validated['ruc'],
            'razon_social' => $validated['razon_social'],
            'telefono' => $validated['telefono'] ?? null,
            'email' => $validated['email'] ?? null,
            'direccion' => $validated['direccion'] ?? null,
            'estado' => $validated['estado'] ?? 'activo',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Proveedor registrado correctamente',
            'data' => $proveedor,
        ], 201);
    }

    /**
     * Mostrar un proveedor específico.
     */
    public function show(string $id): JsonResponse
    {
        $proveedor = Proveedor::find($id);

        if (!$proveedor) {
            return response()->json([
                'status' => 'error',
                'message' => 'Proveedor no encontrado',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $proveedor,
        ], 200);
    }

    /**
     * Actualizar los datos de un proveedor.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $proveedor = Proveedor::find($id);

        if (!$proveedor) {
            return response()->json([
                'status' => 'error',
                'message' => 'Proveedor no encontrado',
            ], 404);
        }

        $validated = $request->validate([
            'ruc' => "sometimes|required|string|size:11|unique:proveedores,ruc,{$id}",
            'razon_social' => 'sometimes|required|string|max:255',
            'telefono' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'direccion' => 'nullable|string|max:255',
            'estado' => 'nullable|in:activo,inactivo',
        ]);

        $proveedor->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Proveedor actualizado correctamente',
            'data' => $proveedor,
        ], 200);
    }

    /**
     * Eliminar un proveedor.
     */
    public function destroy(string $id): JsonResponse
    {
        $proveedor = Proveedor::find($id);

        if (!$proveedor) {
            return response()->json([
                'status' => 'error',
                'message' => 'Proveedor no encontrado',
            ], 404);
        }

        try {
            $proveedor->delete();
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se puede eliminar el proveedor porque registra ingresos en almacén.',
            ], 409);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Proveedor eliminado correctamente',
        ], 200);
    }
}
