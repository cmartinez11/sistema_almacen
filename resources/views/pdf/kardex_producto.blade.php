<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Kardex Valorizado - {{ $producto->sku }} - {{ $producto->nombre }}</title>
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
            margin-bottom: 12px;
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

        /* Ficha Informativa */
        .info-card {
            width: 100%;
            border-collapse: collapse;
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            margin-bottom: 10px;
        }
        .info-card td {
            padding: 4px 8px;
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

        /* Tarjetas de Resumen KPI */
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
            border-left: 3px solid #16a34a;
        }
        .kpi-box-orange {
            background-color: #fff7ed;
            border-color: #fdba74;
            border-left: 3px solid #ea580c;
        }
        .kpi-box-blue {
            background-color: #eff6ff;
            border-color: #bfdbfe;
            border-left: 3px solid #2563eb;
        }
        .kpi-box-emerald {
            background-color: #ecfdf5;
            border-color: #a7f3d0;
            border-left: 3px solid #059669;
        }
        .kpi-title {
            font-size: 8px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .kpi-amount {
            font-size: 12px;
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

        /* Filas de datos */
        .row-even {
            background-color: #ffffff;
        }
        .row-odd {
            background-color: #f8fafc;
        }
        .badge {
            display: inline-block;
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 7px;
            font-weight: bold;
            text-align: center;
        }
        .badge-in {
            background-color: #dcfce7;
            color: #15803d;
        }
        .badge-out {
            background-color: #fee2e2;
            color: #b91c1c;
        }

        /* Pie de Totales */
        .tfoot-total {
            background-color: #f1f5f9;
            font-weight: bold;
            border-top: 2px solid #64748b;
        }

        /* Firmas de Auditoría */
        .signatures-table {
            width: 100%;
            margin-top: 30px;
            border-collapse: collapse;
        }
        .signatures-table td {
            width: 33.33%;
            text-align: center;
            vertical-align: bottom;
            padding: 0 15px;
        }
        .signature-line {
            border-top: 1px solid #64748b;
            padding-top: 5px;
            font-size: 8px;
            font-weight: bold;
            color: #334155;
        }
        .signature-role {
            font-size: 7.5px;
            color: #64748b;
        }

        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
    </style>
</head>
<body>

    <!-- Encabezado Principal -->
    <table class="header-table">
        <tr>
            <td style="width: 55%; vertical-align: middle;">
                <div class="company-title">SISTEMA DE GESTIÓN DE ALMACÉN</div>
                <div class="report-subtitle">Control Permanente de Inventarios Valorizados</div>
            </td>
            <td style="width: 45%; vertical-align: middle; text-align: right;">
                <div class="doc-title">REPORTE DE KARDEX VALORIZADO</div>
                <div class="doc-sub">MÉTODO: PROMEDIO PONDERADO MÓVIL (SUNAT FORMATO 13.1)</div>
                <div class="doc-sub">Emisión: {{ date('d/m/Y H:i:s') }}</div>
            </td>
        </tr>
    </table>

    <!-- Ficha del Producto Auditado -->
    <table class="info-card">
        <tr>
            <td style="width: 25%;">
                <div class="info-label">CÓDIGO SKU</div>
                <div class="info-val" style="color: #2563eb; font-family: monospace;">{{ $producto->sku }}</div>
            </td>
            <td style="width: 35%;">
                <div class="info-label">DESCRIPCIÓN DEL PRODUCTO</div>
                <div class="info-val">{{ $producto->nombre }}</div>
            </td>
            <td style="width: 20%;">
                <div class="info-label">CATEGORÍA / MEDIDA</div>
                <div class="info-val">
                    {{ $producto->categoria->nombre ?? 'General' }} / {{ $producto->unidadMedida->nombre ?? 'UND' }}
                </div>
            </td>
            <td style="width: 20%;">
                <div class="info-label">ALMACÉN / PLANTA</div>
                <div class="info-val" style="color: #059669;">{{ $nombreAlmacen }}</div>
            </td>
        </tr>
    </table>

    <!-- Bloque de Métricas Resumen KPI -->
    <table class="kpi-table">
        <tr>
            <td class="kpi-box kpi-box-green" style="margin-right: 5px;">
                <div class="kpi-title" style="color: #166534;">Total Entradas / Compras</div>
                <div class="kpi-amount" style="color: #15803d;">S/ {{ number_format($kpis['total_entradas_valor'], 2) }}</div>
                <div class="kpi-sub">{{ number_format($kpis['total_entradas_cant'], 2) }} u. ingresadas</div>
            </td>
            <td style="width: 8px;"></td>
            <td class="kpi-box kpi-box-orange">
                <div class="kpi-title" style="color: #9a3412;">Total Salidas / Consumos</div>
                <div class="kpi-amount" style="color: #ea580c;">S/ {{ number_format($kpis['total_salidas_valor'], 2) }}</div>
                <div class="kpi-sub">{{ number_format($kpis['total_salidas_cant'], 2) }} u. despachadas</div>
            </td>
            <td style="width: 8px;"></td>
            <td class="kpi-box kpi-box-blue">
                <div class="kpi-title" style="color: #1e40af;">Stock Físico Final (Saldo)</div>
                <div class="kpi-amount" style="color: #2563eb;">{{ number_format($kpis['saldo_actual_cant'], 2) }} {{ $producto->unidadMedida->nombre ?? 'u.' }}</div>
                <div class="kpi-sub">Existencia física disponible</div>
            </td>
            <td style="width: 8px;"></td>
            <td class="kpi-box kpi-box-emerald">
                <div class="kpi-title" style="color: #065f46;">C.U. Prom. & Saldo Valorizado</div>
                <div class="kpi-amount" style="color: #059669;">S/ {{ number_format($kpis['saldo_actual_valorizado'], 2) }}</div>
                <div class="kpi-sub">C.U. Prom: S/ {{ number_format($kpis['costo_promedio_vigente'], 4) }}</div>
            </td>
        </tr>
    </table>

    <!-- Tabla Detallada Contable -->
    <table class="kardex-table">
        <thead>
            <!-- Fila Nivel 1: Agrupación Contable -->
            <tr>
                <th colspan="4" class="th-group-doc">OPERACIÓN Y SUSTENTO</th>
                <th colspan="3" class="th-group-in">ENTRADAS (COMPRAS / INGRESOS)</th>
                <th colspan="3" class="th-group-out">SALIDAS (CONSUMOS / DESPACHOS)</th>
                <th colspan="3" class="th-group-bal">SALDOS FINALES (INVENTARIO DISPONIBLE)</th>
            </tr>
            <!-- Fila Nivel 2: Columnas Específicas -->
            <tr>
                <th class="th-sub-doc" style="width: 75px;">FECHA Y HORA</th>
                <th class="th-sub-doc" style="width: 45px; text-align: center;">TIPO</th>
                <th class="th-sub-doc" style="width: 65px;">N° DOC</th>
                <th class="th-sub-doc">DETALLE / TERCERO</th>

                <!-- Entradas -->
                <th class="th-sub-in" style="width: 48px;">CANT.</th>
                <th class="th-sub-in" style="width: 58px;">C.U. (S/)</th>
                <th class="th-sub-in" style="width: 65px;">TOTAL (S/)</th>

                <!-- Salidas -->
                <th class="th-sub-out" style="width: 48px;">CANT.</th>
                <th class="th-sub-out" style="width: 58px;">C.U. PROM</th>
                <th class="th-sub-out" style="width: 65px;">TOTAL (S/)</th>

                <!-- Saldos -->
                <th class="th-sub-bal" style="width: 50px;">CANT.</th>
                <th class="th-sub-bal" style="width: 58px;">C.U. PROM</th>
                <th class="th-sub-bal" style="width: 70px;">VALORIZADO</th>
            </tr>
        </thead>
        <tbody>
            @forelse($movimientos as $index => $m)
                @php $esEntrada = ($m['tipo'] === 'ENTRADA'); @endphp
                <tr class="{{ $index % 2 === 0 ? 'row-even' : 'row-odd' }}">
                    <td style="font-size: 7.5px;">{{ $m['fecha'] }}</td>
                    <td class="text-center">
                        <span class="badge {{ $esEntrada ? 'badge-in' : 'badge-out' }}">
                            {{ $esEntrada ? 'ENTRADA' : 'SALIDA' }}
                        </span>
                    </td>
                    <td style="font-family: monospace; font-weight: bold; color: {{ $esEntrada ? '#15803d' : '#9a3412' }};">
                        {{ $m['documento'] }}
                    </td>
                    <td style="color: #334155;">{{ $m['detalle'] ?? $m['movimiento'] }}</td>

                    <!-- Bloque Entradas -->
                    <td class="text-right" style="{{ $esEntrada ? 'color: #15803d; font-weight: bold;' : 'color: #94a3b8;' }}">
                        {{ $esEntrada ? number_format($m['entrada_cantidad'], 2) : '-' }}
                    </td>
                    <td class="text-right" style="{{ $esEntrada ? 'color: #15803d;' : 'color: #94a3b8;' }}">
                        {{ $esEntrada ? number_format($m['entrada_costo_unitario'], 4) : '-' }}
                    </td>
                    <td class="text-right" style="{{ $esEntrada ? 'color: #15803d; font-weight: bold;' : 'color: #94a3b8;' }}">
                        {{ $esEntrada ? number_format($m['entrada_total'], 2) : '-' }}
                    </td>

                    <!-- Bloque Salidas -->
                    <td class="text-right" style="{{ !$esEntrada ? 'color: #c2410c; font-weight: bold;' : 'color: #94a3b8;' }}">
                        {{ !$esEntrada ? number_format($m['salida_cantidad'], 2) : '-' }}
                    </td>
                    <td class="text-right" style="{{ !$esEntrada ? 'color: #c2410c;' : 'color: #94a3b8;' }}">
                        {{ !$esEntrada ? number_format($m['salida_costo_unitario'], 4) : '-' }}
                    </td>
                    <td class="text-right" style="{{ !$esEntrada ? 'color: #c2410c; font-weight: bold;' : 'color: #94a3b8;' }}">
                        {{ !$esEntrada ? number_format($m['salida_total'], 2) : '-' }}
                    </td>

                    <!-- Bloque Saldos -->
                    <td class="text-right" style="font-weight: bold; color: #1e40af;">
                        {{ number_format($m['saldo_cantidad'], 2) }}
                    </td>
                    <td class="text-right" style="color: #1e40af;">
                        {{ number_format($m['saldo_costo_promedio'], 4) }}
                    </td>
                    <td class="text-right" style="font-weight: bold; color: #059669;">
                        S/ {{ number_format($m['saldo_total_valorizado'], 2) }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="13" class="text-center" style="padding: 15px; color: #64748b;">
                        No existen operaciones cronológicas registradas para este producto.
                    </td>
                </tr>
            @endforelse
        </tbody>
        <tfoot>
            <tr class="tfoot-total">
                <td colspan="4" class="text-right">TOTALES ACUMULADOS:</td>
                <!-- Entradas -->
                <td class="text-right" style="color: #15803d;">{{ number_format($kpis['total_entradas_cant'], 2) }}</td>
                <td></td>
                <td class="text-right" style="color: #15803d;">S/ {{ number_format($kpis['total_entradas_valor'], 2) }}</td>
                <!-- Salidas -->
                <td class="text-right" style="color: #c2410c;">{{ number_format($kpis['total_salidas_cant'], 2) }}</td>
                <td></td>
                <td class="text-right" style="color: #c2410c;">S/ {{ number_format($kpis['total_salidas_valor'], 2) }}</td>
                <!-- Saldos -->
                <td class="text-right" style="color: #1e40af;">{{ number_format($kpis['saldo_actual_cant'], 2) }}</td>
                <td class="text-right" style="color: #1e40af;">S/ {{ number_format($kpis['costo_promedio_vigente'], 4) }}</td>
                <td class="text-right" style="color: #059669; font-size: 9px; background-color: #dcfce7;">
                    S/ {{ number_format($kpis['saldo_actual_valorizado'], 2) }}
                </td>
            </tr>
        </tfoot>
    </table>

    <!-- Bloque de Firmas y Validación de Auditoría -->
    <table class="signatures-table">
        <tr>
            <td>
                <div class="signature-line">RESPONSABLE DE ALMACÉN</div>
                <div class="signature-role">Control Físico e Inventarios</div>
            </td>
            <td>
                <div class="signature-line">ÁREA DE COMPRAS / LOGÍSTICA</div>
                <div class="signature-role">Gestión de Abastecimiento</div>
            </td>
            <td>
                <div class="signature-line">CONTABILIDAD / COSTOS</div>
                <div class="signature-role">Auditoría y Valuación NIC 2 / SUNAT</div>
            </td>
        </tr>
    </table>

</body>
</html>
