import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Pencil, Trash2, Plus } from 'lucide-react';
import api from '../../api/axios';
import { HalamanOwner, Notif, GalatBox, Modal, DataKosong, Badge } from '../../components/owner/Ui';
import {
  kelasInput,
  kelasSelect,
  tombolUtama,
  tombolBiasa,
  tombolBahaya,
  rupiah,
  labelStatusKamar,
} from '../../utils/ownerHelper';

// GET    /api/kos/saya                 kos beserta daftar kamarnya
// POST   /api/kos/:kosId/kamar         { no_kamar, tipe_kamar, harga, status_kamar? }
// PUT    /api/kamar/:id                ubah sebagian atau seluruh field
// DELETE /api/kamar/:id                ditolak jika sudah punya riwayat booking
// Status kamar yang boleh diatur manual hanya Kosong atau Terisi.
// "DalamBooking" diatur otomatis oleh alur booking.

const WARNA_STATUS = { Kosong: 'hijau', DalamBooking: 'kuning', Terisi: 'abu' };
const formKosong = { no_kamar: '', tipe_kamar: '', harga: '', status_kamar: 'Kosong' };

export default function Kamar() {
  const [params, setParams] = useSearchParams();
  const [daftarKos, setDaftarKos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pesan, setPesan] = useState('');

  const [modal, setModal] = useState(null); // null | { mode: 'tambah' } | { mode: 'edit', item }
  const [form, setForm] = useState(formKosong);
  const [menyimpan, setMenyimpan] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  const [hapus, setHapus] = useState(null);
  const [menghapus, setMenghapus] = useState(false);
  const [errorHapus, setErrorHapus] = useState('');

  const muatData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/kos/saya');
      setDaftarKos(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data kamar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muatData();
  }, [muatData]);

  // Kos yang dipilih: dari ?kos=ID di alamat, kalau tidak ada pakai kos pertama
  const kosId = Number(params.get('kos'));
  const kos = daftarKos.find((k) => k.kos_id === kosId) || daftarKos[0];
  const kamar = kos?.kamar || [];

  const hitung = (s) => kamar.filter((m) => m.status_kamar === s).length;

  const bukaTambah = () => {
    setForm(formKosong);
    setErrorForm('');
    setModal({ mode: 'tambah' });
  };

  const bukaEdit = (item) => {
    setForm({
      no_kamar: item.no_kamar,
      tipe_kamar: item.tipe_kamar,
      harga: String(item.harga),
      status_kamar: item.status_kamar,
    });
    setErrorForm('');
    setModal({ mode: 'edit', item });
  };

  const tutupModal = () => {
    if (!menyimpan) setModal(null);
  };

  const ubahField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const simpan = async () => {
    const harga = Number(form.harga);
    if (!form.no_kamar.trim()) return setErrorForm('Nomor kamar wajib diisi');
    if (form.no_kamar.trim().length > 20) return setErrorForm('Nomor kamar maksimal 20 karakter');
    if (!form.tipe_kamar.trim()) return setErrorForm('Tipe kamar wajib diisi');
    if (form.tipe_kamar.trim().length > 50) return setErrorForm('Tipe kamar maksimal 50 karakter');
    if (form.harga === '' || !Number.isInteger(harga) || harga <= 0) {
      return setErrorForm('Harga harus bilangan bulat lebih dari 0 (per bulan)');
    }

    const payload = {
      no_kamar: form.no_kamar.trim(),
      tipe_kamar: form.tipe_kamar.trim(),
      harga,
    };
    // Status "DalamBooking" tidak boleh dikirim, diatur otomatis oleh sistem
    if (form.status_kamar !== 'DalamBooking') payload.status_kamar = form.status_kamar;

    setMenyimpan(true);
    setErrorForm('');
    try {
      const res =
        modal.mode === 'edit'
          ? await api.put(`/kamar/${modal.item.kamar_id}`, payload)
          : await api.post(`/kos/${kos.kos_id}/kamar`, payload);

      setModal(null);
      setPesan(res.data.message);
      muatData();
    } catch (err) {
      setErrorForm(err.response?.data?.message || 'Gagal menyimpan kamar');
    } finally {
      setMenyimpan(false);
    }
  };

  const konfirmasiHapus = async () => {
    setMenghapus(true);
    setErrorHapus('');
    try {
      const res = await api.delete(`/kamar/${hapus.kamar_id}`);
      setPesan(res.data.message);
      setHapus(null);
      muatData();
    } catch (err) {
      setErrorHapus(err.response?.data?.message || 'Gagal menghapus kamar');
    } finally {
      setMenghapus(false);
    }
  };

  const dalamBooking = modal?.mode === 'edit' && modal.item.status_kamar === 'DalamBooking';

  return (
    <HalamanOwner
      label="Kelola Properti"
      judul="Kamar"
      deskripsi="Atur kamar di setiap kos: nomor, tipe, harga sewa per bulan, dan status ketersediaannya."
      aksi={
        kos && (
          <button onClick={bukaTambah} className={`${tombolUtama} self-start py-3.5 text-base sm:self-auto`}>
            <Plus className="h-5 w-5" />
            Tambah Kamar
          </button>
        )
      }
    >
      <Notif pesan={pesan} onTutup={() => setPesan('')} />
      <GalatBox pesan={error} onCoba={muatData} />

      {loading && <div className="h-72 animate-pulse rounded-3xl bg-slate-200/70" />}

      {!loading && !error && !kos && (
        <DataKosong
          judul="Belum ada kos"
          deskripsi="Tambahkan kos terlebih dahulu sebelum mengelola kamar."
          aksi={
            <Link to="/owner/kos" className={tombolUtama}>
              Ke halaman Kos Saya
            </Link>
          }
        />
      )}

      {!loading && kos && (
        <>
          {/* PILIH KOS & RINGKASAN */}
          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
            <label className="block w-full lg:max-w-sm">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
                Pilih kos
              </span>
              <select
                value={kos.kos_id}
                onChange={(e) => setParams({ kos: e.target.value })}
                className={kelasSelect}
              >
                {daftarKos.map((k) => (
                  <option key={k.kos_id} value={k.kos_id}>
                    {k.nama_kos} ({k.kota})
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl bg-slate-50 px-5 py-3 text-center">
                <p className="text-xs font-bold uppercase text-slate-500">Total</p>
                <p className="text-xl font-extrabold text-slate-900">{kamar.length}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-5 py-3 text-center">
                <p className="text-xs font-bold uppercase text-emerald-700">Kosong</p>
                <p className="text-xl font-extrabold text-emerald-900">{hitung('Kosong')}</p>
              </div>
              <div className="rounded-xl bg-amber-50 px-5 py-3 text-center">
                <p className="text-xs font-bold uppercase text-amber-700">Dalam booking</p>
                <p className="text-xl font-extrabold text-amber-900">{hitung('DalamBooking')}</p>
              </div>
              <div className="rounded-xl bg-slate-100 px-5 py-3 text-center">
                <p className="text-xs font-bold uppercase text-slate-600">Terisi</p>
                <p className="text-xl font-extrabold text-slate-900">{hitung('Terisi')}</p>
              </div>
            </div>
          </div>

          {/* TABEL KAMAR */}
          {kamar.length === 0 ? (
            <DataKosong
              judul="Belum ada kamar di kos ini"
              deskripsi='Klik "Tambah Kamar". Kos baru bisa dipublikasikan setelah punya minimal satu kamar.'
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-170 text-left">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-6 py-4">No. kamar</th>
                      <th className="px-6 py-4">Tipe</th>
                      <th className="px-6 py-4">Harga / bulan</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kamar.map((m) => (
                      <tr key={m.kamar_id} className="transition hover:bg-emerald-50/40">
                        <td className="px-6 py-4 text-base font-extrabold text-slate-900">{m.no_kamar}</td>
                        <td className="px-6 py-4 text-base font-medium text-slate-700">{m.tipe_kamar}</td>
                        <td className="px-6 py-4 text-base font-bold text-slate-900">{rupiah(m.harga)}</td>
                        <td className="px-6 py-4">
                          <Badge warna={WARNA_STATUS[m.status_kamar]}>{labelStatusKamar(m.status_kamar)}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => bukaEdit(m)}
                              aria-label={`Edit kamar ${m.no_kamar}`}
                              title="Edit"
                              className="rounded-xl p-2.5 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                setErrorHapus('');
                                setHapus(m);
                              }}
                              aria-label={`Hapus kamar ${m.no_kamar}`}
                              title="Hapus"
                              className="rounded-xl p-2.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL TAMBAH / EDIT */}
      {modal && (
        <Modal judul={modal.mode === 'edit' ? 'Edit Kamar' : 'Tambah Kamar'} onTutup={tutupModal}>
          <div className="grid gap-5">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Nomor kamar</span>
              <input
                autoFocus
                name="no_kamar"
                value={form.no_kamar}
                onChange={ubahField}
                maxLength={20}
                placeholder="Contoh: A1"
                className={kelasInput}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Tipe kamar</span>
              <input
                name="tipe_kamar"
                value={form.tipe_kamar}
                onChange={ubahField}
                maxLength={50}
                list="saran-tipe-kamar"
                placeholder="Contoh: Standar, Deluxe"
                className={kelasInput}
              />
              <datalist id="saran-tipe-kamar">
                <option value="Standar" />
                <option value="Deluxe" />
                <option value="VIP" />
              </datalist>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Harga per bulan (Rp)</span>
              <input
                name="harga"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.harga}
                onChange={ubahField}
                placeholder="Contoh: 850000"
                className={kelasInput}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Status</span>
              <select
                name="status_kamar"
                value={form.status_kamar}
                onChange={ubahField}
                disabled={dalamBooking}
                className={`${kelasInput} disabled:cursor-not-allowed disabled:bg-slate-100`}
              >
                {dalamBooking ? (
                  <option value="DalamBooking">Dalam Booking (diatur otomatis)</option>
                ) : (
                  <>
                    <option value="Kosong">Kosong</option>
                    <option value="Terisi">Terisi</option>
                  </>
                )}
              </select>
              <span className="mt-1.5 block text-xs text-slate-500">
                Status Dalam Booking berubah otomatis saat Anda menyetujui booking kamar.
              </span>
            </label>
          </div>

          {errorForm && (
            <p className="mt-5 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {errorForm}
            </p>
          )}

          <div className="mt-7 flex justify-end gap-3">
            <button onClick={tutupModal} disabled={menyimpan} className={tombolBiasa}>
              Batal
            </button>
            <button onClick={simpan} disabled={menyimpan} className={tombolUtama}>
              {menyimpan ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL HAPUS */}
      {hapus && (
        <Modal judul="Hapus kamar?" onTutup={() => !menghapus && setHapus(null)}>
          <p className="text-base text-slate-700">
            Kamar <strong>{hapus.no_kamar}</strong> akan dihapus. Kamar yang sudah punya riwayat booking
            tidak bisa dihapus.
          </p>
          {errorHapus && (
            <p className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {errorHapus}
            </p>
          )}
          <div className="mt-7 flex justify-end gap-3">
            <button onClick={() => setHapus(null)} disabled={menghapus} className={tombolBiasa}>
              Batal
            </button>
            <button onClick={konfirmasiHapus} disabled={menghapus} className={tombolBahaya}>
              {menghapus ? 'Menghapus…' : 'Hapus'}
            </button>
          </div>
        </Modal>
      )}
    </HalamanOwner>
  );
}