// src/App.jsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import AdminLayout from './components/AdminLayout';
import OwnerLayout from './components/OwnerLayout';
import Landing from './pages/user/Landing';
import DetailKos from './pages/user/DetailKos';
import DashboardUser from './pages/user/DashboardUser';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/Dashboard';
import VerifikasiOwner from './pages/admin/VerifikasiOwner';
import Fasilitas from './pages/admin/Fasilitas';
import Laporan from './pages/admin/Laporan';
import OwnerDashboard from './pages/owner/Dashboard';

function SegeraHadir({ judul }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <h1 className="text-2xl font-bold text-[#0d5a57]">{judul}</h1>
      <p className="mt-2 text-gray-500">Halaman ini segera hadir.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* PUBLIK: dapat dibuka siapa saja tanpa login */}
          <Route path="/" element={<Landing />} />
          <Route path="/kos/:id" element={<DetailKos />} />

          {/* Hanya untuk yang belum login; yang sudah login otomatis dialihkan ke dasbor sesuai role */}
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Pencari kos: dasbor booking (menerima ?kos=ID&kamar=ID dari landing / detail kos) */}
          <Route element={<ProtectedRoute roles={['User']} />}>
            <Route path="/user" element={<DashboardUser />} />
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
              <Route path="laporan" element={<Laporan />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}