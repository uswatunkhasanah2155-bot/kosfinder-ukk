
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

export default router;
