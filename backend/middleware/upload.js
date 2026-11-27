import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Folder tujuan penyimpanan file foto selalu di backend/uploads
export const uploadDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi penyimpanan lokal menggunakan diskStorage multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate nama file unik: kos-<timestamp>-<random><ekstensi>
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `kos-${uniqueSuffix}${ext}`);
  },
});

// Filter jenis file (hanya file gambar)
const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diizinkan!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // Batas ukuran 2MB
});

// ==================================================
// HAPUS FOTO
// Menghapus file foto fisik dari folder backend/uploads
// Tidak pernah melempar error agar proses utama tidak gagal
// ==================================================
export function hapusFoto(fotoPath) {
  if (!fotoPath) return;

  const p = String(fotoPath).trim();
  if (/^https?:\/\//i.test(p)) return;

  try {
    const clean = p.replace(/^\/+/, '');
    const filenameOnly = clean.replace(/^uploads\/?/, '');

    const filePath = path.resolve(uploadDir, filenameOnly);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return;
    }

    const fallbackPath = path.resolve(process.cwd(), clean);
    if (fs.existsSync(fallbackPath)) {
      fs.unlinkSync(fallbackPath);
    }
  } catch (error) {
    console.error('Gagal menghapus file foto lokal:', p, error.message);
  }
}

export default upload;
