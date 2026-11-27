import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pencil,
  User,
  Mail,
  Phone,
  BadgeCheck,
  ShieldCheck,
  Lock,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/authHooks';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition ' +
  'focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 ' +
  'disabled:cursor-default disabled:border-transparent';

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 py-4 last:border-0">
      <Icon className="h-5 w-5 shrink-0 text-slate-400" />
      <span className="w-44 shrink-0 text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value || '-'}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-slate-500">{label}</label>
      {children}
    </div>
  );
}

export default function Profil() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const awal = {
    nama: user?.nama ?? '',
    email: user?.email ?? '',
    no_wa: user?.no_wa ?? '',
  };

  const [data, setData] = useState(awal);
  const [draft, setDraft] = useState(awal);
  const [editing, setEditing] = useState(false);

  const inisial = data.nama?.trim()?.[0]?.toUpperCase() ?? 'O';
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  const mulaiUbah = () => {
    setDraft(data);
    setEditing(true);
  };

  const batal = () => {
    setDraft(data);
    setEditing(false);
  };

  const simpan = () => {
    setData(draft);
    setEditing(false);
    // TODO: kirim `draft` (nama, email, no_wa) ke API untuk update tabel users
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* Kartu profil kiri */}
        <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-col items-center">
            <div className="flex h-44 w-44 items-center justify-center rounded-full bg-[#0d5a57] text-6xl font-bold text-white ring-4 ring-emerald-50">
              {inisial}
            </div>

            <h2 className="mt-6 text-2xl font-bold text-slate-900">{data.nama}</h2>
            <span className="mt-2 rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-medium text-emerald-700">
              Pemilik Kos
            </span>
          </div>

          <ul className="mt-8 space-y-4 text-slate-600">
            <li className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-slate-400" />
              <span className="break-all">{data.email || '-'}</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-slate-400" />
              {data.no_wa || '-'}
            </li>
          </ul>
        </section>

        {/* Informasi pribadi kanan */}
        <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-3 text-xl font-bold text-slate-900">
              <User className="h-6 w-6 text-emerald-700" />
              Informasi Pribadi
            </h3>

            {editing ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={batal}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  Batal
                </button>
                <button
                  type="button"
                  onClick={simpan}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800"
                >
                  <Check className="h-4 w-4" />
                  Simpan
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={mulaiUbah}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Ubah Profil
              </button>
            )}
          </div>

          <div className="mt-6 space-y-5">
            <Field label="Nama Lengkap">
              <input
                className={inputClass}
                disabled={!editing}
                value={editing ? draft.nama : data.nama}
                onChange={set('nama')}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className={inputClass}
                disabled={!editing}
                value={editing ? draft.email : data.email}
                onChange={set('email')}
              />
            </Field>
            <Field label="No. WhatsApp">
              <input
                type="tel"
                className={inputClass}
                disabled={!editing}
                value={editing ? draft.no_wa : data.no_wa}
                onChange={set('no_wa')}
              />
            </Field>
          </div>
        </section>
      </div>

      {/* Informasi akun */}
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <h3 className="flex items-center gap-3 text-xl font-bold text-slate-900">
          <ShieldCheck className="h-6 w-6 text-emerald-700" />
          Informasi Akun
        </h3>

        <div className="mt-4">
          <InfoRow icon={User} label="Role" value="Pemilik Kos" />
          <InfoRow icon={BadgeCheck} label="Status verifikasi" value={user?.status_verifikasi} />
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 text-sm">
          <span className="flex items-center gap-2 text-slate-500">
            <Lock className="h-4 w-4" />
            Keamanan akun Anda terjaga dengan baik.
          </span>
          <button
            type="button"
            onClick={() => navigate('/owner/kos')}
            className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:underline"
          >
            Buka halaman kos
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}