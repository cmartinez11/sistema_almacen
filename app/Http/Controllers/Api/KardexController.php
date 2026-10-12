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

        $almacenId = $request->input('almacen_id')
            ?? $request->header('X-Almacen-Id')
            ?? $request->attributes->get('active_almacen_id');

        // Buscar movimientos registrados en la tabla 'kardex' con la relación de almacén
        $queryKardex = Kardex::with('almacen')->where('producto_id', $producto->id);
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
                $tipoOp = strtoupper($k->tipo_operacion);
                $esEntrada = in_array($tipoOp, ['ENTRADA', 'TRANSFERENCIA_ENTRADA', 'INGRESO']);
                $cantMov = (float) $k->cantidad_movimiento;

                $docSustento = 'S/D';
                $observacion = '';

                if (str_contains($tipoOp, 'TRANSFERENCIA')) {
                    $transf = \App\Models\Transferencia::with(['almacenOrigen', 'almacenDestino'])->find($k->documento_referencia_id);
                    if ($transf) {
                        $docSustento = $transf->correlativo;
                        if ($esEntrada) {
                            $observacion = "Transferencia recibida desde " . ($transf->almacenOrigen->nombre ?? 'Almacén Origen');
                        } else {
                            $observacion = "Transferencia enviada a " . ($transf->almacenDestino->nombre ?? 'Almacén Destino');
                        }
                    } else {
                        $docSustento = "TR-{$k->documento_referencia_id}";
                        $observacion = $esEntrada ? "Transferencia de Ingreso" : "Transferencia de Salida";
                    }
                } elseif ($esEntrada) {
                    $cabecera = EntradaCabecera::with('proveedor')->find($k->documento_referencia_id);
                    if ($cabecera) {
                        $docSustento = $cabecera->correlativo ?? ($cabecera->numero_comprobante ? 'NI-'.$cabecera->numero_comprobante : 'NI-'.$cabecera->id);
                        $prov = $cabecera->proveedor->razon_social ?? 'Proveedor';
                        $observacion = "Ingreso por compra / recepción ({$prov})";
                    } else {
                        $docSustento = "NI-{$k->documento_referencia_id}";
                        $observacion = "Ingreso de Almacén";
                    }
                } else {
                    $cabecera = SalidaCabecera::with('personal')->find($k->documento_referencia_id);
                    if ($cabecera) {
                        $docSustento = $cabecera->correlativo ?? 'NS-'.str_pad($cabecera->id, 5, '0', STR_PAD_LEFT);
                        $pers = $cabecera->personal ? "{$cabecera->personal->nombres} {$cabecera->personal->apellidos}" : 'Personal';
                        $dest = $cabecera->destino_cliente ?? 'Asignación Interna';
                        $observacion = "Despachado a {$pers} ({$dest})";
                    } else {
                        $docSustento = "NS-{$k->documento_referencia_id}";
                        $observacion = "Salida a Personal";
                    }
                }

                $movimientos[] = [
                    'id' => $k->id,
                    'almacen_id' => $k->almacen_id,
                    'almacen' => $k->almacen ? ['id' => $k->almacen->id, 'nombre' => $k->almacen->nombre] : null,
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

        $canViewPrices = $this->userCanViewFinancials($request);
        if (!$canViewPrices) {
            $costoFiltrado = null;
            foreach ($movimientos as &$m) {
                $m['costo_unitario'] = null;
                $m['costo_total_movimiento'] = null;
                $m['saldo_valorizado'] = null;
            }
            unset($m);
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
                    'valor_total' => $costoFiltrado !== null ? ($stockFiltrado * $costoFiltrado) : null,
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
        if (!$this->userCanViewFinancials($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Acceso denegado: El Kardex Valorizado y costos contables están reservados exclusivamente para los roles de Administración y Compras.',
            ], 403);
        }

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

    /**
     * Exportar reporte de Kardex Valorizado compatible con Excel y SUNAT (CSV estructurado con UTF-8 BOM).
     */
    public function exportValorizadoCsv(\Illuminate\Http\Request $request)
    {
        if (!$this->userCanViewFinancials($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Acceso denegado: No tiene autorización para exportar datos financieros de valorización.',
            ], 403);
        }

        $almacenId = $request->input('almacen_id');
        $almacen = $almacenId ? \App\Models\Almacen::find($almacenId) : null;
        $nombreAlmacen = $almacen ? "{$almacen->nombre} ({$almacen->codigo})" : 'TODOS LOS ALMACENES (CONSOLIDADO)';

        $productos = Producto::with(['categoria', 'unidadMedida', 'almacenes'])->get();

        $almacenSlug = $almacen ? strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $almacen->codigo ?? $almacen->nombre)) . '_' : 'consolidado_';
        $filename = "kardex_valorizado_{$almacenSlug}" . date('Ymd_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($productos, $almacenId, $nombreAlmacen) {
            $handle = fopen('php://output', 'w');

            // BOM UTF-8 para apertura directa y limpia en Microsoft Excel sin problemas de tildes
            fputs($handle, "\xEF\xBB\xBF");

            // Metadatos de cabecera contable
            fputcsv($handle, ['SISTEMA DE GESTIÓN DE ALMACÉN - REPORTE DE KARDEX VALORIZADO'], ';');
            fputcsv($handle, ['ALMACÉN / PLANTA:', $nombreAlmacen], ';');
            fputcsv($handle, ['FECHA Y HORA DE EMISIÓN:', date('d/m/Y H:i:s')], ';');
            fputcsv($handle, ['MÉTODO DE VALUACIÓN CONTABLE:', 'PROMEDIO PONDERADO (SUNAT FORMATO 13.1)'], ';');
            fputcsv($handle, [], ';');

            // Columnas del reporte
            fputcsv($handle, [
                'N°',
                'CÓDIGO SKU',
                'DESCRIPCIÓN DEL PRODUCTO',
                'CATEGORÍA',
                'UNIDAD DE MEDIDA',
                'COSTO UNIT. PROM. (S/)',
                'STOCK FÍSICO ACTUAL',
                'VALOR TOTAL ACUMULADO (S/)',
                'MÉTODO VALUACIÓN',
            ], ';');

            $i = 1;
            $totalValorizado = 0;
            $totalFisico = 0;

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
                $totalValorizado += $valorTotalItem;
                $totalFisico += $stock;

                fputcsv($handle, [
                    $i++,
                    $p->sku,
                    $p->nombre,
                    $p->categoria->nombre ?? 'General',
                    $p->unidadMedida->nombre ?? 'UND',
                    number_format($costoUnitario, 4, '.', ''),
                    number_format($stock, 2, '.', ''),
                    number_format($valorTotalItem, 2, '.', ''),
                    'Promedio Ponderado',
                ], ';');
            }

            fputcsv($handle, [], ';');
            fputcsv($handle, [
                'TOTAL GENERAL',
                '',
                '',
                '',
                '',
                '',
                number_format($totalFisico, 2, '.', ''),
                number_format($totalValorizado, 2, '.', ''),
                '',
            ], ';');

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }
}
