import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Tags,
  Scale,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  DollarSign,
  ClipboardList,
  Truck,
  Users,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  User,
  Warehouse,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ShoppingBag,
  ShoppingCart,
  Bell,
} from 'lucide-react';
import {
  MENU_ITEMS,
  ROLES,
  ROLE_LABELS,
  ROLE_BADGE_COLORS,
  normalizeRole,
  hasPermission,
  useRole,
} from '../config/rbacConfig';
import api from '../services/api';
import './MainLayout.css';

// Mapeo dinámico de íconos de Lucide
const iconMap = {
  LayoutDashboard,
  Package,
  Boxes,
  Tags,
  Scale,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  DollarSign,
  ClipboardList,
  Truck,
  Users,
  ShieldCheck,
  BarChart3,
  AlertTriangle,
  ShoppingBag,
  ShoppingCart,
};

const renderIcon = (iconName) => {
  const IconComponent = iconMap[iconName] || Package;
  return <IconComponent className="nav-icon" />;
};

export default function MainLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { user, role: currentRole } = useRole();

  const [pageTitle, setPageTitle] = useState('Sistema de Almacén');

  const [expandedSubmenus, setExpandedSubmenus] = useState({
    productos: true,
    movimientos: true,
  });

  const roleBadgeStyle = ROLE_BADGE_COLORS[currentRole] || ROLE_BADGE_COLORS[ROLES.ALMACENERO];

  // Estado y control de la Notificación Toast de Pre-requerimientos
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Roles autorizados para recibir notificaciones
  const isAlertRole = [
    ROLES.ALMACENERO,
    ROLES.COMPRAS,
    ROLES.ADMINISTRADOR,
  ].includes(currentRole);

  const closeToast = () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(null);
  };

  const showToast = (data) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(data);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 12000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Suscripción a eventos y polling en segundo plano
  useEffect(() => {
    if (!isAlertRole) {
      closeToast();
      return;
    }

    // 1. Detección en tiempo real (mismo navegador / cambio de rol)
    const checkLocalAlert = () => {
      try {
        const raw = localStorage.getItem('nuevo_prereq_alerta');
        if (!raw) return;

        const alerta = JSON.parse(raw);
        const ultimoId = Number(localStorage.getItem('ultimo_req_id_notificado') || 0);
        const ultimoTs = Number(localStorage.getItem('ultimo_prereq_ts_visto') || 0);

        const alertaId = Number(alerta.id || 0);
        const alertaTs = Number(alerta.timestamp || 0);

        const esNuevo = (alertaId > 0 && alertaId > ultimoId) || (alertaTs > 0 && alertaTs > ultimoTs);

        if (esNuevo) {
          if (alertaId > 0) {
            localStorage.setItem('ultimo_req_id_notificado', String(Math.max(ultimoId, alertaId)));
          }
          if (alertaTs > 0) {
            localStorage.setItem('ultimo_prereq_ts_visto', String(alertaTs));
          }
          showToast(alerta);
        }
      } catch (e) {
        console.error('Error al verificar nuevo_prereq_alerta:', e);
      }
    };

    // 2. Polling en segundo plano cada 10 segundos
    const pollRequerimientos = async () => {
      try {
        const res = await api.get('/requerimientos');
        const list = res.data?.data || res.data;
        if (!Array.isArray(list) || list.length === 0) return;

        // Ordenar desc por id para tomar el último requerimiento
        const sorted = [...list].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
        const maxReq = sorted[0];
        if (!maxReq || !maxReq.id) return;

        const currentMaxId = Number(maxReq.id);
        const savedId = localStorage.getItem('ultimo_req_id_notificado');

        if (savedId === null) {
          // Primera carga: se inicializa con el id actual para no alertar de históricos
          localStorage.setItem('ultimo_req_id_notificado', String(currentMaxId));
          return;
        }

        const lastNotifiedId = Number(savedId);
        if (currentMaxId > lastNotifiedId) {
          localStorage.setItem('ultimo_req_id_notificado', String(currentMaxId));

          const solicitante = maxReq.personal
            ? `${maxReq.personal.nombres || ''} ${maxReq.personal.apellidos || ''}`.trim()
            : (maxReq.solicitante || 'Responsable de Área');

          showToast({
            id: maxReq.id,
            codigo: maxReq.correlativo || maxReq.codigo || `REQ-${maxReq.id}`,
            area_destino: maxReq.area || 'General',
            solicitante: solicitante || 'Responsable de Área',
            prioridad: maxReq.prioridad || 'media',
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        // Fallo silencioso en segundo plano
      }
    };

    // Verificación inicial
    checkLocalAlert();
    pollRequerimientos();

    // Escucha de eventos globales
    window.addEventListener('nuevoPreRequerimiento', checkLocalAlert);
    window.addEventListener('storage', checkLocalAlert);
    window.addEventListener('roleChanged', checkLocalAlert);

    // Polling ligero cada 10 segundos
    const pollInterval = setInterval(pollRequerimientos, 10000);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('nuevoPreRequerimiento', checkLocalAlert);
      window.removeEventListener('storage', checkLocalAlert);
      window.removeEventListener('roleChanged', checkLocalAlert);
    };
  }, [isAlertRole]);

  const getPriorityStyle = (prioridad) => {
    const p = String(prioridad || 'media').toLowerCase();
    if (p.includes('alt') || p.includes('urg')) {
      return {
        bg: 'rgba(239, 68, 68, 0.2)',
        color: '#f87171',
        border: 'rgba(239, 68, 68, 0.4)',
        label: '🔴 Alta',
      };
    }
    if (p.includes('baj')) {
      return {
        bg: 'rgba(34, 197, 94, 0.2)',
        color: '#4ade80',
        border: 'rgba(34, 197, 94, 0.4)',
        label: '🟢 Baja',
      };
    }
    return {
      bg: 'rgba(245, 158, 11, 0.2)',
      color: '#fbbf24',
      border: 'rgba(245, 158, 11, 0.4)',
      label: '🟡 Media',
    };
  };

  useEffect(() => {
    MENU_ITEMS.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some((child) => child.path === location.pathname);
        if (isChildActive) {
          setExpandedSubmenus((prev) => ({ ...prev, [item.id]: true }));
        }
      }
    });

    let title = 'Sistema de Almacén';
    MENU_ITEMS.forEach((item) => {
      if (item.path === location.pathname) title = item.title;
      if (item.children) {
        const matchingChild = item.children.find((c) => c.path === location.pathname);
        if (matchingChild) title = `${item.title} → ${matchingChild.title}`;
      }
    });
    setPageTitle(title);
  }, [location.pathname]);

  const toggleSubmenu = (menuId) => {
    setExpandedSubmenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const handleGroupClick = (item) => {
    if (collapsed) {
      if (item.children && item.children.length > 0) {
        navigate(item.children[0].path);
      }
    } else {
      toggleSubmenu(item.id);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.warn('Cierre de sesión local:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const visibleMenuItems = MENU_ITEMS.filter((item) => hasPermission(user, item.allowedRoles));

  return (
    <div className="app-container">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-icon-wrapper">
            <Warehouse size={22} />
          </div>
          {!collapsed && (
            <div className="brand-info">
              <span className="brand-title">FENIX</span>
              <span className="brand-subtitle">Sistema Almacén</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {!collapsed && <div className="nav-section-title">Módulos del Sistema</div>}

          {visibleMenuItems.map((item) => {
            if (item.children && item.children.length > 0) {
              const visibleChildren = item.children.filter((child) =>
                hasPermission(user, child.allowedRoles)
              );
              if (visibleChildren.length === 0) return null;

              const isExpanded = expandedSubmenus[item.id];
              const isAnyChildActive = visibleChildren.some(
                (c) => c.path === location.pathname
              );

              return (
                <div key={item.id} className="nav-group">
                  <button
                    className={`nav-item ${isAnyChildActive ? 'active' : ''}`}
                    onClick={() => handleGroupClick(item)}
                    title={collapsed ? item.title : ''}
                  >
                    <div className="nav-item-content">
                      {renderIcon(item.icon)}
                      {!collapsed && <span>{item.title}</span>}
                    </div>
                    {!collapsed && (
                      <span className="arrow-icon">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    )}
                  </button>

                  {!collapsed && isExpanded && (
                    <div className="sub-menu">
                      {visibleChildren.map((child) => (
                        <Link
                          key={child.id}
                          to={child.path}
                          className={`sub-nav-item ${location.pathname === child.path ? 'active' : ''
                            }`}
                        >
                          {renderIcon(child.icon)}
                          <span>{child.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.title : ''}
              >
                <div className="nav-item-content">
                  {renderIcon(item.icon)}
                  {!collapsed && <span>{item.title}</span>}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className={`main-wrapper ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="top-header">
          <div className="header-left">
            <button
              className="toggle-btn"
              onClick={() => setCollapsed(!collapsed)}
              title="Colapsar / Expandir Menú"
            >
              <Menu size={20} />
            </button>
            <h1 className="page-title">{pageTitle}</h1>
          </div>

          <div className="header-right">
            <div className="user-profile-badge">
              <div className="user-avatar">
                {(user.name || user.nombres || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="user-details">
                <span className="user-name">
                  {user.name || user.nombres || 'Usuario Activo'}
                </span>
                <span
                  className="user-role-chip"
                  style={{
                    backgroundColor: roleBadgeStyle.bg,
                    color: roleBadgeStyle.color,
                    border: `1px solid ${roleBadgeStyle.border}`,
                  }}
                >
                  {ROLE_LABELS[currentRole] || currentRole}
                </span>
              </div>
            </div>

            <button onClick={handleLogout} className="logout-button" title="Cerrar Sesión">
              <LogOut size={16} />
              <span>Salir</span>
            </button>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>

      {/* Toast Flotante de Nuevo Pre-requerimiento (Esquina Inferior Derecha) */}
      {toast && (
        <aside
          role="alert"
          aria-live="assertive"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            width: '360px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            borderLeft: '4px solid #3b82f6',
            borderRadius: '12px',
            padding: '16px 18px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            animation: 'toastSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            boxSizing: 'border-box',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            overflow: 'hidden',
          }}
        >
          <style>
            {`
              @keyframes toastSlideUp {
                from {
                  transform: translateY(30px);
                  opacity: 0;
                }
                to {
                  transform: translateY(0);
                  opacity: 1;
                }
              }
              @keyframes toastProgressAnim {
                from { width: 100%; }
                to { width: 0%; }
              }
            `}
          </style>

          {/* Encabezado */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa',
                  flexShrink: 0,
                }}
              >
                <Bell size={16} />
              </div>
              <span style={{ fontWeight: '700', fontSize: '13.5px', color: '#f8fafc', letterSpacing: '-0.2px' }}>
                Nuevo Pre-requerimiento Recibido
              </span>
            </div>
            <button
              onClick={closeToast}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                transition: 'color 0.2s, background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Cerrar notificación"
            >
              <X size={16} />
            </button>
          </div>

          {/* Cuerpo */}
          <div style={{ marginBottom: '14px', fontSize: '12.5px', color: '#cbd5e1', lineHeight: '1.5' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: '800',
                  fontSize: '13.5px',
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  letterSpacing: '0.5px',
                }}
              >
                {toast.codigo}
              </span>
              {(() => {
                const pStyle = getPriorityStyle(toast.prioridad);
                return (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: pStyle.bg,
                      color: pStyle.color,
                      border: `1px solid ${pStyle.border}`,
                    }}
                  >
                    {pStyle.label}
                  </span>
                );
              })()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px' }}>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Área Destino:</span>{' '}
                <strong style={{ color: '#f1f5f9', fontWeight: '600' }}>{toast.area_destino}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Solicitante:</span>{' '}
                <strong style={{ color: '#f1f5f9', fontWeight: '600' }}>{toast.solicitante}</strong>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button
              onClick={() => {
                closeToast();
                navigate('/requerimientos');
              }}
              style={{
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>Ver Pedido →</span>
            </button>
          </div>

          {/* Barra de progreso de auto-cierre (12s) */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: '3px',
              backgroundColor: '#3b82f6',
              animation: 'toastProgressAnim 12s linear forwards',
            }}
          />
        </aside>
      )}
    </div>
  );
}
