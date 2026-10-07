import React, { useState, useEffect } from 'react';
import { Plus, Tags, Edit, Trash2, X, Check } from 'lucide-react';
import api from '../../services/api';
import '../pagesCommon.css';

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });

  const mockCategorias = [
    { id: 1, nombre: 'Tuberías y Conexiones', descripcion: 'Tubos PVC, codos, uniones y accesorios sanitarios' },
    { id: 2, nombre: 'Electricidad e Iluminación', descripcion: 'Cables, llaves térmicas, tomacorrientes y tableros' },
    { id: 3, nombre: 'Materiales de Construcción', descripcion: 'Cemento, agregados, fierro y ladrillos' },
    { id: 4, nombre: 'Ferretería y Herramientas', descripcion: 'Pernos, tornillos, martillos y discos de corte' },
  ];

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      setLoading(true);
      const res = await api.get('/categorias');
      const data = res.data?.data || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setCategorias(data);
      } else {
        setCategorias(mockCategorias);
      }
    } catch (err) {
      console.warn('Usando categorías locales:', err);
      setCategorias(mockCategorias);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (cat = null) => {
    if (cat) {
      setEditingId(cat.id);
      setFormData({ nombre: cat.nombre || '', descripcion: cat.descripcion || '' });
    } else {
      setEditingId(null);
      setFormData({ nombre: '', descripcion: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/categorias/${editingId}`, formData);
      } else {
        await api.post('/categorias', formData);
      }
      setShowModal(false);
      fetchCategorias();
    } catch (err) {
      console.error(err);
      if (editingId) {
        setCategorias((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...formData } : c)));
      } else {
        setCategorias((prev) => [...prev, { id: Date.now(), ...formData }]);
      }
      setShowModal(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta categoría?')) return;
    try {
      await api.delete(`/categorias/${id}`);
      setCategorias((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.warn(err);
      setCategorias((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="page-container">
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Gestión de Categorías</h2>
          <p>Clasificación estructurada de los ítems en inventario.</p>
        </div>
        <button className="primary-btn" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Nueva Categoría
        </button>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando categorías...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre de Categoría</th>
                <th>Descripción</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((cat) => (
                <tr key={cat.id}>
                  <td><strong style={{ color: '#2563eb' }}>#{cat.id}</strong></td>
                  <td style={{ fontWeight: '600' }}>{cat.nombre}</td>
                  <td style={{ color: '#64748b' }}>{cat.descripcion || 'Sin descripción'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="action-btn" onClick={() => handleOpenModal(cat)} title="Editar"><Edit size={16} /></button>
                      <button className="action-btn" onClick={() => handleDelete(cat.id)} title="Eliminar" style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editingId ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre de Categoría</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Tuberías y Sanitarios"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    rows={3}
                    placeholder="Detalle o uso de los productos de esta categoría..."
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="primary-btn"><Check size={16} /> Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
