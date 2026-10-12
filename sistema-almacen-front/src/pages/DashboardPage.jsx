import React, { useState, useEffect } from 'react';
import { 
  Package, 
  AlertTriangle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ClipboardCheck, 
  TrendingUp, 
  DollarSign, 
  Clock,
  ArrowRight,
  ShieldAlert,
  ShoppingCart
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { normalizeRole, ROLES, ROLE_LABELS } from '../config/rbacConfig';
import api from '../services/api';
import './pagesCommon.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = normalizeRole(user);

  const [criticos, setCriticos] = useState([]);
  const [loadingCriticos, setLoadingCriticos] = useState(true);

  // Datos mock iniciales adaptados a los KPIs requeridos
  const [metrics, setMetrics] = useState({
    totalProductos: 0,
    stockBajo: 0,
    entradasMes: 154,
    salidasMes: 230,
    requerimientosPendientes: 7,
    valorInventario: 'S/ 0.00',
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoadingCriticos(true);
      const [resCriticos, resProductos] = await Promise.all([
        api.get('/reportes/stock-critico'),
        api.get('/productos'),
      ]);

      const criticosList = resCriticos.data?.data || [];
      setCriticos(Array.isArray(criticosList) ? criticosList : []);

      const prodsList = resProductos.data?.data?.data || resProductos.data?.data || [];
      const totalProds = Array.isArray(prodsList) ? prodsList.length : 0;

      setMetrics((prev) => ({
        ...prev,
        totalProductos: totalProds,
        stockBajo: criticosList.length,
      }));
    } catch (err) {
      console.error('Error al cargar métricas de dashboard:', err);
    } finally {
      setLoadingCriticos(false);
    }
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

        {/* KPI: Stock Bajo / Crítico */}
        <div className="kpi-card" onClick={() => navigate('/reportes/stock-critico')} style={{ cursor: 'pointer' }}>
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
      </div>

      {/* SECCIÓN DESTACADA: ALERTAS DE STOCK CRÍTICO */}
      {criticos.length > 0 && (
        <div className="table-card" style={{ padding: '20px', borderLeft: '6px solid #dc2626', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} color="#dc2626" />
              <h3 style={{ margin: 0, fontSize: '16px', color: '#991b1b', fontWeight: '800' }}>
                ALERTAS DE STOCK CRÍTICO Y DESABASTECIMIENTO ({criticos.length} ÍTEMS)
              </h3>
            </div>
            <Link to="/reportes/stock-critico" style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
              Ver Todos los Críticos <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {criticos.slice(0, 4).map((item) => (
              <div
                key={`${item.id}-${item.almacen_id}`}
                style={{
                  padding: '12px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#dc2626', fontWeight: '800' }}>
                    {item.sku}
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>{item.nombre}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{item.almacen_nombre}</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="badge" style={{ background: item.stock_actual === 0 ? '#7f1d1d' : '#dc2626', color: '#fff', fontSize: '11px', padding: '4px 8px' }}>
                    {item.stock_actual === 0 ? 'AGOTADO (0)' : `Stock: ${item.stock_actual} u.`}
                  </span>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Mínimo: {item.stock_minimo} u.</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen Ejecutivo según Rol */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '16px' }}>
        <div className="table-card" style={{ padding: '20px', background: '#f8fafc' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#16a34a" /> RESUMEN EJECUTIVO ({ROLE_LABELS[role] || role})
          </h3>
          
          <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.6' }}>
            Se detectan <strong>{criticos.length} productos con nivel de alerta</strong>. Revise el panel de alertas de reabastecimiento para mantener la operatividad de los almacenes.
          </p>
        </div>
      </div>
    </div>
  );
}
