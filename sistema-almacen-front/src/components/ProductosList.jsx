import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ProductosList = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buscar, setBuscar] = useState('');

  const fetchProductos = async (query = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/productos', {
        params: query ? { buscar: query } : {},
      });
      // Paginador de Laravel devuelve datos dentro de response.data.data.data
      const resultData = response.data?.data?.data || response.data?.data || [];
      setProductos(resultData);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Error al conectar con la API de Laravel.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProductos(buscar);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={styles.title}>📦 Catálogo de Productos - Almacén</h2>
        <p style={styles.subtitle}>
          Conexión en tiempo real con API Laravel 12 + PostgreSQL
        </p>
      </header>

      {/* Barra de Búsqueda */}
      <form onSubmit={handleSearchSubmit} style={styles.searchBar}>
        <input
          type="text"
          placeholder="Buscar por SKU o Nombre de producto..."
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.button}>
          🔍 Buscar
        </button>
        {buscar && (
          <button
            type="button"
            onClick={() => {
              setBuscar('');
              fetchProductos('');
            }}
            style={styles.clearButton}
          >
            Limpiar
          </button>
        )}
      </form>

      {/* Estados de Carga y Error */}
      {loading && (
        <div style={styles.loadingBox}>
          <span>⌛ Cargando productos desde el servidor...</span>
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          ⚠️ <strong>Error:</strong> {error}
        </div>
      )}

      {/* Tabla de Productos */}
      {!loading && !error && (
        <div style={styles.tableResponsive}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>SKU</th>
                <th style={styles.th}>Nombre del Producto</th>
                <th style={styles.th}>Categoría</th>
                <th style={styles.th}>U. Medida</th>
                <th style={styles.th}>Stock Actual</th>
                <th style={styles.th}>Precio Costo</th>
                <th style={styles.th}>Precio Venta</th>
              </tr>
            </thead>
            <tbody>
              {productos.length > 0 ? (
                productos.map((prod) => (
                  <tr key={prod.id} style={styles.tr}>
                    <td style={styles.td}>#{prod.id}</td>
                    <td style={styles.td}>
                      <span style={styles.skuBadge}>{prod.sku}</span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>
                      {prod.nombre}
                    </td>
                    <td style={styles.td}>
                      {prod.categoria?.nombre || '-'}
                    </td>
                    <td style={styles.td}>
                      {prod.unidad_medida?.simbolo || prod.unidad_medida?.nombre || '-'}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={
                          Number(prod.stock_actual) <= Number(prod.stock_minimo)
                            ? styles.stockLow
                            : styles.stockOk
                        }
                      >
                        {Number(prod.stock_actual).toFixed(2)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      S/ {Number(prod.precio_costo).toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, color: '#10B981', fontWeight: 'bold' }}>
                      S/ {Number(prod.precio_venta).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={styles.emptyTd}>
                    No se encontraron productos registrados en el almacén.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  },
  header: {
    borderBottom: '2px solid #F3F4F6',
    paddingBottom: '16px',
    marginBottom: '20px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    color: '#1F2937',
  },
  subtitle: {
    margin: '4px 0 0 0',
    color: '#6B7280',
    fontSize: '14px',
  },
  searchBar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    outline: 'none',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#3B82F6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  clearButton: {
    padding: '10px 16px',
    backgroundColor: '#9CA3AF',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  loadingBox: {
    padding: '30px',
    textAlign: 'center',
    color: '#4B5563',
  },
  errorBox: {
    padding: '14px 20px',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: '6px',
    marginBottom: '20px',
  },
  tableResponsive: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    backgroundColor: '#F9FAFB',
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: '700',
    color: '#374151',
    borderBottom: '1px solid #E5E7EB',
  },
  tr: {
    borderBottom: '1px solid #F3F4F6',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#4B5563',
  },
  emptyTd: {
    padding: '30px',
    textAlign: 'center',
    color: '#9CA3AF',
  },
  skuBadge: {
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    padding: '3px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  stockOk: {
    color: '#059669',
    fontWeight: '600',
  },
  stockLow: {
    color: '#DC2626',
    fontWeight: '700',
  },
};

export default ProductosList;
