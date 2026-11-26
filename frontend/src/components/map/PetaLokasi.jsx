// src/components/map/PetaLokasi.jsx
// Peta untuk menentukan titik lokasi kos. Klik peta (atau geser marker)
// maka latitude/longitude otomatis dikirim ke form melalui onPilih.
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Pakai divIcon agar tidak bergantung pada aset ikon default Leaflet
// yang sering rusak saat dibundel Vite.
const pinLokasi = L.divIcon({
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  html: '<div style="width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.35);background:#0d5a57"></div>',
});

// Bandung sebagai titik awal sebelum pemilik mengklik peta.
const PUSAT_DEFAULT = [-6.9175, 107.6191];

const angka = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function KlikPeta({ onPilih }) {
  useMapEvents({
    click(e) {
      onPilih({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

// MapContainer hanya membaca center sekali saat mount. Komponen ini
// menyamakan tampilan peta ketika nilai datang dari form/edit data.
function GeserPeta({ lat, lng }) {
  const peta = useMap();

  useEffect(() => {
    peta.flyTo([lat, lng], peta.getZoom(), { duration: 0.4 });
  }, [peta, lat, lng]);

  return null;
}

export default function PetaLokasi({
  latitude,
  longitude,
  onPilih,
  tinggi = 'h-72',
  pusat = PUSAT_DEFAULT,
}) {
  const adaTitik = latitude !== '' && latitude != null && longitude !== '' && longitude != null;
  const posisi = adaTitik
    ? [angka(latitude, PUSAT_DEFAULT[0]), angka(longitude, PUSAT_DEFAULT[1])]
    : pusat;

  return (
    <div className={`${tinggi} w-full overflow-hidden rounded-2xl border border-slate-300`}>
      <MapContainer center={posisi} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <KlikPeta onPilih={onPilih} />
        <GeserPeta lat={posisi[0]} lng={posisi[1]} />
        {adaTitik && (
          <Marker
            position={posisi}
            icon={pinLokasi}
            draggable
            eventHandlers={{
              dragend(e) {
                const { lat, lng } = e.target.getLatLng();
                onPilih({ latitude: lat, longitude: lng });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
