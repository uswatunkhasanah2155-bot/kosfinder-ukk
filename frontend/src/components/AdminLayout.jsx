import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const menuAdmin = [
  { label: 'Dashboard', to: '/admin', end: true },
  { label: 'Verifikasi Owner', to: '/admin/verifikasi-owner' },
  { label: 'Master Fasilitas', to: '/admin/fasilitas' },
  { label: 'Laporan & Export', to: '/admin/laporan' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#f6f8f6] font-['Plus_Jakarta_Sans',system-ui,sans-serif] text-[#12302e]">
      {/* NAVBAR */}
      <header className="sticky top-0 z-30 border-b border-[#0a4341] bg-[#0d5a57] text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          {/* Brand & Menu */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 font-extrabold text-[#f0b429]">
                K
              </span>
              <div>
                <p className="text-base font-extrabold leading-none tracking-tight">
                  Kos-Finder
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-white/70">
                  Panel Admin
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-1">
              {menuAdmin.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-white text-[#0d5a57] shadow-sm'
                        : 'text-white/85 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Profil & Keluar */}
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden font-medium text-white/90 sm:inline">
              {user?.nama}
            </span>
            <button
              onClick={logout}
              className="cursor-pointer rounded-lg border border-white/20 bg-white/10 px-3.5 py-1.5 font-semibold text-white transition hover:bg-white/20"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* KONTEN HALAMAN */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}