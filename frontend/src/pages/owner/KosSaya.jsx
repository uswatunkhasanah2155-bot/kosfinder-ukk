import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Plus, Search, BedDouble, Star, ImagePlus, X } from 'lucide-react';
import api from '../../api/axios';
import { HalamanOwner, Notif, GalatBox, Modal, DataKosong, Badge } from '../../components/owner/Ui';
import PetaPilihLokasi from '../../components/owner/PetaPilihLokasi';
import {
  kelasInput,
  kelasSelect,
  tombolUtama,
  tombolBiasa,
  tombolBahaya,
  rupiah,
} from '../../utils/ownerHelper';

// GET    /api/kos/saya             daftar kos milik Owner (semua status)
// GET    /api/fasilitas            pilihan fasilitas
// POST   /api/kos                  tambah kos (tersimpan sebagai draf)
// PUT    /api/kos/:id              ubah kos
// PATCH  /api/kos/:id/publikasi    tayangkan di peta
// PATCH  /api/kos/:id/status       { status: 'Nonaktif' }
// DELETE /api/kos/:id              ditolak jika sudah punya riwayat booking
// POST   /api/kos/:id/foto         multipart, field "foto"
// DELETE /api/kos/foto/:fotoId

const MAKS_FOTO = 8;
const MAKS_UKURAN = 2 * 1024 * 1024; // 2MB, sama dengan batas di backend

const formKosong = {
  nama_kos: '',
  alamat: '',
  kota: '',
  tipe_kos: 'Putra',
  latitude: '',
  longitude: '',
  fasilitas: [],
};

// Status di database: Menunggu = draf (belum tayang), Aktif = tayang di peta
const LABEL_STATUS = {
  Menunggu: { teks: 'Draf', warna: 'kuning' },
  Aktif: { teks: 'Aktif', warna: 'hijau' },
  Nonaktif: { teks: 'Nonaktif', warna: 'abu' },
};

