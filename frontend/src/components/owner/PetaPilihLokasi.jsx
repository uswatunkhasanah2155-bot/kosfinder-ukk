import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { LocateFixed, MapPin, Search, X } from 'lucide-react';

// Pusat peta awal (tengah Indonesia) saat belum ada titik yang dipilih
const PUSAT_AWAL = [-2.5, 118];

// Layanan pencarian alamat gratis dari OpenStreetMap (Nominatim).
// Aturan pemakaian: maksimal 1 permintaan per detik dan tanpa pencarian otomatis saat mengetik,
// jadi pencarian hanya berjalan saat tombol Cari ditekan.
const URL_CARI = 'https://nominatim.openstreetmap.org/search';

// Pin merah gaya Google Maps (SVG di dalam divIcon, tidak butuh file gambar)
const ikonPin = L.divIcon({
  className: '', // hilangkan kotak putih bawaan divIcon
  html: `<svg width="36" height="46" viewBox="-1 -1 26 32" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 18 12 18s12-9 12-18C24 5.4 18.6 0 12 0z" fill="#db4437" stroke="#b3261e" stroke-width="1"/>
    <circle cx="12" cy="12" r="4.6" fill="#a52714"/>
  </svg>`,
  iconSize: [36, 46],
  iconAnchor: [18, 46], // ujung bawah pin tepat di titik koordinat
});

// Di bawah zoom ini satu piksel mewakili beberapa kilometer, jadi klik hanya memperbesar peta.
// Titik baru dipasang saat peta sudah cukup dekat (jalan dan bangunan terlihat).
const ZOOM_MIN_PILIH = 15;

// Hasil berupa wilayah luas (desa, kota, dan seterusnya) ditampilkan lebih jauh,
// hasil berupa bangunan atau jalan ditampilkan lebih dekat.
const JENIS_WILAYAH = new Set([
  'state', 'county', 'municipality', 'city', 'town', 'city_district',
  'suburb', 'village', 'hamlet', 'neighbourhood', 'quarter',
]);
const JENIS_BANGUNAN = new Set(['building', 'house', 'amenity', 'shop', 'office', 'tourism']);

const zoomUntuk = (h) => {
  if (JENIS_BANGUNAN.has(h.addresstype)) return 18;
  if (h.addresstype === 'road') return 17;
  if (JENIS_WILAYAH.has(h.addresstype)) return 14;
  return 16;
};

const namaHasil = (h) => h.name || h.display_name.split(',')[0];

