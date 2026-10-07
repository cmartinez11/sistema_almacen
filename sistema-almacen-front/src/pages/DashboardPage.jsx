import React from 'react';
import { 
  Package, 
  AlertTriangle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ClipboardCheck, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Clock 
} from 'lucide-react';
import { normalizeRole, ROLES, ROLE_LABELS } from '../config/rbacConfig';
import './pagesCommon.css';

export default function DashboardPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = normalizeRole(user);

  // Datos mock iniciales adaptados a los KPIs requeridos
  const metrics = {
    totalProductos: 1420,
    stockBajo: 18,
    entradasMes: 154,
    salidasMes: 230,
    requerimientosPendientes: 7,
    valorInventario: 'S/ 485,250.00',
    proveedoresActivos: 34,
  };

  return (
    <div className="page-container">
      {/* Banner de Bienvenida según Rol */}
      <div className="page-header-card" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff' }}>
        <div className="page-title-group">
          <h2 style={{ color: '#fff' }}>
            ¡Bienvenido, {user.name || user.nombres || 'Usuario'}! 👋
          </h2>
          <p style={{ color: '#94a3b8' }}>
            Panel de control principal - Rol activo: <strong style={{ color: '#38bdf8' }}>{ROLE_LABELS[role] || role}</strong>
          </p>
        </div>
        <div>
          <span className="badge badge-info" style={{ fontSize: '13px', padding: '6px 12px' }}>
            Estado del Sistema: 🟢 Operativo
          </span>
        </div>
      </div>

      {/* Grilla de KPIs Adaptada por Rol */}
      <div className="kpi-grid">
        {/* KPI: Total Productos (Visible para todos) */}
        <div className="kpi-card">
          <div className="kpi-info">
            <span>Total Productos</span>
            <h3>{metrics.totalProductos}</h3>
          </div>
          <div className="kpi-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Package size={24} />
          </div>
        </div>

        {/* KPI: Stock Bajo (Visible para Almacenero, Supervisor, Administrador, Gerencia) */}
        <div className="kpi-card">
          <div className="kpi-info">
            <span>Stock Bajo / Alerta</span>
            <h3 style={{ color: '#dc2626' }}>{metrics.stockBajo} ítems</h3>
          </div>
          <div className="kpi-icon-box" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* KPI: Entradas del Mes */}
        <div className="kpi-card">
          <div className="kpi-info">
            <span>Entradas del Mes</span>
            <h3>{metrics.entradasMes}</h3>
          </div>
          <div className="kpi-icon-box" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <ArrowDownLeft size={24} />
          </div>
        </div>

        {/* KPI: Salidas del Mes */}
        <div className="kpi-card">
          <div className="kpi-info">
            <span>Salidas del Mes</span>
            <h3>{metrics.salidasMes}</h3>
          </div>
          <div className="kpi-icon-box" style={{ background: '#fff7ed', color: '#ea580c' }}>
            <ArrowUpRight size={24} />
          </div>
        </div>

        {/* KPI: Requerimientos Pendientes (Muy importante para Compras y Almacén) */}
        <div className="kpi-card">
          <div className="kpi-info">
            <span>Req. Pendientes</span>
            <h3 style={{ color: '#d97706' }}>{metrics.requerimientosPendientes}</h3>
          </div>
          <div className="kpi-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
            <ClipboardCheck size={24} />
          </div>
        </div>

        {/* KPI Finanzas / Valorizado (Gerencia, Administrador, Almacenero) */}
        {(role === ROLES.GERENCIA || role === ROLES.ADMINISTRADOR || role === ROLES.ALMACENERO) && (
          <div className="kpi-card">
            <div className="kpi-info">
              <span>Valor Total Inventario</span>
              <h3 style={{ color: '#059669' }}>{metrics.valorInventario}</h3>
            </div>
            <div className="kpi-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
              <DollarSign size={24} />
            </div>
          </div>
        )}
      </div>

      {/* Sección de Resumen y Accesos Rápidos según Rol */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Tabla de Actividades / Alertas Recientes */}
        <div className="table-card" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#2563eb" /> ÚLTIMOS MOVIMIENTOS Y NOTIFICACIONES
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #ef4444', fontSize: '13px' }}>
              <strong>Alerta Stock Crítico:</strong> Cable Unipolar 4mm tiene solo 5 metros restantes (Mínimo: 20).
            </li>
            <li style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6', fontSize: '13px' }}>
              <strong>Nota de Ingreso NI-2026-089:</strong> Recepción de 100 Tubos PVC 1/2" desde PROVEEDOR ABC S.A.
            </li>
            <li style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #f59e0b', fontSize: '13px' }}>
              <strong>Solicitud de Material:</strong> Requerimiento REQ-042 enviado a Compras por el área técnica.
            </li>
          </ul>
        </div>

        {/* Cuadro de Enfoque Específico por Rol */}
        <div className="table-card" style={{ padding: '20px', background: '#f8fafc' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#16a34a" /> RESUMEN EJECUTIVO ({ROLE_LABELS[role] || role})
          </h3>
          
          {role === ROLES.ALMACENERO && (
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.6' }}>
              Tiene <strong>{metrics.stockBajo} productos</strong> por debajo del límite mínimo. Registre notas de ingreso/salida oportunamente y mantenga actualizado el kardex.
            </p>
          )}

          {role === ROLES.SUPERVISOR && (
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.6' }}>
              Supervisión de trazabilidad activa: Se registran <strong>{metrics.entradasMes} entradas</strong> y <strong>{metrics.salidasMes} salidas</strong> este mes. Monitoree las asignaciones al personal.
            </p>
          )}

          {role === ROLES.COMPRAS && (
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.6' }}>
              Hay <strong>{metrics.requerimientosPendientes} requerimientos de material</strong> en espera de aprobación de orden de compra. Revise la bandeja de entrada de requerimientos.
            </p>
          )}

          {role === ROLES.GERENCIA && (
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.6' }}>
              Valor de inventario global: <strong>{metrics.valorInventario}</strong>. El nivel general de rotación se encuentra dentro de los parámetros previstos.
            </p>
          )}

          {role === ROLES.ADMINISTRADOR && (
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.6' }}>
              Acceso total al sistema de almacenaje. Puede administrar usuarios, catálogos de productos, unidades de medida, categorías y consultar auditorías de kardex.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
