# Panduan Menjelaskan Project KosFinder Saat Uji Kompetensi

Dokumen ini berisi **naskah penjelasan + potongan kode asli** sesuai file di repository.
Cara pakai: baca bagian "Cara menjawab" dulu, lalu hafal alur demo, lalu pelajari Q&A.

---

## 1. Cara menjawab pertanyaan penguji (rumusnya)

Gunakan pola 4 langkah ini setiap kali ditanya:

> **"Fitur itu ada di file `...`. Alurnya: frontend → API → database. Saya pakai `...` karena `...`. Hasilnya `...`."**

Contoh:

> "Untuk booking, file frontend-nya `src/pages/user/DashboardUser.jsx`, API-nya `backend/services/booking-service/booking.js`. Alurnya: user pilih kamar → `POST /api/booking` → backend cek duplikat dalam transaksi SERIALIZABLE → status `Menunggu`. Saya pakai transaksi karena kalau dua user klik bersamaan, tanpa transaksi bisa dua booking masuk ke kamar yang sama. Hasilnya salah satu dapat 409."

**Kalau tidak tahu:** jangan mengarang. Katakan:

> "Bagian itu belum saya dalami, tapi letaknya di file `...`, saya bisa tunjukkan kodenya." ✓ Ini lebih aman daripada jawaban salah.

---

## 2. Gambaran aplikasi (hafal 1 paragraf)

> "Aplikasi ini web. Frontend memakai React 19 + Vite, routing React Router, UI Tailwind, peta Leaflet dengan tile OpenStreetMap, grafik Chart.js. Backend memakai Express 5, database PostgreSQL lewat Prisma 7, autentikasi JWT yang disimpan di cookie httpOnly. Ada tiga peran: Admin, Owner, dan User. Semua fitur di soal sudah ada: verifikasi Owner, CRUD kos dan kamar dengan titik lokasi dari klik peta, pencarian berpeta dengan filter, booking dan approval, review, dashboard grafik, ekspor, dan bukti konfirmasi booking."

Arsitektur singkat:

```
Browser (React)
   │  axios withCredentials : cookie JWT
   ▼
Express /api  →  middleware verifyToken / checkRole / verifyOwnerVerified
   ▼
Prisma ORM  →  PostgreSQL
```

File penting: `backend/server.js`, `frontend/src/App.jsx`.

---

## 3. Urutan demo yang disarankan (5–7 menit)

| Langkah | Aksi di browser | Yang diucapkan |
|---|---|---|
| 1 | Buka `/`, tunjukkan peta + marker | "Ini halaman publik. Marker hijau = ada kamar kosong, abu = penuh." |
| 2 | Pilih tipe kos, isi harga min/max, klik peta untuk titik acuan, pilih radius | "Filter langsung update tanpa reload. Jarak dihitung Haversine." |
| 3 | Klik marker | "Popup berisi foto, harga mulai, jarak dari titik acuan." |
| 4 | Login sebagai Owner yang belum terverifikasi | "Owner baru belum bisa publish, muncul peringatan." |
| 5 | Login Admin → Verifikasi Owner → setujui | "Verifikasi akun Owner oleh Admin, sesuai soal." |
| 6 | Login Owner → Kos Saya → Tambah Kos → klik peta → centang fasilitas → simpan | "Latitude/longitude otomatis dari klik peta." |
| 7 | Menu Kamar → tambah kamar → kembali ke Kos Saya → Publikasikan | "Kos minimal harus punya 1 kamar sebelum aktif." |
| 8 | Refresh halaman `/` | "Kos sekarang muncul di peta." |
| 9 | Login User → ajukan booking kamar | "Status awal Menunggu." |
| 10 | Login Owner → Booking Masuk → Setujui → lihat status kamar | "Kamar berubah jadi Dalam Booking, nanti Terisi otomatis." |
| 11 | Owner → Tandai Selesai → User → beri review bintang | "Review hanya bisa setelah booking Selesai." |
| 12 | Tunjukkan dashboard Owner & Admin, lalu menu Ekspor | "Grafik okupansi/pendapatan dan ekspor PDF/Excel/CSV." |

