import express from 'express';
import prisma from '../../lib/prisma.js';
import { verifyToken, checkRole } from '../../middleware/authMiddleware.js';

const router = express.Router();

const TIPE_KOS = ['Putra', 'Putri', 'Campur'];
const STATUS_BOOKING = ['Menunggu', 'Disetujui', 'Ditolak', 'Selesai'];
const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const WIB_MS = 7 * 60 * 60 * 1000; // selisih WIB terhadap UTC

// ===============================
// HELPER
// ===============================
const tahunIniWib = () => new Date(Date.now() + WIB_MS).getUTCFullYear();

const bulatkan = (n) => Math.round(n * 10) / 10;

const persen = (bagian, total) => (total > 0 ? bulatkan((bagian / total) * 100) : 0);

// Baca dan validasi filter dari query: kota, tipe, status, tahun
const bacaFilter = (query) => {
  const { kota, tipe, status } = query;

  if (tipe && !TIPE_KOS.includes(tipe)) {
    return { error: 'Tipe kos harus Putra, Putri, atau Campur' };
  }
  if (status && !STATUS_BOOKING.includes(status)) {
    return { error: 'Status booking harus Menunggu, Disetujui, Ditolak, atau Selesai' };
  }

  let tahun = tahunIniWib();
  if (query.tahun !== undefined && query.tahun !== '') {
    tahun = Number(query.tahun);
    if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) {
      return { error: 'Tahun tidak valid' };
    }
  }

  // Filter untuk tabel kos (dipakai juga sebagai filter relasi dari booking)
  const kosWhere = {};
  if (kota) kosWhere.kota = { contains: String(kota), mode: 'insensitive' };
  if (tipe) kosWhere.tipe_kos = tipe;

  return { kosWhere, status: status || null, tahun, filter: { kota: kota || null, tipe: tipe || null, status: status || null, tahun } };
};

// Kerangka 12 bulan dengan nilai awal 0
const kerangkaBulan = (isi) =>
  NAMA_BULAN.map((nama, i) => ({ bulan: i + 1, label: nama.slice(0, 3), nama_bulan: nama, ...isi() }));

// ===============================
// DASHBOARD OWNER
// Query opsional: kota, tipe, status (status booking), tahun
// - okupansi_per_kos: grafik okupansi kamar
// - pendapatan_per_bulan: estimasi pendapatan. Setiap booking jenis Kamar menyumbang harga
//   sewa pada tiap bulan masa sewanya (mulai dari bulan tanggal booking selama durasi_bulan).
//   Tanpa filter status, yang dihitung hanya booking Disetujui dan Selesai.
// ===============================
router.get('/owner/dashboard', verifyToken, checkRole('Owner'), async (req, res) => {
  try {
    const f = bacaFilter(req.query);
    if (f.error) return res.status(400).json({ success: false, message: f.error });

    const kosWhere = { ...f.kosWhere, owner_id: req.user.user_id };

    const [daftarKos, booking] = await Promise.all([
      prisma.kos.findMany({
        where: kosWhere,
        select: {
          kos_id: true,
          nama_kos: true,
          kota: true,
          tipe_kos: true,
          kamar: { select: { status_kamar: true } },
        },
        orderBy: { kos_id: 'asc' },
      }),
      prisma.booking.findMany({
        where: {
          kamar: { kos: kosWhere },
          ...(f.status && { status_booking: f.status }),
        },
        select: {
          jenis_booking: true,
          tanggal_survey: true,
          durasi_bulan: true,
          status_booking: true,
          kamar: { select: { harga: true } },
        },
      }),
    ]);

    // --- Okupansi per kos ---
    const okupansiPerKos = daftarKos.map((k) => {
      const hitung = (s) => k.kamar.filter((m) => m.status_kamar === s).length;
      const terisi = hitung('Terisi');
      return {
        kos_id: k.kos_id,
        nama_kos: k.nama_kos,
        kota: k.kota,
        tipe_kos: k.tipe_kos,
        jumlah_kamar: k.kamar.length,
        kosong: hitung('Kosong'),
        dalam_booking: hitung('DalamBooking'),
        terisi,
        okupansi_persen: persen(terisi, k.kamar.length),
      };
    });

    const totalKamar = okupansiPerKos.reduce((a, k) => a + k.jumlah_kamar, 0);
    const totalTerisi = okupansiPerKos.reduce((a, k) => a + k.terisi, 0);
    const totalDalamBooking = okupansiPerKos.reduce((a, k) => a + k.dalam_booking, 0);

    // --- Estimasi pendapatan per bulan ---
    const pendapatan = kerangkaBulan(() => ({ estimasi_pendapatan: 0, jumlah_booking: 0 }));
    const statusPendapatan = f.status ? [f.status] : ['Disetujui', 'Selesai'];

    for (const b of booking) {
      if (b.jenis_booking !== 'Kamar' || !statusPendapatan.includes(b.status_booking)) continue;

      const tahunMulai = b.tanggal_survey.getUTCFullYear();
      const bulanMulai = b.tanggal_survey.getUTCMonth();

      for (let i = 0; i < b.durasi_bulan; i++) {
        const idx = bulanMulai + i;
        const tahunBulan = tahunMulai + Math.floor(idx / 12);
        if (tahunBulan !== f.tahun) continue;

        const baris = pendapatan[idx % 12];
        baris.estimasi_pendapatan += b.kamar.harga;
        if (i === 0) baris.jumlah_booking += 1;
      }
    }

    // --- Booking per status ---
    const bookingPerStatus = Object.fromEntries(STATUS_BOOKING.map((s) => [s, 0]));
    for (const b of booking) bookingPerStatus[b.status_booking] += 1;

    res.json({
      success: true,
      message: 'Berhasil mengambil dashboard Owner',
      filter: f.filter,
      data: {
        ringkasan: {
          total_kos: daftarKos.length,
          total_kamar: totalKamar,
          kamar_kosong: totalKamar - totalTerisi - totalDalamBooking,
          kamar_dalam_booking: totalDalamBooking,
          kamar_terisi: totalTerisi,
          okupansi_persen: persen(totalTerisi, totalKamar),
          total_booking: booking.length,
          total_estimasi_pendapatan_tahun: pendapatan.reduce((a, p) => a + p.estimasi_pendapatan, 0),
        },
        okupansi_per_kos: okupansiPerKos,
        pendapatan_per_bulan: pendapatan,
        booking_per_status: bookingPerStatus,
      },
    });
  } catch (error) {
    console.error('ERROR DASHBOARD OWNER:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil dashboard Owner',
      error: error.message,
    });
  }
});

