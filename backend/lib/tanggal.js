// Helper tanggal berbahasa Indonesia (semua perhitungan memakai UTC supaya tanggal tidak bergeser)

const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

export const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// Angka -> kata (1 sampai 999.999), contoh: 2027 -> "dua ribu dua puluh tujuh"
export const terbilang = (n) => {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${terbilang(n - 10)} belas`;
  if (n < 100) return `${terbilang(Math.floor(n / 10))} puluh${n % 10 ? ` ${terbilang(n % 10)}` : ''}`;
  if (n < 200) return `seratus${n % 100 ? ` ${terbilang(n - 100)}` : ''}`;
  if (n < 1000) return `${terbilang(Math.floor(n / 100))} ratus${n % 100 ? ` ${terbilang(n % 100)}` : ''}`;
  if (n < 2000) return `seribu${n % 1000 ? ` ${terbilang(n - 1000)}` : ''}`;
  if (n < 1000000) return `${terbilang(Math.floor(n / 1000))} ribu${n % 1000 ? ` ${terbilang(n % 1000)}` : ''}`;
  return String(n);
};

// Date -> { hari, tanggal, bulan, tahun } dalam huruf kapital, untuk bukti konfirmasi
export const tanggalKata = (date) => ({
  hari: NAMA_HARI[date.getUTCDay()].toUpperCase(),
  tanggal: terbilang(date.getUTCDate()).toUpperCase(),
  bulan: NAMA_BULAN[date.getUTCMonth()].toUpperCase(),
  tahun: terbilang(date.getUTCFullYear()).toUpperCase(),
});

// Tambah n bulan tanpa meloncat bulan (31 Jan + 1 bulan = 28/29 Feb, bukan 3 Mar)
export const tambahBulan = (date, n) => {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + n;
  const d = date.getUTCDate();
  const hariTerakhir = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, hariTerakhir)));
};

// Tanggal hari ini (YYYY-MM-DD) menurut WIB
export const hariIniWib = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

// Date -> "YYYY-MM-DD"
export const keTanggal = (date) => date.toISOString().slice(0, 10);