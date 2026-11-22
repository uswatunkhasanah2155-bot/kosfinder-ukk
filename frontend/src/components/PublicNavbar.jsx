// src/components/PublicNavbar.jsx  (dipakai Landing dan KosDetail)
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MENU = [['kos', 'Cari Kos'], ['cara', 'Cara Sewa'], ['faq', 'FAQ'], ['pemilik', 'Untuk Pemilik']];

export default function PublicNavbar() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Di landing: gulir langsung. Di halaman lain: pindah ke "/" membawa tujuan scroll lewat state (URL tetap bersih, tanpa #)
  const keSection = (id) => {
    if (pathname === '/') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    else navigate('/', { state: { scrollTo: id } });
  };

  return (
    <header className="sticky top-0 z-1100 bg-emerald-900 text-white">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-6 px-4 md:px-8">
        <Link to="/" className="mr-auto flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-lg font-extrabold">K</span>
          <span className="text-xl font-extrabold tracking-tight">Kos-Finder</span>
        </Link>
        <nav className="hidden items-center gap-8 text-base font-semibold lg:flex">
          {MENU.map(([id, label]) => (
            <button key={id} type="button" onClick={() => keSection(id)} className="text-emerald-100 hover:text-white">{label}</button>
          ))}
        </nav>
        {user ? (
          <Link to={`/${String(user.role).toLowerCase()}`} className="rounded-xl bg-white px-5 py-2.5 text-base font-bold text-emerald-900 hover:bg-emerald-50">Dasbor</Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-xl px-4 py-2.5 text-base font-semibold hover:bg-white/10">Masuk</Link>
            <Link to="/register" className="rounded-xl bg-white px-5 py-2.5 text-base font-bold text-emerald-900 hover:bg-emerald-50">Daftar</Link>
          </div>
        )}
      </div>
    </header>
  );
}