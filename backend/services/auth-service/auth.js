import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma.js';
import { verifyToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

const emailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// Data user yang aman dikirim ke frontend (tanpa password)
const publicUser = (u) => ({
  user_id: u.user_id,
  nama: u.nama,
  email: u.email,
  role: u.role,
  no_wa: u.no_wa,
  status_verifikasi: u.status_verifikasi,
});

// ===============================
// REGISTER (role: User atau Owner)
// ===============================
router.post('/register', async (req, res) => {
  try {
    const { nama, email, password, role, no_wa } = req.body;

    if (!nama || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Nama, email, password, dan role wajib diisi',
      });
    }

    if (!emailValid(email)) {
      return res.status(400).json({ success: false, message: 'Format email tidak valid' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
    }

    if (!['User', 'Owner'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role harus User atau Owner' });
    }

    const emailBersih = email.trim().toLowerCase();

    const sudahAda = await prisma.user.findUnique({ where: { email: emailBersih } });
    if (sudahAda) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
    }

    const userBaru = await prisma.user.create({
      data: {
        nama: nama.trim(),
        email: emailBersih,
        password: await bcrypt.hash(password, 10),
        role,
        no_wa: no_wa || null,
        // Pencari kos langsung terverifikasi; pemilik kos menunggu verifikasi Admin
        status_verifikasi: role === 'Owner' ? 'Menunggu' : 'Terverifikasi',
      },
    });

    res.status(201).json({
      success: true,
      message:
        role === 'Owner'
          ? 'Registrasi berhasil. Akun Anda menunggu verifikasi Admin.'
          : 'Registrasi berhasil. Silakan login.',
      data: publicUser(userBaru),
    });
  } catch (error) {
    console.error('ERROR REGISTER:', error);

    res.status(500).json({
      success: false,
      message: 'Registrasi gagal',
      error: error.message,
    });
  }
});

// ===============================
// LOGIN
// ===============================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // Pesan sengaja dibuat sama agar tidak membocorkan email mana yang terdaftar
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      message: 'Login berhasil',
      token,
      data: publicUser(user),
    });
  } catch (error) {
    console.error('ERROR LOGIN:', error);

    res.status(500).json({
      success: false,
      message: 'Login gagal',
      error: error.message,
    });
  }
});

// ===============================
// DATA USER YANG SEDANG LOGIN
// ===============================
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    res.json({
      success: true,
      message: 'Berhasil mengambil data user',
      data: publicUser(user),
    });
  } catch (error) {
    console.error('ERROR GET ME:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data user',
      error: error.message,
    });
  }
});

export default router;