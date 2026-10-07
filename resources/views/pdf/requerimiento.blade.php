<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Orden de Requerimiento - {{ $requerimiento->correlativo }}</title>
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
            border-bottom: 2px solid #2563eb;
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
            color: #2563eb;
            font-weight: bold;
            text-transform: uppercase;
        }
        .doc-title {
            font-size: 18px;
            font-weight: bold;
            color: #1e293b;
            text-align: right;
            margin: 0;
        }
        .doc-correlativo {
            font-size: 14px;
            color: #2563eb;
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
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .badge-pendiente { background-color: #fef3c7; color: #a16207; }
        .badge-aprobado { background-color: #dcfce7; color: #15803d; }
        .badge-rechazado { background-color: #fee2e2; color: #b91c1c; }
        .badge-alta { background-color: #fee2e2; color: #b91c1c; }
        .badge-media { background-color: #fef9c3; color: #a16207; }
        .badge-baja { background-color: #e0f2fe; color: #0369a1; }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
        }
        .items-table th {
            background-color: #1e293b;
            color: #ffffff;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            padding: 8px 10px;
            text-align: left;
            border: 1px solid #1e293b;
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
            margin-top: 60px;
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
                <td style="width: 60%;">
                    <div class="company-name">LOGÍSTICA & STOCK</div>
                    <div class="subtitle">SISTEMA INTEGRADO DE GESTIÓN DE ALMACÉN</div>
                </td>
                <td style="width: 40%;">
                    <div class="doc-title">ORDEN DE REQUERIMIENTO</div>
                    <div class="doc-correlativo">{{ $requerimiento->correlativo }}</div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Información General -->
    <div class="info-grid">
        <table class="info-table">
            <tr>
                <td style="width: 50%;">
                    <span class="label">Destino / Solicitante:</span><br>
                    <span class="value">
                        @if($requerimiento->personal)
                            <strong>{{ $requerimiento->personal->nombres }} {{ $requerimiento->personal->apellidos }}</strong>
                            (DNI: {{ $requerimiento->personal->dni ?? $requerimiento->personal->documento_identidad }})
                        @else
                            <strong>📦 Reposición de Stock General para el Almacén</strong>
                        @endif
                    </span>
                </td>
                <td style="width: 25%;">
                    <span class="label">Fecha y Hora:</span><br>
                    <span class="value">
                        {{ \Carbon\Carbon::parse($requerimiento->fecha_solicitud)->format('d/m/Y H:i A') }}
                    </span>
                </td>
                <td style="width: 25%;">
                    <span class="label">Estado Actual:</span><br>
                    <span class="badge badge-{{ strtolower($requerimiento->estado) }}">
                        {{ strtoupper($requerimiento->estado) }}
                    </span>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="label">Área / Departamento:</span><br>
                    <span class="value">{{ $requerimiento->area ?? 'Almacén Central' }}</span>
                </td>
                <td>
                    <span class="label">Prioridad:</span><br>
                    <span class="badge badge-{{ strtolower($requerimiento->prioridad) }}">
                        {{ strtoupper($requerimiento->prioridad) }}
                    </span>
                </td>
                <td>
                    <span class="label">Emitido Por:</span><br>
                    <span class="value">Sistema de Almacén</span>
                </td>
            </tr>
            @if($requerimiento->observaciones)
            <tr>
                <td colspan="3" style="padding-top: 8px; border-top: 1px dashed #cbd5e1;">
                    <span class="label">Observaciones:</span><br>
                    <span class="value" style="font-style: italic;">{{ $requerimiento->observaciones }}</span>
                </td>
            </tr>
            @endif
        </table>
    </div>

    <!-- Tabla Detalle de Productos -->
    <h3 style="font-size: 13px; color: #0f172a; margin-bottom: 8px; text-transform: uppercase;">
        Detalle de Productos Requeridos a Compras
    </h3>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 8%; text-align: center;">N°</th>
                <th style="width: 20%;">Código SKU</th>
                <th style="width: 47%;">Descripción del Producto</th>
                <th style="width: 15%; text-align: center;">U. Medida</th>
                <th style="width: 10%; text-align: right;">Cantidad</th>
            </tr>
        </thead>
        <tbody>
            @foreach($requerimiento->detalles as $index => $det)
                <tr>
                    <td style="text-align: center; font-weight: bold; color: #64748b;">{{ $index + 1 }}</td>
                    <td><strong style="font-family: monospace; color: #2563eb;">{{ $det->producto->sku ?? 'N/A' }}</strong></td>
                    <td><strong>{{ $det->producto->nombre ?? 'Producto Desconocido' }}</strong></td>
                    <td style="text-align: center;">{{ $det->producto->unidadMedida->nombre ?? $det->producto->unidadMedida->simbolo ?? 'Unidad' }}</td>
                    <td style="text-align: right; font-weight: bold; color: #0f172a;">
                        {{ number_format($det->cantidad_solicitada, 2) }}
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
                    <div class="signature-line">EMITIDO POR</div>
                    <div class="signature-role">Encargado de Almacén</div>
                </td>
                <td>
                    <div class="signature-line">REVISADO Y APROBADO</div>
                    <div class="signature-role">Jefatura de Compras</div>
                </td>
                <td>
                    <div class="signature-line">V° B° DIRECCIÓN</div>
                    <div class="signature-role">Gerencia General</div>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
