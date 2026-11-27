// src/utils/kos.js
import api from '../api/axios';

// Sesuaikan nama field di sini saja bila respons backend Anda berbeda.
export const normalisasi = (k) => {
  const fotos = [
    ...(k.foto || []).map((f) => (typeof f === 'string' ? f : f?.path_foto ?? f?.url_foto ?? f?.url ?? f?.secure_url)),
    k.foto_utama,
  ].filter(Boolean);
  const kamar = (k.kamar || []).map((m) => ({
    id: m.id ?? m.kamar_id, no: m.no_kamar, tipe: m.tipe_kamar, harga: Number(m.harga), status: m.status_kamar,
  }));
  const rating = k.rata_rating ?? k.rating; // backend mengirim "rata_rating"
  return {
    id: k.id ?? k.kos_id,
    nama: k.nama_kos ?? k.nama,
    kota: k.kota,
    alamat: k.alamat,
    tipe: k.tipe_kos ?? k.tipe,
    lat: Number(k.latitude),
    lng: Number(k.longitude),
    harga: Number(k.harga_mulai ?? k.harga_terendah ?? (kamar.length ? Math.min(...kamar.map((m) => m.harga)) : 0)),
    kosong: Number(k.kamar_kosong ?? k.jumlah_kamar_kosong ?? kamar.filter((m) => m.status === 'Kosong').length),
    rating: rating != null ? Number(rating) : null,
    jumlahReview: Number(k.jumlah_review ?? 0),
    fotos: [...new Set(fotos)],
    fasilitas: (k.fasilitas || []).map((f) => f.nama_fasilitas ?? f),
    kamar,
  };
};

export const rupiah = (n) => 'Rp' + Number(n).toLocaleString('id-ID');

export const fmtJarak = (j) => (j < 1 ? `${Math.round(j * 1000)} m` : `${j.toFixed(1)} km`);

/**
 * Ubah path foto dari database menjadi URL yang bisa dibuka browser.
 * - Alamat penuh (http:// atau https://) -> dipakai apa adanya
 * - Path lokal ("uploads/..." atau "/uploads/...") -> diarahkan ke backend server
 */
export const fotoUrl = (path) => {
  if (!path) return null;
  if (/^https?:/i.test(path)) {
    return path;
  }
  const base = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
  const clean = path.replace(/^\/+/, '');
  const rel = clean.startsWith('uploads/') ? clean : `uploads/${clean}`;
  return `${base}/${rel}`;
};
