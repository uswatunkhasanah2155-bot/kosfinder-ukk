import multer from 'multer';

// File ditahan di memori lalu dikirim ke Cloudinary (tidak disimpan di folder uploads)
const storage = multer.memoryStorage();

// Filter jenis file (opsional, contoh untuk gambar)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diizinkan!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // Batas ukuran 2MB
});

export default upload;