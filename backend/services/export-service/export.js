import express from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import prisma from '../../lib/prisma.js';
import { verifyToken, checkRole } from '../../middleware/authMiddleware.js';
import { selesaikanBookingJikaPerlu } from '../../lib/bookingOtomatis.js';
import { NAMA_HARI, NAMA_BULAN, tanggalKata, hariIniWib } from '../../lib/tanggal.js';

const router = express.Router();

const aksesLaporan = [verifyToken, checkRole('Owner', 'Admin')];

const FORMAT = ['xlsx', 'csv', 'pdf'];
const TIPE_KOS = ['Putra', 'Putri', 'Campur'];
const STATUS_BOOKING = ['Menunggu', 'Disetujui', 'Ditolak', 'Selesai'];

// ===============================
// HELPER
// ===============================
const parseId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const rupiah = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

const waktuWib = (d) =>
  new Date(d).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' });

const labelStatusKamar = (s) => (s === 'DalamBooking' ? 'Dalam Booking' : s);

const bacaFilter = (query) => {
  const format = query.format || 'xlsx';
  if (!FORMAT.includes(format)) return { error: 'Format harus xlsx, csv, atau pdf' };

  const { kota, tipe, status } = query;
  if (tipe && !TIPE_KOS.includes(tipe)) return { error: 'Tipe kos harus Putra, Putri, atau Campur' };
  if (status && !STATUS_BOOKING.includes(status)) {
    return { error: 'Status booking harus Menunggu, Disetujui, Ditolak, atau Selesai' };
  }

  const kosWhere = {};
  if (kota) kosWhere.kota = { contains: String(kota), mode: 'insensitive' };
  if (tipe) kosWhere.tipe_kos = tipe;

  return { format, kota, tipe, status, kosWhere };
};

const kosWhereUntuk = (f, user) => ({
  ...f.kosWhere,
  ...(user.role === 'Owner' && { owner_id: user.user_id }),
});

const teksFilter = (f, denganStatus = false) => {
  const bagian = [];
  if (f.kota) bagian.push(`kota: ${f.kota}`);
  if (f.tipe) bagian.push(`tipe: ${f.tipe}`);
  if (denganStatus && f.status) bagian.push(`status: ${f.status}`);
  return bagian.length ? bagian.join(', ') : 'tanpa filter';
};

// ===============================
// PENGAMBIL DATA LAPORAN
// ===============================
const dataKos = async (f, user) => {
  const kos = await prisma.kos.findMany({
    where: kosWhereUntuk(f, user),
    include: {
      owner: { select: { nama: true } },
      fasilitas: { include: { fasilitas: true } },
      _count: { select: { kamar: true } },
    },
    orderBy: { kos_id: 'asc' },
  });

  return {
    namaFile: `data-kos-${hariIniWib()}`,
    judul: 'Laporan Data Kos',
    filterTeks: teksFilter(f),
    kolom: [
      { header: 'ID', key: 'kos_id', lebar: 6 },
      { header: 'Nama Kos', key: 'nama_kos', lebar: 22 },
      { header: 'Kota', key: 'kota', lebar: 12 },
      { header: 'Alamat', key: 'alamat', lebar: 30 },
      { header: 'Tipe', key: 'tipe_kos', lebar: 9 },
      { header: 'Status', key: 'status', lebar: 10 },
      { header: 'Pemilik', key: 'pemilik', lebar: 16 },
      { header: 'Kamar', key: 'jumlah_kamar', lebar: 7 },
      { header: 'Fasilitas', key: 'fasilitas', lebar: 28 },
    ],
    baris: kos.map((k) => ({
      kos_id: k.kos_id,
      nama_kos: k.nama_kos,
      kota: k.kota,
      alamat: k.alamat,
      tipe_kos: k.tipe_kos,
      status: k.status_verifikasi,
      pemilik: k.owner.nama,
      jumlah_kamar: k._count.kamar,
      fasilitas: k.fasilitas.map((x) => x.fasilitas.nama_fasilitas).join(', '),
    })),
  };
};

