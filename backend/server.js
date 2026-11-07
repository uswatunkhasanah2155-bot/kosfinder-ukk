import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './services/auth-service/auth.js';
import fasilitasRoutes from './services/fasilitas-service/fasilitas.js';
import adminRoutes from './services/admin-service/admin.js';
import kosRoutes from './services/kos-service/kos.js';
import kamarRoutes from './services/kamar-service/kamar.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET belum diisi di file .env');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Route Autentikasi (Register, Login, Me)
app.use('/api/auth', authRoutes);

// Route Master Fasilitas
app.use('/api/fasilitas', fasilitasRoutes);

// Route Admin
app.use('/api/admin', adminRoutes);

// Route Kos
app.use('/api/kos', kosRoutes);

//Route Kamar
app.use('/api', kamarRoutes);

// Route uji coba utama
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Server API Kos Finder Berjalan Lancar!',
  });
});

// Route tidak ditemukan
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server aktif di http://localhost:${PORT}`);
});