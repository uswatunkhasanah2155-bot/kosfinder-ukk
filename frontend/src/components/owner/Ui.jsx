import { X } from 'lucide-react';

// Komponen kecil yang dipakai bersama oleh semua halaman Owner.
// Tampilannya meniru halaman Master Fasilitas milik admin.

// Kerangka halaman: latar, judul, deskripsi, dan tombol aksi di kanan
export function HalamanOwner({ label, judul, deskripsi, aksi, children }) {
  return (
    <div className="min-h-screen bg-slate-50/70 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <div className="flex flex-col gap-5 border-b border-slate-200/85 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              <span className="text-sm font-bold uppercase tracking-wider text-emerald-700">
                {label}
              </span>
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              {judul}
            </h2>
            {deskripsi && <p className="mt-2 max-w-xl text-lg text-slate-900">{deskripsi}</p>}
          </div>
          {aksi}
        </div>
        {children}
      </div>
    </div>
  );
}

const WARNA_BADGE = {
  hijau: 'bg-emerald-100 text-emerald-800',
  kuning: 'bg-amber-100 text-amber-800',
  abu: 'bg-slate-200 text-slate-700',
  merah: 'bg-red-100 text-red-700',
  biru: 'bg-sky-100 text-sky-800',
};

export function Badge({ warna = 'abu', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${WARNA_BADGE[warna]}`}>
      {children}
    </span>
  );
}

// Pesan sukses (bisa ditutup)
export function Notif({ pesan, onTutup }) {
  if (!pesan) return null;
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-base font-medium text-emerald-900 shadow-sm">
      <span>{pesan}</span>
      <button
        onClick={onTutup}
        aria-label="Tutup pesan"
        className="rounded-lg p-0.5 text-emerald-700 hover:bg-emerald-100"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

// Pesan error; tombol "Coba lagi" muncul jika onCoba diberikan
export function GalatBox({ pesan, onCoba, onTutup }) {
  if (!pesan) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300 bg-red-50 p-5 text-base font-medium text-red-800 shadow-sm">
      <span>{pesan}</span>
      {onCoba && (
        <button
          onClick={onCoba}
          className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          Coba lagi
        </button>
      )}
      {onTutup && (
        <button
          onClick={onTutup}
          aria-label="Tutup pesan"
          className="rounded-lg p-0.5 text-red-700 hover:bg-red-100"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export function Modal({ judul, onTutup, lebar = 'max-w-md', children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onClick={onTutup}
    >
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl ${lebar}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl font-extrabold text-slate-900">{judul}</h3>
          <button
            onClick={onTutup}
            aria-label="Tutup"
            className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DataKosong({ judul, deskripsi, aksi }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <p className="text-lg font-semibold text-slate-700">{judul}</p>
      {deskripsi && <p className="mt-1 text-base text-slate-500">{deskripsi}</p>}
      {aksi && <div className="mt-5 flex justify-center">{aksi}</div>}
    </div>
  );
}