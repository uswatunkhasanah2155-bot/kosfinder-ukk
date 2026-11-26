// src/components/map/PetaKos.jsx
// Peta Leaflet + OpenStreetMap untuk landing page (tanpa API key).
// Semua state (filter, titik acuan) dipegang halaman induk; komponen ini hanya menggambar peta.
// Pencarian alamat (Nominatim) ditangani di dalam komponen ini: mengetik "Bandung" lalu Cari
// akan memindahkan peta ke Bandung, dan memilih salah satu hasil menjadikannya titik acuan.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css'; // wajib: tanpa ini peta tidak bisa digeser/di-zoom dengan benar
import FotoKos from '../FotoKos';
import { rupiah, fotoUrl, fmtJarak } from '../../utils/kos';

// Layanan pencarian alamat gratis dari OpenStreetMap (Nominatim).
// Aturan pemakaian: maksimal 1 permintaan per detik dan tanpa pencarian otomatis saat mengetik,
// jadi pencarian hanya berjalan saat tombol Cari ditekan.
const URL_CARI = 'https://nominatim.openstreetmap.org/search';

// Bentuk pin lokasi (SVG). Ujung bawah = titik koordinat.
const pinSvg = (warna) =>
  `<svg viewBox="0 0 24 36" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))">
    <path d="M12 1C5.9 1 1 5.9 1 12c0 8.3 11 23 11 23s11-14.7 11-23C23 5.9 18.1 1 12 1z" fill="${warna}" stroke="#fff" stroke-width="2"/>
    <circle cx="12" cy="12" r="4.5" fill="#fff"/>
  </svg>`;

const buatPin = (warna, lebar) => {
  const tinggi = Math.round(lebar * 1.5);
  return L.divIcon({
    className: '',
    iconSize: [lebar, tinggi],
    iconAnchor: [lebar / 2, tinggi], // ujung bawah pin tepat di koordinat
    popupAnchor: [0, -tinggi + 6],   // popup muncul di atas pin
    html: pinSvg(warna),
  });
};

// Hijau = ada kamar kosong, abu-abu = penuh (sesuai soal)
const pin = (tersedia, aktif) => buatPin(tersedia ? '#059669' : '#94a3b8', aktif ? 38 : 30);

const pinAcuan = buatPin('#0f172a', 34);

function IkonLegenda({ warna }) {
  return (
    <svg width="12" height="18" viewBox="0 0 24 36" aria-hidden="true">
      <path d="M12 1C5.9 1 1 5.9 1 12c0 8.3 11 23 11 23s11-14.7 11-23C23 5.9 18.1 1 12 1z" fill={warna} />
      <circle cx="12" cy="12" r="4.5" fill="#fff" />
    </svg>
  );
}

// Hasil berupa wilayah luas (kota, kecamatan, dan seterusnya) ditampilkan lebih jauh,
// hasil berupa bangunan atau jalan ditampilkan lebih dekat.
const JENIS_WILAYAH = new Set([
  'state', 'county', 'municipality', 'city', 'town', 'city_district',
  'suburb', 'village', 'hamlet', 'neighbourhood', 'quarter',
]);
const JENIS_BANGUNAN = new Set(['building', 'house', 'amenity', 'shop', 'office', 'tourism']);

const zoomUntuk = (h) => {
  if (JENIS_BANGUNAN.has(h.addresstype)) return 18;
  if (h.addresstype === 'road') return 17;
  if (JENIS_WILAYAH.has(h.addresstype)) return 13;
  return 15;
};

const namaHasil = (h) => h.name || h.display_name.split(',')[0];