const dataKamar = async (f, user) => {
  const kamar = await prisma.kamar.findMany({
    where: { kos: kosWhereUntuk(f, user) },
    include: { kos: { select: { nama_kos: true, kota: true, tipe_kos: true } } },
    orderBy: [{ kos_id: 'asc' }, { no_kamar: 'asc' }],
  });

  return {
    namaFile: `data-kamar-${hariIniWib()}`,
    judul: 'Laporan Data Kamar',
    filterTeks: teksFilter(f),
    kolom: [
      { header: 'ID', key: 'kamar_id', lebar: 6 },
      { header: 'Nama Kos', key: 'nama_kos', lebar: 24 },
      { header: 'Kota', key: 'kota', lebar: 12 },
      { header: 'No. Kamar', key: 'no_kamar', lebar: 10 },
      { header: 'Tipe Kamar', key: 'tipe_kamar', lebar: 14 },
      { header: 'Harga / Bulan', key: 'harga', lebar: 16, format: 'rupiah' },
      { header: 'Status', key: 'status', lebar: 14 },
    ],
    baris: kamar.map((m) => ({
      kamar_id: m.kamar_id,
      nama_kos: m.kos.nama_kos,
      kota: m.kos.kota,
      no_kamar: m.no_kamar,
      tipe_kamar: m.tipe_kamar,
      harga: m.harga,
      status: labelStatusKamar(m.status_kamar),
    })),
  };
};

const dataBooking = async (f, user) => {
  const booking = await prisma.booking.findMany({
    where: {
      kamar: { kos: kosWhereUntuk(f, user) },
      ...(f.status && { status_booking: f.status }),
    },
    include: {
      kamar: { include: { kos: { select: { nama_kos: true, kota: true } } } },
      user: { select: { nama: true } },
    },
    orderBy: { dibuat_pada: 'desc' },
  });

  return {
    namaFile: `data-booking-${hariIniWib()}`,
    judul: 'Laporan Data Booking',
    filterTeks: teksFilter(f, true),
    kolom: [
      { header: 'Kode', key: 'kode', lebar: 11 },
      { header: 'Nama Kos', key: 'nama_kos', lebar: 22 },
      { header: 'Kota', key: 'kota', lebar: 11 },
      { header: 'Kamar', key: 'kamar', lebar: 14 },
      { header: 'Pemesan', key: 'pemesan', lebar: 16 },
      { header: 'Jenis', key: 'jenis', lebar: 8 },
      { header: 'Tanggal', key: 'tanggal', lebar: 11 },
      { header: 'Durasi (bln)', key: 'durasi', lebar: 8 },
      { header: 'Total Biaya', key: 'total', lebar: 14, format: 'rupiah' },
      { header: 'Status', key: 'status', lebar: 10 },
      { header: 'Dibuat', key: 'dibuat', lebar: 17 },
    ],
    baris: booking.map((b) => ({
      kode: `BOOK${String(b.booking_id).padStart(5, '0')}`,
      nama_kos: b.kamar.kos.nama_kos,
      kota: b.kamar.kos.kota,
      kamar: `${b.kamar.no_kamar} - ${b.kamar.tipe_kamar}`,
      pemesan: b.user.nama,
      jenis: b.jenis_booking,
      tanggal: b.tanggal_survey.toISOString().slice(0, 10),
      durasi: b.jenis_booking === 'Kamar' ? b.durasi_bulan : '',
      total: b.jenis_booking === 'Kamar' ? b.kamar.harga * b.durasi_bulan : '',
      status: b.status_booking,
      dibuat: waktuWib(b.dibuat_pada),
    })),
  };
};

// ===============================
// PENGIRIM FILE
// ===============================
const buatWorkbook = (namaSheet, kolom, baris) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Kos-Finder';
  wb.created = new Date();

  const ws = wb.addWorksheet(namaSheet.slice(0, 31));
  ws.columns = kolom.map((k) => ({ header: k.header, key: k.key, width: k.lebar }));
  ws.addRows(baris);

  kolom.forEach((k) => {
    if (k.format === 'rupiah') ws.getColumn(k.key).numFmt = '"Rp" #,##0';
  });

  const header = ws.getRow(1);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  return wb;
};

