<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\Kardex;
use App\Models\Producto;
use App\Models\Transferencia;
use App\Models\TransferenciaDetalle;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransferenciaController extends Controller
{
    /**
     * Listar todas las transferencias registradas.
     */
    public function index()
    {
        $transferencias = Transferencia::with([
            'almacenOrigen',
            'almacenDestino',
            'detalles.producto.unidadMedida',
            'user',
        ])
        ->orderBy('id', 'desc')
        ->get();

        return response()->json([
            'status' => 'success',
            'data' => $transferencias,
        ]);
    }

    /**
     * Registrar una nueva transferencia de stock entre almacenes.
     */
    public function store(Request $request)
    {
        $request->validate([
            'almacen_origen_id' => 'required|exists:almacenes,id',
            'almacen_destino_id' => 'required|exists:almacenes,id|different:almacen_origen_id',
            'observaciones' => 'nullable|string',
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|exists:productos,id',
            'detalles.*.cantidad' => 'required|numeric|gt:0',
        ], [
            'almacen_destino_id.different' => 'El almacén de destino debe ser diferente al almacén de origen.',
            'detalles.min' => 'Debe agregar al menos un producto a la transferencia.',
        ]);

        return DB::transaction(function () use ($request) {
            $almacenOrigen = Almacen::findOrFail($request->almacen_origen_id);
            $almacenDestino = Almacen::findOrFail($request->almacen_destino_id);

            // 1. Validar stock disponible en el almacén de origen para cada producto
            foreach ($request->detalles as $det) {
                $producto = Producto::findOrFail($det['producto_id']);
                $pivotOrigen = DB::table('almacen_producto')
                    ->where('almacen_id', $almacenOrigen->id)
                    ->where('producto_id', $producto->id)
                    ->first();

                $stockDisponibleOrigen = $pivotOrigen ? (float)$pivotOrigen->stock : 0;
                $cantidadRequerida = (float)$det['cantidad'];

                if ($stockDisponibleOrigen < $cantidadRequerida) {
                    throw ValidationException::withMessages([
                        'detalles' => ["El producto '{$producto->nombre}' no cuenta con stock suficiente en '{$almacenOrigen->nombre}'. Stock disponible: {$stockDisponibleOrigen} u."],
                    ]);
                }
            }

            // 2. Generar Correlativo Único TR-2026-XXXX
            $year = date('Y');
            $ultimo = Transferencia::whereYear('created_at', $year)->max('id') ?? 0;
            $correlativo = sprintf('TR-%s-%04d', $year, $ultimo + 1);

            // 3. Crear cabecera de Transferencia
            $transferencia = Transferencia::create([
                'correlativo' => $correlativo,
                'almacen_origen_id' => $almacenOrigen->id,
                'almacen_destino_id' => $almacenDestino->id,
                'user_id' => Auth::id() ?? $request->user_id,
                'personal_id' => $request->personal_id,
                'fecha_emision' => now(),
                'observaciones' => $request->observaciones,
                'estado' => 'completado',
            ]);

            // 4. Procesar detalles y actualizar stock en pivote + registrar kardex
            foreach ($request->detalles as $det) {
                $productoId = $det['producto_id'];
                $cantidad = (float)$det['cantidad'];

                // Guardar detalle
                TransferenciaDetalle::create([
                    'transferencia_id' => $transferencia->id,
                    'producto_id' => $productoId,
                    'cantidad' => $cantidad,
                ]);

                // --- ACTUALIZAR ORIGEN ---
                $pivotOrigen = DB::table('almacen_producto')
                    ->where('almacen_id', $almacenOrigen->id)
                    ->where('producto_id', $productoId)
                    ->first();

                $costoUnitario = $pivotOrigen ? (float)$pivotOrigen->costo_unitario : 0;
                $stockOrigenAnterior = $pivotOrigen ? (float)$pivotOrigen->stock : 0;
                $nuevoStockOrigen = $stockOrigenAnterior - $cantidad;

                DB::table('almacen_producto')
                    ->where('almacen_id', $almacenOrigen->id)
                    ->where('producto_id', $productoId)
                    ->update([
                        'stock' => $nuevoStockOrigen,
                        'updated_at' => now(),
                    ]);

                // Registrar Kardex SALIDA en Origen
                Kardex::create([
                    'almacen_id' => $almacenOrigen->id,
                    'producto_id' => $productoId,
                    'fecha_hora' => now(),
                    'tipo_operacion' => 'SALIDA',
                    'documento_referencia_id' => $transferencia->id,
                    'stock_anterior' => $stockOrigenAnterior,
                    'cantidad_movimiento' => $cantidad,
                    'stock_actual' => $nuevoStockOrigen,
                    'costo_unitario' => $costoUnitario,
                    'costo_total_movimiento' => $cantidad * $costoUnitario,
                    'saldo_valorizado_total' => $nuevoStockOrigen * $costoUnitario,
                ]);

                // --- ACTUALIZAR DESTINO ---
                $pivotDestino = DB::table('almacen_producto')
                    ->where('almacen_id', $almacenDestino->id)
                    ->where('producto_id', $productoId)
                    ->first();

                $stockDestinoAnterior = $pivotDestino ? (float)$pivotDestino->stock : 0;

                if ($pivotDestino) {
                    $nuevoStockDestino = $stockDestinoAnterior + $cantidad;

                    DB::table('almacen_producto')
                        ->where('almacen_id', $almacenDestino->id)
                        ->where('producto_id', $productoId)
                        ->update([
                            'stock' => $nuevoStockDestino,
                            'updated_at' => now(),
                        ]);
                } else {
                    $nuevoStockDestino = $cantidad;
                    DB::table('almacen_producto')->insert([
                        'almacen_id' => $almacenDestino->id,
                        'producto_id' => $productoId,
                        'stock' => $nuevoStockDestino,
                        'costo_unitario' => $costoUnitario,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                // Registrar Kardex ENTRADA en Destino
                Kardex::create([
                    'almacen_id' => $almacenDestino->id,
                    'producto_id' => $productoId,
                    'fecha_hora' => now(),
                    'tipo_operacion' => 'ENTRADA',
                    'documento_referencia_id' => $transferencia->id,
                    'stock_anterior' => $stockDestinoAnterior,
                    'cantidad_movimiento' => $cantidad,
                    'stock_actual' => $nuevoStockDestino,
                    'costo_unitario' => $costoUnitario,
                    'costo_total_movimiento' => $cantidad * $costoUnitario,
                    'saldo_valorizado_total' => $nuevoStockDestino * $costoUnitario,
                ]);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Transferencia entre almacenes realizada exitosamente.',
                'data' => $transferencia->load(['almacenOrigen', 'almacenDestino', 'detalles.producto']),
            ], 201);
        });
    }

    /**
     * Generar y descargar reporte PDF de la Guía de Transferencia Interna.
     */
    public function pdf($id)
    {
        $transferencia = Transferencia::with([
            'almacenOrigen',
            'almacenDestino',
            'detalles.producto.unidadMedida',
            'user',
        ])->findOrFail($id);

        $pdf = Pdf::loadView('pdf.guia_transferencia', compact('transferencia'));
        return $pdf->stream("Guia_Transferencia_{$transferencia->correlativo}.pdf");
    }
}
