import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ==================================================
// UPLOAD FOTO KE CLOUDINARY
// Mengembalikan PATH SAJA, tanpa https://res.cloudinary.com/...
// Contoh hasil: "galeri/galeri-1790220136494-305705933.png"
// Path inilah yang disimpan di database.
// ==================================================
export function uploadFoto(file, folder) {
  return new Promise((resolve, reject) => {
    const nama = `${folder}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: `${folder}/${nama}`,
        resource_type: 'image',
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(`${result.public_id}.${result.format}`);
      }
    );

    stream.end(file.buffer);
  });
}

// ==================================================
// HAPUS FOTO
// - Path Cloudinary  ("galeri/xxx.png")  -> dihapus dari Cloudinary
// - Path lama lokal  ("/uploads/xxx.jpg") -> dihapus dari folder uploads
// - URL http(s) penuh                    -> diabaikan
// Tidak pernah melempar error supaya proses utama tidak gagal.
// ==================================================
export async function hapusFoto(fotoPath) {
  if (!fotoPath) return;

  const p = String(fotoPath).trim();

  if (/^https?:\/\//i.test(p)) return;

  try {
    // Data lama: file masih di folder uploads
    if (/^\/?uploads\//.test(p)) {
      const full = path.join(process.cwd(), p.replace(/^\/+/, ''));
      if (fs.existsSync(full)) fs.unlinkSync(full);
      return;
    }

    // Data baru: hapus dari Cloudinary (public_id = path tanpa ekstensi)
    const publicId = p.replace(/^\/+/, '').replace(/\.[^/.]+$/, '');
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
  } catch (error) {
    console.error('Gagal menghapus foto:', p, error.message);
  }
}

export default cloudinary;