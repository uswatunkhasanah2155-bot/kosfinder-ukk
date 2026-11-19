import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homePath } from '../context/AuthContext';

// Untuk halaman yang hanya boleh dibuka saat BELUM login (/login dan /register).
// Pemakaian: <Route element={<GuestRoute />}> ...rute anak... </Route>
export default function GuestRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p style={{ padding: 24 }}>Memuat…</p>;

  // Sudah login: kembalikan ke halaman asal (jika ada) atau ke dashboard sesuai peran
  if (user) {
    return <Navigate to={location.state?.dari?.pathname || homePath(user.role)} replace />;
  }

  return <Outlet />;
}