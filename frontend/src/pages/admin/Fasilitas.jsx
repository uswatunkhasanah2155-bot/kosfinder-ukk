import { useEffect, useMemo, useState } from 'react';
import {
  Wifi,
  Snowflake,
  BedDouble,
  Bath,
  Car,
  Bike,
  Tv,
  Utensils,
  WashingMachine,
  ShieldCheck,
  Zap,
  Droplets,
  Armchair,
  Shirt,
  Sparkles,
  Pencil,
  Trash2,
  Plus,
  Search,
  X,
} from 'lucide-react';
import api from '../../api/axios';

// GET    /api/fasilitas            (publik)
// POST   /api/fasilitas            (Admin)  body: { nama_fasilitas }
// PUT    /api/fasilitas/:id        (Admin)  body: { nama_fasilitas }
// DELETE /api/fasilitas/:id        (Admin)  ditolak jika masih dipakai kos
const URL_FASILITAS = '/fasilitas';

// Backend hanya menyimpan nama_fasilitas, jadi ikon dipilih di frontend
// berdasarkan kata kunci pada nama. Semua ikon memakai satu warna hijau.
// Kata kunci pendek (<= 3 huruf) dicocokkan sebagai kata utuh.
const ATURAN_IKON = [
  { kunci: ['wifi', 'wi-fi', 'internet'], ikon: Wifi },
  { kunci: ['ac', 'air conditioner', 'pendingin'], ikon: Snowflake },
  { kunci: ['kasur', 'bed', 'ranjang', 'tempat tidur'], ikon: BedDouble },
  { kunci: ['kamar mandi', 'shower', 'wc', 'toilet'], ikon: Bath },
  { kunci: ['parkir mobil', 'mobil', 'carport'], ikon: Car },
  { kunci: ['parkir motor', 'motor', 'sepeda'], ikon: Bike },
  { kunci: ['tv', 'televisi'], ikon: Tv },
  { kunci: ['dapur', 'masak', 'kulkas', 'makan'], ikon: Utensils },
  { kunci: ['laundry', 'cuci'], ikon: WashingMachine },
  { kunci: ['cctv', 'keamanan', 'security', 'satpam'], ikon: ShieldCheck },
  { kunci: ['listrik', 'token', 'colokan'], ikon: Zap },
  { kunci: ['air', 'pdam', 'water heater'], ikon: Droplets },
  { kunci: ['lemari', 'meja', 'kursi', 'sofa'], ikon: Armchair },
  { kunci: ['jemur', 'setrika'], ikon: Shirt },
];

const BAWAAN = { ikon: Sparkles };
const WARNA_IKON = 'bg-emerald-100 text-emerald-700';

const gayaFasilitas = (nama = '') => {
  const n = nama.toLowerCase();
  return (
    ATURAN_IKON.find((a) =>
      a.kunci.some((k) =>
        k.length <= 3 ? new RegExp(`\\b${k}\\b`).test(n) : n.includes(k)
      )
    ) || BAWAAN
  );
};

function IkonFasilitas({ nama, ukuran = 'besar' }) {
  const { ikon: Ikon } = gayaFasilitas(nama);
  const kotak = ukuran === 'besar' ? 'h-14 w-14 rounded-2xl' : 'h-10 w-10 rounded-xl';
  const isi = ukuran === 'besar' ? 'h-7 w-7' : 'h-5 w-5';
  return (
    <div className={`flex shrink-0 items-center justify-center ${kotak} ${WARNA_IKON}`}>
      <Ikon className={isi} strokeWidth={1.8} />
    </div>
  );
}

export default function Fasilitas() {
  const [daftar, setDaftar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pesan, setPesan] = useState('');
  const [cari, setCari] = useState('');

  // modal tambah / edit: null | { mode: 'tambah' } | { mode: 'edit', item }
  const [modal, setModal] = useState(null);
  const [nama, setNama] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  // konfirmasi hapus
  const [hapus, setHapus] = useState(null);
  const [menghapus, setMenghapus] = useState(false);
  const [errorHapus, setErrorHapus] = useState('');

  const muatData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(URL_FASILITAS);
      setDaftar(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data fasilitas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    muatData();
  }, []);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return daftar;
    return daftar.filter((f) => f.nama_fasilitas.toLowerCase().includes(q));
  }, [daftar, cari]);

  // ---------- Tambah / Edit ----------
  const bukaTambah = () => {
    setNama('');
    setErrorForm('');
    setModal({ mode: 'tambah' });
  };

  const bukaEdit = (item) => {
    setNama(item.nama_fasilitas);
    setErrorForm('');
    setModal({ mode: 'edit', item });
  };

  const tutupModal = () => {
    if (!menyimpan) setModal(null);
  };

  const simpan = async () => {
    const nilai = nama.trim();
    if (!nilai) {
      setErrorForm('Nama fasilitas wajib diisi');
      return;
    }

    setMenyimpan(true);
    setErrorForm('');
    try {
      const res =
        modal.mode === 'edit'
          ? await api.put(`${URL_FASILITAS}/${modal.item.fasilitas_id}`, {
              nama_fasilitas: nilai,
            })
          : await api.post(URL_FASILITAS, { nama_fasilitas: nilai });

      setModal(null);
      setPesan(res.data.message);
      muatData();
    } catch (err) {
      // contoh: "Nama fasilitas sudah ada" / "Nama fasilitas sudah digunakan"
      setErrorForm(err.response?.data?.message || 'Gagal menyimpan fasilitas');
    } finally {
      setMenyimpan(false);
    }
  };

  // ---------- Hapus ----------
  const bukaHapus = (item) => {
    setErrorHapus('');
    setHapus(item);
  };

  const konfirmasiHapus = async () => {
    setMenghapus(true);
    setErrorHapus('');
    try {
      const res = await api.delete(`${URL_FASILITAS}/${hapus.fasilitas_id}`);
      setDaftar((d) => d.filter((f) => f.fasilitas_id !== hapus.fasilitas_id));
      setPesan(res.data.message);
      setHapus(null);
    } catch (err) {
      // contoh: "Fasilitas masih dipakai oleh 3 kos"
      setErrorHapus(err.response?.data?.message || 'Gagal menghapus fasilitas');
    } finally {
      setMenghapus(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* HEADER */}
        <div className="flex flex-col gap-5 border-b border-slate-200/85 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              <span className="text-sm font-bold uppercase tracking-wider text-emerald-700">
                Master Data
              </span>
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              Master Fasilitas
            </h2>
            <p className="mt-2 max-w-xl text-lg text-slate-900">
              Fasilitas yang bisa dipilih Owner saat menambahkan kos, mulai dari WiFi sampai
              keamanan.
            </p>
          </div>

          <button
            onClick={bukaTambah}
            className="inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-emerald-600 px-6 py-3.5 text-base font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-600/25 sm:self-auto"
          >
            <Plus className="h-5 w-5" />
            Tambah Fasilitas
          </button>
        </div>

        {/* NOTIFIKASI */}
        {pesan && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-base font-medium text-emerald-900 shadow-sm">
            <span>{pesan}</span>
            <button
              onClick={() => setPesan('')}
              aria-label="Tutup pesan"
              className="rounded-lg p-0.5 text-emerald-700 hover:bg-emerald-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300 bg-red-50 p-5 text-base font-medium text-red-800 shadow-sm">
            <span>{error}</span>
            <button
              onClick={muatData}
              className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* PENCARIAN & JUMLAH */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari fasilitas"
              className="w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-base font-medium text-slate-800 shadow-sm transition hover:border-emerald-500 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/15"
            />
          </div>

          <p className="text-base font-semibold text-slate-700">
            {loading
              ? 'Memuat…'
              : cari
              ? `${tampil.length} dari ${daftar.length} fasilitas`
              : `${daftar.length} fasilitas`}
          </p>
        </div>

        {/* DAFTAR FASILITAS */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* LOADING SKELETON */}
          {loading &&
            [...Array(6)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-200/70" />
            ))}

          {/* KARTU FASILITAS */}
          {!loading &&
            tampil.map((f) => (
              <div
                key={f.fasilitas_id}
                className="group flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-900/5"
              >
                <IkonFasilitas nama={f.nama_fasilitas} />

                <p className="min-w-0 flex-1 wrap-break-word text-lg font-bold leading-snug text-slate-900">
                  {f.nama_fasilitas}
                </p>

                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => bukaEdit(f)}
                    aria-label={`Edit ${f.nama_fasilitas}`}
                    title="Edit"
                    className="rounded-xl p-2.5 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-600/15"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => bukaHapus(f)}
                    aria-label={`Hapus ${f.nama_fasilitas}`}
                    title="Hapus"
                    className="rounded-xl p-2.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-4 focus:ring-red-600/10"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* DATA KOSONG */}
        {!loading && !error && tampil.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-700">
              {cari ? 'Tidak ada fasilitas yang cocok' : 'Belum ada fasilitas'}
            </p>
            <p className="mt-1 text-base text-slate-500">
              {cari
                ? 'Coba kata kunci lain.'
                : 'Klik "Tambah Fasilitas" untuk membuat fasilitas pertama.'}
            </p>
          </div>
        )}
      </div>

      {/* MODAL TAMBAH / EDIT */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
          onClick={tutupModal}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-extrabold text-slate-900">
                {modal.mode === 'edit' ? 'Edit Fasilitas' : 'Tambah Fasilitas'}
              </h3>
              <button
                onClick={tutupModal}
                aria-label="Tutup"
                className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Nama fasilitas</span>
              <input
                autoFocus
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && simpan()}
                placeholder="Contoh: WiFi, AC, Kamar mandi dalam"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-base font-semibold text-slate-800 shadow-sm transition hover:border-emerald-500 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/15"
              />
            </label>

            {/* Pratinjau ikon */}
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <IkonFasilitas nama={nama} ukuran="kecil" />
              <p className="text-sm text-slate-600">
                {nama.trim() ? (
                  <>
                    Tampil sebagai <strong className="text-slate-900">{nama.trim()}</strong>
                  </>
                ) : (
                  'Ikon muncul otomatis sesuai nama fasilitas'
                )}
              </p>
            </div>

            {errorForm && (
              <p className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {errorForm}
              </p>
            )}

            <div className="mt-7 flex justify-end gap-3">
              <button
                onClick={tutupModal}
                disabled={menyimpan}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={simpan}
                disabled={menyimpan}
                className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-600/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {menyimpan ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {hapus && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
          onClick={() => !menghapus && setHapus(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4">
              <IkonFasilitas nama={hapus.nama_fasilitas} />
              <h3 className="text-2xl font-extrabold text-slate-900">Hapus fasilitas?</h3>
            </div>
            <p className="mt-4 text-base text-slate-700">
              Fasilitas <strong>{hapus.nama_fasilitas}</strong> akan dihapus. Fasilitas yang masih
              dipakai kos tidak dapat dihapus.
            </p>

            {errorHapus && (
              <p className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {errorHapus}
              </p>
            )}

            <div className="mt-7 flex justify-end gap-3">
              <button
                onClick={() => setHapus(null)}
                disabled={menghapus}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={konfirmasiHapus}
                disabled={menghapus}
                className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-600/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {menghapus ? 'Menghapus…' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}