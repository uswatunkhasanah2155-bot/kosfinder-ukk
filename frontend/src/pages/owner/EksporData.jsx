import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Building2, BedDouble, CalendarCheck } from 'lucide-react';
import api from '../../api/axios';
import { HalamanOwner, Notif, GalatBox } from '../../components/owner/Ui';
import { kelasSelect, tombolUtama, pesanGalat, unduhFile } from '../../utils/ownerHelper';

// GET /api/export/kos | /api/export/kamar | /api/export/booking
// Query: format=xlsx|csv|pdf, kota, tipe, status (khusus booking)
// Owner hanya mendapat data kosnya sendiri.

const FORMAT = [
  { nilai: 'xlsx', label: 'Excel', ikon: FileSpreadsheet },
  { nilai: 'csv', label: 'CSV', ikon: FileText },
  { nilai: 'pdf', label: 'PDF', ikon: FileText },
];

const LAPORAN = [
  {
    nama: 'kos',
    judul: 'Data Kos',
    deskripsi: 'Daftar kos Anda beserta alamat, tipe, status, dan jumlah kamar.',
    ikon: Building2,
  },
  {
    nama: 'kamar',
    judul: 'Data Kamar',
    deskripsi: 'Seluruh kamar di kos Anda beserta tipe, harga, dan statusnya.',
    ikon: BedDouble,
  },
  {
    nama: 'booking',
    judul: 'Data Booking',
    deskripsi: 'Riwayat booking survey dan sewa kamar. Bisa difilter berdasarkan status.',
    ikon: CalendarCheck,
    denganStatus: true,
  },
];

const filterAwal = { kota: '', tipe: '', status: '' };

export default function EksporData() {
  const [filter, setFilter] = useState(filterAwal);
  const [wilayah, setWilayah] = useState([]);
  const [format, setFormat] = useState({ kos: 'xlsx', kamar: 'xlsx', booking: 'xlsx' });
  const [proses, setProses] = useState(null); // nama laporan yang sedang diunduh
  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');

  // Pilihan wilayah diambil dari kota kos milik Owner sendiri
  useEffect(() => {
    api
      .get('/kos/saya')
      .then((res) => setWilayah([...new Set(res.data.data.map((k) => k.kota))].sort()))
      .catch(() => setWilayah([]));
  }, []);

  const ubah = (e) => setFilter((f) => ({ ...f, [e.target.name]: e.target.value }));

  const adaFilter = useMemo(() => Object.values(filter).some(Boolean), [filter]);

  const unduh = async (laporan) => {
    setProses(laporan.nama);
    setPesan('');
    setError('');

    const params = { format: format[laporan.nama] };
    if (filter.kota) params.kota = filter.kota;
    if (filter.tipe) params.tipe = filter.tipe;
    if (laporan.denganStatus && filter.status) params.status = filter.status;

    try {
      await unduhFile(`/export/${laporan.nama}`, params, `${laporan.nama}.${params.format}`);
      setPesan(`${laporan.judul} berhasil diunduh.`);
    } catch (err) {
      setError(await pesanGalat(err, 'Gagal membuat file ekspor'));
    } finally {
      setProses(null);
    }
  };

  return (
    <HalamanOwner
      label="Laporan"
      judul="Ekspor Data"
      deskripsi="Unduh data kos, kamar, dan booking Anda dalam format Excel, CSV, atau PDF."
    >
      <Notif pesan={pesan} onTutup={() => setPesan('')} />
      <GalatBox pesan={error} onTutup={() => setError('')} />

      {/* FILTER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Filter Data</p>
          {adaFilter && (
            <button
              onClick={() => setFilter(filterAwal)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Wilayah</span>
            <select name="kota" value={filter.kota} onChange={ubah} className={kelasSelect}>
              <option value="">Semua wilayah</option>
              {wilayah.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Tipe Kos</span>
            <select name="tipe" value={filter.tipe} onChange={ubah} className={kelasSelect}>
              <option value="">Semua tipe</option>
              <option value="Putra">Putra</option>
              <option value="Putri">Putri</option>
              <option value="Campur">Campur</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
              Status Booking
            </span>
            <select name="status" value={filter.status} onChange={ubah} className={kelasSelect}>
              <option value="">Semua status</option>
              <option value="Menunggu">Menunggu</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Ditolak">Ditolak</option>
              <option value="Selesai">Selesai</option>
            </select>
            <span className="mt-1.5 block text-xs text-slate-500">Hanya berlaku untuk Data Booking.</span>
          </label>
        </div>
      </div>

      {/* KARTU LAPORAN */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {LAPORAN.map((l) => {
          const Ikon = l.ikon;
          const sibuk = proses === l.nama;
          return (
            <div
              key={l.nama}
              className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-900/5"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Ikon className="h-7 w-7" strokeWidth={1.8} />
              </div>
              <h3 className="mt-5 text-xl font-extrabold text-slate-900">{l.judul}</h3>
              <p className="mt-1.5 flex-1 text-base text-slate-600">{l.deskripsi}</p>

              <div className="mt-6">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Format</p>
                <div className="flex gap-2">
                  {FORMAT.map((f) => (
                    <button
                      key={f.nilai}
                      onClick={() => setFormat((s) => ({ ...s, [l.nama]: f.nilai }))}
                      aria-pressed={format[l.nama] === f.nilai}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                        format[l.nama] === f.nilai
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-500'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => unduh(l)} disabled={proses !== null} className={`${tombolUtama} mt-5 w-full`}>
                <Download className="h-5 w-5" />
                {sibuk ? 'Menyiapkan file…' : 'Unduh'}
              </button>
            </div>
          );
        })}
      </div>
    </HalamanOwner>
  );
}