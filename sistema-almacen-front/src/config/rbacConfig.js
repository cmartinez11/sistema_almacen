import { useState, useEffect } from 'react';

// Configuración de Roles y Permisos RBAC para Sistema de Almacén

export const ROLES = {
  ADMINISTRADOR: 'administrador',
  ALMACENERO: 'almacenero',
  SUPERVISOR: 'supervisor',
  COMPRAS: 'compras',
  GERENCIA: 'gerencia',
  RESPONSABLE_AREA: 'responsable_area',
};

export const ROLE_LABELS = {
  [ROLES.ADMINISTRADOR]: 'Administrador de Sistema',
  [ROLES.ALMACENERO]: 'Almacenero Operativo',
  [ROLES.SUPERVISOR]: 'Supervisor de Almacén',
  [ROLES.COMPRAS]: 'Gestión de Compras',
  [ROLES.GERENCIA]: 'Gerencia / Directiva',
  [ROLES.RESPONSABLE_AREA]: 'Responsable de Área (E-commerce)',
};

export const ROLE_BADGE_COLORS = {
  [ROLES.ADMINISTRADOR]: { bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5' },
  [ROLES.ALMACENERO]: { bg: '#EFF6FF', color: '#2563EB', border: '#93C5FD' },
  [ROLES.SUPERVISOR]: { bg: '#F0FDF4', color: '#16A34A', border: '#86EFAC' },
  [ROLES.COMPRAS]: { bg: '#FFF7ED', color: '#EA580C', border: '#FDBA74' },
  [ROLES.GERENCIA]: { bg: '#FAF5FF', color: '#9333EA', border: '#D8B4FE' },
  [ROLES.RESPONSABLE_AREA]: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
};

export const normalizeRole = (user) => {
  if (!user) return '';
  let roleStr = '';

  if (typeof user.rol === 'string') {
    roleStr = user.rol;
  } else if (user.rol?.nombre) {
    roleStr = user.rol.nombre;
  } else if (user.rol?.name) {
    roleStr = user.rol.name;
  } else if (typeof user.role === 'string') {
    roleStr = user.role;
  } else if (user.role?.nombre) {
    roleStr = user.role.nombre;
  } else if (user.role?.name) {
    roleStr = user.role.name;
  }

  const normalized = roleStr
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (normalized.includes('responsable') || normalized.includes('area') || normalized.includes('solicitante')) {
    return ROLES.RESPONSABLE_AREA;
  }
  if (normalized.includes('almacen') || normalized.includes('operador') || normalized.includes('planta')) {
    return ROLES.ALMACENERO;
  }
  if (normalized.includes('supervis')) {
    return ROLES.SUPERVISOR;
  }
  if (normalized.includes('compra')) {
    return ROLES.COMPRAS;
  }
  if (normalized.includes('geren')) {
    return ROLES.GERENCIA;
  }
  if (normalized.includes('admin')) {
    return ROLES.ADMINISTRADOR;
  }

  return normalized || ROLES.ADMINISTRADOR;
};

export const hasPermission = (user, allowedRoles = []) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const userRole = normalizeRole(user);
  return allowedRoles.includes(userRole);
};

/**
 * Matriz de Permisos Financieros:
 * - Rol Compras / Administrador / Gerencia: Acceso completo con costos y precios.
 * - Rol Almacén / Supervisor: Enfoque estrictamente en control físico (costos y precios ocultos).
 */
export const canViewFinancials = (user) => {
  const role = normalizeRole(user);
  return role === ROLES.ADMINISTRADOR || role === ROLES.COMPRAS || role === ROLES.GERENCIA;
};

/**
 * Hook reactivo para sincronizar cualquier vista ante cambios de rol activo en el probador o sesión.
 */
export const useRole = () => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        setUser(JSON.parse(localStorage.getItem('user')) || {});
      } catch {
        setUser({});
      }
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('roleChanged', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('roleChanged', handleUpdate);
    };
  }, []);

  const role = normalizeRole(user);
  const canViewPrices = canViewFinancials(user);

  return { user, role, canViewPrices };
};

