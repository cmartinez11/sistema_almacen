<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Requerimiento;
use App\Models\RequerimientoDetalle;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class RequerimientoController extends Controller
{
    /**
     * Listar requerimientos con personal solicitante, proveedor e ítems.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Requerimiento::with(['personal', 'proveedor', 'detalles.producto.unidadMedida']);

        if ($request->filled('estado')) {
            $estados = explode(',', $request->input('estado'));
            if (count($estados) > 1) {
                $query->whereIn('estado', $estados);
            } else {
                $query->where('estado', $request->input('estado'));
            }
        }

        $requerimientos = $query->latest()->get();

        // Adjuntar el total ingresado a cada detalle de requerimiento
        foreach ($requerimientos as $req) {
            foreach ($req->detalles as $det) {
                $det->cantidad_recibida = (float) \App\Models\EntradaDetalle::whereHas('entradaCabecera', function ($q) use ($req) {
                    $q->where('requerimiento_id', $req->id);
                })->where('producto_id', $det->producto_id)->sum('cantidad');

                $det->cantidad_pendiente = max(0, (float) $det->cantidad_solicitada - (float) $det->cantidad_recibida);
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => $requerimientos,
        ], 200);
    }

    /**
     * Registrar una nueva solicitud de requerimiento de material (Sin Precios).
     */
    public function store(Request $request): JsonResponse
    {
        // Sanitizar valores vacíos recibidos desde el formulario frontend
        $input = $request->all();
        if (isset($input['personal_id']) && ($input['personal_id'] === '' || $input['personal_id'] === 'null' || $input['personal_id'] === 0)) {
            $input['personal_id'] = null;
        }
        if (isset($input['area']) && ($input['area'] === '' || $input['area'] === 'null')) {
            $input['area'] = null;
        }

        $validator = \Illuminate\Support\Facades\Validator::make($input, [
            'personal_id' => 'nullable|integer|exists:personal,id',
            'area' => 'nullable|string|max:100',
            'fecha_solicitud' => 'required|date',
            'prioridad' => 'required|in:baja,media,alta',
            'observaciones' => 'nullable|string',
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|exists:productos,id',
            'detalles.*.cantidad_solicitada' => 'required|numeric|gt:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Errores de validación en los datos del requerimiento',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        try {
            $requerimiento = DB::transaction(function () use ($validated) {
                $lastId = DB::table('requerimientos')->max('id') ?? 0;
                $correlativo = 'REQ-' . date('Y') . '-' . str_pad($lastId + 1, 4, '0', STR_PAD_LEFT);

                $req = Requerimiento::create([
                    'correlativo' => $correlativo,
                    'personal_id' => !empty($validated['personal_id']) ? $validated['personal_id'] : null,
                    'area' => !empty($validated['area']) ? $validated['area'] : null,
                    'fecha_solicitud' => $validated['fecha_solicitud'],
                    'prioridad' => $validated['prioridad'],
                    'estado' => 'pendiente',
                    'observaciones' => $validated['observaciones'] ?? null,
                ]);

                foreach ($validated['detalles'] as $item) {
                    RequerimientoDetalle::create([
                        'requerimiento_id' => $req->id,
                        'producto_id' => $item['producto_id'],
                        'cantidad_solicitada' => (float) $item['cantidad_solicitada'],
                        'costo_unitario' => 0,
                    ]);
                }

                return $req;
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Solicitud de requerimiento enviada a Compras correctamente',
                'data' => $requerimiento->load(['personal', 'proveedor', 'detalles.producto.unidadMedida']),
            ], 201);

        } catch (Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Error en RequerimientoController@store: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Error transaccional al crear el requerimiento: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mostrar detalle de un requerimiento.
     */
    public function show(string $id): JsonResponse
    {
        $req = Requerimiento::with(['personal', 'proveedor', 'detalles.producto.unidadMedida'])->find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Requerimiento no encontrado',
            ], 404);
        }

        foreach ($req->detalles as $det) {
            $det->cantidad_recibida = (float) \App\Models\EntradaDetalle::whereHas('entradaCabecera', function ($q) use ($req) {
                $q->where('requerimiento_id', $req->id);
            })->where('producto_id', $det->producto_id)->sum('cantidad');

            $det->cantidad_pendiente = max(0, (float) $det->cantidad_solicitada - (float) $det->cantidad_recibida);
        }

        return response()->json([
            'status' => 'success',
            'data' => $req,
        ], 200);
    }

    /**
     * Cotizar y Emitir Orden de Compra (Área de Compras / Admin).
     * Asigna el proveedor seleccionado, costos unitarios y cambia el estado a 'pedido' o 'parcial'.
     */
    public function cotizar(Request $request, string $id): JsonResponse
    {
        $req = Requerimiento::find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Requerimiento no encontrado',
            ], 404);
        }

        $validated = $request->validate([
            'proveedor_id' => 'required|exists:proveedores,id',
            'estado' => 'nullable|in:pedido,parcial,aprobado',
            'detalles' => 'required|array|min:1',
            'detalles.*.id' => 'nullable|exists:requerimiento_detalles,id',
            'detalles.*.producto_id' => 'required|exists:productos,id',
            'detalles.*.cantidad_solicitada' => 'required|numeric|gt:0',
            'detalles.*.costo_unitario' => 'required|numeric|min:0',
        ]);

        try {
            DB::transaction(function () use ($req, $validated) {
                $estadoFinal = $validated['estado'] ?? 'pedido';

                $req->update([
                    'proveedor_id' => $validated['proveedor_id'],
                    'estado' => $estadoFinal,
                ]);

                foreach ($validated['detalles'] as $item) {
                    if (isset($item['id'])) {
                        RequerimientoDetalle::where('id', $item['id'])->update([
                            'cantidad_solicitada' => $item['cantidad_solicitada'],
                            'costo_unitario' => $item['costo_unitario'],
                        ]);
                    } else {
                        RequerimientoDetalle::updateOrCreate(
                            ['requerimiento_id' => $req->id, 'producto_id' => $item['producto_id']],
                            [
                                'cantidad_solicitada' => $item['cantidad_solicitada'],
                                'costo_unitario' => $item['costo_unitario'],
                            ]
                        );
                    }
                }
            });

            return response()->json([
                'status' => 'success',
                'message' => "Orden de Compra emitida para el requerimiento {$req->correlativo}. Estado: PEDIDO.",
                'data' => $req->load(['personal', 'proveedor', 'detalles.producto.unidadMedida']),
            ], 200);

        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error al cotizar la orden de compra: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Generar y descargar/visualizar la Orden de Requerimiento / Compra en formato PDF.
     */
    public function exportPdf(string $id)
    {
        $requerimiento = Requerimiento::with(['personal', 'proveedor', 'detalles.producto.unidadMedida'])->find($id);

        if (!$requerimiento) {
            return response()->json([
                'status' => 'error',
                'message' => 'Requerimiento no encontrado',
            ], 404);
        }

        return Pdf::loadView('pdf.requerimiento', compact('requerimiento'))
            ->setPaper('a4', 'portrait')
            ->stream("Requerimiento_{$requerimiento->correlativo}.pdf");
    }

    /**
     * Aprobar requerimiento (Área de Compras / Admin).
     */
    public function aprobar(string $id): JsonResponse
    {
        $req = Requerimiento::find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Requerimiento no encontrado',
            ], 404);
        }

        $req->update(['estado' => 'aprobado']);

        return response()->json([
            'status' => 'success',
            'message' => "Requerimiento {$req->correlativo} APROBADO correctamente.",
            'data' => $req->load(['personal', 'proveedor', 'detalles.producto.unidadMedida']),
        ], 200);
    }

    /**
     * Rechazar requerimiento (Área de Compras / Admin).
     */
    public function rechazar(string $id): JsonResponse
    {
        $req = Requerimiento::find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Requerimiento no encontrado',
            ], 404);
        }

        $req->update(['estado' => 'rechazado']);

        return response()->json([
            'status' => 'success',
            'message' => "Requerimiento {$req->correlativo} RECHAZADO.",
            'data' => $req->load(['personal', 'proveedor', 'detalles.producto.unidadMedida']),
        ], 200);
    }

    /**
     * Cerrar / Cancelar saldo pendiente de un requerimiento parcial (Área de Compras).
     */
    public function cerrarFaltante(string $id): JsonResponse
    {
        $req = Requerimiento::with('detalles')->find($id);

        if (!$req) {
            return response()->json([
                'status' => 'error',
                'message' => 'Requerimiento no encontrado',
            ], 404);
        }

        DB::transaction(function () use ($req) {
            $req->update(['estado' => 'cerrado']);
        });

        return response()->json([
            'status' => 'success',
            'message' => "Saldo pendiente del requerimiento {$req->correlativo} descartado. Estado final: CERRADO.",
            'data' => $req->load(['personal', 'proveedor', 'detalles.producto.unidadMedida']),
        ], 200);
    }
}
