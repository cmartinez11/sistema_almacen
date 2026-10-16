import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  UserCheck,
  Mail,
  Edit,
  Trash2,
  X,
  Check,
  Building2,
  Warehouse,
  Shield,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlertCircle,
  UserPlus,
  Users,
  Sparkles,
  Link2,
} from 'lucide-react';
import api from '../../services/api';
import {
  ROLES,
  ROLE_LABELS,
  ROLE_BADGE_COLORS,
  normalizeRole,
} from '../../config/rbacConfig';
import '../pagesCommon.css';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [personalList, setPersonalList] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState('');

  // Modales
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPass, setSelectedUserForPass] = useState(null);

  // Estados de formularios
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: ROLES.ALMACENERO,
    area: '',
    almacen_id: '',
    personal_id: '',
    activo: true,
  });

  const [passwordFormData, setPasswordFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [showPass, setShowPass] = useState(false);
  const [showPassNew, setShowPassNew] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Usuario actualmente autenticado (en localStorage)
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  })();

  useEffect(() => {
    fetchUsuarios();
    fetchPersonal();
    fetchAlmacenes();
  }, []);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const res = await api.get('/usuarios');
      const data = res.data?.data || res.data || [];
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Error al cargar usuarios desde API:', err);
      // Fallback mínimo si la API tuviese retraso
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonal = async () => {
    try {
      const res = await api.get('/personal');
      const data = res.data?.data || res.data || [];
      setPersonalList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Error al cargar lista de personal:', err);
    }
  };

  const fetchAlmacenes = async () => {
    try {
      const res = await api.get('/almacenes');
      const data = res.data?.data || res.data || [];
      setAlmacenes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Error al cargar almacenes:', err);
    }
  };

  // Abrir modal de creación o edición
  const handleOpenModal = (userToEdit = null) => {
    setFormError('');
    setShowPass(false);
    if (userToEdit) {
      setEditingId(userToEdit.id);
      setFormData({
        name: userToEdit.name || '',
        email: userToEdit.email || '',
        password: '', // Vacío al editar para indicar que no se cambia a menos que se escriba
        role: normalizeRole(userToEdit) || ROLES.ALMACENERO,
        area: userToEdit.area || '',
        almacen_id: userToEdit.almacen_id ? String(userToEdit.almacen_id) : '',
        personal_id: userToEdit.personal_id ? String(userToEdit.personal_id) : '',
        activo: userToEdit.activo !== undefined ? Boolean(userToEdit.activo) : true,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: ROLES.ALMACENERO,
        area: '',
        almacen_id: '',
        personal_id: '',
        activo: true,
      });
    }
    setShowModal(true);
  };

  // Autocompletar datos al seleccionar un trabajador de la lista
  const handleSelectTrabajador = (e) => {
    const trabajadorId = e.target.value;
    if (!trabajadorId) {
      setFormData((prev) => ({ ...prev, personal_id: '' }));
      return;
    }

    const trab = personalList.find((p) => String(p.id) === String(trabajadorId));
    if (trab) {
      const nombreCompleto = `${trab.nombres || ''} ${trab.apellidos || ''}`.trim();
      setFormData((prev) => ({
        ...prev,
        personal_id: trab.id,
        name: prev.name ? prev.name : nombreCompleto,
        email: trab.email ? trab.email : prev.email,
        area: trab.area ? trab.area : prev.area,
        almacen_id: trab.almacen_id ? String(trab.almacen_id) : prev.almacen_id,
      }));
    }
  };

  // Guardar usuario (Crear o Editar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('El nombre completo es obligatorio.');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('El correo electrónico de acceso es obligatorio.');
      return;
    }
    if (!editingId && (!formData.password || formData.password.length < 6)) {
      setFormError('La contraseña inicial es obligatoria y debe tener al menos 6 caracteres.');
      return;
    }
    if (editingId && formData.password && formData.password.length < 6) {
      setFormError('Si deseas cambiar la contraseña, debe tener al menos 6 caracteres.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      role: formData.role,
      rol: formData.role,
      area: formData.area.trim() || null,
      almacen_id: formData.almacen_id ? Number(formData.almacen_id) : null,
      personal_id: formData.personal_id ? Number(formData.personal_id) : null,
      activo: Boolean(formData.activo),
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await api.put(`/usuarios/${editingId}`, payload);
        showToast('Usuario actualizado exitosamente.');
      } else {
        await api.post('/usuarios', payload);
        showToast('Usuario creado exitosamente con credenciales activas.');
      }
      setShowModal(false);
      fetchUsuarios();
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Error al procesar la solicitud. Verifica que el correo no esté duplicado.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Alternar estado activo / bloqueado
  const handleToggleEstado = async (userItem) => {
    const nuevoEstado = !userItem.activo;
    const accionTxt = nuevoEstado ? 'activar' : 'bloquear el acceso a';

    if (!window.confirm(`¿Seguro que deseas ${accionTxt} a ${userItem.name}?`)) {
      return;
    }

    try {
      const res = await api.patch(`/usuarios/${userItem.id}/estado`, { activo: nuevoEstado });
      showToast(
        res.data?.message ||
          `Usuario ${nuevoEstado ? 'activado' : 'bloqueado'} correctamente.`
      );
      fetchUsuarios();
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      showToast('Error al actualizar el estado del usuario.', 'error');
    }
  };

  // Eliminar usuario
  const handleDelete = async (userItem) => {
    if (currentUser?.id && Number(currentUser.id) === Number(userItem.id)) {
      alert('No puedes eliminar tu propia cuenta en sesión activa.');
      return;
    }

    if (
      !window.confirm(
        `¿Está completamente seguro de eliminar permanentemente al usuario ${userItem.name} (${userItem.email})? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/usuarios/${userItem.id}`);
      showToast('Usuario eliminado del sistema correctamente.');
      fetchUsuarios();
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      const msg = err.response?.data?.message || 'Error al eliminar el usuario.';
      showToast(msg, 'error');
    }
  };

  // Modal para cambio rápido de contraseña
  const handleOpenPasswordModal = (userItem) => {
    setSelectedUserForPass(userItem);
    setPasswordFormData({ newPassword: '', confirmPassword: '' });
    setShowPassNew(false);
    setFormError('');
    setShowPasswordModal(true);
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!passwordFormData.newPassword || passwordFormData.newPassword.length < 6) {
      setFormError('La nueva contraseña debe tener como mínimo 6 caracteres.');
      return;
    }
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setFormError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/usuarios/${selectedUserForPass.id}`, {
        password: passwordFormData.newPassword,
      });
      showToast(`Contraseña actualizada con éxito para ${selectedUserForPass.name}.`);
      setShowPasswordModal(false);
    } catch (err) {
      console.error('Error al actualizar contraseña:', err);
      setFormError(err.response?.data?.message || 'Error al actualizar contraseña.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrado reactivo en la tabla
  const filteredUsuarios = usuarios.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term)) ||
      (u.area && u.area.toLowerCase().includes(term)) ||
      (u.personal?.dni && u.personal.dni.includes(term));

    const normRole = normalizeRole(u);
    const matchesRole = selectedRoleFilter ? normRole === selectedRoleFilter : true;

    const matchesEstado =
      selectedEstadoFilter === ''
        ? true
        : selectedEstadoFilter === 'activo'
        ? Boolean(u.activo) === true
        : Boolean(u.activo) === false;

    return matchesSearch && matchesRole && matchesEstado;
  });

  // KPIs de resumen
  const totalUsers = usuarios.length;
  const activosUsers = usuarios.filter((u) => u.activo).length;
  const adminUsers = usuarios.filter((u) => normalizeRole(u) === ROLES.ADMINISTRADOR).length;
  const bloqueadosUsers = totalUsers - activosUsers;

  return (
    <div className="page-container">
      {/* Notificación Toast */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: notification.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            padding: '14px 22px',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: '600',
            fontSize: '14px',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {notification.type === 'error' ? <AlertCircle size={20} /> : <Check size={20} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* CABECERA PRINCIPAL */}
      <div className="page-header-card">
        <div className="page-title-group">
          <h2>Gestión de Usuarios y Accesos (RBAC)</h2>
          <p>
            Control centralizado de credenciales, roles de acceso seguro y vinculación con el directorio de personal.
          </p>
        </div>
        <button className="primary-btn" onClick={() => handleOpenModal()}>
          <Plus size={18} /> + Nuevo Usuario
        </button>
      </div>

      {/* TARJETAS DE INDICADORES (KPIs) */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-info">
            <span>Total Usuarios</span>
            <h3>{totalUsers}</h3>
          </div>
          <div className="kpi-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Users size={24} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span>Usuarios Activos</span>
            <h3 style={{ color: '#16a34a' }}>{activosUsers}</h3>
          </div>
          <div className="kpi-icon-box" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <UserCheck size={24} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span>Administradores</span>
            <h3 style={{ color: '#dc2626' }}>{adminUsers}</h3>
          </div>
          <div className="kpi-icon-box" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <Shield size={24} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span>Cuentas Bloqueadas</span>
            <h3 style={{ color: '#f59e0b' }}>{bloqueadosUsers}</h3>
          </div>
          <div className="kpi-icon-box" style={{ background: '#fffbeb', color: '#f59e0b' }}>
            <Lock size={24} />
          </div>
        </div>
      </div>

      {/* TARJETA DE TABLA Y FILTROS */}
      <div className="table-card">
        <div className="table-toolbar">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
            {/* Buscador */}
            <div className="search-input-wrapper">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar por Nombre, Correo, Rol o Área..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro rápido por Rol */}
            <select
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px',
                background: '#ffffff',
                color: '#334155',
                outline: 'none',
              }}
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
            >
              <option value="">-- Todos los Roles --</option>
              <option value={ROLES.ADMINISTRADOR}>👑 Administrador</option>
              <option value={ROLES.COMPRAS}>🛒 Compras</option>
              <option value={ROLES.ALMACENERO}>📦 Almacenero</option>
              <option value={ROLES.SUPERVISOR}>🔍 Supervisor</option>
              <option value={ROLES.RESPONSABLE_AREA}>🛍️ Responsable de Área</option>
              <option value={ROLES.GERENCIA}>📊 Gerencia</option>
            </select>

            {/* Filtro rápido por Estado */}
            <select
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px',
                background: '#ffffff',
                color: '#334155',
                outline: 'none',
              }}
              value={selectedEstadoFilter}
              onChange={(e) => setSelectedEstadoFilter(e.target.value)}
            >
              <option value="">-- Todos los Estados --</option>
              <option value="activo">🟢 Solo Activos</option>
              <option value="bloqueado">🔴 Solo Bloqueados</option>
            </select>
          </div>

          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '500' }}>
            Mostrando <strong>{filteredUsuarios.length}</strong> de <strong>{usuarios.length}</strong> usuarios
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            Cargando usuarios del sistema...
          </div>
        ) : filteredUsuarios.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            <Users size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <p style={{ margin: 0, fontWeight: '600' }}>No se encontraron usuarios coincidentes</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Prueba con otro término de búsqueda o limpia los filtros.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario / Nombre</th>
                <th>Correo (Login)</th>
                <th>Rol del Sistema</th>
                <th>Área / Sede Asignada</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsuarios.map((item) => {
                const normalizedRole = normalizeRole(item);
                const badgeStyle =
                  ROLE_BADGE_COLORS[normalizedRole] || {
                    bg: '#f1f5f9',
                    color: '#475569',
                    border: '#cbd5e1',
                  };
                const roleLabel = ROLE_LABELS[normalizedRole] || item.role || 'Sin Rol';

                return (
                  <tr key={item.id}>
                    {/* Usuario / Nombre con Avatar */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: badgeStyle.bg,
                            color: badgeStyle.color,
                            border: `1px solid ${badgeStyle.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '14px',
                            flexShrink: 0,
                          }}
                        >
                          {(item.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>
                            {item.name}
                            {currentUser?.id && Number(currentUser.id) === Number(item.id) && (
                              <span
                                style={{
                                  marginLeft: '6px',
                                  fontSize: '10.5px',
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  padding: '1px 6px',
                                  borderRadius: '6px',
                                  fontWeight: '700',
                                }}
                              >
                                Tú
                              </span>
                            )}
                          </div>
                          {item.personal && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px',
                                color: '#64748b',
                                marginTop: '2px',
                              }}
                            >
                              <Link2 size={10} color="#2563eb" /> Trabajador: DNI {item.personal.dni || item.personal.documento_identidad}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Correo (Login) */}
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#2563eb',
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          fontWeight: '600',
                        }}
                      >
                        <Mail size={13} color="#60a5fa" />
                        {item.email}
                      </span>
                    </td>

                    {/* Rol del Sistema con Badge de Color */}
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: badgeStyle.bg,
                          color: badgeStyle.color,
                          border: `1px solid ${badgeStyle.border}`,
                        }}
                      >
                        <ShieldCheck size={13} />
                        {roleLabel}
                      </span>
                    </td>

                    {/* Área / Sede Asignada */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span
                          className="badge badge-info"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            width: 'fit-content',
                          }}
                        >
                          <Building2 size={11} /> {item.area || 'Área General'}
                        </span>
                        {item.almacen ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11.5px',
                              color: '#475569',
                              marginTop: '2px',
                            }}
                          >
                            <Warehouse size={11} color="#64748b" /> {item.almacen.nombre}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                            Sin sede específica
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Estado (Activo / Bloqueado) */}
                    <td>
                      {item.activo ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 9px',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            background: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: '#16a34a',
                            }}
                          />
                          Activo
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 9px',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                          }}
                        >
                          <Lock size={11} /> Bloqueado
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {/* Editar datos y rol */}
                        <button
                          className="action-btn"
                          onClick={() => handleOpenModal(item)}
                          title="Editar Datos y Rol"
                          style={{ color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff' }}
                        >
                          <Edit size={15} />
                        </button>

                        {/* Cambiar contraseña */}
                        <button
                          className="action-btn"
                          onClick={() => handleOpenPasswordModal(item)}
                          title="Cambiar Contraseña"
                          style={{ color: '#d97706', borderColor: '#fde68a', background: '#fffbeb' }}
                        >
                          <KeyRound size={15} />
                        </button>

                        {/* Activar / Desactivar acceso */}
                        <button
                          className="action-btn"
                          onClick={() => handleToggleEstado(item)}
                          title={item.activo ? 'Bloquear Acceso' : 'Activar Acceso'}
                          style={{
                            color: item.activo ? '#475569' : '#16a34a',
                            borderColor: item.activo ? '#cbd5e1' : '#bbf7d0',
                            background: item.activo ? '#f8fafc' : '#f0fdf4',
                          }}
                        >
                          {item.activo ? <Unlock size={15} /> : <Lock size={15} />}
                        </button>

                        {/* Eliminar usuario */}
                        <button
                          className="action-btn"
                          onClick={() => handleDelete(item)}
                          title="Eliminar Usuario"
                          style={{ color: '#ef4444', borderColor: '#fecaca', background: '#fef2f2' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL CREAR / EDITAR USUARIO */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    background: '#eff6ff',
                    padding: '6px',
                    borderRadius: '8px',
                    color: '#2563eb',
                    display: 'flex',
                  }}
                >
                  <UserPlus size={18} />
                </div>
                <h3 style={{ margin: 0 }}>
                  {editingId ? 'Editar Usuario y Permisos' : 'Registrar Nuevo Usuario'}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
                {formError && (
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Opción rápida: Autocompletar desde Directorio de Personal */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)',
                    border: '1px solid #bfdbfe',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    marginBottom: '18px',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      color: '#1e40af',
                      marginBottom: '6px',
                    }}
                  >
                    <Sparkles size={14} color="#2563eb" />
                    Autocompletar desde Directorio de Personal (Opcional)
                  </label>
                  <select
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #93c5fd',
                      fontSize: '13px',
                      backgroundColor: '#ffffff',
                    }}
                    value={formData.personal_id || ''}
                    onChange={handleSelectTrabajador}
                  >
                    <option value="">-- Seleccionar trabajador existente (Opcional) --</option>
                    {personalList.map((trab) => (
                      <option key={trab.id} value={trab.id}>
                        {trab.nombres} {trab.apellidos} (DNI: {trab.dni || trab.documento_identidad}) - {trab.cargo || trab.area || 'Personal'}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                    Al elegir un trabajador se completará automáticamente el Nombre, Correo y Área.
                  </span>
                </div>

                {/* Campos alineados */}
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1.2 }}>
                    <label>Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Carlos Pérez"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Correo Electrónico (Login) *</label>
                    <input
                      type="email"
                      required
                      placeholder="usuario@almacen.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  {/* Campo de Contraseña */}
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>
                      {editingId ? 'Nueva Contraseña (Opcional)' : 'Contraseña de Acceso *'}
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showPass ? 'text' : 'password'}
                        placeholder={editingId ? 'Dejar en blanco para mantener' : 'Mínimo 6 caracteres'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        style={{ paddingRight: '36px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          display: 'flex',
                          padding: '4px',
                        }}
                        title={showPass ? 'Ocultar' : 'Ver'}
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Selector de Rol RBAC */}
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Rol del Sistema (RBAC) *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value={ROLES.ADMINISTRADOR}>👑 Administrador (Acceso Total)</option>
                      <option value={ROLES.COMPRAS}>🛒 Compras (Cotizaciones & Órdenes)</option>
                      <option value={ROLES.ALMACENERO}>📦 Almacenero (Kardex & Movimientos)</option>
                      <option value={ROLES.SUPERVISOR}>🔍 Supervisor (Control Operativo)</option>
                      <option value={ROLES.RESPONSABLE_AREA}>🛍️ Responsable de Área (Solicitudes)</option>
                      <option value={ROLES.GERENCIA}>📊 Gerencia / Directiva</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  {/* Selector de Área */}
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Área / Departamento Asignado</label>
                    <input
                      type="text"
                      list="areasSugeridas"
                      placeholder="Ej. E-commerce, Sistemas, Planta..."
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    />
                    <datalist id="areasSugeridas">
                      <option value="Sistemas" />
                      <option value="E-commerce" />
                      <option value="Almacén Principal" />
                      <option value="Compras y Logística" />
                      <option value="Mantenimiento Eléctrico" />
                      <option value="Operaciones / Planta" />
                      <option value="Administración y Finanzas" />
                      <option value="Ventas" />
                    </datalist>
                  </div>

                  {/* Selector de Almacén / Sede */}
                  <div className="form-group" style={{ flex: 1 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Warehouse size={13} color="#2563eb" /> Sede / Almacén por Defecto
                    </label>
                    <select
                      value={formData.almacen_id}
                      onChange={(e) => setFormData({ ...formData, almacen_id: e.target.value })}
                    >
                      <option value="">-- Sin sede específica / Global --</option>
                      {almacenes.map((alm) => (
                        <option key={alm.id} value={alm.id}>
                          {alm.nombre} ({alm.codigo})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Estado del usuario */}
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Estado de Acceso</label>
                    <select
                      value={formData.activo ? 'true' : 'false'}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.value === 'true' })}
                    >
                      <option value="true">🟢 Activo (Permite iniciar sesión)</option>
                      <option value="false">🔴 Bloqueado (Acceso revocado)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button type="submit" className="primary-btn" disabled={submitting}>
                  <Check size={16} />
                  {submitting ? 'Guardando...' : editingId ? 'Actualizar Usuario' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CAMBIAR CONTRASEÑA */}
      {showPasswordModal && selectedUserForPass && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    background: '#fffbeb',
                    padding: '6px',
                    borderRadius: '8px',
                    color: '#d97706',
                    display: 'flex',
                  }}
                >
                  <KeyRound size={18} />
                </div>
                <h3 style={{ margin: 0 }}>Cambiar Contraseña</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowPasswordModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitPassword}>
              <div className="modal-body">
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>
                    {selectedUserForPass.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {selectedUserForPass.email}
                  </div>
                </div>

                {formError && (
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      marginBottom: '14px',
                      fontSize: '12.5px',
                    }}
                  >
                    {formError}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>Nueva Contraseña (mínimo 6 caracteres)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassNew ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={passwordFormData.newPassword}
                      onChange={(e) =>
                        setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })
                      }
                      style={{ paddingRight: '36px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassNew(!showPassNew)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                        display: 'flex',
                        padding: '4px',
                      }}
                    >
                      {showPassNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirmar Nueva Contraseña</label>
                  <input
                    type={showPassNew ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={passwordFormData.confirmPassword}
                    onChange={(e) =>
                      setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' }}
                  disabled={submitting}
                >
                  <Check size={16} />
                  {submitting ? 'Guardando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