const kirimPdfTabel = (res, { namaFile, judul, filterTeks, kolom, baris }) => {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${namaFile}.pdf"`);
  doc.pipe(res);

  const kiri = doc.page.margins.left;
  const lebarTotal = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const batasBawah = doc.page.height - doc.page.margins.bottom;
  const bobot = kolom.reduce((a, k) => a + k.lebar, 0);
  const lebarKolom = kolom.map((k) => (k.lebar / bobot) * lebarTotal);
  const PAD = 4;

  const teksSel = (nilai, k) => {
    if (nilai === '' || nilai === null || nilai === undefined) return '-';
    return k.format === 'rupiah' ? rupiah(nilai) : String(nilai);
  };

  const tinggiBaris = (sel, tebal) => {
    doc.font(tebal ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
    const tinggi = sel.map((t, i) => doc.heightOfString(t, { width: lebarKolom[i] - PAD * 2 }));
    return Math.max(...tinggi) + PAD * 2;
  };

  const gambarBaris = (sel, y, tinggi, tebal) => {
    if (tebal) doc.rect(kiri, y, lebarTotal, tinggi).fill('#E5E7EB');
    doc.fillColor('#111827').font(tebal ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
    let x = kiri;
    sel.forEach((t, i) => {
      doc.text(t, x + PAD, y + PAD, { width: lebarKolom[i] - PAD * 2 });
      x += lebarKolom[i];
    });
    doc
      .moveTo(kiri, y + tinggi)
      .lineTo(kiri + lebarTotal, y + tinggi)
      .strokeColor('#D1D5DB')
      .lineWidth(0.5)
      .stroke();
  };

  doc.font('Helvetica-Bold').fontSize(16).fillColor('#111827').text(judul, kiri, doc.page.margins.top);
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#6B7280')
    .text(`Dicetak: ${waktuWib(new Date())} WIB  |  Filter: ${filterTeks}  |  Total: ${baris.length} data`);

  const judulKolom = kolom.map((k) => k.header);
  const tinggiHeader = tinggiBaris(judulKolom, true);
  let y = doc.y + 10;
  gambarBaris(judulKolom, y, tinggiHeader, true);
  y += tinggiHeader;

  for (const row of baris) {
    const sel = kolom.map((k) => teksSel(row[k.key], k));
    const tinggi = tinggiBaris(sel, false);

    if (y + tinggi > batasBawah) {
      doc.addPage();
      y = doc.page.margins.top;
      gambarBaris(judulKolom, y, tinggiHeader, true);
      y += tinggiHeader;
    }

    gambarBaris(sel, y, tinggi, false);
    y += tinggi;
  }

  if (!baris.length) {
    doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text('Tidak ada data untuk filter ini.', kiri, y + 10);
  }

  doc.end();
};

const kirimLaporan = async (res, format, laporan) => {
  const { namaFile, judul, kolom, baris } = laporan;

  if (format === 'pdf') return kirimPdfTabel(res, laporan);

  const wb = buatWorkbook(judul, kolom, baris);

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${namaFile}.csv"`);
    res.write('\uFEFF');
    await wb.csv.write(res);
    return res.end();
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${namaFile}.xlsx"`);
  await wb.xlsx.write(res);
  return res.end();
};

// ===============================
// ENDPOINT EKSPOR KOS, KAMAR, BOOKING
// ===============================
const daftarkanEkspor = (nama, ambilData) => {
  router.get(`/export/${nama}`, ...aksesLaporan, async (req, res) => {
    try {
      await selesaikanBookingJikaPerlu();

      const f = bacaFilter(req.query);
      if (f.error) return res.status(400).json({ success: false, message: f.error });

      const laporan = await ambilData(f, req.user);
      await kirimLaporan(res, f.format, laporan);
    } catch (error) {
      console.error(`ERROR EKSPOR ${nama.toUpperCase()}:`, error);

      if (res.headersSent) return res.end();
      res.status(500).json({
        success: false,
        message: 'Gagal membuat file ekspor',
        error: error.message,
      });
    }
  });
};

daftarkanEkspor('kos', dataKos);
daftarkanEkspor('kamar', dataKamar);
daftarkanEkspor('booking', dataBooking);

// ===============================
// DOWNLOAD SELURUH DATA (Admin dan Owner)
// ===============================
const nilaiSel = (v) => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'object') {
    return typeof v.toNumber === 'function' ? v.toNumber() : JSON.stringify(v);
  }
  return v;
};

