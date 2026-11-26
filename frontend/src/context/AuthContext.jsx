import { useEffect, useState } from 'react';
import api from '../api/axios';
import { AuthContext } from './authHooks';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cek sesi dari cookie httpOnly saat aplikasi dibuka.
  useEffect(() => {
    let batal = false;

    api
      .get('/auth/me')
      .then(({ data }) => {
        if (!batal) setUser(data.data);
      })
      .catch(() => {
        if (!batal) setUser(null);
      })
      .finally(() => {
        if (!batal) setLoading(false);
      });

    return () => {
      batal = true;
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.data);
    return data.data;
  };

  const register = async (form) => {
    const { data } = await api.post('/auth/register', form);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
