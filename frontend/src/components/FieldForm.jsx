import { useState } from 'react';
import { kelas } from './AuthLayout';
import { aturanPassword } from '../utils/ValidasiForm';

// Memakai kelas bersama dari AuthLayout supaya tampilannya sama dengan Login/Register

const IkonCentang = ({ className = '' }) => (
  <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
    <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M6 10.5l2.8 2.8L14 8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IkonMata = ({ tercoret }) => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
    <path
      d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    {tercoret && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
  </svg>
);

const IkonPeringatan = () => (
  <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
    <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 6v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="10" cy="13.8" r="0.9" fill="currentColor" />
  </svg>
);

// Turunan dari kelas.input: beri ruang untuk ikon di kanan, dan border merah saat error
const kelasInput = (error) => {
  let k = kelas.input.replace('px-3.5', 'pl-3.5 pr-11');
  if (error) k = k.replace('border-[#cfd9d6]', 'border-[#b3261e]');
  return k;
};

// Pesan error / bantuan tepat di bawah kolom (error boleh berupa teks atau elemen, mis. berisi tautan)
function PesanKolom({ id, error, hint }) {
  if (error) {
    return (
      <p id={`${id}-error`} className="mt-1.5 flex gap-1.5 text-sm text-[#b3261e]" role="alert">
        <IkonPeringatan />
        <span>{error}</span>
      </p>
    );
  }
  return hint ? <p className="mt-1.5 text-sm text-[#4b625f]">{hint}</p> : null;
}

// Kolom isian biasa: label, input, centang saat valid, pesan di bawah kolom
export function FieldForm({ id, label, error, valid, hint, ...props }) {
  return (
    <div>
      <label className={kelas.label} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          className={kelasInput(error)}
          {...props}
        />
        {valid && !error && (
          <IkonCentang className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#2f9e5b]" />
        )}
      </div>
      <PesanKolom id={id} error={error} hint={hint} />
    </div>
  );
}

// Kolom password: tombol lihat/sembunyikan, dan (opsional) checklist syarat yang tercentang saat terpenuhi
export function PasswordField({
  id = 'password',
  label = 'Kata sandi',
  error,
  tampilSyarat = false,
  autoComplete = 'current-password',
  ...props
}) {
  const [lihat, setLihat] = useState(false);
  const aturan = aturanPassword(props.value);

  return (
    <div>
      <label className={kelas.label} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={lihat ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : tampilSyarat ? `${id}-syarat` : undefined}
          className={kelasInput(error)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setLihat((v) => !v)}
          aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-[#4b625f] hover:text-[#0d5a57] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[#f0b429]"
        >
          <IkonMata tercoret={lihat} />
        </button>
      </div>

      <PesanKolom id={id} error={error} />

      {tampilSyarat && (
        <ul id={`${id}-syarat`} aria-live="polite" className="mt-2 grid gap-1">
          {aturan.map((a) => (
            <li
              key={a.id}
              className={`flex items-center gap-2 text-sm ${
                a.terpenuhi ? 'text-[#0d5a57]' : 'text-[#4b625f]'
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  a.terpenuhi ? 'border-[#0d5a57] bg-[#0d5a57] text-white' : 'border-[#cfd9d6]'
                }`}
              >
                {a.terpenuhi && (
                  <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" aria-hidden="true">
                    <path
                      d="M2.5 6.2l2.2 2.2 4.8-4.8"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              {a.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}