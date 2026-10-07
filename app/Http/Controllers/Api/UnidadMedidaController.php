<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UnidadMedida;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UnidadMedidaController extends Controller
{
    /**
     * Listar unidades de medida.
     */
    public function index(Request $request): JsonResponse
    {
        $query = UnidadMedida::query();

        if ($request->filled('buscar')) {
            $buscar = $request->input('buscar');
            $query->where(function ($q) use ($buscar) {
                $q->where('nombre', 'like', "%{$buscar}%")
                  ->orWhere('simbolo', 'like', "%{$buscar}%");
            });
        }

        $unidades = $query->orderBy('nombre')->get();

        return response()->json([
            'status' => 'success',
            'data' => $unidades,
        ], 200);
    }

    /**
     * Crear una unidad de medida.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:100',
            'simbolo' => 'required|string|max:20',
        ]);

        $unidad = UnidadMedida::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Unidad de medida registrada correctamente',
            'data' => $unidad,
        ], 201);
    }

    /**
     * Mostrar una unidad de medida.
     */
    public function show(string $id): JsonResponse
    {
        $unidad = UnidadMedida::find($id);

        if (!$unidad) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unidad de medida no encontrada',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $unidad,
        ], 200);
    }

    /**
     * Actualizar una unidad de medida.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $unidad = UnidadMedida::find($id);

        if (!$unidad) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unidad de medida no encontrada',
            ], 404);
        }

        $validated = $request->validate([
            'nombre' => 'sometimes|required|string|max:100',
            'simbolo' => 'sometimes|required|string|max:20',
        ]);

        $unidad->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Unidad de medida actualizada correctamente',
            'data' => $unidad,
        ], 200);
    }

    /**
     * Eliminar una unidad de medida.
     */
    public function destroy(string $id): JsonResponse
    {
        $unidad = UnidadMedida::find($id);

        if (!$unidad) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unidad de medida no encontrada',
            ], 404);
        }

        try {
            $unidad->delete();
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se puede eliminar la unidad de medida porque está asignada a productos.',
            ], 409);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Unidad de medida eliminada correctamente',
        ], 200);
    }
}
