// Data dummy untuk pengembangan & demo. Aman dijalankan berulang kali.
// Titik koordinat di bawah hanya contoh (sekitar Bandung) -> ganti dengan area kampus Anda.
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma.js';

const PASSWORD = 'password123';

async function upsertUser(data) {
  return prisma.user.upsert({
    where: { email: data.email },
    update: {},
    create: { ...data, password: await bcrypt.hash(PASSWORD, 10) },
  });
}

async function main() {
  // 1. Akun
  await upsertUser({ nama: 'Admin Kos Finder', email: 'admin@kosfinder.test', role: 'Admin', status_verifikasi: 'Terverifikasi' });
  const owner = await upsertUser({ nama: 'Dedi Kurniawan', email: 'owner@kosfinder.test', role: 'Owner', no_wa: '081234567890', status_verifikasi: 'Terverifikasi' });
  await upsertUser({ nama: 'Owner Baru (belum verifikasi)', email: 'owner2@kosfinder.test', role: 'Owner', status_verifikasi: 'Menunggu' });
  await upsertUser({ nama: 'Rangga Pratama', email: 'user@kosfinder.test', role: 'User', no_wa: '081298765432', status_verifikasi: 'Terverifikasi' });

  // 2. Master fasilitas
  const namaFasilitas = ['WiFi', 'AC', 'Kamar Mandi Dalam', 'Kasur', 'Lemari', 'Parkir Motor', 'Dapur Bersama', 'Laundry'];
  for (const nama_fasilitas of namaFasilitas) {
    await prisma.fasilitas.upsert({ where: { nama_fasilitas }, update: {}, create: { nama_fasilitas } });
  }
  const fas = Object.fromEntries((await prisma.fasilitas.findMany()).map((f) => [f.nama_fasilitas, f.fasilitas_id]));

  // 3. Kos + kamar (hanya dibuat jika tabel kos masih kosong)
  if ((await prisma.kos.count()) === 0) {
    const daftarKos = [
      { nama_kos: 'Kos Melati Asri', alamat: 'Jl. Dipatiukur No. 12', kota: 'Bandung', latitude: -6.8885, longitude: 107.6155, tipe_kos: 'Campur', status_verifikasi: 'Aktif',
        fasilitas: ['WiFi', 'AC', 'Kamar Mandi Dalam'], harga: [900000, 1200000, 1500000], kamarTerisi: 0 },
      { nama_kos: 'Kos Mawar Putri', alamat: 'Jl. Tubagus Ismail No. 8', kota: 'Bandung', latitude: -6.8845, longitude: 107.6130, tipe_kos: 'Putri', status_verifikasi: 'Aktif',
        fasilitas: ['WiFi', 'Kasur', 'Lemari', 'Laundry'], harga: [750000, 850000, 950000], kamarTerisi: 3 }, // penuh -> marker abu-abu
      { nama_kos: 'Kos Garuda Putra', alamat: 'Jl. Cisitu Lama No. 30', kota: 'Bandung', latitude: -6.8820, longitude: 107.6100, tipe_kos: 'Putra', status_verifikasi: 'Aktif',
        fasilitas: ['WiFi', 'Parkir Motor', 'Dapur Bersama'], harga: [600000, 700000, 800000], kamarTerisi: 1 },
      { nama_kos: 'Kos Anggrek (belum diverifikasi)', alamat: 'Jl. Sukajadi No. 5', kota: 'Cimahi', latitude: -6.8700, longitude: 107.5600, tipe_kos: 'Campur', status_verifikasi: 'Menunggu',
        fasilitas: ['WiFi'], harga: [650000, 700000], kamarTerisi: 0 },
    ];

    for (const k of daftarKos) {
      const kos = await prisma.kos.create({
        data: {
          owner_id: owner.user_id,
          nama_kos: k.nama_kos, alamat: k.alamat, kota: k.kota,
          latitude: k.latitude, longitude: k.longitude,
          tipe_kos: k.tipe_kos, status_verifikasi: k.status_verifikasi,
          fasilitas: { create: k.fasilitas.map((n) => ({ fasilitas_id: fas[n] })) },
          kamar: {
            create: k.harga.map((harga, i) => ({
              no_kamar: String(i + 1).padStart(2, '0'),
              tipe_kamar: i === 0 ? 'Standar' : 'Deluxe',
              harga,
              status_kamar: i < k.kamarTerisi ? 'Terisi' : 'Kosong',
            })),
          },
        },
      });
      console.log('Kos dibuat:', kos.nama_kos);
    }
  }

  console.log(`Seed selesai. Semua akun dummy memakai password: ${PASSWORD}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });