import { useEffect, useState } from 'react';
import {
  Building2,
  ClipboardList,
  Database,
  Download,
  FileSpreadsheet,
  RotateCcw,
} from 'lucide-react';
import api from '../../api/axios';
import { Pesan } from '../../components/ui';

const LAPORAN = [
  { jenis: 'kos', judul: 'Data Kos', ikon: Building2, deskripsi: 'Nama, alamat, kota, tipe, status, fasilitas, dan jumlah kamar kos milik Anda.' },
  { jenis: 'kamar', judul: 'Data Kamar', ikon: FileSpreadsheet, deskripsi: 'Nomor kamar, tipe, harga per bulan, dan status terkini.' },
  { jenis: 'booking', judul: 'Data Booking', ikon: ClipboardList, deskripsi: 'Booking yang masuk pada kos Anda, lengkap dengan statusnya.' },
  { jenis: 'backup', judul: 'Backup Data', ikon: Database, deskripsi: 'Seluruh data kos, kamar, booking, dan review Anda dalam satu file.' },
];

const FORMAT = [
  { nilai: 'xlsx', label: 'Excel' },
  { nilai: 'csv', label: 'CSV' },
  { nilai: 'pdf', label: 'PDF' },
];

const STATUS = ['', 'Menunggu', 'Disetujui', 'Ditolak', 'Selesai'];
const filterAwal = { kota: '', tipe: '', status: '', format: 'xlsx' };

const tanggalWib = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

const ambilPesanError = async (err) => {
  const data = err.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message || 'Gagal mengunduh file';
    } catch {
      return 'Gagal mengunduh file';
    }
  }
  return data?.message || 'Gagal mengunduh file';
};

const simpanFile = (blob, namaFile) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function Ekspor() {
  const [filter, setFilter] = useState(filterAwal);
  const [wilayah, setWilayah] = useState([]);
  const [sedang, setSedang] = useState(null);
  const [pesan, setPesan] = useState(null);

  useEffect(() => {
    let batal = false;
    queueMicrotask(() => {
      api
        .get('/wilayah')
        .then((res) => {
          if (!batal) setWilayah(res.data.data ?? []);
        })
        .catch(() => {});
    });
    return () => {
      batal = true;
    };
  }, []);

  const ubah = (e) => setFilter((f) => ({ ...f, [e.target.name]: e.target.value }));

  const unduh = async (jenis, params, namaFile) => {
    setSedang(jenis);
    setPesan(null);
    try {
      const res = await api.get(`/export/${jenis}`, { params, responseType: 'blob' });
      simpanFile(res.data, namaFile);
      setPesan({ tipe: 'sukses', teks: `File ${namaFile} berhasil diunduh.` });
    } catch (err) {
      setPesan({ tipe: 'galat', teks: await ambilPesanError(err) });
    } finally {
      setSedang(null);
    }
  };

  const unduhLaporan = (jenis) => {
    const params = { format: filter.format };
    if (filter.kota) params.kota = filter.kota;
    if (filter.tipe) params.tipe = filter.tipe;
    if (jenis === 'booking' && filter.status) params.status = filter.status;
    unduh(jenis, params, `owner-${jenis}-${tanggalWib()}.${filter.format}`);
  };

  const reset = () => setFilter(filterAwal);

  return (
    <div className="min-h-screen bg-slate-50/70 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 md:text-3xl">Ekspor Data</h1>
            <p className="mt-1 text-sm text-slate-500">
              Unduh laporan kos, kamar, dan booking milik Anda ke PDF, Excel, atau CSV.
            </p>
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" /> Atur ulang
          </button>
        </div>

        <Pesan pesan={pesan} onTutup={() => setPesan(null)} />

        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 sm:grid-cols-2 lg:grid-cols-4">
          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Wilayah</span>
            <select name="kota" value={filter.kota} onChange={ubah} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
              <option value="">Semua wilayah</option>
              {wilayah.map((w) => (
                <option key={w.kota} value={w.kota}>
                  {w.kota} ({w.jumlah_kos})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Tipe kos</span>
            <select name="tipe" value={filter.tipe} onChange={ubah} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
              <option value="">Semua tipe</option>
              {['Putra', 'Putri', 'Campur'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Status booking</span>
            <select name="status" value={filter.status} onChange={ubah} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {s || 'Semua status'}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Format file</span>
            <select name="format" value={filter.format} onChange={ubah} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
              {FORMAT.map((f) => (
                <option key={f.nilai} value={f.nilai}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {LAPORAN.map((l) => {
            const Ikon = l.ikon;
            return (
              <article key={l.jenis} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Ikon className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-extrabold text-slate-900">{l.judul}</h2>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-500">{l.deskripsi}</p>
                <button
                  onClick={() => (l.jenis === 'backup' ? unduh('backup', { format: filter.format }, `backup-kosfinder-${tanggalWib()}.${filter.format}`) : unduhLaporan(l.jenis))}
                  disabled={sedang !== null}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {sedang === l.jenis ? 'Mengunduh…' : `Unduh ${FORMAT.find((f) => f.nilai === filter.format)?.label}`}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
