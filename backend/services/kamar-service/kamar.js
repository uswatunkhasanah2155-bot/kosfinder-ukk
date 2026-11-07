import express from 'express';
import prisma from '../../lib/prisma.js';
import { verifyToken, verifyOwnerVerified } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Semua aksi tulis: harus login, role Owner, dan sudah diverifikasi Admin
const ownerTerverifikasi = [verifyToken, verifyOwnerVerified];

// Status yang boleh diatur manual oleh Owner (misalnya penghuni lama yang tidak lewat aplikasi).
// "DalamBooking" hanya diatur otomatis oleh modul booking.
const STATUS_MANUAL = ['Kosong', 'Terisi'];
const STATUS_BOOKING_BERJALAN = ['Menunggu', 'Disetujui'];
const HARGA_MAKS = 2000000000; // batas tipe integer di PostgreSQL

// ===============================
// HELPER
// ===============================
const parseId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const kosong = (v) => v === undefined || v === null || v === '';

// Validasi field kamar. semuaWajib = true untuk tambah, false untuk update parsial
const validasiKamar = (body, { semuaWajib }) => {
  const data = {};

  const teks = (nama, label, maks) => {
    if (!semuaWajib && body[nama] === undefined) return null;
    const v = String(body[nama] ?? '').trim();
    if (!v) return `${label} wajib diisi`;
    if (v.length > maks) return `${label} maksimal ${maks} karakter`;
    data[nama] = v;
    return null;
  };

  const error = teks('no_kamar', 'Nomor kamar', 20) || teks('tipe_kamar', 'Tipe kamar', 50);
  if (error) return { error };

  if (semuaWajib || body.harga !== undefined) {
    const h = Number(body.harga);
    if (kosong(body.harga) || !Number.isInteger(h) || h <= 0 || h > HARGA_MAKS) {
      return { error: 'Harga harus berupa bilangan bulat lebih dari 0 (per bulan)' };
    }
    data.harga = h;
  }

  if (body.status_kamar !== undefined) {
    if (!STATUS_MANUAL.includes(body.status_kamar)) {
      return {
        error: 'Status yang bisa diatur manual hanya Kosong atau Terisi. Status DalamBooking diatur otomatis oleh sistem booking',
      };
    }
    data.status_kamar = body.status_kamar;
  }

  return { data };
};

// Cari kamar yang kos-nya milik owner yang sedang login
const cariKamarMilik = (kamarId, ownerId) =>
  prisma.kamar.findFirst({
    where: { kamar_id: kamarId, kos: { owner_id: ownerId } },
  });

const adaBookingBerjalan = async (kamarId) => {
  const jumlah = await prisma.booking.count({
    where: { kamar_id: kamarId, status_booking: { in: STATUS_BOOKING_BERJALAN } },
  });
  return jumlah > 0;
};

// ===============================
// DAFTAR KAMAR PER KOS (publik, hanya kos Aktif)
// Query opsional: status=Kosong|DalamBooking|Terisi
// ===============================
router.get('/kos/:kosId/kamar', async (req, res) => {
  try {
    const kosId = parseId(req.params.kosId);
    if (!kosId) {
      return res.status(400).json({ success: false, message: 'ID kos tidak valid' });
    }

    const where = { kos_id: kosId };
    if (req.query.status) {
      if (!['Kosong', 'DalamBooking', 'Terisi'].includes(req.query.status)) {
        return res.status(400).json({ success: false, message: 'Status kamar tidak valid' });
      }
      where.status_kamar = req.query.status;
    }

    const kos = await prisma.kos.findFirst({ where: { kos_id: kosId, status_verifikasi: 'Aktif' } });
    if (!kos) {
      return res.status(404).json({ success: false, message: 'Kos tidak ditemukan' });
    }

    const data = await prisma.kamar.findMany({ where, orderBy: { no_kamar: 'asc' } });

    res.json({
      success: true,
      message: 'Berhasil mengambil data kamar',
      total: data.length,
      data,
    });
  } catch (error) {
    console.error('ERROR GET KAMAR:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data kamar',
      error: error.message,
    });
  }
});

// ===============================
// TAMBAH KAMAR (Owner pemilik kos)
// Body: no_kamar, tipe_kamar, harga, status_kamar (opsional: Kosong/Terisi, default Kosong)
// ===============================
router.post('/kos/:kosId/kamar', ownerTerverifikasi, async (req, res) => {
  try {
    const kosId = parseId(req.params.kosId);
    if (!kosId) {
      return res.status(400).json({ success: false, message: 'ID kos tidak valid' });
    }

    const kos = await prisma.kos.findFirst({ where: { kos_id: kosId, owner_id: req.user.user_id } });
    if (!kos) {
      return res.status(404).json({ success: false, message: 'Kos tidak ditemukan' });
    }

    const { data, error } = validasiKamar(req.body, { semuaWajib: true });
    if (error) return res.status(400).json({ success: false, message: error });

    const kamar = await prisma.kamar.create({ data: { ...data, kos_id: kosId } });

    res.status(201).json({
      success: true,
      message: 'Berhasil menambahkan kamar',
      data: kamar,
    });
  } catch (error) {
    console.error('ERROR TAMBAH KAMAR:', error);

    // Kombinasi (kos_id, no_kamar) harus unik
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Nomor kamar sudah ada di kos ini' });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan kamar',
      error: error.message,
    });
  }
});

// ===============================
// UPDATE KAMAR (Owner pemilik kos)
// Field yang tidak dikirim tidak diubah
// ===============================
router.put('/kamar/:id', ownerTerverifikasi, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid' });

    const kamarLama = await cariKamarMilik(id, req.user.user_id);
    if (!kamarLama) {
      return res.status(404).json({ success: false, message: 'Kamar tidak ditemukan' });
    }

    const { data, error } = validasiKamar(req.body, { semuaWajib: false });
    if (error) return res.status(400).json({ success: false, message: error });

    if (!Object.keys(data).length) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah' });
    }

    // Selama ada booking berjalan, status ditentukan oleh alur booking, bukan manual
    if (
      data.status_kamar !== undefined &&
      data.status_kamar !== kamarLama.status_kamar &&
      (await adaBookingBerjalan(id))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Status kamar tidak bisa diubah manual karena masih ada booking yang berjalan',
      });
    }

    const kamar = await prisma.kamar.update({ where: { kamar_id: id }, data });

    res.json({
      success: true,
      message: 'Berhasil mengupdate kamar',
      data: kamar,
    });
  } catch (error) {
    console.error('ERROR UPDATE KAMAR:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Nomor kamar sudah ada di kos ini' });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate kamar',
      error: error.message,
    });
  }
});

// ===============================
// HAPUS KAMAR (Owner pemilik kos)
// Ditolak jika masih ada booking Menunggu / Disetujui
// ===============================
router.delete('/kamar/:id', ownerTerverifikasi, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid' });

    const kamar = await cariKamarMilik(id, req.user.user_id);
    if (!kamar) {
      return res.status(404).json({ success: false, message: 'Kamar tidak ditemukan' });
    }

    if (await adaBookingBerjalan(id)) {
      return res.status(400).json({
        success: false,
        message: 'Kamar tidak bisa dihapus karena masih ada booking yang berjalan',
      });
    }

    await prisma.kamar.delete({ where: { kamar_id: id } });

    res.json({ success: true, message: 'Berhasil menghapus kamar' });
  } catch (error) {
    console.error('ERROR DELETE KAMAR:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal menghapus kamar',
      error: error.message,
    });
  }
});

export default router;