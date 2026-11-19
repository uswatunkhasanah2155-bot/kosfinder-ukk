import { useEffect, useState } from 'react';
import {
  Building2,
  DoorOpen,
  ClipboardList,
  Database,
  Download,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Filter,
  RotateCcw,
  CalendarDays,
} from 'lucide-react';
import api from '../../api/axios';

// GET /api/export/kos?format=&kota=&tipe=
// GET /api/export/kamar?format=&kota=&tipe=
// GET /api/export/booking?format=&kota=&tipe=&status=
// GET /api/export/backup            (khusus Admin, satu file Excel)
// GET /api/wilayah                  (isi dropdown wilayah)
const URL_EXPORT = '/export';
const URL_WILAYAH = '/wilayah';

const FORMAT = [
  { nilai: 'xlsx', label: 'Excel' },
  { nilai: 'csv', label: 'CSV' },
  { nilai: 'pdf', label: 'PDF' },
];

const LAPORAN = [
  {
    jenis: 'kos',
    judul: 'Data Kos',
    deskripsi: 'Nama kos, kota, alamat, tipe, status, pemilik, jumlah kamar, dan fasilitas.',
    ikon: Building2,
    catatan: 'Mengikuti filter wilayah dan tipe kos',
  },
  {
    jenis: 'kamar',
    judul: 'Data Kamar',
    deskripsi: 'Nomor kamar, tipe kamar, harga per bulan, dan status kamar di setiap kos.',
    ikon: DoorOpen,
    catatan: 'Mengikuti filter wilayah dan tipe kos',
  },
  {
    jenis: 'booking',
    judul: 'Data Booking',
    deskripsi: 'Kode booking, pemesan, jenis, tanggal, durasi, total biaya, dan status.',
    ikon: ClipboardList,
    catatan: 'Mengikuti filter wilayah, tipe kos, dan status booking',
  },
];

const filterAwal = { kota: '', tipe: '', status: '', format: 'xlsx' };

const selectClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition-all hover:border-emerald-500 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/15 shadow-sm';

const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600';

// Tanggal hari ini menurut WIB, format YYYY-MM-DD (sama seperti nama file dari backend)
const tanggalWib = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

const tanggalPanjang = () =>
  new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

// Saat responseType 'blob', pesan error dari backend ikut terbungkus blob
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

