// Komponen UI kecil yang dipakai bersama halaman Admin/Owner.
// Dibuat terpusat supaya gaya modal, badge status, dan pesan konsisten.
import { X } from 'lucide-react';

const GAYA_STATUS = {
  Menunggu: 'bg-amber-100 text-amber-800 border-amber-200',
  Terverifikasi: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Ditolak: 'bg-red-100 text-red-800 border-red-200',
  Aktif: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Nonaktif: 'bg-slate-200 text-slate-700 border-slate-300',
  Kosong: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Dalam Booking': 'bg-amber-100 text-amber-800 border-amber-200',
  DalamBooking: 'bg-amber-100 text-amber-800 border-amber-200',
  Disetujui: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Terisi: 'bg-sky-100 text-sky-800 border-sky-200',
  Selesai: 'bg-slate-200 text-slate-700 border-slate-300',
};

export function BadgeStatus({ status }) {
  const teks = status === 'DalamBooking' ? 'Dalam Booking' : status;
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
        GAYA_STATUS[teks] || 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
    >
      {teks || '-'}
    </span>
  );
}

export function Pesan({ pesan, onTutup }) {
  if (!pesan?.teks) return null;
  const galat = pesan.tipe === 'galat';
  return (
    <div
      role="status"
      className={`flex items-center justify-between gap-4 rounded-2xl border px-5 py-3.5 text-sm font-semibold ${
        galat
          ? 'border-red-300 bg-red-50 text-red-800'
          : 'border-emerald-300 bg-emerald-50 text-emerald-800'
      }`}
    >
      <span>{pesan.teks}</span>
      {onTutup && (
        <button onClick={onTutup} aria-label="Tutup pesan" className="rounded-lg p-1 hover:bg-black/5">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function Kosong({ judul, deskripsi }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <p className="text-lg font-bold text-slate-700">{judul}</p>
      {deskripsi && <p className="mt-1 text-sm text-slate-500">{deskripsi}</p>}
    </div>
  );
}

export function Modal({ judul, onTutup, children, lebar = 'max-w-2xl' }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-[2px]"
      onClick={onTutup}
    >
      <div
        className={`w-full ${lebar} my-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-7`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{judul}</h3>
          <button
            onClick={onTutup}
            aria-label="Tutup"
            className="rounded-xl p-1.5 text-slate-500 transition hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Konfirmasi({
  judul,
  pesan,
  onBatal,
  onYa,
  memproses = false,
  labelYa = 'Ya, lanjutkan',
  berbahaya = false,
}) {
  return (
    <Modal judul={judul} onTutup={() => !memproses && onBatal()} lebar="max-w-md">
      <p className="text-base leading-relaxed text-slate-700">{pesan}</p>
      <div className="mt-7 flex justify-end gap-3">
        <button
          onClick={onBatal}
          disabled={memproses}
          className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Batal
        </button>
        <button
          onClick={onYa}
          disabled={memproses}
          className={`rounded-2xl px-6 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
            berbahaya ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {memproses ? 'Memproses…' : labelYa}
        </button>
      </div>
    </Modal>
  );
}