export const MENU_ITEMS = [
  {
    id: 'solicitudes-area',
    title: 'Solicitudes de Área (E-commerce)',
    icon: 'ShoppingBag',
    path: '/solicitudes-area',
    allowedRoles: [ROLES.RESPONSABLE_AREA, ROLES.ADMINISTRADOR, ROLES.COMPRAS, ROLES.SUPERVISOR],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: 'LayoutDashboard',
    path: '/dashboard',
    allowedRoles: [ROLES.ADMINISTRADOR, ROLES.GERENCIA, ROLES.ALMACENERO, ROLES.SUPERVISOR, ROLES.COMPRAS],
  },
  {
    id: 'productos',
    title: 'Productos & Catálogos',
    icon: 'Package',
    allowedRoles: [ROLES.ADMINISTRADOR, ROLES.COMPRAS, ROLES.ALMACENERO, ROLES.SUPERVISOR, ROLES.GERENCIA],
    children: [
      {
        id: 'productos-catalogo',
        title: 'Catálogo de Productos',
        path: '/productos/catalogo',
        icon: 'Boxes',
        allowedRoles: [ROLES.ADMINISTRADOR, ROLES.COMPRAS, ROLES.ALMACENERO, ROLES.SUPERVISOR, ROLES.GERENCIA],
      },
      {
        id: 'productos-categorias',
        title: 'Categorías',
        path: '/productos/categorias',
        icon: 'Tags',
        allowedRoles: [ROLES.ADMINISTRADOR, ROLES.COMPRAS, ROLES.ALMACENERO, ROLES.SUPERVISOR, ROLES.GERENCIA],
      },
      {
        id: 'productos-unidades',
        title: 'Unidades de Medida',
        path: '/productos/unidades',
        icon: 'Scale',
        allowedRoles: [ROLES.ADMINISTRADOR, ROLES.COMPRAS, ROLES.ALMACENERO, ROLES.SUPERVISOR, ROLES.GERENCIA],
      },
    ],
  },
  {
    id: 'movimientos',
    title: 'Movimientos de Almacén',
    icon: 'ArrowLeftRight',
    allowedRoles: [ROLES.ADMINISTRADOR, ROLES.ALMACENERO, ROLES.SUPERVISOR, ROLES.GERENCIA],
    children: [
      {
        id: 'movimientos-ingresos',
        title: 'Notas de Ingreso',
        path: '/movimientos/ingresos',
        icon: 'ArrowDownLeft',
        allowedRoles: [ROLES.ADMINISTRADOR, ROLES.ALMACENERO, ROLES.SUPERVISOR],
      },
      {
        id: 'movimientos-salidas',
        title: 'Notas de Salida',
        path: '/movimientos/salidas',
        icon: 'ArrowUpRight',
        allowedRoles: [ROLES.ADMINISTRADOR, ROLES.ALMACENERO, ROLES.SUPERVISOR],
      },
      {
        id: 'movimientos-prestamos',
        title: 'Préstamo de Herramientas',
        path: '/movimientos/prestamos',
        icon: 'Wrench',
        allowedRoles: [ROLES.ADMINISTRADOR, ROLES.ALMACENERO, ROLES.SUPERVISOR],
      },
      {
        id: 'movimientos-transferencias',
        title: 'Transferencias',
        path: '/movimientos/transferencias',
        icon: 'ArrowLeftRight',
        allowedRoles: [ROLES.ADMINISTRADOR, ROLES.ALMACENERO, ROLES.SUPERVISOR],
      },
      {
        id: 'movimientos-inventario-fisico',
        title: 'Inventario Físico (Ajustes)',
        path: '/movimientos/inventario-fisico',
        icon: 'ClipboardList',
        allowedRoles: [ROLES.ADMINISTRADOR],
      },
    ],
  },
  {
    id: 'requerimientos',
    title: 'Requerimientos',
    icon: 'ClipboardList',
    path: '/requerimientos',
    allowedRoles: [ROLES.ADMINISTRADOR, ROLES.ALMACENERO, ROLES.COMPRAS],
  },
  {
    id: 'proveedores',
    title: 'Proveedores',
    icon: 'Truck',
    path: '/proveedores',
    allowedRoles: [ROLES.ADMINISTRADOR, ROLES.COMPRAS],
  },
  {
    id: 'personal',
    title: 'Trabajadores / Personal',
    icon: 'Users',
    path: '/personal',
    allowedRoles: [ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.ALMACENERO],
  },
  {
    id: 'usuarios',
    title: 'Usuarios & Accesos',
    icon: 'ShieldCheck',
    path: '/usuarios',
    allowedRoles: [ROLES.ADMINISTRADOR],
  },
  {
    id: 'reportes',
    title: 'Reportes & Analítica',
    icon: 'BarChart3',
    allowedRoles: [ROLES.ADMINISTRADOR, ROLES.GERENCIA, ROLES.SUPERVISOR, ROLES.ALMACENERO, ROLES.COMPRAS],
    children: [
      {
        id: 'reportes-analitica',
        title: 'Panel de Reportes',
        path: '/reportes',
        icon: 'BarChart3',
        allowedRoles: [ROLES.ADMINISTRADOR, ROLES.GERENCIA, ROLES.SUPERVISOR],
      },
      {
        id: 'reportes-kardex-fisico',
        title: 'Kardex Físico',
        path: '/reportes/kardex-fisico',
        icon: 'FileText',
        allowedRoles: [ROLES.ADMINISTRADOR, ROLES.ALMACENERO, ROLES.SUPERVISOR, ROLES.GERENCIA],
      },
      {
        id: 'reportes-kardex-valorizado',
        title: 'Kardex Valorizado',
        path: '/reportes/kardex-valorizado',
        icon: 'DollarSign',
        allowedRoles: [ROLES.ADMINISTRADOR, ROLES.COMPRAS, ROLES.GERENCIA],
      },
      {
        id: 'reportes-stock-critico',
        title: 'Stock Crítico',
        path: '/reportes/stock-critico',
        icon: 'AlertTriangle',
        allowedRoles: [ROLES.ADMINISTRADOR, ROLES.GERENCIA, ROLES.SUPERVISOR, ROLES.ALMACENERO, ROLES.COMPRAS],
      },
    ],
  },
];
