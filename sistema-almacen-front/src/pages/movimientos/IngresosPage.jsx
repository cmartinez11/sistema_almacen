import React, { useState, useEffect } from 'react';
import { Plus, ArrowDownLeft, FileCheck, Eye, X, Check, Trash2, Search, Calculator, ShoppingCart, UserCheck, Calendar, FileText, Package } from 'lucide-react';
import api from '../../services/api';
import '../pagesCommon.css';

export default function IngresosPage() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [ingresos, setIngresos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [personalList, setPersonalList] = useState([]);
  const [productosList, setProductosList] = useState([]);
  const [requerimientosPedidos, setRequerimientosPedidos] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOcId, setSelectedOcId] = useState('');

  // Formulario cabecera
  const [formHeader, setFormHeader] = useState({
    almacen_id: 1,
    proveedor_id: '',
    personal_id: currentUser.id || '',
    tipo_comprobante: 'GUIA DE REMISION',
    numero_comprobante: '',
    observaciones: '',
  });

  // Ítems dinámicos
  const [detalles, setDetalles] = useState([
    { producto_id: '', cantidad: 1, costo_unitario: 0 },
  ]);

  const mockIngresos = [
    { id: 1, correlativo: 'NI-2026-0012', fecha_emision: '2026-10-06', almacen: { nombre: 'Almacén Principal' }, proveedor: { razon_social: 'DISTRIBUIDORA ELECTRICA S.A.C.' }, numero_comprobante: 'GR-001-4821', personal: { nombres: 'Carlos', apellidos: 'Almacenero' }, estado: 'emitido', entradas_detalle: [{}, {}, {}, {}] },
    { id: 2, correlativo: 'NI-2026-0011', fecha_emision: '2026-10-05', almacen: { nombre: 'Planta 3' }, proveedor: { razon_social: 'FERRETERIA INDUSTRIAL SRL' }, numero_comprobante: 'GR-002-1209', personal: { nombres: 'Carlos', apellidos: 'Almacenero' }, estado: 'emitido', entradas_detalle: [{}, {}] },
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [resIng, resProv, resPers, resProd, resReq, resAlm] = await Promise.all([
        api.get('/entradas'),
        api.get('/proveedores'),
        api.get('/personal'),
        api.get('/productos'),
        api.get('/requerimientos?estado=pedido,parcial'),
        api.get('/almacenes'),
      ]);

      const dataIng = resIng.data?.data?.data || resIng.data?.data || resIng.data;
      setIngresos(Array.isArray(dataIng) && dataIng.length > 0 ? dataIng : mockIngresos);

      const dataProv = resProv.data?.data || resProv.data;
      setProveedores(Array.isArray(dataProv) ? dataProv : []);

      const dataPers = resPers.data?.data || resPers.data;
      setPersonalList(Array.isArray(dataPers) ? dataPers : []);

      const dataProd = resProd.data?.data?.data || resProd.data?.data || resProd.data;
      setProductosList(Array.isArray(dataProd) ? dataProd : []);

      const dataAlm = resAlm.data?.data || resAlm.data;
      const listAlm = Array.isArray(dataAlm) && dataAlm.length > 0 ? dataAlm : [
        { id: 1, nombre: 'Almacén Principal', codigo: 'ALM-01' },
        { id: 2, nombre: 'Planta 3', codigo: 'ALM-03' }
      ];
      setAlmacenes(listAlm);

      // Filtrar requerimientos en estado "PEDIDO" o "PARCIAL" (Saldos por entregar)
      const dataReq = resReq.data?.data || resReq.data;
      if (Array.isArray(dataReq)) {
        const soloPedidosYParciales = dataReq.filter((r) => r.estado === 'pedido' || r.estado === 'parcial');
        setRequerimientosPedidos(soloPedidosYParciales.length > 0 ? soloPedidosYParciales : dataReq);
      }
    } catch (err) {
      console.warn('Usando datos de respaldo para Ingresos:', err);
      setIngresos(mockIngresos);
      setAlmacenes([
        { id: 1, nombre: 'Almacén Principal', codigo: 'ALM-01' },
        { id: 2, nombre: 'Planta 3', codigo: 'ALM-03' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setSelectedOcId('');
    setFormHeader({
      almacen_id: almacenes[0]?.id || 1,
      proveedor_id: proveedores[0]?.id || '',
      personal_id: currentUser.id || personalList[0]?.id || 1,
      tipo_comprobante: 'GUIA DE REMISION',
      numero_comprobante: `GR-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
      observaciones: '',
    });
    setDetalles([
      { producto_id: productosList[0]?.id || '', cantidad_solicitada: null, cantidad: 10, costo_unitario: 15.00 },
    ]);
    setShowModal(true);
  };

  // Cargar Orden de Compra Seleccionada (Estado PEDIDO o PARCIAL)
  const handleSelectOc = (ocId) => {
    setSelectedOcId(ocId);
    if (!ocId) return;

    const reqEncontrado = requerimientosPedidos.find((r) => String(r.id) === String(ocId));
    if (reqEncontrado) {
      if (reqEncontrado.proveedor_id) {
        setFormHeader((prev) => ({ ...prev, proveedor_id: reqEncontrado.proveedor_id }));
      }
      const itemsCargados = (reqEncontrado.detalles || reqEncontrado.requerimiento_detalles || []).map((d) => {
        const sol = Number(d.cantidad_solicitada || 1);
        const rec = Number(d.cantidad_recibida || 0);
        const pend = d.cantidad_pendiente !== undefined ? Number(d.cantidad_pendiente) : Math.max(0, sol - rec);
        const defaultCantidadInput = pend > 0 ? pend : sol;

        return {
          producto_id: d.producto_id,
          cantidad_solicitada: sol,
          cantidad_recibida: rec,
          cantidad_pendiente: pend,
          cantidad: defaultCantidadInput,
          costo_unitario: Number(d.costo_unitario || d.producto?.costo_unitario || 0),
        };
      });
      if (itemsCargados.length > 0) {
        setDetalles(itemsCargados);
      }
    }
  };

  const handleAddRow = () => {
    setDetalles([
      ...detalles,
      { producto_id: productosList[0]?.id || '', cantidad_solicitada: null, cantidad: 1, costo_unitario: 0 },
    ]);
  };

  const handleRemoveRow = (index) => {
    if (detalles.length === 1) return;
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...detalles];
    updated[index][field] = value;
    if (field === 'producto_id') {
      const prod = productosList.find((p) => String(p.id) === String(value));
      if (prod) {
        updated[index].costo_unitario = Number(prod.costo_unitario || 0);
      }
    }
    setDetalles(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fechaActualSistema = new Date().toISOString();

      const payload = {
        almacen_id: Number(formHeader.almacen_id || 1),
        requerimiento_id: selectedOcId || null,
        user_id: currentUser.id || null,
        personal_id: currentUser.personal_id || currentUser.id || null,
        proveedor_id: formHeader.proveedor_id,
        tipo_comprobante: formHeader.tipo_comprobante,
        numero_comprobante: formHeader.numero_comprobante,
        fecha_emision: fechaActualSistema,
        observaciones: formHeader.observaciones,
        detalles: detalles.map((d) => ({
          producto_id: d.producto_id,
          cantidad: Number(d.cantidad),
          costo_unitario: Number(d.costo_unitario || 0),
        })),
      };

      await api.post('/entradas', payload);
      setShowModal(false);
      loadInitialData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error al guardar la Nota de Ingreso');
    }
  };

  const handleExportPdf = (ing) => {
    const pdfUrl = `http://127.0.0.1:8000/api/entradas/${ing.id}/pdf`;
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Notas de Ingreso de Almacén (NI)</h2>
          <p>Registro transaccional de recepción de mercadería vinculada a Órdenes de Compra aprobadas.</p>
        </div>
        <button
          className="primary-btn"
          onClick={handleOpenModal}
          style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
        >
          <Plus size={18} /> Nueva Nota de Ingreso
        </button>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando notas de ingreso...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Correlativo</th>
                <th>Fecha Emisión</th>
                <th>Almacén Destino</th>
                <th>Proveedor</th>
                <th>Comprobante / Guía</th>
                <th>N° Ítems</th>
                <th>Recepcionado Por</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ingresos.map((ing) => (
                <tr key={ing.id}>
                  <td>
                    <strong style={{ color: '#16a34a', fontFamily: 'monospace', fontSize: '14px' }}>
                      {ing.correlativo || `NI-2026-00${ing.id}`}
                    </strong>
                  </td>
                  <td>{ing.fecha_emision ? String(ing.fecha_emision).split('T')[0] : '2026-10-06'}</td>
                  <td>
                    <span className="badge badge-purple" style={{ fontWeight: '700' }}>
                      🏢 {ing.almacen?.nombre || (ing.almacen_id === 2 ? 'Planta 3' : 'Almacén Principal')}
                    </span>
                  </td>
                  <td style={{ fontWeight: '600' }}>
                    {ing.proveedor?.razon_social || 'PROVEEDOR GENERAL'}
                  </td>
                  <td><span className="badge badge-info">{ing.numero_comprobante || 'GR-001'}</span></td>
                  <td>{ing.entradas_detalle?.length || ing.detalles?.length || 1} productos</td>
                  <td>{ing.user?.name || (ing.personal ? `${ing.personal.nombres} ${ing.personal.apellidos}` : (currentUser.name || 'Almacenero Logueado'))}</td>
                  <td>
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <FileCheck size={12} /> {ing.estado ? ing.estado.toUpperCase() : 'EMITIDO'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="action-btn"
                      title="Descargar / Ver Reporte PDF Nota de Ingreso"
                      onClick={() => handleExportPdf(ing)}
                      style={{ color: '#16a34a', borderColor: '#86efac', background: '#f0fdf4' }}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL RE-DISEÑADO CON AUTO-LLENADO DE OC EN ESTADO 'PEDIDO' */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '840px' }}>
            <div className="modal-header" style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
              <div>
                <h3 style={{ margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ArrowDownLeft size={20} /> Registrar Nueva Nota de Ingreso (Almacén)
                </h3>
                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>
                  Recepción de productos y actualización de inventario físico
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                
                {/* SELECTOR SUPERIOR DE ORDEN DE COMPRA (ESTADO: PEDIDO) */}
                <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '10px', border: '1px solid #bfdbfe', marginBottom: '16px' }}>
                  <label style={{ fontWeight: '700', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <ShoppingCart size={16} /> Cargar Orden de Compra Pendiente (Estado: PEDIDO)
                  </label>
                  <select
                    value={selectedOcId}
                    onChange={(e) => handleSelectOc(e.target.value)}
                    style={{ fontSize: '13.5px', fontWeight: '600', borderColor: '#93c5fd' }}
                  >
                    <option value="">-- Cargar desde Orden de Compra / Requerimiento en estado PEDIDO --</option>
                    {requerimientosPedidos.map((req) => (
                      <option key={req.id} value={req.id}>
                        {req.correlativo} - Proveedor: {req.proveedor?.razon_social || 'Proveedor Cotizado'} ({req.detalles?.length || 1} ítems)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label style={{ fontWeight: '700', color: '#15803d' }}>
                      🏢 Almacén de Destino (Recepción)
                    </label>
                    <select
                      required
                      value={formHeader.almacen_id}
                      onChange={(e) => setFormHeader({ ...formHeader, almacen_id: e.target.value })}
                      style={{ borderColor: '#16a34a', fontWeight: '700', background: '#f0fdf4' }}
                    >
                      {almacenes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} ({a.codigo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      Proveedor de Origen
                      {selectedOcId && <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700' }}>🔒 Bloqueado por OC</span>}
                    </label>
                    <select
                      required
                      disabled={!!selectedOcId}
                      value={formHeader.proveedor_id}
                      onChange={(e) => setFormHeader({ ...formHeader, proveedor_id: e.target.value })}
                      style={{
                        background: selectedOcId ? '#f1f5f9' : '#ffffff',
                        cursor: selectedOcId ? 'not-allowed' : 'pointer',
                        fontWeight: selectedOcId ? '700' : 'normal',
                        color: selectedOcId ? '#0f172a' : 'inherit',
                      }}
                    >
                      <option value="">-- Seleccionar Proveedor --</option>
                      {proveedores.map((p) => (
                        <option key={p.id} value={p.id}>{p.razon_social} (RUC: {p.ruc})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <UserCheck size={14} color="#16a34a" /> Recepcionado Por (Usuario Logueado)
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      style={{ background: '#f1f5f9', fontWeight: '700', color: '#0f172a' }}
                      value={currentUser.name || (currentUser.nombres ? `${currentUser.nombres} ${currentUser.apellidos}` : 'Almacenero Logueado')}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo de Comprobante / Documento</label>
                    <select
                      value={formHeader.tipo_comprobante}
                      onChange={(e) => setFormHeader({ ...formHeader, tipo_comprobante: e.target.value })}
                      style={{ fontWeight: '600' }}
                    >
                      <option value="GUIA DE REMISION">GUÍA DE REMISIÓN</option>
                      <option value="FACTURA">FACTURA ELECTRONICA</option>
                      <option value="PEDIDO">ORDEN DE PEDIDO / COMPRA</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>N° Guía / Comprobante</label>
                    <input
                      type="text"
                      required
                      placeholder="GR-001-9988"
                      value={formHeader.numero_comprobante}
                      onChange={(e) => setFormHeader({ ...formHeader, numero_comprobante: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} color="#2563eb" /> Fecha de Registro
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      style={{ background: '#f1f5f9', fontSize: '13px', color: '#475569' }}
                      value={new Date().toLocaleString('es-PE')}
                    />
                  </div>
                </div>

                {/* DETALLE DE PRODUCTOS (VISTA EXCLUSIVA ALMACÉN SIN COSTOS MONETARIOS) */}
                <div style={{ marginTop: '20px', borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Package size={18} color="#16a34a" /> DETALLE DE PRODUCTOS A INGRESAR
                      </h4>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {selectedOcId
                          ? '🔒 Ítems prefijados por la Orden de Compra seleccionada. Ingrese la cantidad física recibida.'
                          : 'Verifique la cantidad física recibida frente al requerimiento solicitado'}
                      </span>
                    </div>
                    {!selectedOcId && (
                      <button type="button" className="secondary-btn" onClick={handleAddRow} style={{ padding: '6px 12px', fontSize: '12.5px' }}>
                        <Plus size={14} /> Añadir Ítem
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {detalles.map((row, idx) => {
                      const cantidadSolicitada = Number(row.cantidad_solicitada || 0);
                      const cantidadRecibidaPrev = Number(row.cantidad_recibida || 0);
                      const cantidadPendiente = row.cantidad_pendiente !== undefined ? Number(row.cantidad_pendiente) : Math.max(0, cantidadSolicitada - cantidadRecibidaPrev);
                      const cantidadIngresada = Number(row.cantidad || 0);
                      const diferenciaFaltante = cantidadPendiente > 0 ? cantidadPendiente - cantidadIngresada : 0;

                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: selectedOcId ? '2.6fr 1.3fr 1.3fr 1.6fr' : '2.4fr 1.3fr 1.3fr 1.6fr 40px',
                            gap: '10px',
                            alignItems: 'center',
                            background: selectedOcId ? '#f8fafc' : '#ffffff',
                            border: '1px solid #cbd5e1',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          }}
                        >
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              Producto
                              {selectedOcId && <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: '700' }}>🔒 Bloqueado por OC</span>}
                            </label>
                            <select
                              required
                              disabled={!!selectedOcId}
                              value={row.producto_id}
                              onChange={(e) => handleItemChange(idx, 'producto_id', e.target.value)}
                              style={{
                                padding: '8px',
                                fontSize: '13px',
                                background: selectedOcId ? '#f1f5f9' : '#ffffff',
                                cursor: selectedOcId ? 'not-allowed' : 'pointer',
                                fontWeight: selectedOcId ? '700' : 'normal',
                                color: selectedOcId ? '#0f172a' : 'inherit',
                                border: selectedOcId ? '1px solid #cbd5e1' : '1px solid #94a3b8',
                              }}
                            >
                              <option value="">-- Seleccionar Producto --</option>
                              {productosList.map((prod) => (
                                <option key={prod.id} value={prod.id}>{prod.sku} - {prod.nombre}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Solicitado / Saldo</label>
                            <div style={{ padding: '6px 8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '12.5px', fontWeight: '700', color: '#2563eb', textAlign: 'center' }}>
                              {cantidadSolicitada > 0 ? (
                                <>
                                  <div>{cantidadSolicitada} u. Total</div>
                                  {cantidadPendiente < cantidadSolicitada && (
                                    <small style={{ color: '#d97706', fontSize: '11px', display: 'block' }}>
                                      Faltan: {cantidadPendiente} u.
                                    </small>
                                  )}
                                </>
                              ) : 'Sin OC'}
                            </div>
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase' }}>Cant. Física Recibida</label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={row.cantidad}
                              onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                              style={{ padding: '8px', fontSize: '14px', textAlign: 'center', fontWeight: '800', borderColor: '#16a34a', background: '#f0fdf4' }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Estado de Recepción</label>
                            {cantidadSolicitada === 0 ? (
                              <span className="badge badge-info" style={{ fontSize: '12px' }}>Ingreso Manual</span>
                            ) : diferenciaFaltante > 0 ? (
                              <span className="badge badge-warning" style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '3px', width: '100%', justifyContent: 'center' }}>
                                ⚠️ Parcial (Quedan {diferenciaFaltante} u.)
                              </span>
                            ) : (
                              <span className="badge badge-success" style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '3px', width: '100%', justifyContent: 'center' }}>
                                <Check size={13} /> Completo (Cierra Saldo)
                              </span>
                            )}
                          </div>

                          {!selectedOcId && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginTop: '16px' }}
                              title="Eliminar ítem"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '13.5px', color: '#475569', fontWeight: '600' }}>
                      Resumen de Ingreso: {detalles.length} tipo(s) de productos verificado(s) para inventario
                    </span>
                    <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: '700' }}>
                      ✓ Stock actualizado de forma transaccional al guardar
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="primary-btn" style={{ background: '#16a34a' }}>
                  <Check size={16} /> Recepcionar e Incrementar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