Akun dummy ada di `backend/prisma/seed.js`. **Semua password: `password123`**

| Peran | Email | Catatan |
|---|---|---|
| Admin | `admin@kosfinder.test` | langsung aktif |
| Owner | `owner@kosfinder.test` | sudah terverifikasi |
| Owner uji verifikasi | `owner2@kosfinder.test` | masih `Menunggu`, cocok untuk demo langkah 4–5 |
| User | `user@kosfinder.test` | untuk ajukan booking & review |

---

## 4. Penjelasan per fitur + kode terkait

### 4.1 Login, tiga peran, dan cookie httpOnly

**File:** `backend/services/auth-service/auth.js` baris 176–224, `frontend/src/api/axios.js`, `frontend/src/components/ProtectedRoute.jsx`.

```js
// backend/services/auth-service/auth.js
const user = await prisma.user.findUnique({ where: { email: emailBersih } });
if (!user || !(await bcrypt.compare(password, user.password))) {
  return res.status(401).json({ success: false, message: 'Email atau password salah' });
}

const token = jwt.sign(
  { user_id: user.user_id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '1d' }
);

res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
});
```

**Penjelasan:** password dibandingkan dengan `bcrypt.compare`, bukan disimpan plain. JWT tidak dikirim sebagai JSON `token`, tapi dimasukkan cookie `httpOnly` supaya tidak bisa dibaca JavaScript (lebih aman dari XSS). Frontend mengirim cookie otomatis:

```js
// frontend/src/api/axios.js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});
```

**Guard halaman:**

```jsx
// frontend/src/components/ProtectedRoute.jsx
if (loading) return <p style={{ padding: 24 }}>Memuat…</p>;
if (!user) return <Navigate to="/login" replace state={{ dari: location }} />;
if (roles && !roles.includes(user.role)) return <Navigate to={homePath(user.role)} replace />;
return <Outlet />;
```

**Middleware role & verifikasi:** `backend/middleware/authMiddleware.js`

```js
const token = req.cookies?.token || (authHeader && authHeader.split(' ')[1]);
// ...
const user = await prisma.user.findUnique({
  where: { user_id: userId },
  select: { user_id: true, role: true, status_verifikasi: true },
});
req.user = { user_id: user.user_id, role: user.role, status_verifikasi: user.status_verifikasi };
```

```js
export const verifyOwnerVerified = (req, res, next) => {
  if (!req.user || req.user.role !== 'Owner') return res.status(403).json(...);
  if (req.user.status_verifikasi === 'Ditolak') return res.status(403).json(...);
  if (req.user.status_verifikasi !== 'Terverifikasi') return res.status(403).json(...);
  return next();
};
```

**Kalau ditanya "kenapa role diambil lagi dari database?"**
> "Supaya kalau Admin mencabut verifikasi Owner, perubahan langsung berlaku walaupun token lama belum expired. Jadi yang dipercaya adalah database, bukan isi token."

---

### 4.2 Verifikasi Owner oleh Admin

**File:** `backend/services/admin-service/admin.js`, `frontend/src/pages/admin/VerifikasiOwner.jsx`

Endpoint:
- `GET /api/admin/owners?status=Menunggu`
- `PATCH /api/admin/owners/:id/verifikasi`
- `PATCH /api/admin/owners/:id/tolak`

**Penjelasan:** saat register dengan role Owner, `status_verifikasi` default `Menunggu`. Admin menyetujui lewat menu Verifikasi Owner. Owner yang belum `Terverifikasi` ditolak middleware `verifyOwnerVerified` saat mencoba buat kos/publikasi/booking.

> Catatan penting: soal hanya meminta **verifikasi akun Pemilik Kos**, bukan verifikasi setiap kos. Kos yang dibuat Owner langsung berstatus draf `Menunggu`, lalu Owner sendiri yang mempublikasikan lewat `PATCH /api/kos/:id/status`.

