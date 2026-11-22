// src/utils/kos.js
import api from '../api/axios';

// Isi di frontend/.env  ->  VITE_CLOUDINARY_CLOUD_NAME=nama_cloud_anda
// (hanya dipakai bila database menyimpan public_id, bukan alamat penuh)
const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

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
 * Ubah nilai foto dari database menjadi URL yang bisa dibuka browser.
 *  1) Alamat penuh (https://res.cloudinary.com/...)  -> dipakai apa adanya
 *  2) Path lokal "uploads/..."                       -> dari server backend
 *  3) Selain itu + VITE_CLOUDINARY_CLOUD_NAME ada    -> dianggap public_id Cloudinary
 * lebar (opsional): minta Cloudinary mengecilkan gambar (hemat kuota, lebih cepat)
 */
export const fotoUrl = (path, lebar) => {
  if (!path) return null;
  let url;
  if (/^https?:/.test(path)) {
    url = path;
  } else if (/^\/?uploads\//.test(path) || !CLOUD) {
    const base = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
    return `${base}/${path.replace(/^\//, '')}`;
  } else {
    url = `https://res.cloudinary.com/${CLOUD}/image/upload/${path.replace(/^\//, '')}`;
  }
  if (lebar && url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    url = url.replace('/upload/', `/upload/w_${lebar},c_limit,q_auto,f_auto/`);
  }
  return url;
};