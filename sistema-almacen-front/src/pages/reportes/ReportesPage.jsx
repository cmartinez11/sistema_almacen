import React from 'react';
import { BarChart3, FileSpreadsheet, FileText, Download, Calendar, Filter } from 'lucide-react';
import '../pagesCommon.css';

export default function ReportesPage() {
  const reportCards = [
    {
      id: 'inv-global',
      title: 'Reporte Valorizado de Inventario Global',
      description: 'Resumen contable detallado de todos los ítems en existencia al cierre de mes.',
      icon: FileSpreadsheet,
      format: 'Excel / PDF',
      color: '#10b981',
    },
    {
      id: 'mov-periodo',
      title: 'Movimientos de Almacén por Rango de Fechas',
      description: 'Consolidado de todas las notas de entrada y salida emitidas en el periodo seleccionado.',
      icon: Calendar,
      format: 'Excel / PDF',
      color: '#3b82f6',
    },
    {
      id: 'consumo-personal',
      title: 'Reporte de Consumo Asignado a Personal',
      description: 'Auditoría de materiales entregados por trabajador, DNI y centro de costo/obra.',
      icon: FileText,
      format: 'Excel / PDF',
      color: '#f59e0b',
    },
    {
      id: 'sin-movimiento',
      title: 'Ítems en Obsolescencia / Sin Movimiento',
      description: 'Identificación de productos con stock inmóvil mayor a 90 días para toma de decisiones.',
      icon: BarChart3,
      format: 'Excel / PDF',
      color: '#8b5cf6',
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Centro de Reportes & Analítica</h2>
          <p>Generación de reportes ejecutivos, auditoría de consumos y exportación de datos en tiempo real.</p>
        </div>
      </div>

      {/* Grilla de Generación de Reportes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {reportCards.map((rep) => {
          const IconComp = rep.icon;
          return (
            <div key={rep.id} className="table-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between' }}>
              <div>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${rep.color}15`, color: rep.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <IconComp size={24} />
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a' }}>{rep.title}</h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                  {rep.description}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: 'auto' }}>
                <span className="badge badge-info">{rep.format}</span>
                <button className="primary-btn" style={{ padding: '6px 14px', fontSize: '12.5px', background: rep.color }}>
                  <Download size={14} /> Generar Reporte
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