const dataUntukBackup = async (userLogin) => {
  const admin = userLogin.role === 'Admin';

  const kos = await prisma.kos.findMany({
    where: admin ? {} : { owner_id: userLogin.user_id },
    orderBy: { kos_id: 'asc' },
  });

  const kosIds = kos.map((k) => k.kos_id);

  const [fotoKos, kosFasilitas, kamar] = await Promise.all([
    prisma.fotoKos.findMany({
      where: admin ? {} : { kos_id: { in: kosIds } },
      orderBy: { foto_id: 'asc' },
    }),
    prisma.kosFasilitas.findMany({
      where: admin ? {} : { kos_id: { in: kosIds } },
    }),
    prisma.kamar.findMany({
      where: admin ? {} : { kos_id: { in: kosIds } },
      orderBy: { kamar_id: 'asc' },
    }),
  ]);

  const fasilitasIds = [...new Set(kosFasilitas.map((item) => item.fasilitas_id))];
  const kamarIds = kamar.map((item) => item.kamar_id);

  const [fasilitas, booking] = await Promise.all([
    prisma.fasilitas.findMany({
      where: admin ? {} : { fasilitas_id: { in: fasilitasIds } },
      orderBy: { fasilitas_id: 'asc' },
    }),
    prisma.booking.findMany({
      where: admin ? {} : { kamar_id: { in: kamarIds } },
      orderBy: { booking_id: 'asc' },
    }),
  ]);

  const bookingIds = booking.map((item) => item.booking_id);

  const review = await prisma.review.findMany({
    where: admin ? {} : { booking_id: { in: bookingIds } },
    orderBy: { review_id: 'asc' },
  });

  let user;
  if (admin) {
    user = await prisma.user.findMany({
      select: {
        user_id: true,
        nama: true,
        email: true,
        role: true,
        no_wa: true,
        status_verifikasi: true,
      },
      orderBy: { user_id: 'asc' },
    });
  } else {
    const userIds = [...new Set([userLogin.user_id, ...booking.map((item) => item.user_id)])];
    user = await prisma.user.findMany({
      where: { user_id: { in: userIds } },
      select: { user_id: true, nama: true, no_wa: true, role: true },
      orderBy: { user_id: 'asc' },
    });
  }

  return [
    { nama: 'user', data: user },
    { nama: 'kos', data: kos },
    { nama: 'foto_kos', data: fotoKos },
    { nama: 'fasilitas', data: fasilitas },
    { nama: 'kos_fasilitas', data: kosFasilitas },
    { nama: 'kamar', data: kamar },
    { nama: 'booking', data: booking },
    { nama: 'review', data: review },
  ];
};

const tambahSheet = (wb, nama, data) => {
  const ws = wb.addWorksheet(nama);

  if (!data.length) {
    ws.addRow(['(tidak ada data)']);
    return;
  }

  const kunci = Object.keys(data[0]);
  ws.columns = kunci.map((k) => ({
    header: k,
    key: k,
    width: Math.min(35, Math.max(12, k.length + 4)),
  }));

  data.forEach((item) => {
    ws.addRow(Object.fromEntries(kunci.map((k) => [k, nilaiSel(item[k])])));
  });

  const header = ws.getRow(1);
  header.font = { bold: true };
  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
};

const kirimBackupXlsx = async (res, semuaData, namaFile) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Kos-Finder';
  wb.created = new Date();

  semuaData.forEach(({ nama, data }) => tambahSheet(wb, nama, data));

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${namaFile}.xlsx"`);
  await wb.xlsx.write(res);
  return res.end();
};

const kirimBackupCsv = (res, semuaData, namaFile) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${namaFile}.csv"`);
  res.write('\uFEFF');
  res.write('nama_tabel,data_json\r\n');

  semuaData.forEach(({ nama, data }) => {
    if (!data.length) {
      res.write(`${JSON.stringify(nama)},"(tidak ada data)"\r\n`);
      return;
    }

    data.forEach((item) => {
      const isi = Object.fromEntries(
        Object.entries(item).map(([k, v]) => [k, nilaiSel(v)])
      );
      res.write(`${JSON.stringify(nama)},${JSON.stringify(JSON.stringify(isi))}\r\n`);
    });
  });

  return res.end();
};

