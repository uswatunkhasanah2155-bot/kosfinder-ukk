import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import AdminLayout from './components/AdminLayout';
import OwnerLayout from './components/OwnerLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/Dashboard';
import VerifikasiOwner from './pages/admin/VerifikasiOwner';
import Fasilitas from './pages/admin/Fasilitas';
import OwnerDashboard from './pages/owner/Dashboard';
import KosSaya from './pages/owner/KosSaya';
import Kamar from './pages/owner/Kamar';
import BookingMasuk from './pages/owner/BookingMasuk';
import Review from './pages/owner/Review';
import EksporData from './pages/owner/EksporData';

function Sementara({ judul }) {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">{judul}</h1>
      <p className="mt-2">
        Masuk sebagai <strong>{user?.nama}</strong> ({user?.role})
      </p>

      {user?.role === 'Owner' && user.status_verifikasi !== 'Terverifikasi' && (
        <p className="mt-3 rounded-lg bg-yellow-100 p-3 text-sm">
          Akun Anda menunggu verifikasi Admin.
        </p>
      )}

      <button
        onClick={logout}
        className="mt-6 rounded-lg bg-[#0d5a57] px-4 py-2 font-bold text-white"
      >
        Keluar
      </button>
    </div>
  );
}

function SegeraHadir({ judul }) {
  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h2 className="text-xl font-bold text-[#12302e]">{judul}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Halaman ini akan kita kerjakan pada tahap berikutnya.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Hanya untuk yang belum login; yang sudah login otomatis dialihkan ke dashboard */}
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          <Route element={<ProtectedRoute roles={['User']} />}>
            <Route path="/" element={<Sementara judul="Peta Kos (User)" />} />
          </Route>

          <Route element={<ProtectedRoute roles={['Owner']} />}>
            <Route path="/owner" element={<OwnerLayout />}>
              <Route index element={<OwnerDashboard />} />
              <Route path="kos" element={<KosSaya />} />
              <Route path="kamar" element={<Kamar />} />
              <Route path="booking" element={<BookingMasuk />} />
              <Route path="review" element={<Review />} />
              <Route path="ekspor" element={<EksporData />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['Admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="verifikasi-owner" element={<VerifikasiOwner />} />
              <Route path="fasilitas" element={<Fasilitas />} />
              <Route path="laporan" element={<SegeraHadir judul="Laporan & Export Data" />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}