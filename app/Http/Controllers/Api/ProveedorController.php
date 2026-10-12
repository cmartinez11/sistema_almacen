<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Proveedor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ProveedorController extends Controller
{
    /**
     * Consultar información de un RUC a través de ApisPeru (SUNAT).
     */
    public function consultarRuc(string $ruc): JsonResponse
    {
        $ruc = trim($ruc);
        if (!preg_match('/^[0-9]{11}$/', $ruc)) {
            return response()->json([
                'status' => 'error',
                'message' => 'El número de RUC debe constar de exactamente 11 dígitos numéricos.',
            ], 422);
        }

        $token = config('services.apisperu.token') ?? env('APISPERU_TOKEN');
        if (empty($token)) {
            return response()->json([
                'status' => 'error',
                'message' => 'El token de ApisPeru no está configurado en el servidor (APISPERU_TOKEN en .env).',
            ], 500);
        }

        try {
            $response = Http::withToken($token)
                ->timeout(12)
                ->get("https://dniruc.apisperu.com/api/v1/ruc/{$ruc}");

            if ($response->successful()) {
                $data = $response->json();

                if (isset($data['success']) && $data['success'] === false) {
                    return response()->json([
                        'status' => 'error',
                        'message' => $data['message'] ?? 'RUC no encontrado en el padrón de SUNAT.',
                    ], 404);
                }

                return response()->json([
                    'status' => 'success',
                    'data' => $data,
                ], 200);
            }

            $errorMsg = $response->json('message') ?? 'No se pudo obtener información del RUC en SUNAT / ApisPeru.';
            return response()->json([
                'status' => 'error',
                'message' => $errorMsg,
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error de conexión con el servicio de consulta SUNAT: ' . $e->getMessage(),
            ], 500);
        }
    }

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
                  ->orWhere('nombre_comercial', 'like', "%{$buscar}%")
                  ->orWhere('ruc', 'like', "%{$buscar}%")
                  ->orWhere('contacto_nombre', 'like', "%{$buscar}%")
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
     * Crear un nuevo proveedor con validación estricta de RUC (11 dígitos).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ruc' => 'required|string|digits:11|unique:proveedores,ruc',
            'razon_social' => 'required|string|max:255',
            'nombre_comercial' => 'nullable|string|max:255',
            'contacto_nombre' => 'nullable|string|max:255',
            'telefono' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'direccion' => 'nullable|string|max:255',
            'estado' => 'nullable|in:activo,inactivo',
        ], [
            'ruc.required' => 'El número de RUC es obligatorio.',
            'ruc.digits' => 'El RUC debe constar de exactamente 11 dígitos numéricos.',
            'ruc.unique' => 'El número de RUC ya se encuentra registrado en el sistema.',
            'razon_social.required' => 'La Razón Social es obligatoria.',
        ]);

        $proveedor = Proveedor::create([
            'ruc' => $validated['ruc'],
            'razon_social' => $validated['razon_social'],
            'nombre_comercial' => $validated['nombre_comercial'] ?? null,
            'contacto_nombre' => $validated['contacto_nombre'] ?? null,
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
        $proveedor = Proveedor::with(['entradasCabecera', 'requerimientos'])->find($id);

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
            'ruc' => "sometimes|required|string|digits:11|unique:proveedores,ruc,{$id}",
            'razon_social' => 'sometimes|required|string|max:255',
            'nombre_comercial' => 'nullable|string|max:255',
            'contacto_nombre' => 'nullable|string|max:255',
            'telefono' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'direccion' => 'nullable|string|max:255',
            'estado' => 'nullable|in:activo,inactivo',
        ], [
            'ruc.digits' => 'El RUC debe constar de exactamente 11 dígitos numéricos.',
            'ruc.unique' => 'El número de RUC ya está registrado por otro proveedor.',
        ]);

        $proveedor->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Proveedor actualizado correctamente',
            'data' => $proveedor,
        ], 200);
    }

    /**
     * Eliminar un proveedor validando integridad referencial.
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
                'message' => 'No se puede eliminar el proveedor porque registra órdenes de compra o ingresos en almacén.',
            ], 409);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Proveedor eliminado correctamente',
        ], 200);
    }
}
