import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout, { kelas } from '../components/AuthLayout';
import { useAuth, homePath } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [mengirim, setMengirim] = useState(false);

  const ubah = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const kirim = async (e) => {
    e.preventDefault();
    setError('');
    setMengirim(true);
    try {
      const user = await login(form.email, form.password);
      navigate(location.state?.dari?.pathname || homePath(user.role), { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Tidak bisa terhubung ke server. Pastikan backend sudah berjalan.');
    } finally {
      setMengirim(false);
    }
  };

  return (
    <AuthLayout judul="Masuk" subjudul="Masuk untuk mencari kos, mengelola kos, atau memverifikasi pemilik.">
      <form className="grid gap-[18px]" onSubmit={kirim}>
        {error && <p className={kelas.galat} role="alert">{error}</p>}

        <div>
          <label className={kelas.label} htmlFor="email">Email</label>
          <input className={kelas.input} id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={ubah} />
        </div>

        <div>
          <label className={kelas.label} htmlFor="password">Kata sandi</label>
          <input className={kelas.input} id="password" name="password" type="password" autoComplete="current-password" required value={form.password} onChange={ubah} />
        </div>

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