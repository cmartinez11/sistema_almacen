import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  X,
  UserCheck,
  Building2,
  Calendar,
  Package,
  FileText,
  Eye,
  Check,
  Info,
  Layers,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import api from '../../services/api';
import { useRole } from '../../config/rbacConfig';
import { obtenerImagenProducto, handleProductImageError } from '../../utils/productImages';
import '../pagesCommon.css';

export default function PrestamosPage() {
  const { user } = useRole();

  // Estados principales
  const [prestamos, setPrestamos] = useState([]);
  const [personalList, setPersonalList] = useState([]);
  const [productosList, setProductosList] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [activeTab, setActiveTab] = useState('activos'); // 'activos' | 'devueltos' | 'todos'
  const [searchTerm, setSearchTerm] = useState('');
  const [almacenFilter, setAlmacenFilter] = useState('todos');

  // Modal Nuevo Préstamo
  const [showNewModal, setShowNewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Formulario de Préstamo
  const [formAlmacenId, setFormAlmacenId] = useState('');
  const [formTrabajadorId, setFormTrabajadorId] = useState('');
  const [workerSearch, setWorkerSearch] = useState('');
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const workerDropdownRef = useRef(null);

  const [formProductoId, setFormProductoId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productDropdownRef = useRef(null);

  const [formCantidad, setFormCantidad] = useState(1);
  const [formFechaDevolucion, setFormFechaDevolucion] = useState(() => {
    // Fecha por defecto: 7 días después de hoy
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [formObservaciones, setFormObservaciones] = useState('');

  // Modal de Devolución Rápida
  const [showDevolverModal, setShowDevolverModal] = useState(false);
  const [devolviendoItem, setDevolviendoItem] = useState(null);
  const [condicionFisica, setCondicionFisica] = useState('Operativa / En Buen Estado');
  const [obsDevolucion, setObsDevolucion] = useState('');
  const [submittingDevolver, setSubmittingDevolver] = useState(false);

  // Modal Ver Detalle
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [selectedPrestamo, setSelectedPrestamo] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  // Cerrar dropdowns al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (workerDropdownRef.current && !workerDropdownRef.current.contains(e.target)) {
        setShowWorkerDropdown(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resPrestamos, resPers, resProd, resAlm] = await Promise.all([
        api.get('/prestamos'),
        api.get('/personal'),
        api.get('/productos'),
        api.get('/almacenes'),
      ]);

      const dataPrestamos = resPrestamos.data?.data || [];
      setPrestamos(Array.isArray(dataPrestamos) ? dataPrestamos : []);

      const dataPers = resPers.data?.data || resPers.data || [];
      setPersonalList(Array.isArray(dataPers) ? dataPers : []);

      const dataProd = resProd.data?.data?.data || resProd.data?.data || resProd.data || [];
      setProductosList(Array.isArray(dataProd) ? dataProd : []);

      const dataAlm = resAlm.data?.data || resAlm.data || [];
      setAlmacenes(Array.isArray(dataAlm) ? dataAlm : []);
      if (dataAlm.length > 0 && !formAlmacenId) {
        setFormAlmacenId(dataAlm[0].id);
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper de cálculo de stock en almacén seleccionado
  const getStockForWarehouse = (prod, almId) => {
    if (!prod) return 0;
    if (Array.isArray(prod.almacenes)) {
      const alm = prod.almacenes.find((a) => String(a.id) === String(almId));
      if (alm && alm.pivot) return Number(alm.pivot.stock || 0);
    }
    return Number(prod.stock_actual || 0);
  };

  // Helper de diferencia de días para vencimientos
  const getDaysDiff = (targetDate) => {
    if (!targetDate) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // KPIs
  const kpis = useMemo(() => {
    let activos = 0;
    let devueltos = 0;
    let vencidos = 0;

    prestamos.forEach((p) => {
      if (p.estado === 'DEVUELTO') {
        devueltos++;
      } else {
        activos++;
        const days = getDaysDiff(p.fecha_devolucion_estimada);
        if (days < 0 || p.estado === 'VENCIDO') {
          vencidos++;
        }
      }
    });

    return { activos, devueltos, vencidos, total: prestamos.length };
  }, [prestamos]);

  // Filtrado de lista principal
  const filteredPrestamos = useMemo(() => {
    return prestamos.filter((p) => {
      // Filtro de pestaña
      if (activeTab === 'activos' && p.estado === 'DEVUELTO') return false;
      if (activeTab === 'devueltos' && p.estado !== 'DEVUELTO') return false;

      // Filtro de almacén
      if (almacenFilter !== 'todos' && String(p.almacen_id) !== String(almacenFilter)) {
        return false;
      }

      // Buscador
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const codigo = (p.codigo || '').toLowerCase();
        const obs = (p.observacion_prestamo || '').toLowerCase();
        const obsDev = (p.observacion_devolucion || '').toLowerCase();
        const trabajador = `${p.trabajador?.nombres || ''} ${p.trabajador?.apellidos || ''} ${p.trabajador?.dni || ''}`.toLowerCase();
        const producto = `${p.producto?.nombre || ''} ${p.producto?.sku || ''}`.toLowerCase();

        return (
          codigo.includes(term) ||
          trabajador.includes(term) ||
          producto.includes(term) ||
          obs.includes(term) ||
          obsDev.includes(term)
        );
      }

      return true;
    });
  }, [prestamos, activeTab, almacenFilter, searchTerm]);

  // Trabajadores filtrados para el modal de nuevo préstamo
  const filteredWorkers = useMemo(() => {
    if (!workerSearch) return personalList.slice(0, 10);
    const term = workerSearch.toLowerCase();
    return personalList.filter((w) => {
      const full = `${w.nombres || ''} ${w.apellidos || ''} ${w.dni || ''} ${w.area || ''}`.toLowerCase();
      return full.includes(term);
    }).slice(0, 15);
  }, [personalList, workerSearch]);

  const selectedWorkerObj = useMemo(() => {
    return personalList.find((w) => String(w.id) === String(formTrabajadorId));
  }, [personalList, formTrabajadorId]);

  // Herramientas filtradas para el modal
  const filteredProducts = useMemo(() => {
    if (!productSearch) return productosList.slice(0, 10);
    const term = productSearch.toLowerCase();
    return productosList.filter((p) => {
      const text = `${p.nombre || ''} ${p.sku || ''} ${p.categoria?.nombre || ''}`.toLowerCase();
      return text.includes(term);
    }).slice(0, 15);
  }, [productosList, productSearch]);

  const selectedProductObj = useMemo(() => {
    return productosList.find((p) => String(p.id) === String(formProductoId));
  }, [productosList, formProductoId]);

  const selectedProductStock = useMemo(() => {
    return getStockForWarehouse(selectedProductObj, formAlmacenId);
  }, [selectedProductObj, formAlmacenId]);

  // Reset y apertura de modal nuevo
  const handleOpenNewModal = () => {
    setFormError('');
    setFormTrabajadorId('');
    setWorkerSearch('');
    setFormProductoId('');
    setProductSearch('');
    setFormCantidad(1);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setFormFechaDevolucion(d.toISOString().split('T')[0]);
    setFormObservaciones('');
    setShowNewModal(true);
  };

  // Enviar nuevo préstamo
  const handleSubmitNewPrestamo = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formAlmacenId) {
      setFormError('Por favor seleccione el almacén de origen.');
      return;
    }
    if (!formTrabajadorId) {
      setFormError('Por favor seleccione al trabajador receptor del implemento.');
      return;
    }
    if (!formProductoId) {
      setFormError('Por favor seleccione la herramienta o activo retornable.');
      return;
    }
    if (formCantidad <= 0) {
      setFormError('La cantidad prestada debe ser mayor a 0.');
      return;
    }
    if (formCantidad > selectedProductStock) {
      setFormError(
        `Stock insuficiente. El almacén solo cuenta con ${selectedProductStock} u. disponibles de este activo.`
      );
      return;
    }
    if (!formFechaDevolucion) {
      setFormError('Por favor indique la fecha estimada de retorno.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        almacen_id: Number(formAlmacenId),
        trabajador_id: Number(formTrabajadorId),
        producto_id: Number(formProductoId),
        cantidad: Number(formCantidad),
        fecha_devolucion_estimada: formFechaDevolucion,
        observacion_prestamo: formObservaciones.trim() || null,
        user_id: user?.id || null,
      };

      const res = await api.post('/prestamos', payload);

      if (res.data?.success) {
        setSuccessMsg(`Préstamo ${res.data?.data?.codigo || ''} registrado con éxito.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setShowNewModal(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
      setFormError(
        err.response?.data?.message || 'Error al registrar el préstamo. Verifique el stock disponible.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Abrir modal de devolución rápida
  const handleOpenDevolverModal = (item) => {
    setDevolviendoItem(item);
    setCondicionFisica('Operativa / En Buen Estado');
    setObsDevolucion('');
    setShowDevolverModal(true);
  };

  // Confirmar devolución y reingreso de stock
  const handleConfirmDevolucion = async (e) => {
    e.preventDefault();
    if (!devolviendoItem) return;

    try {
      setSubmittingDevolver(true);
      const payload = {
        condicion_fisica: condicionFisica,
        observacion_devolucion: obsDevolucion.trim() || null,
      };

      const res = await api.patch(`/prestamos/${devolviendoItem.id}/devolver`, payload);

      if (res.data?.success) {
        setSuccessMsg(
          `Herramienta (${devolviendoItem.codigo}) devuelta y stock reingresado a inventario exitosamente.`
        );
        setTimeout(() => setSuccessMsg(''), 4000);
        setShowDevolverModal(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error al procesar la devolución.');
    } finally {
      setSubmittingDevolver(false);
    }
  };

  // Abrir detalle
  const handleOpenDetalle = (item) => {
    setSelectedPrestamo(item);
    setShowDetalleModal(true);
  };

  return (
    <div className="page-container">
      {/* CABECERA PRINCIPAL */}
      <div className="page-header-card">
        <div className="page-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)',
              }}
            >
              <Wrench size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                Préstamo y Retorno de Herramientas / Activos
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>
                Control estricto de activos retornables: descuento automático al prestar y reingreso de stock al devolver.
              </p>
            </div>
          </div>
        </div>

        <button
          className="primary-btn"
          onClick={handleOpenNewModal}
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
        >
          <Plus size={18} /> Registrar Nuevo Préstamo
        </button>
      </div>

      {/* MENSAJE FLOTANTE DE ÉXITO */}
      {successMsg && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            color: '#166534',
            padding: '12px 18px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: '600',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(22, 101, 52, 0.08)',
          }}
        >
          <CheckCircle2 size={20} color="#16a34a" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TARJETAS KPI SUPERIORES */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* KPI 1: ACTIVOS EN PRÉSTAMO */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Herramientas Prestadas
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#2563eb', marginTop: '4px' }}>
              {kpis.activos}
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
              En poder del personal
            </div>
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={24} />
          </div>
        </div>

        {/* KPI 2: DEVUELTOS CON ÉXITO */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Retornos Exitosos
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
              {kpis.devueltos}
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
              Stock reincorporado
            </div>
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#f0fdf4',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* KPI 3: PRÉSTAMOS VENCIDOS */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: kpis.vencidos > 0 ? '1px solid #fca5a5' : '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: kpis.vencidos > 0 ? '#b91c1c' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Préstamos Vencidos
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: kpis.vencidos > 0 ? '#dc2626' : '#64748b', marginTop: '4px' }}>
              {kpis.vencidos}
            </div>
            <div style={{ fontSize: '11.5px', color: kpis.vencidos > 0 ? '#ef4444' : '#94a3b8', marginTop: '2px' }}>
              {kpis.vencidos > 0 ? 'Requiere seguimiento urgente' : 'Sin demoras operativas'}
            </div>
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: kpis.vencidos > 0 ? '#fef2f2' : '#f8fafc',
              color: kpis.vencidos > 0 ? '#dc2626' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* KPI 4: TOTAL REGISTRADOS */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Movimientos
            </div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
              {kpis.total}
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
              Historial acumulado
            </div>
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#f8fafc',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Layers size={24} />
          </div>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS Y PESTAÑAS */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '14px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        {/* PESTAÑAS INTERACTIVAS */}
        <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('activos')}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'activos' ? '#ffffff' : 'transparent',
              color: activeTab === 'activos' ? '#2563eb' : '#64748b',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'activos' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Clock size={15} /> Activos en Préstamo ({kpis.activos})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('devueltos')}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'devueltos' ? '#ffffff' : 'transparent',
              color: activeTab === 'devueltos' ? '#16a34a' : '#64748b',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'devueltos' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <CheckCircle2 size={15} /> Historial de Retornos ({kpis.devueltos})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('todos')}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'todos' ? '#ffffff' : 'transparent',
              color: activeTab === 'todos' ? '#0f172a' : '#64748b',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'todos' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Layers size={15} /> Todos ({kpis.total})
          </button>
        </div>

        {/* BUSCADOR Y FILTRO DE ALMACÉN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
          {/* BUSCADOR */}
          <div style={{ position: 'relative', minWidth: '280px', flex: '1', maxWidth: '400px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar por código, trabajador o herramienta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* SELECTOR DE ALMACÉN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={16} color="#64748b" />
            <select
              value={almacenFilter}
              onChange={(e) => setAlmacenFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: '600',
                color: '#334155',
                background: '#ffffff',
              }}
            >
              <option value="todos">Todos los Almacenes</option>
              {almacenes.map((alm) => (
                <option key={alm.id} value={alm.id}>
                  {alm.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE PRÉSTAMOS */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <Wrench size={36} style={{ animation: 'spin 2s linear infinite', color: '#3b82f6', margin: '0 auto 12px' }} />
            <div>Cargando registros de préstamos de herramientas...</div>
          </div>
        ) : filteredPrestamos.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <Wrench size={44} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ margin: 0, color: '#334155', fontSize: '16px' }}>No se encontraron préstamos</h4>
            <p style={{ margin: '4px 0 0', fontSize: '13px' }}>
              {activeTab === 'activos'
                ? 'Actualmente no hay herramientas pendientes de devolución.'
                : 'No existen registros para los filtros seleccionados.'}
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Código</th>
                <th>Herramienta / Activo</th>
                <th>Trabajador Receptor</th>
                <th>Almacén</th>
                <th>Fecha Préstamo</th>
                <th>Límite / Días</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center', width: '180px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrestamos.map((item) => {
                const isDevuelto = item.estado === 'DEVUELTO';
                const daysDiff = getDaysDiff(item.fecha_devolucion_estimada);
                const isVencido = !isDevuelto && (daysDiff < 0 || item.estado === 'VENCIDO');
                const isHoy = !isDevuelto && daysDiff === 0;

                const prodImg = obtenerImagenProducto(item.producto);
                const cant = Number(item.cantidad || 1);
                const unit = item.producto?.unidad_medida?.simbolo || 'u.';

                return (
                  <tr
                    key={item.id}
                    style={{
                      background: isVencido ? 'rgba(254, 242, 242, 0.4)' : 'transparent',
                    }}
                  >
                    {/* CÓDIGO */}
                    <td>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: '800',
                          color: '#2563eb',
                          fontSize: '12.5px',
                        }}
                      >
                        {item.codigo}
                      </span>
                    </td>

                    {/* HERRAMIENTA */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: '1px solid #e2e8f0',
                            flexShrink: 0,
                            background: '#f8fafc',
                          }}
                        >
                          <img
                            src={prodImg}
                            alt={item.producto?.nombre}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => handleProductImageError(e, item.producto?.sku)}
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                            {item.producto?.nombre || 'Herramienta'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px', marginTop: '2px' }}>
                            <span style={{ fontFamily: 'monospace', color: '#2563eb', fontWeight: '600' }}>
                              {item.producto?.sku}
                            </span>
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>
                              Cant: {cant} {unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* TRABAJADOR */}
                    <td>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>
                        {item.trabajador
                          ? `${item.trabajador.nombres || ''} ${item.trabajador.apellidos || ''}`.trim()
                          : 'Personal'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', gap: '6px' }}>
                        <span>DNI: {item.trabajador?.dni || '---'}</span>
                        {item.trabajador?.area && (
                          <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: '600', color: '#475569' }}>
                            {item.trabajador.area}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* ALMACÉN */}
                    <td>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                        {item.almacen?.nombre || 'Almacén Central'}
                      </span>
                    </td>

                    {/* FECHA PRÉSTAMO */}
                    <td>
                      <span style={{ fontSize: '12.5px', color: '#334155' }}>
                        {item.fecha_prestamo ? new Date(item.fecha_prestamo).toLocaleDateString() : '---'}
                      </span>
                    </td>

                    {/* FECHA LÍMITE / DÍAS */}
                    <td>
                      {isDevuelto ? (
                        <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>
                          Retornado el {new Date(item.fecha_devolucion_real || item.updated_at).toLocaleDateString()}
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: '700', color: isVencido ? '#dc2626' : '#334155' }}>
                            {item.fecha_devolucion_estimada ? new Date(item.fecha_devolucion_estimada).toLocaleDateString() : '---'}
                          </div>
                          <div style={{ fontSize: '11px', marginTop: '2px' }}>
                            {isVencido && (
                              <span style={{ color: '#dc2626', fontWeight: '700' }}>
                                ⚠️ Vencido hace {Math.abs(daysDiff)} {Math.abs(daysDiff) === 1 ? 'día' : 'días'}
                              </span>
                            )}
                            {isHoy && (
                              <span style={{ color: '#d97706', fontWeight: '700' }}>
                                ⏳ Vence Hoy
                              </span>
                            )}
                            {!isVencido && !isHoy && (
                              <span style={{ color: '#0284c7', fontWeight: '600' }}>
                                Faltan {daysDiff} días
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* ESTADO */}
                    <td>
                      {isDevuelto ? (
                        <span
                          style={{
                            background: '#f0fdf4',
                            color: '#16a34a',
                            border: '1px solid #bbf7d0',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Check size={13} /> Devuelto
                        </span>
                      ) : isVencido ? (
                        <span
                          style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <AlertTriangle size={13} /> Vencido
                        </span>
                      ) : (
                        <span
                          style={{
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={13} /> En Préstamo
                        </span>
                      )}
                    </td>

                    {/* ACCIONES */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {!isDevuelto && (
                          <button
                            type="button"
                            onClick={() => handleOpenDevolverModal(item)}
                            title="Registrar devolución de implemento"
                            style={{
                              background: '#16a34a',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)',
                            }}
                          >
                            <RotateCcw size={13} /> Retornar
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenDetalle(item)}
                          title="Ver detalle del préstamo"
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            padding: '6px 9px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: '12px',
                          }}
                        >
                          <Eye size={14} />
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

      {/* ======================================================== */}
      {/* MODAL 1: REGISTRAR NUEVO PRÉSTAMO */}
      {/* ======================================================== */}
      {showNewModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                    Registrar Préstamo de Herramienta / Activo
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                    El stock de la herramienta seleccionada se descontará automáticamente del almacén de origen.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowNewModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitNewPrestamo}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
                {formError && (
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* FILA 1: ALMACÉN ORIGEN */}
                <div className="form-group">
                  <label style={{ fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={15} color="#2563eb" /> Almacén de Origen (Custodia del Activo)
                  </label>
                  <select
                    value={formAlmacenId}
                    onChange={(e) => setFormAlmacenId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px',
                      fontWeight: '600',
                      background: '#f8fafc',
                    }}
                  >
                    {almacenes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} ({a.codigo})
                      </option>
                    ))}
                  </select>
                </div>

                {/* FILA 2: BUSCADOR DE TRABAJADOR RECEPTOR */}
                <div className="form-group" style={{ position: 'relative' }} ref={workerDropdownRef}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', color: '#0f172a' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={15} color="#16a34a" /> Trabajador Receptor del Implemento
                    </span>
                    {selectedWorkerObj && (
                      <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700' }}>
                        ✓ {selectedWorkerObj.area ? `Área: ${selectedWorkerObj.area}` : 'Seleccionado'}
                      </span>
                    )}
                  </label>

                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Escriba DNI o Nombre del trabajador..."
                      value={workerSearch}
                      onChange={(e) => {
                        setWorkerSearch(e.target.value);
                        setShowWorkerDropdown(true);
                        if (formTrabajadorId) setFormTrabajadorId('');
                      }}
                      onFocus={() => setShowWorkerDropdown(true)}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 34px',
                        borderRadius: '8px',
                        border: formTrabajadorId ? '1px solid #16a34a' : '1px solid #cbd5e1',
                        background: formTrabajadorId ? '#f0fdf4' : '#ffffff',
                        fontSize: '13.5px',
                        boxSizing: 'border-box',
                      }}
                    />
                    {workerSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setWorkerSearch('');
                          setFormTrabajadorId('');
                        }}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {/* LISTA DESPLEGABLE DE TRABAJADORES */}
                  {showWorkerDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        marginTop: '4px',
                      }}
                    >
                      {filteredWorkers.length === 0 ? (
                        <div style={{ padding: '10px 14px', fontSize: '12.5px', color: '#64748b' }}>
                          No se encontró personal con ese criterio
                        </div>
                      ) : (
                        filteredWorkers.map((w) => (
                          <div
                            key={w.id}
                            onClick={() => {
                              setFormTrabajadorId(w.id);
                              setWorkerSearch(`${w.nombres} ${w.apellidos} (DNI: ${w.dni || '---'})`);
                              setShowWorkerDropdown(false);
                            }}
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '13px',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                          >
                            <div>
                              <strong style={{ color: '#0f172a' }}>{w.nombres} {w.apellidos}</strong>
                              <span style={{ fontSize: '11.5px', color: '#64748b', marginLeft: '6px' }}>
                                DNI: {w.dni}
                              </span>
                            </div>
                            {w.area && (
                              <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#475569', fontWeight: '600' }}>
                                {w.area}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* FILA 3: BUSCADOR DE HERRAMIENTA / PRODUCTO */}
                <div className="form-group" style={{ position: 'relative' }} ref={productDropdownRef}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '700', color: '#0f172a' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Wrench size={15} color="#ea580c" /> Herramienta / Activo Retornable
                    </span>
                    {selectedProductObj && (
                      <span style={{ fontSize: '11px', fontWeight: '800', color: selectedProductStock > 0 ? '#16a34a' : '#dc2626' }}>
                        ● Stock en Almacén: {selectedProductStock} {selectedProductObj.unidad_medida?.simbolo || 'u.'}
                      </span>
                    )}
                  </label>

                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Buscar herramienta por SKU o nombre..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                        if (formProductoId) setFormProductoId('');
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 34px',
                        borderRadius: '8px',
                        border: formProductoId ? '1px solid #ea580c' : '1px solid #cbd5e1',
                        background: formProductoId ? '#fff7ed' : '#ffffff',
                        fontSize: '13.5px',
                        boxSizing: 'border-box',
                      }}
                    />
                    {productSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearch('');
                          setFormProductoId('');
                        }}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {/* LISTA DESPLEGABLE DE PRODUCTOS */}
                  {showProductDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        marginTop: '4px',
                      }}
                    >
                      {filteredProducts.length === 0 ? (
                        <div style={{ padding: '10px 14px', fontSize: '12.5px', color: '#64748b' }}>
                          No se encontraron herramientas con ese nombre
                        </div>
                      ) : (
                        filteredProducts.map((p) => {
                          const stock = getStockForWarehouse(p, formAlmacenId);
                          const img = obtenerImagenProducto(p);
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                setFormProductoId(p.id);
                                setProductSearch(`${p.sku} - ${p.nombre}`);
                                setShowProductDropdown(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                borderBottom: '1px solid #f1f5f9',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '13px',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                                  <img src={img} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => handleProductImageError(e, p.sku)} />
                                </div>
                                <div>
                                  <div style={{ fontWeight: '700', color: '#0f172a' }}>{p.nombre}</div>
                                  <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{p.sku}</div>
                                </div>
                              </div>
                              <span style={{ fontSize: '11.5px', fontWeight: '800', color: stock > 0 ? '#16a34a' : '#dc2626' }}>
                                {stock > 0 ? `Stock: ${stock} ${p.unidad_medida?.simbolo || 'u.'}` : 'Sin Stock'}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* FILA 4: CANTIDAD Y FECHA DEVOLUCIÓN ESTIMADA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: '700', color: '#0f172a' }}>
                      Cantidad a Prestar
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      max={selectedProductStock || 9999}
                      value={formCantidad}
                      onChange={(e) => setFormCantidad(Number(e.target.value))}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        fontWeight: '700',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: '700', color: '#0f172a' }}>
                      Fecha Límite de Retorno (Estimada)
                    </label>
                    <input
                      type="date"
                      value={formFechaDevolucion}
                      onChange={(e) => setFormFechaDevolucion(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* FILA 5: JUSTIFICACIÓN / OBRA */}
                <div className="form-group">
                  <label style={{ fontWeight: '700', color: '#0f172a' }}>
                    Motivo / Orden de Trabajo / Justificación
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Ej. Mantenimiento de tableros eléctricos en taller - OT-102"
                    value={formObservaciones}
                    onChange={(e) => setFormObservaciones(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      resize: 'none',
                    }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowNewModal(false)}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submitting || (selectedProductStock <= 0 && !!formProductoId)}
                  style={{
                    background: (selectedProductStock <= 0 && !!formProductoId)
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  }}
                >
                  {submitting ? 'Registrando...' : 'Confirmar y Descontar Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CONFIRMAR DEVOLUCIÓN RÁPIDA / RETORNO */}
      {/* ======================================================== */}
      {showDevolverModal && devolviendoItem && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#f0fdf4',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                    Registrar Devolución de Herramienta
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                    Reingreso automático al inventario del almacén ({devolviendoItem.almacen?.nombre}).
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowDevolverModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmDevolucion}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0' }}>
                {/* TARJETA RESUMEN DEL ÍTEM */}
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid #cbd5e1',
                      flexShrink: 0,
                      background: '#ffffff',
                    }}
                  >
                    <img
                      src={obtenerImagenProducto(devolviendoItem.producto)}
                      alt={devolviendoItem.producto?.nombre}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => handleProductImageError(e, devolviendoItem.producto?.sku)}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '800', color: '#2563eb' }}>
                      {devolviendoItem.codigo}
                    </span>
                    <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>
                      {devolviendoItem.producto?.nombre}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Prestado a: <strong>{devolviendoItem.trabajador?.nombres} {devolviendoItem.trabajador?.apellidos}</strong> • Cant: {devolviendoItem.cantidad} u.
                    </div>
                  </div>
                </div>

                {/* CONDICIÓN FÍSICA AL RECIBIR */}
                <div className="form-group">
                  <label style={{ fontWeight: '700', color: '#0f172a', marginBottom: '6px', display: 'block' }}>
                    Condición Física de Retorno
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                      { label: 'Operativa', desc: 'Buen Estado', color: '#16a34a', bg: '#f0fdf4' },
                      { label: 'Desgastada', desc: 'Uso Normal', color: '#d97706', bg: '#fffbeb' },
                      { label: 'Dañada', desc: 'Requiere Taller', color: '#dc2626', bg: '#fef2f2' },
                    ].map((cond) => {
                      const fullVal = `${cond.label} (${cond.desc})`;
                      const isSelected = condicionFisica.includes(cond.label);
                      return (
                        <button
                          key={cond.label}
                          type="button"
                          onClick={() => setCondicionFisica(fullVal)}
                          style={{
                            padding: '10px 8px',
                            borderRadius: '8px',
                            border: `2px solid ${isSelected ? cond.color : '#e2e8f0'}`,
                            background: isSelected ? cond.bg : '#ffffff',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ fontWeight: '800', color: isSelected ? cond.color : '#0f172a', fontSize: '13px' }}>
                            {cond.label}
                          </div>
                          <div style={{ fontSize: '10.5px', color: isSelected ? cond.color : '#64748b', marginTop: '2px' }}>
                            {cond.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* NOTAS DE RECEPCIÓN */}
                <div className="form-group">
                  <label style={{ fontWeight: '700', color: '#0f172a' }}>
                    Notas u Observaciones de Devolución
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Ej. Entregada limpia, con accesorios y batería cargada."
                    value={obsDevolucion}
                    onChange={(e) => setObsDevolucion(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      resize: 'none',
                    }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowDevolverModal(false)}
                  disabled={submittingDevolver}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={submittingDevolver}
                  style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
                >
                  {submittingDevolver ? 'Reingresando...' : 'Confirmar y Reingresar Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: VER DETALLE COMPLETO DEL PRÉSTAMO */}
      {/* ======================================================== */}
      {showDetalleModal && selectedPrestamo && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    color: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                    Ficha de Préstamo {selectedPrestamo.codigo}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                    Trazabilidad de custodia y reingreso de implemento.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowDetalleModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
              {/* IMAGEN Y CABECERA DEL ACTIVO */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', background: '#ffffff', flexShrink: 0 }}>
                  <img
                    src={obtenerImagenProducto(selectedPrestamo.producto)}
                    alt={selectedPrestamo.producto?.nombre}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => handleProductImageError(e, selectedPrestamo.producto?.sku)}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '800', color: '#2563eb' }}>
                    {selectedPrestamo.producto?.sku}
                  </div>
                  <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '15px' }}>
                    {selectedPrestamo.producto?.nombre}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                    Cantidad: <strong>{selectedPrestamo.cantidad} {selectedPrestamo.producto?.unidad_medida?.simbolo || 'u.'}</strong> • Almacén: <strong>{selectedPrestamo.almacen?.nombre}</strong>
                  </div>
                </div>
              </div>

              {/* GRILLA DE METADATOS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Trabajador Custodio</span>
                  <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '3px' }}>
                    {selectedPrestamo.trabajador?.nombres} {selectedPrestamo.trabajador?.apellidos}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    DNI: {selectedPrestamo.trabajador?.dni} • {selectedPrestamo.trabajador?.area || 'General'}
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Estado del Préstamo</span>
                  <div style={{ marginTop: '4px' }}>
                    {selectedPrestamo.estado === 'DEVUELTO' ? (
                      <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '12px' }}>
                        ✓ Retornado / En Stock
                      </span>
                    ) : (
                      <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: '4px', fontWeight: '700', fontSize: '12px' }}>
                        ● En Posesión del Trabajador
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Fecha Préstamo</span>
                  <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '3px' }}>
                    {new Date(selectedPrestamo.fecha_prestamo).toLocaleString()}
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Fecha Límite Estimada</span>
                  <div style={{ fontWeight: '700', color: '#0f172a', marginTop: '3px' }}>
                    {new Date(selectedPrestamo.fecha_devolucion_estimada).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* OBSERVACIONES */}
              {selectedPrestamo.observacion_prestamo && (
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                  <strong>Motivo / Obra:</strong> {selectedPrestamo.observacion_prestamo}
                </div>
              )}

              {selectedPrestamo.observacion_devolucion && (
                <div style={{ background: '#f0fdf4', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '12.5px', color: '#166534' }}>
                  <strong>Detalle de Retorno:</strong> {selectedPrestamo.observacion_devolucion}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowDetalleModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
