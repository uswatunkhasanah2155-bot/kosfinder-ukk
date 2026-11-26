import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homePath } from '../context/authHooks';

// Pemakaian: <Route element={<ProtectedRoute roles={['Owner']} />}> ...rute anak... </Route>
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p style={{ padding: 24 }}>Memuat…</p>;
  if (!user) return <Navigate to="/login" replace state={{ dari: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePath(user.role)} replace />;

  return <Outlet />;
}