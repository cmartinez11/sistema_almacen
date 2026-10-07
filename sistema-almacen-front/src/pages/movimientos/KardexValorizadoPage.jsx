import React from 'react';
import { DollarSign, Download, Filter } from 'lucide-react';
import '../pagesCommon.css';

export default function KardexValorizadoPage() {
  const valorizadoData = [
    {
      id: 1,
      producto: 'Tubo PVC 1/2" X 3M',
      sku: 'PROD-001',
      costo_unitario: 'S/ 18.50',
      stock_fisico: 150,
      valor_total: 'S/ 2,775.00',
      metodo: 'PEPS / Promedio Ponderado',
    },
    {
      id: 2,
      producto: 'Cable Unipolar 4mm Azul',
      sku: 'PROD-002',
      costo_unitario: 'S/ 3.80',
      stock_fisico: 8,
      valor_total: 'S/ 30.40',
      metodo: 'Promedio Ponderado',
    },
    {
      id: 3,
      producto: 'Cemento Portland Tipo I 42.5kg',
      sku: 'PROD-003',
      costo_unitario: 'S/ 28.00',
      stock_fisico: 80,
      valor_total: 'S/ 2,240.00',
      metodo: 'Promedio Ponderado',
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Kardex Valorizado (Control Financiero de Inventario)</h2>
          <p>Valorización contable por método de Promedio Ponderado / PEPS para auditoría y gerencia.</p>
        </div>
        <button className="primary-btn">
          <Download size={18} /> Exportar Excel / SUNAT
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-info">
            <span>Valor Total en Moneda Nacional</span>
            <h3 style={{ color: '#059669' }}>S/ 5,045.40</h3>
          </div>
          <div className="kpi-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Descripción de Producto</th>
              <th>Costo Unitario Prom.</th>
              <th>Stock Físico Actual</th>
              <th>Valor Total Acumulado</th>
              <th>Método Valuación</th>
            </tr>
          </thead>
          <tbody>
            {valorizadoData.map((v) => (
              <tr key={v.id}>
                <td><strong style={{ color: '#2563eb' }}>{v.sku}</strong></td>
                <td style={{ fontWeight: '600' }}>{v.producto}</td>
                <td>{v.costo_unitario}</td>
                <td><strong>{v.stock_fisico} u.</strong></td>
                <td><strong style={{ color: '#059669', fontSize: '15px' }}>{v.valor_total}</strong></td>
                <td><span className="badge badge-purple">{v.metodo}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
