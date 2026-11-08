import express from 'express';
import prisma from '../../lib/prisma.js';
import { verifyToken, checkRole, verifyOwnerVerified } from '../../middleware/authMiddleware.js';

const router = express.Router();

const ownerTerverifikasi = [verifyToken, verifyOwnerVerified];

const STATUS_BOOKING = ['Menunggu', 'Disetujui', 'Ditolak', 'Selesai'];
const JENIS_BOOKING = ['Survey', 'Kamar'];
const DURASI_MAKS_BULAN = 24;

// ===============================
// HELPER
// ===============================
const parseId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const kosong = (v) => v === undefined || v === null || v === '';

// Tanggal hari ini (YYYY-MM-DD) menurut WIB
const hariIniWib = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

// Validasi string tanggal YYYY-MM-DD, kembalikan objek Date (UTC tengah malam) atau null
const parseTanggal = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  return d;
};

// Relasi yang dibawa saat mengambil booking
const INCLUDE_BOOKING = {
  kamar: {
    include: {
      kos: { select: { kos_id: true, nama_kos: true, alamat: true, kota: true, owner_id: true } },
    },
  },
  user: { select: { user_id: true, nama: true, no_wa: true } },
  review: true,
};

// Bentuk respons booking yang enak dipakai frontend
const formatBooking = (b) => ({
  booking_id: b.booking_id,
  kode_booking: `BOOK${String(b.booking_id).padStart(5, '0')}`,
  jenis_booking: b.jenis_booking,
  tanggal_survey: b.tanggal_survey.toISOString().slice(0, 10),
  durasi_bulan: b.durasi_bulan,
  total_biaya: b.jenis_booking === 'Kamar' ? b.kamar.harga * b.durasi_bulan : null,
  status_booking: b.status_booking,
  dibuat_pada: b.dibuat_pada,
  kamar: {
    kamar_id: b.kamar.kamar_id,
    no_kamar: b.kamar.no_kamar,
    tipe_kamar: b.kamar.tipe_kamar,
    harga: b.kamar.harga,
    status_kamar: b.kamar.status_kamar,
  },
  kos: {
    kos_id: b.kamar.kos.kos_id,
    nama_kos: b.kamar.kos.nama_kos,
    alamat: b.kamar.kos.alamat,
    kota: b.kamar.kos.kota,
  },
  pemesan: { user_id: b.user.user_id, nama: b.user.nama, no_wa: b.user.no_wa },
  sudah_review: !!b.review,
  review: b.review || null,
});

// Cari booking yang kamarnya berada di kos milik owner yang sedang login
const cariBookingOwner = (bookingId, ownerId) =>
  prisma.booking.findFirst({
    where: { booking_id: bookingId, kamar: { kos: { owner_id: ownerId } } },
    include: INCLUDE_BOOKING,
  });