---

### 4.3 CRUD kos + titik lokasi klik peta + fasilitas checklist

**File:** `frontend/src/pages/owner/KosSaya.jsx`, `frontend/src/components/map/PetaLokasi.jsx`, `backend/services/kos-service/kos.js`

```jsx
// frontend/src/components/map/PetaLokasi.jsx
function KlikPeta({ onPilih }) {
  useMapEvents({
    click(e) {
      onPilih({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}
```

```jsx
// frontend/src/pages/owner/KosSaya.jsx
const pilihTitik = ({ latitude, longitude }) =>
  setForm((f) => ({
    ...f,
    latitude: Number(latitude.toFixed(7)),
    longitude: Number(longitude.toFixed(7)),
  }));
```

```js
// backend/services/kos-service/kos.js
const koordinat = (nama, label, min, maks) => {
  const n = Number(body[nama]);
  if (kosong(body[nama]) || !Number.isFinite(n) || n < min || n > maks) {
    return `${label} tidak valid (${min} sampai ${maks}). Pilih titik lokasi di peta`;
  }
  data[nama] = n;
  return null;
};
```

Fasilitas memakai checklist ID master fasilitas:

```js
const toggleFasilitas = (id) =>
  setForm((f) => ({
    ...f,
    fasilitas: f.fasilitas.includes(id)
      ? f.fasilitas.filter((x) => x !== id)
      : [...f.fasilitas, id],
  }));
```

**Endpoint:** `POST /api/kos`, `PUT /api/kos/:id`, `DELETE /api/kos/:id`, `PATCH /api/kos/:id/status`, `POST /api/kos/:id/foto`, `DELETE /api/kos/foto/:fotoId`.

**Kalau ditanya "kenapa pakai Decimal(10,7)?"**
> "Karena koordinat butuh tujuh angka di belakang koma; di response Prisma saya ubah jadi Number supaya mudah dipakai Leaflet."

---

### 4.4 Kelola kamar

**File:** `frontend/src/pages/owner/Kamar.jsx`, `backend/services/kamar-service/kamar.js`

```js
// backend/services/kamar-service/kamar.js
router.post('/kos/:kosId/kamar', ownerTerverifikasi, async (req, res) => {
  const kos = await prisma.kos.findFirst({
    where: { kos_id: kosId, owner_id: req.user.user_id },
  });
  if (!kos) return res.status(404).json({ success: false, message: 'Kos tidak ditemukan' });

  const { data, error } = validasiKamar(req.body, { semuaWajib: true });
  if (error) return res.status(400).json({ success: false, message: error });

  const kamar = await prisma.kamar.create({ data: { ...data, kos_id: kosId } });
  res.status(201).json({ success: true, message: 'Berhasil menambahkan kamar', data: kamar });
});
```

**Poin penting:** backend selalu mengecek `owner_id`, jadi Owner tidak bisa mengubah kamar kos orang lain. Nomor kamar unik per kos (`P2002` → pesan "Nomor kamar sudah ada di kos ini").

---

### 4.5 Peta interaktif, marker, dan filter

**File:** `frontend/src/pages/user/Landing.jsx`, `frontend/src/components/map/PetaKos.jsx`

Jarak titik acuan memakai rumus Haversine:

```js
const jarakKm = (a, b) => {
  const rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2
    + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
```

Filter (radius, harga, fasilitas, tipe) dihitung tanpa reload:

```jsx
const tampil = useMemo(
  () => kos
    .map((k) => ({ ...k, jarak: acuan ? jarakKm([acuan.lat, acuan.lng], [k.lat, k.lng]) : null }))
    .filter((k) =>
      (!f.kota || k.kota === f.kota) &&
      (!f.tipe || k.tipe === f.tipe) &&
      (f.hargaMin === '' || k.harga >= Number(f.hargaMin)) &&
      (f.hargaMaks === '' || k.harga <= Number(f.hargaMaks)) &&
      (!f.radius || (k.jarak != null && k.jarak <= f.radius)) &&
      f.fasilitas.every((x) => k.fasilitas.includes(x)) &&
      (!f.tersedia || k.kosong > 0))
    .sort(URUTAN[f.urut]),
  [kos, f, acuan]
);
```

