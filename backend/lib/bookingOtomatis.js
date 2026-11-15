import prisma from './prisma.js';
import { hariIniWib, keTanggal, tambahBulan } from './tanggal.js';

// Dua tugas otomatis untuk booking jenis Kamar / Survey yang sudah Disetujui:
//
// 1. SELESAI  : booking Disetujui menjadi Selesai jika masanya sudah lewat
//               - Survey : setelah tanggal survey terlewati
//               - Kamar  : setelah tanggal mulai + durasi_bulan terlewati
//               Kamar yang terkait (DalamBooking / Terisi) dikembalikan menjadi Kosong.
//
// 2. SEWA MULAI: booking Kamar Disetujui yang tanggal mulainya sudah tiba
//               mengubah kamar dari DalamBooking menjadi Terisi.
//
// Urutan penting: tugas 1 dulu, supaya sewa yang sudah berakhir tidak sempat
// ditandai Terisi lagi oleh tugas 2.
export const selesaikanBookingKedaluwarsa = async () => {
  try {
    const hariIni = hariIniWib();
    const awalHariIni = new Date(`${hariIni}T00:00:00.000Z`);

    // ---------- 1. Selesaikan booking yang masanya sudah lewat ----------
    // Kandidat: tanggal mulai sudah lewat (yang belum pasti lewat disaring di bawah)
    const kandidat = await prisma.booking.findMany({
      where: {
        status_booking: 'Disetujui',
        tanggal_survey: { lt: awalHariIni },
      },
      select: {
        booking_id: true,
        jenis_booking: true,
        kamar_id: true,
        tanggal_survey: true,
        durasi_bulan: true,
      },
    });

    const kedaluwarsa = kandidat.filter((b) => {
      const berakhir =
        b.jenis_booking === 'Kamar' ? tambahBulan(b.tanggal_survey, b.durasi_bulan) : b.tanggal_survey;
      return keTanggal(berakhir) < hariIni;
    });

    for (const b of kedaluwarsa) {
      await prisma.$transaction(async (tx) => {
        // updateMany bersyarat: aman jika Owner baru saja menyelesaikannya secara manual
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

    // ---------- 2. Sewa yang tanggal mulainya sudah tiba -> kamar Terisi ----------
    // (booking yang baru saja Selesai di langkah 1 sudah tidak berstatus Disetujui)
    const mulai = await prisma.booking.findMany({
      where: {
        status_booking: 'Disetujui',
        jenis_booking: 'Kamar',
        tanggal_survey: { lte: awalHariIni },
      },
      select: { kamar_id: true },
    });

    let kamarTerisi = 0;
    if (mulai.length) {
      const hasil = await prisma.kamar.updateMany({
        where: {
          kamar_id: { in: [...new Set(mulai.map((b) => b.kamar_id))] },
          status_kamar: 'DalamBooking',
        },
        data: { status_kamar: 'Terisi' },
      });
      kamarTerisi = hasil.count;
    }

    if (kedaluwarsa.length || kamarTerisi) {
      console.log(`Otomatis: ${kedaluwarsa.length} booking Selesai, ${kamarTerisi} kamar menjadi Terisi`);
    }
    return kedaluwarsa.length;
  } catch (error) {
    // Jangan sampai kegagalan tugas latar menjatuhkan server atau request
    console.error('ERROR SELESAI OTOMATIS:', error);
    return 0;
  }
};

// Versi "jalankan paling sering sekali per menit", untuk dipanggil di awal endpoint GET
let terakhirJalan = 0;
export const selesaikanBookingJikaPerlu = async () => {
  if (Date.now() - terakhirJalan < 60 * 1000) return;
  terakhirJalan = Date.now();
  await selesaikanBookingKedaluwarsa();
};