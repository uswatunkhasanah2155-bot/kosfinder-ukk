// Kelas Tailwind yang dipakai bersama oleh Login dan Register
export const kelas = {
  label: 'mb-1.5 block text-sm font-bold',
  input:
    'h-[46px] w-full rounded-lg border-[1.5px] border-[#cfd9d6] bg-white px-3.5 text-base text-[#12302e] focus:outline-none focus-visible:border-[#0d5a57] focus-visible:ring-[3px] focus-visible:ring-[#f0b429]',
  tombol:
    'block h-12 w-full cursor-pointer rounded-lg bg-[#0d5a57] font-bold text-white focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[#f0b429] focus-visible:ring-offset-1 enabled:hover:bg-[#0a4341] disabled:cursor-progress disabled:opacity-60',
  galat:
    'rounded-lg border border-[#f3c4c0] bg-[#fdecea] px-3.5 py-3 text-[0.92rem] text-[#b3261e]',
  tautan: 'font-bold text-[#0d5a57]',
};

export default function AuthLayout({ judul, subjudul, children }) {
  return (
    <main className="grid min-h-screen w-full grid-cols-1 bg-[#f6f8f6] text-left font-['Plus_Jakarta_Sans',system-ui,sans-serif] text-[#12302e] md:grid-cols-[5fr_6fr]">
      <aside className="relative min-h-37.5 overflow-hidden bg-[#0d5a57] text-white md:min-h-screen">
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.35] md:opacity-100"
          viewBox="0 0 400 520"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <path
              id="pin"
              d="M0 -22 C-10 -22 -16 -14 -16 -6 C-16 6 0 20 0 20 C0 20 16 6 16 -6 C16 -14 10 -22 0 -22Z"
            />
          </defs>
          <g fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="2">
            <path d="M0 120H400M0 260H400M0 400H400M90 0V520M230 0V520M330 0V520" />
            <path d="M0 480L400 60" strokeWidth="4" />
            <path d="M-10 330C80 300 120 380 220 350S360 300 410 330" stroke="#8fd3cf" strokeOpacity=".3" strokeWidth="14" />
          </g>
          <circle cx="200" cy="260" r="110" fill="#fff" fillOpacity=".06" stroke="#fff" strokeOpacity=".7" strokeDasharray="6 6" strokeWidth="2" />
          <circle cx="200" cy="260" r="7" fill="#f0b429" />
          <use href="#pin" x="150" y="215" fill="#2f9e5b" />
          <use href="#pin" x="250" y="205" fill="#2f9e5b" />
          <use href="#pin" x="235" y="320" fill="#8b9694" />
          <use href="#pin" x="95" y="395" fill="#2f9e5b" />
          <use href="#pin" x="320" y="120" fill="#8b9694" />
        </svg>

        <div className="relative p-7 md:p-12">
          <p className="text-2xl font-extrabold tracking-tight">Kos-Finder</p>
          <p className="mt-3 hidden max-w-[24ch] text-xl font-medium leading-snug md:block">
            Lihat kos yang masih kosong di sekitar kampus atau kantormu, langsung dari peta.
          </p>
        </div>
      </aside>

      <section className="mx-auto w-full max-w-110 px-6 pb-12 pt-8 md:self-center md:p-12">
        <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-tight">{judul}</h1>
        <p className="mb-7 mt-2 leading-relaxed text-[#4b625f]">{subjudul}</p>
        {children}
      </section>
    </main>
  );
}