Marker warna:

```jsx
icon={pin(k.kosong > 0, aktif === k.id)}
// background: tersedia ? '#059669' (hijau) : '#94a3b8' (abu-abu)
```

Popup berisi foto, harga mulai, dan jarak:

```jsx
{src && <FotoKos src={src} alt={k.nama} className="mb-2 h-28 w-full rounded-lg object-cover" />}
<b>{k.nama}</b>
<div>Mulai {rupiah(k.harga)}/bulan · {fmtJarak(k.jarak)} dari titik acuan</div>
```

**Kalau ditanya "kenapa filter tidak dikirim ke backend?"**
> "Backend sebenarnya menyediakan query `lat`, `lng`, `radius`, `harga_min`, `harga_max`, `fasilitas`, `tipe`, `kota`. Di halaman ini saya hitung di client dengan `useMemo` supaya peta langsung berubah tanpa request ulang. Data mentahnya tetap dari `GET /api/kos` yang hanya mengembalikan kos aktif."

---

### 4.6 Booking, approval, dan perubahan status kamar

**File:** `backend/services/booking-service/booking.js`

***a. Pengajuan booking (antisipasi dobel klik):***

```js
baru = await prisma.$transaction(
  async (tx) => {
    const sudahAda = await tx.booking.findFirst({
      where: {
        user_id: req.user.user_id,
        kamar_id,
        jenis_booking,
        status_booking: { in: ['Menunggu', 'Disetujui'] },
      },
    });
    if (sudahAda) throw new Error('BOOKING_DUPLIKAT');

    return tx.booking.create({
      data: { kamar_id, user_id: req.user.user_id, jenis_booking,
              tanggal_survey: tanggal, durasi_bulan: durasi },
      include: INCLUDE_BOOKING,
    });
  },
  { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
);
```

Konflik dikembalikan `409`, bukan `500`:
```js
if (error.message === 'BOOKING_DUPLIKAT') {
  return res.status(409).json({ success: false, message: `Anda sudah punya booking ...` });
}
if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
  return res.status(409).json({ success: false, message: 'Data booking baru saja berubah. Silakan coba lagi.' });
}
```

**Penjelasan:** tanpa transaksi, dua request bersamaan bisa sama-sama lolos pengecekan `findFirst` lalu dua-duanya `create`. `SERIALIZABLE` membuat salah satu gagal (`P2034`).

***b. Persetujuan Owner → status kamar berubah:***

```js
await prisma.$transaction(async (tx) => {
  const ubah = await tx.booking.updateMany({
    where: { booking_id: id, status_booking: 'Menunggu' },
    data: { status_booking: 'Disetujui' },
  });
  if (ubah.count === 0) throw new Error('STATUS_BERUBAH');

  if (booking.jenis_booking === 'Kamar') {
    const sudahMulai = booking.tanggal_survey.toISOString().slice(0, 10) <= hariIniWib();
    const kunci = await tx.kamar.updateMany({
      where: { kamar_id: booking.kamar_id, status_kamar: 'Kosong' },
      data: { status_kamar: sudahMulai ? 'Terisi' : 'DalamBooking' },
    });
    if (kunci.count === 0) throw new Error('KAMAR_TIDAK_TERSEDIA');

    await tx.booking.updateMany({
      where: { kamar_id: booking.kamar_id, jenis_booking: 'Kamar',
               status_booking: 'Menunggu', booking_id: { not: id } },
      data: { status_booking: 'Ditolak' },
    });
  }
});
```

**Penjelasan alur status kamar:**
- Booking disetujui → `Kosong → DalamBooking` (atau langsung `Terisi` kalau tanggal mulai sudah tiba).
- Tanggal mulai tiba → `DalamBooking → Terisi` (dijalankan otomatis).
- Booking selesai / masa sewa habis → kembali `Kosong`.

