import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import { LocateFixed } from 'lucide-react';

// Pusat peta awal (tengah Indonesia) saat belum ada titik yang dipilih
const PUSAT_AWAL = [-2.5, 118];

function KlikPeta({ onPilih }) {
  useMapEvents({ click: (e) => onPilih(e.latlng.lat, e.latlng.lng) });
  return null;
}

// Menggeser peta ke titik tertentu (dipakai tombol "Lokasi saya")
function PindahKe({ titik }) {
  const map = useMap();
  useEffect(() => {
    if (titik) map.setView(titik, 17);
  }, [titik, map]);
  return null;
}

// Owner klik peta, lalu latitude dan longitude terisi otomatis
export default function PetaPilihLokasi({ latitude, longitude, onPilih }) {
  const [fokus, setFokus] = useState(null);
  const [galat, setGalat] = useState('');

  const lat = Number(latitude);
  const lng = Number(longitude);
  const adaTitik = latitude !== '' && longitude !== '' && Number.isFinite(lat) && Number.isFinite(lng);

  const lokasiSaya = () => {
    setGalat('');
    if (!navigator.geolocation) {
      setGalat('Browser tidak mendukung lokasi. Klik langsung pada peta.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: la, longitude: lo } = pos.coords;
        onPilih(la, lo);
        setFokus([la, lo]);
      },
      () => setGalat('Lokasi tidak bisa diakses. Klik langsung pada peta.')
    );
  };

  return (
    <div>
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
          <KlikPeta onPilih={onPilih} />
          <PindahKe titik={fokus} />
          {adaTitik && (
            <CircleMarker
              center={[lat, lng]}
              radius={11}
              pathOptions={{ color: '#0d5a57', weight: 3, fillColor: '#059669', fillOpacity: 0.9 }}
            />
          )}
        </MapContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">
          {adaTitik
            ? `Titik terpilih: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
            : 'Klik pada peta untuk menandai lokasi kos'}
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
      {galat && <p className="mt-2 text-sm font-medium text-red-700">{galat}</p>}
    </div>
  );
}