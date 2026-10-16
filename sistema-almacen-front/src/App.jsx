import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import Login from './components/Login';

// Importación de Páginas / Vistas del Sistema
import DashboardPage from './pages/DashboardPage';
import ProductosCatalogoPage from './pages/productos/ProductosCatalogoPage';
import CategoriasPage from './pages/productos/CategoriasPage';
import UnidadesMedidaPage from './pages/productos/UnidadesMedidaPage';
import IngresosPage from './pages/movimientos/IngresosPage';
import SalidasPage from './pages/movimientos/SalidasPage';
import TransferenciasPage from './pages/movimientos/TransferenciasPage';
import InventarioFisicoPage from './pages/movimientos/InventarioFisicoPage';
import KardexFisicoPage from './pages/movimientos/KardexFisicoPage';
import KardexValorizadoPage from './pages/movimientos/KardexValorizadoPage';
import RequerimientosPage from './pages/requerimientos/RequerimientosPage';
import ProveedoresPage from './pages/proveedores/ProveedoresPage';
import PersonalPage from './pages/personal/PersonalPage';
import UsuariosPage from './pages/usuarios/UsuariosPage';
import ReportesPage from './pages/reportes/ReportesPage';
import StockCriticoPage from './pages/reportes/StockCriticoPage';
import SolicitudesAreaPage from './pages/requerimientos/SolicitudesAreaPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

import { ROLES, normalizeRole } from './config/rbacConfig';
import { AlmacenProvider } from './context/AlmacenContext';

function App() {
  return (
    <AlmacenProvider>
      <BrowserRouter>
      <Routes>
        {/* RUTA PÚBLICA */}
        <Route path="/login" element={<Login />} />

        {/* 1. DASHBOARD */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLES.ADMINISTRADOR,
                ROLES.GERENCIA,
                ROLES.ALMACENERO,
                ROLES.SUPERVISOR,
                ROLES.COMPRAS,
              ]}
            >
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* 2. PRODUCTOS Y CATÁLOGOS */}
        <Route path="/productos" element={<Navigate to="/productos/catalogo" replace />} />

        <Route
          path="/productos/catalogo"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLES.ADMINISTRADOR,
                ROLES.COMPRAS,
                ROLES.ALMACENERO,
                ROLES.SUPERVISOR,
                ROLES.GERENCIA,
              ]}
            >
              <MainLayout>
                <ProductosCatalogoPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/productos/categorias"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLES.ADMINISTRADOR,
                ROLES.COMPRAS,
                ROLES.ALMACENERO,
                ROLES.SUPERVISOR,
                ROLES.GERENCIA,
              ]}
            >
              <MainLayout>
                <CategoriasPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/productos/unidades"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLES.ADMINISTRADOR,
                ROLES.COMPRAS,
                ROLES.ALMACENERO,
                ROLES.SUPERVISOR,
                ROLES.GERENCIA,
              ]}
            >
              <MainLayout>
                <UnidadesMedidaPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* 3. MOVIMIENTOS TRANSACCIONALES DE ALMACÉN */}
        <Route path="/movimientos" element={<Navigate to="/movimientos/ingresos" replace />} />

        <Route
          path="/movimientos/ingresos"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.ADMINISTRADOR, ROLES.ALMACENERO, ROLES.SUPERVISOR]}
            >
              <MainLayout>
                <IngresosPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/movimientos/salidas"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.ADMINISTRADOR, ROLES.ALMACENERO, ROLES.SUPERVISOR]}
            >
              <MainLayout>
                <SalidasPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/movimientos/transferencias"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.ADMINISTRADOR, ROLES.ALMACENERO, ROLES.SUPERVISOR]}
            >
              <MainLayout>
                <TransferenciasPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/movimientos/inventario-fisico"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.ADMINISTRADOR]}
            >
              <MainLayout>
                <InventarioFisicoPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Redirecciones de compatibilidad para kardex anteriores */}
        <Route path="/movimientos/kardex-fisico" element={<Navigate to="/reportes/kardex-fisico" replace />} />
        <Route path="/movimientos/kardex-valorizado" element={<Navigate to="/reportes/kardex-valorizado" replace />} />

        {/* 4. REQUERIMIENTOS Y ÓRDENES */}
        <Route
          path="/requerimientos"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.ADMINISTRADOR, ROLES.ALMACENERO, ROLES.COMPRAS]}
            >
              <MainLayout>
                <RequerimientosPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* 5. PROVEEDORES */}
        <Route
          path="/proveedores"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMINISTRADOR, ROLES.COMPRAS, ROLES.ALMACENERO]}>
              <MainLayout>
                <ProveedoresPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* 6. TRABAJADORES / PERSONAL */}
        <Route
          path="/personal"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.ADMINISTRADOR, ROLES.SUPERVISOR, ROLES.ALMACENERO]}
            >
              <MainLayout>
                <PersonalPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* GESTIÓN DE USUARIOS Y ACCESOS (RBAC) */}
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.ADMINISTRADOR]}
            >
              <MainLayout>
                <UsuariosPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* 7. REPORTES, KARDEX & ANALÍTICA */}
        <Route
          path="/reportes"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.ADMINISTRADOR, ROLES.GERENCIA, ROLES.SUPERVISOR]}
            >
              <MainLayout>
                <ReportesPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reportes/kardex-fisico"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLES.ADMINISTRADOR,
                ROLES.ALMACENERO,
                ROLES.SUPERVISOR,
                ROLES.GERENCIA,
              ]}
            >
              <MainLayout>
                <KardexFisicoPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reportes/kardex-valorizado"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.ADMINISTRADOR, ROLES.COMPRAS, ROLES.GERENCIA]}
            >
              <MainLayout>
                <KardexValorizadoPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reportes/stock-critico"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLES.ADMINISTRADOR,
                ROLES.GERENCIA,
                ROLES.SUPERVISOR,
                ROLES.ALMACENERO,
                ROLES.COMPRAS,
              ]}
            >
              <MainLayout>
                <StockCriticoPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* SOLICITUDES DE ÁREA (E-COMMERCE) */}
        <Route
          path="/solicitudes-area"
          element={
            <ProtectedRoute
              allowedRoles={[
                ROLES.RESPONSABLE_AREA,
                ROLES.ADMINISTRADOR,
                ROLES.COMPRAS,
                ROLES.ALMACENERO,
              ]}
            >
              <MainLayout>
                <SolicitudesAreaPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* RUTA 403 NO AUTORIZADO */}
        <Route
          path="/unauthorized"
          element={
            <MainLayout>
              <UnauthorizedPage />
            </MainLayout>
          }
        />

        {/* REDIRECCIÓN POR DEFECTO */}
        <Route
          path="*"
          element={
            localStorage.getItem('token') ? (
              normalizeRole(JSON.parse(localStorage.getItem('user') || '{}')) === ROLES.RESPONSABLE_AREA ? (
                <Navigate to="/solicitudes-area" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
    </AlmacenProvider>
  );
}

export default App;