***c. Otomatis Selesai — `backend/lib/bookingOtomatis.js`:***

```js
const kedaluwarsa = kandidat.filter((b) => {
  const berakhir = b.jenis_booking === 'Kamar'
    ? tambahBulan(b.tanggal_survey, b.durasi_bulan)
    : b.tanggal_survey;
  return keTanggal(berakhir) < hariIni;
});

for (const b of kedaluwarsa) {
  await prisma.$transaction(async (tx) => {
    const ubah = await tx.booking.updateMany({
      where: { booking_id: b.booking_id, status_booking: 'Disetujui' },
      data: { status_booking: 'Selesai' },
    });
    if (ubah.count > 0 && b.jenis_booking === 'Kamar') {
      await tx.kamar.updateMany({
        where: { kamar_id: b.kamar_id, status_kamar: { in: ['DalamBooking', 'Terisi'] } },
        data: { status_kamar: 'Kosong' },
      });
    }
  });
}
```

Dipanggil saat server start, tiap 10 menit (`backend/server.js` baris 159–165), dan di awal endpoint dashboard/export (maks 1×/menit).

**Endpoint:** `POST /api/booking`, `GET /api/booking/saya`, `GET /api/owner/booking`, `PATCH /api/booking/:id/setujui`, `/tolak`, `/selesai`, `GET /api/booking/:id/bukti`.

---

### 4.7 Review & rating

**File:** `backend/services/review-service/review.js` baris 32–81

```js
const rating = Number(req.body.rating);
if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
  return res.status(400).json({ success: false, message: 'Rating harus bilangan bulat 1 sampai 5' });
}

const booking = await prisma.booking.findFirst({
  where: { booking_id: bookingId, user_id: req.user.user_id },
  include: { review: true },
});
if (booking.status_booking !== 'Selesai') {
  return res.status(400).json({
    success: false,
    message: 'Review hanya bisa diberikan setelah booking berstatus Selesai',
  });
}
if (booking.review) {
  return res.status(400).json({ success: false, message: 'Anda sudah memberi review untuk booking ini' });
}
```

Rata-rata dihitung di `GET /api/kos/:id/review` dengan `prisma.review.aggregate({ _avg: { rating: true }, _count: { review_id: true } })`. Owner melihatnya di `/owner/review`.

---

### 4.8 Dashboard grafik

**File:** `frontend/src/pages/owner/Dashboard.jsx`, `frontend/src/pages/admin/Dashboard.jsx`, `backend/services/dashboard-service/dashboard.js`

Endpoint:
- `GET /api/owner/dashboard` → `ringkasan`, `okupansi_per_kos`, `pendapatan_per_bulan` (12 bulan), `booking_per_status`.
- `GET /api/admin/dashboard` → `ringkasan`, `kos_per_wilayah`, `kos_per_status`, `pertumbuhan_booking`.

Grafik memakai `react-chartjs-2`:

```jsx
<Bar
  data={{
    labels: data.okupansi_per_kos.map((k) => k.nama_kos),
    datasets: [{ data: data.okupansi_per_kos.map((k) => k.okupansi_persen) }],
  }}
/>
<Line
  data={{
    labels: data.pendapatan_per_bulan.map((p) => p.label),
    datasets: [{ data: data.pendapatan_per_bulan.map((p) => p.estimasi_pendapatan) }],
  }}
/>
```

Estimasi pendapatan hanya menghitung booking `Kamar` yang `Disetujui`/`Selesai`, dikalikan harga kamar dan durasi bulan.

---

### 4.9 Ekspor, backup, dan bukti konfirmasi

**File:** `backend/services/export-service/export.js`, `frontend/src/pages/admin/Laporan.jsx`, `frontend/src/pages/owner/Ekspor.jsx`

Endpoint:
- `GET /api/export/kos|kamar|booking?format=xlsx|csv|pdf&kota=&tipe=&status=`
- `GET /api/export/backup?format=xlsx|csv|pdf`
- `GET /api/booking/:id/bukti` → PDF bukti sesuai lampiran soal.

