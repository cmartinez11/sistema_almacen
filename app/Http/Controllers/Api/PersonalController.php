<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Personal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PersonalController extends Controller
{
    /**
     * Listar personal / trabajadores con filtro de búsqueda.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Personal::with('rol');

        if ($request->filled('buscar')) {
            $buscar = $request->input('buscar');
            $query->where(function ($q) use ($buscar) {
                $q->where('nombres', 'like', "%{$buscar}%")
                  ->orWhere('apellidos', 'like', "%{$buscar}%")
                  ->orWhere('dni', 'like', "%{$buscar}%")
                  ->orWhere('documento_identidad', 'like', "%{$buscar}%")
                  ->orWhere('cargo', 'like', "%{$buscar}%")
                  ->orWhere('area', 'like', "%{$buscar}%");
            });
        }

        $personal = $query->orderBy('apellidos', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $personal,
        ], 200);
    }

    /**
     * Registrar un trabajador / personal.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'dni' => 'required|string|max:20',
            'nombres' => 'required|string|max:150',
            'apellidos' => 'required|string|max:150',
            'cargo' => 'nullable|string|max:100',
            'area' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:255',
            'telefono' => 'nullable|string|max:20',
            'estado' => 'nullable|in:activo,suspendido,inactivo',
            'rol_id' => 'nullable|exists:roles,id',
        ]);

        $dni = $validated['dni'];

        $trabajador = Personal::create([
            'dni' => $dni,
            'documento_identidad' => $dni,
            'nombres' => $validated['nombres'],
            'apellidos' => $validated['apellidos'],
            'cargo' => $validated['cargo'] ?? null,
            'area' => $validated['area'] ?? null,
            'email' => $validated['email'] ?? null,
            'telefono' => $validated['telefono'] ?? null,
            'estado' => $validated['estado'] ?? 'activo',
            'rol_id' => $validated['rol_id'] ?? null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Trabajador registrado correctamente',
            'data' => $trabajador,
        ], 201);
    }

    /**
     * Mostrar un trabajador.
     */
    public function show(string $id): JsonResponse
    {
        $trabajador = Personal::with('rol')->find($id);

        if (!$trabajador) {
            return response()->json([
                'status' => 'error',
                'message' => 'Trabajador no encontrado',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $trabajador,
        ], 200);
    }

    /**
     * Actualizar los datos del trabajador.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $trabajador = Personal::find($id);

        if (!$trabajador) {
            return response()->json([
                'status' => 'error',
                'message' => 'Trabajador no encontrado',
            ], 404);
        }

        $validated = $request->validate([
            'dni' => 'sometimes|required|string|max:20',
            'nombres' => 'sometimes|required|string|max:150',
            'apellidos' => 'sometimes|required|string|max:150',
            'cargo' => 'nullable|string|max:100',
            'area' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:255',
            'telefono' => 'nullable|string|max:20',
            'estado' => 'nullable|in:activo,suspendido,inactivo',
            'rol_id' => 'nullable|exists:roles,id',
        ]);

        if (isset($validated['dni'])) {
            $validated['documento_identidad'] = $validated['dni'];
        }

        $trabajador->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Datos del trabajador actualizados correctamente',
            'data' => $trabajador,
        ], 200);
    }

    /**
     * Eliminar un trabajador.
     */
    public function destroy(string $id): JsonResponse
    {
        $trabajador = Personal::find($id);

        if (!$trabajador) {
            return response()->json([
                'status' => 'error',
                'message' => 'Trabajador no encontrado',
            ], 404);
        }

        try {
            $trabajador->delete();
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se puede eliminar el trabajador porque tiene despachos de material asignados.',
            ], 409);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Trabajador eliminado correctamente',
        ], 200);
    }
}
