<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\Kardex;
use App\Models\Personal;
use App\Models\Producto;
use App\Models\Requerimiento;
use App\Models\RequerimientoDetalle;
use App\Models\SalidaCabecera;
use App\Models\SalidaDetalle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Throwable;

class PreRequerimientoController extends Controller
{
    /**
     * Listar pre-requerimientos con verificación de stock en tiempo real.
     * Si el usuario autenticado es responsable_area, se filtran los de su área/usuario.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user() ?? Auth::user();
        $query = Requerimiento::with(['personal', 'detalles.producto.unidadMedida', 'detalles.producto.categoria']);

        // Si el usuario es responsable de área, filtrar solo por su área o personal_id
        $userRole = strtolower($user?->role ?? '');
        if ($userRole === 'responsable_area') {
            $query->where(function ($q) use ($user) {
                if ($user?->area) {
                    $q->where('area', $user->area);
                }
                if ($user?->personal_id) {
                    $q->orWhere('personal_id', $user->personal_id);
                }
            });
        } elseif ($request->filled('area')) {
            $query->where('area', $request->input('area'));
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->input('estado'));
        } else if (!$request->boolean('todos')) {
            // Por defecto en bandeja de entrada muestra pre_requerimiento
            $query->where('estado', 'pre_requerimiento');
        }

        $preRequerimientos = $query->latest()->get();

        $almacenId = (int) ($request->input('almacen_id', 1));

        // Enriquecer cada detalle con el stock actual disponible
        foreach ($preRequerimientos as $pr) {
            $todosConStock = true;
            foreach ($pr->detalles as $det) {
                $stockGlobal = (float) DB::table('almacen_producto')
                    ->where('producto_id', $det->producto_id)
                    ->sum('stock');

                $stockAlm = (float) (DB::table('almacen_producto')
                    ->where('almacen_id', $almacenId)
                    ->where('producto_id', $det->producto_id)
                    ->value('stock') ?? 0);

                $det->stock_almacen_actual = $stockAlm;
                $det->stock_global_disponible = $stockGlobal;
                $det->tiene_stock = ($stockGlobal >= (float) $det->cantidad_solicitada);

                if (!$det->tiene_stock) {
                    $todosConStock = false;
                }
            }
            $pr->disponibilidad_completa = $todosConStock;
        }

        return response()->json([
            'status' => 'success',
            'data' => $preRequerimientos,
        ], 200);
    }

    /**
     * Registrar un nuevo Pre-Requerimiento desde el carrito e-commerce.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user() ?? Auth::user();

        $validated = $request->validate([
            'personal_id' => 'nullable|integer|exists:personal,id',
            'area' => 'nullable|string|max:100',
            'prioridad' => 'nullable|in:baja,media,alta',
            'observaciones' => 'nullable|string',
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|exists:productos,id',
            'detalles.*.cantidad_solicitada' => 'required|numeric|gt:0',
        ]);

        try {
            $preReq = DB::transaction(function () use ($validated, $user) {
                $lastId = DB::table('requerimientos')->max('id') ?? 0;
                $correlativo = 'PRE-' . date('Y') . '-' . str_pad($lastId + 1, 4, '0', STR_PAD_LEFT);

                // Determinar personal y área responsable
                $personalId = $validated['personal_id'] ?? $user?->personal_id ?? null;
                $area = $validated['area'] ?? $user?->area;
                if (!$area && $personalId) {
                    $area = Personal::where('id', $personalId)->value('area');
                }
                if (!$area) {
                    $area = 'General';
                }

                $nuevo = Requerimiento::create([
                    'correlativo' => $correlativo,
                    'personal_id' => $personalId,
                    'area' => $area,
                    'fecha_solicitud' => now()->setTimezone('America/Lima')->format('Y-m-d H:i:s'),
                    'prioridad' => $validated['prioridad'] ?? 'media',
                    'estado' => 'pre_requerimiento',
                    'observaciones' => $validated['observaciones'] ?? 'Solicitud generada vía Carrito E-commerce',
                ]);

                foreach ($validated['detalles'] as $item) {
                    RequerimientoDetalle::create([
                        'requerimiento_id' => $nuevo->id,
                        'producto_id' => $item['producto_id'],
                        'cantidad_solicitada' => (float) $item['cantidad_solicitada'],
                        'costo_unitario' => 0, // Área no visualiza ni gestiona costos
                    ]);
                }

                return $nuevo;
            });

            return response()->json([
                'status' => 'success',
                'message' => "Pre-requerimiento {$preReq->correlativo} registrado con éxito y enviado a la bandeja de Almacén.",
                'data' => $preReq->load(['personal', 'detalles.producto.unidadMedida']),
            ], 201);

        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al registrar el pre-requerimiento: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Ver un pre-requerimiento en detalle.
     */
    public function show(string $id): JsonResponse
    {
        $req = Requerimiento::with(['personal', 'detalles.producto.unidadMedida'])->find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pre-requerimiento no encontrado',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $req,
        ], 200);
    }

    /**
     * Aprobar Pre-Requerimiento directamente.
     */
    public function aprobar(string $id): JsonResponse
    {
        $req = Requerimiento::find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pre-requerimiento no encontrado',
            ], 404);
        }

        $obs = $req->observaciones ? $req->observaciones . " | " : '';
        $req->update([
            'estado' => 'aprobado',
            'observaciones' => $obs . 'Aprobado por Almacén/Compras (' . now()->format('d/m/Y H:i') . ')',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Pre-requerimiento {$req->correlativo} aprobado exitosamente.",
            'data' => $req->load(['personal', 'detalles.producto.unidadMedida']),
        ], 200);
    }

    /**
     * Trasladar a Cotización (Compras) por falta de stock o decisión administrativa.
     * Convierte el estado a 'pendiente' para que ingrese formalmente a la mesa de Compras.
     */
    public function pasarACotizacion(Request $request, string $id): JsonResponse
    {
        $req = Requerimiento::find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pre-requerimiento no encontrado',
            ], 404);
        }

        $motivo = $request->input('motivo', 'Falta de stock disponible en almacén central');
        $obs = $req->observaciones ? $req->observaciones . " | " : '';

        $req->update([
            'estado' => 'pendiente',
            'observaciones' => $obs . "Derivado a Cotización por Almacén: {$motivo} (" . now()->format('d/m/Y H:i') . ")",
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Pre-requerimiento {$req->correlativo} derivado al flujo de Cotización y Compras.",
            'data' => $req->load(['personal', 'detalles.producto.unidadMedida']),
        ], 200);
    }

    /**
     * Procesar y Generar Nota de Salida (Despacho inmediato si hay stock).
     */
    public function procesarSalida(Request $request, string $id): JsonResponse
    {
        $req = Requerimiento::with(['detalles.producto'])->find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pre-requerimiento no encontrado',
            ], 404);
        }

        $almacenId = (int) ($request->input('almacen_id', 1));

        try {
            $cabecera = DB::transaction(function () use ($req, $almacenId, $request) {
                // 1. Validar existencias físicas en el almacén de despacho
                foreach ($req->detalles as $det) {
                    $producto = Producto::where('id', $det->producto_id)->lockForUpdate()->first();
                    $pivot = DB::table('almacen_producto')
                        ->where('almacen_id', $almacenId)
                        ->where('producto_id', $det->producto_id)
                        ->first();

                    $stockDisponible = $pivot ? (float) $pivot->stock : 0;
                    $solicitado = (float) $det->cantidad_solicitada;

                    if ($stockDisponible < $solicitado) {
                        throw new \Exception(
                            "Stock insuficiente para '{$producto->nombre}'. " .
                            "Disponible: {$stockDisponible}, Solicitado: {$solicitado}."
                        );
                    }
                }

                // 2. Personal destinatario
                $personalId = $req->personal_id ?? (Personal::first()->id ?? 1);
                $areaDestino = $req->area ?? 'General';
                $fechaEmision = now();

                // 3. Crear cabecera de Nota de Salida
                $cabecera = SalidaCabecera::create([
                    'almacen_id' => $almacenId,
                    'personal_id' => $personalId,
                    'destino_cliente' => "Despacho Pre-Req {$req->correlativo} a {$areaDestino}",
                    'tipo_salida' => 'Despacho de Pre-requerimiento',
                    'numero_referencia' => $req->correlativo,
                    'fecha_emision' => $fechaEmision,
                    'observaciones' => $request->input('observaciones', "Atención de solicitud {$req->correlativo}"),
                    'estado' => 'emitido',
                ]);

                // 4. Registrar detalles y descontar stock
                foreach ($req->detalles as $det) {
                    $producto = Producto::where('id', $det->producto_id)->first();
                    $cantidad = (float) $det->cantidad_solicitada;
                    $costoUnitario = (float) ($producto->costo_unitario ?? 0);
                    $costoTotal = $cantidad * $costoUnitario;

                    SalidaDetalle::create([
                        'salida_cabecera_id' => $cabecera->id,
                        'producto_id' => $producto->id,
                        'cantidad' => $cantidad,
                        'precio_unitario' => $costoUnitario,
                        'precio_total' => $costoTotal,
                    ]);

                    $pivot = DB::table('almacen_producto')
                        ->where('almacen_id', $almacenId)
                        ->where('producto_id', $producto->id)
                        ->first();

                    $stockAnterior = $pivot ? (float) $pivot->stock : 0;
                    $stockNuevo = max(0, $stockAnterior - $cantidad);

                    if ($pivot) {
                        DB::table('almacen_producto')
                            ->where('id', $pivot->id)
                            ->update([
                                'stock' => $stockNuevo,
                                'updated_at' => now(),
                            ]);
                    }

                    $stockTotalGlobal = (float) DB::table('almacen_producto')
                        ->where('producto_id', $producto->id)
                        ->sum('stock');

                    $producto->update(['stock_actual' => $stockTotalGlobal]);

                    // Registrar en Kardex
                    Kardex::create([
                        'almacen_id' => $almacenId,
                        'producto_id' => $producto->id,
                        'fecha_hora' => $fechaEmision,
                        'tipo_operacion' => 'SALIDA',
                        'documento_referencia_id' => $cabecera->id,
                        'stock_anterior' => $stockAnterior,
                        'cantidad_movimiento' => $cantidad,
                        'stock_actual' => $stockNuevo,
                        'costo_unitario' => $costoUnitario,
                        'costo_total_movimiento' => $costoTotal,
                        'saldo_valorizado_total' => $stockNuevo * $costoUnitario,
                    ]);
                }

                // 5. Marcar pre-requerimiento como despachado/aprobado
                $obs = $req->observaciones ? $req->observaciones . " | " : '';
                $req->update([
                    'estado' => 'aprobado',
                    'observaciones' => $obs . "Despachado en Nota de Salida #{$cabecera->id} (" . now()->format('d/m/Y H:i') . ")",
                ]);

                return $cabecera;
            });

            return response()->json([
                'status' => 'success',
                'message' => "Pre-requerimiento {$req->correlativo} despachado exitosamente con Nota de Salida #{$cabecera->id}.",
                'data' => [
                    'salida' => $cabecera->load(['personal', 'salidasDetalle.producto']),
                    'requerimiento' => $req,
                ],
            ], 200);

        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al despachar el pre-requerimiento: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Rechazar pre-requerimiento.
     */
    public function rechazar(Request $request, string $id): JsonResponse
    {
        $req = Requerimiento::find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pre-requerimiento no encontrado',
            ], 404);
        }

        $motivo = $request->input('motivo', 'Rechazado por administración');
        $obs = $req->observaciones ? $req->observaciones . " | " : '';

        $req->update([
            'estado' => 'rechazado',
            'observaciones' => $obs . "Motivo de rechazo: {$motivo} (" . now()->format('d/m/Y H:i') . ")",
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Pre-requerimiento {$req->correlativo} rechazado.",
            'data' => $req->load(['personal', 'detalles.producto.unidadMedida']),
        ], 200);
    }
}
