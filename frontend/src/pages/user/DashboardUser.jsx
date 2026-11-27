// src/pages/user/Dashboard.jsx  -> rute /user (khusus role User)
// Menerima ?kos=ID (&kamar=ID) dari tombol "Ajukan sewa" di Landing / KosDetail
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle, BedDouble, CalendarDays, CheckCircle2, ClipboardList, Download, Hourglass,
  LogOut, MapPin, Search, Star, X, XCircle,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/authHooks';
import PublicNavbar from '../../components/PublicNavbar';
import { normalisasi, rupiah } from '../../utils/kos';

const STATUS = {
  Menunggu: { gaya: 'border-amber-200 bg-amber-50 text-amber-800', ikon: Hourglass, ket: 'Menunggu persetujuan pemilik' },
  Disetujui: { gaya: 'border-emerald-200 bg-emerald-50 text-emerald-800', ikon: CheckCircle2, ket: 'Disetujui pemilik' },
  Ditolak: { gaya: 'border-red-200 bg-red-50 text-red-800', ikon: XCircle, ket: 'Ditolak pemilik' },
  Selesai: { gaya: 'border-slate-200 bg-slate-100 text-slate-700', ikon: ClipboardList, ket: 'Selesai' },
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-800 transition hover:border-emerald-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/15';
const labelClass = 'mb-2 block text-sm font-semibold text-slate-700';
const kartu = 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8';

const hariIniWib = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const tanggalId = (s) => new Date(`${s}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const labelKamar = (s) => (s === 'DalamBooking' ? 'Dalam booking' : s);
const pesanError = (e, cadangan) => e.response?.data?.message || cadangan;

function Bintang({ nilai, ukuran = 'h-5 w-5' }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Rating ${nilai} dari 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${ukuran} ${n <= nilai ? 'fill-emerald-600 text-emerald-600' : 'text-slate-300'}`} />
      ))}
    </span>
  );
}

