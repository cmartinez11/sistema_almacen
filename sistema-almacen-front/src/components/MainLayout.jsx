import React, { useState, useEffect } from 'react';
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
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import {
  MENU_ITEMS,
  ROLES,
  ROLE_LABELS,
  ROLE_BADGE_COLORS,
  normalizeRole,
  hasPermission,
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
  BarChart3,
  AlertTriangle,
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

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  });

  const [pageTitle, setPageTitle] = useState('Sistema de Almacén');

  const [expandedSubmenus, setExpandedSubmenus] = useState({
    productos: true,
    movimientos: true,
  });

  const currentRole = normalizeRole(user);
  const roleBadgeStyle = ROLE_BADGE_COLORS[currentRole] || ROLE_BADGE_COLORS[ROLES.ALMACENERO];

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

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    const updatedUser = { ...user, rol: { nombre: newRole } };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
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
                    onClick={() => toggleSubmenu(item.id)}
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

        <div className="sidebar-footer">
          {!collapsed && (
            <div className="role-switcher-box">
              <div className="role-switcher-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} color="#38bdf8" /> Probador de Rol RBAC:
              </div>
              <select
                className="role-select"
                value={currentRole}
                onChange={handleRoleChange}
              >
                <option value={ROLES.ADMINISTRADOR}>👑 Administrador</option>
                <option value={ROLES.ALMACENERO}>📦 Almacenero</option>
                <option value={ROLES.SUPERVISOR}>🔍 Supervisor</option>
                <option value={ROLES.COMPRAS}>🛒 Compras</option>
                <option value={ROLES.GERENCIA}>📊 Gerencia</option>
              </select>
            </div>
          )}
        </div>
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
    </div>
  );
}
