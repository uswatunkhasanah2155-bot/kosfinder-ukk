import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout, { kelas } from '../components/AuthLayout';
import { FieldForm, PasswordField } from '../components/FieldForm';
import { useAuth, homePath } from '../context/AuthContext';
import { MAKS_EMAIL, MAKS_PASSWORD, pesanEmail, pesanPasswordLogin } from '../utils/ValidasiForm';

// Validasi tiap kolom: mengembalikan pesan error, atau '' jika sudah benar
const cek = {
  email: pesanEmail,
  password: pesanPasswordLogin,
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [mengirim, setMengirim] = useState(false);

  const ubah = (e) => {
    const { name, value } = e.target;

    setForm((f) => ({ ...f, [name]: value }));
    setError(''); // pesan "email atau password salah" hilang begitu pengguna mengetik lagi
    if (touched[name]) setErrors((er) => ({ ...er, [name]: cek[name](value) }));
  };

  const tinggalkan = (e) => {
    const { name } = e.target;

    setTouched((t) => ({ ...t, [name]: true }));
    setErrors((er) => ({ ...er, [name]: cek[name](form[name]) }));
  };

  const kirim = async (e) => {
    e.preventDefault();
    setError('');

    const semuaError = Object.fromEntries(Object.keys(cek).map((k) => [k, cek[k](form[k])]));
    setErrors(semuaError);
    setTouched({ email: true, password: true });
    if (Object.values(semuaError).some(Boolean)) return;

    setMengirim(true);
    try {
      const user = await login(form.email.trim(), form.password);
      navigate(location.state?.dari?.pathname || homePath(user.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Tidak bisa terhubung ke server. Pastikan backend sudah berjalan.');
    } finally {
      setMengirim(false);
    }
  };

  return (
    <AuthLayout judul="Masuk" subjudul="Masuk untuk mencari kos, mengelola kos, atau memverifikasi pemilik.">
      <form className="grid gap-4.5" onSubmit={kirim} noValidate>
        {error && <p className={kelas.galat} role="alert">{error}</p>}

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
          error={errors.email}
        />

        <PasswordField
          name="password"
          label="Kata sandi"
          autoComplete="current-password"
          maxLength={MAKS_PASSWORD}
          value={form.password}
          onChange={ubah}
          onBlur={tinggalkan}
          error={errors.password}
        />

        <button className={kelas.tombol} type="submit" disabled={mengirim}>
          {mengirim ? 'Memproses…' : 'Masuk'}
        </button>
      </form>

      <p className="mt-6 text-[#4b625f]">
        Belum punya akun? <Link className={kelas.tautan} to="/register">Daftar</Link>
      </p>
    </AuthLayout>
  );
}