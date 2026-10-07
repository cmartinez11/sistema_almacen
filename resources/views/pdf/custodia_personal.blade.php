<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Custodia de Materiales - {{ $trabajador->apellidos }}, {{ $trabajador->nombres }}</title>
    <style>
        @page {
            margin: 25px 30px;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11.5px;
            color: #1e293b;
            line-height: 1.4;
        }
        .header-container {
            width: 100%;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 18px;
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
            font-size: 14px;
            font-weight: bold;
            color: #1e293b;
            text-align: right;
            margin: 0;
        }
        .info-grid {
            width: 100%;
            margin-bottom: 18px;
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
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
            color: #1e40af;
            font-size: 10px;
            text-transform: uppercase;
        }
        .value {
            color: #0f172a;
            font-size: 11.5px;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }
        .items-table th {
            background-color: #1e40af;
            color: #ffffff;
            font-weight: bold;
            font-size: 10.5px;
            text-transform: uppercase;
            padding: 7px 9px;
            text-align: left;
            border: 1px solid #1e40af;
        }
        .items-table td {
            padding: 7px 9px;
            border: 1px solid #cbd5e1;
            font-size: 11px;
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
            width: 50%;
            text-align: center;
            vertical-align: bottom;
            padding: 0 30px;
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

    <!-- Encabezado -->
    <div class="header-container">
        <table style="width: 100%;">
            <tr>
                <td style="width: 60%;">
                    <div class="company-name">LOGÍSTICA & STOCK</div>
                    <div class="subtitle">SISTEMA INTEGRADO DE GESTIÓN DE ALMACÉN</div>
                </td>
                <td style="width: 40%;">
                    <div class="doc-title">REPORTE AUDITABLE DE ASIGNACIONES Y CUSTODIA DE MATERIALES</div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Datos del Trabajador -->
    <div class="info-grid">
        <table class="info-table">
            <tr>
                <td style="width: 40%;">
                    <span class="label">Trabajador:</span><br>
                    <span class="value"><strong>{{ $trabajador->apellidos }}, {{ $trabajador->nombres }}</strong></span>
                </td>
                <td style="width: 30%;">
                    <span class="label">DNI / Documento:</span><br>
                    <span class="value"><strong style="font-family: monospace;">{{ $trabajador->dni ?? $trabajador->documento_identidad }}</strong></span>
                </td>
                <td style="width: 30%;">
                    <span class="label">Área / Departamento:</span><br>
                    <span class="value">{{ $trabajador->area ?? 'General' }}</span>
                </td>
            </tr>
            <tr>
                <td>
                    <span class="label">Cargo Operativo:</span><br>
                    <span class="value">{{ $trabajador->cargo ?? 'Operativo' }}</span>
                </td>
                <td>
                    <span class="label">Estado en Sistema:</span><br>
                    <span class="value" style="font-weight: bold; color: #16a34a;">{{ strtoupper($trabajador->estado ?? 'ACTIVO') }}</span>
                </td>
                <td>
                    <span class="label">Fecha de Emisión Reporte:</span><br>
                    <span class="value">{{ now()->format('d/m/Y H:i A') }}</span>
                </td>
            </tr>
        </table>
    </div>

    <!-- Resumen Acumulado en Custodia -->
    <h3 style="font-size: 12px; color: #0f172a; margin-bottom: 8px; text-transform: uppercase;">
        1. Resumen Acumulado de Bienes y Materiales en Custodia del Trabajador
    </h3>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 6%; text-align: center;">N°</th>
                <th style="width: 20%;">SKU Código</th>
                <th style="width: 54%;">Descripción del Material / EPP / Herramienta</th>
                <th style="width: 20%; text-align: center;">Total Entregado</th>
            </tr>
        </thead>
        <tbody>
            @forelse($resumenAcumulado as $index => $item)
                <tr>
                    <td style="text-align: center; font-weight: bold; color: #64748b;">{{ $index + 1 }}</td>
                    <td><strong style="font-family: monospace; color: #1e40af;">{{ $item['sku'] }}</strong></td>
                    <td><strong>{{ $item['producto'] }}</strong></td>
                    <td style="text-align: center; font-weight: bold; color: #15803d; background-color: #f0fdf4;">
                        {{ number_format($item['cantidad_total'], 2) }} {{ $item['unidad'] }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="4" style="text-align: center; color: #64748b; padding: 16px;">
                        No existen materiales ni equipos registrados a nombre de este trabajador.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- Historial Detallado por Nota de Salida -->
    <h3 style="font-size: 12px; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; margin-top: 15px;">
        2. Historial de Notas de Salida y Entregas Físicas
    </h3>

    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 15%;">Comprobante NS</th>
                <th style="width: 18%;">Fecha Despacho</th>
                <th style="width: 22%;">Área / Destino</th>
                <th style="width: 33%;">Detalle de Materiales</th>
                <th style="width: 12%; text-align: center;">Total Ítems</th>
            </tr>
        </thead>
        <tbody>
            @forelse($salidas as $sal)
                <tr>
                    <td><strong style="font-family: monospace; color: #ea580c;">{{ $sal->correlativo ?? 'NS-'.str_pad($sal->id, 5, '0', STR_PAD_LEFT) }}</strong></td>
                    <td>{{ \Carbon\Carbon::parse($sal->fecha_emision)->format('d/m/Y H:i') }}</td>
                    <td>{{ $sal->destino_cliente ?? 'Asignación a Personal' }}</td>
                    <td style="fontSize: 10.5px;">
                        @foreach($sal->salidasDetalle as $det)
                            <div>• {{ $det->producto->nombre ?? 'Producto' }} (<strong>{{ number_format((float)$det->cantidad, 2) }} u.</strong>)</div>
                        @endforeach
                    </td>
                    <td style="text-align: center; font-weight: bold;">{{ $sal->salidasDetalle->count() }} prod.</td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" style="text-align: center; color: #64748b; padding: 16px;">
                        Sin entregas registradas en el módulo de salidas.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div style="font-size: 9.5px; color: #64748b; margin-top: 15px; font-style: italic;">
        * Este reporte acredita la custodia temporal de herramientas y materiales asignados por el área de logística. En caso de cese laboral o rotación de puesto, los bienes deberán ser devueltos en su totalidad a almacén.
    </div>

    <!-- Firmas -->
    <div class="signatures-container">
        <table class="signatures-table">
            <tr>
                <td>
                    <div class="signature-line">DESPACHADO POR (ALMACÉN)</div>
                    <div class="signature-role">Firma y Sello Encargado Almacén</div>
                </td>
                <td>
                    <div class="signature-line">TRABAJADOR RECEPTANTE</div>
                    <div class="signature-role">Firma y DNI: {{ $trabajador->dni ?? $trabajador->documento_identidad }}</div>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
