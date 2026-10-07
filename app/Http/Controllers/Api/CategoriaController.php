<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoriaController extends Controller
{
    /**
     * Listar categorías.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Categoria::query();

        if ($request->filled('buscar')) {
            $buscar = $request->input('buscar');
            $query->where('nombre', 'like', "%{$buscar}%");
        }

        $categorias = $query->orderBy('nombre')->get();

        return response()->json([
            'status' => 'success',
            'data' => $categorias,
        ], 200);
    }

    /**
     * Crear una nueva categoría.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:100|unique:categorias,nombre',
            'descripcion' => 'nullable|string|max:255',
        ]);

        $categoria = Categoria::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Categoría creada correctamente',
            'data' => $categoria,
        ], 201);
    }

    /**
     * Mostrar una categoría.
     */
    public function show(string $id): JsonResponse
    {
        $categoria = Categoria::find($id);

        if (!$categoria) {
            return response()->json([
                'status' => 'error',
                'message' => 'Categoría no encontrada',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $categoria,
        ], 200);
    }

    /**
     * Actualizar una categoría.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $categoria = Categoria::find($id);

        if (!$categoria) {
            return response()->json([
                'status' => 'error',
                'message' => 'Categoría no encontrada',
            ], 404);
        }

        $validated = $request->validate([
            'nombre' => "sometimes|required|string|max:100|unique:categorias,nombre,{$id}",
            'descripcion' => 'nullable|string|max:255',
        ]);

        $categoria->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Categoría actualizada correctamente',
            'data' => $categoria,
        ], 200);
    }

    /**
     * Eliminar una categoría.
     */
    public function destroy(string $id): JsonResponse
    {
        $categoria = Categoria::find($id);

        if (!$categoria) {
            return response()->json([
                'status' => 'error',
                'message' => 'Categoría no encontrada',
            ], 404);
        }

        try {
            $categoria->delete();
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se puede eliminar la categoría porque posee productos asociados.',
            ], 409);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Categoría eliminada correctamente',
        ], 200);
    }
}
