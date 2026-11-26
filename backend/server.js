import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

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

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET belum diisi di file .env');
  process.exit(1);
}

// Di belakang proxy (Vercel/Nginx) diperlukan agar rate limiter membaca IP asli.
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

// Origin frontend yang diizinkan. Tanpa env, default-nya hanya localhost untuk development.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const pesanTerlaluBanyak = {
  success: false,
  message: 'Terlalu banyak permintaan. Silakan coba beberapa saat lagi.',
};

// Middleware keamanan dasar
app.use(helmet());

// exposedHeaders: agar frontend bisa membaca nama file dari header Content-Disposition saat unduh
app.use(
  cors({
    origin: (origin, callback) => {
      // Request tanpa Origin (curl, server-to-server) tetap diizinkan.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin tidak diizinkan oleh CORS'));
    },
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Pembatasan umum seluruh API
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: pesanTerlaluBanyak,
  })
);

// Pembatasan khusus autentikasi untuk mencegah brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: pesanTerlaluBanyak,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use(
  '/api/auth/cek-email',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: pesanTerlaluBanyak,
  })
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

// Error handler terpusat: jangan pernah mengirim detail error ke client
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const status = err.message === 'Origin tidak diizinkan oleh CORS' ? 403 : 500;
  console.error('ERROR SERVER:', err);

  return res.status(status).json({
    success: false,
    message:
      status === 403
        ? 'Origin tidak diizinkan'
        : 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
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