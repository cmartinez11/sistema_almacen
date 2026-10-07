<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Nota de Ingreso - {{ $entrada->correlativo }}</title>
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
            border-bottom: 2px solid #16a34a;
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
            color: #16a34a;
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
            color: #16a34a;
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
        .badge-emitido { background-color: #dcfce7; color: #15803d; }
        .badge-completo { background-color: #dcfce7; color: #15803d; }
        .badge-parcial { background-color: #fef3c7; color: #a16207; }
        .badge-info { background-color: #e0f2fe; color: #0369a1; }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th {
            background-color: #15803d;
            color: #ffffff;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            padding: 8px 10px;
            text-align: left;
            border: 1px solid #15803d;
        }
        .items-table td {
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            font-size: 11.5px;
        }
        .items-table tr:nth-child(even) {
            background-color: #f8fafc;
        }

        .signatures-container {
            width: 100%;
            margin-top: 50px;
        }
        .signatures-table {
            width: 100%;
            border-collapse: collapse;
        }
        .signatures-table td {
            width: 33.33%;
            text-align: center;
            vertical-align: bottom;
            padding: 0 15px;
        }
        .signature-line {
            border-top: 1px solid #475569;
            padding-top: 6px;
            font-size: 11px;
            font-weight: bold;
            color: #334155;
        }
        .signature-role {
            font-size: 9.5px;
            color: #64748b;
        }
    </style>
</head>
<body>

    <!-- Encabezado Corporativo -->
    <div class="header-container">
        <table style="width: 100%;">
            <tr>
                <td style="width: 55%;">
                    <div class="company-name">LOGÍSTICA & STOCK</div>
                    <div class="subtitle">SISTEMA INTEGRADO DE GESTIÓN DE ALMACÉN</div>
                </td>
                <td style="width: 45%;">
                    <div class="doc-title">NOTA DE INGRESO DE ALMACÉN (NI)</div>
                    <div class="doc-correlativo">{{ $entrada->correlativo }}</div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Información General de la Recepción -->
    <div class="info-grid">
        <table class="info-table">
            <tr>
                <td style="width: 50%;">
                    <span class="label">Proveedor de Origen:</span><br>
                    <span class="value">
                        <strong>{{ $entrada->proveedor->razon_social ?? 'PROVEEDOR NO REGISTRADO' }}</strong><br>
                        <small style="color: #64748b;">RUC: {{ $entrada->proveedor->ruc ?? 'S/N' }}</small>
                    </span>
                </td>
                <td style="width: 25%;">
                    <span class="label">Fecha y Hora Registro:</span><br>
                    <span class="value">
                        {{ \Carbon\Carbon::parse($entrada->fecha_emision)->format('d/m/Y H:i A') }}
                    </span>
                </td>
                <td style="width: 25%;">
                    <span class="label">Estado Documento:</span><br>
                    <span class="badge badge-emitido">
                        {{ strtoupper($entrada->estado ?? 'EMITIDO') }}
                    </span>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="label">Comprobante de Referencia:</span><br>
                    <span class="value">
                        <strong>{{ $entrada->tipo_comprobante }}</strong>: {{ $entrada->numero_comprobante }}
                    </span>
                </td>
                <td>
                    <span class="label">Recepción por:</span><br>
                    <span class="value">
                        @if($entrada->user)
                            {{ $entrada->user->name }}
                        @elseif($entrada->personal)
                            {{ $entrada->personal->nombres }} {{ $entrada->personal->apellidos }}
                        @else
                            Almacenero Logueado
                        @endif
                    </span>
                </td>
                <td>
                    <span class="label">Orden de Compra / Req:</span><br>
                    <span class="value">
                        @if($entrada->requerimiento)
                            <strong style="color: #2563eb; font-family: monospace;">{{ $entrada->requerimiento->correlativo }}</strong>
                        @else
                            <span style="color: #64748b; font-style: italic;">Ingreso Directo</span>
                        @endif
                    </span>
                </td>
            </tr>
            @if($entrada->observaciones)
            <tr>
                <td colspan="3" style="padding-top: 8px; border-top: 1px dashed #cbd5e1;">
                    <span class="label">Observaciones de Recepción:</span><br>
                    <span class="value" style="font-style: italic;">{{ $entrada->observaciones }}</span>
                </td>
            </tr>
            @endif
        </table>
    </div>

    <!-- Tabla Detalle de Productos Ingresados -->
    <h3 style="font-size: 13px; color: #0f172a; margin-bottom: 8px; text-transform: uppercase;">
        Detalle de Productos Físicamente Recepcionados en Almacén
    </h3>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 6%; text-align: center;">N°</th>
                <th style="width: 18%;">SKU Código</th>
                <th style="width: 42%;">Descripción del Producto</th>
                <th style="width: 12%; text-align: center;">Solicitado OC</th>
                <th style="width: 12%; text-align: center;">Recibido NI</th>
                <th style="width: 10%; text-align: center;">Estado</th>
            </tr>
        </thead>
        <tbody>
            @foreach($entrada->entradasDetalle as $index => $det)
                @php
                    $cantSolicitada = null;
                    if ($entrada->requerimiento && isset($entrada->requerimiento->detalles)) {
                        $reqDet = $entrada->requerimiento->detalles->where('producto_id', $det->producto_id)->first();
                        if ($reqDet) {
                            $cantSolicitada = (float) $reqDet->cantidad_solicitada;
                        }
                    }
                    $cantRecibida = (float) $det->cantidad;
                    $totalAcumulado = isset($det->total_acumulado) ? (float) $det->total_acumulado : $cantRecibida;
                    $saldoPendiente = $cantSolicitada !== null ? max(0, $cantSolicitada - $totalAcumulado) : 0;
                @endphp
                <tr>
                    <td style="text-align: center; font-weight: bold; color: #64748b;">{{ $index + 1 }}</td>
                    <td><strong style="font-family: monospace; color: #16a34a;">{{ $det->producto->sku ?? 'N/A' }}</strong></td>
                    <td><strong>{{ $det->producto->nombre ?? 'Producto Desconocido' }}</strong></td>
                    <td style="text-align: center; color: #475569;">
                        {{ $cantSolicitada !== null ? number_format($cantSolicitada, 2) . ' u.' : '-' }}
                    </td>
                    <td style="text-align: center; font-weight: bold; color: #15803d; background-color: #f0fdf4;">
                        {{ number_format($cantRecibida, 2) }} u.
                    </td>
                    <td style="text-align: center;">
                        @if($cantSolicitada === null)
                            <span class="badge badge-info">Manual</span>
                        @elseif($saldoPendiente <= 0)
                            <span class="badge badge-completo">Completo</span>
                        @else
                            <span class="badge badge-parcial">Faltan {{ number_format($saldoPendiente, 2) }}</span>
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Pie de Página con Firmas -->
    <div class="signatures-container">
        <table class="signatures-table">
            <tr>
                <td>
                    <div class="signature-line">RECIBIDO POR ALMACÉN</div>
                    <div class="signature-role">Encargado de Recepción</div>
                </td>
                <td>
                    <div class="signature-line">ENTREGADO POR PROVEEDOR</div>
                    <div class="signature-role">Transporte / Conductor</div>
                </td>
                <td>
                    <div class="signature-line">V° B° CONTROL DE CALIDAD</div>
                    <div class="signature-role">Jefatura de Almacén</div>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
