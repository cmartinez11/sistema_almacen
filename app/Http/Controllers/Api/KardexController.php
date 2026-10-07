<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EntradaCabecera;
use App\Models\EntradaDetalle;
use App\Models\Kardex;
use App\Models\Producto;
use App\Models\SalidaCabecera;
use App\Models\SalidaDetalle;
use Illuminate\Http\JsonResponse;

class KardexController extends Controller
{
    /**
     * Obtener movimientos de Kardex Físico y Valorizado para un producto específico, opcionalmente filtrado por almacén.
     */
    public function getByProducto(string $productoId, \Illuminate\Http\Request $request): JsonResponse
    {
        $producto = Producto::with(['categoria', 'unidadMedida', 'almacenes'])->find($productoId);

        if (!$producto) {
            return response()->json([
                'status' => 'error',
                'message' => 'Producto no encontrado',
            ], 404);
        }

        $almacenId = $request->input('almacen_id');

        // Buscar movimientos registrados en la tabla 'kardex'
        $queryKardex = Kardex::where('producto_id', $producto->id);
        if ($almacenId) {
            $queryKardex->where('almacen_id', $almacenId);
        }

        $movimientosKardex = $queryKardex
            ->orderBy('fecha_hora', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $movimientos = [];

        if ($movimientosKardex->count() > 0) {
            foreach ($movimientosKardex as $k) {
                $esEntrada = strtoupper($k->tipo_operacion) === 'ENTRADA';
                $cantMov = (float) $k->cantidad_movimiento;

                $docSustento = 'S/D';
                $observacion = '';

                if ($esEntrada) {
                    $cabecera = EntradaCabecera::with('proveedor')->find($k->documento_referencia_id);
                    if ($cabecera) {
                        $docSustento = $cabecera->correlativo ?? ($cabecera->numero_comprobante ? 'NI-'.$cabecera->numero_comprobante : 'NI-'.$cabecera->id);
                        $prov = $cabecera->proveedor->razon_social ?? 'Proveedor';
                        $observacion = "Ingreso por compra / recepción ({$prov})";
                    } else {
                        $transf = \App\Models\Transferencia::with(['almacenOrigen', 'almacenDestino'])->find($k->documento_referencia_id);
                        if ($transf) {
                            $docSustento = $transf->correlativo;
                            $observacion = "Transferencia recibida desde " . ($transf->almacenOrigen->nombre ?? 'Almacén');
                        } else {
                            $docSustento = "NI-{$k->documento_referencia_id}";
                            $observacion = "Ingreso de Almacén";
                        }
                    }
                } else {
                    $cabecera = SalidaCabecera::with('personal')->find($k->documento_referencia_id);
                    if ($cabecera) {
                        $docSustento = $cabecera->correlativo ?? 'NS-'.str_pad($cabecera->id, 5, '0', STR_PAD_LEFT);
                        $pers = $cabecera->personal ? "{$cabecera->personal->nombres} {$cabecera->personal->apellidos}" : 'Personal';
                        $dest = $cabecera->destino_cliente ?? 'Asignación Interna';
                        $observacion = "Despachado a {$pers} ({$dest})";
                    } else {
                        $transf = \App\Models\Transferencia::with(['almacenOrigen', 'almacenDestino'])->find($k->documento_referencia_id);
                        if ($transf) {
                            $docSustento = $transf->correlativo;
                            $observacion = "Transferencia enviada a " . ($transf->almacenDestino->nombre ?? 'Almacén');
                        } else {
                            $docSustento = "NS-{$k->documento_referencia_id}";
                            $observacion = "Salida a Personal";
                        }
                    }
                }

                $movimientos[] = [
                    'id' => $k->id,
                    'almacen_id' => $k->almacen_id,
                    'fecha' => \Carbon\Carbon::parse($k->fecha_hora)->format('Y-m-d H:i'),
                    'tipo' => strtoupper($k->tipo_operacion),
                    'doc' => $docSustento,
                    'entrada' => $esEntrada ? $cantMov : 0,
                    'salida' => !$esEntrada ? $cantMov : 0,
                    'saldo_fisico' => (float) $k->stock_actual,
                    'costo_unitario' => (float) $k->costo_unitario,
                    'costo_total_movimiento' => (float) $k->costo_total_movimiento,
                    'saldo_valorizado' => (float) $k->saldo_valorizado_total,
                    'observacion' => $observacion,
                ];
            }
        } else {
            // Generar trazabilidad dinámica
            $entradasQuery = EntradaDetalle::where('producto_id', $producto->id)
                ->with(['entradaCabecera.proveedor']);
            if ($almacenId) {
                $entradasQuery->whereHas('entradaCabecera', function ($q) use ($almacenId) {
                    $q->where('almacen_id', $almacenId);
                });
            }

            $entradas = $entradasQuery->get()
                ->map(function ($det) {
                    return [
                        'fecha_hora' => $det->entradaCabecera->fecha_emision ?? $det->created_at,
                        'tipo_operacion' => 'ENTRADA',
                        'cantidad' => (float) $det->cantidad,
                        'costo_unitario' => (float) $det->costo_unitario,
                        'doc' => $det->entradaCabecera->numero_comprobante ?? 'NI-'.$det->entrada_cabecera_id,
                        'observacion' => 'Ingreso de Almacén - ' . ($det->entradaCabecera->proveedor->razon_social ?? 'Proveedor'),
                    ];
                });

            $salidasQuery = SalidaDetalle::where('producto_id', $producto->id)
                ->with(['salidaCabecera.personal']);
            if ($almacenId) {
                $salidasQuery->whereHas('salidaCabecera', function ($q) use ($almacenId) {
                    $q->where('almacen_id', $almacenId);
                });
            }

            $salidas = $salidasQuery->get()
                ->map(function ($det) {
                    $pers = $det->salidaCabecera->personal ? $det->salidaCabecera->personal->nombres . ' ' . $det->salidaCabecera->personal->apellidos : 'Trabajador';
                    return [
                        'fecha_hora' => $det->salidaCabecera->fecha_emision ?? $det->created_at,
                        'tipo_operacion' => 'SALIDA',
                        'cantidad' => (float) $det->cantidad,
                        'costo_unitario' => (float) $det->precio_unitario,
                        'doc' => 'NS-'.str_pad($det->salida_cabecera_id, 5, '0', STR_PAD_LEFT),
                        'observacion' => 'Entregado a ' . $pers,
                    ];
                });

            $todosMovimientos = $entradas->concat($salidas)->sortBy('fecha_hora')->values();

            $saldoActualTemp = 0;
            $saldoValTemp = 0;
            $idx = 1;

            foreach ($todosMovimientos as $mov) {
                $esEntrada = $mov['tipo_operacion'] === 'ENTRADA';
                if ($esEntrada) {
                    $saldoActualTemp += $mov['cantidad'];
                    $costoMov = $mov['cantidad'] * $mov['costo_unitario'];
                    $saldoValTemp += $costoMov;
                } else {
                    $saldoActualTemp = max(0, $saldoActualTemp - $mov['cantidad']);
                    $costoMov = $mov['cantidad'] * $mov['costo_unitario'];
                    $saldoValTemp = max(0, $saldoValTemp - $costoMov);
                }

                $movimientos[] = [
                    'id' => $idx++,
                    'fecha' => \Carbon\Carbon::parse($mov['fecha_hora'])->format('Y-m-d H:i'),
                    'tipo' => $mov['tipo_operacion'],
                    'doc' => $mov['doc'],
                    'entrada' => $esEntrada ? $mov['cantidad'] : 0,
                    'salida' => !$esEntrada ? $mov['cantidad'] : 0,
                    'saldo_fisico' => $saldoActualTemp,
                    'costo_unitario' => $mov['costo_unitario'],
                    'costo_total_movimiento' => $costoMov,
                    'saldo_valorizado' => $saldoValTemp,
                    'observacion' => $mov['observacion'],
                ];
            }
        }

        // Obtener stock del almacén o stock global
        $stockFiltrado = (float) $producto->stock_actual;
        $costoFiltrado = (float) $producto->costo_unitario;

        if ($almacenId) {
            $pivot = \Illuminate\Support\Facades\DB::table('almacen_producto')
                ->where('almacen_id', $almacenId)
                ->where('producto_id', $producto->id)
                ->first();
            if ($pivot) {
                $stockFiltrado = (float) $pivot->stock;
                $costoFiltrado = (float) $pivot->costo_unitario;
            } else {
                $stockFiltrado = 0;
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'producto' => [
                    'id' => $producto->id,
                    'sku' => $producto->sku,
                    'nombre' => $producto->nombre,
                    'stock_actual' => $stockFiltrado,
                    'costo_unitario' => $costoFiltrado,
                    'valor_total' => $stockFiltrado * $costoFiltrado,
                    'categoria' => $producto->categoria->nombre ?? 'General',
                    'unidad_medida' => $producto->unidadMedida->nombre ?? 'UND',
                ],
                'movimientos' => $movimientos,
            ],
        ], 200);
    }

