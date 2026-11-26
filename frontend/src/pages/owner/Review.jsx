import { useEffect, useMemo, useState } from 'react';
import { Star, StarOff } from 'lucide-react';
import api from '../../api/axios';
import { Kosong, Pesan } from '../../components/ui';

const BATAL = 1;

const Bintang = ({ nilai, kecil = false }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`Rating ${nilai} dari 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`${kecil ? 'h-3.5 w-3.5' : 'h-5 w-5'} ${
          n <= nilai ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
        }`}
      />
    ))}
  </span>
);

export default function Review() {
  const [daftarKos, setDaftarKos] = useState([]);
  const [kosId, setKosId] = useState('');
  const [review, setReview] = useState({ rata: null, jumlah: 0, data: [] });
  const [halaman, setHalaman] = useState(1);
  const [memuat, setMemuat] = useState(true);
  const [pesan, setPesan] = useState(null);

  useEffect(() => {
    let batal = false;
    queueMicrotask(() => {
      api
        .get('/kos/saya')
        .then((res) => {
          if (batal) return;
          const kos = res.data.data ?? [];
          setDaftarKos(kos);
          const aktif = kos.find((k) => k.status_verifikasi === 'Aktif');
          if (aktif) setKosId(String(aktif.kos_id));
        })
        .catch(() => {
          if (!batal) setPesan({ tipe: 'galat', teks: 'Gagal memuat data kos.' });
        })
        .finally(() => {
          if (!batal) setMemuat(false);
        });
    });
    return () => {
      batal = true;
    };
  }, []);

  useEffect(() => {
    if (!kosId) return undefined;
    let batal = false;
    queueMicrotask(() => {
      setMemuat(true);
      api
        .get(`/kos/${kosId}/review`, { params: { page: halaman, limit: 10 } })
        .then((res) => {
          if (!batal) {
            setReview({
              rata: res.data.rata_rating,
              jumlah: res.data.jumlah_review,
              data: res.data.data ?? [],
              totalHalaman: Math.max(1, Math.ceil((res.data.jumlah_review ?? 0) / (res.data.limit ?? 10))),
            });
          }
        })
        .catch(() => {
          if (!batal) {
            setReview({ rata: null, jumlah: 0, data: [], totalHalaman: 1 });
            setPesan({ tipe: 'galat', teks: 'Review hanya tersedia untuk kos yang sudah aktif.' });
          }
        })
        .finally(() => {
          if (!batal) setMemuat(false);
        });
    });
    return () => {
      batal = true;
    };
  }, [kosId, halaman]);

  const kosTerpilih = useMemo(
    () => daftarKos.find((k) => String(k.kos_id) === String(kosId)),
    [daftarKos, kosId]
  );

  return (
    <div className="min-h-screen bg-slate-50/70 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 md:text-3xl">Review & Rating</h1>
          <p className="mt-1 text-sm text-slate-500">
            Lihat penilaian dan komentar pencari kos yang bookingnya telah selesai.
          </p>
        </div>

        <Pesan pesan={pesan} onTutup={() => setPesan(null)} />

        {!memuat && daftarKos.length === 0 ? (
          <Kosong judul="Belum ada kos" deskripsi="Buat kos terlebih dahulu di menu Kos Saya." />
        ) : (
          <>
            <label className="block rounded-3xl border border-slate-200 bg-white p-5">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Pilih kos
              </span>
              <select
                value={kosId}
                onChange={(e) => {
                  setKosId(e.target.value);
                  setHalaman(1);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
              >
                <option value="">-- Pilih kos --</option>
                {daftarKos.map((k) => (
                  <option key={k.kos_id} value={k.kos_id}>
                    {k.nama_kos}
                    {k.status_verifikasi !== 'Aktif' ? ' (belum aktif)' : ''}
                  </option>
                ))}
              </select>
            </label>

            {kosId && (
              <section className="space-y-5">
                <div className="flex flex-wrap items-center gap-6 rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="text-center">
                    <p className="text-4xl font-extrabold text-slate-900">
                      {review.rata != null ? Number(review.rata).toFixed(1) : '-'}
                    </p>
                    <Bintang nilai={Math.round(review.rata || 0)} />
                    <p className="mt-1 text-xs text-slate-500">{review.jumlah} ulasan</p>
                  </div>
                  <div className="min-w-0 flex-1 border-l border-slate-100 pl-6">
                    <h2 className="text-lg font-extrabold text-slate-900">
                      {kosTerpilih?.nama_kos || '-'}
                    </h2>
                    <p className="text-sm text-slate-500">
                      Rating rata-rata dihitung dari seluruh review kos ini.
                    </p>
                  </div>
                </div>

                {memuat ? (
                  <p className="py-12 text-center text-slate-500">Memuat review…</p>
                ) : review.data.length === 0 ? (
                  <Kosong
                    judul="Belum ada review"
                    deskripsi="Review muncul setelah pencari kos menyelesaikan bookingnya."
                  />
                ) : (
                  <div className="space-y-3">
                    {review.data.map((r) => (
                      <article
                        key={r.review_id}
                        className="rounded-2xl border border-slate-200 bg-white p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                              {(r.pemberi_review || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {r.pemberi_review || 'Pencari kos'}
                              </p>
                              <p className="text-xs text-slate-500">
                                Kamar {r.kamar || '-'} ·{' '}
                                {r.dibuat_pada
                                  ? new Date(r.dibuat_pada).toLocaleDateString('id-ID')
                                  : '-'}
                              </p>
                            </div>
                          </div>
                          <Bintang nilai={r.rating} kecil />
                        </div>
                        {r.komentar ? (
                          <p className="mt-4 text-sm leading-relaxed text-slate-700">"{r.komentar}"</p>
                        ) : (
                          <p className="mt-4 inline-flex items-center gap-2 text-xs italic text-slate-400">
                            <StarOff className="h-3.5 w-3.5" /> Tidak ada komentar
                          </p>
                        )}
                      </article>
                    ))}

                    {review.totalHalaman > 1 && (
                      <div className="flex items-center justify-center gap-4 pt-2">
                        <button
                          onClick={() => setHalaman((h) => Math.max(1, h - 1))}
                          disabled={halaman <= 1}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
                        >
                          Sebelumnya
                        </button>
                        <span className="text-sm font-semibold text-slate-600">
                          Halaman {halaman} / {review.totalHalaman}
                        </span>
                        <button
                          onClick={() =>
                            setHalaman((h) => Math.min(review.totalHalaman || BATAL, h + 1))
                          }
                          disabled={halaman >= (review.totalHalaman || BATAL)}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-40"
                        >
                          Berikutnya
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
