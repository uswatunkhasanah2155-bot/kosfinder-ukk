
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

// Cek token JWT
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak, token tidak ditemukan',
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token tidak valid atau sudah kadaluarsa',
      });
    }

    req.user = user;
    next();
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

// Memastikan Owner sudah diverifikasi Admin
export const verifyOwnerVerified = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'Owner') {
      return res.status(403).json({
        success: false,
        message: 'Akses khusus Owner',
      });
    }

    const owner = await prisma.user.findUnique({
      where: {
        user_id: req.user.user_id,
      },
      select: {
        status_verifikasi: true,
      },
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Akun Owner tidak ditemukan',
      });
    }

    if (owner.status_verifikasi !== 'Terverifikasi') {
      return res.status(403).json({
        success: false,
        message: 'Akun Owner belum diverifikasi oleh Admin',
      });
    }

    next();
  } catch (error) {
    console.error('ERROR VERIFIKASI OWNER:', error);

    return res.status(500).json({
      success: false,
      message: 'Gagal memeriksa verifikasi Owner',
    });
  }
};
