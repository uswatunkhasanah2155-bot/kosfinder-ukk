import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  // Cookie httpOnly dari backend harus ikut dikirim ke API.
  withCredentials: true,
});

// Token tidak lagi disimpan/disuntik dari localStorage.
// Backend membaca cookie httpOnly yang aman dari XSS.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    // /auth/me dipakai untuk mengecek sesi saat aplikasi dibuka.
    // 401 di sini bukan kondisi error bagi UI: user tinggal dianggap tamu.
    const sedangCekSesi = url.includes('/auth/me');
    const sedangLogin = url.includes('/auth/login');

    if (status === 401 && !sedangCekSesi && !sedangLogin) {
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
