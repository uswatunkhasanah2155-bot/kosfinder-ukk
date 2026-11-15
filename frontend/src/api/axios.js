import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Otomatis kirim token JWT di setiap request jika user sudah login
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Token kadaluarsa/tidak valid -> bersihkan sesi lalu arahkan ke halaman login.
// 403 karena role/verifikasi (bukan masalah token) tidak ikut me-logout.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const pesan = error.response?.data?.message || '';
    const tokenBermasalah = status === 401 || (status === 403 && pesan.startsWith('Token'));
    const sedangLogin = error.config?.url?.includes('/auth/login');

    if (tokenBermasalah && !sedangLogin && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;