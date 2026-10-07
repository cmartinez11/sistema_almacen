<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Guía de Transferencia Interna - {{ $transferencia->correlativo }}</title>
    <style>
        @page {
            margin: 25px 30px;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 12px;
            color: #1e293b;
            line-height: 1.4;
        }
        .header-container {
            width: 100%;
            border-bottom: 2px solid #6d28d9;
            padding-bottom: 12px;
            margin-bottom: 20px;
        }
        .company-name {
            font-size: 16px;
            font-weight: bold;
            color: #0f172a;
            letter-spacing: 0.5px;
        }
        .subtitle {
            font-size: 10px;
            color: #6d28d9;
            font-weight: bold;
            text-transform: uppercase;
        }
        .doc-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e293b;
            text-align: right;
            margin: 0;
        }
        .doc-correlativo {
            font-size: 14px;
            color: #6d28d9;
            font-weight: bold;
            text-align: right;
            font-family: monospace;
        }
        .info-grid {
            width: 100%;
            margin-bottom: 20px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
        }
        .info-table td {
            padding: 4px 8px;
            vertical-align: top;
        }
        .label {
            font-weight: bold;
            color: #475569;
            font-size: 11px;
            text-transform: uppercase;
        }
        .value {
            color: #0f172a;
            font-size: 12px;
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .badge-purple { background-color: #f3e8ff; color: #6d28d9; }
        .badge-success { background-color: #dcfce7; color: #15803d; }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th {
            background-color: #6d28d9;
            color: #ffffff;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            padding: 8px 10px;
            text-align: left;
            border: 1px solid #6d28d9;
        }
        .items-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11.5px;
        }
        .items-table tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .sku-code {
            font-family: monospace;
            font-weight: bold;
            color: #6d28d9;
        }
        .signatures {
            margin-top: 50px;
            width: 100%;
        }
        .signature-box {
            width: 45%;
            float: left;
            text-align: center;
        }
        .signature-line {
            border-top: 1px solid #94a3b8;
            margin-bottom: 5px;
            width: 80%;
            margin-left: 10%;
        }
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 5px;
        }
        .clearfix::after {
            content: "";
            clear: both;
            display: table;
        }
    </style>
</head>
<body>

    <!-- CABECERA DE DOCUMENTO -->
    <table class="header-container" style="width: 100%;">
        <tr>
            <td style="width: 55%;">
                <div class="company-name">LOGÍSTICA & ALMACÉN TÉCNICO</div>
                <div class="subtitle">Guía de Transferencia Interna de Inventario</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Control de Traslado entre Almacenes</div>
            </td>
            <td style="width: 45%; text-align: right;">
                <div class="doc-title">GUÍA DE TRANSFERENCIA</div>
                <div class="doc-correlativo">{{ $transferencia->correlativo }}</div>
                <div style="margin-top: 4px;">
                    <span class="badge badge-success">ESTADO: {{ strtoupper($transferencia->estado) }}</span>
                </div>
            </td>
        </tr>
    </table>

    <!-- INFORMACIÓN DE ORIGEN Y DESTINO -->
    <div class="info-grid">
        <table class="info-table">
            <tr>
                <td style="width: 50%;">
                    <div class="label">🏢 ALMACÉN DE ORIGEN (DESPACHO):</div>
                    <div class="value" style="font-weight: bold; color: #dc2626;">
                        {{ $transferencia->almacenOrigen->nombre ?? 'Almacén Principal' }} ({{ $transferencia->almacenOrigen->codigo ?? 'ALM-01' }})
                    </div>
                </td>
                <td style="width: 50%;">
                    <div class="label">🏭 ALMACÉN DE DESTINO (RECEPCIÓN):</div>
                    <div class="value" style="font-weight: bold; color: #16a34a;">
                        {{ $transferencia->almacenDestino->nombre ?? 'Planta 3' }} ({{ $transferencia->almacenDestino->codigo ?? 'ALM-03' }})
                    </div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="label" style="margin-top: 8px;">FECHA Y HORA DE EMISIÓN:</div>
                    <div class="value">{{ \Carbon\Carbon::parse($transferencia->fecha_emision)->format('d/m/Y H:i:s') }}</div>
                </td>
                <td>
                    <div class="label" style="margin-top: 8px;">USUARIO REGISTRADOR:</div>
                    <div class="value">{{ $transferencia->user->name ?? 'Almacenero Sistema' }}</div>
                </td>
            </tr>
            @if($transferencia->observaciones)
            <tr>
                <td colspan="2">
                    <div class="label" style="margin-top: 8px;">MOTIVO / OBSERVACIONES:</div>
                    <div class="value" style="font-style: italic; background: #ffffff; padding: 6px; border-radius: 4px; border: 1px solid #e2e8f0; margin-top: 2px;">
                        {{ $transferencia->observaciones }}
                    </div>
                </td>
            </tr>
            @endif
        </table>
    </div>

    <!-- TABLA DE DETALLE DE PRODUCTOS TRANSFERIDOS -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 20%;">CÓDIGO SKU</th>
                <th style="width: 45%;">DESCRIPCIÓN DEL PRODUCTO / MATERIAL</th>
                <th style="width: 15%;">U. MEDIDA</th>
                <th style="width: 15%; text-align: right;">CANT. TRASLADADA</th>
            </tr>
        </thead>
        <tbody>
            @foreach($transferencia->detalles as $index => $item)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td class="sku-code">{{ $item->producto->sku ?? 'N/A' }}</td>
                <td><strong>{{ $item->producto->nombre ?? 'Producto Desconocido' }}</strong></td>
                <td>{{ $item->producto->unidadMedida->nombre ?? $item.producto->unidadMedida->simbolo ?? 'Unidad' }}</td>
                <td style="text-align: right; font-weight: bold; color: #6d28d9; font-size: 12px;">
                    {{ number_format($item->cantidad, 2) }}
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- SECCIÓN DE FIRMAS -->
    <div class="signatures clearfix">
        <div class="signature-box">
            <div class="signature-line"></div>
            <div style="font-weight: bold; font-size: 11px;">DESPACHADO POR (ORIGEN)</div>
            <div style="color: #64748b; font-size: 10px;">{{ $transferencia->almacenOrigen->nombre ?? 'Almacén Principal' }}</div>
        </div>
        <div class="signature-box" style="float: right;">
            <div class="signature-line"></div>
            <div style="font-weight: bold; font-size: 11px;">RECIBIDO POR (DESTINO)</div>
            <div style="color: #64748b; font-size: 10px;">{{ $transferencia->almacenDestino->nombre ?? 'Planta 3' }}</div>
        </div>
    </div>

    <div class="footer">
        Documento de Control Interno de Transferencia de Inventarios - Sistema Logístico & Almacén | Página 1 de 1
    </div>

</body>
</html>
