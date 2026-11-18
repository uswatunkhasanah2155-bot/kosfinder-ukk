import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function VerifikasiOwner() {
  const [owners, setOwners] = useState([]);
  const [cari, setCari] = useState('');
  const [loading, setLoading] = useState(true);
  const [memprosesId, setMemprosesId] = useState(null);
  const [pesan, setPesan] = useState({ tipe: '', teks: '' });

  const ambilDaftarOwner = () => {
    setLoading(true);
    api
      .get('/admin/owners/menunggu')
      .then((res) => setOwners(res.data.data || []))
      .catch((err) =>
        setPesan({
          tipe: 'error',
          teks: err.response?.data?.message || 'Gagal memuat daftar owner',
        })
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    ambilDaftarOwner();
  }, []);

  const handleVerifikasi = async (owner) => {
    const setuju = window.confirm(
      `Verifikasi akun pemilik kos "${owner.nama}" (${owner.email})?`
    );
    if (!setuju) return;

    setMemprosesId(owner.user_id);
    setPesan({ tipe: '', teks: '' });

    try {
      const res = await api.patch(`/admin/owners/${owner.user_id}/verifikasi`);
      setOwners((prev) => prev.filter((item) => item.user_id !== owner.user_id));
      setPesan({
        tipe: 'sukses',
        teks: res.data?.message || `Akun ${owner.nama} berhasil diverifikasi.`,
      });
    } catch (err) {
      setPesan({
        tipe: 'error',
        teks: err.response?.data?.message || 'Gagal memverifikasi akun owner',
      });
    } finally {
      setMemprosesId(null);
    }
  };

  const ownerTersaring = owners.filter(
    (o) =>
      o.nama.toLowerCase().includes(cari.toLowerCase()) ||
      o.email.toLowerCase().includes(cari.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#0d5a57]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0d5a57]">
              Manajemen Pengguna
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#12302e] md:text-3xl">
            Verifikasi Akun Pemilik Kos
          </h1>
          <p className="mt-1 text-sm text-[#4b625f]">
            Setujui pendaftaran pemilik kos baru agar mereka dapat menambahkan dan mempublikasikan data kos.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#12302e] shadow-sm sm:self-auto">
          <span>Menunggu Verifikasi:</span>
          <span className="rounded-md bg-[#0d5a57] px-2 py-0.5 text-white">
            {owners.length}
          </span>
        </div>
      </div>

      {/* NOTIFIKASI */}
      {pesan.teks && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium ${
            pesan.tipe === 'sukses'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-[#f3c4c0] bg-[#fdecea] text-[#b3261e]'
          }`}
        >
          <span>{pesan.teks}</span>
          <button
            onClick={() => setPesan({ tipe: '', teks: '' })}
            className="ml-4 text-xs font-bold opacity-70 hover:opacity-100"
          >
            Tutup
          </button>
        </div>
      )}

      {/* KONTEN UTAMA */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {/* Toolbar Pencarian */}
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama atau email owner..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3.5 text-sm text-[#12302e] transition focus:border-[#0d5a57] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0d5a57]/10"
            />
            <svg
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.15 6.15z"
              />
            </svg>
          </div>

          <button
            onClick={ambilDaftarOwner}
            className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#12302e] sm:self-auto"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Muat Ulang
          </button>
        </div>

        {/* Tabel / State */}
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : ownerTersaring.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="mt-3 text-base font-bold text-[#12302e]">
              {cari ? 'Owner tidak ditemukan' : 'Tidak ada antrean verifikasi'}
            </p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {cari
                ? 'Coba gunakan kata kunci nama atau email yang lain.'
                : 'Semua akun pemilik kos yang mendaftar saat ini sudah diverifikasi.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3.5">No</th>
                  <th className="px-6 py-3.5">Nama Pemilik Kos</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">No. WhatsApp</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ownerTersaring.map((owner, idx) => (
                  <tr
                    key={owner.user_id}
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4 font-medium text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4 font-bold text-[#12302e]">
                      {owner.nama}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{owner.email}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {owner.no_wa || (
                        <span className="text-xs italic text-slate-400">
                          Tidak diisi
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {owner.status_verifikasi}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleVerifikasi(owner)}
                        disabled={memprosesId === owner.user_id}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0d5a57] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#0a4341] disabled:cursor-progress disabled:opacity-60"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {memprosesId === owner.user_id
                          ? 'Memproses...'
                          : 'Verifikasi'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}