function KlikPeta({ onPilih, onPerbesar }) {
  useMapEvents({
    click: (e) => {
      const peta = e.target;
      if (peta.getZoom() < ZOOM_MIN_PILIH) {
        peta.setView(e.latlng, 16);
        onPerbesar();
      } else {
        onPilih(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Menggeser peta ke titik tertentu (hasil pencarian atau tombol "Gunakan lokasi saya")
function PindahKe({ fokus }) {
  const map = useMap();
  useEffect(() => {
    if (fokus) map.setView(fokus.titik, fokus.zoom);
  }, [fokus, map]);
  return null;
}

// Owner mencari alamat, klik peta, atau geser pin; latitude dan longitude terisi otomatis
export default function PetaPilihLokasi({ latitude, longitude, onPilih, alamat = '', kota = '' }) {
  const [fokus, setFokus] = useState(null);
  const [galat, setGalat] = useState('');
  const [petunjuk, setPetunjuk] = useState('');
  const [query, setQuery] = useState('');
  const [hasil, setHasil] = useState([]);
  const [mencari, setMencari] = useState(false);
  const permintaan = useRef(null);

  useEffect(() => () => permintaan.current?.abort(), []);

  const lat = Number(latitude);
  const lng = Number(longitude);
  const adaTitik = latitude !== '' && longitude !== '' && Number.isFinite(lat) && Number.isFinite(lng);

  const jalankanCari = async (kata) => {
    const q = kata.trim();
    if (!q) return;

    permintaan.current?.abort();
    const ac = new AbortController();
    permintaan.current = ac;

    setMencari(true);
    setGalat('');
    setPetunjuk('');
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
        setGalat('Alamat tidak ditemukan. Coba nama jalan, kelurahan, atau kecamatan saja, atau klik langsung pada peta.');
      }
      setHasil(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setGalat('Pencarian gagal. Periksa koneksi internet Anda, atau klik langsung pada peta.');
      }
    } finally {
      if (permintaan.current === ac) setMencari(false);
    }
  };

  const kirimCari = (e) => {
    e.preventDefault();
    jalankanCari(query);
  };

  const pakaiAlamatForm = () => {
    const q = [alamat, kota].map((s) => s.trim()).filter(Boolean).join(', ');
    setQuery(q);
    jalankanCari(q);
  };

  const pilihHasil = (h) => {
    const la = Number(h.lat);
    const lo = Number(h.lon);
    onPilih(la, lo);
    setFokus({ titik: [la, lo], zoom: zoomUntuk(h) });
    setHasil([]);
    setQuery(namaHasil(h));
    setGalat('');
    setPetunjuk('Lokasi ditemukan. Perbesar peta dan geser pin sampai tepat di bangunan kos.');
  };

  const bersihkanCari = () => {
    permintaan.current?.abort();
    setQuery('');
    setHasil([]);
    setGalat('');
    setMencari(false);
  };

  const lokasiSaya = () => {
    setGalat('');
    if (!navigator.geolocation) {
      setGalat('Browser tidak mendukung lokasi. Gunakan pencarian atau klik langsung pada peta.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: la, longitude: lo } = pos.coords;
        onPilih(la, lo);
        setFokus({ titik: [la, lo], zoom: 17 });
        setPetunjuk('');
      },
      () => setGalat('Lokasi tidak bisa diakses. Gunakan pencarian atau klik langsung pada peta.')
    );
  };

  const bolehGunakanAlamat = alamat.trim() || kota.trim();

  return (
    <div>
      {/* KOTAK PENCARIAN */}
      <form onSubmit={kirimCari} className="mb-3">
        <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white py-1.5 pl-4 pr-1.5 shadow-sm transition focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-600/15">
          <Search className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari alamat atau nama tempat"
            aria-label="Cari alamat atau nama tempat"
            className="min-w-0 flex-1 bg-transparent py-2 text-base font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
          />
          {query && (
            <button
              type="button"
              onClick={bersihkanCari}
              aria-label="Hapus pencarian"
              className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={mencari || !query.trim()}
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mencari ? 'Mencari…' : 'Cari'}
          </button>
        </div>

        {bolehGunakanAlamat && (
          <button
            type="button"
            onClick={pakaiAlamatForm}
            disabled={mencari}
            className="mt-2 text-sm font-bold text-emerald-700 hover:underline disabled:opacity-50"
          >
            Cari dari alamat dan kota yang sudah diisi
          </button>
        )}
      </form>

      {/* HASIL PENCARIAN */}
      {hasil.length > 0 && (
        <ul className="mb-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {hasil.map((h) => (
            <li key={h.place_id}>
              <button
                type="button"
                onClick={() => pilihHasil(h)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-emerald-50"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{namaHasil(h)}</span>
                  <span className="block text-xs text-slate-500">{h.display_name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* PETA */}
      <div className="isolate overflow-hidden rounded-2xl border border-slate-300">
        <MapContainer
          center={adaTitik ? [lat, lng] : PUSAT_AWAL}
          zoom={adaTitik ? 16 : 5}
          scrollWheelZoom
          className="h-72 w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <KlikPeta
            onPilih={(la, lo) => {
              setPetunjuk('');
              onPilih(la, lo);
            }}
            onPerbesar={() => setPetunjuk('Peta diperbesar. Klik lagi pada lokasi kos yang tepat.')}
          />
          <PindahKe fokus={fokus} />
          {adaTitik && (
            <Marker
              position={[lat, lng]}
              icon={ikonPin}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const p = e.target.getLatLng();
                  onPilih(p.lat, p.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">
          {adaTitik
            ? `Titik terpilih: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
            : 'Cari alamat di atas, atau perbesar peta lalu klik lokasi kos'}
        </p>
        <button
          type="button"
          onClick={lokasiSaya}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <LocateFixed className="h-4 w-4 text-emerald-600" />
          Gunakan lokasi saya
        </button>
      </div>

      {adaTitik && !petunjuk && (
        <p className="mt-1 text-xs text-slate-500">Pin bisa digeser untuk menyesuaikan posisi.</p>
      )}
      {petunjuk && <p className="mt-2 text-sm font-semibold text-emerald-700">{petunjuk}</p>}
      {galat && <p className="mt-2 text-sm font-medium text-red-700">{galat}</p>}
    </div>
  );
}