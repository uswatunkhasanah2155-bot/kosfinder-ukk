import { useCallback, useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import api from '../../api/axios';
import { HalamanOwner, GalatBox, DataKosong } from '../../components/owner/Ui';
import { kelasSelect, formatWaktu } from '../../utils/ownerHelper';

// Review diambil dari GET /api/owner/booking: setiap booking membawa review-nya (jika ada).
// Dengan begitu semua review tampil, termasuk untuk kos yang sedang Nonaktif atau Draf.

function Bintang({ nilai, ukuran = 'h-5 w-5' }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${nilai} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${ukuran} ${i <= nilai ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
        />
      ))}
    </span>
  );
}

export default function Review() {
  const [data, setData] = useState([]);
  const [daftarKos, setDaftarKos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kosId, setKosId] = useState('');
  const [rating, setRating] = useState('');

  const muatData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/owner/booking', { params: { status: 'Selesai' } });
      setData(res.data.data.filter((b) => b.review));
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat review');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muatData();
  }, [muatData]);

  useEffect(() => {
    api
      .get('/kos/saya')
      .then((res) => setDaftarKos(res.data.data))
      .catch(() => setDaftarKos([]));
  }, []);

  // Ringkasan dihitung dari review sesuai pilihan kos (rating tidak memengaruhi ringkasan)
  const dalamKos = useMemo(
    () => data.filter((b) => !kosId || b.kos.kos_id === Number(kosId)),
    [data, kosId]
  );

  const ringkasan = useMemo(() => {
    const jumlah = dalamKos.length;
    const total = dalamKos.reduce((a, b) => a + b.review.rating, 0);
    const sebaran = [5, 4, 3, 2, 1].map((n) => ({
      n,
      jumlah: dalamKos.filter((b) => b.review.rating === n).length,
    }));
    return { jumlah, rata: jumlah ? Math.round((total / jumlah) * 10) / 10 : null, sebaran };
  }, [dalamKos]);

  const tampil = useMemo(
    () =>
      dalamKos
        .filter((b) => !rating || b.review.rating === Number(rating))
        .sort((a, b) => new Date(b.review.dibuat_pada) - new Date(a.review.dibuat_pada)),
    [dalamKos, rating]
  );

  return (
    <HalamanOwner
      label="Umpan Balik"
      judul="Review"
      deskripsi="Penilaian dari pencari kos yang sudah menyelesaikan booking di kos Anda."
    >
      <GalatBox pesan={error} onCoba={muatData} />

      <select
        value={kosId}
        onChange={(e) => setKosId(e.target.value)}
        className={`${kelasSelect} sm:max-w-sm`}
        aria-label="Filter kos"
      >
        <option value="">Semua kos</option>
        {daftarKos.map((k) => (
          <option key={k.kos_id} value={k.kos_id}>
            {k.nama_kos}
          </option>
        ))}
      </select>

      {loading && <div className="h-48 animate-pulse rounded-2xl bg-slate-200/70" />}

      {!loading && !error && (
        <>
          {/* RINGKASAN */}
          <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm md:grid-cols-[220px_1fr]">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-emerald-50 px-6 py-6 text-center">
              <p className="text-5xl font-extrabold tracking-tight text-slate-900">
                {ringkasan.rata === null ? '-' : String(ringkasan.rata).replace('.', ',')}
              </p>
              <div className="mt-2">
                <Bintang nilai={Math.round(ringkasan.rata || 0)} />
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-600">{ringkasan.jumlah} review</p>
            </div>

            <div className="flex flex-col justify-center gap-2.5">
              {ringkasan.sebaran.map((s) => (
                <button
                  key={s.n}
                  onClick={() => setRating(rating === String(s.n) ? '' : String(s.n))}
                  className={`flex items-center gap-3 rounded-xl px-2 py-1 text-left transition hover:bg-slate-50 ${
                    rating === String(s.n) ? 'bg-emerald-50' : ''
                  }`}
                  aria-label={`Tampilkan review ${s.n} bintang`}
                >
                  <span className="w-12 text-sm font-bold text-slate-700">{s.n} bintang</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-emerald-600"
                      style={{ width: `${ringkasan.jumlah ? (s.jumlah / ringkasan.jumlah) * 100 : 0}%` }}
                    />
                  </span>
                  <span className="w-8 text-right text-sm font-semibold text-slate-600">{s.jumlah}</span>
                </button>
              ))}
              {rating && (
                <button
                  onClick={() => setRating('')}
                  className="mt-1 self-start text-sm font-bold text-emerald-700 hover:underline"
                >
                  Tampilkan semua rating
                </button>
              )}
            </div>
          </div>

          {/* DAFTAR REVIEW */}
          <div className="space-y-4">
            {tampil.map((b) => (
              <div key={b.review.review_id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-extrabold text-slate-900">{b.pemesan.nama}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {b.kos.nama_kos}, kamar {b.kamar.no_kamar}
                    </p>
                  </div>
                  <div className="text-right">
                    <Bintang nilai={b.review.rating} />
                    <p className="mt-1 text-xs font-medium text-slate-500">{formatWaktu(b.review.dibuat_pada)}</p>
                  </div>
                </div>

                <p className="mt-4 text-base leading-relaxed text-slate-800">
                  {b.review.komentar || <span className="italic text-slate-400">Tidak ada komentar</span>}
                </p>
              </div>
            ))}

            {tampil.length === 0 && (
              <DataKosong
                judul={data.length === 0 ? 'Belum ada review' : 'Tidak ada review yang cocok'}
                deskripsi={
                  data.length === 0
                    ? 'Review muncul setelah pencari kos menyelesaikan booking dan memberi penilaian.'
                    : 'Coba ganti filter kos atau rating.'
                }
              />
            )}
          </div>
        </>
      )}
    </HalamanOwner>
  );
}