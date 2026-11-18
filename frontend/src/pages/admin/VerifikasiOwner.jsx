import { useEffect, useState } from 'react';
import api from '../../api/axios';

// GET   /api/admin/owners?status=Menunggu|Terverifikasi|Ditolak
// PATCH /api/admin/owners/:id/verifikasi
// PATCH /api/admin/owners/:id/tolak
const URL_OWNER = '/admin/owners';

const TAB = [
  {
    kunci: 'Menunggu',
    judul: 'Menunggu',
    kosong: 'Tidak ada Owner yang menunggu verifikasi',
    petunjuk: 'Akun Owner baru akan muncul di sini setelah mendaftar.',
  },
  {
    kunci: 'Terverifikasi',
    judul: 'Terverifikasi',
    kosong: 'Belum ada Owner yang terverifikasi',
    petunjuk: 'Owner yang sudah Anda verifikasi akan tampil di sini.',
  },
  {
    kunci: 'Ditolak',
    judul: 'Ditolak',
    kosong: 'Tidak ada Owner yang ditolak',
    petunjuk: 'Owner yang pendaftarannya ditolak akan tampil di sini.',
  },
];

const gayaStatus = {
  Menunggu: 'border-slate-300 bg-slate-100 text-slate-700',
  Terverifikasi: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  Ditolak: 'border-red-300 bg-red-50 text-red-800',
};

const inisial = (nama = '') =>
  nama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase())
    .join('') || '?';

export default function VerifikasiOwner() {
  const [tab, setTab] = useState('Menunggu');
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pesan, setPesan] = useState('');
  const [prosesId, setProsesId] = useState(null);

  // Muat ulang daftar setiap tab berganti
  useEffect(() => {
    let batal = false;

    setLoading(true);
    setError('');
    api
      .get(URL_OWNER, { params: { status: tab } })
      .then((res) => {
        if (!batal) setOwners(res.data.data);
      })
      .catch((err) => {
        if (!batal) setError(err.response?.data?.message || 'Gagal memuat daftar Owner');
      })
      .finally(() => {
        if (!batal) setLoading(false);
      });

    return () => {
      batal = true;
    };
  }, [tab]);

  const gantiTab = (kunci) => {
    if (kunci === tab) return;
    setPesan('');
    setOwners([]);
    setTab(kunci);
  };

  // jenis: 'verifikasi' | 'tolak'
  const proses = async (owner, jenis) => {
    const tanya =
      jenis === 'tolak'
        ? `Tolak pendaftaran Owner "${owner.nama}"?`
        : `Verifikasi akun Owner "${owner.nama}"?`;
    if (!window.confirm(tanya)) return;

    setProsesId(owner.user_id);
    setPesan('');
    setError('');
    try {
      const res = await api.patch(`${URL_OWNER}/${owner.user_id}/${jenis}`);
      setOwners((daftar) => daftar.filter((o) => o.user_id !== owner.user_id));
      setPesan(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memproses Owner');
    } finally {
      setProsesId(null);
    }
  };

  const tabAktif = TAB.find((t) => t.kunci === tab);

  return (
    <div className="min-h-screen bg-slate-50/70 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <div className="border-b border-slate-200/85 pb-6">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            <span className="text-sm font-bold uppercase tracking-wider text-emerald-700">
              Manajemen Akun
            </span>
          </div>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Verifikasi Owner
          </h2>
          <p className="mt-1.5 text-base text-slate-900">
            Owner baru harus diverifikasi terlebih dahulu sebelum dapat menambahkan dan menayangkan kos.
          </p>
        </div>

        {/* NOTIFIKASI */}
        {pesan && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-base font-medium text-emerald-900 shadow-sm">
            {pesan}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-slate-300 bg-white p-5 text-base font-medium text-slate-800 shadow-sm">
            {error}
          </div>
        )}

        {/* KONTEN UTAMA & TABEL */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* BAR NAVIGASI TAB & INFO JUMLAH */}
          <div className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-xl bg-slate-100 p-1.5">
              {TAB.map((t) => (
                <button
                  key={t.kunci}
                  onClick={() => gantiTab(t.kunci)}
                  className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
                    tab === t.kunci
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.judul}
                </button>
              ))}
            </div>

            <div className="self-start rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 sm:self-auto">
              Total: {loading ? '…' : owners.length} Akun
            </div>
          </div>

          {/* TABEL DATA */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-bold">Owner</th>
                  <th className="px-6 py-4 font-bold">Email</th>
                  <th className="px-6 py-4 font-bold">No. WhatsApp</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 text-right font-bold">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {/* LOADING SKELETON */}
                {loading &&
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-5">
                        <div className="h-8 rounded-xl bg-slate-200/70" />
                      </td>
                    </tr>
                  ))}

                {/* KETIKA DATA KOSONG */}
                {!loading && owners.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <p className="text-base font-semibold text-slate-700">{tabAktif.kosong}</p>
                      <p className="mt-1 text-sm text-slate-500">{tabAktif.petunjuk}</p>
                    </td>
                  </tr>
                )}

                {/* LIST DATA OWNER */}
                {!loading &&
                  owners.map((o) => (
                    <tr key={o.user_id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                            {inisial(o.nama)}
                          </div>
                          <span className="font-bold text-slate-900">{o.nama}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-slate-700">{o.email}</td>
                      <td className="px-6 py-4.5 text-slate-700">{o.no_wa || '-'}</td>
                      <td className="px-6 py-4.5">
                        <span
                          className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${
                            gayaStatus[o.status_verifikasi] || gayaStatus.Menunggu
                          }`}
                        >
                          {o.status_verifikasi}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right">
                        {o.status_verifikasi === 'Terverifikasi' ? (
                          <span className="text-sm font-medium text-slate-400">—</span>
                        ) : (
                          <div className="flex justify-end gap-2.5">
                            {o.status_verifikasi === 'Menunggu' && (
                              <button
                                onClick={() => proses(o, 'tolak')}
                                disabled={prosesId === o.user_id}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-400 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-4 focus:ring-red-600/10 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Tolak
                              </button>
                            )}
                            <button
                              onClick={() => proses(o, 'verifikasi')}
                              disabled={prosesId === o.user_id}
                              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {prosesId === o.user_id ? 'Memproses…' : 'Verifikasi'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}