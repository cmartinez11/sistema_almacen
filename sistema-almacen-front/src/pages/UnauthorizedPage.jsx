import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import './pagesCommon.css';

export default function UnauthorizedPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div
      className="page-container"
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="table-card"
        style={{
          maxWidth: '500px',
          padding: '40px',
          textAlign: 'center',
          borderTop: '6px solid #dc2626',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#fef2f2',
            color: '#dc2626',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          <ShieldAlert size={36} />
        </div>

        <h2 style={{ margin: '0 0 10px 0', fontSize: '22px', color: '#0f172a' }}>
          Acceso Restringido (403 Forbidden)
        </h2>

        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', marginBottom: '24px' }}>
          Lo sentimos, tu rol actual de usuario no dispone de los permisos necesarios para visualizar este módulo o realizar acciones en esta sección.
        </p>

        <Link to="/dashboard" className="primary-btn" style={{ textDecoration: 'none', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Volver al Dashboard Principal
        </Link>
      </div>
    </div>
  );
}
