import express from 'express';
import prisma from '../../lib/prisma.js';
import {
  verifyToken,
  checkRole,
} from '../../middleware/authMiddleware.js';

const router = express.Router();

// ==================================
// MELIHAT DAFTAR OWNER MENUNGGU VERIFIKASI
// ==================================
router.get(
  '/owners/menunggu',
  verifyToken,
  checkRole('Admin'),
  async (req, res) => {
    try {
      const owners = await prisma.user.findMany({
        where: {
          role: 'Owner',
          status_verifikasi: 'Menunggu',
        },
        select: {
          user_id: true,
          nama: true,
          email: true,
          no_wa: true,
          status_verifikasi: true,
        },
        orderBy: {
          user_id: 'desc',
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Berhasil mengambil daftar Owner',
        data: owners,
      });
    } catch (error) {
      console.error('ERROR DAFTAR OWNER:', error);

      return res.status(500).json({
        success: false,
        message: 'Gagal mengambil daftar Owner',
      });
    }
  }
);

// ==================================
// VERIFIKASI AKUN OWNER
// ==================================
router.patch(
  '/owners/:id/verifikasi',
  verifyToken,
  checkRole('Admin'),
  async (req, res) => {
    try {
      const ownerId = Number(req.params.id);

      if (!Number.isInteger(ownerId) || ownerId <= 0) {
        return res.status(400).json({
          success: false,
          message: 'ID Owner tidak valid',
        });
      }

      const owner = await prisma.user.findUnique({
        where: {
          user_id: ownerId,
        },
      });

      if (!owner || owner.role !== 'Owner') {
        return res.status(404).json({
          success: false,
          message: 'Akun Owner tidak ditemukan',
        });
      }

      if (owner.status_verifikasi === 'Terverifikasi') {
        return res.status(400).json({
          success: false,
          message: 'Akun Owner sudah diverifikasi',
        });
      }

      const ownerTerverifikasi = await prisma.user.update({
        where: {
          user_id: ownerId,
        },
        data: {
          status_verifikasi: 'Terverifikasi',
        },
        select: {
          user_id: true,
          nama: true,
          email: true,
          role: true,
          status_verifikasi: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Akun Owner berhasil diverifikasi',
        data: ownerTerverifikasi,
      });
    } catch (error) {
      console.error('ERROR VERIFIKASI OWNER:', error);

      return res.status(500).json({
        success: false,
        message: 'Gagal memverifikasi Owner',
      });
    }
  }
);

// ==================================
// DAFTAR OWNER (semua status, atau filter ?status=Menunggu|Terverifikasi|Ditolak)
// ==================================
router.get('/owners', verifyToken, checkRole('Admin'), async (req, res) => {
  try {
    const { status } = req.query;

    if (status && !['Menunggu', 'Terverifikasi', 'Ditolak'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status harus Menunggu, Terverifikasi, atau Ditolak',
      });
    }

    const owners = await prisma.user.findMany({
      where: { role: 'Owner', ...(status && { status_verifikasi: status }) },
      select: { user_id: true, nama: true, email: true, no_wa: true, status_verifikasi: true },
      orderBy: { user_id: 'desc' },
    });

    return res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar Owner',
      total: owners.length,
      data: owners,
    });
  } catch (error) {
    console.error('ERROR DAFTAR OWNER:', error);

    return res.status(500).json({ success: false, message: 'Gagal mengambil daftar Owner' });
  }
});

// ==================================
// TOLAK VERIFIKASI OWNER (hanya yang berstatus Menunggu)
// ==================================
router.patch('/owners/:id/tolak', verifyToken, checkRole('Admin'), async (req, res) => {
  try {
    const ownerId = Number(req.params.id);

    if (!Number.isInteger(ownerId) || ownerId <= 0) {
      return res.status(400).json({ success: false, message: 'ID Owner tidak valid' });
    }

    const owner = await prisma.user.findUnique({ where: { user_id: ownerId } });

    if (!owner || owner.role !== 'Owner') {
      return res.status(404).json({ success: false, message: 'Akun Owner tidak ditemukan' });
    }

    if (owner.status_verifikasi !== 'Menunggu') {
      return res.status(400).json({
        success: false,
        message: `Akun Owner berstatus ${owner.status_verifikasi}, hanya akun Menunggu yang bisa ditolak`,
      });
    }

    const ditolak = await prisma.user.update({
      where: { user_id: ownerId },
      data: { status_verifikasi: 'Ditolak' },
      select: { user_id: true, nama: true, email: true, role: true, status_verifikasi: true },
    });

    return res.status(200).json({
      success: true,
      message: 'Verifikasi akun Owner ditolak',
      data: ditolak,
    });
  } catch (error) {
    console.error('ERROR TOLAK OWNER:', error);

    return res.status(500).json({ success: false, message: 'Gagal menolak verifikasi Owner' });
  }
});

export default router;