function PratinjauFoto({ file, onHapus }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-emerald-300">
      {url && <img src={url} alt="Foto baru" className="h-full w-full object-cover" />}
      <button
        type="button"
        onClick={onHapus}
        aria-label="Batalkan foto"
        className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-0.5 text-white hover:bg-slate-900"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function KosSaya() {
  const [daftar, setDaftar] = useState([]);
  const [fasilitasSemua, setFasilitasSemua] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pesan, setPesan] = useState('');
  const [errorAksi, setErrorAksi] = useState('');
  const [cari, setCari] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [prosesId, setProsesId] = useState(null);

  // modal tambah / edit: null | { mode: 'tambah' } | { mode: 'edit', item }
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(formKosong);
  const [fotoBaru, setFotoBaru] = useState([]);
  const [fotoHapus, setFotoHapus] = useState([]); // id foto lama yang akan dihapus saat simpan
  const [menyimpan, setMenyimpan] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  // konfirmasi hapus
  const [hapus, setHapus] = useState(null);
  const [menghapus, setMenghapus] = useState(false);
  const [errorHapus, setErrorHapus] = useState('');

  const muatData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/kos/saya');
      setDaftar(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data kos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muatData();
  }, [muatData]);

  useEffect(() => {
    api
      .get('/fasilitas')
      .then((res) => setFasilitasSemua(res.data.data))
      .catch(() => setFasilitasSemua([]));
  }, []);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return daftar.filter(
      (k) =>
        (!filterStatus || k.status_verifikasi === filterStatus) &&
        (!q || k.nama_kos.toLowerCase().includes(q) || k.kota.toLowerCase().includes(q))
    );
  }, [daftar, cari, filterStatus]);

  // ---------- Form tambah / edit ----------
  const bukaTambah = () => {
    setForm(formKosong);
    setFotoBaru([]);
    setFotoHapus([]);
    setErrorForm('');
    setModal({ mode: 'tambah' });
  };

  const bukaEdit = (item) => {
    setForm({
      nama_kos: item.nama_kos,
      alamat: item.alamat,
      kota: item.kota,
      tipe_kos: item.tipe_kos,
      latitude: String(item.latitude),
      longitude: String(item.longitude),
      fasilitas: item.fasilitas.map((f) => f.fasilitas_id),
    });
    setFotoBaru([]);
    setFotoHapus([]);
    setErrorForm('');
    setModal({ mode: 'edit', item });
  };

  const tutupModal = () => {
    if (!menyimpan) setModal(null);
  };

  const ubahField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const pilihTitik = (lat, lng) =>
    setForm((f) => ({ ...f, latitude: String(lat), longitude: String(lng) }));

  const toggleFasilitas = (id) =>
    setForm((f) => ({
      ...f,
      fasilitas: f.fasilitas.includes(id)
        ? f.fasilitas.filter((x) => x !== id)
        : [...f.fasilitas, id],
    }));

  const fotoLamaAktif =
    modal?.mode === 'edit' ? modal.item.foto.filter((f) => !fotoHapus.includes(f.foto_id)) : [];
  const jumlahFoto = fotoLamaAktif.length + fotoBaru.length;

  const pilihFoto = (e) => {
    const terpilih = Array.from(e.target.files || []);
    e.target.value = ''; // supaya file yang sama bisa dipilih ulang
    if (!terpilih.length) return;

    if (terpilih.some((f) => !f.type.startsWith('image/'))) {
      setErrorForm('Hanya file gambar yang diizinkan');
      return;
    }
    if (terpilih.some((f) => f.size > MAKS_UKURAN)) {
      setErrorForm('Ukuran tiap foto maksimal 2MB');
      return;
    }
    if (jumlahFoto + terpilih.length > MAKS_FOTO) {
      setErrorForm(`Maksimal ${MAKS_FOTO} foto per kos`);
      return;
    }
    setErrorForm('');
    setFotoBaru((f) => [...f, ...terpilih]);
  };

  const cekForm = () => {
    if (!form.nama_kos.trim()) return 'Nama kos wajib diisi';
    if (form.nama_kos.trim().length > 100) return 'Nama kos maksimal 100 karakter';
    if (!form.alamat.trim()) return 'Alamat wajib diisi';
    if (!form.kota.trim()) return 'Kota atau wilayah wajib diisi';
    if (form.kota.trim().length > 100) return 'Kota maksimal 100 karakter';
    if (form.latitude === '' || form.longitude === '') return 'Tandai lokasi kos dengan klik pada peta';
    return '';
  };

  const simpan = async () => {
    const salah = cekForm();
    if (salah) {
      setErrorForm(salah);
      return;
    }

    setMenyimpan(true);
    setErrorForm('');

    const payload = {
      nama_kos: form.nama_kos.trim(),
      alamat: form.alamat.trim(),
      kota: form.kota.trim(),
      tipe_kos: form.tipe_kos,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      fasilitas: form.fasilitas,
    };

    const mode = modal.mode;
    let kosId;

    try {
      if (mode === 'edit') {
        await api.put(`/kos/${modal.item.kos_id}`, payload);
        kosId = modal.item.kos_id;
      } else {
        const res = await api.post('/kos', payload);
        kosId = res.data.data.kos_id;
      }
    } catch (err) {
      setErrorForm(err.response?.data?.message || 'Gagal menyimpan kos');
      setMenyimpan(false);
      return;
    }

    // Foto diproses terpisah: kalau gagal, data kos tetap sudah tersimpan
    let peringatan = '';
    try {
      if (fotoHapus.length) {
        await Promise.all(fotoHapus.map((id) => api.delete(`/kos/foto/${id}`)));
      }
      if (fotoBaru.length) {
        const fd = new FormData();
        fotoBaru.forEach((f) => fd.append('foto', f));
        await api.post(`/kos/${kosId}/foto`, fd);
      }
    } catch (err) {
      peringatan = ` Namun foto belum berhasil diproses: ${
        err.response?.data?.message || 'terjadi kesalahan'
      }. Buka Edit untuk mencoba lagi.`;
    }

    setModal(null);
    setPesan(
      (mode === 'edit'
        ? 'Kos berhasil diperbarui.'
        : 'Kos tersimpan sebagai draf. Tambahkan kamar, lalu publikasikan agar tampil di peta.') +
        peringatan
    );
    setMenyimpan(false);
    muatData();
  };

  // ---------- Publikasi / nonaktifkan ----------
  const ubahStatus = async (k, status) => {
    setProsesId(k.kos_id);
    setErrorAksi('');
    try {
      const res =
        status === 'Aktif'
          ? await api.patch(`/kos/${k.kos_id}/publikasi`)
          : await api.patch(`/kos/${k.kos_id}/status`, { status });
      setPesan(res.data.message);
      await muatData();
    } catch (err) {
      setErrorAksi(err.response?.data?.message || 'Gagal mengubah status kos');
    } finally {
      setProsesId(null);
    }
  };

  // ---------- Hapus ----------
  const konfirmasiHapus = async () => {
    setMenghapus(true);
    setErrorHapus('');
    try {
      const res = await api.delete(`/kos/${hapus.kos_id}`);
      setPesan(res.data.message);
      setHapus(null);
      muatData();
    } catch (err) {
      setErrorHapus(err.response?.data?.message || 'Gagal menghapus kos');
    } finally {
      setMenghapus(false);
    }
  };

  return (
    <HalamanOwner
      label="Kelola Properti"
      judul="Kos Saya"
      deskripsi="Daftar kos milik Anda. Tambahkan kos, tandai lokasinya di peta, lalu publikasikan agar bisa dicari pencari kos."
      aksi={
        <button onClick={bukaTambah} className={`${tombolUtama} self-start py-3.5 text-base sm:self-auto`}>
          <Plus className="h-5 w-5" />
          Tambah Kos
        </button>
      }
    >
      <Notif pesan={pesan} onTutup={() => setPesan('')} />
      <GalatBox pesan={error} onCoba={muatData} />
      <GalatBox pesan={errorAksi} onTutup={() => setErrorAksi('')} />

      {/* PENCARIAN & FILTER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:max-w-2xl sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama kos atau kota"
              className={`${kelasInput} py-3.5 pl-12`}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`${kelasSelect} sm:w-48`}
            aria-label="Filter status"
          >
            <option value="">Semua status</option>
            <option value="Menunggu">Draf</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
          </select>
        </div>

        <p className="text-base font-semibold text-slate-700">
          {loading ? 'Memuat…' : `${tampil.length} dari ${daftar.length} kos`}
        </p>
      </div>

      {/* DAFTAR KOS */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading &&
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-96 animate-pulse rounded-3xl bg-slate-200/70" />
          ))}

        {!loading &&
          tampil.map((k) => {
            const st = LABEL_STATUS[k.status_verifikasi] || LABEL_STATUS.Menunggu;
            const sibuk = prosesId === k.kos_id;
            return (
              <div
                key={k.kos_id}
                className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-900/5"
              >
                <div className="relative h-44 bg-slate-100">
                  {k.foto_utama ? (
                    <img src={k.foto_utama} alt={k.nama_kos} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">
                      Belum ada foto
                    </div>
                  )}
                  <div className="absolute left-3 top-3 flex gap-2">
                    <Badge warna={st.warna}>{st.teks}</Badge>
                    <Badge warna="biru">{k.tipe_kos}</Badge>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg font-extrabold leading-snug text-slate-900">{k.nama_kos}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {k.alamat}, {k.kota}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-50 px-2 py-2.5">
                      <p className="text-xs font-bold uppercase text-slate-500">Mulai dari</p>
                      <p className="mt-0.5 text-sm font-extrabold text-slate-900">
                        {k.harga_mulai ? rupiah(k.harga_mulai) : '-'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-2 py-2.5">
                      <p className="text-xs font-bold uppercase text-slate-500">Kamar kosong</p>
                      <p className="mt-0.5 text-sm font-extrabold text-slate-900">
                        {k.kamar_kosong} / {k.jumlah_kamar}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-2 py-2.5">
                      <p className="text-xs font-bold uppercase text-slate-500">Rating</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-extrabold text-slate-900">
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                        {k.rata_rating === null ? '-' : String(k.rata_rating).replace('.', ',')}
                      </p>
                    </div>
                  </div>

                  {k.fasilitas.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {k.fasilitas.slice(0, 5).map((f) => (
                        <span
                          key={f.fasilitas_id}
                          className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                        >
                          {f.nama_fasilitas}
                        </span>
                      ))}
                      {k.fasilitas.length > 5 && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          +{k.fasilitas.length - 5}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <Link
                      to={`/owner/kamar?kos=${k.kos_id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      <BedDouble className="h-4 w-4" />
                      Kamar
                    </Link>

                    {k.status_verifikasi === 'Aktif' ? (
                      <button
                        onClick={() => ubahStatus(k, 'Nonaktif')}
                        disabled={sibuk}
                        className="rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        Nonaktifkan
                      </button>
                    ) : (
                      <button
                        onClick={() => ubahStatus(k, 'Aktif')}
                        disabled={sibuk}
                        className="rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {k.status_verifikasi === 'Nonaktif' ? 'Aktifkan' : 'Publikasikan'}
                      </button>
                    )}

                    <div className="ml-auto flex gap-1">
                      <button
                        onClick={() => bukaEdit(k)}
                        aria-label={`Edit ${k.nama_kos}`}
                        title="Edit"
                        className="rounded-xl p-2.5 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setErrorHapus('');
                          setHapus(k);
                        }}
                        aria-label={`Hapus ${k.nama_kos}`}
                        title="Hapus"
                        className="rounded-xl p-2.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {!loading && !error && tampil.length === 0 && (
        <DataKosong
          judul={daftar.length === 0 ? 'Belum ada kos' : 'Tidak ada kos yang cocok'}
          deskripsi={
            daftar.length === 0
              ? 'Klik "Tambah Kos" untuk mendaftarkan kos pertama Anda.'
              : 'Coba ubah kata kunci atau filter status.'
          }
        />
      )}

      {/* MODAL TAMBAH / EDIT */}
      {modal && (
        <Modal
          judul={modal.mode === 'edit' ? 'Edit Kos' : 'Tambah Kos'}
          onTutup={tutupModal}
          lebar="max-w-3xl"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">Nama kos</span>
              <input
                name="nama_kos"
                value={form.nama_kos}
                onChange={ubahField}
                maxLength={100}
                placeholder="Contoh: Kos Melati Asri"
                className={kelasInput}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">Alamat</span>
              <textarea
                name="alamat"
                value={form.alamat}
                onChange={ubahField}
                rows={2}
                placeholder="Jalan, nomor, kelurahan"
                className={kelasInput}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Kota / wilayah</span>
              <input
                name="kota"
                value={form.kota}
                onChange={ubahField}
                maxLength={100}
                placeholder="Contoh: Bandung"
                className={kelasInput}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Tipe kos</span>
              <select name="tipe_kos" value={form.tipe_kos} onChange={ubahField} className={kelasInput}>
                <option value="Putra">Putra</option>
                <option value="Putri">Putri</option>
                <option value="Campur">Campur</option>
              </select>
            </label>

            <div className="sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">Lokasi di peta</span>
              <PetaPilihLokasi
                latitude={form.latitude}
                longitude={form.longitude}
                onPilih={pilihTitik}
                alamat={form.alamat}
                kota={form.kota}
              />
            </div>

            <div className="sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">Fasilitas</span>
              {fasilitasSemua.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada fasilitas yang disediakan Admin.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {fasilitasSemua.map((f) => {
                    const aktif = form.fasilitas.includes(f.fasilitas_id);
                    return (
                      <button
                        type="button"
                        key={f.fasilitas_id}
                        onClick={() => toggleFasilitas(f.fasilitas_id)}
                        aria-pressed={aktif}
                        className={`rounded-xl border px-3.5 py-2 text-sm font-bold transition ${
                          aktif
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-500'
                        }`}
                      >
                        {f.nama_fasilitas}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Foto kos ({jumlahFoto}/{MAKS_FOTO}, maks 2MB per foto)
              </span>

              <div className="flex flex-wrap gap-3">
                {fotoLamaAktif.map((f) => (
                  <div
                    key={f.foto_id}
                    className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-300"
                  >
                    <img src={f.url} alt="Foto kos" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFotoHapus((h) => [...h, f.foto_id])}
                      aria-label="Hapus foto"
                      className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-0.5 text-white hover:bg-slate-900"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {fotoBaru.map((f, i) => (
                  <PratinjauFoto
                    key={`${f.name}-${f.size}-${i}`}
                    file={f}
                    onHapus={() => setFotoBaru((fb) => fb.filter((_, idx) => idx !== i))}
                  />
                ))}

                {jumlahFoto < MAKS_FOTO && (
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-xs font-bold text-slate-500 transition hover:border-emerald-500 hover:text-emerald-700">
                    <ImagePlus className="h-5 w-5" />
                    Tambah
                    <input type="file" accept="image/*" multiple onChange={pilihFoto} className="hidden" />
                  </label>
                )}
              </div>
            </div>
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
        <Modal judul="Hapus kos?" onTutup={() => !menghapus && setHapus(null)}>
          <p className="text-base text-slate-700">
            Kos <strong>{hapus.nama_kos}</strong> beserta kamar dan fotonya akan dihapus. Kos yang sudah
            punya riwayat booking tidak bisa dihapus, nonaktifkan saja jika tidak ingin ditampilkan lagi.
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