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
import KardexFisicoPage from './pages/movimientos/KardexFisicoPage';
import KardexValorizadoPage from './pages/movimientos/KardexValorizadoPage';
import RequerimientosPage from './pages/requerimientos/RequerimientosPage';
import ProveedoresPage from './pages/proveedores/ProveedoresPage';
import PersonalPage from './pages/personal/PersonalPage';
import ReportesPage from './pages/reportes/ReportesPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

import { ROLES } from './config/rbacConfig';

function App() {
  return (
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

        {/* 2. PRODUCTOS Y SUBMÓDULOS */}
        <Route path="/productos" element={<Navigate to="/productos/catalogo" replace />} />

        <Route
          path="/productos/catalogo"
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
                <ProductosCatalogoPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/productos/categorias"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMINISTRADOR, ROLES.ALMACENERO]}>
              <MainLayout>
                <CategoriasPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/productos/unidades"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMINISTRADOR, ROLES.ALMACENERO]}>
              <MainLayout>
                <UnidadesMedidaPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* 3. MOVIMIENTOS Y SUBMÓDULOS */}
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
          path="/movimientos/kardex-fisico"
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
          path="/movimientos/kardex-valorizado"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.ADMINISTRADOR, ROLES.ALMACENERO, ROLES.GERENCIA]}
            >
              <MainLayout>
                <KardexValorizadoPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* 4. REQUERIMIENTOS */}
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
            <ProtectedRoute allowedRoles={[ROLES.ADMINISTRADOR, ROLES.COMPRAS]}>
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

        {/* 7. REPORTES */}
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
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
