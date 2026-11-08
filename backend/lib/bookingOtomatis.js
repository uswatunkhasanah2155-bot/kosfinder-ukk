import prisma from './prisma.js';
import { hariIniWib, keTanggal, tambahBulan } from './tanggal.js';

// Booking berstatus Disetujui otomatis menjadi Selesai jika masanya sudah lewat:
// - Survey : setelah tanggal survey terlewati
// - Kamar  : setelah tanggal mulai + durasi_bulan terlewati
// Kamar yang tadinya Terisi karena booking itu dikembalikan menjadi Kosong.
export const selesaikanBookingKedaluwarsa = async () => {
  try {
    const hariIni = hariIniWib();

    // Kandidat: tanggal mulai sudah lewat (yang belum pasti lewat disaring di bawah)
    const kandidat = await prisma.booking.findMany({
      where: {
        status_booking: 'Disetujui',
        tanggal_survey: { lt: new Date(`${hariIni}T00:00:00.000Z`) },
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
            where: { kamar_id: b.kamar_id, status_kamar: 'Terisi' },
            data: { status_kamar: 'Kosong' },
          });
        }
      });
    }

    if (kedaluwarsa.length) {
      console.log(`Otomatis: ${kedaluwarsa.length} booking ditandai Selesai`);
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