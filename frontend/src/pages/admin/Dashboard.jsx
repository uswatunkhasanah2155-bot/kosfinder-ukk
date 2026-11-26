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
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition-all hover:border-emerald-500 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/15 shadow-sm';

function KartuStatistik({ judul, nilai, keterangan, ikon, sorot = false }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300 hover:bg-emerald-50/50 ${
        sorot
          ? 'border-emerald-300 bg-emerald-50/50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-600">{judul}</p>
          <p className="mt-2.5 text-4xl font-extrabold tracking-tight text-slate-900">
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
              : 'bg-slate-100 text-slate-700 group-hover:bg-emerald-600 group-hover:text-emerald-50 group-hover:shadow-sm'
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
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
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

    // Jalankan update status di mikrotask agar tidak memicu render berantai
    // langsung di dalam effect (aturan react-hooks/set-state-in-effect).
    queueMicrotask(() => {
      setLoading(true);
      setError('');
    });
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
    <div className="min-h-screen bg-slate-50/70 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Ringkasan Operasional
              </span>
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              Dashboard Admin
            </h2>
            <p className="mt-1.5 text-base text-slate-900">
              Jumlah kos terdaftar per wilayah dan perkembangan booking tahun {filter.tahun}.
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
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Wilayah</span>
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
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Tipe Kos</span>
              <select name="tipe" value={filter.tipe} onChange={ubah} className={selectClass}>
                <option value="">Semua tipe</option>
                <option value="Putra">Putra</option>
                <option value="Putri">Putri</option>
                <option value="Campur">Campur</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Status Booking</span>
              <select name="status" value={filter.status} onChange={ubah} className={selectClass}>
                <option value="">Semua status</option>
                <option value="Menunggu">Menunggu</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Ditolak">Ditolak</option>
                <option value="Selesai">Selesai</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Tahun</span>
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
              <KartuStatistik
                judul="Total Kos"
                nilai={r.total_kos}
                keterangan="Unit kos terdaftar"
                sorot
                ikon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                }
              />

              <KartuStatistik
                judul="Total Owner"
                nilai={r.total_owner}
                keterangan="Pemilik tergabung"
                ikon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />

              <KartuStatistik
                judul="Menunggu Verifikasi"
                nilai={r.owner_menunggu_verifikasi}
                keterangan="Akun owner baru"
                ikon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />

              <KartuStatistik
                judul="Total Pencari Kos"
                nilai={r.total_user}
                keterangan="Pengguna terdaftar"
                ikon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />

              <KartuStatistik
                judul="Total Booking"
                nilai={r.total_booking}
                keterangan="Seluruh pengajuan"
                ikon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
              />
            </div>

            {/* GRAFIK */}
            <div className="grid gap-8 lg:grid-cols-2">
              {/* BAR CHART */}
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Jumlah Kos Terdaftar per Wilayah
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Distribusi unit kos berdasarkan kota
                    </p>
                  </div>
                  <span className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {data.kos_per_wilayah.length} Wilayah
                  </span>
                </div>

                <div className="relative min-h-80 flex-1">
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
                            backgroundColor: '#0f172a',
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 13 },
                            padding: 14,
                            cornerRadius: 12,
                          },
                        },
                        scales: {
                          x: {
                            grid: { display: false },
                            ticks: { color: '#475569', font: { size: 13, weight: '500' } },
                          },
                          y: {
                            beginAtZero: true,
                            border: { display: false },
                            grid: { color: '#f1f5f9' },
                            ticks: {
                              precision: 0,
                              color: '#475569',
                              font: { size: 13, weight: '500' },
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
                      <p className="text-base font-semibold text-slate-700">Belum ada data kos</p>
                      <p className="mt-1 text-sm text-slate-500">Sesuaikan filter untuk melihat data lain</p>
                    </div>
                  )}
                </div>
              </div>

              {/* LINE CHART */}
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Pertumbuhan Booking {filter.tahun}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Tren booking bulanan dan total kumulatif
                    </p>
                  </div>
                  <span className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    Jan – Des
                  </span>
                </div>

                <div className="relative min-h-80 flex-1">
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
                          pointRadius: 4,
                          pointHoverRadius: 7,
                          pointBackgroundColor: '#ffffff',
                          pointBorderWidth: 2,
                        },
                        {
                          label: 'Kumulatif',
                          data: data.pertumbuhan_booking.map((p) => p.kumulatif),
                          borderColor: '#475569',
                          backgroundColor: '#475569',
                          borderDash: [5, 5],
                          tension: 0.35,
                          pointRadius: 3.5,
                          pointHoverRadius: 6,
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
                            color: '#334155',
                            font: { size: 13, weight: '600' },
                          },
                        },
                        tooltip: {
                          backgroundColor: '#0f172a',
                          titleFont: { size: 14, weight: 'bold' },
                          bodyFont: { size: 13 },
                          padding: 14,
                          cornerRadius: 12,
                        },
                      },
                      scales: {
                        x: {
                          grid: { display: false },
                          ticks: { color: '#475569', font: { size: 13, weight: '500' } },
                        },
                        y: {
                          beginAtZero: true,
                          border: { display: false },
                          grid: { color: '#f1f5f9' },
                          ticks: {
                            precision: 0,
                            color: '#475569',
                            font: { size: 13, weight: '500' },
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