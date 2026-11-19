import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout, { kelas } from '../components/AuthLayout';
import { FieldForm, PasswordField } from '../components/FieldForm';
import { useAuth, homePath } from '../context/AuthContext';
import api from '../api/axios';
import {
  MAKS_EMAIL,
  MAKS_NAMA,
  MAKS_PASSWORD,
  MAKS_WA,
  bersihkanNoWa,
  pesanEmail,
  pesanNama,
  pesanNoWa,
  pesanPassword,
} from '../utils/ValidasiForm';

function PilihanPeran({ value, judul, keterangan, form, onChange }) {
  return (
    <label className="relative block">
      <input
        className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
        type="radio"
        name="role"
        value={value}
        checked={form.role === value}
        onChange={onChange}
      />
      <span className="block h-full rounded-lg border-[1.5px] border-[#cfd9d6] bg-white px-3.5 py-3 peer-checked:border-[#0d5a57] peer-checked:bg-[#e8f2f0] peer-checked:shadow-[inset_0_0_0_1px_#0d5a57] peer-focus-visible:ring-[3px] peer-focus-visible:ring-[#f0b429]">
        <strong className="block text-[0.95rem]">{judul}</strong>
        <small className="text-[#4b625f]">{keterangan}</small>
      </span>
    </label>
  );
}

