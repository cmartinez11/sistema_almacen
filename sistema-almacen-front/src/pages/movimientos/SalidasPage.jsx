import React, { useState, useEffect } from 'react';
import { Plus, ArrowUpRight, UserCheck, Eye, X, Check, Trash2, Search, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import '../pagesCommon.css';

export default function SalidasPage() {
  const [salidas, setSalidas] = useState([]);
  const [personalList, setPersonalList] = useState([]);
  const [productosList, setProductosList] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Formulario cabecera
  const [formHeader, setFormHeader] = useState({
    almacen_id: 1,
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
      almacen: { nombre: 'Almacén Principal' },
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
      almacen: { nombre: 'Planta 3' },
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

  const getStockForWarehouse = (prod, almacenId) => {
    if (!prod) return 0;
    if (Array.isArray(prod.almacenes)) {
      const alm = prod.almacenes.find((a) => String(a.id) === String(almacenId));
      if (alm && alm.pivot) {
        return Number(alm.pivot.stock || 0);
      }
    }
    return Number(prod.stock_actual || 0);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [resSal, resPers, resProd, resAlm] = await Promise.all([
        api.get('/salidas'),
        api.get('/personal'),
        api.get('/productos'),
        api.get('/almacenes'),
      ]);

      const dataSal = resSal.data?.data?.data || resSal.data?.data || resSal.data;
      setSalidas(Array.isArray(dataSal) && dataSal.length > 0 ? dataSal : mockSalidas);

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

      if (dataPers.length > 0) setFormHeader((prev) => ({ ...prev, personal_id: dataPers[0].id }));
    } catch (err) {
      console.warn('Usando datos de respaldo para Salidas:', err);
      setSalidas(mockSalidas);
      setAlmacenes([
        { id: 1, nombre: 'Almacén Principal', codigo: 'ALM-01' },
        { id: 2, nombre: 'Planta 3', codigo: 'ALM-03' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const selectedWorker = personalList.find((p) => String(p.id) === String(formHeader.personal_id));
  const selectedWorkerArea = selectedWorker?.area || 'General';

  const handleOpenModal = () => {
    setErrorMsg('');
    const defaultAlm = almacenes[0]?.id || 1;
    const firstProd = productosList[0];
    setFormHeader({
      almacen_id: defaultAlm,
      personal_id: personalList[0]?.id || '',
      observaciones: '',
    });
    setDetalles([
      { producto_id: firstProd?.id || '', cantidad: 1, stock_disponible: getStockForWarehouse(firstProd, defaultAlm) },
    ]);
    setShowModal(true);
  };

  const handleAlmacenChange = (almId) => {
    setFormHeader((prev) => ({ ...prev, almacen_id: almId }));
    setDetalles((prevDet) =>
      prevDet.map((d) => {
        const prod = productosList.find((p) => String(p.id) === String(d.producto_id));
        return {
          ...d,
          stock_disponible: getStockForWarehouse(prod, almId),
        };
      })
    );
  };

  const handleAddRow = () => {
    const firstProd = productosList[0];
    setDetalles([
      ...detalles,
      { producto_id: firstProd?.id || '', cantidad: 1, stock_disponible: getStockForWarehouse(firstProd, formHeader.almacen_id) },
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
      updated[index].stock_disponible = getStockForWarehouse(prod, formHeader.almacen_id);
    }
    setDetalles(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validación previa para no exceder stock del almacén seleccionado
    for (const item of detalles) {
      if (Number(item.cantidad) > Number(item.stock_disponible)) {
        setErrorMsg(`La cantidad solicitada de un producto supera el stock disponible (${item.stock_disponible} u.) en el almacén seleccionado.`);
        return;
      }
    }

    try {
      const payload = {
        almacen_id: Number(formHeader.almacen_id || 1),
        personal_id: formHeader.personal_id,
        observaciones: formHeader.observaciones,
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

  const handleExportPdf = (sal) => {
    const pdfUrl = `http://127.0.0.1:8000/api/salidas/${sal.id}/pdf`;
    window.open(pdfUrl, '_blank');
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
                <th>Almacén Origen</th>
                <th>Asignado A (Personal)</th>
                <th>DNI Trabajador</th>
                <th>Área / Destino</th>
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
                    <span className="badge badge-purple" style={{ fontWeight: '700' }}>
                      🏭 {sal.almacen?.nombre || (sal.almacen_id === 2 ? 'Planta 3' : 'Almacén Principal')}
                    </span>
                  </td>
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
                  <td><span className="badge badge-info">{sal.destino_cliente || sal.personal?.area || 'General'}</span></td>
                  <td>{sal.salidas_detalle?.length || sal.detalles?.length || 1} productos</td>
                  <td>
                    <span className="badge badge-success">
                      {sal.estado ? sal.estado.toUpperCase() : 'EMITIDO'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="action-btn"
                      title="Descargar / Ver Reporte PDF Nota de Salida"
                      onClick={() => handleExportPdf(sal)}
                      style={{ color: '#ea580c', borderColor: '#fed7aa', background: '#fff7ed' }}
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
                  <div className="form-group" style={{ flex: '1.5' }}>
                    <label style={{ fontWeight: '700', color: '#c2410c' }}>
                      🏭 Almacén de Origen (Despacho)
                    </label>
                    <select
                      required
                      value={formHeader.almacen_id}
                      onChange={(e) => handleAlmacenChange(e.target.value)}
                      style={{ borderColor: '#ea580c', fontWeight: '700', background: '#fff7ed' }}
                    >
                      {almacenes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} ({a.codigo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: '2' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={14} color="#2563eb" /> Trabajador Receptante (Personal)
                    </label>
                    <select
                      required
                      value={formHeader.personal_id}
                      onChange={(e) => setFormHeader({ ...formHeader, personal_id: e.target.value })}
                      style={{ fontSize: '13.5px', fontWeight: '600' }}
                    >
                      <option value="">-- Seleccionar Trabajador --</option>
                      {personalList.map((pers) => (
                        <option key={pers.id} value={pers.id}>
                          {pers.apellidos}, {pers.nombres} (DNI: {pers.dni || pers.documento_identidad})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: '1' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      Área de Destino
                      <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '700' }}>⚡ Automático</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={selectedWorkerArea}
                      style={{ background: '#f1f5f9', fontWeight: '700', color: '#0f172a', fontSize: '13px' }}
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
