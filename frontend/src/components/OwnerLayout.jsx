
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  House,
  BedDouble,
  ClipboardList,
  Star,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  MapPin,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

const menuOwner = [
  { label: 'Dashboard', to: '/owner', end: true, icon: LayoutDashboard },
  { label: 'Kos Saya', to: '/owner/kos', icon: House },
  { label: 'Kamar', to: '/owner/kamar', icon: BedDouble },
  { label: 'Booking Masuk', to: '/owner/booking', icon: ClipboardList },
  { label: 'Review', to: '/owner/review', icon: Star },
  { label: 'Ekspor Data', to: '/owner/ekspor', icon: FileSpreadsheet },
];

export default function OwnerLayout() {
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const belumVerifikasi =
    user?.status_verifikasi !== 'Terverifikasi';

  return (
    <div className="flex min-h-screen bg-[#f5f7f5] font-['Plus_Jakarta_Sans',system-ui,sans-serif] text-slate-800">

      {/* OVERLAY MOBILE */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          bg-[#105b53] text-white shadow-xl
          transition-all duration-300
          lg:sticky lg:top-0 lg:h-screen lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          w-67.5
          ${sidebarCollapsed ? 'lg:w-21' : 'lg:w-67.5'}
        `}
      >

        {/* LOGO */}
        <div className={`flex h-20 items-center border-b border-white/10 px-5 ${
          sidebarCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between'
        }`}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl font-extrabold text-amber-400">
              K
            </div>

            <div className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <h1 className="text-lg font-extrabold tracking-tight">
                KosFinder
              </h1>
              <p className="text-xs text-emerald-100/70">
                Owner Dashboard
              </p>
            </div>
          </div>

          {/* TOMBOL COLLAPSE DESKTOP */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`hidden rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white lg:block ${
              sidebarCollapsed ? 'lg:hidden' : ''
            }`}
            aria-label="Tutup sidebar"
            title="Tutup sidebar"
          >
            <PanelLeftClose size={20} />
          </button>

          {/* TOMBOL TUTUP MOBILE */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"
            aria-label="Tutup sidebar"
          >
            <X size={21} />
          </button>
        </div>

        {/* TOMBOL BUKA SAAT COLLAPSE */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="hidden mx-auto mt-4 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white lg:block"
            aria-label="Buka sidebar"
            title="Buka sidebar"
          >
            <PanelLeftOpen size={20} />
          </button>
        )}

        {/* INFORMASI OWNER */}
        <div className={`mx-4 mt-6 rounded-xl bg-white/10 p-4 ${
          sidebarCollapsed ? 'lg:mx-3 lg:px-0 lg:py-3' : ''
        }`}>
          <div className={`flex items-center gap-3 ${
            sidebarCollapsed ? 'lg:justify-center' : ''
          }`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-lg font-bold text-[#105b53]">
              {user?.nama?.charAt(0)?.toUpperCase() || 'O'}
            </div>

            <div className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-sm font-bold">
                {user?.nama || 'Owner'}
              </p>
              <p className="text-xs text-emerald-100/70">
                Pemilik Kos
              </p>
            </div>
          </div>
        </div>

        {/* MENU */}
        <div className="flex-1 overflow-y-auto px-4 py-7">
          <p className={`mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/50 ${
            sidebarCollapsed ? 'lg:hidden' : ''
          }`}>
            Menu Utama
          </p>

          <nav className="space-y-2">
            {menuOwner.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200 ${
                      sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''
                    } ${
                      isActive
                        ? 'bg-white font-bold text-[#105b53] shadow-md'
                        : 'text-emerald-50/80 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon size={19} strokeWidth={2} />
                        <span className={`text-sm ${
                          sidebarCollapsed ? 'lg:hidden' : ''
                        }`}>
                          {item.label}
                        </span>
                      </div>

                      {isActive && !sidebarCollapsed && (
                        <ChevronRight size={17} />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* STATUS & KELUAR */}
        <div className="border-t border-white/10 p-4">
          <div className={`mb-4 flex items-center gap-2 px-2 ${
            sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''
          }`}>
            <MapPin size={16} className="shrink-0 text-emerald-200" />
            <span className={`text-xs text-emerald-100/70 ${
              sidebarCollapsed ? 'lg:hidden' : ''
            }`}>
              KosFinder Management
            </span>
          </div>

          <button
            onClick={logout}
            title={sidebarCollapsed ? 'Keluar' : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/15 hover:text-white ${
              sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''
            }`}
          >
            <LogOut size={19} />
            <span className={sidebarCollapsed ? 'lg:hidden' : ''}>
              Keluar
            </span>
          </button>

        </div>
      </aside>

      {/* AREA KONTEN */}
      <div className="min-w-0 flex-1">

        {/* HEADER MOBILE */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-5 shadow-sm lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
            aria-label="Buka sidebar"
          >
            <Menu size={23} />
          </button>

          <div>
            <h2 className="font-extrabold text-[#105b53]">
              KosFinder
            </h2>
            <p className="text-[10px] text-slate-500">
              Panel Owner
            </p>
          </div>
        </header>

        {/* PERINGATAN VERIFIKASI */}
        {belumVerifikasi && (
          <div className="px-5 pt-5 md:px-8">
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
              {user?.status_verifikasi === 'Ditolak'
                ? 'Verifikasi akun Anda ditolak oleh Admin.'
                : 'Akun Anda menunggu verifikasi Admin. Anda belum bisa mempublikasikan kos atau memproses booking.'}
            </div>
          </div>
        )}

        {/* HALAMAN */}
        <main className="min-h-[calc(100vh-64px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
