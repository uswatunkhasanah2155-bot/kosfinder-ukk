// src/components/FotoKos.jsx
import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

// Gambar dengan tampilan cadangan: jika file foto kosong atau gagal dimuat,
// tampil ikon pengganti (bukan ikon gambar rusak).
export default function FotoKos({ src, alt = '', className = '' }) {
  const [rusak, setRusak] = useState(false);

  // Reset status rusak bila alamat foto berganti (misalnya saat pindah foto di galeri)
  useEffect(() => {
    setRusak(false);
  }, [src]);

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
      onError={() => setRusak(true)}
    />
  );
}