// Validasi tiap kolom: mengembalikan pesan error, atau '' jika sudah benar
const cek = {
  nama: pesanNama,
  email: pesanEmail,
  password: pesanPassword,
  no_wa: pesanNoWa,
};

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ nama: '', email: '', password: '', no_wa: '', role: 'User' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [error, setError] = useState(''); // hanya untuk galat umum (mis. server tidak terhubung)
  const [mengirim, setMengirim] = useState(false);

  // Hasil pengecekan email ke server: { email, status } dengan status 'tersedia' | 'terpakai' | 'gagal'
  const [hasilEmail, setHasilEmail] = useState({ email: '', status: null });

  const emailBersih = form.email.trim().toLowerCase();
  const formatEmailBenar = pesanEmail(emailBersih) === '';
  const statusEmail = hasilEmail.email === emailBersih ? hasilEmail.status : null;
  const mengecekEmail = formatEmailBenar && statusEmail === null;
  const emailTerpakai = formatEmailBenar && statusEmail === 'terpakai';

  // Cek ketersediaan email otomatis, 0,5 detik setelah pengguna berhenti mengetik
  useEffect(() => {
    if (!formatEmailBenar) return;

    let batal = false;
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/auth/cek-email', { params: { email: emailBersih } });
        if (!batal) setHasilEmail({ email: emailBersih, status: data.tersedia ? 'tersedia' : 'terpakai' });
      } catch {
        // Gagal mengecek tidak memblokir pendaftaran: server tetap memvalidasi saat tombol ditekan
        if (!batal) setHasilEmail({ email: emailBersih, status: 'gagal' });
      }
    }, 500);

    return () => {
      batal = true;
      clearTimeout(timer);
    };
  }, [emailBersih, formatEmailBenar]);

  const ubah = (e) => {
    const { name } = e.target;
    const nilai = name === 'no_wa' ? bersihkanNoWa(e.target.value) : e.target.value;

    setForm((f) => ({ ...f, [name]: nilai }));
    // Setelah kolom pernah ditinggalkan, error ikut diperbarui saat mengetik
    if (touched[name] && cek[name]) setErrors((er) => ({ ...er, [name]: cek[name](nilai) }));
  };

  const tinggalkan = (e) => {
    const { name } = e.target;

    setTouched((t) => ({ ...t, [name]: true }));
    if (cek[name]) setErrors((er) => ({ ...er, [name]: cek[name](form[name]) }));
  };

  const kirim = async (e) => {
    e.preventDefault();
    setError('');

    const semuaError = Object.fromEntries(Object.keys(cek).map((k) => [k, cek[k](form[k])]));
    setErrors(semuaError);
    setTouched({ nama: true, email: true, password: true, no_wa: true });
    if (Object.values(semuaError).some(Boolean) || emailTerpakai) return;

    setMengirim(true);
    try {
      await register({ ...form, nama: form.nama.trim(), email: emailBersih });
    } catch (err) {
      const pesan = err.response?.data?.message;

      if (!err.response) {
        setError('Tidak bisa terhubung ke server. Pastikan backend sudah berjalan.');
      } else if (/email sudah terdaftar/i.test(pesan)) {
        setHasilEmail({ email: emailBersih, status: 'terpakai' });
      } else if (/email/i.test(pesan) && !/password|nama/i.test(pesan)) {
        setErrors((er) => ({ ...er, email: pesan }));
      } else if (/^password/i.test(pesan)) {
        setErrors((er) => ({ ...er, password: pesan }));
      } else if (/^nama/i.test(pesan)) {
        setErrors((er) => ({ ...er, nama: pesan }));
      } else if (/whatsapp/i.test(pesan)) {
        setErrors((er) => ({ ...er, no_wa: pesan }));
      } else {
        setError(pesan || 'Pendaftaran gagal. Coba lagi.');
      }
      setMengirim(false);
      return;
    }

    // Akun sudah dibuat: langsung masuk dengan data yang sama, lalu ke dashboard sesuai peran.
    // (Owner yang belum diverifikasi tetap masuk, dashboard-nya menampilkan banner menunggu verifikasi.)
    try {
      const user = await login(emailBersih, form.password);
      navigate(homePath(user.role), { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  // Pesan di bawah kolom email: "sudah terpakai" tampil begitu hasilnya diketahui
  const errorEmail = emailTerpakai ? (
    <>
      Email sudah terdaftar. Gunakan email lain atau{' '}
      <Link className={kelas.tautan} to="/login">
        masuk
      </Link>
      .
    </>
  ) : (
    errors.email
  );

  return (
    <AuthLayout judul="Buat akun" subjudul="Pilih peranmu, lalu isi data diri.">
      <form className="grid gap-4.5" onSubmit={kirim} noValidate>
        {error && <p className={kelas.galat} role="alert">{error}</p>}

        <div>
          <p className={kelas.label} id="label-peran">Saya ingin</p>
          <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-labelledby="label-peran">
            <PilihanPeran value="User" judul="Mencari kos" keterangan="Langsung bisa masuk" form={form} onChange={ubah} />
            <PilihanPeran value="Owner" judul="Memasang kos" keterangan="Diverifikasi Admin dulu" form={form} onChange={ubah} />
          </div>
        </div>

        <FieldForm
          id="nama"
          name="nama"
          label="Nama lengkap"
          type="text"
          autoComplete="name"
          maxLength={MAKS_NAMA}
          value={form.nama}
          onChange={ubah}
          onBlur={tinggalkan}
          error={errors.nama}
          valid={touched.nama && !pesanNama(form.nama)}
        />

        <FieldForm
          id="email"
          name="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={MAKS_EMAIL}
          value={form.email}
          onChange={ubah}
          onBlur={tinggalkan}
          error={errorEmail}
          valid={statusEmail === 'tersedia'}
          hint={mengecekEmail ? 'Memeriksa email…' : statusEmail === 'tersedia' ? 'Email tersedia' : undefined}
        />

        <PasswordField
          name="password"
          label="Kata sandi"
          autoComplete="new-password"
          maxLength={MAKS_PASSWORD}
          tampilSyarat
          value={form.password}
          onChange={ubah}
          onBlur={tinggalkan}
          error={errors.password}
        />

        <FieldForm
          id="no_wa"
          name="no_wa"
          label="Nomor WhatsApp (boleh dikosongkan)"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="08xx"
          maxLength={MAKS_WA}
          value={form.no_wa}
          onChange={ubah}
          onBlur={tinggalkan}
          error={errors.no_wa}
          valid={touched.no_wa && !!form.no_wa && !pesanNoWa(form.no_wa)}
        />

        <button className={kelas.tombol} type="submit" disabled={mengirim}>
          {mengirim ? 'Memproses…' : 'Buat akun'}
        </button>
      </form>

      <p className="mt-6 text-[#4b625f]">
        Sudah punya akun? <Link className={kelas.tautan} to="/login">Masuk</Link>
      </p>
    </AuthLayout>
  );
}