// ===============================
// AJUKAN BOOKING (User)
// Body: kamar_id, jenis_booking ("Survey" | "Kamar"), tanggal_survey (YYYY-MM-DD),
//       durasi_bulan (hanya untuk jenis Kamar, default 1)
// Survey      -> tidak mengubah status kamar
// Kamar       -> kamar harus Kosong, lalu berubah menjadi DalamBooking
// ===============================
router.post('/booking', verifyToken, checkRole('User'), async (req, res) => {
  try {
    const kamar_id = parseId(req.body.kamar_id);
    if (!kamar_id) {
      return res.status(400).json({ success: false, message: 'kamar_id tidak valid' });
    }

    const { jenis_booking } = req.body;
    if (!JENIS_BOOKING.includes(jenis_booking)) {
      return res.status(400).json({ success: false, message: 'Jenis booking harus Survey atau Kamar' });
    }

    const tanggal = parseTanggal(req.body.tanggal_survey);
    if (!tanggal) {
      return res.status(400).json({ success: false, message: 'Tanggal tidak valid, gunakan format YYYY-MM-DD' });
    }
    if (req.body.tanggal_survey < hariIniWib()) {
      return res.status(400).json({ success: false, message: 'Tanggal tidak boleh sebelum hari ini' });
    }

    let durasi = 1;
    if (jenis_booking === 'Kamar' && !kosong(req.body.durasi_bulan)) {
      durasi = Number(req.body.durasi_bulan);
      if (!Number.isInteger(durasi) || durasi < 1 || durasi > DURASI_MAKS_BULAN) {
        return res.status(400).json({
          success: false,
          message: `Durasi sewa harus bilangan bulat 1 sampai ${DURASI_MAKS_BULAN} bulan`,
        });
      }
    }

    const kamar = await prisma.kamar.findFirst({
      where: { kamar_id, kos: { status_verifikasi: 'Aktif' } },
    });
    if (!kamar) {
      return res.status(404).json({ success: false, message: 'Kamar tidak ditemukan' });
    }

    if (kamar.status_kamar === 'Terisi') {
      return res.status(400).json({ success: false, message: 'Kamar ini sudah terisi' });
    }
    if (jenis_booking === 'Kamar' && kamar.status_kamar !== 'Kosong') {
      return res.status(400).json({
        success: false,
        message: 'Kamar ini sedang dalam proses booking oleh pengguna lain',
      });
    }

    // Cegah pengajuan ganda dari user yang sama untuk kamar dan jenis yang sama
    const sudahAda = await prisma.booking.findFirst({
      where: {
        user_id: req.user.user_id,
        kamar_id,
        jenis_booking,
        status_booking: { in: ['Menunggu', 'Disetujui'] },
      },
    });
    if (sudahAda) {
      return res.status(400).json({
        success: false,
        message: `Anda sudah punya booking ${jenis_booking} yang masih berjalan untuk kamar ini`,
      });
    }

    const baru = await prisma.$transaction(async (tx) => {
      if (jenis_booking === 'Kamar') {
        // updateMany bersyarat: hanya satu pemesan yang berhasil mengunci kamar
        const kunci = await tx.kamar.updateMany({
          where: { kamar_id, status_kamar: 'Kosong' },
          data: { status_kamar: 'DalamBooking' },
        });
        if (kunci.count === 0) throw new Error('KAMAR_TIDAK_TERSEDIA');
      }

      return tx.booking.create({
        data: {
          kamar_id,
          user_id: req.user.user_id,
          jenis_booking,
          tanggal_survey: tanggal,
          durasi_bulan: durasi,
        },
        include: INCLUDE_BOOKING,
      });
    });

    res.status(201).json({
      success: true,
      message: 'Booking berhasil diajukan, menunggu persetujuan pemilik kos',
      data: formatBooking(baru),
    });
  } catch (error) {
    console.error('ERROR AJUKAN BOOKING:', error);

    if (error.message === 'KAMAR_TIDAK_TERSEDIA') {
      return res.status(400).json({
        success: false,
        message: 'Kamar ini baru saja dibooking pengguna lain',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal mengajukan booking',
      error: error.message,
    });
  }
});

// ===============================
// RIWAYAT BOOKING SAYA (User)
// Query opsional: status
// Harus di atas '/booking/:id' supaya "saya" tidak dianggap id
// ===============================
router.get('/booking/saya', verifyToken, checkRole('User'), async (req, res) => {
  try {
    const where = { user_id: req.user.user_id };

    if (req.query.status) {
      if (!STATUS_BOOKING.includes(req.query.status)) {
        return res.status(400).json({ success: false, message: 'Status booking tidak valid' });
      }
      where.status_booking = req.query.status;
    }

    const data = await prisma.booking.findMany({
      where,
      include: INCLUDE_BOOKING,
      orderBy: { dibuat_pada: 'desc' },
    });

    res.json({
      success: true,
      message: 'Berhasil mengambil riwayat booking',
      total: data.length,
      data: data.map(formatBooking),
    });
  } catch (error) {
    console.error('ERROR GET BOOKING SAYA:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat booking',
      error: error.message,
    });
  }
});

// ===============================
// BOOKING MASUK (Owner)
// Query opsional: status, kos_id
// ===============================
router.get('/owner/booking', verifyToken, checkRole('Owner'), async (req, res) => {
  try {
    const where = { kamar: { kos: { owner_id: req.user.user_id } } };

    if (req.query.status) {
      if (!STATUS_BOOKING.includes(req.query.status)) {
        return res.status(400).json({ success: false, message: 'Status booking tidak valid' });
      }
      where.status_booking = req.query.status;
    }

    if (req.query.kos_id) {
      const kosId = parseId(req.query.kos_id);
      if (!kosId) {
        return res.status(400).json({ success: false, message: 'kos_id tidak valid' });
      }
      where.kamar.kos.kos_id = kosId;
    }

    const data = await prisma.booking.findMany({
      where,
      include: INCLUDE_BOOKING,
      orderBy: { dibuat_pada: 'desc' },
    });

    res.json({
      success: true,
      message: 'Berhasil mengambil data booking',
      total: data.length,
      data: data.map(formatBooking),
    });
  } catch (error) {
    console.error('ERROR GET BOOKING OWNER:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data booking',
      error: error.message,
    });
  }
});

// ===============================
// DETAIL BOOKING (pemesan, owner kos terkait, atau Admin)
// ===============================
router.get('/booking/:id', verifyToken, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid' });

    const booking = await prisma.booking.findUnique({
      where: { booking_id: id },
      include: INCLUDE_BOOKING,
    });

    const boleh =
      booking &&
      (req.user.role === 'Admin' ||
        booking.user_id === req.user.user_id ||
        booking.kamar.kos.owner_id === req.user.user_id);

    // Sengaja satu pesan untuk "tidak ada" dan "bukan milik Anda"
    if (!boleh) {
      return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    }

    res.json({
      success: true,
      message: 'Berhasil mengambil detail booking',
      data: formatBooking(booking),
    });
  } catch (error) {
    console.error('ERROR DETAIL BOOKING:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail booking',
      error: error.message,
    });
  }
});

