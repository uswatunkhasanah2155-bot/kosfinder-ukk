import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import api from '../../api/axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const URL_DASHBOARD = '/owner/dashboard';
const URL_BOOKING = '/owner/booking';
const URL_KOS_SAYA = '/kos/saya';
const URL_WILAYAH = '/wilayah';

const tahunIni = new Date().getFullYear();
const bulanIni = new Date().getMonth(); // 0 = Januari
const daftarTahun = Array.from({ length: 5 }, (_, i) => tahunIni - i);
const filterAwal = { kota: '', tipe: '', status: '', tahun: tahunIni };

const selectClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition-all hover:border-emerald-500 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/15 shadow-sm';

const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

const rupiahRingkas = (n) =>
  n >= 1_000_000
    ? `Rp ${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
    : rupiah(n);

const formatTanggal = (s) =>
  new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const opsiTooltip = {
  backgroundColor: '#0f172a',
  titleFont: { size: 14, weight: 'bold' },
  bodyFont: { size: 13 },
  padding: 14,
  cornerRadius: 12,
};

const opsiTick = { color: '#475569', font: { size: 13, weight: '500' } };

function Ikon({ d }) {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const IKON = {
  rumah:
    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  jam: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  uang:
    'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  bintang:
    'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
};

function KartuStatistik({ judul, nilai, keterangan, ikon, sorot = false }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        sorot
          ? 'border-emerald-300 bg-emerald-50/50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-600">{judul}</p>
          <p className="mt-2.5 wrap-break-word text-3xl font-extrabold tracking-tight text-slate-900">
            {nilai ?? 0}
          </p>
          {keterangan && (
            <p className="mt-2 text-xs font-medium text-slate-500">{keterangan}</p>
          )}
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors duration-200 ${
            sorot
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-700'
          }`}
        >
          {ikon}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">{label}</span>
      <select className={selectClass} {...props} />
    </label>
  );
}

