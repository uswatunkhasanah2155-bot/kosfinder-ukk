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
import Laporan from './pages/admin/Laporan'; // <-- Import Laporan di sini

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
              <Route path="kos" element={<SegeraHadir judul="Kos Saya" />} />
              <Route path="kamar" element={<SegeraHadir judul="Kelola Kamar" />} />
              <Route path="booking" element={<SegeraHadir judul="Booking Masuk" />} />
              <Route path="review" element={<SegeraHadir judul="Review & Rating" />} />
              <Route path="ekspor" element={<SegeraHadir judul="Ekspor Data" />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['Admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="verifikasi-owner" element={<VerifikasiOwner />} />
              <Route path="fasilitas" element={<Fasilitas />} />
              <Route path="laporan" element={<Laporan />} /> {/* <-- Rute Laporan dipasang di sini */}
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}