/* ---------- modal beri review ---------- */
function ModalReview({ booking, onClose, onSelesai }) {
  const [rating, setRating] = useState(0);
  const [komentar, setKomentar] = useState('');
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState('');

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    const lama = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = lama; };
  }, [onClose]);

  const simpan = async () => {
    if (!rating) return setGalat('Pilih rating 1 sampai 5 bintang.');
    setKirim(true); setGalat('');
    try {
      await api.post(`/booking/${booking.booking_id}/review`, { rating, komentar: komentar.trim() || undefined });
      onSelesai();
    } catch (e) {
      setGalat(pesanError(e, 'Review belum bisa dikirim. Coba lagi.'));
      setKirim(false);
    }
  };

  return (
    <div className="fixed inset-0 z-2000 flex items-end justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="judul-review" className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <button onClick={onClose} aria-label="Tutup" className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        <h2 id="judul-review" className="text-2xl font-extrabold tracking-tight">Beri review</h2>
        <p className="mt-1 text-base text-slate-600">{booking.kos.nama_kos} · Kamar {booking.kamar.no_kamar}</p>

        <div className="mt-6" role="radiogroup" aria-label="Rating">
          <span className={labelClass}>Rating</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} bintang`} onClick={() => setRating(n)} className="rounded-lg p-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30">
                <Star className={`h-9 w-9 transition ${n <= rating ? 'fill-emerald-600 text-emerald-600' : 'text-slate-300 hover:text-emerald-400'}`} />
              </button>
            ))}
          </div>
        </div>

        <label className="mt-5 block">
          <span className={labelClass}>Komentar (opsional)</span>
          <textarea value={komentar} onChange={(e) => setKomentar(e.target.value)} maxLength={500} rows={4} placeholder="Ceritakan pengalamanmu tinggal di sini" className={inputClass} />
          <span className="mt-1 block text-right text-sm text-slate-500">{komentar.length}/500</span>
        </label>

        {galat && <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-base font-semibold text-red-800"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /> {galat}</p>}

        <div className="mt-6 grid gap-3">
          <button onClick={simpan} disabled={kirim} className="rounded-xl bg-emerald-600 px-5 py-3.5 text-base font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30 disabled:opacity-60">{kirim ? 'Mengirim…' : 'Kirim review'}</button>
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-base font-semibold text-slate-600 hover:text-slate-900">Batal</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- halaman ---------- */
export default function Dashboard() {
  const auth = useAuth();
  const { user } = auth;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const kosId = params.get('kos');
  const kamarParam = params.get('kamar');

  const [kos, setKos] = useState(null);
  const [memuatKos, setMemuatKos] = useState(false);
  const [kosGagal, setKosGagal] = useState(false);
  const [form, setForm] = useState({ kamarId: '', jenis: 'Survey', tanggal: '', durasi: 1 });
  const [mengirim, setMengirim] = useState(false);
  const [pesan, setPesan] = useState(null); // { tipe: 'sukses' | 'galat', teks }

  const [daftar, setDaftar] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [gagal, setGagal] = useState(false);
  const [filter, setFilter] = useState('');
  const [reviewBooking, setReviewBooking] = useState(null);

  const keluar = () => {
    if (typeof auth.logout === 'function') auth.logout();
    else { localStorage.removeItem('token'); localStorage.removeItem('user'); }
    window.location.href = '/login';
  };

  const muatRiwayat = useCallback(() => {
    setGagal(false);
    return api.get('/booking/saya')
      .then((res) => setDaftar(res.data.data ?? []))
      .catch(() => setGagal(true))
      .finally(() => setMemuat(false));
  }, []);
  useEffect(() => { muatRiwayat(); }, [muatRiwayat]);

  // Kos yang dipilih dari landing / halaman detail
  useEffect(() => {
    if (!kosId) { setKos(null); setKosGagal(false); return undefined; }
    let batal = false;
    setMemuatKos(true); setKosGagal(false);
    api.get(`/kos/${kosId}`)
      .then((res) => {
        if (batal) return;
        const k = normalisasi(res.data.data ?? res.data);
        setKos(k);
        const dipilih = k.kamar.find((m) => String(m.id) === String(kamarParam) && m.status !== 'Terisi');
        setForm((s) => ({ ...s, kamarId: dipilih ? String(dipilih.id) : '' }));
      })
      .catch(() => { if (!batal) { setKos(null); setKosGagal(true); } })
      .finally(() => { if (!batal) setMemuatKos(false); });
    return () => { batal = true; };
  }, [kosId, kamarParam]);

  const ubah = (nama, nilai) => setForm((s) => {
    const baru = { ...s, [nama]: nilai };
    // Sewa kamar hanya untuk kamar Kosong
    if (nama === 'jenis' && nilai === 'Kamar') {
      const m = kos?.kamar.find((x) => String(x.id) === s.kamarId);
      if (m && m.status !== 'Kosong') baru.kamarId = '';
    }
    return baru;
  });

  const kamarDipilih = kos?.kamar.find((m) => String(m.id) === form.kamarId);
  const bisaDipilih = (m) => (form.jenis === 'Kamar' ? m.status === 'Kosong' : m.status !== 'Terisi');

  const ajukan = async (e) => {
    e.preventDefault();
    if (!form.kamarId) return setPesan({ tipe: 'galat', teks: 'Pilih kamar terlebih dahulu.' });
    if (!form.tanggal) return setPesan({ tipe: 'galat', teks: 'Tentukan tanggal terlebih dahulu.' });
    setMengirim(true); setPesan(null);
    try {
      const res = await api.post('/booking', {
        kamar_id: Number(form.kamarId),
        jenis_booking: form.jenis,
        tanggal_survey: form.tanggal,
        ...(form.jenis === 'Kamar' && { durasi_bulan: Number(form.durasi) }),
      });
      setPesan({ tipe: 'sukses', teks: res.data.message || 'Booking berhasil diajukan.' });
      setForm((s) => ({ ...s, kamarId: '', tanggal: '', durasi: 1 }));
      setParams({}, { replace: true }); // form pengajuan ditutup
      setFilter('');
      await muatRiwayat();
      document.getElementById('riwayat')?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      setPesan({ tipe: 'galat', teks: pesanError(err, 'Booking belum bisa diajukan. Coba lagi.') });
    } finally {
      setMengirim(false);
    }
  };

  const unduhBukti = async (b) => {
    try {
      const res = await api.get(`/booking/${b.booking_id}/bukti`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `bukti-${b.kode_booking}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      setPesan({ tipe: 'galat', teks: 'Bukti konfirmasi belum bisa diunduh.' });
    }
  };

  const hitung = useMemo(() => {
    const h = { Menunggu: 0, Disetujui: 0, Ditolak: 0, Selesai: 0 };
    daftar.forEach((b) => { h[b.status_booking] += 1; });
    return h;
  }, [daftar]);
  const tampil = filter ? daftar.filter((b) => b.status_booking === filter) : daftar;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicNavbar />

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
        {/* SAPAAN */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-emerald-800">Dasbor pencari kos</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Halo, {user?.nama || 'Pencari Kos'}</h1>
            <p className="mt-2 text-lg text-slate-600">Ajukan survei atau sewa, lalu pantau statusnya di sini.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/', { state: { scrollTo: 'kos' } })} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-bold text-slate-800 transition hover:border-emerald-500 hover:bg-emerald-50"><Search className="h-5 w-5" /> Cari kos</button>
            <button onClick={keluar} className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-base font-bold text-slate-600 transition hover:bg-white hover:text-slate-900"><LogOut className="h-5 w-5" /> Keluar</button>
          </div>
        </div>

        {/* PESAN */}
        {pesan && (
          <div role={pesan.tipe === 'galat' ? 'alert' : 'status'} className={`mt-6 flex items-start justify-between gap-3 rounded-2xl border p-4 text-base font-semibold ${pesan.tipe === 'galat' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            <span className="flex items-start gap-2">{pesan.tipe === 'galat' ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />} {pesan.teks}</span>
            <button onClick={() => setPesan(null)} aria-label="Tutup pesan" className="rounded-lg p-1 hover:bg-white/70"><X className="h-5 w-5" /></button>
          </div>
        )}

        {/* RINGKASAN */}
        <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Object.entries(STATUS).map(([nama, s]) => { const Ikon = s.ikon; return (
            <div key={nama} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${s.gaya}`}><Ikon className="h-5 w-5" /></span>
              <dt className="mt-3 text-3xl font-extrabold">{hitung[nama]}</dt>
              <dd className="text-base text-slate-600">{nama}</dd>
            </div>); })}
        </dl>

        {/* FORM PENGAJUAN */}
        <section className={`${kartu} mt-8`} aria-labelledby="judul-ajukan">
          <h2 id="judul-ajukan" className="text-2xl font-extrabold">Ajukan booking</h2>

          {!kosId && (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <BedDouble className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-3 text-lg font-bold">Belum ada kos yang dipilih</p>
              <p className="mt-1 text-base text-slate-600">Pilih kos dan kamar dari daftar, lalu tekan Ajukan sewa.</p>
              <button onClick={() => navigate('/', { state: { scrollTo: 'kos' } })} className="mt-5 rounded-xl bg-emerald-600 px-6 py-3 text-base font-bold text-white hover:bg-emerald-700">Jelajahi kos</button>
            </div>
          )}

          {kosId && memuatKos && <div className="mt-5 h-48 animate-pulse rounded-2xl bg-slate-100" aria-busy="true" />}

          {kosId && !memuatKos && kosGagal && (
            <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-base font-semibold text-red-800">Kos tidak ditemukan atau sudah tidak aktif.</p>
          )}

          {kosId && !memuatKos && kos && (
            <form onSubmit={ajukan} className="mt-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-extrabold">{kos.nama}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-base text-slate-600"><MapPin className="h-4 w-4" /> {kos.kota}{kos.alamat ? ` · ${kos.alamat}` : ''}</p>
                </div>
                <button type="button" onClick={() => setParams({}, { replace: true })} className="rounded-xl px-4 py-2 text-base font-semibold text-slate-600 hover:bg-slate-100">Batalkan pilihan</button>
              </div>

              <div className="mt-6 grid gap-8 lg:grid-cols-2">
                <fieldset>
                  <legend className={labelClass}>1. Jenis booking</legend>
                  <div className="grid grid-cols-2 gap-3">
                    {[['Survey', 'Survei dulu', 'Lihat kamar langsung'], ['Kamar', 'Sewa kamar', 'Pesan untuk ditempati']].map(([nilai, judul, ket]) => (
                      <label key={nilai} className={`cursor-pointer rounded-2xl border-2 p-4 transition ${form.jenis === nilai ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300'}`}>
                        <input type="radio" name="jenis" value={nilai} checked={form.jenis === nilai} onChange={() => ubah('jenis', nilai)} className="sr-only" />
                        <span className="block text-base font-extrabold">{judul}</span>
                        <span className="block text-sm text-slate-600">{ket}</span>
                      </label>
                    ))}
                  </div>

                  <legend className={`${labelClass} mt-6`}>2. Pilih kamar</legend>
                  {kos.kamar.length === 0 ? (
                    <p className="text-base text-slate-600">Pemilik belum menambahkan kamar.</p>
                  ) : (
                    <ul className="space-y-2">
                      {kos.kamar.map((m) => { const boleh = bisaDipilih(m); return (
                        <li key={m.id}>
                          <label className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 transition ${String(m.id) === form.kamarId ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white'} ${boleh ? 'cursor-pointer hover:border-emerald-300' : 'cursor-not-allowed opacity-50'}`}>
                            <span className="flex items-center gap-3">
                              <input type="radio" name="kamar" value={m.id} disabled={!boleh} checked={String(m.id) === form.kamarId} onChange={() => ubah('kamarId', String(m.id))} className="h-5 w-5 accent-emerald-600" />
                              <span className="text-base"><b>Kamar {m.no}</b> <span className="text-slate-500">· {m.tipe}</span></span>
                            </span>
                            <span className="text-right">
                              <span className="block text-base font-extrabold">{rupiah(m.harga)}<small className="text-sm font-medium text-slate-500">/bln</small></span>
                              <span className="block text-sm text-slate-500">{labelKamar(m.status)}</span>
                            </span>
                          </label>
                        </li>); })}
                    </ul>
                  )}
                </fieldset>

                <div>
                  <span className={labelClass}>3. Tanggal dan durasi</span>
                  <label className="block">
                    <span className="mb-1 block text-base font-semibold text-slate-800">{form.jenis === 'Kamar' ? 'Tanggal mulai sewa' : 'Tanggal survei'}</span>
                    <input type="date" min={hariIniWib()} value={form.tanggal} onChange={(e) => ubah('tanggal', e.target.value)} className={inputClass} required />
                  </label>

                  {form.jenis === 'Kamar' && (
                    <label className="mt-4 block">
                      <span className="mb-1 block text-base font-semibold text-slate-800">Durasi sewa</span>
                      <select value={form.durasi} onChange={(e) => ubah('durasi', e.target.value)} className={inputClass}>
                        {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} bulan</option>)}
                      </select>
                    </label>
                  )}

                  <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-base">
                    <p className="font-extrabold">Ringkasan</p>
                    <p className="mt-2 text-slate-700">{form.jenis === 'Kamar' ? 'Sewa kamar' : 'Survei'}{kamarDipilih ? ` · Kamar ${kamarDipilih.no}` : ' · kamar belum dipilih'}</p>
                    {form.tanggal && <p className="text-slate-700">{tanggalId(form.tanggal)}</p>}
                    {form.jenis === 'Kamar' && kamarDipilih && (
                      <p className="mt-2 text-lg font-extrabold">Total {rupiah(kamarDipilih.harga * Number(form.durasi))}</p>
                    )}
                    <p className="mt-3 text-sm text-slate-500">Pengajuan tidak langsung mengunci kamar. Kamar baru terkunci setelah pemilik menyetujui.</p>
                  </div>

                  <button type="submit" disabled={mengirim} className="mt-6 w-full rounded-xl bg-emerald-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-600/30 disabled:opacity-60">{mengirim ? 'Mengirim…' : 'Kirim pengajuan'}</button>
                </div>
              </div>
            </form>
          )}
        </section>

        {/* RIWAYAT */}
        <section id="riwayat" className="mt-8 scroll-mt-24" aria-labelledby="judul-riwayat">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="judul-riwayat" className="text-2xl font-extrabold">Riwayat booking</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter status">
              {['', 'Menunggu', 'Disetujui', 'Ditolak', 'Selesai'].map((s) => (
                <button key={s || 'semua'} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)} className={`rounded-full border px-4 py-1.5 text-base font-semibold transition ${filter === s ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-500'}`}>{s || 'Semua'}</button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {memuat && <div className="h-40 animate-pulse rounded-3xl bg-slate-200" aria-busy="true" />}
            {!memuat && gagal && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-base font-semibold text-red-800">Riwayat belum bisa dimuat. <button onClick={muatRiwayat} className="underline">Coba lagi</button></p>}
            {!memuat && !gagal && !tampil.length && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-3 text-lg font-bold">{filter ? `Tidak ada booking ${filter}` : 'Belum ada booking'}</p>
                <p className="mt-1 text-base text-slate-600">Pengajuan yang kamu buat akan muncul di sini.</p>
              </div>
            )}

            {tampil.map((b) => {
              const s = STATUS[b.status_booking]; const Ikon = s.ikon; const sewa = b.jenis_booking === 'Kamar';
              return (
                <article key={b.booking_id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold tracking-wider text-slate-500">{b.kode_booking}</p>
                      <h3 className="mt-1 text-xl font-extrabold"><Link to={`/kos/${b.kos.kos_id}`} className="hover:text-emerald-800">{b.kos.nama_kos}</Link></h3>
                      <p className="mt-1 flex items-center gap-1.5 text-base text-slate-600"><MapPin className="h-4 w-4 shrink-0" /> {b.kos.kota}{b.kos.alamat ? ` · ${b.kos.alamat}` : ''}</p>
                    </div>
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-bold ${s.gaya}`}><Ikon className="h-4 w-4" /> {b.status_booking}</span>
                  </div>

                  <dl className="mt-5 grid gap-4 text-base sm:grid-cols-2 lg:grid-cols-4">
                    <div><dt className="text-sm text-slate-500">Kamar</dt><dd className="font-bold">No. {b.kamar.no_kamar} · {b.kamar.tipe_kamar}</dd></div>
                    <div><dt className="text-sm text-slate-500">Jenis</dt><dd className="font-bold">{sewa ? 'Sewa kamar' : 'Survei'}</dd></div>
                    <div><dt className="text-sm text-slate-500">{sewa ? 'Mulai sewa' : 'Tanggal survei'}</dt><dd className="font-bold">{tanggalId(b.tanggal_survey)}</dd></div>
                    {sewa && <div><dt className="text-sm text-slate-500">Total ({b.durasi_bulan} bulan)</dt><dd className="font-bold">{rupiah(b.total_biaya)}</dd></div>}
                  </dl>

                  <p className="mt-4 text-sm text-slate-500">{s.ket}</p>

                  {b.sudah_review && b.review && (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center gap-3"><Bintang nilai={b.review.rating} ukuran="h-4 w-4" /><span className="text-sm font-semibold text-slate-600">Review kamu</span></div>
                      {b.review.komentar && <p className="mt-2 text-base text-slate-700">{b.review.komentar}</p>}
                    </div>
                  )}

                  {(['Disetujui', 'Selesai'].includes(b.status_booking) || (b.status_booking === 'Selesai' && !b.sudah_review)) && (
                    <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                      {['Disetujui', 'Selesai'].includes(b.status_booking) && (
                        <button onClick={() => unduhBukti(b)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base font-bold text-slate-800 transition hover:border-emerald-500 hover:bg-emerald-50"><Download className="h-5 w-5" /> Unduh bukti</button>
                      )}
                      {b.status_booking === 'Selesai' && !b.sudah_review && (
                        <button onClick={() => setReviewBooking(b)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-base font-bold text-white transition hover:bg-emerald-700"><Star className="h-5 w-5" /> Beri review</button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="mt-10 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 text-base text-slate-600 md:px-8">Kos-Finder · Aplikasi pencarian dan pemesanan kos berbasis peta</div>
      </footer>

      {reviewBooking && (
        <ModalReview
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSelesai={() => { setReviewBooking(null); setPesan({ tipe: 'sukses', teks: 'Terima kasih, review berhasil dikirim.' }); muatRiwayat(); }}
        />
      )}
    </div>
  );
}