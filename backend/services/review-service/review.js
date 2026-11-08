import express from 'express';
import prisma from '../../lib/prisma.js';
import { verifyToken, checkRole } from '../../middleware/authMiddleware.js';

const router = express.Router();

const KOMENTAR_MAKS = 500;

// ===============================
// HELPER
// ===============================
const parseId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const formatReview = (r) => ({
  review_id: r.review_id,
  booking_id: r.booking_id,
  rating: r.rating,
  komentar: r.komentar,
  dibuat_pada: r.dibuat_pada,
  pemberi_review: r.booking?.user?.nama ?? null,
  kamar: r.booking?.kamar?.no_kamar ?? null,
});

// ===============================
// BERI REVIEW (User pemesan)
// Syarat: booking milik sendiri, berstatus Selesai, dan belum pernah direview
// Body: rating (1-5), komentar (opsional, maks 500 karakter)
// ===============================
router.post('/booking/:id/review', verifyToken, checkRole('User'), async (req, res) => {
  try {
    const bookingId = parseId(req.params.id);
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'ID booking tidak valid' });
    }

    const rating = Number(req.body.rating);
    if (req.body.rating === undefined || req.body.rating === '' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating harus bilangan bulat 1 sampai 5' });
    }

    let komentar = null;
    if (req.body.komentar !== undefined && req.body.komentar !== null) {
      komentar = String(req.body.komentar).trim() || null;
      if (komentar && komentar.length > KOMENTAR_MAKS) {
        return res.status(400).json({
          success: false,
          message: `Komentar maksimal ${KOMENTAR_MAKS} karakter`,
        });
      }
    }

    const booking = await prisma.booking.findFirst({
      where: { booking_id: bookingId, user_id: req.user.user_id },
      include: { review: true },
    });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    }
    if (booking.status_booking !== 'Selesai') {
      return res.status(400).json({
        success: false,
        message: 'Review hanya bisa diberikan setelah booking berstatus Selesai',
      });
    }
    if (booking.review) {
      return res.status(400).json({ success: false, message: 'Anda sudah memberi review untuk booking ini' });
    }

    const review = await prisma.review.create({
      data: { booking_id: bookingId, rating, komentar },
      include: { booking: { include: { user: { select: { nama: true } }, kamar: { select: { no_kamar: true } } } } },
    });

    res.status(201).json({
      success: true,
      message: 'Terima kasih, review berhasil dikirim',
      data: formatReview(review),
    });
  } catch (error) {
    console.error('ERROR BERI REVIEW:', error);

    // booking_id unik: jaga-jaga kalau dua request masuk bersamaan
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Anda sudah memberi review untuk booking ini' });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal mengirim review',
      error: error.message,
    });
  }
});

// ===============================
// DAFTAR REVIEW SATU KOS (publik, hanya kos Aktif)
// Query opsional: page (default 1), limit (default 10, maks 50)
// ===============================
router.get('/kos/:id/review', async (req, res) => {
  try {
    const kosId = parseId(req.params.id);
    if (!kosId) {
      return res.status(400).json({ success: false, message: 'ID kos tidak valid' });
    }

    const kos = await prisma.kos.findFirst({ where: { kos_id: kosId, status_verifikasi: 'Aktif' } });
    if (!kos) {
      return res.status(404).json({ success: false, message: 'Kos tidak ditemukan' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const where = { booking: { kamar: { kos_id: kosId } } };

    const [ringkasan, daftar] = await Promise.all([
      prisma.review.aggregate({ where, _avg: { rating: true }, _count: { review_id: true } }),
      prisma.review.findMany({
        where,
        include: {
          booking: { include: { user: { select: { nama: true } }, kamar: { select: { no_kamar: true } } } },
        },
        orderBy: { dibuat_pada: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const rata = ringkasan._avg.rating;

    res.json({
      success: true,
      message: 'Berhasil mengambil review kos',
      rata_rating: rata === null ? null : Math.round(rata * 10) / 10,
      jumlah_review: ringkasan._count.review_id,
      page,
      limit,
      data: daftar.map(formatReview),
    });
  } catch (error) {
    console.error('ERROR GET REVIEW KOS:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil review',
      error: error.message,
    });
  }
});

export default router;