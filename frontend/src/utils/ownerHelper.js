import api from '../api/axios';

// Kelas Tailwind yang dipakai bersama halaman-halaman Owner (disamakan dengan halaman admin)
export const kelasInput =
  'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-800 shadow-sm transition hover:border-emerald-500 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/15';

export const kelasSelect =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition-all hover:border-emerald-500 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/15 shadow-sm';

export const tombolUtama =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-600/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0';

export const tombolBiasa =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export const tombolBahaya =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-600/25 disabled:cursor-not-allowed disabled:opacity-50';

export const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

export const formatTanggal = (s) =>
  new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const formatWaktu = (d) =>
  new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

// Backend mengirim "DalamBooking", tampilkan sebagai "Dalam Booking"
export const labelStatusKamar = (s) => (s === 'DalamBooking' ? 'Dalam Booking' : s);

// Nomor WhatsApp (0812...) -> tautan wa.me (62812...)
export const linkWa = (no) => {
  if (!no) return null;
  let n = String(no).replace(/\D/g, '');
  if (!n) return null;
  if (n.startsWith('0')) n = `62${n.slice(1)}`;
  return `https://wa.me/${n}`;
};

// Saat responseType 'blob', pesan error dari server juga berbentuk Blob. Fungsi ini membacanya.
export async function pesanGalat(err, cadangan) {
  const d = err.response?.data;
  if (d instanceof Blob) {
    try {
      return JSON.parse(await d.text()).message || cadangan;
    } catch {
      return cadangan;
    }
  }
  return d?.message || cadangan;
}

// Unduh file dari endpoint yang butuh token (export, bukti booking).
// Nama file diambil dari header Content-Disposition (sudah di-expose di server.js).
export async function unduhFile(url, params, namaCadangan) {
  const res = await api.get(url, { params, responseType: 'blob' });
  const cocok = /filename="?([^";]+)"?/i.exec(res.headers['content-disposition'] || '');
  const nama = cocok?.[1] || namaCadangan;

  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}