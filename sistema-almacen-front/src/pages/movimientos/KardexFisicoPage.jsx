import React, { useState } from 'react';
import { FileText, Search, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import '../pagesCommon.css';

export default function KardexFisicoPage() {
  const [selectedProduct, setSelectedProduct] = useState('PROD-001');

  const kardexEntries = [
    { id: 1, fecha: '2026-10-01', tipo: 'INICIAL', doc: 'SALDO INICIAL', entrada: 100, salida: 0, saldo: 100, observacion: 'Apertura de inventario mes octubre' },
    { id: 2, fecha: '2026-10-03', tipo: 'INGRESO', doc: 'NI-2026-0008', entrada: 80, salida: 0, saldo: 180, observacion: 'Compra según Factura F001-923' },
    { id: 3, fecha: '2026-10-05', tipo: 'SALIDA', doc: 'NS-2026-0044', entrada: 0, salida: 30, saldo: 150, observacion: 'Entregado a Téc. Maria Gómez para Red FO' },
  ];

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Kardex Físico de Productos</h2>
          <p>Trazabilidad física de movimientos: Entradas, Salidas y Saldo final en unidades de stock.</p>
        </div>
      </div>

      {/* Selector de Producto para Filtrar Kardex */}
      <div className="table-card" style={{ padding: '16px 20px', background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: '600', fontSize: '13.5px', color: '#334155' }}>
            Seleccionar Producto:
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            style={{ padding: '8px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13.5px', minWidth: '320px', outline: 'none' }}
          >
            <option value="PROD-001">PROD-001 - Tubo PVC 1/2" X 3M (Tuberías)</option>
            <option value="PROD-002">PROD-002 - Cable Unipolar 4mm Azul (Electricidad)</option>
            <option value="PROD-003">PROD-003 - Cemento Portland Tipo I 42.5kg (Construcción)</option>
          </select>
        </div>
      </div>

      {/* Tabla del Kardex Físico */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo Movimiento</th>
              <th>Documento Sustento</th>
              <th>Entrada (+)</th>
              <th>Salida (-)</th>
              <th>Saldo Físico</th>
              <th>Observación / Destino</th>
            </tr>
          </thead>
          <tbody>
            {kardexEntries.map((row) => (
              <tr key={row.id}>
                <td>{row.fecha}</td>
                <td>
                  {row.tipo === 'INGRESO' && (
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ArrowDownLeft size={12} /> INGRESO
                    </span>
                  )}
                  {row.tipo === 'SALIDA' && (
                    <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ArrowUpRight size={12} /> SALIDA
                    </span>
                  )}
                  {row.tipo === 'INICIAL' && <span className="badge badge-info">SALDO INICIAL</span>}
                </td>
                <td><strong style={{ fontFamily: 'monospace' }}>{row.doc}</strong></td>
                <td><span style={{ color: row.entrada > 0 ? '#16a34a' : '#94a3b8', fontWeight: row.entrada > 0 ? '700' : 'normal' }}>{row.entrada}</span></td>
                <td><span style={{ color: row.salida > 0 ? '#dc2626' : '#94a3b8', fontWeight: row.salida > 0 ? '700' : 'normal' }}>{row.salida}</span></td>
                <td><strong style={{ color: '#0f172a', fontSize: '15px' }}>{row.saldo}</strong></td>
                <td style={{ color: '#64748b' }}>{row.observacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
