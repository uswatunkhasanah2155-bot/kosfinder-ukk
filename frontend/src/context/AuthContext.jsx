import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

const ambilUserTersimpan = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

// Halaman awal tiap peran setelah login
export const homePath = (role) => ({ Admin: '/admin', Owner: '/owner' }[role] || '/');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(ambilUserTersimpan);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('token')));

  // Saat aplikasi dibuka: segarkan data user dari server (mis. status verifikasi Owner)
  useEffect(() => {
    if (!localStorage.getItem('token')) return;

    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.data);
        localStorage.setItem('user', JSON.stringify(data.data));
      })
      .catch(() => {}) // token tidak valid sudah ditangani interceptor
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.data));
    setUser(data.data);
    return data.data;
  };

  const register = async (form) => {
    const { data } = await api.post('/auth/register', form);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);