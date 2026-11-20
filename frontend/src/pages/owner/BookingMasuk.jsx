import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Download, MessageCircle } from 'lucide-react';
import api from '../../api/axios';
import { HalamanOwner, Notif, GalatBox, DataKosong, Badge } from '../../components/owner/Ui';
import {
  kelasInput,
  kelasSelect,
  rupiah,
  formatTanggal,
  formatWaktu,
  linkWa,
  pesanGalat,
  unduhFile,
} from '../../utils/ownerHelper';

// GET   /api/owner/booking                 semua booking di kos milik Owner
// PATCH /api/booking/:id/setujui           Menunggu -> Disetujui
// PATCH /api/booking/:id/tolak             Menunggu -> Ditolak
// PATCH /api/booking/:id/selesai           Disetujui -> Selesai
// GET   /api/booking/:id/bukti             bukti konfirmasi (PDF), untuk Disetujui / Selesai

const TAB = ['Semua', 'Menunggu', 'Disetujui', 'Selesai', 'Ditolak'];
const WARNA_STATUS = { Menunggu: 'kuning', Disetujui: 'hijau', Selesai: 'biru', Ditolak: 'merah' };

const tombolKecil =
  'rounded-xl px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50';

export default function BookingMasuk() {
  const [data, setData] = useState([]);
  const [daftarKos, setDaftarKos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pesan, setPesan] = useState('');
  const [errorAksi, setErrorAksi] = useState('');
  const [prosesId, setProsesId] = useState(null);

  const [tab, setTab] = useState('Menunggu');
  const [kosId, setKosId] = useState('');
  const [cari, setCari] = useState('');

  const muatData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/owner/booking');
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data booking');
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

  const hitungTab = useMemo(() => {
    const hasil = { Semua: data.length };
    TAB.slice(1).forEach((t) => {
      hasil[t] = data.filter((b) => b.status_booking === t).length;
    });
    return hasil;
  }, [data]);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return data.filter(
      (b) =>
        (tab === 'Semua' || b.status_booking === tab) &&
        (!kosId || b.kos.kos_id === Number(kosId)) &&
        (!q || b.pemesan.nama.toLowerCase().includes(q) || b.kode_booking.toLowerCase().includes(q))
    );
  }, [data, tab, kosId, cari]);

  const proses = async (b, aksi) => {
    setProsesId(b.booking_id);
    setErrorAksi('');
    try {
      const res = await api.patch(`/booking/${b.booking_id}/${aksi}`);
      setPesan(res.data.message);
      await muatData();
    } catch (err) {
      setErrorAksi(err.response?.data?.message || 'Gagal memproses booking');
    } finally {
      setProsesId(null);
    }
  };

  const unduhBukti = async (b) => {
    setProsesId(b.booking_id);
    setErrorAksi('');
    try {
      await unduhFile(`/booking/${b.booking_id}/bukti`, {}, `bukti-${b.kode_booking}.pdf`);
    } catch (err) {
      setErrorAksi(await pesanGalat(err, 'Gagal mengunduh bukti konfirmasi'));
    } finally {
      setProsesId(null);
    }
  };

  return (
    <HalamanOwner
      label="Transaksi"
      judul="Booking Masuk"
      deskripsi="Pengajuan survey dan sewa kamar dari pencari kos. Setujui atau tolak, lalu tandai selesai setelah masanya berakhir."
    >
      <Notif pesan={pesan} onTutup={() => setPesan('')} />
      <GalatBox pesan={error} onCoba={muatData} />
      <GalatBox pesan={errorAksi} onTutup={() => setErrorAksi('')} />

      {/* TAB STATUS */}
      <div className="flex flex-wrap gap-2">
        {TAB.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
              tab === t
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-500'
            }`}
          >
            {t} <span className={tab === t ? 'text-emerald-100' : 'text-slate-400'}>({hitungTab[t]})</span>
          </button>
        ))}
      </div>

      {/* PENCARIAN & FILTER KOS */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama pemesan atau kode booking"
            className={`${kelasInput} py-3.5 pl-12`}
          />
        </div>
        <select
          value={kosId}
          onChange={(e) => setKosId(e.target.value)}
          className={`${kelasSelect} sm:w-64`}
          aria-label="Filter kos"
        >
          <option value="">Semua kos</option>
          {daftarKos.map((k) => (
            <option key={k.kos_id} value={k.kos_id}>
              {k.nama_kos}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      )}

      {/* DAFTAR BOOKING */}
      {!loading && (
        <div className="space-y-4">
          {tampil.map((b) => {
            const sibuk = prosesId === b.booking_id;
            const wa = linkWa(b.pemesan.no_wa);
            const jenisKamar = b.jenis_booking === 'Kamar';
            return (
              <div
                key={b.booking_id}
                className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <p className="text-lg font-extrabold text-slate-900">{b.pemesan.nama}</p>
                    <Badge warna={WARNA_STATUS[b.status_booking]}>{b.status_booking}</Badge>
                    <Badge warna={jenisKamar ? 'hijau' : 'abu'}>{b.jenis_booking}</Badge>
                  </div>

                  <p className="text-base text-slate-700">
                    {b.kos.nama_kos}, kamar <strong>{b.kamar.no_kamar}</strong> ({b.kamar.tipe_kamar}) -{' '}
                    {jenisKamar
                      ? `sewa ${b.durasi_bulan} bulan mulai ${formatTanggal(b.tanggal_survey)}`
                      : `survey ${formatTanggal(b.tanggal_survey)}`}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500">
                    <span className="font-semibold">{b.kode_booking}</span>
                    <span>Diajukan {formatWaktu(b.dibuat_pada)}</span>
                    {jenisKamar && (
                      <span className="font-bold text-slate-800">Total {rupiah(b.total_biaya)}</span>
                    )}
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:underline"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {b.pemesan.no_wa}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {b.status_booking === 'Menunggu' && (
                    <>
                      <button
                        onClick={() => proses(b, 'tolak')}
                        disabled={sibuk}
                        className={`${tombolKecil} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                      >
                        Tolak
                      </button>
                      <button
                        onClick={() => proses(b, 'setujui')}
                        disabled={sibuk}
                        className={`${tombolKecil} bg-emerald-600 text-white hover:bg-emerald-700`}
                      >
                        Setujui
                      </button>
                    </>
                  )}

                  {b.status_booking === 'Disetujui' && (
                    <button
                      onClick={() => proses(b, 'selesai')}
                      disabled={sibuk}
                      className={`${tombolKecil} border border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50`}
                    >
                      Tandai selesai
                    </button>
                  )}

                  {['Disetujui', 'Selesai'].includes(b.status_booking) && (
                    <button
                      onClick={() => unduhBukti(b)}
                      disabled={sibuk}
                      className={`${tombolKecil} inline-flex items-center gap-1.5 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                    >
                      <Download className="h-4 w-4" />
                      Bukti PDF
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {!error && tampil.length === 0 && (
            <DataKosong
              judul={data.length === 0 ? 'Belum ada booking' : 'Tidak ada booking yang cocok'}
              deskripsi={
                data.length === 0
                  ? 'Pengajuan dari pencari kos akan muncul di sini.'
                  : 'Coba ganti tab status, kos, atau kata kunci.'
              }
            />
          )}
        </div>
      )}
    </HalamanOwner>
  );
}