Frontend mengunduh sebagai blob:

```js
const res = await api.get(`/export/${jenis}`, { params, responseType: 'blob' });
simpanFile(res.data, namaFile);
```

Keamanan tambahan: nilai spreadsheet yang diawali `=`, `+`, `-`, `@` diberi awalan `'` supaya tidak dieksekusi sebagai rumus saat dibuka di Excel.

---

### 4.10 Keamanan backend (nilai plus)

**File:** `backend/server.js`

```js
app.use(helmet());
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Origin tidak diizinkan oleh CORS'));
}, exposedHeaders: ['Content-Disposition'], credentials: true }));

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 200, ... }));
app.use('/api/auth/login', authLimiter);   // 10 percobaan / 15 menit
app.use('/api/auth/register', authLimiter);
```

Error handler terpusat tidak pernah mengirim `error.message` ke client.

---

## 5. Cheat sheet endpoint

| Method | Path | Siapa |
|---|---|---|
| POST | `/api/auth/register`, `/login`, `/logout`, `/me` | semua / login |
| GET | `/api/admin/owners`, PATCH `/:id/verifikasi`, `/:id/tolak` | Admin |
| GET/POST/PUT/DELETE | `/api/fasilitas` | GET publik, CRUD Admin |
| GET | `/api/kos`, `/api/kos/:id`, `/api/kos/:id/review` | publik |
| GET | `/api/kos/saya`, POST `/api/kos`, PUT/DELETE `/api/kos/:id` | Owner terverifikasi |
| PATCH | `/api/kos/:id/status`, `/:id/publikasi` | Owner terverifikasi |
| POST/DELETE | `/api/kos/:id/foto`, `/api/kos/foto/:fotoId` | Owner terverifikasi |
| POST/PUT/DELETE | `/api/kos/:kosId/kamar`, `/api/kamar/:id` | Owner terverifikasi |
| POST/GET | `/api/booking`, `/api/booking/saya` | User |
| GET | `/api/owner/booking` | Owner terverifikasi |
| PATCH | `/api/booking/:id/setujui`, `/tolak`, `/selesai` | Owner terverifikasi |
| GET | `/api/booking/:id/bukti` | pemesan/owner/admin |
| POST | `/api/booking/:id/review` | User, booking Selesai |
| GET | `/api/owner/dashboard`, `/api/admin/dashboard`, `/api/wilayah` | sesuai role / publik |
| GET | `/api/export/...` | Owner terverifikasi / Admin |

---

## 6. Q&A yang kemungkinan besar ditanyakan

**1. Kenapa pakai React dan Express?**
> React cocok untuk UI interaktif seperti peta dan filter real-time. Express ringan dan mudah dipisah per fitur lewat router.

**2. Kenapa PostgreSQL dan Prisma?**
> Data berrelasi (kos–kamar–booking–review), jadi database relasional lebih cocok. Prisma memudahkan query, migrasi, dan transaksi.

**3. Apa beda JWT di cookie dengan localStorage?**
> Cookie `httpOnly` tidak bisa dibaca JavaScript, jadi lebih aman dari XSS. Frontend cukup `withCredentials: true`.

**4. Kenapa token masih bisa dipakai kalau role user diubah Admin?**
> Karena `verifyToken` mengambil ulang `role` dan `status_verifikasi` dari database setiap request, bukan mempercayai isi token.

**5. Apakah Owner bisa langsung mempublikasikan kos tanpa Admin?**
> Owner harus terverifikasi dulu. Setelah itu kos dibuat sebagai draf `Menunggu`, lalu Owner menambahkan kamar minimal satu dan mempublikasikannya sendiri. Sesuai soal, yang diverifikasi Admin adalah akun Pemilik Kos.

**6. Bagaimana titik lokasi kos ditentukan?**
> Pakai `useMapEvents({ click })` di `PetaLokasi.jsx`, lalu `e.latlng` disimpan ke state form sebagai `latitude` dan `longitude`. Marker juga bisa digeser.

