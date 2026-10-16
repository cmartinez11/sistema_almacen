/**
 * Diccionario y función helper para mapeo de imágenes de prueba coherentes y de alta calidad
 * según el tipo de producto, nombre, SKU o categoría.
 */

export const PRODUCT_MOCK_IMAGES = {
  mouse: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=300&auto=format&fit=crop&q=80',
  papel: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300&auto=format&fit=crop&q=80',
  monitor: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=300&auto=format&fit=crop&q=80',
  teclado: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&auto=format&fit=crop&q=80',
  lapicero: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=300&auto=format&fit=crop&q=80',
  generico: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&auto=format&fit=crop&q=80',
};

/**
 * Obtiene la URL de imagen para un producto:
 * 1. imagen_url si existe
 * 2. imagen local en /storage/ si existe
 * 3. Mapeo temático realista de alta calidad por SKU / Nombre
 * 4. Imagen corporativa de almacén como fallback genérico
 */
export function obtenerImagenProducto(producto) {
  if (!producto) return PRODUCT_MOCK_IMAGES.generico;

  // 1. Imagen directa si viene en imagen_url
  if (producto.imagen_url && typeof producto.imagen_url === 'string' && producto.imagen_url.trim() !== '') {
    return producto.imagen_url;
  }

  // 2. Imagen guardada en almacenamiento del backend
  if (producto.imagen && typeof producto.imagen === 'string' && producto.imagen.trim() !== '') {
    if (producto.imagen.startsWith('http') || producto.imagen.startsWith('data:')) {
      return producto.imagen;
    }
    return `http://127.0.0.1:8000/storage/${producto.imagen.replace(/^\//, '')}`;
  }

  // 3. Normalizar texto de búsqueda (nombre, sku, categoría)
  const text = `${producto.nombre || ''} ${producto.sku || ''} ${producto.categoria?.nombre || ''}`.toLowerCase();

  // Mouse / Ratón
  if (/mouse|raton|m120|optico|gamer/i.test(text)) {
    return PRODUCT_MOCK_IMAGES.mouse;
  }

  // Hojas / Papel / Resma bond
  if (/hoja|papel|bond|resma|folio|cartulina/i.test(text)) {
    return PRODUCT_MOCK_IMAGES.papel;
  }

  // Monitor / Pantalla / Display
  if (/monitor|pantalla|display|led 24|teros|curvo/i.test(text)) {
    return PRODUCT_MOCK_IMAGES.monitor;
  }

  // Teclado
  if (/teclado|keyboard|k120|mecanico/i.test(text)) {
    return PRODUCT_MOCK_IMAGES.teclado;
  }

  // Lapiceros / Bolígrafos / Oficina
  if (/lapicero|boligrafo|pluma|marcador|resaltador|utiles|oficina|faber/i.test(text)) {
    return PRODUCT_MOCK_IMAGES.lapicero;
  }

  // Fallback genérico corporativo de almacén
  return PRODUCT_MOCK_IMAGES.generico;
}

// Alias para compatibilidad
export const getProductImage = obtenerImagenProducto;

/**
 * Manejador de error para elementos <img> en caso de falla de red o enlace roto.
 * Inyecta un SVG corporativo elegante con el SKU del producto.
 */
export function handleProductImageError(e, sku = '') {
  e.currentTarget.onerror = null;
  const cleanSku = sku ? String(sku).substring(0, 12) : 'PROD';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8fafc"/><rect x="6" y="6" width="288" height="188" rx="8" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="6 4"/><g transform="translate(130, 55)" fill="#94a3b8"><path d="M20 0 L40 12 L20 24 L0 12 Z" fill="#cbd5e1"/><path d="M0 12 L20 24 L20 48 L0 36 Z" fill="#94a3b8"/><path d="M40 12 L20 24 L20 48 L40 36 Z" fill="#64748b"/></g><text x="150" y="135" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="13" font-weight="700" fill="#64748b" text-anchor="middle">${cleanSku}</text><text x="150" y="155" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="11" font-weight="500" fill="#94a3b8" text-anchor="middle">Suministro de Almacén</text></svg>`;
  e.currentTarget.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
