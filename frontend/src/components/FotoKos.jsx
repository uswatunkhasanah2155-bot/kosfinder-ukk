// src/components/FotoKos.jsx
import { useState } from 'react';
import { ImageOff } from 'lucide-react';

// Gambar dengan tampilan cadangan: jika file foto kosong atau gagal dimuat,
// tampil ikon pengganti (bukan ikon gambar rusak).
export default function FotoKos({ src, alt = '', className = '' }) {
  // Simpan sumber yang gagal, bukan boolean. Dengan begitu status "rusak"
  // otomatis hilang saat src berganti tanpa perlu useEffect + setState.
  const [sumberRusak, setSumberRusak] = useState(null);
  const rusak = sumberRusak === src;

  if (!src || rusak) {
    return (
      <div
        role="img"
        aria-label={alt ? `${alt} (foto tidak tersedia)` : 'Foto tidak tersedia'}
        className={`${className} flex items-center justify-center bg-slate-100 text-slate-400`}
      >
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setSumberRusak(src)}
    />
  );
}