// Batas panjang sama dengan kolom di database dan validasi di backend (auth.js)
export const MAKS_EMAIL = 100;
export const MAKS_NAMA = 100;
export const MAKS_WA = 16; // +628 + 12 digit (sama dengan backend)
export const MAKS_PASSWORD = 128;

// Aturan password harus sama dengan backend (auth.js -> passwordKuat)
export const aturanPassword = (p = '') => [
  { id: 'panjang', label: 'Minimal 8 karakter', terpenuhi: p.length >= 8 },
  { id: 'huruf', label: 'Mengandung huruf', terpenuhi: /[A-Za-z]/.test(p) },
  { id: 'angka', label: 'Mengandung angka', terpenuhi: /\d/.test(p) },
  { id: 'simbol', label: 'Mengandung simbol (contoh: ! @ # $)', terpenuhi: /[^A-Za-z0-9\s]/.test(p) },
];

export const passwordValid = (p) => aturanPassword(p).every((a) => a.terpenuhi);

export const pesanNama = (n = '') => {
  if (!n.trim()) return 'Nama lengkap wajib diisi';
  if (n.trim().length < 3) return 'Nama minimal 3 karakter';
  if (n.trim().length > MAKS_NAMA) return `Nama maksimal ${MAKS_NAMA} karakter`;
  return '';
};

export const pesanEmail = (e = '') => {
  const email = e.trim();
  if (!email) return 'Email wajib diisi';
  if (email.length > MAKS_EMAIL) return `Email maksimal ${MAKS_EMAIL} karakter`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Format email tidak valid';
  return '';
};

export const pesanPassword = (p = '') =>
  passwordValid(p) ? '' : 'Password belum memenuhi semua syarat';

// Untuk halaman login: hanya memastikan kolom tidak kosong (aturan kuat berlaku saat daftar)
export const pesanPasswordLogin = (p = '') => (p ? '' : 'Kata sandi wajib diisi');

// Nomor WhatsApp boleh kosong. Jika diisi: 08xx, 628xx, atau +628xx
export const pesanNoWa = (v = '') => {
  if (!v) return '';
  return /^(08|628|\+628)\d{7,12}$/.test(v)
    ? ''
    : 'Nomor WhatsApp tidak valid, contoh: 081234567890';
};

// Hanya angka (dan + di awal) yang boleh masuk ke kolom nomor
export const bersihkanNoWa = (v = '') => v.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');