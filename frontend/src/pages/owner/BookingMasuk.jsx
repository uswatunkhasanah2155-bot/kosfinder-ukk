import { useCallback, useEffect, useState } from 'react';
import { Check, ClipboardList, Download, X } from 'lucide-react';
import api from '../../api/axios';
import { BadgeStatus, Konfirmasi, Kosong, Pesan } from '../../components/ui';
import { rupiah } from '../../utils/kos';

const STATUS = ['', 'Menunggu', 'Disetujui', 'Ditolak', 'Selesai'];

const tanggalPendek = (s) => {
  if (!s) return '-';
  const t = String(s).slice(0, 10);
  return `${t.slice(8, 10)}/${t.slice(5, 7)}/${t.slice(0, 4)}`;
};

const unduhFile = (blob, namaFile) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function BookingMasuk() {
  const [daftar, setDaftar] = useState([]);
  const [daftarKos, setDaftarKos] = useState([]);
  const [filter, setFilter] = useState({ status: 'Menunggu', kos_id: '' });
  const [memuat, setMemuat] = useState(true);
  const [pesan, setPesan] = useState(null);
  const [konfirmasi, setKonfirmasi] = useState(null);
  const [memproses, setMemproses] = useState(false);
  const [mengunduh, setMengunduh] = useState(null);

  const muat = useCallback(() => {
    setMemuat(true);
    const params = Object.fromEntries(Object.entries(filter).filter(([, v]) => v !== ''));
    return api
      .get('/owner/booking', { params })
      .then((res) => setDaftar(res.data.data ?? []))
      .catch(() => setPesan({ tipe: 'galat', teks: 'Gagal memuat data booking.' }))
      .finally(() => setMemuat(false));
  }, [filter]);

  useEffect(() => {
    let batal = false;
    queueMicrotask(() => {
      api
        .get('/kos/saya')
        .then((res) => {
          if (!batal) setDaftarKos(res.data.data ?? []);
        })
        .catch(() => {});
    });
    return () => {
      batal = true;
    };
  }, []);

  useEffect(() => {
    let batal = false;
    queueMicrotask(() => {
      setMemuat(true);
      const params = Object.fromEntries(Object.entries(filter).filter(([, v]) => v !== ''));
      api
        .get('/owner/booking', { params })
        .then((res) => {
          if (!batal) setDaftar(res.data.data ?? []);
        })
        .catch(() => {
          if (!batal) setPesan({ tipe: 'galat', teks: 'Gagal memuat data booking.' });
        })
        .finally(() => {
          if (!batal) setMemuat(false);
        });
    });
    return () => {
      batal = true;
    };
  }, [filter]);

  const ubah = (e) => setFilter((f) => ({ ...f, [e.target.name]: e.target.value }));

  const jalankanAksi = async () => {
    const { booking, aksi } = konfirmasi;
    setMemproses(true);
    try {
      const res = await api.patch(`/booking/${booking.booking_id}/${aksi}`);
      setPesan({ tipe: 'sukses', teks: res.data.message || 'Status booking berhasil diperbarui.' });
      setKonfirmasi(null);
      await muat();
    } catch (err) {
      setPesan({ tipe: 'galat', teks: err.response?.data?.message || 'Gagal memproses booking.' });
      setKonfirmasi(null);
    } finally {
      setMemproses(false);
    }
  };

  const unduhBukti = async (b) => {
    setMengunduh(b.booking_id);
    try {
      const res = await api.get(`/booking/${b.booking_id}/bukti`, { responseType: 'blob' });
      unduhFile(res.data, `bukti-${b.kode_booking}.pdf`);
    } catch {
      setPesan({ tipe: 'galat', teks: 'Bukti konfirmasi belum bisa diunduh.' });
    } finally {
      setMengunduh(null);
    }
  };

  const infoAksi = konfirmasi && {
    setujui: {
      judul: 'Setujui booking?',
      pesan: `Booking ${konfirmasi.booking.kode_booking} akan disetujui. Status kamar akan berubah menjadi "Dalam Booking".`,
      label: 'Setujui',
    },
    tolak: {
      judul: 'Tolak booking?',
      pesan: `Booking ${konfirmasi.booking.kode_booking} akan ditolak. Pemesan akan melihat status Ditolak.`,
      label: 'Tolak',
      berbahaya: true,
    },
    selesai: {
      judul: 'Tandai selesai?',
      pesan: `Booking ${konfirmasi.booking.kode_booking} akan ditandai Selesai dan kamar kembali menjadi Kosong.`,
      label: 'Tandai Selesai',
    },
  }[konfirmasi.aksi];

  return (
    <div className="min-h-screen bg-slate-50/70 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 md:text-3xl">Booking Masuk</h1>
          <p className="mt-1 text-sm text-slate-500">
            Periksa pengajuan survey dan sewa kamar, lalu setujui atau tolak.
          </p>
        </div>

        <Pesan pesan={pesan} onTutup={() => setPesan(null)} />

        <div className="flex flex-wrap gap-4 rounded-3xl border border-slate-200 bg-white p-5">
          <label className="min-w-45 flex-1">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Status booking
            </span>
            <select
              name="status"
              value={filter.status}
              onChange={ubah}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800"
            >
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {s || 'Semua status'}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-45 flex-1">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Kos
            </span>
            <select
              name="kos_id"
              value={filter.kos_id}
              onChange={ubah}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800"
            >
              <option value="">Semua kos</option>
              {daftarKos.map((k) => (
                <option key={k.kos_id} value={k.kos_id}>
                  {k.nama_kos}
                </option>
              ))}
            </select>
          </label>
        </div>

        {memuat ? (
          <p className="py-16 text-center text-slate-500">Memuat data booking…</p>
        ) : daftar.length === 0 ? (
          <Kosong
            judul="Tidak ada booking"
            deskripsi="Belum ada pengajuan booking yang cocok dengan filter ini."
          />
        ) : (
          <div className="space-y-4">
            {daftar.map((b) => (
              <article
                key={b.booking_id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold tracking-wide text-emerald-700">
                      {b.kode_booking}
                    </p>
                    <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                      {b.kos?.nama_kos || '-'}
                    </h2>
                    <p className="text-sm text-slate-500">
                      Kamar {b.kamar?.no_kamar || '-'} · {b.kamar?.tipe_kamar || '-'}
                    </p>
                  </div>
                  <BadgeStatus status={b.status_booking} />
                </div>

                <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">Pemesan</p>
                    <p className="font-bold text-slate-800">{b.pemesan?.nama || '-'}</p>
                    <p className="text-xs text-slate-500">{b.pemesan?.no_wa || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Jenis booking</p>
                    <p className="font-bold text-slate-800">{b.jenis_booking}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tanggal</p>
                    <p className="font-bold text-slate-800">{tanggalPendek(b.tanggal_survey)}</p>
                    {b.jenis_booking === 'Kamar' && (
                      <p className="text-xs text-slate-500">{b.durasi_bulan} bulan</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total biaya</p>
                    <p className="font-bold text-emerald-700">
                      {b.total_biaya ? rupiah(b.total_biaya) : '-'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {b.status_booking === 'Menunggu' && (
                    <>
                      <button
                        onClick={() => setKonfirmasi({ booking: b, aksi: 'setujui' })}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                      >
                        <Check className="h-4 w-4" /> Setujui
                      </button>
                      <button
                        onClick={() => setKonfirmasi({ booking: b, aksi: 'tolak' })}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100"
                      >
                        <X className="h-4 w-4" /> Tolak
                      </button>
                    </>
                  )}
                  {b.status_booking === 'Disetujui' && (
                    <button
                      onClick={() => setKonfirmasi({ booking: b, aksi: 'selesai' })}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-900"
                    >
                      <ClipboardList className="h-4 w-4" /> Tandai Selesai
                    </button>
                  )}
                  {['Disetujui', 'Selesai'].includes(b.status_booking) && (
                    <button
                      onClick={() => unduhBukti(b)}
                      disabled={mengunduh === b.booking_id}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      {mengunduh === b.booking_id ? 'Mengunduh…' : 'Unduh bukti'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {konfirmasi && infoAksi && (
        <Konfirmasi
          judul={infoAksi.judul}
          pesan={infoAksi.pesan}
          onBatal={() => setKonfirmasi(null)}
          onYa={jalankanAksi}
          memproses={memproses}
          berbahaya={infoAksi.berbahaya}
          labelYa={infoAksi.label}
        />
      )}
    </div>
  );
}
