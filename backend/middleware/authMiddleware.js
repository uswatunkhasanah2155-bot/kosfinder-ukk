import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

// Cek token JWT, lalu ambil data user terbaru dari database.
// Role/status selalu diambil dari DB supaya perubahan Admin langsung berlaku
// walaupun token lama belum kedaluwarsa.
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Cookie httpOnly dipakai frontend; header Bearer tetap didukung untuk API client.
  const token = req.cookies?.token || (authHeader && authHeader.split(' ')[1]);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak, token tidak ditemukan',
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
    if (err) {
      // 401 (bukan 403) agar frontend bisa otomatis mengarahkan ke halaman login
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid atau sudah kadaluarsa',
      });
    }

    const userId = Number(payload?.user_id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid',
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { user_id: true, role: true, status_verifikasi: true },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Akun tidak ditemukan. Silakan login kembali.',
        });
      }

      req.user = {
        user_id: user.user_id,
        role: user.role,
        status_verifikasi: user.status_verifikasi,
      };

      return next();
    } catch (error) {
      console.error('ERROR VERIFY TOKEN:', error);
      return res.status(500).json({
        success: false,
        message: 'Gagal memverifikasi akun',
      });
    }
  });
};

// Batasi akses berdasarkan role
export const checkRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Anda tidak memiliki akses ke fitur ini',
    });
  }

  next();
};

// Memastikan Owner sudah diverifikasi Admin.
// Status sudah diambil segar dari DB oleh verifyToken, jadi tidak perlu query lagi.
export const verifyOwnerVerified = (req, res, next) => {
  if (!req.user || req.user.role !== 'Owner') {
    return res.status(403).json({
      success: false,
      message: 'Akses khusus Owner',
    });
  }

  if (req.user.status_verifikasi === 'Ditolak') {
    return res.status(403).json({
      success: false,
      message: 'Verifikasi akun Owner ditolak oleh Admin',
    });
  }

  if (req.user.status_verifikasi !== 'Terverifikasi') {
    return res.status(403).json({
      success: false,
      message: 'Akun Owner belum diverifikasi oleh Admin',
    });
  }

  return next();
};
