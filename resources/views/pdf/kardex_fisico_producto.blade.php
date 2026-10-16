<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Kardex Físico - {{ $producto->sku }} - {{ $producto->nombre }}</title>
    <style>
        @page {
            margin: 20px 25px;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 9.5px;
            color: #1e293b;
            line-height: 1.3;
        }

        /* Encabezado */
        .header-table {
            width: 100%;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 8px;
            margin-bottom: 10px;
        }
        .company-title {
            font-size: 15px;
            font-weight: bold;
            color: #0f172a;
            letter-spacing: 0.5px;
        }
        .report-subtitle {
            font-size: 9px;
            color: #2563eb;
            font-weight: bold;
            text-transform: uppercase;
        }
        .doc-title {
            font-size: 13px;
            font-weight: bold;
            color: #1e293b;
            text-align: right;
            margin: 0;
        }
        .doc-sub {
            font-size: 8.5px;
            color: #64748b;
            text-align: right;
        }

        /* Ficha Informativa del Producto */
        .info-card {
            width: 100%;
            border-collapse: collapse;
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            margin-bottom: 10px;
        }
        .info-card td {
            padding: 5px 8px;
            vertical-align: top;
        }
        .info-label {
            font-size: 8px;
            font-weight: bold;
            color: #475569;
            text-transform: uppercase;
        }
        .info-val {
            font-size: 9.5px;
            font-weight: bold;
            color: #0f172a;
        }

        /* Tarjetas de Resumen KPI (Solo Físicas) */
        .kpi-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .kpi-box {
            padding: 6px 10px;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            width: 25%;
        }
        .kpi-box-green {
            background-color: #f0fdf4;
            border-color: #86efac;
            border-left: 3.5px solid #16a34a;
        }
        .kpi-box-orange {
            background-color: #fff7ed;
            border-color: #fdba74;
            border-left: 3.5px solid #ea580c;
        }
        .kpi-box-blue {
            background-color: #eff6ff;
            border-color: #bfdbfe;
            border-left: 3.5px solid #2563eb;
        }
        .kpi-box-emerald {
            background-color: #ecfdf5;
            border-color: #a7f3d0;
            border-left: 3.5px solid #059669;
        }
        .kpi-title {
            font-size: 8px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .kpi-amount {
            font-size: 13px;
            font-weight: bold;
            margin-top: 2px;
        }
        .kpi-sub {
            font-size: 7.5px;
            color: #64748b;
        }

        /* Tabla de Movimientos */
        .kardex-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .kardex-table th {
            padding: 5px 4px;
            font-size: 8px;
            font-weight: bold;
            border: 1px solid #cbd5e1;
        }
        .kardex-table td {
            padding: 4px 4px;
            font-size: 8px;
            border: 1px solid #cbd5e1;
        }

        /* Cabeceras de Agrupación */
        .th-group-doc {
            background-color: #f1f5f9;
            color: #1e293b;
            text-align: center;
        }
        .th-group-in {
            background-color: #dcfce7;
            color: #166534;
            text-align: center;
        }
        .th-group-out {
            background-color: #ffedd5;
            color: #9a3412;
            text-align: center;
        }
        .th-group-bal {
            background-color: #dbeafe;
            color: #1e40af;
            text-align: center;
        }

        /* Sub-cabeceras */
        .th-sub-doc {
            background-color: #f8fafc;
            color: #334155;
            text-align: left;
        }
        .th-sub-in {
            background-color: #f0fdf4;
            color: #166534;
            text-align: right;
        }
        .th-sub-out {
            background-color: #fff7ed;
            color: #9a3412;
            text-align: right;
        }
        .th-sub-bal {
            background-color: #eff6ff;
            color: #1e40af;
            text-align: right;
        }

        .badge-entrada {
            background-color: #dcfce7;
            color: #15803d;
            padding: 2px 5px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 7.5px;
            display: inline-block;
        }
        .badge-salida {
            background-color: #fee2e2;
            color: #b91c1c;
            padding: 2px 5px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 7.5px;
            display: inline-block;
        }
        .doc-correlativo {
            font-family: 'Courier New', Courier, monospace;
            font-weight: bold;
            color: #0f172a;
        }

        .footer-note {
            font-size: 7.5px;
            color: #64748b;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            margin-top: 10px;
        }
    </style>
</head>
<body>

    <!-- Encabezado -->
    <table class="header-table">
        <tr>
            <td style="width: 50%;">
                <div class="company-title">SISTEMA DE GESTIÓN DE ALMACÉN</div>
                <div class="report-subtitle">CONTROL OPERATIVO DE INVENTARIO EN UNIDADES FÍSICAS</div>
            </td>
            <td style="width: 50%; text-align: right;">
                <div class="doc-title">REPORTE OFICIAL DE KARDEX FÍSICO</div>
                <div class="doc-sub">Trazabilidad de Entradas, Salidas y Saldos en Almacén</div>
                <div class="doc-sub">Fecha y Hora de Emisión: {{ date('d/m/Y H:i:s') }}</div>
            </td>
        </tr>
    </table>

    <!-- Ficha Informativa del Producto -->
    <table class="info-card">
        <tr>
            <td style="width: 15%;">
                <div class="info-label">CÓDIGO SKU</div>
                <div class="info-val" style="color: #2563eb; font-family: monospace;">{{ $producto->sku }}</div>
            </td>
            <td style="width: 35%;">
                <div class="info-label">DESCRIPCIÓN DEL PRODUCTO</div>
                <div class="info-val">{{ $producto->nombre }}</div>
            </td>
            <td style="width: 18%;">
                <div class="info-label">CATEGORÍA</div>
                <div class="info-val">{{ $producto->categoria->nombre ?? 'General' }}</div>
            </td>
            <td style="width: 14%;">
                <div class="info-label">UNIDAD DE MEDIDA</div>
                <div class="info-val">{{ $producto->unidadMedida->nombre ?? 'UND' }}</div>
            </td>
            <td style="width: 18%;">
                <div class="info-label">SEDE / ALMACÉN</div>
                <div class="info-val" style="color: #059669;">{{ $nombreAlmacen }}</div>
            </td>
        </tr>
    </table>

    <!-- Tarjetas de Resumen KPI Físicas (Solo Cantidades) -->
    <table class="kpi-table">
        <tr>
            <td class="kpi-box kpi-box-green" style="padding-right: 8px;">
                <div class="kpi-title" style="color: #166534;">ENTRADAS TOTALES (INGRESOS)</div>
                <div class="kpi-amount" style="color: #15803d;">
                    +{{ number_format($kpis['total_entradas_cant'] ?? 0, 2) }} <span style="font-size: 9px; font-weight: normal;">{{ $producto->unidadMedida->nombre ?? 'u.' }}</span>
                </div>
                <div class="kpi-sub">Total de unidades ingresadas por compras/recepciones</div>
            </td>
            <td style="width: 10px;"></td>
            <td class="kpi-box kpi-box-orange" style="padding-right: 8px;">
                <div class="kpi-title" style="color: #9a3412;">SALIDAS TOTALES (DESPACHOS)</div>
                <div class="kpi-amount" style="color: #c2410c;">
                    -{{ number_format($kpis['total_salidas_cant'] ?? 0, 2) }} <span style="font-size: 9px; font-weight: normal;">{{ $producto->unidadMedida->nombre ?? 'u.' }}</span>
                </div>
                <div class="kpi-sub">Total de unidades despachadas a áreas o trabajadores</div>
            </td>
            <td style="width: 10px;"></td>
            <td class="kpi-box kpi-box-blue" style="padding-right: 8px;">
                <div class="kpi-title" style="color: #1e40af;">STOCK FÍSICO FINAL (SALDO)</div>
                <div class="kpi-amount" style="color: #1d4ed8;">
                    {{ number_format($kpis['saldo_actual_cant'] ?? 0, 2) }} <span style="font-size: 9px; font-weight: normal;">{{ $producto->unidadMedida->nombre ?? 'u.' }}</span>
                </div>
                <div class="kpi-sub">Existencia física actual disponible en almacén</div>
            </td>
            <td style="width: 10px;"></td>
            <td class="kpi-box kpi-box-emerald">
                <div class="kpi-title" style="color: #047857;">ESTADO DE ABASTECIMIENTO</div>
                @php
                    $saldoActual = (float)($kpis['saldo_actual_cant'] ?? 0);
                    $stockMinimo = (float)($producto->stock_minimo ?? 0);
                    $estadoColor = '#15803d';
                    $estadoTexto = 'NORMAL';
                    if ($saldoActual <= 0) {
                        $estadoColor = '#b91c1c';
                        $estadoTexto = 'AGOTADO (CRÍTICO)';
                    } elseif ($saldoActual <= $stockMinimo) {
                        $estadoColor = '#b45309';
                        $estadoTexto = 'STOCK BAJO';
                    }
                @endphp
                <div class="kpi-amount" style="color: {{ $estadoColor }}; font-size: 11.5px;">
                    {{ $estadoTexto }}
                </div>
                <div class="kpi-sub">Stock Mínimo Configurado: {{ number_format($stockMinimo, 2) }} {{ $producto->unidadMedida->nombre ?? 'u.' }}</div>
            </td>
        </tr>
    </table>

    <!-- Tabla Detallada de Kardex Físico -->
    <table class="kardex-table">
        <thead>
            <tr>
                <th colspan="5" class="th-group-doc" style="border-right: 2px solid #cbd5e1;">
                    OPERACIÓN Y DOCUMENTO DE SUSTENTO
                </th>
                <th colspan="2" class="th-group-in" style="border-right: 2px solid #86efac;">
                    ENTRADAS FÍSICAS (+)
                </th>
                <th colspan="2" class="th-group-out" style="border-right: 2px solid #fdba74;">
                    SALIDAS FÍSICAS (-)
                </th>
                <th colspan="2" class="th-group-bal">
                    SALDO FÍSICO ACUMULADO
                </th>
            </tr>
            <tr>
                <th class="th-sub-doc" style="width: 100px;">Fecha y Hora</th>
                <th class="th-sub-doc" style="width: 65px; text-align: center;">Tipo</th>
                <th class="th-sub-doc" style="width: 85px;">N° Documento</th>
                <th class="th-sub-doc" style="width: 105px;">Sede / Almacén</th>
                <th class="th-sub-doc" style="border-right: 2px solid #cbd5e1;">Detalle / Tercero (Proveedor o Personal)</th>

                <!-- Entradas -->
                <th class="th-sub-in" style="width: 75px;">Cant. Entrada</th>
                <th class="th-sub-in" style="width: 45px; text-align: center; border-right: 2px solid #86efac;">U.M.</th>

                <!-- Salidas -->
                <th class="th-sub-out" style="width: 75px;">Cant. Salida</th>
                <th class="th-sub-out" style="width: 45px; text-align: center; border-right: 2px solid #fdba74;">U.M.</th>

                <!-- Saldos -->
                <th class="th-sub-bal" style="width: 80px;">Cant. Saldo</th>
                <th class="th-sub-bal" style="width: 45px; text-align: center;">U.M.</th>
            </tr>
        </thead>
        <tbody>
            @forelse($movimientos as $m)
                @php
                    $isEntrada = strtoupper($m['tipo'] ?? '') === 'ENTRADA';
                    $cantEntrada = (float)($m['entrada_cantidad'] ?? $m['entrada'] ?? 0);
                    $cantSalida = (float)($m['salida_cantidad'] ?? $m['salida'] ?? 0);
                    $cantSaldo = (float)($m['saldo_cantidad'] ?? $m['saldo_fisico'] ?? $m['saldo'] ?? 0);
                    $unidadStr = $producto->unidadMedida->nombre ?? 'UND';
                @endphp
                <tr>
                    <td style="white-space: nowrap;">{{ $m['fecha'] ?? '' }}</td>
                    <td style="text-align: center;">
                        @if($isEntrada)
                            <span class="badge-entrada">ENTRADA</span>
                        @else
                            <span class="badge-salida">SALIDA</span>
                        @endif
                    </td>
                    <td>
                        <span class="doc-correlativo">{{ $m['documento'] ?? $m['doc'] ?? 'S/D' }}</span>
                    </td>
                    <td>{{ $m['almacen'] ?? 'Almacén Principal' }}</td>
                    <td style="border-right: 2px solid #cbd5e1; font-size: 7.5px; color: #475569;">
                        {{ $m['detalle'] ?? $m['observacion'] ?? '-' }}
                    </td>

                    <!-- Entradas -->
                    <td style="text-align: right; background-color: {{ $isEntrada ? '#f0fdf4' : 'transparent' }}; color: {{ $isEntrada ? '#15803d' : '#94a3b8' }}; font-weight: {{ $isEntrada ? 'bold' : 'normal' }};">
                        {{ $isEntrada && $cantEntrada > 0 ? '+'.number_format($cantEntrada, 2) : '-' }}
                    </td>
                    <td style="text-align: center; border-right: 2px solid #86efac; color: #64748b; font-size: 7px;">
                        {{ $isEntrada && $cantEntrada > 0 ? $unidadStr : '-' }}
                    </td>

                    <!-- Salidas -->
                    <td style="text-align: right; background-color: {{ !$isEntrada ? '#fff7ed' : 'transparent' }}; color: {{ !$isEntrada ? '#c2410c' : '#94a3b8' }}; font-weight: {{ !$isEntrada ? 'bold' : 'normal' }};">
                        {{ !$isEntrada && $cantSalida > 0 ? '-'.number_format($cantSalida, 2) : '-' }}
                    </td>
                    <td style="text-align: center; border-right: 2px solid #fdba74; color: #64748b; font-size: 7px;">
                        {{ !$isEntrada && $cantSalida > 0 ? $unidadStr : '-' }}
                    </td>

                    <!-- Saldos -->
                    <td style="text-align: right; background-color: #eff6ff; font-weight: bold; color: #1e40af;">
                        {{ number_format($cantSaldo, 2) }}
                    </td>
                    <td style="text-align: center; background-color: #eff6ff; color: #1e40af; font-size: 7px; font-weight: bold;">
                        {{ $unidadStr }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="11" style="text-align: center; padding: 25px; color: #64748b;">
                        No se encontraron movimientos registrados para este producto en el almacén seleccionado.
                    </td>
                </tr>
            @endforelse
        </tbody>
        <tfoot>
            <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #94a3b8;">
                <td colspan="5" style="text-align: right; border-right: 2px solid #cbd5e1; padding: 6px 8px;">
                    TOTALES ACUMULADOS:
                </td>
                <td style="text-align: right; color: #15803d; font-size: 9px;">
                    +{{ number_format($kpis['total_entradas_cant'] ?? 0, 2) }}
                </td>
                <td style="border-right: 2px solid #86efac; text-align: center; font-size: 7px; color: #15803d;">
                    {{ $producto->unidadMedida->nombre ?? 'UND' }}
                </td>
                <td style="text-align: right; color: #c2410c; font-size: 9px;">
                    -{{ number_format($kpis['total_salidas_cant'] ?? 0, 2) }}
                </td>
                <td style="border-right: 2px solid #fdba74; text-align: center; font-size: 7px; color: #c2410c;">
                    {{ $producto->unidadMedida->nombre ?? 'UND' }}
                </td>
                <td style="text-align: right; color: #1d4ed8; font-size: 10px; background-color: #dbeafe;">
                    {{ number_format($kpis['saldo_actual_cant'] ?? 0, 2) }}
                </td>
                <td style="text-align: center; color: #1d4ed8; font-size: 7.5px; background-color: #dbeafe;">
                    {{ $producto->unidadMedida->nombre ?? 'UND' }}
                </td>
            </tr>
        </tfoot>
    </table>

    <div class="footer-note">
        Este documento constituye un reporte operativo oficial de control físico de inventario. No incluye costos ni valorizaciones contables.
        <br>
        Generado automáticamente por el Sistema de Gestión de Almacén.
    </div>

</body>
</html>
