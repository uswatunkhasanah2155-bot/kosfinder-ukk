import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRoutes from './services/auth-service/auth.js';
import fasilitasRoutes from './services/fasilitas-service/fasilitas.js';
import adminRoutes from './services/admin-service/admin.js';
import kosRoutes from './services/kos-service/kos.js';
import kamarRoutes from './services/kamar-service/kamar.js';
import bookingRoutes from './services/booking-service/booking.js';
import reviewRoutes from './services/review-service/review.js';
import dashboardRoutes from './services/dashboard-service/dashboard.js';
import exportRoutes from './services/export-service/export.js';

import { selesaikanBookingKedaluwarsa } from './lib/bookingOtomatis.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pastikan folder uploads tersedia di backend
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET belum diisi di file .env');
  process.exit(1);
}

// Middleware
// origin harus disebut spesifik (bukan '*') karena frontend mengirim request dengan credentials.
// Alamat tambahan bisa diisi lewat FRONTEND_URL di .env, dipisah koma.
const originDiizinkan = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((s) => s.trim()) : []),
];

// exposedHeaders: agar frontend bisa membaca nama file dari header Content-Disposition saat unduh
app.use(
  cors({
    origin: originDiizinkan,
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  })
);
app.use(express.json());

// Akses file statis untuk folder uploads (foto kos)
// Cross-Origin-Resource-Policy: agar gambar bisa dimuat oleh frontend di port berbeda
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(uploadDir)
);

// Route Autentikasi (Register, Login, Me)
app.use('/api/auth', authRoutes);

// Route Master Fasilitas
app.use('/api/fasilitas', fasilitasRoutes);

// Route Admin
app.use('/api/admin', adminRoutes);

// Route Kos
app.use('/api/kos', kosRoutes);

// Route Kamar
app.use('/api', kamarRoutes);

// Route Booking
app.use('/api', bookingRoutes);

// Route Review
app.use('/api', reviewRoutes);

// Route Dashboard
app.use('/api', dashboardRoutes);

// Route Export
app.use('/api', exportRoutes);

// Route uji coba utama
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Server API Kos Finder Berjalan Lancar!',
  });
});

// Route tidak ditemukan
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan',
  });
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server aktif di http://localhost:${PORT}`);

  // Jalankan otomatisasi saat server aktif
  selesaikanBookingKedaluwarsa();

  // Periksa booking setiap 10 menit
  setInterval(() => {
    selesaikanBookingKedaluwarsa();
  }, 10 * 60 * 1000);
});