function KlikPeta({ onPilih }) {
  useMapEvents({ click: (e) => onPilih({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function TerbangKe({ fokus }) {
  const map = useMap();
  useEffect(() => { if (fokus) map.flyTo(fokus.pos, fokus.zoom, { duration: 0.8 }); }, [fokus, map]);
  return null;
}

/**
 * daftar        : kos yang sudah difilter (punya lat, lng, kosong, jarak, fotos, ...)
 * acuan         : {lat, lng} | null
 * onPilihAcuan  : dipanggil saat peta diklik atau hasil pencarian dipilih
 * radiusKm      : 0 = tanpa lingkaran
 * fokus         : {pos:[lat,lng], zoom} untuk menggeser peta
 * aktif/onAktif : sorotan dua arah dengan daftar kartu
 * onAjukan      : (kos) => void
 */
export default function PetaKos({ daftar, acuan, onPilihAcuan, radiusKm = 0, fokus, aktif, onAktif, onAjukan }) {
  const [fokusCari, setFokusCari] = useState(null);
  const [query, setQuery] = useState('');
  const [hasil, setHasil] = useState([]);
  const [mencari, setMencari] = useState(false);
  const [galat, setGalat] = useState('');
  const permintaan = useRef(null);

  useEffect(() => () => permintaan.current?.abort(), []);

  const cari = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    permintaan.current?.abort();
    const ac = new AbortController();
    permintaan.current = ac;

    setMencari(true);
    setGalat('');
    setHasil([]);

    try {
      const params = new URLSearchParams({
        q,
        format: 'jsonv2',
        countrycodes: 'id', // aplikasi ini untuk kos di Indonesia
        limit: '5',
        'accept-language': 'id',
      });
      const res = await fetch(`${URL_CARI}?${params}`, { signal: ac.signal });
      if (!res.ok) throw new Error('gagal');
      const data = await res.json();

      if (data.length === 0) {
        setGalat('Lokasi tidak ditemukan. Coba nama kota, kecamatan, atau kampus saja.');
      } else {
        // Peta langsung pindah ke hasil teratas. Titik acuan baru dipasang
        // kalau pengguna memilih salah satu hasil atau mengklik peta.
        const pertama = data[0];
        setFokusCari({ pos: [Number(pertama.lat), Number(pertama.lon)], zoom: zoomUntuk(pertama) });
      }
      setHasil(data);
    } catch (err) {
      if (err.name !== 'AbortError') setGalat('Pencarian gagal. Periksa koneksi internet Anda.');
    } finally {
      if (permintaan.current === ac) setMencari(false);
    }
  };

  const pilihHasil = (h) => {
    const lat = Number(h.lat);
    const lng = Number(h.lon);
    setFokusCari({ pos: [lat, lng], zoom: zoomUntuk(h) });
    onPilihAcuan({ lat, lng });
    setQuery(namaHasil(h));
    setHasil([]);
    setGalat('');
  };

  const bersihkan = () => {
    permintaan.current?.abort();
    setQuery('');
    setHasil([]);
    setGalat('');
    setMencari(false);
  };

  return (
    <div className="relative z-0 h-full w-full">
      <MapContainer center={[-2.5, 118]} zoom={5} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <TerbangKe fokus={fokus} />
        <TerbangKe fokus={fokusCari} />
        <KlikPeta onPilih={onPilihAcuan} />

        {acuan && (
          <>
            <Marker position={[acuan.lat, acuan.lng]} icon={pinAcuan}><Popup>Titik acuan</Popup></Marker>
            {radiusKm > 0 && <Circle center={[acuan.lat, acuan.lng]} radius={radiusKm * 1000} pathOptions={{ color: '#059669', weight: 2, dashArray: '6 6', fillOpacity: 0.07 }} />}
          </>
        )}

        {daftar.map((k) => {
          const src = fotoUrl(k.fotos[0]);
          return (
            <Marker
              key={k.id}
              position={[k.lat, k.lng]}
              icon={pin(k.kosong > 0, aktif === k.id)}
              eventHandlers={{ mouseover: () => onAktif(k.id), mouseout: () => onAktif(null) }}
            >
              <Popup minWidth={230}>
                {src && <FotoKos src={src} alt={k.nama} className="mb-2 h-28 w-full rounded-lg object-cover" />}
                <b className="text-base">{k.nama}</b>
                <div className="text-sm text-slate-600">
                  Mulai {k.harga ? rupiah(k.harga) : '-'}/bulan{k.jarak != null && ` · ${fmtJarak(k.jarak)} dari titik acuan`}
                </div>
                <div className="mt-2 flex gap-2">
                  <Link to={`/kos/${k.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-800">Lihat detail</Link>
                  <button onClick={() => onAjukan(k)} disabled={k.kosong === 0} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50">
                    {k.kosong > 0 ? 'Ajukan sewa' : 'Penuh'}
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* PENCARIAN LOKASI (left-14 supaya tidak menimpa tombol zoom bawaan Leaflet) */}
      <div className="absolute left-14 right-3 top-3 z-500 sm:right-auto sm:w-96">
        <form onSubmit={cari}>
          <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white py-1 pl-4 pr-1 shadow-md transition focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-600/15">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kota, kampus, atau alamat"
              aria-label="Cari lokasi di peta"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-sm font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={bersihkan}
                aria-label="Hapus pencarian"
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={mencari || !query.trim()}
              className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mencari ? 'Mencari…' : 'Cari'}
            </button>
          </div>
        </form>

        {hasil.length > 0 && (
          <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
            {hasil.map((h) => (
              <li key={h.place_id}>
                <button
                  type="button"
                  onClick={() => pilihHasil(h)}
                  className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-emerald-50"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-900">{namaHasil(h)}</span>
                    <span className="block truncate text-xs text-slate-500">{h.display_name}</span>
                  </span>
                </button>
              </li>
            ))}
            <li className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
              Pilih hasil untuk dijadikan titik acuan jarak
            </li>
          </ul>
        )}

        {galat && (
          <p className="mt-2 rounded-xl bg-white/95 px-4 py-2 text-sm font-medium text-red-700 shadow-md">{galat}</p>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-500 flex flex-wrap gap-x-4 gap-y-1 rounded-xl bg-white/95 px-4 py-2 text-sm font-semibold text-slate-700 shadow">
        <span className="flex items-center gap-2"><IkonLegenda warna="#059669" /> Ada kamar kosong</span>
        <span className="flex items-center gap-2"><IkonLegenda warna="#94a3b8" /> Penuh</span>
        <span className="flex items-center gap-2"><IkonLegenda warna="#0f172a" /> Titik acuan</span>
      </div>
    </div>
  );
}