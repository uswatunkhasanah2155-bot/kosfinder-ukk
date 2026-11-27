// src/pages/user/KosDetail.jsx  -> rute publik /kos/:id (tanpa login)
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // wajib: tanpa ini peta tidak bisa digeser/di-zoom dengan benar
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Images, Info, Lock, LogIn, MapPin, Star, UserPlus, X } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/authHooks';
import PublicNavbar from '../../components/PublicNavbar';
import FotoKos from '../../components/FotoKos';
import { normalisasi, rupiah, fotoUrl } from '../../utils/kos';

const pin = (tersedia) =>
  L.divIcon({
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<div style="width:30px;height:30px;border-radius:50%;border:4px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);background:${tersedia ? '#059669' : '#94a3b8'}"></div>`,
  });

const kartu = 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8';
const ULASAN_PER_HALAMAN = 5;

function Bintang({ nilai, ukuran = 'h-5 w-5' }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Rating ${nilai} dari 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${ukuran} ${n <= Math.round(nilai) ? 'fill-emerald-600 text-emerald-600' : 'text-slate-300'}`} />
      ))}
    </span>
  );
}

export default function KosDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kos, setKos] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [i, setI] = useState(0); // indeks foto yang aktif di lightbox
  const [lightbox, setLightbox] = useState(false);
  const [notice, setNotice] = useState(null); // pemberitahuan login (inline, bukan pop-up)
  const [ulasan, setUlasan] = useState({ rata: null, jumlah: 0, data: [], halaman: 1 });
  const [memuatUlasan, setMemuatUlasan] = useState(false);
  const noticeRef = useRef(null);

  // GET /api/kos/:id (publik). Jika belum ada, cari dari GET /api/kos.
  useEffect(() => {
    let batal = false;
    setMemuat(true); setI(0); setNotice(null); setLightbox(false);
    window.scrollTo(0, 0);
    api.get(`/kos/${id}`)
      .then((res) => normalisasi(res.data.data ?? res.data))
      .catch(() => api.get('/kos').then((res) => (res.data.data ?? res.data).map(normalisasi).find((k) => String(k.id) === String(id))))
      .then((d) => { if (!batal) setKos(d ?? null); })
      .catch(() => { if (!batal) setKos(null); })
      .finally(() => { if (!batal) setMemuat(false); });
    return () => { batal = true; };
  }, [id]);

  // GET /api/kos/:id/review (publik): rata-rata rating + daftar ulasan
  useEffect(() => {
    let batal = false;
    setUlasan({ rata: null, jumlah: 0, data: [], halaman: 1 });
    api.get(`/kos/${id}/review`, { params: { page: 1, limit: ULASAN_PER_HALAMAN } })
      .then((res) => { if (!batal) setUlasan({ rata: res.data.rata_rating, jumlah: res.data.jumlah_review, data: res.data.data, halaman: 1 }); })
      .catch(() => {});
    return () => { batal = true; };
  }, [id]);

  const ulasanLagi = async () => {
    setMemuatUlasan(true);
    try {
      const res = await api.get(`/kos/${id}/review`, { params: { page: ulasan.halaman + 1, limit: ULASAN_PER_HALAMAN } });
      setUlasan((s) => ({ ...s, data: [...s.data, ...res.data.data], halaman: s.halaman + 1 }));
    } catch { /* abaikan, tombol bisa ditekan lagi */ } finally { setMemuatUlasan(false); }
  };

  useEffect(() => { document.title = kos ? `${kos.nama} – Kos-Finder` : 'Kos-Finder'; }, [kos]);

  const n = kos?.fotos.length ?? 0;

  // Lightbox: panah kiri/kanan untuk pindah foto, Escape untuk menutup, scroll halaman dikunci
  useEffect(() => {
    if (!lightbox) return undefined;
    const tombol = (e) => {
      if (e.key === 'Escape') setLightbox(false);
      if (n > 1 && e.key === 'ArrowRight') setI((v) => (v + 1) % n);
      if (n > 1 && e.key === 'ArrowLeft') setI((v) => (v - 1 + n) % n);
    };
    document.addEventListener('keydown', tombol);
    const lama = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tombol);
      document.body.style.overflow = lama;
    };
  }, [lightbox, n]);

  useEffect(() => { if (notice) noticeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [notice]);

  // Melihat halaman ini bebas tanpa login; mengajukan sewa wajib login
  const ajukan = (kamarId) => {
    const tujuan = `/user?kos=${kos.id}${kamarId ? `&kamar=${kamarId}` : ''}`;
    if (!user) return setNotice({ jenis: 'login', tujuan });
    if (String(user.role).toLowerCase() !== 'user') return setNotice({ jenis: 'role' });
    return navigate(tujuan);
  };
  const keAuth = (path) => navigate(path, { state: { from: notice.tujuan, kosNama: kos.nama } });

  const adaMap = kos && Number.isFinite(kos.lat) && Number.isFinite(kos.lng);

  // Galeri: maksimal 3 foto di grid. 3+ foto = 1 besar kiri + 2 bertumpuk kanan
  const bukaFoto = (idx) => { setI(idx); setLightbox(true); };
  const tampil = n ? kos.fotos.slice(0, 3) : [null];
  const tataLetak = tampil.length >= 3 ? 'grid-cols-[2fr_1fr] grid-rows-2' : tampil.length === 2 ? 'grid-cols-2' : 'grid-cols-1';
  const petak = (f, idx, lebar, cls = '') => (
    <button
      key={idx}
      type="button"
      onClick={() => n && bukaFoto(idx)}
      aria-label={`Buka foto ${idx + 1}`}
      className={`group relative min-h-0 overflow-hidden bg-slate-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-emerald-600/40 ${cls}`}
    >
      <FotoKos src={fotoUrl(f, lebar)} alt={`${kos.nama} foto ${idx + 1}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicNavbar />

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <Link to="/" state={{ scrollTo: 'kos' }} className="inline-flex items-center gap-2 text-base font-semibold text-emerald-800 hover:underline">
          <ArrowLeft className="h-5 w-5" /> Kembali ke daftar kos
        </Link>

        {memuat && (
          <div className="mt-8 animate-pulse space-y-6" aria-busy="true">
            <div className="h-10 w-2/3 rounded-xl bg-slate-200" />
            <div className="h-112 rounded-3xl bg-slate-200" />
          </div>
        )}

        {!memuat && !kos && (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-2xl font-extrabold">Kos tidak ditemukan</p>
            <p className="mt-2 text-lg text-slate-600">Kos ini mungkin sudah tidak aktif atau alamatnya salah.</p>
            <Link to="/" state={{ scrollTo: 'kos' }} className="mt-6 inline-flex rounded-xl bg-emerald-600 px-6 py-3 text-base font-bold text-white hover:bg-emerald-700">Lihat semua kos</Link>
          </div>
        )}

        {kos && (
          <>
            {/* HEADER */}
            <header className="mt-6">
              <div className="flex flex-wrap gap-2 text-sm font-semibold">
                <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-slate-700">{kos.tipe}</span>
                <span className={`rounded-full px-3 py-1 text-white ${kos.kosong > 0 ? 'bg-emerald-600' : 'bg-slate-700'}`}>{kos.kosong > 0 ? `${kos.kosong} kamar kosong` : 'Penuh'}</span>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-5xl">{kos.nama}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-lg text-slate-600">
                <span className="flex items-center gap-1.5"><MapPin className="h-5 w-5" /> {kos.kota}{kos.alamat ? ` · ${kos.alamat}` : ''}</span>
                {kos.rating && <span className="flex items-center gap-1.5 font-bold text-slate-800"><Star className="h-5 w-5 fill-emerald-600 text-emerald-600" /> {kos.rating.toFixed(1)}{kos.jumlahReview > 0 && <span className="font-medium text-slate-500">({kos.jumlahReview} ulasan)</span>}</span>}
              </div>
            </header>

            {/* GALERI 3 FOTO (lebar penuh, di bawah header) */}
            <section aria-label="Foto kos" className="relative mt-8">
              <div className={`grid h-72 gap-2 overflow-hidden rounded-3xl md:h-112 ${tataLetak}`}>
                {petak(tampil[0], 0, tampil.length >= 3 ? 1200 : 1000, tampil.length >= 3 ? 'row-span-2' : '')}
                {tampil[1] !== undefined && petak(tampil[1], 1, 700)}
                {tampil[2] !== undefined && petak(tampil[2], 2, 700)}
              </div>
              {n > 1 && (
                <button
                  type="button"
                  onClick={() => bukaFoto(0)}
                  className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-base font-bold text-slate-900 shadow transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30"
                >
                  <Images className="h-5 w-5" /> Lihat semua foto ({n})
                </button>
              )}
            </section>

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-8">
                {/* FASILITAS */}
                {kos.fasilitas.length > 0 && (
                  <section className={kartu}>
                    <h2 className="text-2xl font-extrabold">Fasilitas</h2>
                    <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {kos.fasilitas.map((x) => (
                        <li key={x} className="flex items-center gap-3 text-lg text-slate-700"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="h-5 w-5" /></span>{x}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* KAMAR */}
                <section className={kartu}>
                  <h2 className="text-2xl font-extrabold">Daftar kamar</h2>
                  {kos.kamar.length === 0 ? (
                    <p className="mt-4 text-lg text-slate-600">Pemilik belum menambahkan data kamar.</p>
                  ) : (
                    <ul className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                      {kos.kamar.map((m) => (
                        <li key={m.id ?? m.no} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                          <span className="text-lg"><b>Kamar {m.no}</b> <span className="text-slate-500">· {m.tipe}</span></span>
                          <span className="flex flex-wrap items-center gap-4">
                            <span className="text-lg font-extrabold">{rupiah(m.harga)}<small className="text-sm font-medium text-slate-500"> /bulan</small></span>
                            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${m.status === 'Kosong' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{m.status}</span>
                            {m.status === 'Kosong' && (
                              <button onClick={() => ajukan(m.id)} className="rounded-xl bg-emerald-600 px-4 py-2 text-base font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30">Ajukan</button>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* LOKASI */}
                {adaMap && (
                  <section className={kartu}>
                    <h2 className="text-2xl font-extrabold">Lokasi</h2>
                    {kos.alamat && <p className="mt-2 text-lg text-slate-600">{kos.alamat}</p>}
                    <div className="relative z-0 mt-5 h-80 overflow-hidden rounded-2xl border border-slate-200">
                      <MapContainer center={[kos.lat, kos.lng]} zoom={16} scrollWheelZoom={false} className="h-full w-full">
                        <TileLayer attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[kos.lat, kos.lng]} icon={pin(kos.kosong > 0)} />
                      </MapContainer>
                    </div>
                  </section>
                )}

                {/* ULASAN */}
                <section className={kartu} aria-labelledby="judul-ulasan">
                  <h2 id="judul-ulasan" className="text-2xl font-extrabold">Ulasan penghuni</h2>
                  {ulasan.jumlah === 0 ? (
                    <p className="mt-4 text-lg text-slate-600">Belum ada ulasan. Ulasan muncul setelah penyewa menyelesaikan booking.</p>
                  ) : (
                    <>
                      <div className="mt-4 flex items-center gap-4">
                        <span className="text-5xl font-extrabold">{Number(ulasan.rata).toFixed(1)}</span>
                        <div>
                          <Bintang nilai={ulasan.rata} />
                          <p className="mt-1 text-base text-slate-600">dari {ulasan.jumlah} ulasan</p>
                        </div>
                      </div>
                      <ul className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                        {ulasan.data.map((r) => (
                          <li key={r.review_id} className="px-5 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-base font-bold">{r.pemberi_review ?? 'Pengguna'}{r.kamar ? <span className="font-medium text-slate-500"> · Kamar {r.kamar}</span> : null}</span>
                              <span className="text-sm text-slate-500">{new Date(r.dibuat_pada).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            </div>
                            <div className="mt-1"><Bintang nilai={r.rating} ukuran="h-4 w-4" /></div>
                            {r.komentar && <p className="mt-2 text-base leading-relaxed text-slate-700">{r.komentar}</p>}
                          </li>
                        ))}
                      </ul>
                      {ulasan.data.length < ulasan.jumlah && (
                        <button onClick={ulasanLagi} disabled={memuatUlasan} className="mt-5 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-base font-bold text-slate-800 transition hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-60">{memuatUlasan ? 'Memuat…' : 'Tampilkan lebih banyak'}</button>
                      )}
                    </>
                  )}
                </section>
              </div>

              {/* PANEL PENGAJUAN */}
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg md:p-7">
                  <p className="text-base font-medium text-slate-500">Harga mulai dari</p>
                  <p className="text-4xl font-extrabold">{kos.harga ? rupiah(kos.harga) : '-'}<span className="text-lg font-medium text-slate-500"> /bulan</span></p>
                  <p className="mt-2 text-lg text-slate-700">{kos.kosong > 0 ? `${kos.kosong} kamar masih kosong` : 'Semua kamar sedang penuh'}</p>

                  <button onClick={() => ajukan()} disabled={kos.kosong === 0} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-50">
                    {kos.kosong > 0 ? 'Ajukan sewa' : 'Kamar penuh'} <ArrowRight className="h-5 w-5" />
                  </button>

                  {notice && (
                    <div ref={noticeRef} role="alert" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><Lock className="h-5 w-5" /></span>
                        <button onClick={() => setNotice(null)} aria-label="Tutup pemberitahuan" className="rounded-lg p-1.5 text-slate-500 hover:bg-white"><X className="h-5 w-5" /></button>
                      </div>
                      {notice.jenis === 'login' ? (
                        <>
                          <p className="mt-3 text-lg font-extrabold text-slate-900">Masuk dulu untuk mengajukan sewa</p>
                          <p className="mt-1 text-base leading-relaxed text-slate-700">Masuk atau daftar sebagai pencari kos. Setelah itu kamu langsung kembali ke pengajuan {kos.nama}.</p>
                          <div className="mt-4 grid gap-2">
                            <button onClick={() => keAuth('/login')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-base font-bold text-white hover:bg-emerald-700"><LogIn className="h-5 w-5" /> Masuk</button>
                            <button onClick={() => keAuth('/register')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-bold text-slate-900 hover:border-emerald-500"><UserPlus className="h-5 w-5" /> Daftar akun baru</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="mt-3 text-lg font-extrabold text-slate-900">Khusus pencari kos</p>
                          <p className="mt-1 text-base leading-relaxed text-slate-700">Akun Anda tidak bisa mengajukan sewa. Gunakan akun Pencari Kos untuk melakukan booking.</p>
                        </>
                      )}
                    </div>
                  )}

                  <p className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600"><Info className="mt-0.5 h-4 w-4 shrink-0" /> Semua informasi di halaman ini bisa dilihat tanpa login. Login hanya dibutuhkan saat mengajukan sewa.</p>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      <footer className="mt-10 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 text-base text-slate-600 md:px-8">Kos-Finder · Aplikasi pencarian dan pemesanan kos berbasis peta</div>
      </footer>

      {/* LIGHTBOX: semua foto */}
      {lightbox && kos && n > 0 && (
        <div role="dialog" aria-modal="true" aria-label="Semua foto" className="fixed inset-0 z-2000 flex flex-col bg-slate-950/95">
          <div className="flex items-center justify-between px-4 py-3 text-white md:px-8">
            <span className="text-base font-semibold">{kos.nama} · {i + 1} / {n}</span>
            <button onClick={() => setLightbox(false)} aria-label="Tutup galeri" className="rounded-full p-2 hover:bg-white/10"><X className="h-6 w-6" /></button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 md:px-20">
            <FotoKos src={fotoUrl(kos.fotos[i])} alt={`${kos.nama} foto ${i + 1}`} className="max-h-full max-w-full rounded-xl object-contain" />
            {n > 1 && (
              <>
                <button onClick={() => setI((i - 1 + n) % n)} aria-label="Foto sebelumnya" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-3 shadow hover:bg-white"><ChevronLeft className="h-6 w-6" /></button>
                <button onClick={() => setI((i + 1) % n)} aria-label="Foto berikutnya" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-3 shadow hover:bg-white"><ChevronRight className="h-6 w-6" /></button>
              </>
            )}
          </div>

          {n > 1 && (
            <div className="flex gap-3 overflow-x-auto px-4 py-4 md:px-8">
              {kos.fotos.map((f, idx) => (
                <button key={f} onClick={() => setI(idx)} aria-label={`Lihat foto ${idx + 1}`} aria-current={idx === i} className={`h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 ${idx === i ? 'border-emerald-500' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                  <FotoKos src={fotoUrl(f, 300)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}