export default function Laporan() {
  const [filter, setFilter] = useState(filterAwal);
  const [wilayah, setWilayah] = useState([]);
  const [sedang, setSedang] = useState(null); // jenis laporan yang sedang diunduh
  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(URL_WILAYAH)
      .then((res) => setWilayah(res.data.data))
      .catch(() => setWilayah([]));
  }, []);

  const ubah = (e) => setFilter((f) => ({ ...f, [e.target.name]: e.target.value }));

  const adaFilter = filter.kota !== '' || filter.tipe !== '' || filter.status !== '';

  const unduh = async (kunci, url, params, namaFile) => {
    setSedang(kunci);
    setPesan('');
    setError('');
    try {
      const res = await api.get(url, { params, responseType: 'blob' });
      simpanFile(res.data, namaFile);
      setPesan(`File ${namaFile} berhasil diunduh`);
    } catch (err) {
      setError(await ambilPesanError(err));
    } finally {
      setSedang(null);
    }
  };

  const unduhLaporan = (jenis) => {
    const params = { format: filter.format };
    if (filter.kota) params.kota = filter.kota;
    if (filter.tipe) params.tipe = filter.tipe;
    // status hanya dipakai backend untuk laporan booking
    if (jenis === 'booking' && filter.status) params.status = filter.status;

    unduh(jenis, `${URL_EXPORT}/${jenis}`, params, `data-${jenis}-${tanggalWib()}.${filter.format}`);
  };

  const unduhBackup = () =>
    unduh('backup', `${URL_EXPORT}/backup`, {}, `backup-kosfinder-${tanggalWib()}.xlsx`);

  return (
    <div className="min-h-screen bg-slate-50/70 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Laporan
              </span>
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              Laporan &amp; Export Data
            </h2>
            <p className="mt-1.5 text-base text-slate-900">
              Unduh data kos, kamar, dan booking dalam format Excel, CSV, atau PDF, serta cadangan
              seluruh data.
            </p>
          </div>

          <div className="inline-flex items-center gap-2.5 self-start rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm sm:self-auto">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            <span>{tanggalPanjang()}</span>
          </div>
        </div>

        {/* NOTIFIKASI */}
        {pesan && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
              <span className="text-base font-semibold text-emerald-900">{pesan}</span>
            </div>
            <button
              onClick={() => setPesan('')}
              aria-label="Tutup pesan"
              className="rounded-lg p-1 text-emerald-700 transition hover:bg-emerald-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 shrink-0 text-slate-700" />
              <span className="text-base font-semibold text-slate-800">{error}</span>
            </div>
            <button
              onClick={() => setError('')}
              aria-label="Tutup pesan"
              className="rounded-lg p-1 text-slate-600 transition hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* FILTER */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <Filter className="h-4 w-4 text-emerald-600" />
              <span>Filter Laporan</span>
            </div>

            {adaFilter && (
              <button
                onClick={() => setFilter((f) => ({ ...filterAwal, format: f.format }))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className={labelClass}>Wilayah</span>
              <select name="kota" value={filter.kota} onChange={ubah} className={selectClass}>
                <option value="">Semua wilayah</option>
                {wilayah.map((w) => (
                  <option key={w.kota} value={w.kota}>
                    {w.kota}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={labelClass}>Tipe Kos</span>
              <select name="tipe" value={filter.tipe} onChange={ubah} className={selectClass}>
                <option value="">Semua tipe</option>
                <option value="Putra">Putra</option>
                <option value="Putri">Putri</option>
                <option value="Campur">Campur</option>
              </select>
            </label>

            <label className="block">
              <span className={labelClass}>Status Booking</span>
              <select name="status" value={filter.status} onChange={ubah} className={selectClass}>
                <option value="">Semua status</option>
                <option value="Menunggu">Menunggu</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Ditolak">Ditolak</option>
                <option value="Selesai">Selesai</option>
              </select>
            </label>

            <div>
              <span className={labelClass}>Format File</span>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-300 bg-slate-100 p-1 shadow-sm">
                {FORMAT.map((f) => (
                  <button
                    key={f.nilai}
                    type="button"
                    onClick={() => setFilter((s) => ({ ...s, format: f.nilai }))}
                    className={`rounded-lg py-2 text-sm font-bold transition ${
                      filter.format === f.nilai
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm font-medium text-slate-500">
            Status booking hanya berlaku untuk laporan booking. Sebagai Admin, Anda mengunduh data
            seluruh Owner.
          </p>
        </div>

        {/* KARTU LAPORAN */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {LAPORAN.map((l) => {
            const Ikon = l.ikon;
            const sibuk = sedang === l.jenis;

            return (
              <div
                key={l.jenis}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition-colors duration-200 group-hover:bg-emerald-600 group-hover:text-white">
                  <Ikon className="h-7 w-7" strokeWidth={1.8} />
                </div>

                <h3 className="mt-5 text-xl font-extrabold tracking-tight text-slate-900">
                  {l.judul}
                </h3>
                <p className="mt-2 flex-1 text-base leading-relaxed text-slate-600">
                  {l.deskripsi}
                </p>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-emerald-700">
                  {l.catatan}
                </p>

                <button
                  onClick={() => unduhLaporan(l.jenis)}
                  disabled={sedang !== null}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sibuk ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Menyiapkan file…
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      Unduh {FORMAT.find((f) => f.nilai === filter.format).label}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* BACKUP */}
        <div className="group flex flex-col gap-6 rounded-2xl border border-emerald-300 bg-emerald-50/50 p-7 shadow-sm transition-all duration-200 hover:shadow-md lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
              <Database className="h-7 w-7" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-xl font-extrabold tracking-tight text-slate-900">
                Backup Seluruh Data
              </h3>
              <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-600">
                Satu file Excel berisi semua tabel (user, kos, foto, fasilitas, kamar, booking,
                review), satu sheet per tabel. Kolom password tidak ikut diekspor dan tidak
                terpengaruh filter di atas.
              </p>
            </div>
          </div>

          <button
            onClick={unduhBackup}
            disabled={sedang !== null}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sedang === 'backup' ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Menyiapkan backup…
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Unduh Backup
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}