import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AlmacenContext = createContext({
  activeAlmacenId: 1,
  almacenes: [],
  loading: false,
  setActiveAlmacenId: () => {},
  reloadAlmacenes: () => {},
});

export const AlmacenProvider = ({ children }) => {
  const [almacenes, setAlmacenes] = useState([]);
  const [activeAlmacenId, setActiveAlmacenId] = useState(() => {
    const saved = localStorage.getItem('activeAlmacenId');
    return saved ? Number(saved) : 1;
  });
  const [loading, setLoading] = useState(false);

  const fetchAlmacenes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/almacenes');
      const list = res.data?.data || [];
      const arr = Array.isArray(list) ? list : [];
      setAlmacenes(arr);
      if (arr.length > 0 && !arr.some((a) => a.id === activeAlmacenId)) {
        setActiveAlmacenId(arr[0].id);
      }
    } catch (err) {
      console.warn('Error al cargar almacenes en AlmacenContext:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlmacenes();
  }, []);

  const handleSetActiveAlmacenId = (id) => {
    const numId = Number(id);
    setActiveAlmacenId(numId);
    localStorage.setItem('activeAlmacenId', numId.toString());
  };

  return (
    <AlmacenContext.Provider
      value={{
        activeAlmacenId,
        setActiveAlmacenId: handleSetActiveAlmacenId,
        almacenes,
        loading,
        reloadAlmacenes: fetchAlmacenes,
      }}
    >
      {children}
    </AlmacenContext.Provider>
  );
};

export const useAlmacen = () => {
  const context = useContext(AlmacenContext);
  if (!context) {
    return {
      activeAlmacenId: 1,
      almacenes: [],
      loading: false,
      setActiveAlmacenId: () => {},
      reloadAlmacenes: () => {},
    };
  }
  return context;
};

export default AlmacenContext;