// ===============================
// SETUJUI BOOKING (Owner pemilik kos)
// Menunggu -> Disetujui. Jenis Kamar: kamar menjadi Terisi.
// ===============================
router.patch('/booking/:id/setujui', ownerTerverifikasi, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid' });

    const booking = await cariBookingOwner(id, req.user.user_id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    }
    if (booking.status_booking !== 'Menunggu') {
      return res.status(400).json({
        success: false,
        message: `Booking berstatus ${booking.status_booking}, hanya booking Menunggu yang bisa disetujui`,
      });
    }

    await prisma.$transaction(async (tx) => {
      const ubah = await tx.booking.updateMany({
        where: { booking_id: id, status_booking: 'Menunggu' },
        data: { status_booking: 'Disetujui' },
      });
      if (ubah.count === 0) throw new Error('STATUS_BERUBAH');

      if (booking.jenis_booking === 'Kamar') {
        await tx.kamar.update({
          where: { kamar_id: booking.kamar_id },
          data: { status_kamar: 'Terisi' },
        });
      }
    });

    const terbaru = await cariBookingOwner(id, req.user.user_id);

    res.json({
      success: true,
      message: 'Booking berhasil disetujui',
      data: formatBooking(terbaru),
    });
  } catch (error) {
    console.error('ERROR SETUJUI BOOKING:', error);

    if (error.message === 'STATUS_BERUBAH') {
      return res.status(400).json({ success: false, message: 'Status booking baru saja berubah, muat ulang data' });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal menyetujui booking',
      error: error.message,
    });
  }
});

// ===============================
// TOLAK BOOKING (Owner pemilik kos)
// Menunggu -> Ditolak. Jenis Kamar: kamar kembali Kosong.
// ===============================
router.patch('/booking/:id/tolak', ownerTerverifikasi, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid' });

    const booking = await cariBookingOwner(id, req.user.user_id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    }
    if (booking.status_booking !== 'Menunggu') {
      return res.status(400).json({
        success: false,
        message: `Booking berstatus ${booking.status_booking}, hanya booking Menunggu yang bisa ditolak`,
      });
    }

    await prisma.$transaction(async (tx) => {
      const ubah = await tx.booking.updateMany({
        where: { booking_id: id, status_booking: 'Menunggu' },
        data: { status_booking: 'Ditolak' },
      });
      if (ubah.count === 0) throw new Error('STATUS_BERUBAH');

      if (booking.jenis_booking === 'Kamar') {
        await tx.kamar.updateMany({
          where: { kamar_id: booking.kamar_id, status_kamar: 'DalamBooking' },
          data: { status_kamar: 'Kosong' },
        });
      }
    });

    const terbaru = await cariBookingOwner(id, req.user.user_id);

    res.json({
      success: true,
      message: 'Booking berhasil ditolak',
      data: formatBooking(terbaru),
    });
  } catch (error) {
    console.error('ERROR TOLAK BOOKING:', error);

    if (error.message === 'STATUS_BERUBAH') {
      return res.status(400).json({ success: false, message: 'Status booking baru saja berubah, muat ulang data' });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal menolak booking',
      error: error.message,
    });
  }
});

// ===============================
// TANDAI SELESAI (Owner pemilik kos)
// Disetujui -> Selesai (survey sudah dilakukan / masa sewa berakhir).
// Jenis Kamar: kamar kembali Kosong. Setelah Selesai, User bisa memberi review.
// ===============================
router.patch('/booking/:id/selesai', ownerTerverifikasi, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid' });

    const booking = await cariBookingOwner(id, req.user.user_id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
    }
    if (booking.status_booking !== 'Disetujui') {
      return res.status(400).json({
        success: false,
        message: `Booking berstatus ${booking.status_booking}, hanya booking Disetujui yang bisa diselesaikan`,
      });
    }

    await prisma.$transaction(async (tx) => {
      const ubah = await tx.booking.updateMany({
        where: { booking_id: id, status_booking: 'Disetujui' },
        data: { status_booking: 'Selesai' },
      });
      if (ubah.count === 0) throw new Error('STATUS_BERUBAH');

      if (booking.jenis_booking === 'Kamar') {
        await tx.kamar.updateMany({
          where: { kamar_id: booking.kamar_id, status_kamar: 'Terisi' },
          data: { status_kamar: 'Kosong' },
        });
      }
    });

    const terbaru = await cariBookingOwner(id, req.user.user_id);

    res.json({
      success: true,
      message: 'Booking ditandai selesai',
      data: formatBooking(terbaru),
    });
  } catch (error) {
    console.error('ERROR SELESAI BOOKING:', error);

    if (error.message === 'STATUS_BERUBAH') {
      return res.status(400).json({ success: false, message: 'Status booking baru saja berubah, muat ulang data' });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal menyelesaikan booking',
      error: error.message,
    });
  }
});

export default router;