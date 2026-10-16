<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Listar todos los usuarios del sistema con filtros de búsqueda y rol.
     * GET /api/usuarios
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['personal', 'almacen']);

        // Filtro por término de búsqueda (nombre, email, área o rol)
        if ($request->filled('buscar')) {
            $buscar = trim($request->input('buscar'));
            $query->where(function ($q) use ($buscar) {
                $q->where('name', 'ilike', "%{$buscar}%")
                  ->orWhere('email', 'ilike', "%{$buscar}%")
                  ->orWhere('role', 'ilike', "%{$buscar}%")
                  ->orWhere('area', 'ilike', "%{$buscar}%");
            });
        }

        // Filtro específico por rol
        if ($request->filled('role')) {
            $roleFilter = trim($request->input('role'));
            $query->where('role', $roleFilter);
        } elseif ($request->filled('rol')) {
            $roleFilter = trim($request->input('rol'));
            $query->where('role', $roleFilter);
        }

        // Filtro por estado activo (opcional)
        if ($request->has('activo') && $request->input('activo') !== '' && $request->input('activo') !== null) {
            $query->where('activo', filter_var($request->input('activo'), FILTER_VALIDATE_BOOLEAN));
        }

        $usuarios = $query->orderBy('id', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $usuarios,
        ], 200);
    }

    /**
     * Crear un nuevo usuario en el sistema.
     * POST /api/usuarios
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'nullable|string|max:100',
            'rol' => 'nullable|string|max:100',
            'area' => 'nullable|string|max:150',
            'almacen_id' => 'nullable|exists:almacenes,id',
            'personal_id' => 'nullable|exists:personal,id',
            'activo' => 'nullable|boolean',
        ], [
            'email.unique' => 'El correo electrónico ya está registrado en el sistema.',
            'password.min' => 'La contraseña debe tener al menos 6 caracteres.',
            'name.required' => 'El nombre completo es obligatorio.',
            'email.required' => 'El correo electrónico es obligatorio.',
        ]);

        $role = $validated['role'] ?? $validated['rol'] ?? 'almacenero';
        $activo = array_key_exists('activo', $validated) ? (bool)$validated['activo'] : true;

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $role,
            'area' => $validated['area'] ?? null,
            'almacen_id' => $validated['almacen_id'] ?? null,
            'personal_id' => $validated['personal_id'] ?? null,
            'activo' => $activo,
        ]);

        $user->load(['personal', 'almacen']);

        return response()->json([
            'status' => 'success',
            'message' => 'Usuario registrado exitosamente',
            'data' => $user,
        ], 201);
    }

    /**
     * Consultar un usuario específico por ID.
     * GET /api/usuarios/{id}
     */
    public function show(Request $request, $id = null): JsonResponse
    {
        $userId = $id ?: ($request->route('usuario') ?: $request->route('id'));
        $user = User::with(['personal', 'almacen'])->find($userId);

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Usuario no encontrado',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $user,
        ], 200);
    }

    /**
     * Actualizar los datos de un usuario existente.
     * PUT /api/usuarios/{id}
     */
    public function update(Request $request, $id = null): JsonResponse
    {
        $userId = $id ?: ($request->route('usuario') ?: $request->route('id'));
        $user = User::find($userId);

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Usuario no encontrado',
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'password' => 'nullable|string|min:6',
            'role' => 'nullable|string|max:100',
            'rol' => 'nullable|string|max:100',
            'area' => 'nullable|string|max:150',
            'almacen_id' => 'nullable|exists:almacenes,id',
            'personal_id' => 'nullable|exists:personal,id',
            'activo' => 'nullable|boolean',
        ], [
            'email.unique' => 'El correo electrónico ya está en uso por otro usuario.',
            'password.min' => 'La nueva contraseña debe tener al menos 6 caracteres.',
        ]);

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }

        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }

        // Si se envió contraseña y no está vacía, se actualiza encriptada
        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        if (isset($validated['role'])) {
            $user->role = $validated['role'];
        } elseif (isset($validated['rol'])) {
            $user->role = $validated['rol'];
        }

        if (array_key_exists('area', $validated)) {
            $user->area = $validated['area'];
        }

        if (array_key_exists('almacen_id', $validated)) {
            $user->almacen_id = $validated['almacen_id'];
        }

        if (array_key_exists('personal_id', $validated)) {
            $user->personal_id = $validated['personal_id'];
        }

        if (array_key_exists('activo', $validated)) {
            $user->activo = (bool) $validated['activo'];
        }

        $user->save();
        $user->load(['personal', 'almacen']);

        return response()->json([
            'status' => 'success',
            'message' => 'Usuario actualizado correctamente',
            'data' => $user,
        ], 200);
    }

    /**
     * Alternar o actualizar el estado activo/bloqueado del usuario.
     * PATCH /api/usuarios/{id}/estado
     */
    public function toggleEstado(Request $request, $id = null): JsonResponse
    {
        $userId = $id ?: ($request->route('id') ?: $request->route('usuario'));
        $user = User::find($userId);

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Usuario no encontrado',
            ], 404);
        }

        // Si se envía activo explícito se toma, si no, se alterna el valor actual
        if ($request->has('activo')) {
            $user->activo = filter_var($request->input('activo'), FILTER_VALIDATE_BOOLEAN);
        } else {
            $user->activo = !$user->activo;
        }

        $user->save();
        $user->load(['personal', 'almacen']);

        $estadoStr = $user->activo ? 'activado' : 'bloqueado';

        return response()->json([
            'status' => 'success',
            'message' => "El usuario ha sido {$estadoStr} correctamente",
            'data' => $user,
        ], 200);
    }

    /**
     * Eliminar un usuario del sistema.
     * DELETE /api/usuarios/{id}
     */
    public function destroy(Request $request, $id = null): JsonResponse
    {
        $userId = $id ?: ($request->route('usuario') ?: $request->route('id'));
        $user = User::find($userId);

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Usuario no encontrado',
            ], 404);
        }

        // Evitar que un usuario se elimine a sí mismo
        $currentUser = $request->user();
        if ($currentUser && (int)$currentUser->id === (int)$user->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'No puedes eliminar tu propia cuenta de usuario en sesión activa.',
            ], 400);
        }

        // Revocar todos los tokens de Sanctum asociados al usuario
        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Usuario eliminado correctamente',
        ], 200);
    }
}
