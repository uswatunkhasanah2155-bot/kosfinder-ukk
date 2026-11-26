// src/App.jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import AdminLayout from './components/AdminLayout';
import OwnerLayout from './components/OwnerLayout';
import Landing from './pages/user/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

// Halaman berat (peta, chart, tabel) dimuat saat dibuka agar bundle awal lebih ringan.
const DetailKos = lazy(() => import('./pages/user/DetailKos'));
const DashboardUser = lazy(() => import('./pages/user/DashboardUser'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const VerifikasiOwner = lazy(() => import('./pages/admin/VerifikasiOwner'));
const Fasilitas = lazy(() => import('./pages/admin/Fasilitas'));
const Laporan = lazy(() => import('./pages/admin/Laporan'));
const OwnerDashboard = lazy(() => import('./pages/owner/Dashboard'));
const KosSaya = lazy(() => import('./pages/owner/KosSaya'));
const Kamar = lazy(() => import('./pages/owner/Kamar'));
const BookingMasuk = lazy(() => import('./pages/owner/BookingMasuk'));
const ReviewOwner = lazy(() => import('./pages/owner/Review'));
const EksporOwner = lazy(() => import('./pages/owner/Ekspor'));

function MuatHalaman() {
  return <div className="p-10 text-center text-gray-500">Memuat halaman…</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<MuatHalaman />}>
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
                <Route path="kos" element={<KosSaya />} />
                <Route path="kamar" element={<Kamar />} />
                <Route path="booking" element={<BookingMasuk />} />
                <Route path="review" element={<ReviewOwner />} />
                <Route path="ekspor" element={<EksporOwner />} />
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
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
