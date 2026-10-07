import React, { useState, useEffect } from 'react';
import { Plus, ArrowLeftRight, Eye, X, Check, Trash2, Search, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import api from '../../services/api';
import '../pagesCommon.css';

export default function TransferenciasPage() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [transferencias, setTransferencias] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [productosList, setProductosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Formulario de cabecera
  const [formHeader, setFormHeader] = useState({
    almacen_origen_id: '1',
    almacen_destino_id: '2',
    observaciones: '',
  });

  // Detalles de transferencia
  const [detalles, setDetalles] = useState([
    { producto_id: '', cantidad: 1, stock_disponible: 0 },
  ]);

  const mockTransferencias = [
    {
      id: 1,
      correlativo: 'TR-2026-0001',
      fecha_emision: '2026-10-06 14:30',
      almacenOrigen: { nombre: 'Almacén Principal', codigo: 'ALM-01' },
      almacenDestino: { nombre: 'Planta 3', codigo: 'ALM-03' },
      observaciones: 'Reubicación de stock de seguridad para mantenimiento',
      estado: 'completado',
      detalles: [{}, {}],
      user: { name: 'Almacenero Principal' },
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
      const [resTr, resAlm, resProd] = await Promise.all([
        api.get('/transferencias'),
        api.get('/almacenes'),
        api.get('/productos'),
      ]);

      const dataTr = resTr.data?.data?.data || resTr.data?.data || resTr.data;
      setTransferencias(Array.isArray(dataTr) && dataTr.length > 0 ? dataTr : mockTransferencias);

      const dataAlm = resAlm.data?.data || resAlm.data;
      const listAlm = Array.isArray(dataAlm) && dataAlm.length > 0 ? dataAlm : [
        { id: 1, nombre: 'Almacén Principal', codigo: 'ALM-01' },
        { id: 2, nombre: 'Planta 3', codigo: 'ALM-03' }
      ];
      setAlmacenes(listAlm);

      const dataProd = resProd.data?.data?.data || resProd.data?.data || resProd.data;
      setProductosList(Array.isArray(dataProd) ? dataProd : []);
    } catch (err) {
      console.warn('Usando datos de respaldo para Transferencias:', err);
      setTransferencias(mockTransferencias);
      setAlmacenes([
        { id: 1, nombre: 'Almacén Principal', codigo: 'ALM-01' },
        { id: 2, nombre: 'Planta 3', codigo: 'ALM-03' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setErrorMsg('');
    const origId = almacenes[0]?.id || 1;
    const destId = almacenes[1]?.id || (origId === 1 ? 2 : 1);
    const firstProd = productosList[0];

    setFormHeader({
      almacen_origen_id: origId,
      almacen_destino_id: destId,
      observaciones: '',
    });

    setDetalles([
      {
        producto_id: firstProd?.id || '',
        cantidad: 1,
        stock_disponible: getStockForWarehouse(firstProd, origId),
      },
    ]);

    setShowModal(true);
  };

  const handleOrigenChange = (origId) => {
    setFormHeader((prev) => ({ ...prev, almacen_origen_id: origId }));
    // Recalcular stock disponible para todos los productos agregados
    setDetalles((prevDet) =>
      prevDet.map((d) => {
        const prod = productosList.find((p) => String(p.id) === String(d.producto_id));
        return {
          ...d,
          stock_disponible: getStockForWarehouse(prod, origId),
        };
      })
    );
  };

  const handleAddRow = () => {
    const firstProd = productosList[0];
    setDetalles([
      ...detalles,
      {
        producto_id: firstProd?.id || '',
        cantidad: 1,
        stock_disponible: getStockForWarehouse(firstProd, formHeader.almacen_origen_id),
      },
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
      updated[index].stock_disponible = getStockForWarehouse(prod, formHeader.almacen_origen_id);
    }
    setDetalles(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (String(formHeader.almacen_origen_id) === String(formHeader.almacen_destino_id)) {
      setErrorMsg('El almacén de destino debe ser diferente al almacén de origen.');
      return;
    }

    // Validación de cantidades vs stock disponible en origen
    for (const item of detalles) {
      if (!item.producto_id) {
        setErrorMsg('Seleccione un producto para cada ítem de la transferencia.');
        return;
      }
      if (Number(item.cantidad) <= 0) {
        setErrorMsg('La cantidad a transferir debe ser mayor a cero.');
        return;
      }
      if (Number(item.cantidad) > Number(item.stock_disponible)) {
        setErrorMsg(`La cantidad solicitada supera el stock disponible en el almacén de origen (${item.stock_disponible} u.).`);
        return;
      }
    }

    try {
      const payload = {
        almacen_origen_id: Number(formHeader.almacen_origen_id),
        almacen_destino_id: Number(formHeader.almacen_destino_id),
        observaciones: formHeader.observaciones,
        user_id: currentUser.id || null,
        detalles: detalles.map((d) => ({
          producto_id: d.producto_id,
          cantidad: Number(d.cantidad),
        })),
      };

      await api.post('/transferencias', payload);
      setShowModal(false);
      loadInitialData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || err.response?.data?.errors?.detalles?.[0] || 'Error al procesar la transferencia entre almacenes.');
    }
  };

  const handleExportPdf = (tr) => {
    const pdfUrl = `http://127.0.0.1:8000/api/transferencias/${tr.id}/pdf`;
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Transferencias entre Almacenes (TR)</h2>
          <p>Traslado transaccional de productos entre Almacén Principal y Planta 3 con actualización simultánea de Kardex.</p>
        </div>
        <button
          className="primary-btn"
          onClick={handleOpenModal}
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}
        >
          <Plus size={18} /> Nueva Transferencia
        </button>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando transferencias de almacén...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Correlativo</th>
                <th>Fecha Emisión</th>
                <th>Almacén Origen</th>
                <th>Almacén Destino</th>
                <th>N° Ítems</th>
                <th>Observaciones / Motivo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {transferencias.map((tr) => (
                <tr key={tr.id}>
                  <td>
                    <strong style={{ color: '#7c3aed', fontFamily: 'monospace', fontSize: '14px' }}>
                      {tr.correlativo || `TR-2026-000${tr.id}`}
                    </strong>
                  </td>
                  <td>{tr.fecha_emision ? String(tr.fecha_emision).replace('T', ' ').substring(0, 16) : '2026-10-06 12:00'}</td>
                  <td>
                    <span className="badge badge-purple" style={{ fontWeight: '700' }}>
                      🏢 {tr.almacen_origen?.nombre || tr.almacenOrigen?.nombre || (tr.almacen_origen_id === 2 ? 'Planta 3' : 'Almacén Principal')}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ fontWeight: '700' }}>
                      🏭 {tr.almacen_destino?.nombre || tr.almacenDestino?.nombre || (tr.almacen_destino_id === 2 ? 'Planta 3' : 'Almacén Principal')}
                    </span>
                  </td>
                  <td>{tr.detalles?.length || 1} productos</td>
                  <td style={{ color: '#475569', fontSize: '12.5px' }}>{tr.observaciones || 'Traslado regular'}</td>
                  <td>
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={12} /> {tr.estado ? tr.estado.toUpperCase() : 'COMPLETADO'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="action-btn"
                      title="Ver / Imprimir Guía de Transferencia PDF"
                      onClick={() => handleExportPdf(tr)}
                      style={{ color: '#7c3aed', borderColor: '#ddd6fe', background: '#f5f3ff' }}
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

      {/* MODAL NUEVA TRANSFERENCIA */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '800px' }}>
            <div className="modal-header" style={{ background: '#f5f3ff', borderBottom: '1px solid #ddd6fe' }}>
              <div>
                <h3 style={{ margin: 0, color: '#5b21b6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ArrowLeftRight size={20} /> Registrar Nueva Transferencia entre Almacenes
                </h3>
                <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '600' }}>
                  Traslado físico e incremento/decremento automático de stock
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {errorMsg && (
                  <div style={{ padding: '12px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <AlertCircle size={16} /> {errorMsg}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group" style={{ flex: '1' }}>
                    <label style={{ fontWeight: '700', color: '#dc2626' }}>
                      🏢 Almacén de Origen (Salida Stock)
                    </label>
                    <select
                      required
                      value={formHeader.almacen_origen_id}
                      onChange={(e) => handleOrigenChange(e.target.value)}
                      style={{ borderColor: '#ef4444', fontWeight: '700', background: '#fef2f2' }}
                    >
                      {almacenes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} ({a.codigo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ flex: '1' }}>
                    <label style={{ fontWeight: '700', color: '#16a34a' }}>
                      🏭 Almacén de Destino (Ingreso Stock)
                    </label>
                    <select
                      required
                      value={formHeader.almacen_destino_id}
                      onChange={(e) => setFormHeader({ ...formHeader, almacen_destino_id: e.target.value })}
                      style={{ borderColor: '#22c55e', fontWeight: '700', background: '#f0fdf4' }}
                    >
                      {almacenes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} ({a.codigo})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Motivo / Observaciones del Traslado</label>
                  <input
                    type="text"
                    placeholder="Ej. Abastecimiento de insumos para Planta 3 turno noche"
                    value={formHeader.observaciones}
                    onChange={(e) => setFormHeader({ ...formHeader, observaciones: e.target.value })}
                  />
                </div>

                {/* DETALLE DE PRODUCTOS A TRANSFERIR */}
                <div style={{ marginTop: '16px', borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Productos a Transferir</h4>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Verifique el stock disponible en el almacén de origen antes de guardar.</span>
                    </div>
                    <button type="button" className="secondary-btn" onClick={handleAddRow} style={{ padding: '6px 12px', fontSize: '12.5px' }}>
                      <Plus size={14} /> Añadir Ítem
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {detalles.map((row, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2.5fr 1.2fr 1fr 40px',
                          gap: '10px',
                          alignItems: 'center',
                          background: '#f8fafc',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div>
                          <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Producto</label>
                          <select
                            required
                            value={row.producto_id}
                            onChange={(e) => handleItemChange(idx, 'producto_id', e.target.value)}
                            style={{ fontSize: '13px', fontWeight: '600' }}
                          >
                            <option value="">-- Seleccionar Producto --</option>
                            {productosList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.sku} - {p.nombre}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Stock Disponible Origen</label>
                          <input
                            type="text"
                            disabled
                            readOnly
                            value={`${row.stock_disponible} u.`}
                            style={{
                              background: '#e2e8f0',
                              fontWeight: '800',
                              color: row.stock_disponible > 0 ? '#16a34a' : '#dc2626',
                              fontSize: '13px',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Cant. a Transferir</label>
                          <input
                            type="number"
                            required
                            min="0.01"
                            step="any"
                            value={row.cantidad}
                            onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                            style={{ fontWeight: '700', color: '#6d28d9', fontSize: '13.5px' }}
                          />
                        </div>

                        <div style={{ paddingTop: '16px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            disabled={detalles.length === 1}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: detalles.length === 1 ? '#cbd5e1' : '#ef4444',
                              cursor: detalles.length === 1 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="primary-btn" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}>
                  <Check size={18} /> Procesar Transferencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
