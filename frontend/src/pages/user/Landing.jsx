// src/pages/user/Landing.jsx  -> rute publik "/"
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MapPin, Search, Star, Building2, CalendarCheck, ClipboardCheck, ArrowRight, BedDouble,
  Lock, X, LogIn, UserPlus, ShieldCheck, Wallet, MapPinned, ChevronDown, Check, LocateFixed, Images,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import PublicNavbar from '../../components/PublicNavbar';
import FotoKos from '../../components/FotoKos';
import PetaKos from '../../components/map/PetaKos';
import { normalisasi, rupiah, fotoUrl, fmtJarak } from '../../utils/kos';

// Data publik (tanpa login): GET /api/kos  dan  GET /api/wilayah

// jarak Haversine (km) antara dua titik [lat, lng]
const jarakKm = (a, b) => {
  const rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

const URUTAN = {
  murah: (a, b) => a.harga - b.harga,
  mahal: (a, b) => b.harga - a.harga,
  rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
  dekat: (a, b) => (a.jarak ?? Infinity) - (b.jarak ?? Infinity),
};

const selectClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-800 transition hover:border-emerald-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/15 disabled:cursor-not-allowed disabled:opacity-50';
const labelClass = 'mb-2 block text-sm font-semibold text-slate-700';

const LANGKAH = [
  { ikon: Search, judul: 'Cari di peta', teks: 'Lihat kos di sekitar kampus atau tempat kerjamu. Marker hijau berarti masih ada kamar kosong.' },
  { ikon: CalendarCheck, judul: 'Masuk dan ajukan sewa', teks: 'Akun hanya dibutuhkan saat mengajukan. Pilih kamar, lalu tentukan tanggal survei.' },
  { ikon: ClipboardCheck, judul: 'Tunggu persetujuan', teks: 'Pemilik kos menyetujui pengajuanmu. Statusnya bisa dipantau dari dasbor.' },
];
const KEUNGGULAN = [
  { ikon: MapPinned, judul: 'Lokasi jelas di peta', teks: 'Setiap kos punya titik koordinat, jadi jarak ke kampus atau kantor terlihat langsung.' },
  { ikon: ShieldCheck, judul: 'Pemilik terverifikasi', teks: 'Admin memeriksa akun pemilik sebelum kosnya tampil di pencarian.' },
  { ikon: Wallet, judul: 'Harga transparan', teks: 'Harga per bulan dan status tiap kamar ditampilkan apa adanya.' },
];
const FAQ = [
  ['Apakah saya harus login untuk melihat kos?', 'Tidak. Peta, foto, daftar kos, harga, dan ketersediaan kamar bisa dilihat siapa saja. Login hanya diminta saat kamu menekan Ajukan sewa.'],
  ['Bagaimana setelah saya mengajukan sewa?', 'Pengajuan masuk ke pemilik kos dengan status Menunggu. Setelah disetujui atau ditolak, statusnya berubah di dasbormu.'],
  ['Apa yang dimaksud marker hijau dan abu-abu?', 'Hijau berarti masih ada kamar kosong. Abu-abu berarti semua kamar sedang penuh atau dalam proses booking.'],
  ['Saya pemilik kos, bagaimana cara mendaftar?', 'Daftar sebagai pemilik, lalu tunggu verifikasi dari admin. Setelah terverifikasi kamu bisa menambahkan kos dan menerima pengajuan.'],
];

/* ---------- pemberitahuan wajib login (hanya saat menekan "Ajukan sewa") ---------- */
function LoginPrompt({ kos, onClose, onMasuk, onDaftar }) {
  useEffect(() => {
    const tutupEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', tutupEsc);
    const awal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', tutupEsc); document.body.style.overflow = awal; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-2000 flex items-end justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="judul-login" className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <button onClick={onClose} aria-label="Tutup" className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Lock className="h-8 w-8" strokeWidth={1.8} /></span>
        <h2 id="judul-login" className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">Masuk dulu untuk mengajukan sewa</h2>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          Kamu sedang melihat <strong className="text-slate-900">{kos.nama}</strong>. Masuk atau daftar sebagai pencari kos untuk melanjutkan. Setelah itu kamu langsung kembali ke pengajuan kos ini.
        </p>
        <div className="mt-7 grid gap-3">
          <button autoFocus onClick={onMasuk} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-base font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30"><LogIn className="h-5 w-5" /> Masuk</button>
          <button onClick={onDaftar} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-base font-bold text-slate-900 transition hover:border-emerald-500 hover:bg-emerald-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/25"><UserPlus className="h-5 w-5" /> Daftar akun baru</button>
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-base font-semibold text-slate-600 hover:text-slate-900">Nanti saja</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- halaman ---------- */
export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state, hash } = useLocation();
  const [kos, setKos] = useState([]);
  const [wilayah, setWilayah] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [gagal, setGagal] = useState(false);
  const [aktif, setAktif] = useState(null);
  const [perluLogin, setPerluLogin] = useState(null);
  const [acuan, setAcuan] = useState(null);
  const [fokus, setFokus] = useState(null);
  const [f, setF] = useState({ kota: '', tipe: '', harga: 0, radius: 0, fasilitas: [], tersedia: false, urut: 'murah' });

  // Gulir ke section: dari navbar/halaman detail (state.scrollTo) atau dari tautan lama berhash (#kos).
  // Setelah menggulir, state dan hash dihapus dari URL sehingga address bar kembali bersih ("/")
  useEffect(() => {
    const id = state?.scrollTo || hash.slice(1);
    if (!id) return undefined;
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      navigate('/', { replace: true, state: null });
    }, 50);
    return () => clearTimeout(t);
  }, [state, hash, navigate]);

  useEffect(() => {
    api.get('/kos')
      .then((res) => {
        const data = (res.data.data ?? res.data).map(normalisasi);
        setKos(data);
        const titik = data.filter((k) => Number.isFinite(k.lat) && Number.isFinite(k.lng));
        if (titik.length) {
          setFokus({ pos: [titik.reduce((n, k) => n + k.lat, 0) / titik.length, titik.reduce((n, k) => n + k.lng, 0) / titik.length], zoom: 12 });
        }
      })
      .catch(() => setGagal(true))
      .finally(() => setMemuat(false));
    api.get('/wilayah').then((res) => setWilayah(res.data.data)).catch(() => setWilayah([]));
  }, []);

  const ubah = (e) => {
    const { name, value } = e.target;
    setF((s) => ({ ...s, [name]: ['harga', 'radius'].includes(name) ? Number(value) : value }));
  };
  const toggleFasilitas = (x) => setF((s) => ({ ...s, fasilitas: s.fasilitas.includes(x) ? s.fasilitas.filter((y) => y !== x) : [...s.fasilitas, x] }));
  const semuaFasilitas = useMemo(() => [...new Set(kos.flatMap((k) => k.fasilitas))].sort(), [kos]);

  const pakaiLokasi = () => {
    if (!navigator.geolocation) return alert('Browser Anda tidak mendukung geolokasi. Klik peta untuk menentukan titik acuan.');
    navigator.geolocation.getCurrentPosition(
      (p) => { const t = { lat: p.coords.latitude, lng: p.coords.longitude }; setAcuan(t); setFokus({ pos: [t.lat, t.lng], zoom: 14 }); },
      () => alert('Lokasi tidak dapat diakses. Klik peta untuk menentukan titik acuan.')
    );
  };
  const hapusAcuan = () => { setAcuan(null); setF((s) => ({ ...s, radius: 0, urut: s.urut === 'dekat' ? 'murah' : s.urut })); };

  const tampil = useMemo(
    () => kos
      .map((k) => ({ ...k, jarak: acuan ? jarakKm([acuan.lat, acuan.lng], [k.lat, k.lng]) : null }))
      .filter((k) =>
        (!f.kota || k.kota === f.kota) &&
        (!f.tipe || k.tipe === f.tipe) &&
        (!f.harga || k.harga <= f.harga) &&
        (!f.radius || (k.jarak != null && k.jarak <= f.radius)) &&
        f.fasilitas.every((x) => k.fasilitas.includes(x)) &&
        (!f.tersedia || k.kosong > 0))
      .sort(URUTAN[f.urut]),
    [kos, f, acuan]
  );
  const berpeta = tampil.filter((k) => Number.isFinite(k.lat) && Number.isFinite(k.lng));

  // Melihat kos & foto bebas tanpa login; mengajukan sewa wajib login
  const ajukan = (k) => {
    if (!user) return setPerluLogin(k);
    if (String(user.role).toLowerCase() !== 'user') return alert('Hanya akun Pencari Kos yang dapat mengajukan sewa.');
    return navigate(`/user?kos=${k.id}`);
  };
  const keAuth = (tujuan) => navigate(tujuan, { state: { from: `/user?kos=${perluLogin.id}`, kosNama: perluLogin.nama } });

  const jumlahKosong = kos.reduce((n, k) => n + k.kosong, 0);
  const berating = kos.filter((k) => k.rating);
  const ratingRata = berating.length ? (berating.reduce((n, k) => n + k.rating, 0) / berating.length).toFixed(1) : '-';

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicNavbar />

      {/* HERO */}
      <section className="relative overflow-hidden bg-emerald-900 text-white" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px)', backgroundSize: '22px 22px' }}>
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-28 pt-14 md:px-8 md:pb-32 md:pt-20 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-emerald-100"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Pencarian kos berbasis peta</span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">Temukan kos yang pas, langsung dari peta.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-emerald-100 md:text-xl">Lihat lokasi, foto, harga, dan ketersediaan kamar tanpa perlu membuat akun. Akun baru dibutuhkan saat kamu siap mengajukan sewa.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => document.getElementById('kos')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-bold text-emerald-900 transition hover:bg-emerald-50">Jelajahi kos <ArrowRight className="h-5 w-5" /></button>
              <button type="button" onClick={() => document.getElementById('cara')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center rounded-xl border border-white/30 px-7 py-3.5 text-base font-bold text-white transition hover:bg-white/10">Cara menyewa</button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-base text-emerald-100">
              {['Cari tanpa akun', 'Pemilik terverifikasi', 'Status kamar terkini'].map((t) => <li key={t} className="flex items-center gap-2"><Check className="h-5 w-5 text-emerald-400" /> {t}</li>)}
            </ul>
          </div>
          <dl className="grid grid-cols-2 gap-4">
            {[[kos.length, 'Kos terdaftar'], [wilayah.length, 'Wilayah'], [jumlahKosong, 'Kamar kosong'], [ratingRata, 'Rating rata-rata']].map(([v, l]) => (
              <div key={l} className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
                <dt className="text-4xl font-extrabold md:text-5xl">{v}</dt>
                <dd className="mt-2 text-base text-emerald-100">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* FILTER (menimpa hero) */}
      <div className="relative z-10 mx-auto -mt-14 max-w-7xl px-4 md:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block"><span className={labelClass}>Wilayah</span>
              <select name="kota" value={f.kota} onChange={ubah} className={selectClass}>
                <option value="">Semua wilayah</option>
                {wilayah.map((w) => <option key={w.kota} value={w.kota}>{w.kota}</option>)}
              </select>
            </label>
            <label className="block"><span className={labelClass}>Tipe kos</span>
              <select name="tipe" value={f.tipe} onChange={ubah} className={selectClass}>
                <option value="">Semua tipe</option><option value="Putra">Putra</option><option value="Putri">Putri</option><option value="Campur">Campur</option>
              </select>
            </label>
            <label className="block"><span className={labelClass}>Harga maksimal</span>
              <select name="harga" value={f.harga} onChange={ubah} className={selectClass}>
                <option value={0}>Semua harga</option><option value={700000}>Rp700 ribu</option><option value={1000000}>Rp1 juta</option><option value={1500000}>Rp1,5 juta</option>
              </select>
            </label>
            <label className="block"><span className={labelClass}>Radius dari titik acuan</span>
              <select name="radius" value={f.radius} onChange={ubah} disabled={!acuan} className={selectClass}>
                <option value={0}>{acuan ? 'Semua jarak' : 'Tentukan titik acuan dulu'}</option>
                <option value={1}>1 km</option><option value={2}>2 km</option><option value={3}>3 km</option><option value={5}>5 km</option>
              </select>
            </label>
          </div>
          {semuaFasilitas.length > 0 && (
            <div className="mt-5">
              <span className={labelClass}>Fasilitas</span>
              <div className="flex flex-wrap gap-2">
                {semuaFasilitas.map((x) => (
                  <button key={x} type="button" aria-pressed={f.fasilitas.includes(x)} onClick={() => toggleFasilitas(x)}
                    className={`rounded-full border px-4 py-1.5 text-base font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/25 ${f.fasilitas.includes(x) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-500'}`}>{x}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DAFTAR + PETA */}
      <section id="kos" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 md:px-8 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Kos yang tersedia</h2>
            <p className="mt-2 text-lg text-slate-600">{memuat ? 'Memuat data…' : `${tampil.length} kos sesuai filter · klik kos untuk melihat foto dan detailnya`}</p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <label className="flex cursor-pointer items-center gap-3 text-base font-semibold text-slate-700">
              <input type="checkbox" checked={f.tersedia} onChange={(e) => setF((s) => ({ ...s, tersedia: e.target.checked }))} className="h-5 w-5 rounded border-slate-300 accent-emerald-600" />
              Hanya yang ada kamar kosong
            </label>
            <select name="urut" value={f.urut} onChange={ubah} aria-label="Urutkan" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-base font-semibold text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/15">
              <option value="murah">Harga terendah</option><option value="mahal">Harga tertinggi</option><option value="rating">Rating tertinggi</option>
              {acuan && <option value="dekat">Terdekat</option>}
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base">
          <MapPin className="h-5 w-5 text-slate-700" />
          <span className="font-semibold text-slate-800">{acuan ? 'Titik acuan sudah ditentukan' : 'Klik peta untuk menentukan titik acuan (misalnya kampus), lalu atur radius.'}</span>
          <button onClick={pakaiLokasi} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800 hover:border-emerald-500 hover:bg-emerald-50"><LocateFixed className="h-5 w-5" /> Pakai lokasi saya</button>
          {acuan && <button onClick={hapusAcuan} className="rounded-xl px-4 py-2 text-base font-semibold text-slate-600 hover:bg-white hover:text-slate-900">Hapus titik acuan</button>}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5 lg:max-h-160 lg:overflow-y-auto lg:pr-2">
            {gagal && <p role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-5 text-base font-semibold text-red-800">Data kos belum bisa dimuat. Coba muat ulang halaman.</p>}
            {!memuat && !gagal && !tampil.length && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <Search className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-3 text-lg font-bold text-slate-800">Belum ada kos yang cocok</p>
                <p className="mt-1 text-base text-slate-600">Coba longgarkan harga, radius, atau fasilitas.</p>
              </div>
            )}
            {tampil.map((k) => (
              <article key={k.id} onMouseEnter={() => setAktif(k.id)} onMouseLeave={() => setAktif(null)}
                className={`flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:shadow-lg sm:flex-row ${aktif === k.id ? 'border-emerald-400' : 'border-slate-200'}`}>
                {/* klik foto/judul/tombol -> pindah ke halaman /kos/:id */}
                <Link to={`/kos/${k.id}`} aria-label={`Lihat foto dan detail ${k.nama}`} className="relative block h-52 shrink-0 bg-slate-100 sm:h-auto sm:w-56">
                  <FotoKos src={fotoUrl(k.fotos[0])} alt={k.nama} className="absolute inset-0 h-full w-full object-cover" />
                  <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-sm font-bold text-white shadow ${k.kosong > 0 ? 'bg-emerald-600' : 'bg-slate-700'}`}>{k.kosong > 0 ? `${k.kosong} kamar kosong` : 'Penuh'}</span>
                  {k.fotos.length > 1 && <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-slate-900/75 px-2.5 py-1 text-sm font-semibold text-white"><Images className="h-4 w-4" /> {k.fotos.length}</span>}
                </Link>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-extrabold leading-snug"><Link to={`/kos/${k.id}`} className="hover:text-emerald-800">{k.nama}</Link></h3>
                    {k.rating && <span className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-base font-bold text-slate-800"><Star className="h-4 w-4 fill-emerald-600 text-emerald-600" /> {k.rating.toFixed(1)}</span>}
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-base text-slate-600"><MapPin className="h-4 w-4 shrink-0" /> {k.kota}{k.alamat ? ` · ${k.alamat}` : ''}{k.jarak != null && <b className="ml-1 text-slate-800">· {fmtJarak(k.jarak)}</b>}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-slate-700">{k.tipe}</span>
                    {k.fasilitas.slice(0, 3).map((x) => <span key={x} className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{x}</span>)}
                    {k.fasilitas.length > 3 && <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">+{k.fasilitas.length - 3}</span>}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                    <p className="text-2xl font-extrabold text-slate-900">{k.harga ? rupiah(k.harga) : '-'}<span className="text-base font-medium text-slate-500"> /bulan</span></p>
                    <div className="flex gap-2">
                      <Link to={`/kos/${k.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-bold text-slate-800 transition hover:border-emerald-500 hover:bg-emerald-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/25">Lihat detail</Link>
                      <button onClick={() => ajukan(k)} disabled={k.kosong === 0} className="rounded-xl bg-emerald-600 px-5 py-3 text-base font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-50">Ajukan sewa</button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="h-105 overflow-hidden rounded-3xl border border-slate-200 shadow-sm lg:sticky lg:top-24 lg:h-160" style={{ touchAction: 'none' }}>
            <PetaKos daftar={berpeta} acuan={acuan} onPilihAcuan={setAcuan} radiusKm={f.radius} fokus={fokus} aktif={aktif} onAktif={setAktif} onAjukan={ajukan} />
          </div>
        </div>
      </section>

      {/* KEUNGGULAN */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-3 md:px-8 md:py-16">
          {KEUNGGULAN.map((x) => { const Ikon = x.ikon; return (
            <div key={x.judul} className="flex gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Ikon className="h-7 w-7" strokeWidth={1.8} /></span>
              <div><h3 className="text-xl font-extrabold">{x.judul}</h3><p className="mt-1.5 text-base leading-relaxed text-slate-600">{x.teks}</p></div>
            </div>); })}
        </div>
      </section>

      {/* CARA SEWA */}
      <section id="cara" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 md:px-8 md:py-20">
        <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Cara menyewa kos</h2>
        <p className="mt-2 max-w-2xl text-lg text-slate-600">Tiga langkah sederhana dari mencari sampai mendapat kepastian kamar.</p>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {LANGKAH.map((l, i) => { const Ikon = l.ikon; return (
            <li key={l.judul} className="rounded-3xl border border-slate-200 bg-white p-7 transition hover:border-emerald-300 hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white"><Ikon className="h-7 w-7" strokeWidth={1.8} /></span>
                <span className="text-5xl font-extrabold text-slate-200">{i + 1}</span>
              </div>
              <h3 className="mt-5 text-xl font-extrabold">{l.judul}</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-600">{l.teks}</p>
            </li>); })}
        </ol>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-14 md:py-20">
          <h2 className="text-center text-3xl font-extrabold tracking-tight md:text-4xl">Pertanyaan yang sering diajukan</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-slate-200 bg-white p-6 open:shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-slate-900 [&::-webkit-details-marker]:hidden">{q}<ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition group-open:rotate-180" /></summary>
                <p className="mt-3 text-base leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA PEMILIK */}
      <section id="pemilik" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 md:px-8 md:py-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-emerald-900 p-8 text-white md:flex-row md:items-center md:p-12">
          <div className="flex items-start gap-5">
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 sm:flex"><Building2 className="h-7 w-7" strokeWidth={1.8} /></span>
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">Punya kos? Daftarkan di Kos-Finder.</h2>
              <p className="mt-2 max-w-xl text-lg leading-relaxed text-emerald-100">Kelola kamar, terima pengajuan sewa, dan pantau okupansi dalam satu dasbor. Akun pemilik diverifikasi admin sebelum kos tampil.</p>
            </div>
          </div>
          <Link to="/register" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-bold text-emerald-900 hover:bg-emerald-50">Daftar sebagai pemilik <ArrowRight className="h-5 w-5" /></Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-base text-slate-600 md:grid-cols-[2fr_1fr_1fr] md:px-8">
          <div><span className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><BedDouble className="h-6 w-6 text-emerald-700" /> Kos-Finder</span><p className="mt-3 max-w-sm leading-relaxed">Aplikasi pencarian dan pemesanan kos berbasis peta.</p></div>
          <div><h3 className="font-bold text-slate-900">Jelajahi</h3><ul className="mt-3 space-y-2">
            <li><button type="button" onClick={() => document.getElementById('kos')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-emerald-700">Cari kos</button></li>
            <li><button type="button" onClick={() => document.getElementById('cara')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-emerald-700">Cara sewa</button></li>
            <li><button type="button" onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-emerald-700">FAQ</button></li>
          </ul></div>
          <div><h3 className="font-bold text-slate-900">Akun</h3><ul className="mt-3 space-y-2"><li><Link to="/login" className="hover:text-emerald-700">Masuk</Link></li><li><Link to="/register" className="hover:text-emerald-700">Daftar</Link></li></ul></div>
        </div>
      </footer>

      {perluLogin && <LoginPrompt kos={perluLogin} onClose={() => setPerluLogin(null)} onMasuk={() => keAuth('/login')} onDaftar={() => keAuth('/register')} />}
    </div>
  );
}