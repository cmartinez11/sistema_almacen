<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Resumen General de Existencias Físicas - Almacén</title>
    <style>
        @page {
            margin: 20px 25px;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 9px;
            color: #1e293b;
            line-height: 1.3;
        }

        .header-table {
            width: 100%;
            border-bottom: 2px solid #059669;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }
        .company-title {
            font-size: 15px;
            font-weight: bold;
            color: #0f172a;
        }
        .report-subtitle {
            font-size: 9px;
            color: #059669;
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

        /* KPI Boxes */
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
        .kpi-box-emerald {
            background-color: #ecfdf5;
            border-color: #a7f3d0;
            border-left: 3.5px solid #059669;
        }
        .kpi-box-blue {
            background-color: #eff6ff;
            border-color: #bfdbfe;
            border-left: 3.5px solid #2563eb;
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

        /* Table */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .data-table th {
            background-color: #f8fafc;
            color: #334155;
            padding: 6px 5px;
            font-size: 8px;
            font-weight: bold;
            border: 1px solid #cbd5e1;
            text-align: left;
        }
        .data-table td {
            padding: 4px 5px;
            font-size: 8px;
            border: 1px solid #cbd5e1;
        }

        .badge-normal {
            background-color: #dcfce7;
            color: #15803d;
            padding: 2px 5px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 7px;
        }
        .badge-bajo {
            background-color: #fef3c7;
            color: #b45309;
            padding: 2px 5px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 7px;
        }
        .badge-critico {
            background-color: #fee2e2;
            color: #b91c1c;
            padding: 2px 5px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 7px;
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

    <table class="header-table">
        <tr>
            <td style="width: 50%;">
                <div class="company-title">SISTEMA DE GESTIÓN DE ALMACÉN</div>
                <div class="report-subtitle">RESUMEN GENERAL DE EXISTENCIAS FÍSICAS (CONSOLIDADO EN UNIDADES)</div>
            </td>
            <td style="width: 50%; text-align: right;">
                <div class="doc-title">REPORTE OFICIAL DE EXISTENCIAS DE INVENTARIO</div>
                <div class="doc-sub">Sede / Almacén: <strong>{{ $nombreAlmacen }}</strong></div>
                <div class="doc-sub">Fecha y Hora de Emisión: {{ date('d/m/Y H:i:s') }}</div>
            </td>
        </tr>
    </table>

    <!-- KPIs -->
    <table class="kpi-table">
        <tr>
            <td class="kpi-box kpi-box-emerald" style="padding-right: 8px;">
                <div class="kpi-title" style="color: #065f46;">TOTAL PRODUCTOS (SKUs)</div>
                <div class="kpi-amount" style="color: #059669;">{{ count($productos) }}</div>
                <div class="kpi-sub">Artículos registrados en catálogo</div>
            </td>
            <td style="width: 10px;"></td>
            <td class="kpi-box kpi-box-blue" style="padding-right: 8px;">
                <div class="kpi-title" style="color: #1e40af;">TOTAL UNIDADES EN ALMACÉN</div>
                <div class="kpi-amount" style="color: #2563eb;">{{ number_format($totalUnidades, 2) }} <span style="font-size: 9px; font-weight: normal;">u.</span></div>
                <div class="kpi-sub">Stock físico consolidado en existencia</div>
            </td>
            <td style="width: 10px;"></td>
            <td class="kpi-box kpi-box-green" style="padding-right: 8px;">
                <div class="kpi-title" style="color: #166534;">TOTAL ENTRADAS (+)</div>
                <div class="kpi-amount" style="color: #15803d;">+{{ number_format($totalEntradas, 2) }} <span style="font-size: 9px; font-weight: normal;">u.</span></div>
                <div class="kpi-sub">Unidades ingresadas acumuladas</div>
            </td>
            <td style="width: 10px;"></td>
            <td class="kpi-box kpi-box-orange">
                <div class="kpi-title" style="color: #9a3412;">TOTAL SALIDAS (-)</div>
                <div class="kpi-amount" style="color: #ea580c;">-{{ number_format($totalSalidas, 2) }} <span style="font-size: 9px; font-weight: normal;">u.</span></div>
                <div class="kpi-sub">Unidades despachadas acumuladas</div>
            </td>
        </tr>
    </table>

    <!-- Data Table -->
    <table class="data-table">
        <thead>
            <tr>
                <th style="width: 25px; text-align: center;">N°</th>
                <th style="width: 75px;">SKU</th>
                <th>Descripción del Producto</th>
                <th style="width: 95px;">Categoría</th>
                <th style="width: 55px; text-align: center;">U. Medida</th>
                <th style="width: 75px; text-align: right; background-color: #f0fdf4; color: #166534;">Entradas (+)</th>
                <th style="width: 75px; text-align: right; background-color: #fff7ed; color: #9a3412;">Salidas (-)</th>
                <th style="width: 85px; text-align: right; background-color: #eff6ff; color: #1e40af;">Stock Físico</th>
                <th style="width: 65px; text-align: right;">Stock Mín.</th>
                <th style="width: 75px; text-align: center;">Estado</th>
            </tr>
        </thead>
        <tbody>
            @php $i = 1; @endphp
            @foreach($productos as $p)
                @php
                    $stock = (float)($p['stock_fisico'] ?? 0);
                    $stockMin = (float)($p['stock_minimo'] ?? 0);
                    $estado = $p['estado_stock'] ?? 'Normal';
                @endphp
                <tr>
                    <td style="text-align: center; color: #64748b;">{{ $i++ }}</td>
                    <td style="font-family: monospace; font-weight: bold; color: #2563eb;">{{ $p['sku'] }}</td>
                    <td style="font-weight: bold; color: #0f172a;">{{ $p['producto'] }}</td>
                    <td>{{ $p['categoria'] }}</td>
                    <td style="text-align: center;">{{ $p['unidad_medida'] }}</td>
                    <td style="text-align: right; background-color: #f0fdf4; color: #15803d; font-weight: bold;">
                        {{ (float)($p['total_entradas'] ?? 0) > 0 ? '+'.number_format($p['total_entradas'], 2) : '-' }}
                    </td>
                    <td style="text-align: right; background-color: #fff7ed; color: #c2410c; font-weight: bold;">
                        {{ (float)($p['total_salidas'] ?? 0) > 0 ? '-'.number_format($p['total_salidas'], 2) : '-' }}
                    </td>
                    <td style="text-align: right; background-color: #eff6ff; font-weight: bold; color: #1e40af; font-size: 9.5px;">
                        {{ number_format($stock, 2) }}
                    </td>
                    <td style="text-align: right; color: #64748b;">{{ number_format($stockMin, 2) }}</td>
                    <td style="text-align: center;">
                        @if($estado === 'Agotado' || $estado === 'Crítico' || $stock <= 0)
                            <span class="badge-critico">AGOTADO</span>
                        @elseif($estado === 'Stock Bajo' || $stock <= $stockMin)
                            <span class="badge-bajo">STOCK BAJO</span>
                        @else
                            <span class="badge-normal">NORMAL</span>
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #94a3b8;">
                <td colspan="5" style="text-align: right; padding: 6px 8px;">TOTALES GENERALES EN UNIDADES:</td>
                <td style="text-align: right; color: #15803d; font-size: 9.5px;">+{{ number_format($totalEntradas, 2) }}</td>
                <td style="text-align: right; color: #c2410c; font-size: 9.5px;">-{{ number_format($totalSalidas, 2) }}</td>
                <td style="text-align: right; color: #1e40af; font-size: 10px; background-color: #dbeafe;">{{ number_format($totalUnidades, 2) }}</td>
                <td colspan="2"></td>
            </tr>
        </tfoot>
    </table>

    <div class="footer-note">
        Reporte operativo oficial de control de existencias físicas. No incluye montos monetarios ni valorizaciones contables.
        <br>
        Generado automáticamente por el Sistema de Gestión de Almacén.
    </div>

</body>
</html>
