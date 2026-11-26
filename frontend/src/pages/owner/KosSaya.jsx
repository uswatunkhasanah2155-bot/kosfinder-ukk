import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BedDouble,
  Building2,
  Eye,
  EyeOff,
  ImagePlus,
  MapPin,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import api from '../../api/axios';
import FotoKos from '../../components/FotoKos';
import PetaLokasi from '../../components/map/PetaLokasi';
import { BadgeStatus, Konfirmasi, Kosong, Modal, Pesan } from '../../components/ui';
import { fotoUrl, rupiah } from '../../utils/kos';

const formAwal = {
  nama_kos: '',
  alamat: '',
  kota: '',
  latitude: '',
  longitude: '',
  tipe_kos: 'Putri',
  fasilitas: [],
};

export default function KosSaya() {
  const [daftar, setDaftar] = useState([]);
  const [fasilitas, setFasilitas] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [pesan, setPesan] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(formAwal);
  const [galatForm, setGalatForm] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [hapus, setHapus] = useState(null);
  const [menghapus, setMenghapus] = useState(false);
  const [fotoDipilih, setFotoDipilih] = useState([]);
  const [mengunggah, setMengunggah] = useState(false);
  const [prosesId, setProsesId] = useState(null);

  const muat = () => {
    setMemuat(true);
    return Promise.all([api.get('/kos/saya'), api.get('/fasilitas')])
      .then(([kos, fas]) => {
        setDaftar(kos.data.data ?? []);
        setFasilitas(fas.data.data ?? []);
      })
      .catch(() => setPesan({ tipe: 'galat', teks: 'Gagal memuat data kos.' }))
      .finally(() => setMemuat(false));
  };

  useEffect(() => {
    queueMicrotask(() => {
      muat();
    });
  }, []);

  const tutupModal = () => {
    setModal(null);
    setGalatForm('');
    setFotoDipilih([]);
  };

  const bukaTambah = () => {
    setForm(formAwal);
    setGalatForm('');
    setFotoDipilih([]);
    setModal({ mode: 'tambah' });
  };

  const bukaEdit = (k) => {
    setForm({
      nama_kos: k.nama_kos,
      alamat: k.alamat,
      kota: k.kota,
      latitude: k.latitude,
      longitude: k.longitude,
      tipe_kos: k.tipe_kos,
      fasilitas: (k.fasilitas || []).map((f) => f.fasilitas_id),
    });
    setGalatForm('');
    setFotoDipilih([]);
    setModal({ mode: 'edit', kos: k });
  };

  const ubah = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const pilihTitik = ({ latitude, longitude }) =>
    setForm((f) => ({
      ...f,
      latitude: Number(latitude.toFixed(7)),
      longitude: Number(longitude.toFixed(7)),
    }));

  const toggleFasilitas = (id) =>
    setForm((f) => ({
      ...f,
      fasilitas: f.fasilitas.includes(id)
        ? f.fasilitas.filter((x) => x !== id)
        : [...f.fasilitas, id],
    }));

  const simpan = async () => {
    if (!form.nama_kos.trim() || !form.alamat.trim() || !form.kota.trim()) {
      setGalatForm('Nama kos, alamat, dan kota wajib diisi.');
      return;
    }
    if (form.latitude === '' || form.longitude === '') {
      setGalatForm('Titik lokasi wajib ditentukan dengan mengklik peta.');
      return;
    }

    setMenyimpan(true);
    setGalatForm('');
    try {
      const body = {
        nama_kos: form.nama_kos.trim(),
        alamat: form.alamat.trim(),
        kota: form.kota.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        tipe_kos: form.tipe_kos,
        fasilitas: form.fasilitas,
      };
      if (modal.mode === 'edit') {
        await api.put(`/kos/${modal.kos.kos_id}`, body);
        setPesan({ tipe: 'sukses', teks: 'Data kos berhasil diperbarui.' });
      } else {
        await api.post('/kos', body);
        setPesan({
          tipe: 'sukses',
          teks: 'Kos tersimpan sebagai draf. Tambahkan kamar lalu publikasikan agar tampil di peta.',
        });
      }
      await muat();
      tutupModal();
    } catch (err) {
      setGalatForm(err.response?.data?.message || 'Gagal menyimpan data kos.');
    } finally {
      setMenyimpan(false);
    }
  };

  const konfirmasiHapus = async () => {
    setMenghapus(true);
    try {
      await api.delete(`/kos/${hapus.kos_id}`);
      setPesan({ tipe: 'sukses', teks: 'Kos berhasil dihapus.' });
      setHapus(null);
      await muat();
    } catch (err) {
      setPesan({ tipe: 'galat', teks: err.response?.data?.message || 'Gagal menghapus kos.' });
    } finally {
      setMenghapus(false);
    }
  };

  const ubahStatus = async (k, status) => {
    setProsesId(k.kos_id);
    try {
      await api.patch(`/kos/${k.kos_id}/status`, { status });
      setPesan({
        tipe: 'sukses',
        teks: status === 'Aktif' ? 'Kos berhasil dipublikasikan.' : 'Kos dinonaktifkan.',
      });
      await muat();
    } catch (err) {
      setPesan({ tipe: 'galat', teks: err.response?.data?.message || 'Gagal mengubah status kos.' });
    } finally {
      setProsesId(null);
    }
  };

  const unggahFoto = async () => {
    if (!fotoDipilih.length) return;
    setMengunggah(true);
    try {
      const body = new FormData();
      fotoDipilih.forEach((file) => body.append('foto', file));
      await api.post(`/kos/${modal.kos.kos_id}/foto`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPesan({ tipe: 'sukses', teks: 'Foto berhasil diunggah.' });
      setFotoDipilih([]);
      await muat();
      const terbaru = (await api.get('/kos/saya')).data.data?.find(
        (k) => k.kos_id === modal.kos.kos_id
      );
      if (terbaru) setModal({ mode: 'edit', kos: terbaru });
    } catch (err) {
      setPesan({ tipe: 'galat', teks: err.response?.data?.message || 'Gagal mengunggah foto.' });
    } finally {
      setMengunggah(false);
    }
  };

  const hapusFoto = async (fotoId) => {
    try {
      await api.delete(`/kos/foto/${fotoId}`);
      await muat();
      const terbaru = (await api.get('/kos/saya')).data.data?.find(
        (k) => k.kos_id === modal.kos.kos_id
      );
      if (terbaru) setModal({ mode: 'edit', kos: terbaru });
    } catch (err) {
      setPesan({ tipe: 'galat', teks: err.response?.data?.message || 'Gagal menghapus foto.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 md:text-3xl">Kos Saya</h1>
            <p className="mt-1 text-sm text-slate-500">
              Kelola data kos, titik lokasi di peta, fasilitas, dan foto.
            </p>
          </div>
          <button
            onClick={bukaTambah}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-5 w-5" /> Tambah Kos
          </button>
        </div>

        <Pesan pesan={pesan} onTutup={() => setPesan(null)} />

        {memuat ? (
          <p className="py-16 text-center text-slate-500">Memuat data kos…</p>
        ) : daftar.length === 0 ? (
          <Kosong
            judul="Belum ada kos"
            deskripsi="Klik Tambah Kos untuk membuat data kos pertama Anda."
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {daftar.map((k) => (
              <article
                key={k.kos_id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex h-44 items-center justify-center bg-slate-100">
                  {k.foto_utama ? (
                    <FotoKos src={fotoUrl(k.foto_utama, 800)} alt={k.nama_kos} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-12 w-12 text-slate-300" />
                  )}
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">{k.nama_kos}</h2>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <MapPin className="h-4 w-4" /> {k.kota} · {k.tipe_kos}
                      </p>
                    </div>
                    <BadgeStatus status={k.status_verifikasi} />
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <BedDouble className="h-4 w-4" /> {k.jumlah_kamar} kamar · {k.kamar_kosong} kosong
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Star className="h-4 w-4" /> {k.rata_rating ?? '-'} ({k.jumlah_review})
                    </span>
                  </div>
                  <p className="text-sm font-bold text-emerald-700">
                    Mulai {k.harga_mulai ? rupiah(k.harga_mulai) : '-'}
                  </p>

                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => bukaEdit(k)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                    <Link
                      to={`/owner/kamar?kos=${k.kos_id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                    >
                      <BedDouble className="h-4 w-4" /> Kamar
                    </Link>
                    <button
                      disabled={prosesId === k.kos_id}
                      onClick={() =>
                        ubahStatus(k, k.status_verifikasi === 'Aktif' ? 'Nonaktif' : 'Aktif')
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      {k.status_verifikasi === 'Aktif' ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {k.status_verifikasi === 'Aktif' ? 'Nonaktifkan' : 'Publikasikan'}
                    </button>
                    <button
                      onClick={() => setHapus(k)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" /> Hapus
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* FORM TAMBAH / EDIT KOS */}
      {modal && (
        <Modal
          judul={modal.mode === 'edit' ? 'Edit Kos' : 'Tambah Kos'}
          onTutup={tutupModal}
          lebar="max-w-4xl"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-slate-700">Nama kos</span>
                <input
                  name="nama_kos"
                  value={form.nama_kos}
                  onChange={ubah}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10"
                  placeholder="Contoh: Kos Melati Asri"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-slate-700">Alamat</span>
                <textarea
                  name="alamat"
                  value={form.alamat}
                  onChange={ubah}
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10"
                  placeholder="Alamat lengkap kos"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-slate-700">Kota</span>
                  <input
                    name="kota"
                    value={form.kota}
                    onChange={ubah}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none"
                    placeholder="Malang"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-slate-700">Tipe kos</span>
                  <select
                    name="tipe_kos"
                    value={form.tipe_kos}
                    onChange={ubah}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none"
                  >
                    {['Putri', 'Putra', 'Campur'].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <p className="mb-1.5 text-sm font-bold text-slate-700">
                  Fasilitas <span className="font-normal text-slate-400">(centang yang tersedia)</span>
                </p>
                <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {fasilitas.length === 0 && (
                    <p className="text-xs text-slate-500">Belum ada master fasilitas dari Admin.</p>
                  )}
                  {fasilitas.map((f) => (
                    <label
                      key={f.fasilitas_id}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.fasilitas.includes(f.fasilitas_id)}
                        onChange={() => toggleFasilitas(f.fasilitas_id)}
                        className="accent-emerald-600"
                      />
                      {f.nama_fasilitas}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-700">
                Titik lokasi <span className="font-normal text-slate-400">(klik peta)</span>
              </p>
              <PetaLokasi
                latitude={form.latitude}
                longitude={form.longitude}
                onPilih={pilihTitik}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  readOnly
                  value={form.latitude}
                  placeholder="Latitude"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600"
                />
                <input
                  readOnly
                  value={form.longitude}
                  placeholder="Longitude"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600"
                />
              </div>

              {modal.mode === 'edit' && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <ImagePlus className="h-4 w-4" /> Foto kos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(modal.kos.foto || []).map((f) => (
                      <div key={f.foto_id} className="group relative h-16 w-20 overflow-hidden rounded-lg">
                        <FotoKos src={fotoUrl(f.url || f.path_foto, 200)} alt="Foto kos" className="h-full w-full object-cover" />
                        <button
                          onClick={() => hapusFoto(f.foto_id)}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition group-hover:opacity-100"
                          aria-label="Hapus foto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setFotoDipilih([...e.target.files])}
                      className="text-xs text-slate-600"
                    />
                    <button
                      onClick={unggahFoto}
                      disabled={!fotoDipilih.length || mengunggah}
                      className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
                    >
                      {mengunggah ? 'Mengunggah…' : 'Unggah'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {galatForm && (
            <p className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {galatForm}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={tutupModal}
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
          judul="Hapus kos?"
          pesan={`Kos "${hapus.nama_kos}" beserta kamar dan fotonya akan dihapus. Kos yang pernah memiliki booking tidak dapat dihapus.`}
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
