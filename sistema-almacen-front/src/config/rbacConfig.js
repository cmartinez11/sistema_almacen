// Configuración de Roles y Permisos RBAC para Sistema de Almacén

export const ROLES = {
  ADMINISTRADOR: 'administrador',
  ALMACENERO: 'almacenero',
  SUPERVISOR: 'supervisor',
  COMPRAS: 'compras',
  GERENCIA: 'gerencia',
};

export const ROLE_LABELS = {
  [ROLES.ADMINISTRADOR]: 'Administrador de Sistema',
  [ROLES.ALMACENERO]: 'Almacenero Operativo',
  [ROLES.SUPERVISOR]: 'Supervisor de Almacén',
  [ROLES.COMPRAS]: 'Gestión de Compras',
  [ROLES.GERENCIA]: 'Gerencia / Directiva',
};

export const ROLE_BADGE_COLORS = {
  [ROLES.ADMINISTRADOR]: { bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5' },
  [ROLES.ALMACENERO]: { bg: '#EFF6FF', color: '#2563EB', border: '#93C5FD' },
  [ROLES.SUPERVISOR]: { bg: '#F0FDF4', color: '#16A34A', border: '#86EFAC' },
  [ROLES.COMPRAS]: { bg: '#FFF7ED', color: '#EA580C', border: '#FDBA74' },
  [ROLES.GERENCIA]: { bg: '#FAF5FF', color: '#9333EA', border: '#D8B4FE' },
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

  return normalized || ROLES.ADMINISTRADOR;
};

export const hasPermission = (user, allowedRoles = []) => {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const userRole = normalizeRole(user);
  return allowedRoles.includes(userRole);
};

export const MENU_ITEMS = [
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
    allowedRoles: [ROLES.ADMINISTRADOR, ROLES.ALMACENERO, ROLES.SUPERVISOR, ROLES.GERENCIA],
    children: [
      {
        id: 'productos-catalogo',
        title: 'Catálogo de Productos',
        path: '/productos/catalogo',
        icon: 'Boxes',
        allowedRoles: [ROLES.ADMINISTRADOR, ROLES.ALMACENERO, ROLES.SUPERVISOR, ROLES.GERENCIA],
      },
      {
        id: 'productos-categorias',
        title: 'Categorías',
        path: '/productos/categorias',
        icon: 'Tags',
        allowedRoles: [ROLES.ADMINISTRADOR, ROLES.ALMACENERO],
      },
      {
        id: 'productos-unidades',
        title: 'Unidades de Medida',
        path: '/productos/unidades',
        icon: 'Scale',
        allowedRoles: [ROLES.ADMINISTRADOR, ROLES.ALMACENERO],
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
        id: 'movimientos-kardex-fisico',
        title: 'Kardex Físico',
        path: '/movimientos/kardex-fisico',
        icon: 'FileText',
        allowedRoles: [ROLES.ADMINISTRADOR, ROLES.ALMACENERO, ROLES.SUPERVISOR, ROLES.GERENCIA],
      },
      {
        id: 'movimientos-kardex-valorizado',
        title: 'Kardex Valorizado',
        path: '/movimientos/kardex-valorizado',
        icon: 'DollarSign',
        allowedRoles: [ROLES.ADMINISTRADOR, ROLES.ALMACENERO, ROLES.GERENCIA],
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
    id: 'reportes',
    title: 'Reportes & Analítica',
    icon: 'BarChart3',
    path: '/reportes',
    allowedRoles: [ROLES.ADMINISTRADOR, ROLES.GERENCIA, ROLES.SUPERVISOR],
  },
];
