<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Nota de Salida - {{ $salida->correlativo ?? 'NS-'.$salida->id }}</title>
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
            border-bottom: 2px solid #ea580c;
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
            color: #ea580c;
            font-weight: bold;
            text-transform: uppercase;
        }
        .doc-title {
            font-size: 15px;
            font-weight: bold;
            color: #1e293b;
            text-align: right;
            margin: 0;
        }
        .doc-correlativo {
            font-size: 14px;
            color: #ea580c;
            font-weight: bold;
            text-align: right;
            font-family: monospace;
        }
        .info-grid {
            width: 100%;
            margin-bottom: 20px;
            background-color: #fff7ed;
            border: 1px solid #ffedd5;
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
            color: #9a3412;
            font-size: 10.5px;
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
        .badge-emitido { background-color: #ffedd5; color: #c2410c; }
        .badge-info { background-color: #e0f2fe; color: #0369a1; }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th {
            background-color: #c2410c;
            color: #ffffff;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            padding: 8px 10px;
            text-align: left;
            border: 1px solid #c2410c;
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
                <td style="width: 55%;">
                    <div class="company-name">LOGÍSTICA & STOCK</div>
                    <div class="subtitle">SISTEMA INTEGRADO DE GESTIÓN DE ALMACÉN</div>
                </td>
                <td style="width: 45%;">
                    <div class="doc-title">ACTA DE ENTREGA / SALIDA DE MATERIALES (NS)</div>
                    <div class="doc-correlativo">{{ $salida->correlativo ?? 'NS-'.str_pad($salida->id, 5, '0', STR_PAD_LEFT) }}</div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Información General de la Asignación / Salida -->
    <div class="info-grid">
        <table class="info-table">
            <tr>
                <td style="width: 40%;">
                    <span class="label">Trabajador Receptante (Personal):</span><br>
                    <span class="value">
                        <strong>{{ $salida->personal ? $salida->personal->nombres.' '.$salida->personal->apellidos : 'PERSONAL NO ESPECIFICADO' }}</strong><br>
                        <small style="color: #64748b;">DNI / Doc: {{ $salida->personal->dni ?? $salida->personal->documento_identidad ?? 'S/N' }}</small><br>
                        <small style="color: #475569;">Área Base Empleado: <strong>{{ $salida->area_trabajador ?? $salida->personal->area ?? 'General' }}</strong></small>
                    </span>
                </td>
                <td style="width: 32%;">
                    <span class="label">Área de Destino (Centro de Costo):</span><br>
                    <span class="value">
                        <strong style="color: #c2410c;">{{ $salida->area_destino ?? $salida->destino_cliente ?? 'General' }}</strong>
                    </span>
                    <br><br>
                    <span class="label">Almacén de Origen:</span><br>
                    <span class="value"><strong>{{ $salida->almacen->nombre ?? 'Almacén Principal' }}</strong></span>
                </td>
                <td style="width: 28%;">
                    <span class="label">Fecha / Hora Despacho:</span><br>
                    <span class="value">
                        {{ \Carbon\Carbon::parse($salida->fecha_emision)->format('d/m/Y H:i A') }}
                    </span>
                    <br><br>
                    <span class="label">Estado Documento:</span><br>
                    <span class="badge badge-emitido">
                        {{ strtoupper($salida->estado ?? 'EMITIDO') }}
                    </span>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="label">Tipo de Operación:</span><br>
                    <span class="value">
                        <span class="badge badge-info">{{ $salida->tipo_salida ?? 'Asignación a Personal' }}</span>
                    </span>
                </td>
                <td colspan="2">
                    <span class="label">Justificación / Motivo del Despacho:</span><br>
                    <span class="value" style="font-weight: 600; color: #0f172a;">
                        {{ $salida->justificacion ?? $salida->observaciones ?? 'Sin justificación especificada' }}
                    </span>
                </td>
            </tr>
            @if($salida->observaciones && $salida->observaciones !== $salida->justificacion)
            <tr>
                <td colspan="3" style="padding-top: 8px; border-top: 1px dashed #fdba74;">
                    <span class="label">Observaciones Adicionales:</span><br>
                    <span class="value" style="font-style: italic;">{{ $salida->observaciones }}</span>
                </td>
            </tr>
            @endif
        </table>
    </div>

    <!-- Tabla Detalle de Materiales Entregados -->
    <h3 style="font-size: 13px; color: #0f172a; margin-bottom: 8px; text-transform: uppercase;">
        Detalle de Materiales / EPPs / Herramientas Entregadas
    </h3>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 6%; text-align: center;">N°</th>
                <th style="width: 20%;">SKU Código</th>
                <th style="width: 50%;">Descripción del Producto / Material</th>
                <th style="width: 12%; text-align: center;">U. Medida</th>
                <th style="width: 12%; text-align: center;">Cant. Despachada</th>
            </tr>
        </thead>
        <tbody>
            @foreach($salida->salidasDetalle as $index => $det)
                <tr>
                    <td style="text-align: center; font-weight: bold; color: #64748b;">{{ $index + 1 }}</td>
                    <td><strong style="font-family: monospace; color: #c2410c;">{{ $det->producto->sku ?? 'N/A' }}</strong></td>
                    <td><strong>{{ $det->producto->nombre ?? 'Producto General' }}</strong></td>
                    <td style="text-align: center; color: #475569;">
                        {{ $det->producto->unidadMedida->nombre ?? $det->producto->unidad_medida ?? 'UND' }}
                    </td>
                    <td style="text-align: center; font-weight: bold; color: #c2410c; background-color: #fff7ed;">
                        {{ number_format((float) $det->cantidad, 2) }} u.
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Declaración de Recepción y Firmas -->
    <div style="font-size: 10px; color: #64748b; margin-top: 20px; font-style: italic;">
        * Declaro haber recibido a satisfacción los materiales e insumos detallados en este documento para el desempeño de mis funciones laborales, comprometiéndome a su buen uso y conservación.
    </div>

    <div class="signatures-container">
        <table class="signatures-table">
            <tr>
                <td>
                    <div class="signature-line">ENTREGADO POR (ALMACÉN)</div>
                    <div class="signature-role">Firma Encargado Despacho</div>
                </td>
                <td>
                    <div class="signature-line">CONFORME RECIBÍ (TRABAJADOR)</div>
                    <div class="signature-role">Firma y DNI Trabajador Receptante</div>
                </td>
                <td>
                    <div class="signature-line">V° B° CONTROL / SUPERVISIÓN</div>
                    <div class="signature-role">Jefatura / Supervisión de Área</div>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
