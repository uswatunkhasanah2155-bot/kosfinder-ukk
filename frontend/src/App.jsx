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
import KosSaya from './pages/owner/KosSaya';
import Kamar from './pages/owner/Kamar';
import BookingMasuk from './pages/owner/BookingMasuk';
import Review from './pages/owner/Review';
import EksporData from './pages/owner/EksporData';
import Profil from './pages/owner/Profil';

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

          {/* DASHBOARD OWNER */}
          <Route element={<ProtectedRoute roles={['Owner']} />}>
            <Route path="/owner" element={<OwnerLayout />}>
              <Route index element={<OwnerDashboard />} />
              <Route path="kos" element={<KosSaya />} />
              <Route path="kamar" element={<Kamar />} />
              <Route path="booking" element={<BookingMasuk />} />
              <Route path="review" element={<Review />} />
              <Route path="ekspor" element={<EksporData />} />
              <Route path="profil" element={<Profil />} />
            </Route>
          </Route>

          {/* DASHBOARD ADMIN */}
          <Route element={<ProtectedRoute roles={['Admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="verifikasi-owner" element={<VerifikasiOwner />} />
              <Route path="fasilitas" element={<Fasilitas />} />
              <Route path="laporan" element={<Laporan />} />
            </Route>
          </Route>

          {/* HALAMAN TIDAK DITEMUKAN */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}