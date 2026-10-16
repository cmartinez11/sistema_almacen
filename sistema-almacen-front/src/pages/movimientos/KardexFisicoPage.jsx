import React, { useState, useEffect } from 'react';
import {
  Package,
  Layers,
  Search,
  Download,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  PackageCheck,
  AlertTriangle,
  Building2,
  Boxes,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';
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

export default function KardexFisicoPage() {
  // Pestaña activa: 'producto' (Kardex Detallado por Producto) | 'general' (Resumen General de Existencias)
  const [activeTab, setActiveTab] = useState('producto');

  // Datos comunes y filtros
  const [almacenes, setAlmacenes] = useState([]);
  const [selectedAlmacenId, setSelectedAlmacenId] = useState('');

  // Estados - Pestaña 1: Kardex Detallado por Producto
  const [productosList, setProductosList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productKardexData, setProductKardexData] = useState(null);
  const [loadingProductKardex, setLoadingProductKardex] = useState(false);
  const [exportingProductExcel, setExportingProductExcel] = useState(false);
  const [exportingProductPdf, setExportingProductPdf] = useState(false);

  // Estados - Pestaña 2: Resumen General de Existencias
  const [fisicoGeneralData, setFisicoGeneralData] = useState([]);
  const [generalKpis, setGeneralKpis] = useState({
    total_skus: 0,
    total_unidades_fisicas: 0,
    total_entradas_global: 0,
    total_salidas_global: 0,
  });
  const [generalSearchQuery, setGeneralSearchQuery] = useState('');
  const [loadingGeneral, setLoadingGeneral] = useState(false);
  const [exportingGeneralExcel, setExportingGeneralExcel] = useState(false);
  const [exportingGeneralPdf, setExportingGeneralPdf] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

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
      console.warn('Error al cargar datos iniciales de Kardex Físico:', err);
    }

    loadFisicoGeneral('');
  };

  // Cargar Kardex Detallado para un Producto específico (Solo Físico)
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
      console.error('Error al cargar kardex físico del producto:', err);
      setProductKardexData(null);
    } finally {
      setLoadingProductKardex(false);
    }
  };

  // Cargar Resumen General Físico de todo el inventario
  const loadFisicoGeneral = async (almId = selectedAlmacenId) => {
    try {
      setLoadingGeneral(true);
      let url = '/kardex/fisico/resumen';
      if (almId) {
        url += `?almacen_id=${almId}`;
      }
      const res = await api.get(url);
      if (res.data?.status === 'success') {
        const d = res.data.data;
        setFisicoGeneralData(d.productos || []);
        setGeneralKpis({
          total_skus: Number(d.total_skus || 0),
          total_unidades_fisicas: Number(d.total_unidades_fisicas || 0),
          total_entradas_global: Number(d.total_entradas_global || 0),
          total_salidas_global: Number(d.total_salidas_global || 0),
        });
      }
    } catch (err) {
      console.error('Error al cargar Resumen General Físico:', err);
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
      loadFisicoGeneral(almId);
    }
  };

  // Descargar Kardex Detallado del Producto a Excel (CSV con UTF-8 BOM)
  const handleExportProductExcel = async () => {
    if (!selectedProductId) return;
    try {
      setExportingProductExcel(true);
      let url = `/reportes/kardex-fisico-producto/exportar?producto_id=${selectedProductId}`;
      if (selectedAlmacenId) {
        url += `&almacen_id=${selectedAlmacenId}`;
      }

      const response = await api.get(url, { responseType: 'blob' });
      let filename = `kardex_fisico_producto_${selectedProductId}.csv`;
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
      console.error('Error al exportar Kardex Físico a Excel:', err);
      alert('Error al descargar el archivo Excel. Intente nuevamente.');
    } finally {
      setExportingProductExcel(false);
    }
  };

  // Descargar Kardex Detallado del Producto a PDF (Landscape)
  const handleExportProductPdf = async () => {
    if (!selectedProductId) return;
    try {
      setExportingProductPdf(true);
      let url = `/reportes/kardex-fisico-producto/pdf?producto_id=${selectedProductId}`;
      if (selectedAlmacenId) {
        url += `&almacen_id=${selectedAlmacenId}`;
      }

      const response = await api.get(url, { responseType: 'blob' });
      let filename = `kardex_fisico_producto_${selectedProductId}.pdf`;
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
      console.error('Error al exportar Kardex Físico a PDF:', err);
      alert('Error al generar el PDF del Kardex Físico. Intente nuevamente.');
    } finally {
      setExportingProductPdf(false);
    }
  };

  // Descargar Resumen General Físico a Excel
  const handleExportGeneralExcel = async () => {
    try {
      setExportingGeneralExcel(true);
      let url = '/reportes/kardex-fisico-general/exportar';
      if (selectedAlmacenId) {
        url += `?almacen_id=${selectedAlmacenId}`;
      }

      const response = await api.get(url, { responseType: 'blob' });
      let filename = 'resumen_existencias_fisicas.csv';
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
      console.error('Error al exportar Resumen General a Excel:', err);
      alert('Error al descargar el resumen en Excel.');
    } finally {
      setExportingGeneralExcel(false);
    }
  };

  // Descargar Resumen General Físico a PDF
  const handleExportGeneralPdf = async () => {
    try {
      setExportingGeneralPdf(true);
      let url = '/reportes/kardex-fisico-general/pdf';
      if (selectedAlmacenId) {
        url += `?almacen_id=${selectedAlmacenId}`;
      }

      const response = await api.get(url, { responseType: 'blob' });
      let filename = 'resumen_existencias_fisicas.pdf';
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
      console.error('Error al exportar Resumen General a PDF:', err);
      alert('Error al generar el PDF del Resumen General.');
    } finally {
      setExportingGeneralPdf(false);
    }
  };

  // Filtrado de productos para el selector de la Pestaña 1
  const filteredProducts = productosList.filter((p) => {
    if (!productSearchQuery.trim()) return true;
    const q = productSearchQuery.toLowerCase();
    const sku = formatText(p.sku).toLowerCase();
    const nombre = formatText(p.nombre || p.descripcion).toLowerCase();
    return nombre.includes(q) || sku.includes(q);
  });

  // Filtrado de productos para la tabla de la Pestaña 2
  const filteredGeneralProducts = fisicoGeneralData.filter((p) => {
    if (!generalSearchQuery.trim()) return true;
    const q = generalSearchQuery.toLowerCase();
    const sku = formatText(p.sku).toLowerCase();
    const nombre = formatText(p.producto).toLowerCase();
    const cat = formatText(p.categoria).toLowerCase();
    return nombre.includes(q) || sku.includes(q) || cat.includes(q);
  });

  const selectedProduct = productKardexData?.producto;
  const kpis = productKardexData?.kpis;
  const movimientos = productKardexData?.movimientos || [];

  // Conteo de operaciones de entrada y salida registradas
  const countEntradas = movimientos.filter((m) => (m.tipo || '').toUpperCase() === 'ENTRADA').length;
  const countSalidas = movimientos.filter((m) => (m.tipo || '').toUpperCase() === 'SALIDA').length;

  // Evaluación de estado de stock para la Pestaña 1
  const saldoActualNum = Number(kpis?.saldo_actual_cant || selectedProduct?.stock_actual || 0);
  const stockMinimoNum = Number(selectedProduct?.stock_minimo || 0);

  let estadoStockText = 'NORMAL';
  let estadoStockColor = '#16a34a';
  let estadoStockBorder = '#86efac';
  let estadoStockBg = '#f0fdf4';

  if (saldoActualNum <= 0) {
    estadoStockText = 'AGOTADO (CRÍTICO)';
    estadoStockColor = '#dc2626';
    estadoStockBorder = '#fca5a5';
    estadoStockBg = '#fef2f2';
  } else if (stockMinimoNum > 0 && saldoActualNum <= stockMinimoNum) {
    estadoStockText = 'STOCK BAJO';
    estadoStockColor = '#d97706';
    estadoStockBorder = '#fcd34d';
    estadoStockBg = '#fffbeb';
  }

  return (
    <div className="page-container">
      {/* ============================================================== */}
      {/* CABECERA SUPERIOR */}
      {/* ============================================================== */}
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Kardex Físico (Control Operativo de Inventario)</h2>
          <p>
            Sistema de trazabilidad física permanente de entradas, salidas y saldos de existencias en unidades (Control Operativo).
          </p>
        </div>

        {/* Selector Global de Almacén */}
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
              cursor: 'pointer',
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

      {/* ============================================================== */}
      {/* PESTAÑAS DE NAVEGACIÓN */}
      {/* ============================================================== */}
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
            loadFisicoGeneral(selectedAlmacenId);
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
          <Layers size={18} /> Resumen General de Existencias (Stock Físico)
        </button>
      </div>

      {/* ============================================================== */}
      {/* PESTAÑA 1: KARDEX DETALLADO POR PRODUCTO (SOLO FÍSICO) */}
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

              {/* Botones de Exportación (PDF y Excel) */}
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

                {/* Botón Exportar Kardex a Excel */}
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleExportProductExcel}
                  disabled={exportingProductExcel || !selectedProductId}
                  style={{
                    background: exportingProductExcel
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                    cursor: exportingProductExcel || !selectedProductId ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Download size={18} />
                  {exportingProductExcel ? 'Exportando Excel...' : 'Exportar Kardex a Excel'}
                </button>
              </div>
            </div>
          </div>

          {/* Banner Resumen del Producto Seleccionado */}
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
                  <strong style={{ color: '#059669', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={16} /> Control Físico en Unidades
                  </strong>
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

          {/* 4 Tarjetas de KPIs Físicas (CERO Montos Monetarios) */}
          {kpis && (
            <div className="kpi-grid">
              {/* Entradas */}
              <div className="kpi-card" style={{ borderLeft: '4px solid #059669' }}>
                <div className="kpi-info">
                  <span style={{ color: '#065f46', fontWeight: '600' }}>ENTRADAS TOTALES (INGRESOS)</span>
                  <h3 style={{ color: '#059669', margin: '4px 0' }}>
                    +{Number(kpis.total_entradas_cant || 0).toFixed(2)}{' '}
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#047857' }}>
                      {formatText(selectedProduct?.unidad_medida || selectedProduct?.unidadMedida, 'u.')}
                    </span>
                  </h3>
                  <small style={{ color: '#64748b' }}>
                    {countEntradas} operaciones de ingreso registradas
                  </small>
                </div>
                <div className="kpi-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <ArrowDownLeft size={24} />
                </div>
              </div>

              {/* Salidas */}
              <div className="kpi-card" style={{ borderLeft: '4px solid #ea580c' }}>
                <div className="kpi-info">
                  <span style={{ color: '#9a3412', fontWeight: '600' }}>SALIDAS TOTALES (DESPACHOS)</span>
                  <h3 style={{ color: '#ea580c', margin: '4px 0' }}>
                    -{Number(kpis.total_salidas_cant || 0).toFixed(2)}{' '}
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#c2410c' }}>
                      {formatText(selectedProduct?.unidad_medida || selectedProduct?.unidadMedida, 'u.')}
                    </span>
                  </h3>
                  <small style={{ color: '#64748b' }}>
                    {countSalidas} operaciones de despacho registradas
                  </small>
                </div>
                <div className="kpi-icon-box" style={{ background: '#fff7ed', color: '#ea580c' }}>
                  <ArrowUpRight size={24} />
                </div>
              </div>

              {/* Saldo Cantidad Actual */}
              <div className="kpi-card" style={{ borderLeft: '4px solid #2563eb' }}>
                <div className="kpi-info">
                  <span style={{ color: '#1e40af', fontWeight: '600' }}>STOCK FÍSICO FINAL (SALDO ACTUAL)</span>
                  <h3 style={{ color: '#2563eb', margin: '4px 0' }}>
                    {Number(kpis.saldo_actual_cant || 0).toFixed(2)}{' '}
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1d4ed8' }}>
                      {formatText(selectedProduct?.unidad_medida || selectedProduct?.unidadMedida, 'u.')}
                    </span>
                  </h3>
                  <small style={{ color: '#64748b' }}>Unidades existentes en inventario</small>
                </div>
                <div className="kpi-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <PackageCheck size={24} />
                </div>
              </div>

              {/* Estado de Abastecimiento vs Stock Mínimo */}
              <div className="kpi-card" style={{ borderLeft: `4px solid ${estadoStockColor}` }}>
                <div className="kpi-info">
                  <span style={{ color: '#475569', fontWeight: '600' }}>ESTADO DE ABASTECIMIENTO</span>
                  <h3 style={{ color: estadoStockColor, margin: '4px 0', fontSize: '20px' }}>
                    {estadoStockText}
                  </h3>
                  <small style={{ color: '#64748b' }}>
                    Stock Mínimo: <strong>{stockMinimoNum.toFixed(2)}</strong> {formatText(selectedProduct?.unidad_medida || selectedProduct?.unidadMedida, 'u.')}
                  </small>
                </div>
                <div className="kpi-icon-box" style={{ background: estadoStockBg, color: estadoStockColor }}>
                  {saldoActualNum <= 0 ? (
                    <XCircle size={24} />
                  ) : saldoActualNum <= stockMinimoNum ? (
                    <AlertTriangle size={24} />
                  ) : (
                    <CheckCircle2 size={24} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Movimientos Físicos (Bloques de Colores) */}
          <div className="table-card" style={{ overflowX: 'auto' }}>
            {loadingProductKardex ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <Package size={36} color="#2563eb" style={{ margin: '0 auto 12px', display: 'block' }} />
                Cargando movimientos físicos en tiempo real...
              </div>
            ) : movimientos.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <Boxes size={36} color="#94a3b8" style={{ margin: '0 auto 12px', display: 'block' }} />
                No se registraron movimientos cronológicos para este producto en el almacén seleccionado.
              </div>
            ) : (
              <table
                className="data-table"
                style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse' }}
              >
                <thead>
                  {/* Encabezado Nivel 1: Bloques Agrupados */}
                  <tr>
                    <th
                      colSpan="5"
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
                      colSpan="2"
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
                      ENTRADAS FÍSICAS (+)
                    </th>
                    <th
                      colSpan="2"
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
                      SALIDAS FÍSICAS (-)
                    </th>
                    <th
                      colSpan="2"
                      style={{
                        background: '#dbeafe',
                        color: '#1e40af',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        padding: '8px 12px',
                      }}
                    >
                      SALDO FÍSICO ACUMULADO
                    </th>
                  </tr>

                  {/* Encabezado Nivel 2: Columnas Específicas */}
                  <tr>
                    <th style={{ background: '#f8fafc', width: '140px' }}>Fecha y Hora</th>
                    <th style={{ background: '#f8fafc', width: '90px' }}>Tipo</th>
                    <th style={{ background: '#f8fafc', width: '110px' }}>N° Doc</th>
                    <th style={{ background: '#f8fafc', width: '130px' }}>Sede / Almacén</th>
                    <th style={{ background: '#f8fafc', borderRight: '2px solid #cbd5e1' }}>Detalle / Tercero (Proveedor o Personal)</th>

                    {/* Entradas */}
                    <th style={{ background: '#f0fdf4', color: '#166534', textAlign: 'right', width: '110px' }}>Cant. Entrada</th>
                    <th
                      style={{
                        background: '#f0fdf4',
                        color: '#166534',
                        textAlign: 'center',
                        width: '60px',
                        borderRight: '2px solid #86efac',
                      }}
                    >
                      U.M.
                    </th>

                    {/* Salidas */}
                    <th style={{ background: '#fff7ed', color: '#9a3412', textAlign: 'right', width: '110px' }}>Cant. Salida</th>
                    <th
                      style={{
                        background: '#fff7ed',
                        color: '#9a3412',
                        textAlign: 'center',
                        width: '60px',
                        borderRight: '2px solid #fdba74',
                      }}
                    >
                      U.M.
                    </th>

                    {/* Saldos */}
                    <th style={{ background: '#eff6ff', color: '#1e40af', textAlign: 'right', width: '120px' }}>Cant. Saldo</th>
                    <th style={{ background: '#eff6ff', color: '#1e40af', textAlign: 'center', width: '60px', fontWeight: '700' }}>
                      U.M.
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {movimientos.map((m, idx) => {
                    const isEntrada = (m.tipo || '').toUpperCase() === 'ENTRADA';
                    const fechaStr = formatText(m.fecha);
                    const docStr = formatText(m.documento || m.doc, 'S/D');
                    const detalleStr = formatText(m.detalle || m.movimiento, '-');
                    const almacenStr = formatText(m.almacen, 'Almacén Principal');
                    const unidadStr = formatText(selectedProduct?.unidad_medida || selectedProduct?.unidadMedida, 'u.');

                    const cantIn = Number(m.entrada_cantidad || m.entrada || 0);
                    const cantOut = Number(m.salida_cantidad || m.salida || 0);
                    const cantSaldo = Number(m.saldo_cantidad || m.saldo_fisico || m.saldo || 0);

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
                        <td style={{ fontSize: '12px', color: '#475569' }}>{almacenStr}</td>
                        <td
                          style={{
                            fontSize: '12.5px',
                            color: '#334155',
                            borderRight: '2px solid #cbd5e1',
                            maxWidth: '260px',
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
                          {isEntrada && cantIn > 0 ? `+${cantIn.toFixed(2)}` : '-'}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            background: isEntrada ? '#f0fdf4' : 'transparent',
                            color: '#64748b',
                            fontSize: '11px',
                            borderRight: '2px solid #86efac',
                          }}
                        >
                          {isEntrada && cantIn > 0 ? unidadStr : '-'}
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
                          {!isEntrada && cantOut > 0 ? `-${cantOut.toFixed(2)}` : '-'}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            background: !isEntrada ? '#fff7ed' : 'transparent',
                            color: '#64748b',
                            fontSize: '11px',
                            borderRight: '2px solid #fdba74',
                          }}
                        >
                          {!isEntrada && cantOut > 0 ? unidadStr : '-'}
                        </td>

                        {/* Saldos */}
                        <td
                          style={{
                            textAlign: 'right',
                            background: '#eff6ff',
                            fontWeight: '700',
                            color: '#1e40af',
                            fontSize: '14px',
                          }}
                        >
                          {cantSaldo.toFixed(2)}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            background: '#eff6ff',
                            color: '#1e40af',
                            fontWeight: '600',
                            fontSize: '11px',
                          }}
                        >
                          {unidadStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Fila de Totales Acumulados */}
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                    <td colSpan="5" style={{ fontWeight: '700', textAlign: 'right', borderRight: '2px solid #cbd5e1' }}>
                      TOTALES ACUMULADOS:
                    </td>

                    {/* Entradas */}
                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#15803d', fontSize: '13.5px' }}>
                      +{Number(kpis.total_entradas_cant || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center', color: '#15803d', fontWeight: '600', borderRight: '2px solid #86efac' }}>
                      {formatText(selectedProduct?.unidad_medida || selectedProduct?.unidadMedida, 'u.')}
                    </td>

                    {/* Salidas */}
                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#c2410c', fontSize: '13.5px' }}>
                      -{Number(kpis.total_salidas_cant || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center', color: '#c2410c', fontWeight: '600', borderRight: '2px solid #fdba74' }}>
                      {formatText(selectedProduct?.unidad_medida || selectedProduct?.unidadMedida, 'u.')}
                    </td>

                    {/* Saldo Final */}
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: '800',
                        color: '#1e40af',
                        fontSize: '15px',
                        background: '#dbeafe',
                      }}
                    >
                      {Number(kpis.saldo_actual_cant || 0).toFixed(2)}
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        fontWeight: '700',
                        color: '#1e40af',
                        background: '#dbeafe',
                      }}
                    >
                      {formatText(selectedProduct?.unidad_medida || selectedProduct?.unidadMedida, 'u.')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 2: RESUMEN GENERAL DE EXISTENCIAS (STOCK FÍSICO) */}
      {/* ============================================================== */}
      {activeTab === 'general' && (
        <>
          {/* Botones de Exportación General (PDF y Excel) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '10px',
            }}
          >
            {/* Buscador de la tabla general */}
            <div style={{ position: 'relative', minWidth: '280px' }}>
              <Search
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Buscar por SKU, nombre o categoría..."
                value={generalSearchQuery}
                onChange={(e) => setGeneralSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px 8px 32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  minWidth: '280px',
                  background: '#ffffff',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {/* Botón Rojo: Exportar Resumen Físico a PDF */}
              <button
                type="button"
                className="secondary-btn"
                onClick={handleExportGeneralPdf}
                disabled={exportingGeneralPdf}
                style={{
                  background: exportingGeneralPdf
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                  cursor: exportingGeneralPdf ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '600',
                }}
              >
                <FileText size={18} />
                {exportingGeneralPdf ? 'Generando PDF...' : 'Exportar Resumen a PDF'}
              </button>

              {/* Botón Verde: Exportar Resumen Físico a Excel */}
              <button
                type="button"
                className="primary-btn"
                onClick={handleExportGeneralExcel}
                disabled={exportingGeneralExcel}
                style={{
                  background: exportingGeneralExcel
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                  cursor: exportingGeneralExcel ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Download size={18} />
                {exportingGeneralExcel ? 'Generando Excel...' : 'Exportar Resumen a Excel'}
              </button>
            </div>
          </div>

          {/* 4 Tarjetas KPI Globales de Existencias */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-info">
                <span>Total Productos en Catálogo</span>
                <h3 style={{ color: '#0f172a' }}>{generalKpis.total_skus}</h3>
                <small style={{ color: '#64748b' }}>Artículos / SKUs registrados</small>
              </div>
              <div className="kpi-icon-box" style={{ background: '#f1f5f9', color: '#475569' }}>
                <Boxes size={24} />
              </div>
            </div>

            <div className="kpi-card" style={{ borderLeft: '4px solid #2563eb' }}>
              <div className="kpi-info">
                <span style={{ color: '#1e40af', fontWeight: '600' }}>Total Unidades en Almacén</span>
                <h3 style={{ color: '#2563eb' }}>
                  {generalKpis.total_unidades_fisicas.toLocaleString('es-PE')} u.
                </h3>
                <small style={{ color: '#64748b' }}>Stock físico consolidado en existencia</small>
              </div>
              <div className="kpi-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <PackageCheck size={24} />
              </div>
            </div>

            <div className="kpi-card" style={{ borderLeft: '4px solid #059669' }}>
              <div className="kpi-info">
                <span style={{ color: '#065f46', fontWeight: '600' }}>Total Entradas Acumuladas</span>
                <h3 style={{ color: '#059669' }}>
                  +{generalKpis.total_entradas_global.toLocaleString('es-PE')} u.
                </h3>
                <small style={{ color: '#64748b' }}>Total de ingresos históricos registrados</small>
              </div>
              <div className="kpi-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
                <ArrowDownLeft size={24} />
              </div>
            </div>

            <div className="kpi-card" style={{ borderLeft: '4px solid #ea580c' }}>
              <div className="kpi-info">
                <span style={{ color: '#9a3412', fontWeight: '600' }}>Total Salidas Acumuladas</span>
                <h3 style={{ color: '#ea580c' }}>
                  -{generalKpis.total_salidas_global.toLocaleString('es-PE')} u.
                </h3>
                <small style={{ color: '#64748b' }}>Total de despachos históricos a áreas</small>
              </div>
              <div className="kpi-icon-box" style={{ background: '#fff7ed', color: '#ea580c' }}>
                <ArrowUpRight size={24} />
              </div>
            </div>
          </div>

          {/* Tabla de Resumen Consolidado de Existencias Físicas */}
          <div className="table-card">
            {loadingGeneral ? (
              <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
                Cargando balance de existencias físicas en unidades...
              </div>
            ) : filteredGeneralProducts.length === 0 ? (
              <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
                No se encontraron productos coincidentes en el inventario.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Descripción de Producto</th>
                    <th>Categoría</th>
                    <th style={{ textAlign: 'center' }}>U. Medida</th>
                    <th style={{ textAlign: 'right', color: '#166534' }}>Total Entradas (+)</th>
                    <th style={{ textAlign: 'right', color: '#9a3412' }}>Total Salidas (-)</th>
                    <th style={{ textAlign: 'right', color: '#1e40af' }}>Stock Físico Actual</th>
                    <th style={{ textAlign: 'right' }}>Stock Mín.</th>
                    <th style={{ textAlign: 'center' }}>Estado Stock</th>
                    <th style={{ textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGeneralProducts.map((p) => {
                    const skuStr = formatText(p.sku);
                    const prodNombreStr = formatText(p.producto || p.nombre);
                    const catStr = formatText(p.categoria, 'General');
                    const unitMedidaStr = formatText(p.unidad_medida || p.unidadMedida, 'u.');
                    const stockNum = Number(p.stock_fisico || p.stock_actual || 0);
                    const stockMinNum = Number(p.stock_minimo || 0);
                    const estado = p.estado_stock || (stockNum <= 0 ? 'Agotado' : stockNum <= stockMinNum ? 'Stock Bajo' : 'Normal');

                    return (
                      <tr key={p.id}>
                        <td>
                          <strong style={{ color: '#2563eb', fontFamily: 'monospace' }}>{skuStr}</strong>
                        </td>
                        <td style={{ fontWeight: '600' }}>{prodNombreStr}</td>
                        <td>
                          <span className="badge badge-info">{catStr}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-purple">{unitMedidaStr}</span>
                        </td>
                        <td style={{ textAlign: 'right', color: '#15803d', fontWeight: '700' }}>
                          {Number(p.total_entradas || 0) > 0 ? `+${Number(p.total_entradas).toFixed(2)}` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', color: '#c2410c', fontWeight: '700' }}>
                          {Number(p.total_salidas || 0) > 0 ? `-${Number(p.total_salidas).toFixed(2)}` : '-'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <strong style={{ color: '#1e40af', fontSize: '14.5px' }}>
                            {stockNum.toFixed(2)}
                          </strong>
                        </td>
                        <td style={{ textAlign: 'right', color: '#64748b' }}>
                          {stockMinNum.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {estado === 'Agotado' || estado === 'Crítico' || stockNum <= 0 ? (
                            <span className="badge badge-danger">AGOTADO</span>
                          ) : estado === 'Stock Bajo' || stockNum <= stockMinNum ? (
                            <span className="badge badge-warning" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' }}>
                              STOCK BAJO
                            </span>
                          ) : (
                            <span className="badge badge-success">NORMAL</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="secondary-btn"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => {
                              setActiveTab('producto');
                              setSelectedProductId(p.id);
                              fetchKardexForProduct(p.id, selectedAlmacenId);
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
