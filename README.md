# KosFinder

Aplikasi pencarian dan pemesanan kos berbasis peta.

## Struktur

- `backend/` — REST API Express 5, Prisma 7, PostgreSQL, JWT, Cloudinary.
- `frontend/` — SPA React 19, Vite 8, React Router, Tailwind 4, Leaflet.

## Menjalankan secara lokal

### Backend

```bash
cd backend
npm install
copy .env.example .env   # isi DATABASE_URL, JWT_SECRET, dan kredensial Cloudinary
npm run db:migrate       # atau npm run db:push untuk development cepat
npm run db:seed          # opsional, akun dummy: password123
npm run dev
```

API berjalan di `http://localhost:5000/api`.

### Frontend

```bash
cd frontend
npm install
copy .env.example .env   # sesuaikan VITE_API_URL jika backend tidak di port 5000
npm run dev
```

Aplikasi berjalan di `http://localhost:5173`.

## Fitur sesuai soal UKK

| Kebutuhan soal | Implementasi |
|---|---|
| Login 3 peran + verifikasi Owner oleh Admin | `/api/auth`, `/api/admin/owners`, `ProtectedRoute` |
| Owner kelola kos & kamar, titik lokasi klik peta, fasilitas checklist | `/owner/kos`, `/owner/kamar`, `PetaLokasi.jsx` |
| Peta Leaflet + marker hijau/abu, titik acuan, radius, filter harga/fasilitas/tipe | `Landing.jsx`, `PetaKos.jsx` |
| Booking survey/kamar + approval Owner + status kamar otomatis + auto Selesai | `DashboardUser.jsx`, `/owner/booking`, `bookingOtomatis.js` |
| Review rating 1–5 hanya untuk booking Selesai, rata-rata per kos | `DashboardUser.jsx`, `/owner/review` |
| Dashboard grafik Owner (okupansi & pendapatan) dan Admin (wilayah & pertumbuhan booking) | `/owner`, `/admin` |
| Ekspor PDF/Excel/CSV dan backup data | `/admin/laporan`, `/owner/ekspor` |
| Bukti konfirmasi booking (lampiran soal) | `GET /api/booking/:id/bukti` |

## Variabel lingkungan penting

Lihat `backend/.env.example` dan `frontend/.env.example`.

- `JWT_SECRET` wajib diisi; server akan berhenti jika kosong.
- `CORS_ORIGIN` berisi daftar origin frontend yang diizinkan, dipisah koma.
- `TRUST_PROXY=1` jika di-deploy di belakang proxy/load balancer.
- Login menggunakan cookie `httpOnly` (bukan `localStorage`). Jika frontend dan backend berada di domain berbeda, gunakan `sameSite: none` + `secure: true` dan HTTPS.

## Script

| Folder | Perintah | Fungsi |
|---|---|---|
| `backend` | `npm run dev` | Dev server dengan watch |
| `backend` | `npm run db:migrate` | Jalankan migrasi (disarankan untuk production) |
| `backend` | `npm run db:push` | Sinkronkan schema cepat (development) |
| `backend` | `npm run db:seed` | Isi data contoh |
| `frontend` | `npm run dev` | Dev server Vite |
| `frontend` | `npm run lint` | ESLint |
| `frontend` | `npm run build` | Build produksi |
