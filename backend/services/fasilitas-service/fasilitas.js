
import express from 'express';
import prisma from '../../lib/prisma.js';
import { verifyToken, checkRole } from '../../middleware/authMiddleware.js';

const router = express.Router();

// ===============================
// GET SEMUA FASILITAS (publik)
// ===============================
router.get('/', async (req, res) => {
  try {
    const data = await prisma.fasilitas.findMany({
      orderBy: { nama_fasilitas: 'asc' },
    });

    res.json({
      success: true,
      message: 'Berhasil mengambil data fasilitas',
      data,
    });
  } catch (error) {
    console.error('ERROR GET FASILITAS:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data fasilitas',
      error: error.message,
    });
  }
});

// ===============================
// GET DETAIL FASILITAS (publik)
// ===============================
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID tidak valid',
      });
    }

    const data = await prisma.fasilitas.findUnique({
      where: { fasilitas_id: id },
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Fasilitas tidak ditemukan',
      });
    }

    res.json({
      success: true,
      message: 'Berhasil mengambil detail fasilitas',
      data,
    });
  } catch (error) {
    console.error('ERROR GET DETAIL FASILITAS:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail fasilitas',
      error: error.message,
    });
  }
});

// ===============================
// TAMBAH FASILITAS (Admin)
// ===============================
router.post('/', verifyToken, checkRole('Admin'), async (req, res) => {
  try {
    const nama = (req.body.nama_fasilitas || '').trim();

    if (!nama) {
      return res.status(400).json({
        success: false,
        message: 'Nama fasilitas wajib diisi',
      });
    }

    const data = await prisma.fasilitas.create({
      data: { nama_fasilitas: nama },
    });

    res.status(201).json({
      success: true,
      message: 'Berhasil menambahkan fasilitas',
      data,
    });
  } catch (error) {
    console.error('ERROR TAMBAH FASILITAS:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Nama fasilitas sudah ada',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan fasilitas',
      error: error.message,
    });
  }
});

// ===============================
// UPDATE FASILITAS (Admin)
// ===============================
router.put('/:id', verifyToken, checkRole('Admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const nama = (req.body.nama_fasilitas || '').trim();

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID tidak valid',
      });
    }

    if (!nama) {
      return res.status(400).json({
        success: false,
        message: 'Nama fasilitas wajib diisi',
      });
    }

    const cek = await prisma.fasilitas.findUnique({
      where: { fasilitas_id: id },
    });

    if (!cek) {
      return res.status(404).json({
        success: false,
        message: 'Fasilitas tidak ditemukan',
      });
    }

    const data = await prisma.fasilitas.update({
      where: { fasilitas_id: id },
      data: { nama_fasilitas: nama },
    });

    res.json({
      success: true,
      message: 'Berhasil mengupdate fasilitas',
      data,
    });
  } catch (error) {
    console.error('ERROR UPDATE FASILITAS:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Nama fasilitas sudah digunakan',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate fasilitas',
      error: error.message,
    });
  }
});

// ===============================
// HAPUS FASILITAS (Admin)
// ===============================
router.delete('/:id', verifyToken, checkRole('Admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID tidak valid',
      });
    }

    const cek = await prisma.fasilitas.findUnique({
      where: { fasilitas_id: id },
    });

    if (!cek) {
      return res.status(404).json({
        success: false,
        message: 'Fasilitas tidak ditemukan',
      });
    }

    await prisma.fasilitas.delete({
      where: { fasilitas_id: id },
    });

    res.json({
      success: true,
      message: 'Berhasil menghapus fasilitas',
    });
  } catch (error) {
    console.error('ERROR DELETE FASILITAS:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal menghapus fasilitas',
      error: error.message,
    });
  }
});

export default router;
