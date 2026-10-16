<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EntradaCabecera;
use App\Models\EntradaDetalle;
use App\Models\Kardex;
use App\Models\Producto;
use App\Models\SalidaCabecera;
use App\Models\SalidaDetalle;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;

class KardexController extends Controller
{
    /**
     * Obtener movimientos de Kardex Físico y Valorizado para un producto específico, calculando
     * en tiempo real el Promedio Ponderado Móvil según normativa contable (SUNAT Formato 13.1).
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

        $calculo = $this->calcularKardexDetalladoProducto($producto, $almacenId ? (int)$almacenId : null);

        $canViewPrices = $this->userCanViewFinancials($request);
        $movimientos = $calculo['movimientos'];
        $kpis = $calculo['kpis'];
        $prodData = $calculo['producto'];

        if (!$canViewPrices) {
            $prodData['costo_unitario'] = null;
            $prodData['valor_total'] = null;

            $kpis['total_entradas_valor'] = null;
            $kpis['total_salidas_valor'] = null;
            $kpis['costo_promedio_vigente'] = null;
            $kpis['saldo_actual_valorizado'] = null;

            foreach ($movimientos as &$m) {
                $m['entrada_costo_unitario'] = null;
                $m['entrada_total'] = null;
                $m['salida_costo_unitario'] = null;
                $m['salida_total'] = null;
                $m['saldo_costo_promedio'] = null;
                $m['saldo_total_valorizado'] = null;

                $m['costo_unitario'] = null;
                $m['costo_total_movimiento'] = null;
                $m['saldo_valorizado'] = null;
            }
            unset($m);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'producto' => $prodData,
                'kpis' => $kpis,
                'movimientos' => $movimientos,
                'filas' => $movimientos,
            ],
        ], 200);
    }

    /**
     * Motor de cálculo secuencial del Promedio Ponderado Móvil para un producto específico.
     * Sigue la fórmula contable:
     * - Entradas: Cantidad, Costo Unitario, Total Entrada.
     *   Nuevo Costo Unitario Promedio = (Valor Total Anterior + Total Entrada) / (Cant. Anterior + Cant. Entrada)
     * - Salidas: Cantidad valorizada al último Costo Unitario Promedio vigente.
     *   Total Salida = Cantidad Salida × C.U. Prom.
     * - Saldos: Cantidad resultante y Valor Total Acumulado.
     */
    public function calcularKardexDetalladoProducto(Producto $producto, ?int $almacenId = null): array
    {
        // 1. Obtener movimientos registrados en tabla 'kardex' con relación de almacén
        $queryKardex = Kardex::with('almacen')->where('producto_id', $producto->id);
        if ($almacenId) {
            $queryKardex->where('almacen_id', $almacenId);
        }

        $movimientosKardex = $queryKardex
            ->orderBy('fecha_hora', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $rawItems = [];

        if ($movimientosKardex->count() > 0) {
            foreach ($movimientosKardex as $k) {
                $tipoOp = strtoupper($k->tipo_operacion);
                $esEntrada = in_array($tipoOp, ['ENTRADA', 'TRANSFERENCIA_ENTRADA', 'INGRESO', 'AJUSTE_POSITIVO', 'SALDO_INICIAL', 'COMPRA']);
                $cantMov = (float) $k->cantidad_movimiento;

                $docSustento = 'S/D';
                $observacion = '';
                $movLabel = $esEntrada ? 'Ingreso por Compra' : 'Despacho a Personal';

                if (str_contains($tipoOp, 'TRANSFERENCIA')) {
                    $transf = \App\Models\Transferencia::with(['almacenOrigen', 'almacenDestino'])->find($k->documento_referencia_id);
                    if ($transf) {
                        $docSustento = $transf->correlativo ?? "TR-{$transf->id}";
                        if ($esEntrada) {
                            $observacion = "Transferencia desde " . ($transf->almacenOrigen->nombre ?? 'Almacén Origen');
                            $movLabel = 'Transferencia de Entrada';
                        } else {
                            $observacion = "Transferencia hacia " . ($transf->almacenDestino->nombre ?? 'Almacén Destino');
                            $movLabel = 'Transferencia de Salida';
                        }
                    } else {
                        $docSustento = "TR-{$k->documento_referencia_id}";
                        $observacion = $esEntrada ? "Transferencia de Ingreso" : "Transferencia de Salida";
                        $movLabel = $esEntrada ? 'Transferencia de Entrada' : 'Transferencia de Salida';
                    }
                } elseif (str_contains($tipoOp, 'AJUSTE') || str_contains($tipoOp, 'INVENTARIO')) {
                    $docSustento = "AJ-" . str_pad($k->documento_referencia_id ?? $k->id, 5, '0', STR_PAD_LEFT);
                    $movLabel = $esEntrada ? 'Ajuste Físico (+)' : 'Ajuste Físico (-)';
                    $observacion = 'Ajuste por inventario físico';
                } elseif ($esEntrada) {
                    $cabecera = EntradaCabecera::with('proveedor')->find($k->documento_referencia_id);
                    if ($cabecera) {
                        $docSustento = $cabecera->correlativo ?? ($cabecera->numero_comprobante ? 'NI-'.$cabecera->numero_comprobante : 'NI-'.$cabecera->id);
                        $prov = $cabecera->proveedor->razon_social ?? 'Proveedor';
                        $observacion = "Ingreso por compra ({$prov})";
                        $movLabel = 'Ingreso / Compra';
                    } else {
                        $docSustento = "NI-{$k->documento_referencia_id}";
                        $observacion = "Ingreso de Almacén";
                        $movLabel = 'Ingreso de Almacén';
                    }
                } else {
                    $cabecera = SalidaCabecera::with('personal')->find($k->documento_referencia_id);
                    if ($cabecera) {
                        $docSustento = $cabecera->correlativo ?? 'NS-'.str_pad($cabecera->id, 5, '0', STR_PAD_LEFT);
                        $pers = $cabecera->personal ? "{$cabecera->personal->nombres} {$cabecera->personal->apellidos}" : 'Personal';
                        $dest = $cabecera->destino_cliente ?? 'Asignación Interna';
                        $observacion = "Despachado a {$pers} ({$dest})";
                        $movLabel = 'Consumo / Despacho';
                    } else {
                        $docSustento = "NS-{$k->documento_referencia_id}";
                        $observacion = "Salida a Personal";
                        $movLabel = 'Salida de Almacén';
                    }
                }

                $rawItems[] = [
                    'id' => $k->id,
                    'fecha_hora' => $k->fecha_hora,
                    'tipo_operacion' => $tipoOp,
                    'es_entrada' => $esEntrada,
                    'cantidad' => $cantMov,
                    'costo_unitario' => (float) $k->costo_unitario,
                    'documento' => $docSustento,
                    'movimiento_label' => $movLabel,
                    'detalle' => $observacion,
                    'almacen_nombre' => $k->almacen->nombre ?? null,
                ];
            }
        } else {
            // Trazabilidad dinámica desde tablas maestras
            $entradasQuery = EntradaDetalle::where('producto_id', $producto->id)
                ->with(['entradaCabecera.proveedor', 'entradaCabecera.almacen']);
            if ($almacenId) {
                $entradasQuery->whereHas('entradaCabecera', function ($q) use ($almacenId) {
                    $q->where('almacen_id', $almacenId);
                });
            }

            $entradas = $entradasQuery->get()->map(function ($det) {
                $prov = $det->entradaCabecera->proveedor->razon_social ?? 'Proveedor';
                return [
                    'id' => $det->id,
                    'fecha_hora' => $det->entradaCabecera->fecha_emision ?? $det->created_at,
                    'tipo_operacion' => 'ENTRADA',
                    'es_entrada' => true,
                    'cantidad' => (float) $det->cantidad,
                    'costo_unitario' => (float) $det->costo_unitario,
                    'documento' => $det->entradaCabecera->correlativo ?? ($det->entradaCabecera->numero_comprobante ? 'NI-'.$det->entradaCabecera->numero_comprobante : 'NI-'.$det->entrada_cabecera_id),
                    'movimiento_label' => 'Ingreso / Compra',
                    'detalle' => 'Ingreso por compra (' . $prov . ')',
                    'almacen_nombre' => $det->entradaCabecera->almacen->nombre ?? null,
                ];
            });

            $salidasQuery = SalidaDetalle::where('producto_id', $producto->id)
                ->with(['salidaCabecera.personal', 'salidaCabecera.almacen']);
            if ($almacenId) {
                $salidasQuery->whereHas('salidaCabecera', function ($q) use ($almacenId) {
                    $q->where('almacen_id', $almacenId);
                });
            }

            $salidas = $salidasQuery->get()->map(function ($det) {
                $pers = $det->salidaCabecera->personal ? ($det->salidaCabecera->personal->nombres . ' ' . $det->salidaCabecera->personal->apellidos) : 'Trabajador';
                return [
                    'id' => $det->id,
                    'fecha_hora' => $det->salidaCabecera->fecha_emision ?? $det->created_at,
                    'tipo_operacion' => 'SALIDA',
                    'es_entrada' => false,
                    'cantidad' => (float) $det->cantidad,
                    'costo_unitario' => (float) $det->precio_unitario,
                    'documento' => $det->salidaCabecera->correlativo ?? ('NS-'.str_pad($det->salida_cabecera_id, 5, '0', STR_PAD_LEFT)),
                    'movimiento_label' => 'Consumo / Despacho',
                    'detalle' => 'Despachado a ' . $pers,
                    'almacen_nombre' => $det->salidaCabecera->almacen->nombre ?? null,
                ];
            });

            $rawItems = $entradas->concat($salidas)
                ->sortBy(function ($item) {
                    return \Carbon\Carbon::parse($item['fecha_hora'])->timestamp;
                })
                ->values()
                ->toArray();
        }

        // 2. Ejecutar el cálculo secuencial del Promedio Ponderado Móvil
        $saldoCantidad = 0.0;
        $saldoValorTotal = 0.0;
        $costoPromedioActual = (float) ($producto->costo_unitario ?? 0.0);

        $movimientosCalculados = [];
        $totalEntradasCant = 0.0;
        $totalEntradasValor = 0.0;
        $totalSalidasCant = 0.0;
        $totalSalidasValor = 0.0;

        foreach ($rawItems as $idx => $m) {
            $esEntrada = (bool) ($m['es_entrada'] ?? false);
            $cantidad = (float) $m['cantidad'];

            if ($esEntrada) {
                $costoUnitarioEntrada = (float) ($m['costo_unitario'] ?? 0.0);
                if ($costoUnitarioEntrada <= 0 && $costoPromedioActual > 0) {
                    $costoUnitarioEntrada = $costoPromedioActual;
                }

                $totalEntrada = round($cantidad * $costoUnitarioEntrada, 2);

                $nuevaCantidad = $saldoCantidad + $cantidad;
                $nuevoValorTotal = $saldoValorTotal + $totalEntrada;

                // Fórmula contable: C.U. Prom = (Valor Total Anterior + Total Entrada) / (Cant. Anterior + Cant. Entrada)
                $nuevoCuProm = $nuevaCantidad > 0 ? ($nuevoValorTotal / $nuevaCantidad) : $costoUnitarioEntrada;

                $saldoCantidad = $nuevaCantidad;
                $saldoValorTotal = $nuevoValorTotal;
                $costoPromedioActual = $nuevoCuProm;

                $totalEntradasCant += $cantidad;
                $totalEntradasValor += $totalEntrada;

                $movimientosCalculados[] = [
                    'id' => $m['id'] ?? ($idx + 1),
                    'fecha' => \Carbon\Carbon::parse($m['fecha_hora'])->format('Y-m-d H:i'),
                    'tipo' => 'ENTRADA',
                    'movimiento' => $m['movimiento_label'] ?? 'Ingreso / Compra',
                    'documento' => $m['documento'] ?? 'S/D',
                    'detalle' => $m['detalle'] ?? '',
                    'almacen' => $m['almacen_nombre'] ?? null,
                    // Columnas contables exactas:
                    'entrada_cantidad' => $cantidad,
                    'entrada_costo_unitario' => round($costoUnitarioEntrada, 4),
                    'entrada_total' => round($totalEntrada, 2),
                    'salida_cantidad' => 0.0,
                    'salida_costo_unitario' => 0.0,
                    'salida_total' => 0.0,
                    'saldo_cantidad' => round($saldoCantidad, 4),
                    'saldo_costo_promedio' => round($costoPromedioActual, 4),
                    'saldo_total_valorizado' => round($saldoValorTotal, 2),

                    // Campos de compatibilidad:
                    'doc' => $m['documento'] ?? 'S/D',
                    'entrada' => $cantidad,
                    'salida' => 0.0,
                    'saldo_fisico' => round($saldoCantidad, 2),
                    'costo_unitario' => round($costoUnitarioEntrada, 4),
                    'costo_total_movimiento' => round($totalEntrada, 2),
                    'saldo_valorizado' => round($saldoValorTotal, 2),
                    'observacion' => $m['detalle'] ?? '',
                ];
            } else { // Salida
                // Salidas valorizadas estrictamente al último Costo Unitario Promedio vigente
                $costoUnitarioSalida = $costoPromedioActual;
                $totalSalida = round($cantidad * $costoUnitarioSalida, 2);

                $nuevaCantidad = max(0.0, $saldoCantidad - $cantidad);
                $nuevoValorTotal = $nuevaCantidad > 0 ? max(0.0, $saldoValorTotal - $totalSalida) : 0.0;

                $saldoCantidad = $nuevaCantidad;
                $saldoValorTotal = $nuevoValorTotal;

                $totalSalidasCant += $cantidad;
                $totalSalidasValor += $totalSalida;

                $movimientosCalculados[] = [
                    'id' => $m['id'] ?? ($idx + 1),
                    'fecha' => \Carbon\Carbon::parse($m['fecha_hora'])->format('Y-m-d H:i'),
                    'tipo' => 'SALIDA',
                    'movimiento' => $m['movimiento_label'] ?? 'Consumo / Despacho',
                    'documento' => $m['documento'] ?? 'S/D',
                    'detalle' => $m['detalle'] ?? '',
                    'almacen' => $m['almacen_nombre'] ?? null,
                    // Columnas contables exactas:
                    'entrada_cantidad' => 0.0,
                    'entrada_costo_unitario' => 0.0,
                    'entrada_total' => 0.0,
                    'salida_cantidad' => $cantidad,
                    'salida_costo_unitario' => round($costoUnitarioSalida, 4),
                    'salida_total' => round($totalSalida, 2),
                    'saldo_cantidad' => round($saldoCantidad, 4),
                    'saldo_costo_promedio' => round($costoPromedioActual, 4),
                    'saldo_total_valorizado' => round($saldoValorTotal, 2),

                    // Campos de compatibilidad:
                    'doc' => $m['documento'] ?? 'S/D',
                    'entrada' => 0.0,
                    'salida' => $cantidad,
                    'saldo_fisico' => round($saldoCantidad, 2),
                    'costo_unitario' => round($costoUnitarioSalida, 4),
                    'costo_total_movimiento' => round($totalSalida, 2),
                    'saldo_valorizado' => round($saldoValorTotal, 2),
                    'observacion' => $m['detalle'] ?? '',
                ];
            }
        }

        // Obtener stock referencial de almacén si aplica
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

        return [
            'producto' => [
                'id' => $producto->id,
                'sku' => $producto->sku,
                'nombre' => $producto->nombre,
                'stock_actual' => count($movimientosCalculados) > 0 ? $saldoCantidad : $stockFiltrado,
                'costo_unitario' => count($movimientosCalculados) > 0 ? $costoPromedioActual : $costoFiltrado,
                'valor_total' => count($movimientosCalculados) > 0 ? $saldoValorTotal : ($stockFiltrado * $costoFiltrado),
                'categoria' => $producto->categoria->nombre ?? 'General',
                'unidad_medida' => $producto->unidadMedida->nombre ?? 'UND',
            ],
            'kpis' => [
                'total_entradas_cant' => round($totalEntradasCant, 2),
                'total_entradas_valor' => round($totalEntradasValor, 2),
                'total_salidas_cant' => round($totalSalidasCant, 2),
                'total_salidas_valor' => round($totalSalidasValor, 2),
                'saldo_actual_cant' => round($saldoCantidad, 2),
                'costo_promedio_vigente' => round($costoPromedioActual, 4),
                'saldo_actual_valorizado' => round($saldoValorTotal, 2),
            ],
            'movimientos' => $movimientosCalculados,
        ];
    }

    /**
     * Exportar reporte contable de Kardex Valorizado por Producto con estructura oficial (Excel / CSV UTF-8).
     */
    public function exportarKardexProductoCsv(\Illuminate\Http\Request $request)
    {
        if (!$this->userCanViewFinancials($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Acceso denegado: No tiene autorización para exportar datos financieros de valorización.',
            ], 403);
        }

        $productoId = $request->input('producto_id') ?? $request->route('productoId');
        if (!$productoId) {
            return response()->json([
                'status' => 'error',
                'message' => 'Debe especificar el ID del producto a exportar.',
            ], 422);
        }

        $producto = Producto::with(['categoria', 'unidadMedida', 'almacenes'])->find($productoId);
        if (!$producto) {
            return response()->json([
                'status' => 'error',
                'message' => 'Producto no encontrado.',
            ], 404);
        }

        $almacenId = $request->input('almacen_id');
        $almacen = $almacenId ? \App\Models\Almacen::find($almacenId) : null;
        $nombreAlmacen = $almacen ? "{$almacen->nombre} ({$almacen->codigo})" : 'TODOS LOS ALMACENES (CONSOLIDADO)';

        $calculo = $this->calcularKardexDetalladoProducto($producto, $almacenId ? (int)$almacenId : null);
        $movimientos = $calculo['movimientos'];
        $kpis = $calculo['kpis'];

        $skuSlug = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $producto->sku));
        $filename = "kardex_valorizado_{$skuSlug}_" . date('Ymd_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($producto, $movimientos, $kpis, $nombreAlmacen) {
            $handle = fopen('php://output', 'w');

            // BOM UTF-8 para apertura directa y limpia en Microsoft Excel sin problemas de tildes
            fputs($handle, "\xEF\xBB\xBF");

            // Metadatos de cabecera contable oficial
            fputcsv($handle, ['SISTEMA DE GESTIÓN DE ALMACÉN - KARDEX VALORIZADO POR PRODUCTO'], ';');
            fputcsv($handle, ['FORMATO CONTABLE:', 'MÉTODO PROMEDIO PONDERADO MÓVIL (SUNAT FORMATO 13.1)'], ';');
            fputcsv($handle, ['PRODUCTO:', "{$producto->sku} - {$producto->nombre}"], ';');
            fputcsv($handle, ['CATEGORÍA:', $producto->categoria->nombre ?? 'General', 'UNIDAD MEDIDA:', $producto->unidadMedida->nombre ?? 'UND'], ';');
            fputcsv($handle, ['ALMACÉN / PLANTA:', $nombreAlmacen], ';');
            fputcsv($handle, ['FECHA Y HORA DE EMISIÓN:', date('d/m/Y H:i:s')], ';');
            fputcsv($handle, [], ';');

            // Columnas del reporte
            fputcsv($handle, [
                'FECHA Y HORA',
                'TIPO OPERACIÓN',
                'DETALLE / MOVIMIENTO',
                'N° DOCUMENTO',
                'PROVEEDOR / DESTINATARIO',
                'ENTRADA CANTIDAD',
                'ENTRADA C.U. (S/)',
                'ENTRADA TOTAL (S/)',
                'SALIDA CANTIDAD',
                'SALIDA C.U. PROM (S/)',
                'SALIDA TOTAL (S/)',
                'SALDO CANTIDAD',
                'SALDO C.U. PROM (S/)',
                'SALDO TOTAL VALORIZADO (S/)',
            ], ';');

            foreach ($movimientos as $m) {
                fputcsv($handle, [
                    $m['fecha'],
                    $m['tipo'],
                    $m['movimiento'],
                    $m['documento'],
                    $m['detalle'],
                    $m['entrada_cantidad'] > 0 ? number_format($m['entrada_cantidad'], 2, '.', '') : '0.00',
                    $m['entrada_costo_unitario'] > 0 ? number_format($m['entrada_costo_unitario'], 4, '.', '') : '0.0000',
                    $m['entrada_total'] > 0 ? number_format($m['entrada_total'], 2, '.', '') : '0.00',
                    $m['salida_cantidad'] > 0 ? number_format($m['salida_cantidad'], 2, '.', '') : '0.00',
                    $m['salida_costo_unitario'] > 0 ? number_format($m['salida_costo_unitario'], 4, '.', '') : '0.0000',
                    $m['salida_total'] > 0 ? number_format($m['salida_total'], 2, '.', '') : '0.00',
                    number_format($m['saldo_cantidad'], 2, '.', ''),
                    number_format($m['saldo_costo_promedio'], 4, '.', ''),
                    number_format($m['saldo_total_valorizado'], 2, '.', ''),
                ], ';');
            }

            fputcsv($handle, [], ';');
            fputcsv($handle, [
                'TOTALES ACUMULADOS',
                '',
                '',
                '',
                '',
                number_format($kpis['total_entradas_cant'], 2, '.', ''),
                '',
                number_format($kpis['total_entradas_valor'], 2, '.', ''),
                number_format($kpis['total_salidas_cant'], 2, '.', ''),
                '',
                number_format($kpis['total_salidas_valor'], 2, '.', ''),
                number_format($kpis['saldo_actual_cant'], 2, '.', ''),
                number_format($kpis['costo_promedio_vigente'], 4, '.', ''),
                number_format($kpis['saldo_actual_valorizado'], 2, '.', ''),
            ], ';');

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
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

    /**
     * Exportar reporte oficial de Kardex Valorizado por Producto en formato PDF (Landscape).
     */
    public function exportarKardexProductoPdf(\Illuminate\Http\Request $request)
    {
        if (!$this->userCanViewFinancials($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Acceso denegado: No tiene autorización para exportar datos financieros de valorización.',
            ], 403);
        }

        $productoId = $request->input('producto_id') ?? $request->route('productoId');
        if (!$productoId) {
            return response()->json([
                'status' => 'error',
                'message' => 'Debe especificar el ID del producto a exportar.',
            ], 422);
        }

        $producto = Producto::with(['categoria', 'unidadMedida', 'almacenes'])->find($productoId);
        if (!$producto) {
            return response()->json([
                'status' => 'error',
                'message' => 'Producto no encontrado.',
            ], 404);
        }

        $almacenId = $request->input('almacen_id');
        $almacen = $almacenId ? \App\Models\Almacen::find($almacenId) : null;
        $nombreAlmacen = $almacen ? "{$almacen->nombre} ({$almacen->codigo})" : 'TODOS LOS ALMACENES (CONSOLIDADO)';

        $calculo = $this->calcularKardexDetalladoProducto($producto, $almacenId ? (int)$almacenId : null);
        $movimientos = $calculo['movimientos'];
        $kpis = $calculo['kpis'];

        $skuSlug = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $producto->sku));
        $filename = "kardex_valorizado_{$skuSlug}_" . date('Ymd_His') . '.pdf';

        $pdf = Pdf::loadView('pdf.kardex_producto', [
            'producto' => $producto,
            'nombreAlmacen' => $nombreAlmacen,
            'movimientos' => $movimientos,
            'kpis' => $kpis,
        ])->setPaper('a4', 'landscape');

        return $pdf->download($filename);
    }

    /**
     * Obtener el resumen físico general de existencias para todo el catálogo (Solo Cantidades).
     * Accesible para todos los roles con permisos de almacén (Almacenero, Supervisor, Compras, Admin).
     */
    public function getFisicoResumen(\Illuminate\Http\Request $request): JsonResponse
    {
        $almacenId = $request->input('almacen_id');

        $productos = Producto::with(['categoria', 'unidadMedida', 'almacenes'])->get();

        // Consultar acumulados de entradas y salidas desde la tabla kardex para alto rendimiento
        $kardexTotalsQuery = Kardex::query();
        if ($almacenId) {
            $kardexTotalsQuery->where('almacen_id', $almacenId);
        }
        $kardexTotals = $kardexTotalsQuery
            ->selectRaw("
                producto_id,
                SUM(CASE WHEN UPPER(tipo_operacion) IN ('ENTRADA', 'TRANSFERENCIA_ENTRADA', 'INGRESO', 'AJUSTE_POSITIVO', 'SALDO_INICIAL', 'COMPRA') THEN cantidad_movimiento ELSE 0 END) as total_entradas,
                SUM(CASE WHEN UPPER(tipo_operacion) NOT IN ('ENTRADA', 'TRANSFERENCIA_ENTRADA', 'INGRESO', 'AJUSTE_POSITIVO', 'SALDO_INICIAL', 'COMPRA') THEN cantidad_movimiento ELSE 0 END) as total_salidas
            ")
            ->groupBy('producto_id')
            ->get()
            ->keyBy('producto_id');

        $resumen = [];
        $totalUnidades = 0;
        $totalEntradasGlobal = 0;
        $totalSalidasGlobal = 0;

        foreach ($productos as $p) {
            $stock = (float) $p->stock_actual;

            if ($almacenId) {
                $pivot = $p->almacenes->where('id', $almacenId)->first();
                if ($pivot && $pivot->pivot) {
                    $stock = (float) $pivot->pivot->stock;
                } else {
                    $stock = 0;
                }
            }

            $totals = $kardexTotals->get($p->id);
            $totalEntradas = $totals ? (float) $totals->total_entradas : 0.0;
            $totalSalidas = $totals ? (float) $totals->total_salidas : 0.0;

            // Si kardex está vacío para este producto pero tiene entradas o salidas en tablas de detalle:
            if ($totalEntradas == 0 && $totalSalidas == 0) {
                $eQ = EntradaDetalle::where('producto_id', $p->id);
                if ($almacenId) {
                    $eQ->whereHas('entradaCabecera', fn($q) => $q->where('almacen_id', $almacenId));
                }
                $totalEntradas = (float) $eQ->sum('cantidad');

                $sQ = SalidaDetalle::where('producto_id', $p->id);
                if ($almacenId) {
                    $sQ->whereHas('salidaCabecera', fn($q) => $q->where('almacen_id', $almacenId));
                }
                $totalSalidas = (float) $sQ->sum('cantidad');
            }

            $stockMinimo = (float) ($p->stock_minimo ?? 0);
            $estado = 'Normal';
            if ($stock <= 0) {
                $estado = 'Agotado';
            } elseif ($stockMinimo > 0 && $stock <= $stockMinimo) {
                $estado = 'Stock Bajo';
            }

            $totalUnidades += $stock;
            $totalEntradasGlobal += $totalEntradas;
            $totalSalidasGlobal += $totalSalidas;

            $resumen[] = [
                'id' => $p->id,
                'sku' => $p->sku,
                'producto' => $p->nombre,
                'categoria' => $p->categoria->nombre ?? 'General',
                'unidad_medida' => $p->unidadMedida->nombre ?? 'UND',
                'total_entradas' => round($totalEntradas, 2),
                'total_salidas' => round($totalSalidas, 2),
                'stock_fisico' => round($stock, 2),
                'stock_minimo' => round($stockMinimo, 2),
                'estado_stock' => $estado,
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_skus' => count($productos),
                'total_unidades_fisicas' => round($totalUnidades, 2),
                'total_entradas_global' => round($totalEntradasGlobal, 2),
                'total_salidas_global' => round($totalSalidasGlobal, 2),
                'productos' => $resumen,
            ],
        ], 200);
    }

    /**
     * Exportar reporte oficial de Kardex Físico por Producto en formato PDF (Landscape).
     * Muestra exclusivamente cantidades y unidades físicas (CERO montos ni soles).
     */
    public function exportarKardexFisicoProductoPdf(\Illuminate\Http\Request $request)
    {
        $productoId = $request->input('producto_id') ?? $request->route('productoId');
        if (!$productoId) {
            return response()->json([
                'status' => 'error',
                'message' => 'Debe especificar el ID del producto.',
            ], 422);
        }

        $producto = Producto::with(['categoria', 'unidadMedida', 'almacenes'])->find($productoId);
        if (!$producto) {
            return response()->json([
                'status' => 'error',
                'message' => 'Producto no encontrado.',
            ], 404);
        }

        $almacenId = $request->input('almacen_id');
        $almacen = $almacenId ? \App\Models\Almacen::find($almacenId) : null;
        $nombreAlmacen = $almacen ? "{$almacen->nombre} ({$almacen->codigo})" : 'TODOS LOS ALMACENES (CONSOLIDADO)';

        $calculo = $this->calcularKardexDetalladoProducto($producto, $almacenId ? (int)$almacenId : null);
        $movimientos = $calculo['movimientos'];
        $kpis = $calculo['kpis'];

        $skuSlug = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $producto->sku));
        $filename = "kardex_fisico_{$skuSlug}_" . date('Ymd_His') . '.pdf';

        $pdf = Pdf::loadView('pdf.kardex_fisico_producto', [
            'producto' => $producto,
            'nombreAlmacen' => $nombreAlmacen,
            'movimientos' => $movimientos,
            'kpis' => $kpis,
        ])->setPaper('a4', 'landscape');

        return $pdf->download($filename);
    }

    /**
     * Exportar Kardex Físico por Producto en formato Excel / CSV estructurado (UTF-8 BOM).
     * Solo cantidades y unidades físicas.
     */
    public function exportarKardexFisicoProductoCsv(\Illuminate\Http\Request $request)
    {
        $productoId = $request->input('producto_id') ?? $request->route('productoId');
        if (!$productoId) {
            return response()->json([
                'status' => 'error',
                'message' => 'Debe especificar el ID del producto.',
            ], 422);
        }

        $producto = Producto::with(['categoria', 'unidadMedida', 'almacenes'])->find($productoId);
        if (!$producto) {
            return response()->json([
                'status' => 'error',
                'message' => 'Producto no encontrado.',
            ], 404);
        }

        $almacenId = $request->input('almacen_id');
        $almacen = $almacenId ? \App\Models\Almacen::find($almacenId) : null;
        $nombreAlmacen = $almacen ? "{$almacen->nombre} ({$almacen->codigo})" : 'TODOS LOS ALMACENES (CONSOLIDADO)';

        $calculo = $this->calcularKardexDetalladoProducto($producto, $almacenId ? (int)$almacenId : null);
        $movimientos = $calculo['movimientos'];
        $kpis = $calculo['kpis'];

        $skuSlug = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $producto->sku));
        $filename = "kardex_fisico_{$skuSlug}_" . date('Ymd_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($producto, $movimientos, $kpis, $nombreAlmacen) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF");

            fputcsv($handle, ['SISTEMA DE GESTIÓN DE ALMACÉN - KARDEX FÍSICO POR PRODUCTO'], ';');
            fputcsv($handle, ['PRODUCTO:', "{$producto->sku} - {$producto->nombre}"], ';');
            fputcsv($handle, ['CATEGORÍA:', $producto->categoria->nombre ?? 'General', 'UNIDAD MEDIDA:', $producto->unidadMedida->nombre ?? 'UND'], ';');
            fputcsv($handle, ['ALMACÉN / PLANTA:', $nombreAlmacen], ';');
            fputcsv($handle, ['FECHA Y HORA DE EMISIÓN:', date('d/m/Y H:i:s')], ';');
            fputcsv($handle, [], ';');

            fputcsv($handle, [
                'FECHA Y HORA',
                'TIPO OPERACIÓN',
                'N° DOCUMENTO',
                'SEDE / ALMACÉN',
                'DETALLE / TERCERO',
                'ENTRADA CANTIDAD (+)',
                'SALIDA CANTIDAD (-)',
                'SALDO FÍSICO ACUMULADO',
                'UNIDAD DE MEDIDA',
            ], ';');

            $unidadStr = $producto->unidadMedida->nombre ?? 'UND';

            foreach ($movimientos as $m) {
                $isEntrada = strtoupper($m['tipo'] ?? '') === 'ENTRADA';
                $cantIn = (float)($m['entrada_cantidad'] ?? $m['entrada'] ?? 0);
                $cantOut = (float)($m['salida_cantidad'] ?? $m['salida'] ?? 0);
                $cantSaldo = (float)($m['saldo_cantidad'] ?? $m['saldo_fisico'] ?? $m['saldo'] ?? 0);

                fputcsv($handle, [
                    $m['fecha'] ?? '',
                    $m['tipo'] ?? '',
                    $m['documento'] ?? $m['doc'] ?? 'S/D',
                    $m['almacen'] ?? 'Almacén Principal',
                    $m['detalle'] ?? $m['observacion'] ?? '-',
                    $isEntrada && $cantIn > 0 ? number_format($cantIn, 2, '.', '') : '0.00',
                    !$isEntrada && $cantOut > 0 ? number_format($cantOut, 2, '.', '') : '0.00',
                    number_format($cantSaldo, 2, '.', ''),
                    $unidadStr,
                ], ';');
            }

            fputcsv($handle, [], ';');
            fputcsv($handle, [
                'TOTALES ACUMULADOS',
                '',
                '',
                '',
                '',
                number_format($kpis['total_entradas_cant'] ?? 0, 2, '.', ''),
                number_format($kpis['total_salidas_cant'] ?? 0, 2, '.', ''),
                number_format($kpis['saldo_actual_cant'] ?? 0, 2, '.', ''),
                $unidadStr,
            ], ';');

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Exportar Resumen General de Existencias Físicas en formato PDF (Landscape).
     */
    public function exportarKardexFisicoGeneralPdf(\Illuminate\Http\Request $request)
    {
        $almacenId = $request->input('almacen_id');
        $almacen = $almacenId ? \App\Models\Almacen::find($almacenId) : null;
        $nombreAlmacen = $almacen ? "{$almacen->nombre} ({$almacen->codigo})" : 'TODOS LOS ALMACENES (CONSOLIDADO)';

        $response = $this->getFisicoResumen($request);
        $data = $response->getData(true)['data'];

        $filename = "resumen_existencias_fisicas_" . date('Ymd_His') . '.pdf';

        $pdf = Pdf::loadView('pdf.kardex_fisico_general', [
            'nombreAlmacen' => $nombreAlmacen,
            'productos' => $data['productos'],
            'totalUnidades' => $data['total_unidades_fisicas'],
            'totalEntradas' => $data['total_entradas_global'],
            'totalSalidas' => $data['total_salidas_global'],
        ])->setPaper('a4', 'landscape');

        return $pdf->download($filename);
    }

    /**
     * Exportar Resumen General de Existencias Físicas en formato Excel / CSV (UTF-8 BOM).
     */
    public function exportarKardexFisicoGeneralCsv(\Illuminate\Http\Request $request)
    {
        $almacenId = $request->input('almacen_id');
        $almacen = $almacenId ? \App\Models\Almacen::find($almacenId) : null;
        $nombreAlmacen = $almacen ? "{$almacen->nombre} ({$almacen->codigo})" : 'TODOS LOS ALMACENES (CONSOLIDADO)';

        $response = $this->getFisicoResumen($request);
        $data = $response->getData(true)['data'];
        $productos = $data['productos'];

        $filename = "resumen_existencias_fisicas_" . date('Ymd_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($productos, $nombreAlmacen, $data) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF");

            fputcsv($handle, ['SISTEMA DE GESTIÓN DE ALMACÉN - RESUMEN GENERAL DE EXISTENCIAS FÍSICAS'], ';');
            fputcsv($handle, ['ALMACÉN / SEDE:', $nombreAlmacen], ';');
            fputcsv($handle, ['FECHA Y HORA DE EMISIÓN:', date('d/m/Y H:i:s')], ';');
            fputcsv($handle, [], ';');

            fputcsv($handle, [
                'N°',
                'CÓDIGO SKU',
                'DESCRIPCIÓN DEL PRODUCTO',
                'CATEGORÍA',
                'UNIDAD DE MEDIDA',
                'TOTAL ENTRADAS (+)',
                'TOTAL SALIDAS (-)',
                'STOCK FÍSICO ACTUAL',
                'STOCK MÍNIMO',
                'ESTADO DE STOCK',
            ], ';');

            $i = 1;
            foreach ($productos as $p) {
                fputcsv($handle, [
                    $i++,
                    $p['sku'],
                    $p['producto'],
                    $p['categoria'],
                    $p['unidad_medida'],
                    number_format($p['total_entradas'], 2, '.', ''),
                    number_format($p['total_salidas'], 2, '.', ''),
                    number_format($p['stock_fisico'], 2, '.', ''),
                    number_format($p['stock_minimo'], 2, '.', ''),
                    $p['estado_stock'],
                ], ';');
            }

            fputcsv($handle, [], ';');
            fputcsv($handle, [
                'TOTALES GENERALES',
                '',
                '',
                '',
                '',
                number_format($data['total_entradas_global'], 2, '.', ''),
                number_format($data['total_salidas_global'], 2, '.', ''),
                number_format($data['total_unidades_fisicas'], 2, '.', ''),
                '',
                '',
            ], ';');

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }
}