const kirimBackupPdf = (res, semuaData, namaFile, role) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${namaFile}.pdf"`);
  doc.pipe(res);

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#111827')
    .text('BACKUP SELURUH DATA KOSFINDER', { align: 'center' });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(9).fillColor('#6B7280')
    .text(`Diunduh: ${waktuWib(new Date())} WIB | Role: ${role}`, { align: 'center' });
  doc.moveDown(1.5);

  semuaData.forEach(({ nama, data }) => {
    if (doc.y > 730) doc.addPage();

    doc.font('Helvetica-Bold').fontSize(13).fillColor('#111827')
      .text(`${nama.toUpperCase()} (${data.length} data)`);
    doc.moveDown(0.4);

    if (!data.length) {
      doc.font('Helvetica').fontSize(9).fillColor('#6B7280')
        .text('Tidak ada data pada tabel ini.');
      doc.moveDown(1);
      return;
    }

    data.forEach((item, index) => {
      const isi = Object.fromEntries(
        Object.entries(item).map(([k, v]) => [k, nilaiSel(v)])
      );
      const teks = `${index + 1}. ${JSON.stringify(isi)}`;

      const tinggi = doc.heightOfString(teks, { width: 510, fontSize: 8 }) + 8;
      if (doc.y + tinggi > 790) {
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827')
          .text(`LANJUTAN ${nama.toUpperCase()}`);
        doc.moveDown(0.4);
      }

      doc.font('Helvetica').fontSize(8).fillColor('#374151')
        .text(teks, { width: 510 });
      doc.moveDown(0.3);
    });

    doc.moveDown(1);
  });

  doc.end();
};

// ===============================
// ROUTE DOWNLOAD SELURUH DATA
// ===============================
router.get('/export/backup', ...aksesLaporan, async (req, res) => {
  try {
    await selesaikanBookingJikaPerlu();

    const format = String(req.query.format || 'xlsx').toLowerCase();

    if (!FORMAT.includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Format harus xlsx, csv, atau pdf',
      });
    }

    const semuaData = await dataUntukBackup(req.user);
    const namaFile = `backup-kosfinder-${hariIniWib()}`;

    if (format === 'csv') {
      return kirimBackupCsv(res, semuaData, namaFile);
    }

    if (format === 'pdf') {
      return kirimBackupPdf(res, semuaData, namaFile, req.user.role);
    }

    return await kirimBackupXlsx(res, semuaData, namaFile);
  } catch (error) {
    console.error('ERROR BACKUP:', error);

    if (res.headersSent) return res.end();

    return res.status(500).json({
      success: false,
      message: 'Gagal membuat backup data',
      error: error.message,
    });
  }
});

