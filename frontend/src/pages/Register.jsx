import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout, { kelas } from '../components/AuthLayout';
import { useAuth, homePath } from '../context/AuthContext';

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

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ nama: '', email: '', password: '', no_wa: '', role: 'User' });
  const [error, setError] = useState('');
  const [mengirim, setMengirim] = useState(false);

  const ubah = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const kirim = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    setMengirim(true);
    try {
      await register(form);
    } catch (err) {
      setError(err.response?.data?.message || 'Tidak bisa terhubung ke server. Pastikan backend sudah berjalan.');
      setMengirim(false);
      return;
    }

    // Akun sudah dibuat: langsung masuk dengan data yang sama, lalu ke dashboard sesuai peran.
    // (Owner yang belum diverifikasi tetap masuk, dashboard-nya menampilkan banner menunggu verifikasi.)
    try {
      const user = await login(form.email, form.password);
      navigate(homePath(user.role), { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  return (
    <AuthLayout judul="Buat akun" subjudul="Pilih peranmu, lalu isi data diri.">
      <form className="grid gap-4.5" onSubmit={kirim}>
        {error && <p className={kelas.galat} role="alert">{error}</p>}

        <div>
          <p className={kelas.label} id="label-peran">Saya ingin</p>
          <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-labelledby="label-peran">
            <PilihanPeran value="User" judul="Mencari kos" keterangan="Langsung bisa masuk" form={form} onChange={ubah} />
            <PilihanPeran value="Owner" judul="Memasang kos" keterangan="Diverifikasi Admin dulu" form={form} onChange={ubah} />
          </div>
        </div>

        <div>
          <label className={kelas.label} htmlFor="nama">Nama lengkap</label>
          <input className={kelas.input} id="nama" name="nama" type="text" autoComplete="name" required value={form.nama} onChange={ubah} />
        </div>

        <div>
          <label className={kelas.label} htmlFor="email">Email</label>
          <input className={kelas.input} id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={ubah} />
        </div>

        <div>
          <label className={kelas.label} htmlFor="password">Kata sandi</label>
          <input className={kelas.input} id="password" name="password" type="password" autoComplete="new-password" minLength={6} required value={form.password} onChange={ubah} />
          <p className="mt-1.5 text-sm text-[#4b625f]">Minimal 6 karakter.</p>
        </div>

        <div>
          <label className={kelas.label} htmlFor="no_wa">Nomor WhatsApp (boleh dikosongkan)</label>
          <input className={kelas.input} id="no_wa" name="no_wa" type="tel" autoComplete="tel" value={form.no_wa} onChange={ubah} />
        </div>

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