// ===============================
// DASHBOARD ADMIN
// Query opsional: kota, tipe, status (status booking), tahun
// - kos_per_wilayah: jumlah kos terdaftar per kota
// - pertumbuhan_booking: jumlah booking baru per bulan (berdasarkan dibuat_pada, WIB)
// ===============================
router.get('/admin/dashboard', verifyToken, checkRole('Admin'), async (req, res) => {
  try {
    const f = bacaFilter(req.query);
    if (f.error) return res.status(400).json({ success: false, message: f.error });

    // Batas tahun berdasarkan WIB
    const awal = new Date(Date.UTC(f.tahun, 0, 1) - WIB_MS);
    const akhir = new Date(Date.UTC(f.tahun + 1, 0, 1) - WIB_MS);

    const [kosPerWilayah, kosPerStatus, totalOwner, ownerMenunggu, totalUser, booking, totalBooking] =
      await Promise.all([
        prisma.kos.groupBy({
          by: ['kota'],
          where: f.kosWhere,
          _count: { kos_id: true },
          orderBy: { _count: { kos_id: 'desc' } },
        }),
        prisma.kos.groupBy({
          by: ['status_verifikasi'],
          where: f.kosWhere,
          _count: { kos_id: true },
        }),
        prisma.user.count({ where: { role: 'Owner' } }),
        prisma.user.count({ where: { role: 'Owner', status_verifikasi: 'Menunggu' } }),
        prisma.user.count({ where: { role: 'User' } }),
        prisma.booking.findMany({
          where: {
            kamar: { kos: f.kosWhere },
            dibuat_pada: { gte: awal, lt: akhir },
            ...(f.status && { status_booking: f.status }),
          },
          select: { dibuat_pada: true },
        }),
        prisma.booking.count({
          where: {
            kamar: { kos: f.kosWhere },
            ...(f.status && { status_booking: f.status }),
          },
        }),
      ]);

    // --- Pertumbuhan booking per bulan ---
    const pertumbuhan = kerangkaBulan(() => ({ jumlah_booking: 0, kumulatif: 0 }));
    for (const b of booking) {
      const bulan = new Date(b.dibuat_pada.getTime() + WIB_MS).getUTCMonth();
      pertumbuhan[bulan].jumlah_booking += 1;
    }
    let berjalan = 0;
    for (const p of pertumbuhan) {
      berjalan += p.jumlah_booking;
      p.kumulatif = berjalan;
    }

    const totalKos = kosPerWilayah.reduce((a, w) => a + w._count.kos_id, 0);

    res.json({
      success: true,
      message: 'Berhasil mengambil dashboard Admin',
      filter: f.filter,
      data: {
        ringkasan: {
          total_kos: totalKos,
          total_owner: totalOwner,
          owner_menunggu_verifikasi: ownerMenunggu,
          total_user: totalUser,
          total_booking: totalBooking,
        },
        kos_per_wilayah: kosPerWilayah.map((w) => ({ kota: w.kota, jumlah_kos: w._count.kos_id })),
        kos_per_status: Object.fromEntries(kosPerStatus.map((s) => [s.status_verifikasi, s._count.kos_id])),
        pertumbuhan_booking: pertumbuhan,
      },
    });
  } catch (error) {
    console.error('ERROR DASHBOARD ADMIN:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil dashboard Admin',
      error: error.message,
    });
  }
});

// ===============================
// DAFTAR WILAYAH (publik) - untuk pilihan filter di frontend
// ===============================
router.get('/wilayah', async (req, res) => {
  try {
    const data = await prisma.kos.groupBy({
      by: ['kota'],
      where: { status_verifikasi: 'Aktif' },
      _count: { kos_id: true },
      orderBy: { kota: 'asc' },
    });

    res.json({
      success: true,
      message: 'Berhasil mengambil daftar wilayah',
      data: data.map((w) => ({ kota: w.kota, jumlah_kos: w._count.kos_id })),
    });
  } catch (error) {
    console.error('ERROR GET WILAYAH:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar wilayah',
      error: error.message,
    });
  }
});

export default router;