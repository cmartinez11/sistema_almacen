import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // O tu instancia configurada

export default function Login() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Petición directa a tu API de Laravel
      const response = await axios.post('http://127.0.0.1:8000/api/login', {
        email,
        password
      });

      // Guardar token y datos del usuario
      if (response.data && response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // Redirigir al catálogo de productos
        navigate('/productos');
      } else {
        setError('No se recibió el token de acceso del servidor.');
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        'Credenciales incorrectas o error de conexión con el servidor.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.subtitle}>SISTEMA INTEGRADO DE ALMACÉN</span>
          <h2 style={styles.title}>Iniciar Sesión</h2>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="admin@almacen.com"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Estilos de la tarjeta flotante y fondo glassmorphism
const styles = {
  container: {
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 50% 30%, #4e54c8, #1f1c2c)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    position: 'fixed',
    top: 0,
    left: 0,
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '40px',
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    color: '#ffffff',
    boxSizing: 'border-box',
  },
  header: {
    marginBottom: '25px',
  },
  subtitle: {
    fontSize: '11px',
    letterSpacing: '1.5px',
    color: '#93c5fd',
    fontWeight: '600',
    display: 'block',
    marginBottom: '6px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    margin: '0',
    color: '#f3f4f6',
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    color: '#fca5a5',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    color: '#d1d5db',
  },
  input: {
    background: 'rgba(255, 255, 255, 0.07)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  button: {
    marginTop: '10px',
    background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
  },
};