// ===============================
// BUKTI KONFIRMASI BOOKING (PDF)
// ===============================
router.get('/booking/:id/bukti', verifyToken, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID tidak valid' });

    await selesaikanBookingJikaPerlu();

    const b = await prisma.booking.findUnique({
      where: { booking_id: id },
      include: {
        user: { select: { nama: true } },
        kamar: {
          include: { kos: { include: { owner: { select: { nama: true } } } } },
        },
      },
    });

    const boleh =
      b &&
      (req.user.role === 'Admin' ||
        b.user_id === req.user.user_id ||
        b.kamar.kos.owner_id === req.user.user_id);

    if (!boleh) {
      return res.status(404).json({
        success: false,
        message: 'Booking tidak ditemukan',
      });
    }

    if (!['Disetujui', 'Selesai'].includes(b.status_booking)) {
      return res.status(400).json({
        success: false,
        message: 'Bukti konfirmasi hanya tersedia untuk booking yang sudah Disetujui atau Selesai',
      });
    }

    const kode = `BOOK${String(b.booking_id).padStart(5, '0')}`;
    const nomor = `KOS/BKG-01/${kode}`;
    const t = tanggalKata(b.tanggal_survey);
    const tgl = b.tanggal_survey;
    const tanggalAngka = `${NAMA_HARI[tgl.getUTCDay()]}, ${tgl.getUTCDate()} ${NAMA_BULAN[tgl.getUTCMonth()]} ${tgl.getUTCFullYear()}`;
    const jenisKamar = b.jenis_booking === 'Kamar';

    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bukti-${kode}.pdf"`);
    doc.pipe(res);

    const kiri = doc.page.margins.left;
    const lebar = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const campur = (bagian) => {
      bagian.forEach(([teks, tebal], i) => {
        doc.font(tebal ? 'Helvetica-Bold' : 'Helvetica').fontSize(11);
        doc.text(teks, { continued: i < bagian.length - 1 });
      });
    };

    doc.fillColor('#111827').font('Helvetica').fontSize(10)
      .text(nomor, kiri, doc.page.margins.top);
    doc.moveDown(1.5);

    doc.font('Helvetica-Bold').fontSize(14)
      .text('BUKTI KONFIRMASI BOOKING', { align: 'center' });
    doc.fontSize(12).text(jenisKamar ? 'SEWA KOS' : 'SURVEY KOS', { align: 'center' });
    doc.moveDown(1.5);

    campur([
      ['Pada hari ini ', false],
      [t.hari, true],
      [' tanggal ', false],
      [t.tanggal, true],
      [' bulan ', false],
      [t.bulan, true],
      [' tahun ', false],
      [t.tahun, true],
      [', telah dilakukan konfirmasi booking antara pihak ', false],
      ['PEMILIK KOS', true],
      [' dengan ', false],
      ['PENCARI KOS', true],
      [' melalui Aplikasi Pencarian dan Pemesanan Kos Berbasis Peta. Adapun rincian booking sebagai berikut :', false],
    ]);
    doc.moveDown(1);

    const lebarKolom = [36, 180, lebar - 36 - 180 - 90, 90];
    const judulKolom = ['No.', 'Nama Kos', 'Kamar', 'Status'];
    const isiKolom = [
      '1.',
      b.kamar.kos.nama_kos,
      `No. ${b.kamar.no_kamar} - Tipe ${b.kamar.tipe_kamar}`,
      b.status_booking,
    ];
    const PAD = 6;

    const tinggiBaris = (sel, tebal) => {
      doc.font(tebal ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
      return Math.max(
        ...sel.map((s, i) =>
          doc.heightOfString(s, { width: lebarKolom[i] - PAD * 2 })
        )
      ) + PAD * 2;
    };

    const gambarBaris = (sel, y, tebal) => {
      const tinggi = tinggiBaris(sel, tebal);
      let x = kiri;

      sel.forEach((s, i) => {
        doc.rect(x, y, lebarKolom[i], tinggi)
          .strokeColor('#111827')
          .lineWidth(0.7)
          .stroke();

        doc.fillColor('#111827')
          .font(tebal ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(10);

        doc.text(s, x + PAD, y + PAD, {
          width: lebarKolom[i] - PAD * 2,
        });

        x += lebarKolom[i];
      });

      return tinggi;
    };

    let y = doc.y;
    y += gambarBaris(judulKolom, y, true);
    y += gambarBaris(isiKolom, y, false);

    doc.x = kiri;
    doc.y = y + 14;

    const baris = [
      ['Kode booking', kode],
      ['Jenis booking', b.jenis_booking],
      [jenisKamar ? 'Tanggal mulai sewa' : 'Tanggal survey', tanggalAngka],
    ];

    if (jenisKamar) {
      baris.push(['Durasi sewa', `${b.durasi_bulan} bulan`]);
      baris.push(['Total biaya', rupiah(b.kamar.harga * b.durasi_bulan)]);
    }

    baris.forEach(([label, nilai]) => {
      const yBaris = doc.y;
      doc.font('Helvetica').fontSize(10)
        .text(label, kiri, yBaris, { width: 130 });
      doc.text(`:  ${nilai}`, kiri + 130, yBaris, {
        width: lebar - 130,
      });
    });

    doc.moveDown(1.2);
    doc.font('Helvetica').fontSize(11).text(
      'Demikian bukti konfirmasi booking ini dibuat dengan sebenar-benarnya dan berlaku sebagai bukti sah persetujuan kedua belah pihak.',
      kiri,
      doc.y,
      { width: lebar }
    );

    const yTtd = doc.y + 28;
    const lebarTtd = 200;
    const xKanan = kiri + lebar - lebarTtd;

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('Pemilik Kos', kiri, yTtd, {
      width: lebarTtd,
      align: 'center',
    });
    doc.text('Pencari Kos', xKanan, yTtd, {
      width: lebarTtd,
      align: 'center',
    });

    doc.font('Helvetica').fontSize(11);
    doc.text(`Nama : ${b.kamar.kos.owner.nama}`, kiri, yTtd + 80, {
      width: lebarTtd,
      align: 'center',
    });
    doc.text(`Nama : ${b.user.nama}`, xKanan, yTtd + 80, {
      width: lebarTtd,
      align: 'center',
    });

    doc.end();
  } catch (error) {
    console.error('ERROR BUKTI BOOKING:', error);

    if (res.headersSent) return res.end();

    res.status(500).json({
      success: false,
      message: 'Gagal membuat bukti konfirmasi',
      error: error.message,
    });
  }
});

export default router;