    /**
     * Obtener el resumen contable del Kardex Valorizado para todo el catálogo de productos o filtrado por almacén.
     */
    public function getValorizadoResumen(\Illuminate\Http\Request $request): JsonResponse
    {
        $almacenId = $request->input('almacen_id');

        $productos = Producto::with(['categoria', 'unidadMedida', 'almacenes'])->get();

        $resumen = [];
        $valorTotalGeneral = 0;
        $totalItemsFisicos = 0;

        foreach ($productos as $p) {
            $stock = (float) $p->stock_actual;
            $costoUnitario = (float) $p->costo_unitario;

            if ($almacenId) {
                $pivot = $p->almacenes->where('id', $almacenId)->first();
                if ($pivot && $pivot->pivot) {
                    $stock = (float) $pivot->pivot->stock;
                    $costoUnitario = (float) $pivot->pivot->costo_unitario;
                } else {
                    $stock = 0;
                }
            }

            $valorTotalItem = $stock * $costoUnitario;

            $valorTotalGeneral += $valorTotalItem;
            $totalItemsFisicos += $stock;

            $resumen[] = [
                'id' => $p->id,
                'sku' => $p->sku,
                'producto' => $p->nombre,
                'categoria' => $p->categoria->nombre ?? 'General',
                'unidad_medida' => $p->unidadMedida->nombre ?? 'UND',
                'costo_unitario' => $costoUnitario,
                'stock_fisico' => $stock,
                'valor_total' => $valorTotalItem,
                'metodo' => 'Promedio Ponderado',
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'valor_total_general' => $valorTotalGeneral,
                'total_items_fisicos' => $totalItemsFisicos,
                'productos' => $resumen,
            ],
        ], 200);
    }
}
