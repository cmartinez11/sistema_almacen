import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasPermission } from '../config/rbacConfig';

/**
 * Guard de rutas que verifica autenticación y permisos según rol (RBAC).
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    // Redirigir a login conservando el origen para redirección posterior
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar RBAC si la ruta especifica roles permitidos
  if (allowedRoles && !hasPermission(user, allowedRoles)) {

    const rolStr = (user?.rol?.nombre || user?.role || user?.rol || '').toUpperCase();

    const rutaDestino = (rolStr.includes('SOLICITANTE') || rolStr.includes('RESPONSABLE'))
      ? '/solicitudes-area'
      : '/dashboard';

    return <Navigate to={rutaDestino} replace />;
  }

  return children;
};

export default ProtectedRoute;
