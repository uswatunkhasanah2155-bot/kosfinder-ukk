import express from 'express';
import prisma from '../../lib/prisma.js';
import upload from '../../middleware/upload.js';
import { uploadFoto, hapusFoto } from '../../lib/cloudinary.js';
import { verifyToken, checkRole, verifyOwnerVerified } from '../../middleware/authMiddleware.js';

const router = express.Router();

const TIPE_KOS = ['Putra', 'Putri', 'Campur'];
const MAKS_FOTO_PER_KOS = 8;

// Middleware untuk semua aksi tulis milik Owner: harus login, role Owner, dan sudah diverifikasi Admin
const ownerTerverifikasi = [verifyToken, verifyOwnerVerified];

// ===============================
// HELPER
// ===============================

// Path foto di database -> URL lengkap untuk frontend
const fotoUrl = (p) => {
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  if (/^\/?uploads\//.test(p)) return `/${p.replace(/^\/+/, '')}`; // data lama (lokal)
  return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${p}`;
};

const kosong = (v) => v === undefined || v === null || v === '';

// Jarak dua titik di bumi (km), rumus Haversine
const hitungJarakKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Relasi yang selalu dibawa saat mengambil kos
const INCLUDE_KOS = {
  foto: true,
  fasilitas: { include: { fasilitas: true } },
  kamar: {
    orderBy: { no_kamar: 'asc' },
    include: { bookings: { select: { review: { select: { rating: true } } } } },
  },
};

// Ubah data Prisma menjadi bentuk yang enak dipakai frontend/Leaflet
const formatKos = (k, { denganKamar = false } = {}) => {
  const kamar = k.kamar || [];

  const ratings = kamar.flatMap((m) =>
    (m.bookings || []).map((b) => b.review?.rating).filter((r) => r != null)
  );
  const rata_rating = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null;

  const harga = kamar.map((m) => m.harga);

  const hasil = {
    kos_id: k.kos_id,
    owner_id: k.owner_id,
    nama_kos: k.nama_kos,
    alamat: k.alamat,
    kota: k.kota,
    latitude: Number(k.latitude), // Decimal -> number, supaya langsung terbaca Leaflet
    longitude: Number(k.longitude),
    tipe_kos: k.tipe_kos,
    status_verifikasi: k.status_verifikasi,
    foto: (k.foto || []).map((f) => ({
      foto_id: f.foto_id,
      path_foto: f.path_foto,
      url: fotoUrl(f.path_foto),
    })),
    foto_utama: fotoUrl(k.foto?.[0]?.path_foto),
    fasilitas: (k.fasilitas || []).map((kf) => kf.fasilitas),
    harga_mulai: harga.length ? Math.min(...harga) : null,
    jumlah_kamar: kamar.length,
    kamar_kosong: kamar.filter((m) => m.status_kamar === 'Kosong').length,
    ada_kamar_kosong: kamar.some((m) => m.status_kamar === 'Kosong'), // hijau / abu-abu di peta
    rata_rating,
    jumlah_review: ratings.length,
  };

  if (denganKamar) {
    hasil.kamar = kamar.map(({ bookings, ...m }) => m);
  }
  if (k.owner) hasil.owner = k.owner;
  if (k.jarak_km !== undefined) hasil.jarak_km = k.jarak_km;

  return hasil;
};

// Validasi field kos. semuaWajib = true untuk tambah, false untuk update parsial
const validasiKos = (body, { semuaWajib }) => {
  const data = {};

  const teks = (nama, label, maks) => {
    if (!semuaWajib && body[nama] === undefined) return null;
    const v = String(body[nama] ?? '').trim();
    if (!v) return `${label} wajib diisi`;
    if (maks && v.length > maks) return `${label} maksimal ${maks} karakter`;
    data[nama] = v;
    return null;
  };

  const koordinat = (nama, label, min, maks) => {
    if (!semuaWajib && body[nama] === undefined) return null;
    const n = Number(body[nama]);
    if (kosong(body[nama]) || !Number.isFinite(n) || n < min || n > maks) {
      return `${label} tidak valid (${min} sampai ${maks}). Pilih titik lokasi di peta`;
    }
    data[nama] = n;
    return null;
  };

  const error =
    teks('nama_kos', 'Nama kos', 100) ||
    teks('alamat', 'Alamat') ||
    teks('kota', 'Kota/wilayah', 100) ||
    koordinat('latitude', 'Latitude', -90, 90) ||
    koordinat('longitude', 'Longitude', -180, 180);

  if (error) return { error };

  if (semuaWajib || body.tipe_kos !== undefined) {
    if (!TIPE_KOS.includes(body.tipe_kos)) {
      return { error: 'Tipe kos harus Putra, Putri, atau Campur' };
    }
    data.tipe_kos = body.tipe_kos;
  }

  return { data };
};

// Ambil & validasi daftar id fasilitas dari body. undefined = tidak dikirim (jangan diubah)
const ambilFasilitas = async (body) => {
  if (body.fasilitas === undefined) return { ids: undefined };

  if (!Array.isArray(body.fasilitas)) {
    return { error: 'Fasilitas harus berupa array id, contoh: [1, 3, 5]' };
  }

  const ids = [...new Set(body.fasilitas.map(Number))];
  if (ids.some((id) => !Number.isInteger(id))) {
    return { error: 'Id fasilitas tidak valid' };
  }

  if (ids.length) {
    const ada = await prisma.fasilitas.count({ where: { fasilitas_id: { in: ids } } });
    if (ada !== ids.length) return { error: 'Ada fasilitas yang tidak ditemukan' };
  }

  return { ids };
};

// Pastikan kos ada dan milik owner yang sedang login
const cariKosMilik = (kosId, ownerId) =>
  prisma.kos.findFirst({ where: { kos_id: kosId, owner_id: ownerId } });

const parseId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// ===============================
// GET SEMUA KOS AKTIF (publik) - untuk marker di peta
// Query: lat, lng, radius (km), harga_min, harga_max, fasilitas (id dipisah koma), tipe, kota
// ===============================
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius, harga_min, harga_max, fasilitas, tipe, kota } = req.query;

    const where = { status_verifikasi: 'Aktif' };

    if (tipe) {
      if (!TIPE_KOS.includes(tipe)) {
        return res.status(400).json({ success: false, message: 'Tipe kos tidak valid' });
      }
      where.tipe_kos = tipe;
    }

    if (kota) where.kota = { contains: String(kota), mode: 'insensitive' };

    // Filter harga: kos dianggap cocok jika punya minimal satu kamar dalam rentang harga
    const min = kosong(harga_min) ? null : Number(harga_min);
    const maks = kosong(harga_max) ? null : Number(harga_max);
    if ((min !== null && !Number.isFinite(min)) || (maks !== null && !Number.isFinite(maks))) {
      return res.status(400).json({ success: false, message: 'Rentang harga tidak valid' });
    }
    if (min !== null || maks !== null) {
      const harga = {};
      if (min !== null) harga.gte = min;
      if (maks !== null) harga.lte = maks;
      where.kamar = { some: { harga } };
    }

    // Filter fasilitas: kos harus memiliki SEMUA fasilitas yang dipilih
    if (fasilitas) {
      const ids = String(fasilitas).split(',').map(Number);
      if (ids.some((id) => !Number.isInteger(id))) {
        return res.status(400).json({ success: false, message: 'Filter fasilitas tidak valid' });
      }
      where.AND = ids.map((id) => ({ fasilitas: { some: { fasilitas_id: id } } }));
    }

    // Titik acuan + radius
    const adaTitik = !kosong(lat) || !kosong(lng);
    let latAcuan = null;
    let lngAcuan = null;
    let radiusKm = null;

    if (adaTitik) {
      latAcuan = Number(lat);
      lngAcuan = Number(lng);
      if (kosong(lat) || kosong(lng) || !Number.isFinite(latAcuan) || !Number.isFinite(lngAcuan)) {
        return res.status(400).json({ success: false, message: 'lat dan lng harus diisi bersamaan dan berupa angka' });
      }

      if (!kosong(radius)) {
        radiusKm = Number(radius);
        if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
          return res.status(400).json({ success: false, message: 'Radius harus berupa angka lebih dari 0 (km)' });
        }

        // Kotak pembatas dulu di database (cepat), jarak persisnya dihitung setelahnya
        const dLat = radiusKm / 111.32;
        const dLng = radiusKm / (111.32 * Math.cos((latAcuan * Math.PI) / 180) || 1);
        where.latitude = { gte: latAcuan - dLat, lte: latAcuan + dLat };
        where.longitude = { gte: lngAcuan - dLng, lte: lngAcuan + dLng };
      }
    }

    const semua = await prisma.kos.findMany({ where, include: INCLUDE_KOS });

    let data = semua.map((k) => {
      if (latAcuan === null) return formatKos(k);
      const jarak = hitungJarakKm(latAcuan, lngAcuan, Number(k.latitude), Number(k.longitude));
      return formatKos({ ...k, jarak_km: Math.round(jarak * 100) / 100 });
    });

    if (radiusKm !== null) data = data.filter((k) => k.jarak_km <= radiusKm);
    if (latAcuan !== null) data.sort((a, b) => a.jarak_km - b.jarak_km);

    res.json({
      success: true,
      message: 'Berhasil mengambil data kos',
      total: data.length,
      data,
    });
  } catch (error) {
    console.error('ERROR GET KOS:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data kos',
      error: error.message,
    });
  }
});

// ===============================
// GET KOS MILIK OWNER YANG LOGIN (semua status)
// Harus di atas '/:id' supaya "saya" tidak dianggap id
// ===============================
router.get('/saya', verifyToken, checkRole('Owner'), async (req, res) => {
  try {
    const kos = await prisma.kos.findMany({
      where: { owner_id: req.user.user_id },
      include: INCLUDE_KOS,
      orderBy: { kos_id: 'desc' },
    });

    res.json({
      success: true,
      message: 'Berhasil mengambil data kos milik Anda',
      data: kos.map((k) => formatKos(k, { denganKamar: true })),
    });
  } catch (error) {
    console.error('ERROR GET KOS SAYA:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data kos',
      error: error.message,
    });
  }
});

// ===============================
// DETAIL KOS (publik, hanya yang Aktif)
// ===============================
router.get('/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID tidak valid' });
    }

    const kos = await prisma.kos.findFirst({
      where: { kos_id: id, status_verifikasi: 'Aktif' },
      include: { ...INCLUDE_KOS, owner: { select: { nama: true, no_wa: true } } },
    });

    if (!kos) {
      return res.status(404).json({ success: false, message: 'Kos tidak ditemukan' });
    }

    res.json({
      success: true,
      message: 'Berhasil mengambil detail kos',
      data: formatKos(kos, { denganKamar: true }),
    });
  } catch (error) {
    console.error('ERROR DETAIL KOS:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail kos',
      error: error.message,
    });
  }
});

// ===============================
// TAMBAH KOS (Owner terverifikasi)
// Body JSON: nama_kos, alamat, kota, latitude, longitude, tipe_kos, fasilitas: [id, id]
// Foto diunggah terpisah lewat POST /:id/foto
// ===============================
router.post('/', ownerTerverifikasi, async (req, res) => {
  try {
    const { data, error } = validasiKos(req.body, { semuaWajib: true });
    if (error) return res.status(400).json({ success: false, message: error });

    const fas = await ambilFasilitas(req.body);
    if (fas.error) return res.status(400).json({ success: false, message: fas.error });

    const kos = await prisma.kos.create({
      data: {
        ...data,
        owner_id: req.user.user_id,
        // Owner sudah diverifikasi Admin, jadi kos langsung tayang di peta
        status_verifikasi: 'Aktif',
        ...(fas.ids?.length && {
          fasilitas: { createMany: { data: fas.ids.map((fasilitas_id) => ({ fasilitas_id })) } },
        }),
      },
      include: INCLUDE_KOS,
    });

    res.status(201).json({
      success: true,
      message: 'Berhasil menambahkan kos',
      data: formatKos(kos, { denganKamar: true }),
    });
  } catch (error) {
    console.error('ERROR TAMBAH KOS:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan kos',
      error: error.message,
    });
  }
});

// ===============================
// UPDATE KOS (Owner pemilik)
// Field yang tidak dikirim tidak diubah. Jika "fasilitas" dikirim, daftar lama diganti.
// ===============================
router.put('/:id', ownerTerverifikasi, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid' });

    const milik = await cariKosMilik(id, req.user.user_id);
    if (!milik) {
      return res.status(404).json({ success: false, message: 'Kos tidak ditemukan' });
    }

    const { data, error } = validasiKos(req.body, { semuaWajib: false });
    if (error) return res.status(400).json({ success: false, message: error });

    const fas = await ambilFasilitas(req.body);
    if (fas.error) return res.status(400).json({ success: false, message: fas.error });

    const langkah = [];
    if (fas.ids !== undefined) {
      langkah.push(prisma.kosFasilitas.deleteMany({ where: { kos_id: id } }));
      if (fas.ids.length) {
        langkah.push(
          prisma.kosFasilitas.createMany({
            data: fas.ids.map((fasilitas_id) => ({ kos_id: id, fasilitas_id })),
          })
        );
      }
    }
    if (Object.keys(data).length) {
      langkah.push(prisma.kos.update({ where: { kos_id: id }, data }));
    }

    if (langkah.length) await prisma.$transaction(langkah);

    const kos = await prisma.kos.findUnique({ where: { kos_id: id }, include: INCLUDE_KOS });

    res.json({
      success: true,
      message: 'Berhasil mengupdate kos',
      data: formatKos(kos, { denganKamar: true }),
    });
  } catch (error) {
    console.error('ERROR UPDATE KOS:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate kos',
      error: error.message,
    });
  }
});

// ===============================
// AKTIFKAN / NONAKTIFKAN KOS (Owner pemilik)
// Body: { "status": "Aktif" | "Nonaktif" }
// ===============================
router.patch('/:id/status', ownerTerverifikasi, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid' });

    const { status } = req.body;
    if (!['Aktif', 'Nonaktif'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status harus Aktif atau Nonaktif' });
    }

    const milik = await cariKosMilik(id, req.user.user_id);
    if (!milik) {
      return res.status(404).json({ success: false, message: 'Kos tidak ditemukan' });
    }

    await prisma.kos.update({ where: { kos_id: id }, data: { status_verifikasi: status } });

    res.json({ success: true, message: `Kos berhasil di${status === 'Aktif' ? 'aktifkan' : 'nonaktifkan'}` });
  } catch (error) {
    console.error('ERROR STATUS KOS:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengubah status kos',
      error: error.message,
    });
  }
});

// ===============================
// HAPUS KOS (Owner pemilik)
// Ditolak jika masih ada booking Menunggu / Disetujui
// ===============================
router.delete('/:id', ownerTerverifikasi, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid' });

    const milik = await cariKosMilik(id, req.user.user_id);
    if (!milik) {
      return res.status(404).json({ success: false, message: 'Kos tidak ditemukan' });
    }

    const bookingAktif = await prisma.booking.count({
      where: {
        kamar: { kos_id: id },
        status_booking: { in: ['Menunggu', 'Disetujui'] },
      },
    });
    if (bookingAktif > 0) {
      return res.status(400).json({
        success: false,
        message: 'Kos tidak bisa dihapus karena masih ada booking yang berjalan',
      });
    }

    const foto = await prisma.fotoKos.findMany({ where: { kos_id: id } });

    // Kamar, foto, dan relasi fasilitas ikut terhapus (onDelete: Cascade)
    await prisma.kos.delete({ where: { kos_id: id } });

    // Hapus file di Cloudinary setelah data database aman terhapus
    await Promise.all(foto.map((f) => hapusFoto(f.path_foto)));

    res.json({ success: true, message: 'Berhasil menghapus kos' });
  } catch (error) {
    console.error('ERROR DELETE KOS:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal menghapus kos',
      error: error.message,
    });
  }
});

// ===============================
// UPLOAD FOTO KOS (Owner pemilik)
// multipart/form-data, field "foto" (boleh banyak, maks 2MB per file)
// ===============================
const terimaFoto = (req, res, next) => {
  upload.array('foto', MAKS_FOTO_PER_KOS)(req, res, (err) => {
    if (!err) return next();

    const pesan =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Ukuran foto maksimal 2MB'
        : err.code === 'LIMIT_UNEXPECTED_FILE'
        ? `Maksimal ${MAKS_FOTO_PER_KOS} foto sekali upload, dengan nama field "foto"`
        : err.message;

    res.status(400).json({ success: false, message: pesan });
  });
};

router.post('/:id/foto', ownerTerverifikasi, terimaFoto, async (req, res) => {
  let terunggah = [];

  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid' });

    const milik = await cariKosMilik(id, req.user.user_id);
    if (!milik) {
      return res.status(404).json({ success: false, message: 'Kos tidak ditemukan' });
    }

    if (!req.files?.length) {
      return res.status(400).json({ success: false, message: 'Pilih minimal satu foto (field "foto")' });
    }

    const sudahAda = await prisma.fotoKos.count({ where: { kos_id: id } });
    if (sudahAda + req.files.length > MAKS_FOTO_PER_KOS) {
      return res.status(400).json({
        success: false,
        message: `Maksimal ${MAKS_FOTO_PER_KOS} foto per kos (saat ini ${sudahAda})`,
      });
    }

    terunggah = await Promise.all(req.files.map((f) => uploadFoto(f, 'kos')));

    await prisma.fotoKos.createMany({
      data: terunggah.map((path_foto) => ({ kos_id: id, path_foto })),
    });

    const foto = await prisma.fotoKos.findMany({ where: { kos_id: id }, orderBy: { foto_id: 'asc' } });

    res.status(201).json({
      success: true,
      message: 'Berhasil mengunggah foto',
      data: foto.map((f) => ({ foto_id: f.foto_id, path_foto: f.path_foto, url: fotoUrl(f.path_foto) })),
    });
  } catch (error) {
    console.error('ERROR UPLOAD FOTO KOS:', error);

    // Bersihkan file yang sudah terlanjur masuk Cloudinary
    await Promise.all(terunggah.map((p) => hapusFoto(p)));

    res.status(500).json({
      success: false,
      message: 'Gagal mengunggah foto',
      error: error.message,
    });
  }
});

// ===============================
// HAPUS SATU FOTO KOS (Owner pemilik)
// ===============================
router.delete('/foto/:fotoId', ownerTerverifikasi, async (req, res) => {
  try {
    const fotoId = parseId(req.params.fotoId);
    if (!fotoId) return res.status(400).json({ success: false, message: 'ID tidak valid' });

    const foto = await prisma.fotoKos.findFirst({
      where: { foto_id: fotoId, kos: { owner_id: req.user.user_id } },
    });
    if (!foto) {
      return res.status(404).json({ success: false, message: 'Foto tidak ditemukan' });
    }

    await prisma.fotoKos.delete({ where: { foto_id: fotoId } });
    await hapusFoto(foto.path_foto);

    res.json({ success: true, message: 'Berhasil menghapus foto' });
  } catch (error) {
    console.error('ERROR DELETE FOTO KOS:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal menghapus foto',
      error: error.message,
    });
  }
});

export default router;