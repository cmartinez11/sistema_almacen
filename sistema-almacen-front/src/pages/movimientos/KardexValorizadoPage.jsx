import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Download,
  Filter,
  PackageCheck,
  ShieldAlert,
  FileText,
  Package,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRole } from '../../config/rbacConfig';
import api from '../../services/api';
import '../pagesCommon.css';

// Helper robusto para garantizar que NUNCA se renderice un objeto en React
const formatText = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') {
    return val.nombre || val.name || val.codigo || val.descripcion || fallback;
  }
  return String(val);
};

export default function KardexValorizadoPage() {
  const { user, canViewPrices: userCanViewPrices } = useRole();

  // Pestaña activa: 'producto' (Kardex Detallado por Producto) | 'general' (Resumen Consolidado)
  const [activeTab, setActiveTab] = useState('producto');

  // Datos comunes
  const [almacenes, setAlmacenes] = useState([]);
  const [selectedAlmacenId, setSelectedAlmacenId] = useState('');

  // Estados - Pestaña 1: Kardex Detallado por Producto
  const [productosList, setProductosList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productKardexData, setProductKardexData] = useState(null);
  const [loadingProductKardex, setLoadingProductKardex] = useState(false);
  const [exportingProduct, setExportingProduct] = useState(false);
  const [exportingProductPdf, setExportingProductPdf] = useState(false);

  // Estados - Pestaña 2: Resumen General
  const [valorizadoGeneralData, setValorizadoGeneralData] = useState([]);
  const [valorTotalGeneral, setValorTotalGeneral] = useState(0);
  const [totalItemsFisicos, setTotalItemsFisicos] = useState(0);
  const [loadingGeneral, setLoadingGeneral] = useState(false);
  const [exportingGeneral, setExportingGeneral] = useState(false);

  useEffect(() => {
    if (userCanViewPrices) {
      loadInitialData();
    }
  }, [userCanViewPrices]);

  const loadInitialData = async () => {
    try {
      const [resAlm, resProd] = await Promise.all([
        api.get('/almacenes'),
        api.get('/productos'),
      ]);

      const dataAlm = resAlm.data?.data || resAlm.data;
      setAlmacenes(Array.isArray(dataAlm) ? dataAlm : []);

      const dataProd = resProd.data?.data?.data || resProd.data?.data || resProd.data;
      const listProd = Array.isArray(dataProd) ? dataProd : [];
      setProductosList(listProd);

      if (listProd.length > 0) {
        setSelectedProductId(listProd[0].id);
        fetchKardexForProduct(listProd[0].id, '');
      }
    } catch (err) {
      console.warn('Error al cargar datos iniciales de Kardex:', err);
    }

    loadValorizadoGeneral('');
  };

  // Cargar Kardex Detallado para un Producto específico
  const fetchKardexForProduct = async (prodId, almId = selectedAlmacenId) => {
    if (!prodId) return;
    try {
      setLoadingProductKardex(true);
      let url = `/kardex/producto/${prodId}`;
      if (almId) {
        url += `?almacen_id=${almId}`;
      }
      const res = await api.get(url);
      if (res.data?.status === 'success') {
        setProductKardexData(res.data.data);
      }
    } catch (err) {
      console.error('Error al cargar kardex del producto:', err);
      setProductKardexData(null);
    } finally {
      setLoadingProductKardex(false);
    }
  };

  // Cargar Resumen General de todo el catálogo
  const loadValorizadoGeneral = async (almId = selectedAlmacenId) => {
    try {
      setLoadingGeneral(true);
      let url = '/kardex/valorizado';
      if (almId) {
        url += `?almacen_id=${almId}`;
      }
      const res = await api.get(url);
      if (res.data?.status === 'success') {
        const d = res.data.data;
        setValorizadoGeneralData(d.productos || []);
        setValorTotalGeneral(Number(d.valor_total_general || 0));
        setTotalItemsFisicos(Number(d.total_items_fisicos || 0));
      }
    } catch (err) {
      console.error('Error al cargar Kardex Valorizado General:', err);
    } finally {
      setLoadingGeneral(false);
    }
  };

  const handleProductSelect = (e) => {
    const prodId = e.target.value;
    setSelectedProductId(prodId);
    fetchKardexForProduct(prodId, selectedAlmacenId);
  };

  const handleAlmacenFilterChange = (e) => {
    const almId = e.target.value;
    setSelectedAlmacenId(almId);
    if (activeTab === 'producto' && selectedProductId) {
      fetchKardexForProduct(selectedProductId, almId);
    } else if (activeTab === 'general') {
      loadValorizadoGeneral(almId);
    }
  };

  // Descargar Kardex Detallado del Producto seleccionado (Excel / CSV)
  const handleExportProductExcel = async () => {
    if (!selectedProductId) return;
    try {
      setExportingProduct(true);
      let url = `/reportes/kardex-producto/exportar?producto_id=${selectedProductId}`;
      if (selectedAlmacenId) {
        url += `&almacen_id=${selectedAlmacenId}`;
      }

      const response = await api.get(url, { responseType: 'blob' });

      let filename = `kardex_producto_${selectedProductId}.csv`;
      const disposition = response.headers?.['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

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
      console.error('Error al exportar kardex del producto:', err);
      alert('Error al descargar el Kardex del Producto. Intente nuevamente.');
    } finally {
      setExportingProduct(false);
    }
  };

  // Descargar Kardex Detallado del Producto en formato PDF (Landscape)
  const handleExportProductPdf = async () => {
    if (!selectedProductId) return;
    try {
      setExportingProductPdf(true);
      let url = `/reportes/kardex-producto/pdf?producto_id=${selectedProductId}`;
      if (selectedAlmacenId) {
        url += `&almacen_id=${selectedAlmacenId}`;
      }

      const response = await api.get(url, { responseType: 'blob' });

      let filename = `kardex_producto_${selectedProductId}.pdf`;
      const disposition = response.headers?.['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Error al exportar kardex en PDF:', err);
      alert('Error al descargar el PDF del Kardex. Intente nuevamente.');
    } finally {
      setExportingProductPdf(false);
    }
  };

  // Descargar Resumen General de Valorización (Excel / CSV)
  const handleExportGeneralExcel = async () => {
    try {
      setExportingGeneral(true);
      let url = '/reportes/kardex-valorizado/exportar';
      if (selectedAlmacenId) {
        url += `?almacen_id=${selectedAlmacenId}`;
      }

      const response = await api.get(url, { responseType: 'blob' });

      let filename = 'kardex_valorizado_general.csv';
      const disposition = response.headers?.['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

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
      console.error('Error al exportar Kardex Valorizado General:', err);
      alert('Error al descargar el archivo del Kardex Valorizado. Intente nuevamente.');
    } finally {
      setExportingGeneral(false);
    }
  };

  // Filtrado de productos para el buscador
  const filteredProducts = productosList.filter((p) => {
    if (!productSearchQuery.trim()) return true;
    const q = productSearchQuery.toLowerCase();
    const sku = formatText(p.sku).toLowerCase();
    const nombre = formatText(p.nombre || p.descripcion).toLowerCase();
    return nombre.includes(q) || sku.includes(q);
  });

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

  const selectedProduct = productKardexData?.producto;
  const kpis = productKardexData?.kpis;
  const movimientos = productKardexData?.movimientos || [];

  return (
    <div className="page-container">
      {/* Encabezado General */}
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Kardex Valorizado</h2>
          <p>
            Sistema contable de control permanente de inventarios.
          </p>
        </div>

        {/* Selector de Almacén Global */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>🏢 Almacén:</span>
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
            <option value="">-- Todos los Almacenes (Consolidado) --</option>
            {almacenes.map((a) => {
              const almNombre = formatText(a.nombre, 'Almacén');
              const almCodigo = a.codigo ? ` (${formatText(a.codigo)})` : '';
              return (
                <option key={a.id} value={a.id}>
                  {almNombre}{almCodigo}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '2px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('producto')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '700',
            border: 'none',
            borderBottom: activeTab === 'producto' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'producto' ? '#2563eb' : '#64748b',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Package size={18} /> Kardex Detallado por Producto
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('general');
            loadValorizadoGeneral(selectedAlmacenId);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '700',
            border: 'none',
            borderBottom: activeTab === 'general' ? '3px solid #059669' : '3px solid transparent',
            color: activeTab === 'general' ? '#059669' : '#64748b',
            background: 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Layers size={18} /> Resumen General de Valorización
        </button>
      </div>

      {/* ============================================================== */}
      {/* VISTA 1: KARDEX DETALLADO POR PRODUCTO (PROMEDIO PONDERADO) */}
      {/* ============================================================== */}
      {activeTab === 'producto' && (
        <>
          {/* Barra de Filtro y Búsqueda de Producto */}
          <div className="table-card" style={{ padding: '16px 20px', background: '#f8fafc' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', flex: 1 }}>
                {/* Búsqueda rápida por texto */}
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <Search
                    size={16}
                    color="#94a3b8"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    placeholder="Filtrar por SKU o nombre..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    style={{
                      padding: '8px 12px 8px 32px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      width: '100%',
                      background: '#ffffff',
                    }}
                  />
                </div>

                {/* Selector Desplegable de Producto */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '320px' }}>
                  <span style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b', whiteSpace: 'nowrap' }}>
                    📦 Seleccionar Producto:
                  </span>
                  <select
                    value={selectedProductId}
                    onChange={handleProductSelect}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #94a3b8',
                      fontSize: '13.5px',
                      fontWeight: '600',
                      outline: 'none',
                      background: '#ffffff',
                      flex: 1,
                    }}
                  >
                    {filteredProducts.length === 0 ? (
                      <option value="">No se encontraron productos coincidentes</option>
                    ) : (
                      filteredProducts.map((p) => {
                        const skuStr = formatText(p.sku, 'S/SKU');
                        const nameStr = formatText(p.nombre || p.descripcion, 'Producto');
                        const stockVal = Number(p.stock_actual || 0).toFixed(2);
                        const unitStr = typeof p.unidad_medida === 'object'
                          ? formatText(p.unidad_medida?.nombre || p.unidad_medida?.codigo, 'u.')
                          : typeof p.unidadMedida === 'object'
                            ? formatText(p.unidadMedida?.nombre || p.unidadMedida?.codigo, 'u.')
                            : formatText(p.unidad_medida || p.unidadMedida, 'u.');

                        return (
                          <option key={p.id} value={p.id}>
                            {skuStr} - {nameStr} (Stock: {stockVal} {unitStr})
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
              </div>

              {/* Acciones de Exportación (PDF y Excel) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Botón Exportar Kardex a PDF */}
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleExportProductPdf}
                  disabled={exportingProductPdf || !selectedProductId}
                  style={{
                    background: exportingProductPdf
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                    color: '#ffffff',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                    cursor: exportingProductPdf || !selectedProductId ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    fontWeight: '600',
                  }}
                >
                  <FileText size={18} />
                  {exportingProductPdf ? 'Generando PDF...' : 'Exportar Kardex a PDF'}
                </button>

                {/* Botón de Exportar Kardex a Excel */}
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleExportProductExcel}
                  disabled={exportingProduct || !selectedProductId}
                  style={{
                    background: exportingProduct
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                    cursor: exportingProduct || !selectedProductId ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Download size={18} />
                  {exportingProduct ? 'Exportando Excel...' : 'Exportar Kardex del Producto a Excel'}
                </button>
              </div>
            </div>
          </div>

          {/* Ficha Resumen del Producto Seleccionado */}
          {selectedProduct && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: '700',
                      background: '#eff6ff',
                      color: '#2563eb',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  >
                    {formatText(selectedProduct.sku)}
                  </span>
                  <span className="badge badge-info">{formatText(selectedProduct.categoria, 'General')}</span>
                  <span className="badge badge-purple">{formatText(selectedProduct.unidad_medida || selectedProduct.unidadMedida, 'UND')}</span>
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#0f172a', fontWeight: '700' }}>
                  {formatText(selectedProduct.nombre)}
                </h3>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', gap: '20px' }}>
                <div>
                  <strong style={{ color: '#059669', fontSize: '14px' }}>Promedio Ponderado</strong>
                </div>
                <div>
                  <strong style={{ color: '#1e293b', fontSize: '14px' }}>
                    {selectedAlmacenId
                      ? formatText(almacenes.find((a) => a.id === Number(selectedAlmacenId))?.nombre, 'Almacén')
                      : 'Todos los Almacenes (Consolidado)'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Tarjetas de KPIs Contables en Tiempo Real */}
          {kpis && (
            <div className="kpi-grid">
              {/* Entradas */}
              <div className="kpi-card" style={{ borderLeft: '4px solid #059669' }}>
                <div className="kpi-info">
                  <span style={{ color: '#065f46', fontWeight: '600' }}>Compras / Entradas Totales</span>
                  <h3 style={{ color: '#059669', margin: '4px 0' }}>
                    S/{' '}
                    {Number(kpis.total_entradas_valor || 0).toLocaleString('es-PE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </h3>
                  <small style={{ color: '#64748b' }}>
                    {Number(kpis.total_entradas_cant || 0).toFixed(2)} {formatText(selectedProduct?.unidad_medida || selectedProduct?.unidadMedida, 'u.')} ingresadas
                  </small>
                </div>
                <div className="kpi-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <ArrowDownLeft size={24} />
                </div>
              </div>

              {/* Salidas */}
              <div className="kpi-card" style={{ borderLeft: '4px solid #ea580c' }}>
                <div className="kpi-info">
                  <span style={{ color: '#9a3412', fontWeight: '600' }}>Consumos / Salidas Totales</span>
                  <h3 style={{ color: '#ea580c', margin: '4px 0' }}>
                    S/{' '}
                    {Number(kpis.total_salidas_valor || 0).toLocaleString('es-PE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </h3>
                  <small style={{ color: '#64748b' }}>
                    {Number(kpis.total_salidas_cant || 0).toFixed(2)} {formatText(selectedProduct?.unidad_medida || selectedProduct?.unidadMedida, 'u.')} despachadas
                  </small>
                </div>
                <div className="kpi-icon-box" style={{ background: '#fff7ed', color: '#ea580c' }}>
                  <ArrowUpRight size={24} />
                </div>
              </div>

              {/* Saldo Cantidad */}
              <div className="kpi-card" style={{ borderLeft: '4px solid #2563eb' }}>
                <div className="kpi-info">
                  <span style={{ color: '#1e40af', fontWeight: '600' }}>Stock Físico Final (Saldo)</span>
                  <h3 style={{ color: '#2563eb', margin: '4px 0' }}>
                    {Number(kpis.saldo_actual_cant || 0).toFixed(2)} {formatText(selectedProduct?.unidad_medida || selectedProduct?.unidadMedida, 'u.')}
                  </h3>
                  <small style={{ color: '#64748b' }}>Unidades existentes en inventario</small>
                </div>
                <div className="kpi-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <PackageCheck size={24} />
                </div>
              </div>

              {/* C.U. Promedio y Saldo Valorizado */}
              <div className="kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
                <div className="kpi-info">
                  <span style={{ color: '#047857', fontWeight: '600' }}>C.U. Prom. & Valor Total</span>
                  <h3 style={{ color: '#047857', margin: '4px 0' }}>
                    S/{' '}
                    {Number(kpis.saldo_actual_valorizado || 0).toLocaleString('es-PE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </h3>
                  <small style={{ color: '#065f46', fontWeight: '700' }}>
                    C.Unitario: S/ {Number(kpis.costo_promedio_vigente || 0).toFixed(4)}
                  </small>
                </div>
                <div className="kpi-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <DollarSign size={24} />
                </div>
              </div>
            </div>
          )}

          {/* Tabla Contable Estricta (Entradas - Salidas - Saldos) */}
          <div className="table-card" style={{ overflowX: 'auto' }}>
            {loadingProductKardex ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <TrendingUp size={36} color="#2563eb" style={{ margin: '0 auto 12px', display: 'block' }} />
                Calculando movimientos de Promedio Ponderado Móvil en tiempo real...
              </div>
            ) : movimientos.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <Package size={36} color="#94a3b8" style={{ margin: '0 auto 12px', display: 'block' }} />
                No se registraron movimientos cronológicos para este producto en el almacén seleccionado.
              </div>
            ) : (
              <table
                className="data-table"
                style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse' }}
              >
                <thead>
                  {/* Encabezado Nivel 1: Agrupaciones Contables */}
                  <tr>
                    <th
                      colSpan="4"
                      style={{
                        background: '#f1f5f9',
                        color: '#1e293b',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        borderRight: '2px solid #cbd5e1',
                        padding: '8px 12px',
                      }}
                    >
                      OPERACIÓN Y DOCUMENTO DE SUSTENTO
                    </th>
                    <th
                      colSpan="3"
                      style={{
                        background: '#dcfce7',
                        color: '#166534',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        borderRight: '2px solid #86efac',
                        padding: '8px 12px',
                      }}
                    >
                      ENTRADAS / COMPRAS
                    </th>
                    <th
                      colSpan="3"
                      style={{
                        background: '#ffedd5',
                        color: '#9a3412',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        borderRight: '2px solid #fdba74',
                        padding: '8px 12px',
                      }}
                    >
                      SALIDAS / CONSUMOS
                    </th>
                    <th
                      colSpan="3"
                      style={{
                        background: '#dbeafe',
                        color: '#1e40af',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        padding: '8px 12px',
                      }}
                    >
                      SALDOS FINALES (INVENTARIO VALORIZADO)
                    </th>
                  </tr>

                  {/* Encabezado Nivel 2: Columnas Específicas */}
                  <tr>
                    <th style={{ background: '#f8fafc', width: '130px' }}>Fecha y Hora</th>
                    <th style={{ background: '#f8fafc', width: '90px' }}>Tipo</th>
                    <th style={{ background: '#f8fafc', width: '110px' }}>N° Doc</th>
                    <th style={{ background: '#f8fafc', borderRight: '2px solid #cbd5e1' }}>Detalle / Tercero</th>

                    {/* Entradas */}
                    <th style={{ background: '#f0fdf4', color: '#166534', textAlign: 'right' }}>Cant.</th>
                    <th style={{ background: '#f0fdf4', color: '#166534', textAlign: 'right' }}>C.U. (S/)</th>
                    <th
                      style={{
                        background: '#f0fdf4',
                        color: '#166534',
                        textAlign: 'right',
                        borderRight: '2px solid #86efac',
                      }}
                    >
                      Total Entrada
                    </th>

                    {/* Salidas */}
                    <th style={{ background: '#fff7ed', color: '#9a3412', textAlign: 'right' }}>Cant.</th>
                    <th style={{ background: '#fff7ed', color: '#9a3412', textAlign: 'right' }}>C.U. Prom.</th>
                    <th
                      style={{
                        background: '#fff7ed',
                        color: '#9a3412',
                        textAlign: 'right',
                        borderRight: '2px solid #fdba74',
                      }}
                    >
                      Total Salida
                    </th>

                    {/* Saldos */}
                    <th style={{ background: '#eff6ff', color: '#1e40af', textAlign: 'right' }}>Cant. Saldo</th>
                    <th style={{ background: '#eff6ff', color: '#1e40af', textAlign: 'right' }}>C.U. Prom. (S/)</th>
                    <th style={{ background: '#eff6ff', color: '#1e40af', textAlign: 'right', fontWeight: '700' }}>
                      Total Valorizado
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {movimientos.map((m, idx) => {
                    const isEntrada = m.tipo === 'ENTRADA';
                    const fechaStr = formatText(m.fecha);
                    const docStr = formatText(m.documento, 'S/D');
                    const detalleStr = formatText(m.detalle || m.movimiento, '-');

                    return (
                      <tr key={m.id || idx}>
                        <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>{fechaStr}</td>
                        <td>
                          <span className={`badge ${isEntrada ? 'badge-success' : 'badge-danger'}`}>
                            {isEntrada ? 'ENTRADA' : 'SALIDA'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontFamily: 'monospace', color: isEntrada ? '#166534' : '#9a3412' }}>
                            {docStr}
                          </strong>
                        </td>
                        <td
                          style={{
                            fontSize: '12.5px',
                            color: '#334155',
                            borderRight: '2px solid #cbd5e1',
                            maxWidth: '220px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={detalleStr}
                        >
                          {detalleStr}
                        </td>

                        {/* Entradas */}
                        <td
                          style={{
                            textAlign: 'right',
                            background: isEntrada ? '#f0fdf4' : 'transparent',
                            color: isEntrada ? '#15803d' : '#94a3b8',
                            fontWeight: isEntrada ? '700' : 'normal',
                          }}
                        >
                          {isEntrada ? Number(m.entrada_cantidad || 0).toFixed(2) : '-'}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            background: isEntrada ? '#f0fdf4' : 'transparent',
                            color: isEntrada ? '#15803d' : '#94a3b8',
                          }}
                        >
                          {isEntrada ? `S/ ${Number(m.entrada_costo_unitario || 0).toFixed(4)}` : '-'}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            background: isEntrada ? '#f0fdf4' : 'transparent',
                            color: isEntrada ? '#15803d' : '#94a3b8',
                            fontWeight: isEntrada ? '700' : 'normal',
                            borderRight: '2px solid #86efac',
                          }}
                        >
                          {isEntrada
                            ? `S/ ${Number(m.entrada_total || 0).toLocaleString('es-PE', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                            : '-'}
                        </td>

                        {/* Salidas */}
                        <td
                          style={{
                            textAlign: 'right',
                            background: !isEntrada ? '#fff7ed' : 'transparent',
                            color: !isEntrada ? '#c2410c' : '#94a3b8',
                            fontWeight: !isEntrada ? '700' : 'normal',
                          }}
                        >
                          {!isEntrada ? Number(m.salida_cantidad || 0).toFixed(2) : '-'}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            background: !isEntrada ? '#fff7ed' : 'transparent',
                            color: !isEntrada ? '#c2410c' : '#94a3b8',
                          }}
                        >
                          {!isEntrada ? `S/ ${Number(m.salida_costo_unitario || 0).toFixed(4)}` : '-'}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            background: !isEntrada ? '#fff7ed' : 'transparent',
                            color: !isEntrada ? '#c2410c' : '#94a3b8',
                            fontWeight: !isEntrada ? '700' : 'normal',
                            borderRight: '2px solid #fdba74',
                          }}
                        >
                          {!isEntrada
                            ? `S/ ${Number(m.salida_total || 0).toLocaleString('es-PE', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                            : '-'}
                        </td>

                        {/* Saldos */}
                        <td
                          style={{
                            textAlign: 'right',
                            background: '#f8fafc',
                            fontWeight: '700',
                            color: '#1e40af',
                          }}
                        >
                          {Number(m.saldo_cantidad || 0).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right', background: '#f8fafc', color: '#1e40af' }}>
                          S/ {Number(m.saldo_costo_promedio || 0).toFixed(4)}
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            background: '#eff6ff',
                            fontWeight: '700',
                            color: '#059669',
                            fontSize: '13.5px',
                          }}
                        >
                          S/{' '}
                          {Number(m.saldo_total_valorizado || 0).toLocaleString('es-PE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Fila de Totales Generales */}
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan="4" style={{ fontWeight: '700', textAlign: 'right', borderRight: '2px solid #cbd5e1' }}>
                      TOTALES ACUMULADOS:
                    </td>
                    {/* Entradas */}
                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#15803d' }}>
                      {Number(kpis.total_entradas_cant || 0).toFixed(2)}
                    </td>
                    <td></td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: '700',
                        color: '#15803d',
                        borderRight: '2px solid #86efac',
                      }}
                    >
                      S/{' '}
                      {Number(kpis.total_entradas_valor || 0).toLocaleString('es-PE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    {/* Salidas */}
                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#c2410c' }}>
                      {Number(kpis.total_salidas_cant || 0).toFixed(2)}
                    </td>
                    <td></td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: '700',
                        color: '#c2410c',
                        borderRight: '2px solid #fdba74',
                      }}
                    >
                      S/{' '}
                      {Number(kpis.total_salidas_valor || 0).toLocaleString('es-PE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    {/* Saldos */}
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#1e40af' }}>
                      {Number(kpis.saldo_actual_cant || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#1e40af' }}>
                      S/ {Number(kpis.costo_promedio_vigente || 0).toFixed(4)}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: '800',
                        color: '#059669',
                        fontSize: '14px',
                        background: '#dcfce7',
                      }}
                    >
                      S/{' '}
                      {Number(kpis.saldo_actual_valorizado || 0).toLocaleString('es-PE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* VISTA 2: RESUMEN GENERAL DE VALORIZACIÓN (CONSOLIDADO) */}
      {/* ============================================================== */}
      {activeTab === 'general' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button
              className="primary-btn"
              onClick={handleExportGeneralExcel}
              disabled={exportingGeneral}
              style={{
                background: exportingGeneral
                  ? '#94a3b8'
                  : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                cursor: exportingGeneral ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Download size={18} /> {exportingGeneral ? 'Generando descarga...' : 'Exportar Resumen General a Excel'}
            </button>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-info">
                <span>Valor Total en Moneda Nacional (PEN)</span>
                <h3 style={{ color: '#059669' }}>
                  S/{' '}
                  {valorTotalGeneral.toLocaleString('es-PE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </h3>
              </div>
              <div className="kpi-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
                <DollarSign size={24} />
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-info">
                <span>Total de Unidades Físicas Registradas</span>
                <h3 style={{ color: '#2563eb' }}>{totalItemsFisicos.toLocaleString('es-PE')} u.</h3>
              </div>
              <div className="kpi-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <PackageCheck size={24} />
              </div>
            </div>
          </div>

          <div className="table-card">
            {loadingGeneral ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Cargando valorización de inventario contable...
              </div>
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
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {valorizadoGeneralData.map((v) => {
                    const skuStr = formatText(v.sku);
                    const prodNombreStr = formatText(v.producto || v.nombre);
                    const catStr = formatText(v.categoria, 'General');
                    const unitMedidaStr = formatText(v.unidad_medida || v.unidadMedida, 'u.');
                    const metodoStr = formatText(v.metodo, 'Promedio Ponderado');

                    return (
                      <tr key={v.id}>
                        <td>
                          <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{skuStr}</strong>
                        </td>
                        <td style={{ fontWeight: '600' }}>{prodNombreStr}</td>
                        <td>
                          <span className="badge badge-info">{catStr}</span>
                        </td>
                        <td>S/ {Number(v.costo_unitario || 0).toFixed(2)}</td>
                        <td>
                          <strong>
                            {Number(v.stock_fisico || 0).toFixed(2)} {unitMedidaStr}
                          </strong>
                        </td>
                        <td>
                          <strong style={{ color: '#059669', fontSize: '15px' }}>
                            S/{' '}
                            {Number(v.valor_total || 0).toLocaleString('es-PE', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </strong>
                        </td>
                        <td>
                          <span className="badge badge-purple">{metodoStr}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => {
                              setActiveTab('producto');
                              setSelectedProductId(v.id);
                              fetchKardexForProduct(v.id, selectedAlmacenId);
                            }}
                          >
                            Ver Detallado
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
