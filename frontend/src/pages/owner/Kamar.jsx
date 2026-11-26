import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BedDouble, Pencil, Plus, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import { BadgeStatus, Konfirmasi, Kosong, Modal, Pesan } from '../../components/ui';
import { rupiah } from '../../utils/kos';

const formAwal = { no_kamar: '', tipe_kamar: '', harga: '', status_kamar: 'Kosong' };

export default function Kamar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const kosId = searchParams.get('kos') || '';

  const [daftarKos, setDaftarKos] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [pesan, setPesan] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(formAwal);
  const [galatForm, setGalatForm] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapus, setHapus] = useState(null);
  const [menghapus, setMenghapus] = useState(false);

  useEffect(() => {
    let batal = false;
    queueMicrotask(() => {
      api
        .get('/kos/saya')
        .then((res) => {
          if (!batal) setDaftarKos(res.data.data ?? []);
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

  const kosTerpilih = useMemo(
    () => daftarKos.find((k) => String(k.kos_id) === String(kosId)) || null,
    [daftarKos, kosId]
  );
  const daftarKamar = kosTerpilih?.kamar || [];

  const pilihKos = (id) => setSearchParams(id ? { kos: id } : {});

  const bukaTambah = () => {
    setForm(formAwal);
    setGalatForm('');
    setModal({ mode: 'tambah' });
  };

  const bukaEdit = (kamar) => {
    setForm({
      no_kamar: kamar.no_kamar,
      tipe_kamar: kamar.tipe_kamar,
      harga: kamar.harga,
      status_kamar: kamar.status_kamar,
    });
    setGalatForm('');
    setModal({ mode: 'edit', kamar });
  };

  const ubah = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const simpan = async () => {
    if (!form.no_kamar.trim() || !form.tipe_kamar.trim()) {
      setGalatForm('Nomor kamar dan tipe kamar wajib diisi.');
      return;
    }
    const harga = Number(form.harga);
    if (!Number.isInteger(harga) || harga < 1) {
      setGalatForm('Harga harus berupa angka bulanan yang valid.');
      return;
    }

    setMenyimpan(true);
    setGalatForm('');
    try {
      const body = {
        no_kamar: form.no_kamar.trim(),
        tipe_kamar: form.tipe_kamar.trim(),
        harga,
        status_kamar: form.status_kamar,
      };
      if (modal.mode === 'edit') {
        await api.put(`/kamar/${modal.kamar.kamar_id}`, body);
        setPesan({ tipe: 'sukses', teks: 'Data kamar berhasil diperbarui.' });
      } else {
        await api.post(`/kos/${kosId}/kamar`, body);
        setPesan({ tipe: 'sukses', teks: 'Kamar berhasil ditambahkan.' });
      }
      const hasil = await api.get('/kos/saya');
      setDaftarKos(hasil.data.data ?? []);
      setModal(null);
    } catch (err) {
      setGalatForm(err.response?.data?.message || 'Gagal menyimpan data kamar.');
    } finally {
      setMenyimpan(false);
    }
  };

  const konfirmasiHapus = async () => {
    setMenghapus(true);
    try {
      await api.delete(`/kamar/${hapus.kamar_id}`);
      setPesan({ tipe: 'sukses', teks: 'Kamar berhasil dihapus.' });
      setHapus(null);
      const hasil = await api.get('/kos/saya');
      setDaftarKos(hasil.data.data ?? []);
    } catch (err) {
      setPesan({ tipe: 'galat', teks: err.response?.data?.message || 'Gagal menghapus kamar.' });
    } finally {
      setMenghapus(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 md:text-3xl">Kelola Kamar</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tambah, edit, dan hapus kamar pada tiap kos. Status kamar mengikuti booking yang masuk.
          </p>
        </div>

        <Pesan pesan={pesan} onTutup={() => setPesan(null)} />

        {memuat ? (
          <p className="py-16 text-center text-slate-500">Memuat data kos…</p>
        ) : daftarKos.length === 0 ? (
          <Kosong
            judul="Belum ada kos"
            deskripsi="Buat kos terlebih dahulu di menu Kos Saya sebelum mengelola kamar."
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {daftarKos.map((k) => (
                <button
                  key={k.kos_id}
                  onClick={() => pilihKos(k.kos_id)}
                  className={`rounded-2xl border px-5 py-3 text-sm font-bold transition ${
                    String(k.kos_id) === String(kosId)
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'
                  }`}
                >
                  {k.nama_kos}
                  <span className="ml-2 text-xs font-semibold opacity-70">
                    {k.kamar?.length || 0} kamar
                  </span>
                </button>
              ))}
            </div>

            {!kosId && (
              <Kosong judul="Pilih kos" deskripsi="Pilih salah satu kos di atas untuk melihat kamarnya." />
            )}

            {kosTerpilih && (
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-5">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">{kosTerpilih.nama_kos}</h2>
                    <p className="text-sm text-slate-500">
                      {kosTerpilih.kota} · {kosTerpilih.kamar?.length || 0} kamar terdaftar
                    </p>
                  </div>
                  <button
                    onClick={bukaTambah}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    <Plus className="h-5 w-5" /> Tambah Kamar
                  </button>
                </div>

                {daftarKamar.length === 0 ? (
                  <Kosong
                    judul="Belum ada kamar"
                    deskripsi="Tambahkan minimal satu kamar agar kos bisa dipublikasikan ke peta."
                  />
                ) : (
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-6 py-4 font-bold">No. Kamar</th>
                          <th className="px-6 py-4 font-bold">Tipe</th>
                          <th className="px-6 py-4 font-bold">Harga / bulan</th>
                          <th className="px-6 py-4 font-bold">Status</th>
                          <th className="px-6 py-4 text-right font-bold">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {daftarKamar.map((m) => (
                          <tr key={m.kamar_id} className="hover:bg-slate-50/70">
                            <td className="px-6 py-4 font-bold text-slate-800">
                              <span className="inline-flex items-center gap-2">
                                <BedDouble className="h-4 w-4 text-slate-400" />
                                {m.no_kamar}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{m.tipe_kamar}</td>
                            <td className="px-6 py-4 font-semibold text-slate-800">
                              {rupiah(m.harga)}
                            </td>
                            <td className="px-6 py-4">
                              <BadgeStatus status={m.status_kamar} />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => bukaEdit(m)}
                                  className="rounded-xl p-2.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                                  aria-label={`Edit kamar ${m.no_kamar}`}
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setHapus(m)}
                                  className="rounded-xl p-2.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                  aria-label={`Hapus kamar ${m.no_kamar}`}
                                  title="Hapus"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {modal && kosTerpilih && (
        <Modal
          judul={modal.mode === 'edit' ? 'Edit Kamar' : 'Tambah Kamar'}
          onTutup={() => setModal(null)}
          lebar="max-w-lg"
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">Nomor kamar</span>
              <input
                autoFocus
                name="no_kamar"
                value={form.no_kamar}
                onChange={ubah}
                placeholder="Contoh: 101"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">Tipe kamar</span>
              <input
                name="tipe_kamar"
                value={form.tipe_kamar}
                onChange={ubah}
                placeholder="Contoh: Standar, AC, VIP"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">Harga per bulan (Rp)</span>
              <input
                type="number"
                min="1"
                name="harga"
                value={form.harga}
                onChange={ubah}
                placeholder="1500000"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">Status kamar</span>
              <select
                name="status_kamar"
                value={form.status_kamar}
                onChange={ubah}
                disabled={modal.mode === 'edit' && modal.kamar.status_kamar === 'DalamBooking'}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none disabled:bg-slate-100"
              >
                <option value="Kosong">Kosong</option>
                <option value="Terisi">Terisi</option>
                {modal.mode === 'edit' && modal.kamar.status_kamar === 'DalamBooking' && (
                  <option value="DalamBooking">Dalam Booking</option>
                )}
              </select>
              <span className="mt-1.5 block text-xs text-slate-500">
                Status "Dalam Booking" diatur otomatis saat ada booking disetujui.
              </span>
            </label>

            {galatForm && (
              <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {galatForm}
              </p>
            )}
          </div>

          <div className="mt-7 flex justify-end gap-3">
            <button
              onClick={() => setModal(null)}
              disabled={menyimpan}
              className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              onClick={simpan}
              disabled={menyimpan}
              className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {menyimpan ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </Modal>
      )}

      {hapus && (
        <Konfirmasi
          judul="Hapus kamar?"
          pesan={`Kamar ${hapus.no_kamar} akan dihapus. Kamar yang memiliki riwayat booking tidak dapat dihapus.`}
          onBatal={() => setHapus(null)}
          onYa={konfirmasiHapus}
          memproses={menghapus}
          berbahaya
          labelYa="Hapus"
        />
      )}
    </div>
  );
}
