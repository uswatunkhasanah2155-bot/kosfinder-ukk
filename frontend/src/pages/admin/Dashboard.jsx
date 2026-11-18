import { useEffect, useState } from 'react';
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

const URL_DASHBOARD = '/admin/dashboard';
const URL_WILAYAH = '/wilayah';

const tahunIni = new Date().getFullYear();
const daftarTahun = Array.from({ length: 5 }, (_, i) => tahunIni - i);
const filterAwal = { kota: '', tipe: '', status: '', tahun: tahunIni };

const selectClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-emerald-300 hover:bg-white focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10';

function KartuStatistik({ judul, nilai, keterangan, ikon, sorot = false }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        sorot
          ? 'border-emerald-200 bg-emerald-50/40'
          : 'border-slate-200/80 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{judul}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {nilai ?? 0}
          </p>
          {keterangan && (
            <p className="mt-1.5 text-xs text-slate-400">{keterangan}</p>
          )}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
            sorot
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-700'
          }`}
        >
          {ikon}
        </div>
      </div>
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200/60" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-2xl bg-slate-200/60" />
        <div className="h-80 rounded-2xl bg-slate-200/60" />
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

  useEffect(() => {
    api
      .get(URL_WILAYAH)
      .then((res) => setWilayah(res.data.data))
      .catch(() => setWilayah([]));
  }, []);

  useEffect(() => {
    const params = Object.fromEntries(
      Object.entries(filter).filter(([, v]) => v !== '')
    );

    setLoading(true);
    setError('');
    api
      .get(URL_DASHBOARD, { params })
      .then((res) => setData(res.data.data))
      .catch((err) =>
        setError(err.response?.data?.message || 'Gagal memuat dashboard')
      )
      .finally(() => setLoading(false));
  }, [filter]);

  const ubah = (e) =>
    setFilter((f) => ({ ...f, [e.target.name]: e.target.value }));

  const adaFilterAktif =
    filter.kota !== '' ||
    filter.tipe !== '' ||
    filter.status !== '' ||
    Number(filter.tahun) !== tahunIni;

  const r = data?.ringkasan;

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Ringkasan Operasional
              </span>
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Dashboard Admin
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Jumlah kos terdaftar per wilayah dan perkembangan booking tahun {filter.tahun}.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm sm:self-auto">
            <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Periode {filter.tahun}</span>
          </div>
        </div>

        {/* FILTER */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filter Tampilan</span>
            </div>

            {adaFilterAktif && (
              <button
                onClick={() => setFilter(filterAwal)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Wilayah</span>
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
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Tipe Kos</span>
              <select name="tipe" value={filter.tipe} onChange={ubah} className={selectClass}>
                <option value="">Semua tipe</option>
                <option value="Putra">Putra</option>
                <option value="Putri">Putri</option>
                <option value="Campur">Campur</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Status Booking</span>
              <select name="status" value={filter.status} onChange={ubah} className={selectClass}>
                <option value="">Semua status</option>
                <option value="Menunggu">Menunggu</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Ditolak">Ditolak</option>
                <option value="Selesai">Selesai</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Tahun</span>
              <select name="tahun" value={filter.tahun} onChange={ubah} className={selectClass}>
                {daftarTahun.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="rounded-2xl border border-slate-300 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading && !data && <SkeletonDashboard />}

        {/* KONTEN */}
        {data && (
          <div className={`space-y-6 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
            {/* KARTU RINGKASAN */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <KartuStatistik
                judul="Total Kos"
                nilai={r.total_kos}
                keterangan="Unit kos terdaftar"
                sorot
                ikon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                }
              />

              <KartuStatistik
                judul="Total Owner"
                nilai={r.total_owner}
                keterangan="Pemilik tergabung"
                ikon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />

              <KartuStatistik
                judul="Menunggu Verifikasi"
                nilai={r.owner_menunggu_verifikasi}
                keterangan="Akun owner baru"
                ikon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />

              <KartuStatistik
                judul="Total Pencari Kos"
                nilai={r.total_user}
                keterangan="Pengguna terdaftar"
                ikon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />

              <KartuStatistik
                judul="Total Booking"
                nilai={r.total_booking}
                keterangan="Seluruh pengajuan"
                ikon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
              />
            </div>

            {/* GRAFIK */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* BAR CHART */}
              <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Jumlah Kos Terdaftar per Wilayah
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Distribusi unit kos berdasarkan kota
                    </p>
                  </div>
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {data.kos_per_wilayah.length} Wilayah
                  </span>
                </div>

                <div className="relative min-h-67.5 flex-1">
                  {data.kos_per_wilayah.length ? (
                    <Bar
                      data={{
                        labels: data.kos_per_wilayah.map((w) => w.kota),
                        datasets: [
                          {
                            label: 'Jumlah Kos',
                            data: data.kos_per_wilayah.map((w) => w.jumlah_kos),
                            backgroundColor: '#059669',
                            hoverBackgroundColor: '#047857',
                            borderRadius: 8,
                            borderSkipped: false,
                            maxBarThickness: 44,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: '#0f172a',
                            padding: 12,
                            cornerRadius: 10,
                          },
                        },
                        scales: {
                          x: {
                            grid: { display: false },
                            ticks: { color: '#64748b', font: { size: 12 } },
                          },
                          y: {
                            beginAtZero: true,
                            border: { display: false },
                            grid: { color: '#f1f5f9' },
                            ticks: {
                              precision: 0,
                              color: '#64748b',
                              font: { size: 12 },
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                      <p className="text-sm font-medium text-slate-500">Belum ada data kos</p>
                      <p className="mt-1 text-xs text-slate-400">Sesuaikan filter untuk melihat data lain</p>
                    </div>
                  )}
                </div>
              </div>

              {/* LINE CHART */}
              <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Pertumbuhan Booking {filter.tahun}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Tren booking bulanan dan total kumulatif
                    </p>
                  </div>
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                    Jan – Des
                  </span>
                </div>

                <div className="relative min-h-67.5 flex-1">
                  <Line
                    data={{
                      labels: data.pertumbuhan_booking.map((p) => p.label),
                      datasets: [
                        {
                          label: 'Booking Baru',
                          data: data.pertumbuhan_booking.map((p) => p.jumlah_booking),
                          borderColor: '#059669',
                          backgroundColor: 'rgba(5, 150, 105, 0.1)',
                          fill: true,
                          tension: 0.35,
                          pointRadius: 3.5,
                          pointHoverRadius: 6,
                          pointBackgroundColor: '#ffffff',
                          pointBorderWidth: 2,
                        },
                        {
                          label: 'Kumulatif',
                          data: data.pertumbuhan_booking.map((p) => p.kumulatif),
                          borderColor: '#64748b',
                          backgroundColor: '#64748b',
                          borderDash: [5, 5],
                          tension: 0.35,
                          pointRadius: 3,
                          pointHoverRadius: 5,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        mode: 'index',
                        intersect: false,
                      },
                      plugins: {
                        legend: {
                          position: 'top',
                          align: 'end',
                          labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            color: '#475569',
                            font: { size: 12 },
                          },
                        },
                        tooltip: {
                          backgroundColor: '#0f172a',
                          padding: 12,
                          cornerRadius: 10,
                        },
                      },
                      scales: {
                        x: {
                          grid: { display: false },
                          ticks: { color: '#64748b', font: { size: 12 } },
                        },
                        y: {
                          beginAtZero: true,
                          border: { display: false },
                          grid: { color: '#f1f5f9' },
                          ticks: {
                            precision: 0,
                            color: '#64748b',
                            font: { size: 12 },
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}