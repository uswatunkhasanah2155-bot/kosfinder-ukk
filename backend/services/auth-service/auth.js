import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma.js';
import { verifyToken } from '../../middleware/authMiddleware.js';

const router = express.Router();

const emailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// Batas panjang input, sama dengan panjang kolom di database (users)
const MAKS_EMAIL = 100;
const MAKS_NAMA = 100;
const MAKS_WA = 20;
const MAKS_PASSWORD_LOGIN = 128;

// Password minimal 8 karakter, harus mengandung huruf, angka, dan simbol
const passwordKuat = (p) =>
  typeof p === 'string' &&
  p.length >= 8 &&
  /[A-Za-z]/.test(p) &&
  /\d/.test(p) &&
  /[^A-Za-z0-9\s]/.test(p);

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

    if (typeof nama !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Data yang dikirim tidak valid' });
    }

    // Email dirapikan dulu supaya spasi di awal/akhir tidak membuat format dianggap salah
    const emailBersih = email.trim().toLowerCase();

    if (!emailValid(emailBersih)) {
      return res.status(400).json({ success: false, message: 'Format email tidak valid' });
    }

    if (emailBersih.length > MAKS_EMAIL) {
      return res.status(400).json({ success: false, message: `Email maksimal ${MAKS_EMAIL} karakter` });
    }

    if (nama.trim().length > MAKS_NAMA) {
      return res.status(400).json({ success: false, message: `Nama maksimal ${MAKS_NAMA} karakter` });
    }

    if (no_wa && String(no_wa).trim().length > MAKS_WA) {
      return res.status(400).json({ success: false, message: `Nomor WhatsApp maksimal ${MAKS_WA} karakter` });
    }

    if (!passwordKuat(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password minimal 8 karakter dan harus mengandung huruf, angka, dan simbol',
      });
    }

    if (!['User', 'Owner'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role harus User atau Owner' });
    }

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
        no_wa: no_wa ? String(no_wa).trim() : null,
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

    // Dua permintaan dengan email sama yang masuk bersamaan: yang kedua ditolak oleh database
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
    }

    res.status(500).json({
      success: false,
      message: 'Registrasi gagal',
    });
  }
});

// ===============================
// CEK KETERSEDIAAN EMAIL (publik)
// GET /cek-email?email=... -> { tersedia: true | false }
// Dipakai form daftar untuk memberi tahu lebih awal jika email sudah terpakai
// ===============================
router.get('/cek-email', async (req, res) => {
  try {
    const { email } = req.query;

    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email wajib diisi' });
    }

    const emailBersih = email.trim().toLowerCase();

    if (!emailValid(emailBersih) || emailBersih.length > MAKS_EMAIL) {
      return res.status(400).json({ success: false, message: 'Format email tidak valid' });
    }

    const ada = await prisma.user.findUnique({
      where: { email: emailBersih },
      select: { user_id: true },
    });

    res.json({
      success: true,
      message: ada ? 'Email sudah terdaftar' : 'Email tersedia',
      tersedia: !ada,
    });
  } catch (error) {
    console.error('ERROR CEK EMAIL:', error);

    res.status(500).json({ success: false, message: 'Gagal memeriksa email' });
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

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    }

    const emailBersih = email.trim().toLowerCase();

    // Input yang panjangnya tidak masuk akal tidak perlu dicek ke database
    if (emailBersih.length > MAKS_EMAIL || password.length > MAKS_PASSWORD_LOGIN) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    const user = await prisma.user.findUnique({
      where: { email: emailBersih },
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
    });
  }
});

export default router;