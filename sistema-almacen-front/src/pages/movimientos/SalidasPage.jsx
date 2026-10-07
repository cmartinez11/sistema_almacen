import React, { useState, useEffect } from 'react';
import { Plus, ArrowUpRight, UserCheck, Eye, X, Check, Trash2, Search, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import '../pagesCommon.css';

export default function SalidasPage() {
  const [salidas, setSalidas] = useState([]);
  const [personalList, setPersonalList] = useState([]);
  const [productosList, setProductosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Formulario cabecera
  const [formHeader, setFormHeader] = useState({
    personal_id: '',
    destino_cliente: 'Asignación Interna / Herramientas',
    tipo_salida: 'Despacho a Trabajo',
    numero_referencia: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    observaciones: '',
  });

  // Ítems dinámicos
  const [detalles, setDetalles] = useState([
    { producto_id: '', cantidad: 1, stock_disponible: 0 },
  ]);

  const mockSalidas = [
    {
      id: 1,
      correlativo: 'NS-2026-0045',
      fecha_emision: '2026-10-06',
      personal: { nombres: 'Juan', apellidos: 'Pérez Ramos', dni: '45892104' },
      destino_cliente: 'Mantenimiento Eléctrico',
      tipo_salida: 'Despacho a Trabajo',
      estado: 'emitido',
      salidas_detalle: [{}, {}, {}],
    },
    {
      id: 2,
      correlativo: 'NS-2026-0044',
      fecha_emision: '2026-10-05',
      personal: { nombres: 'Maria', apellidos: 'Gómez Salcedo', dni: '70192384' },
      destino_cliente: 'Telecomunicaciones',
      tipo_salida: 'Despacho a Trabajo',
      estado: 'emitido',
      salidas_detalle: [{}, {}],
    },
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [resSal, resPers, resProd] = await Promise.all([
        api.get('/salidas'),
        api.get('/personal'),
        api.get('/productos'),
      ]);

      const dataSal = resSal.data?.data?.data || resSal.data?.data || resSal.data;
      setSalidas(Array.isArray(dataSal) && dataSal.length > 0 ? dataSal : mockSalidas);

      const dataPers = resPers.data?.data || resPers.data;
      setPersonalList(Array.isArray(dataPers) ? dataPers : []);

      const dataProd = resProd.data?.data?.data || resProd.data?.data || resProd.data;
      setProductosList(Array.isArray(dataProd) ? dataProd : []);

      if (dataPers.length > 0) setFormHeader((prev) => ({ ...prev, personal_id: dataPers[0].id }));
    } catch (err) {
      console.warn('Usando datos de respaldo para Salidas:', err);
      setSalidas(mockSalidas);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setErrorMsg('');
    setFormHeader({
      personal_id: personalList[0]?.id || '',
      destino_cliente: 'Asignación Interna / Herramientas',
      tipo_salida: 'Despacho a Trabajo',
      numero_referencia: `REF-${Math.floor(100 + Math.random() * 900)}`,
      fecha_emision: new Date().toISOString().split('T')[0],
      observaciones: '',
    });
    setDetalles([
      { producto_id: productosList[0]?.id || '', cantidad: 1, stock_disponible: productosList[0]?.stock_actual || 0 },
    ]);
    setShowModal(true);
  };

  const handleAddRow = () => {
    const firstProd = productosList[0];
    setDetalles([
      ...detalles,
      { producto_id: firstProd?.id || '', cantidad: 1, stock_disponible: firstProd?.stock_actual || 0 },
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
      updated[index].stock_disponible = prod ? Number(prod.stock_actual || 0) : 0;
    }
    setDetalles(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validación previa de cliente para no exceder stock
    for (const item of detalles) {
      if (Number(item.cantidad) > Number(item.stock_disponible)) {
        setErrorMsg(`La cantidad solicitada supera el stock disponible (${item.stock_disponible} u.).`);
        return;
      }
    }

    try {
      const payload = {
        ...formHeader,
        detalles: detalles.map((d) => ({
          producto_id: d.producto_id,
          cantidad: Number(d.cantidad),
        })),
      };

      await api.post('/salidas', payload);
      setShowModal(false);
      loadInitialData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Error al procesar la salida. Verifique el stock disponible.');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Notas de Salida y Asignación a Personal (NS)</h2>
          <p>Despacho de herramientas y materiales asignados a trabajadores con control de stock disponible.</p>
        </div>
        <button
          className="primary-btn"
          onClick={handleOpenModal}
          style={{ background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' }}
        >
          <Plus size={18} /> Registrar Nueva Salida
        </button>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando notas de salida...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Correlativo</th>
                <th>Fecha Despacho</th>
                <th>Asignado A (Personal)</th>
                <th>DNI Trabajador</th>
                <th>Tipo / Destino</th>
                <th>N° Ítems</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {salidas.map((sal) => (
                <tr key={sal.id}>
                  <td>
                    <strong style={{ color: '#ea580c', fontFamily: 'monospace', fontSize: '14px' }}>
                      {sal.correlativo || `NS-2026-00${sal.id}`}
                    </strong>
                  </td>
                  <td>{sal.fecha_emision ? String(sal.fecha_emision).split('T')[0] : '2026-10-06'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={16} color="#2563eb" />
                      <strong style={{ color: '#0f172a' }}>
                        {sal.personal ? `${sal.personal.nombres} ${sal.personal.apellidos}` : 'Trabajador'}
                      </strong>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: '#64748b' }}>
                      {sal.personal?.dni || sal.personal?.documento_identidad || '45892104'}
                    </span>
                  </td>
                  <td><span className="badge badge-info">{sal.destino_cliente || sal.tipo_salida}</span></td>
                  <td>{sal.salidas_detalle?.length || sal.detalles?.length || 1} productos</td>
                  <td>
                    <span className="badge badge-success">
                      {sal.estado ? sal.estado.toUpperCase() : 'EMITIDO'}
                    </span>
                  </td>
                  <td>
                    <button className="action-btn" title="Ver Detalle"><Eye size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL MULTI-ITEM PARA NUEVA NOTA DE SALIDA */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '780px' }}>
            <div className="modal-header">
              <h3>Registrar Nota de Salida / Asignación a Personal</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {errorMsg && (
                  <div style={{ padding: '12px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} /> {errorMsg}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Trabajador Receptante (Personal)</label>
                    <select
                      required
                      value={formHeader.personal_id}
                      onChange={(e) => setFormHeader({ ...formHeader, personal_id: e.target.value })}
                    >
                      <option value="">-- Seleccionar Trabajador --</option>
                      {personalList.map((pers) => (
                        <option key={pers.id} value={pers.id}>
                          {pers.apellidos}, {pers.nombres} (DNI: {pers.dni || pers.documento_identidad}) - {pers.area || 'General'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Tipo de Salida</label>
                    <select
                      value={formHeader.tipo_salida}
                      onChange={(e) => setFormHeader({ ...formHeader, tipo_salida: e.target.value })}
                    >
                      <option value="Despacho a Trabajo">Despacho a Trabajo / Obra</option>
                      <option value="Asignación de Herramientas">Asignación de Herramientas</option>
                      <option value="Consumo Interno">Consumo Interno</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Área / Proyecto / Destino</label>
                    <input
                      type="text"
                      required
                      value={formHeader.destino_cliente}
                      onChange={(e) => setFormHeader({ ...formHeader, destino_cliente: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Fecha de Salida</label>
                    <input
                      type="date"
                      required
                      value={formHeader.fecha_emision}
                      onChange={(e) => setFormHeader({ ...formHeader, fecha_emision: e.target.value })}
                    />
                  </div>
                </div>

                {/* DETALLES DINÁMICOS DE PRODUCTOS */}
                <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Materiales / Insumos a Despachar</h4>
                    <button type="button" className="secondary-btn" onClick={handleAddRow} style={{ padding: '4px 10px', fontSize: '12.5px' }}>
                      <Plus size={14} /> Añadir Ítem
                    </button>
                  </div>

                  {detalles.map((row, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 40px', gap: '10px', alignItems: 'center', marginBottom: '10px', background: '#f8fafc', padding: '8px', borderRadius: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b' }}>Producto Solicitado</label>
                        <select
                          required
                          value={row.producto_id}
                          onChange={(e) => handleItemChange(idx, 'producto_id', e.target.value)}
                        >
                          <option value="">-- Seleccionar --</option>
                          {productosList.map((prod) => (
                            <option key={prod.id} value={prod.id}>
                              {prod.sku} - {prod.nombre} (Stock: {prod.stock_actual})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b' }}>Stock Disponible</label>
                        <strong style={{ display: 'block', padding: '8px', background: '#ffffff', borderRadius: '6px', fontSize: '13px', color: row.stock_disponible > 0 ? '#16a34a' : '#dc2626' }}>
                          {row.stock_disponible} u.
                        </strong>
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', color: '#64748b' }}>Cantidad a Despachar</label>
                        <input
                          type="number"
                          min="1"
                          max={row.stock_disponible}
                          required
                          value={row.cantidad}
                          onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginTop: '16px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="primary-btn" style={{ background: '#ea580c' }}>
                  <Check size={16} /> Confirmar y Descontar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