function SkeletonDashboard() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-200/70" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-96 rounded-2xl bg-slate-200/70" />
        <div className="h-96 rounded-2xl bg-slate-200/70" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [filter, setFilter] = useState(filterAwal);
  const [wilayah, setWilayah] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [booking, setBooking] = useState([]); // booking berstatus Menunggu
  const [rating, setRating] = useState({ rata: null, jumlah: 0 });
  const [prosesId, setProsesId] = useState(null);
  const [errorAksi, setErrorAksi] = useState('');

  const muatDashboard = useCallback(() => {
    const params = Object.fromEntries(
      Object.entries(filter).filter(([, v]) => v !== '')
    );

    setLoading(true);
    setError('');
    return api
      .get(URL_DASHBOARD, { params })
      .then((res) => setData(res.data.data))
      .catch((err) =>
        setError(err.response?.data?.message || 'Gagal memuat dashboard')
      )
      .finally(() => setLoading(false));
  }, [filter]);

  const muatBooking = useCallback(
    () =>
      api
        .get(URL_BOOKING, { params: { status: 'Menunggu' } })
        .then((res) => setBooking(res.data.data))
        .catch(() => setBooking([])),
    []
  );

  useEffect(() => {
    api
      .get(URL_WILAYAH)
      .then((res) => setWilayah(res.data.data))
      .catch(() => setWilayah([]));
  }, []);

  // Rating rata-rata semua kos milik owner (dihitung dari rata_rating dan jumlah_review tiap kos)
  useEffect(() => {
    api
      .get(URL_KOS_SAYA)
      .then((res) => {
        const daftar = res.data.data;
        const jumlah = daftar.reduce((a, k) => a + (k.jumlah_review || 0), 0);
        const total = daftar.reduce((a, k) => a + (k.rata_rating ?? 0) * (k.jumlah_review || 0), 0);
        setRating({ rata: jumlah ? Math.round((total / jumlah) * 10) / 10 : null, jumlah });
      })
      .catch(() => setRating({ rata: null, jumlah: 0 }));
  }, []);

  useEffect(() => {
    muatBooking();
  }, [muatBooking]);

  useEffect(() => {
    muatDashboard();
  }, [muatDashboard]);

  const ubah = (e) =>
    setFilter((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Setujui / tolak booking, lalu muat ulang booking dan dashboard (status kamar bisa ikut berubah)
  const proses = async (id, aksi) => {
    setProsesId(id);
    setErrorAksi('');
    try {
      await api.patch(`/booking/${id}/${aksi}`);
      await Promise.all([muatBooking(), muatDashboard()]);
    } catch (err) {
      setErrorAksi(err.response?.data?.message || 'Gagal memproses booking');
    } finally {
      setProsesId(null);
    }
  };

  const adaFilterAktif =
    filter.kota !== '' ||
    filter.tipe !== '' ||
    filter.status !== '' ||
    Number(filter.tahun) !== tahunIni;

  const r = data?.ringkasan;
  const tahunBerjalan = Number(filter.tahun) === tahunIni;
  const pendapatanTampil = tahunBerjalan
    ? data?.pendapatan_per_bulan?.[bulanIni]?.estimasi_pendapatan
    : r?.total_estimasi_pendapatan_tahun;

  return (
    <div className="min-h-screen bg-slate-50/70 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Ringkasan Usaha Kos
              </span>
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              Dashboard Owner
            </h2>
            <p className="mt-1.5 text-base text-slate-900">
              Okupansi kamar dan estimasi pendapatan kos Anda tahun {filter.tahun}.
            </p>
          </div>

          <div className="inline-flex items-center gap-2.5 self-start rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm sm:self-auto">
            <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Periode {filter.tahun}</span>
          </div>
        </div>

        {/* FILTER */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filter Tampilan</span>
            </div>

            {adaFilterAktif && (
              <button
                onClick={() => setFilter(filterAwal)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect label="Wilayah" name="kota" value={filter.kota} onChange={ubah}>
              <option value="">Semua wilayah</option>
              {wilayah.map((w) => (
                <option key={w.kota} value={w.kota}>
                  {w.kota}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect label="Tipe Kos" name="tipe" value={filter.tipe} onChange={ubah}>
              <option value="">Semua tipe</option>
              <option value="Putra">Putra</option>
              <option value="Putri">Putri</option>
              <option value="Campur">Campur</option>
            </FilterSelect>

            <FilterSelect label="Status Booking" name="status" value={filter.status} onChange={ubah}>
              <option value="">Semua status</option>
              <option value="Menunggu">Menunggu</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Ditolak">Ditolak</option>
              <option value="Selesai">Selesai</option>
            </FilterSelect>

            <FilterSelect label="Tahun" name="tahun" value={filter.tahun} onChange={ubah}>
              {daftarTahun.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </FilterSelect>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="rounded-2xl border border-slate-300 bg-white p-5 text-base font-semibold text-slate-800 shadow-sm">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading && !data && <SkeletonDashboard />}

        {/* KONTEN */}
        {data && (
          <div className={`space-y-8 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
            {/* KARTU RINGKASAN */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <KartuStatistik
                judul="Okupansi"
                nilai={`${r.okupansi_persen}%`}
                keterangan={`${r.kamar_terisi} dari ${r.total_kamar} kamar terisi`}
                sorot
                ikon={<Ikon d={IKON.rumah} />}
              />
              <KartuStatistik
                judul="Booking Menunggu"
                nilai={booking.length}
                keterangan="Perlu disetujui atau ditolak"
                ikon={<Ikon d={IKON.jam} />}
              />
              <KartuStatistik
                judul={tahunBerjalan ? 'Pendapatan Bulan Ini' : `Pendapatan ${filter.tahun}`}
                nilai={rupiahRingkas(pendapatanTampil)}
                keterangan={`${rupiah(pendapatanTampil)} (estimasi)`}
                ikon={<Ikon d={IKON.uang} />}
              />
              <KartuStatistik
                judul="Rating Rata-rata"
                nilai={rating.rata === null ? '-' : String(rating.rata).replace('.', ',')}
                keterangan={`${rating.jumlah} review`}
                ikon={<Ikon d={IKON.bintang} />}
              />
            </div>

            {/* GRAFIK */}
            <div className="grid gap-8 lg:grid-cols-2">
              {/* BAR CHART */}
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Okupansi Kamar</h3>
                    <p className="mt-1 text-sm text-slate-500">Persentase kamar terisi per kos</p>
                  </div>
                  <span className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {data.okupansi_per_kos.length} Kos
                  </span>
                </div>

                <div className="relative min-h-80 flex-1">
                  {data.okupansi_per_kos.length ? (
                    <Bar
                      data={{
                        labels: data.okupansi_per_kos.map((k) => k.nama_kos),
                        datasets: [
                          {
                            label: 'Okupansi (%)',
                            data: data.okupansi_per_kos.map((k) => k.okupansi_persen),
                            backgroundColor: '#059669',
                            hoverBackgroundColor: '#047857',
                            borderRadius: 8,
                            borderSkipped: false,
                            maxBarThickness: 48,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            ...opsiTooltip,
                            callbacks: {
                              label: (ctx) => {
                                const k = data.okupansi_per_kos[ctx.dataIndex];
                                return `${k.okupansi_persen}% (${k.terisi} dari ${k.jumlah_kamar} kamar terisi)`;
                              },
                            },
                          },
                        },
                        scales: {
                          x: { grid: { display: false }, ticks: opsiTick },
                          y: {
                            beginAtZero: true,
                            max: 100,
                            border: { display: false },
                            grid: { color: '#f1f5f9' },
                            ticks: { ...opsiTick, callback: (v) => `${v}%` },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
                      <p className="text-base font-semibold text-slate-700">Belum ada data kos</p>
                      <p className="mt-1 text-sm text-slate-500">Tambahkan kos atau sesuaikan filter</p>
                    </div>
                  )}
                </div>
              </div>

              {/* LINE CHART */}
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Estimasi Pendapatan</h3>
                    <p className="mt-1 text-sm text-slate-500">Pendapatan sewa kamar per bulan</p>
                  </div>
                  <span className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    Jan – Des
                  </span>
                </div>

                <div className="relative min-h-80 flex-1">
                  <Line
                    data={{
                      labels: data.pendapatan_per_bulan.map((p) => p.label),
                      datasets: [
                        {
                          label: 'Estimasi Pendapatan',
                          data: data.pendapatan_per_bulan.map((p) => p.estimasi_pendapatan),
                          borderColor: '#059669',
                          backgroundColor: 'rgba(5, 150, 105, 0.1)',
                          fill: true,
                          tension: 0.35,
                          pointRadius: 4,
                          pointHoverRadius: 7,
                          pointBackgroundColor: '#ffffff',
                          pointBorderWidth: 2,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: { mode: 'index', intersect: false },
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          ...opsiTooltip,
                          callbacks: { label: (ctx) => rupiah(ctx.parsed.y) },
                        },
                      },
                      scales: {
                        x: { grid: { display: false }, ticks: opsiTick },
                        y: {
                          beginAtZero: true,
                          border: { display: false },
                          grid: { color: '#f1f5f9' },
                          ticks: {
                            ...opsiTick,
                            callback: (v) => (v >= 1_000_000 ? `${v / 1_000_000} jt` : v),
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>

            {/* BOOKING MASUK */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Booking Masuk</h3>
                  <p className="mt-1 text-sm text-slate-500">Pengajuan yang menunggu keputusan Anda</p>
                </div>
                {booking.length > 5 && (
                  <Link to="/owner/booking" className="text-sm font-bold text-[#0d5a57] hover:underline">
                    Lihat semua ({booking.length})
                  </Link>
                )}
              </div>

              {errorAksi && (
                <p className="mt-3 rounded-lg border border-[#f3c4c0] bg-[#fdecea] px-3.5 py-3 text-sm text-[#b3261e]" role="alert">
                  {errorAksi}
                </p>
              )}

              {booking.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-10 text-center">
                  <p className="text-base font-semibold text-slate-700">Belum ada booking baru</p>
                  <p className="mt-1 text-sm text-slate-500">Pengajuan dari pencari kos akan muncul di sini</p>
                </div>
              ) : (
                <div className="mt-2">
                  {booking.slice(0, 5).map((b) => (
                    <div
                      key={b.booking_id}
                      className="flex flex-col gap-3 border-t border-slate-200 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">{b.pemesan.nama}</p>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {b.kos.nama_kos}, kamar {b.kamar.no_kamar} -{' '}
                          {b.jenis_booking === 'Kamar'
                            ? `sewa ${b.durasi_bulan} bulan mulai`
                            : 'survey'}{' '}
                          {formatTanggal(b.tanggal_survey)}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => proses(b.booking_id, 'tolak')}
                          disabled={prosesId === b.booking_id}
                          className="cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-progress disabled:opacity-60"
                        >
                          Tolak
                        </button>
                        <button
                          onClick={() => proses(b.booking_id, 'setujui')}
                          disabled={prosesId === b.booking_id}
                          className="cursor-pointer rounded-xl bg-[#0d5a57] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0a4341] disabled:cursor-progress disabled:opacity-60"
                        >
                          Setujui
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}