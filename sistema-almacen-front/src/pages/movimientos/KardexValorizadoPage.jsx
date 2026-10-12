import React, { useState, useEffect } from 'react';
import { DollarSign, Download, Filter, PackageCheck, ShieldAlert, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRole } from '../../config/rbacConfig';
import api from '../../services/api';
import '../pagesCommon.css';

export default function KardexValorizadoPage() {
  const { user, canViewPrices: userCanViewPrices } = useRole();

  const [valorizadoData, setValorizadoData] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [selectedAlmacenId, setSelectedAlmacenId] = useState('');
  const [valorTotalGeneral, setValorTotalGeneral] = useState(0);
  const [totalItemsFisicos, setTotalItemsFisicos] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userCanViewPrices) {
      loadInitialData();
    }
  }, [userCanViewPrices]);

  const loadInitialData = async () => {
    try {
      const resAlm = await api.get('/almacenes');
      const dataAlm = resAlm.data?.data || resAlm.data;
      setAlmacenes(Array.isArray(dataAlm) ? dataAlm : []);
    } catch (err) {
      console.warn('Error al cargar almacenes:', err);
    }
    loadValorizadoData('');
  };

  const loadValorizadoData = async (almId = selectedAlmacenId) => {
    try {
      setLoading(true);
      let url = '/kardex/valorizado';
      if (almId) {
        url += `?almacen_id=${almId}`;
      }
      const res = await api.get(url);
      if (res.data?.status === 'success') {
        const d = res.data.data;
        setValorizadoData(d.productos || []);
        setValorTotalGeneral(Number(d.valor_total_general || 0));
        setTotalItemsFisicos(Number(d.total_items_fisicos || 0));
      }
    } catch (err) {
      console.error('Error al cargar Kardex Valorizado:', err);
    } finally {
      setLoading(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleAlmacenFilterChange = (e) => {
    const almId = e.target.value;
    setSelectedAlmacenId(almId);
    loadValorizadoData(almId);
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      let url = '/reportes/kardex-valorizado/exportar';
      if (selectedAlmacenId) {
        url += `?almacen_id=${selectedAlmacenId}`;
      }

      const response = await api.get(url, {
        responseType: 'blob',
      });

      // Extraer nombre de archivo desde cabeceras Content-Disposition o generar por defecto
      let filename = 'kardex_valorizado.csv';
      const disposition = response.headers?.['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      } else {
        const almName = selectedAlmacenId ? `_almacen_${selectedAlmacenId}` : '_consolidado';
        filename = `kardex_valorizado${almName}_${new Date().toISOString().slice(0, 10)}.csv`;
      }

      // Crear objeto URL temporal y simular descarga automática en el navegador
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Error al exportar Kardex Valorizado:', err);
      alert('Error al descargar el archivo del Kardex Valorizado. Por favor, intente nuevamente.');
    } finally {
      setExporting(false);
    }
  };

  if (!userCanViewPrices) {
    return (
      <div className="page-container">
        <div className="page-header-card">
          <div className="page-title-group">
            <h2>Kardex Valorizado (Control Financiero de Inventario)</h2>
            <p>Valorización contable en tiempo real calculada por el método de Promedio Ponderado por Almacén.</p>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center',
            marginTop: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <ShieldAlert size={32} color="#dc2626" />
          </div>
          <h3 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '18px' }}>
            Acceso Restringido para el Rol Almacenero
          </h3>
          <p
            style={{
              color: '#64748b',
              maxWidth: '540px',
              margin: '0 auto 24px',
              fontSize: '14px',
              lineHeight: '1.6',
            }}
          >
            Los costos contables, precios de compra y valorizaciones monetarias de inventario están reservados exclusivamente para los roles de <strong>Administración</strong> y <strong>Compras</strong>.
            <br />
            Para auditar entradas, salidas y stocks físicos sin valores monetarios, utilice el módulo correspondiente.
          </p>
          <Link
            to="/reportes/kardex-fisico"
            className="primary-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              padding: '10px 20px',
              margin: '0 auto',
            }}
          >
            <FileText size={18} /> Ir a Kardex Físico (Cantidades de Almacén)
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Kardex Valorizado (Control Financiero de Inventario)</h2>
          <p>Valorización contable en tiempo real calculada por el método de Promedio Ponderado por Almacén.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>🏢 Filtrar Almacén:</span>
            <select
              value={selectedAlmacenId}
              onChange={handleAlmacenFilterChange}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontWeight: '700',
                color: '#059669',
                background: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="">-- Todos los Almacenes --</option>
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.codigo})
                </option>
              ))}
            </select>
          </div>
          <button
            className="primary-btn"
            onClick={handleExportExcel}
            disabled={exporting}
            style={{
              background: exporting ? '#94a3b8' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              cursor: exporting ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Download size={18} /> {exporting ? 'Generando descarga...' : 'Exportar Excel / SUNAT'}
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-info">
            <span>Valor Total en Moneda Nacional (PEN)</span>
            <h3 style={{ color: '#059669' }}>
              S/ {valorTotalGeneral.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="kpi-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
            <DollarSign size={24} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span>Total de Unidades Físicas Registradas</span>
            <h3 style={{ color: '#2563eb' }}>
              {totalItemsFisicos.toLocaleString('es-PE')} u.
            </h3>
          </div>
          <div className="kpi-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <PackageCheck size={24} />
          </div>
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando valorización de inventario contable...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Descripción de Producto</th>
                <th>Categoría</th>
                <th>Costo Unitario Prom.</th>
                <th>Stock Físico Actual</th>
                <th>Valor Total Acumulado</th>
                <th>Método Valuación</th>
              </tr>
            </thead>
            <tbody>
              {valorizadoData.map((v) => (
                <tr key={v.id}>
                  <td><strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{v.sku}</strong></td>
                  <td style={{ fontWeight: '600' }}>{v.producto}</td>
                  <td><span className="badge badge-info">{v.categoria}</span></td>
                  <td>S/ {Number(v.costo_unitario || 0).toFixed(2)}</td>
                  <td><strong>{Number(v.stock_fisico || 0).toFixed(2)} {v.unidad_medida || 'u.'}</strong></td>
                  <td>
                    <strong style={{ color: '#059669', fontSize: '15px' }}>
                      S/ {Number(v.valor_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </td>
                  <td><span className="badge badge-purple">{v.metodo || 'Promedio Ponderado'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