**7. Bagaimana marker bisa hijau/abu-abu?**
> Dari `kamar_kosong`. Kalau `> 0` hijau, kalau 0 abu-abu. Warna diatur lewat `L.divIcon`.

**8. Bagaimana radius bekerja?**
> Titik acuan didapat dari klik peta atau geolokasi. Jarak tiap kos dihitung dengan Haversine, lalu kos dengan jarak melebihi radius disembunyikan.

**9. Kenapa booking bisa dobel dicegah?**
> Pengecekan dan `create` dibungkus transaksi `SERIALIZABLE`. Kalau dua request bersamaan, salah satu gagal dengan kode `P2034` dan dikembalikan sebagai 409.

**10. Kapan status kamar berubah?**
> Saat booking disetujui (`Kosong → DalamBooking`), saat tanggal mulai tiba (`DalamBooking → Terisi`), dan saat selesai (`→ Kosong`).

**11. Bagaimana booking otomatis jadi Selesai?**
> `selesaikanBookingKedaluwarsa()` dijalankan saat server start, tiap 10 menit, dan di awal endpoint dashboard/export. Survey selesai setelah tanggal survey lewat; Kamar selesai setelah `tanggal + durasi_bulan`.

**12. Kenapa review hanya setelah Selesai?**
> Supaya rating hanya diberikan oleh orang yang benar-benar sudah menyewa/mengunjungi. Dicek di backend, bukan cuma disembunyikan di UI.

**13. Dari mana rata-rating didapat?**
> `prisma.review.aggregate({ _avg: { rating: true }, _count: { review_id: true } })` di endpoint review kos, lalu ditampilkan di kartu kos dan dashboard Owner.

**14. Apa isi bukti konfirmasi booking?**
> Nomor `KOS/BKG-01/BOOKxxxxx`, tanggal terbilang, nama kos, kamar, status, durasi, total biaya, dan tanda tangan Pemilik Kos dan Pencari Kos — sesuai lampiran soal.

**15. Kenapa ada error handler terpusat?**
> Supaya detail error database tidak bocor ke user. Client hanya menerima pesan umum; detailnya dicatat di console server.

**16. Bagaimana cara menjalankan project?**
> Backend: `npm install`, isi `.env` dari `.env.example`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`. Frontend: `npm install`, `npm run dev`. Buka `localhost:5173`.

**17. Apakah ada tes/validasi?**
> `npm run lint` dan `npm run build` di frontend lolos. Backend dicek dengan `node --check` dan `npx prisma validate`.

**18. Kenapa sebagian filter dihitung di frontend?**
> Agar peta merespons instan tanpa reload. Backend tetap menyediakan filter query untuk kebutuhan lain.

---

## 7. Kalimat penyelamat saat bingung

- "Saya belum hafal persis barisnya, tapi logikanya ada di file `...`, saya bisa tunjukkan."
- "Kalau boleh saya cek dulu kodenya supaya penjelasan saya akurat."
- "Bagian itu saya kerjakan dengan pendekatan `...`; tujuannya supaya `...`."
- "Untuk detail angka migrasinya, saya merujuk ke `prisma/schema.prisma`."

**Yang jangan dilakukan:** menebak-nebak nama field/endpoint, mengatakan fitur ada padahal tidak, atau menyalahkan library.

---

## 8. Checklist sebelum berangkat uji

- [ ] `.env` backend terisi (`JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`)
- [ ] `.env` frontend terisi (`VITE_API_URL`)
- [ ] Database sudah di-`migrate` + `seed`
- [ ] Backend jalan di port 5000, frontend di 5173
- [ ] Hafal akun dummy Admin / Owner / User dari `seed.js`
- [ ] Coba sekali alur lengkap: verifikasi → buat kos → kamar → publish → booking → approve → review → ekspor
- [ ] Tahu letak `PANDUAN_UJI.md` ini sebagai referensi cepat
