// src/components/map/PetaKos.jsx
// Peta Leaflet + OpenStreetMap untuk landing page (tanpa API key).
// Semua state (filter, titik acuan) dipegang halaman induk; komponen ini hanya menggambar peta.
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // wajib: tanpa ini peta tidak bisa digeser/di-zoom dengan benar
import FotoKos from '../FotoKos';
import { rupiah, fotoUrl, fmtJarak } from '../../utils/kos';

// Marker hijau = ada kamar kosong, abu-abu = penuh (sesuai soal)
const pin = (tersedia, aktif) =>
  L.divIcon({
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div style="width:${aktif ? 34 : 28}px;height:${aktif ? 34 : 28}px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);background:${tersedia ? '#059669' : '#94a3b8'}"></div>`,
  });

const pinAcuan = L.divIcon({
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  html: '<div style="width:26px;height:26px;border-radius:50%;border:4px solid #fff;box-shadow:0 0 0 3px #0f172a,0 2px 6px rgba(0,0,0,.4);background:#0f172a"></div>',
});

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
 * onPilihAcuan  : dipanggil saat peta diklik
 * radiusKm      : 0 = tanpa lingkaran
 * fokus         : {pos:[lat,lng], zoom} untuk menggeser peta
 * aktif/onAktif : sorotan dua arah dengan daftar kartu
 * onAjukan      : (kos) => void
 */
export default function PetaKos({ daftar, acuan, onPilihAcuan, radiusKm = 0, fokus, aktif, onAktif, onAjukan }) {
  return (
    <div className="relative z-0 h-full w-full">
      <MapContainer center={[-2.5, 118]} zoom={5} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <TerbangKe fokus={fokus} />
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

      <div className="pointer-events-none absolute bottom-3 left-3 z-500 flex flex-wrap gap-x-4 gap-y-1 rounded-xl bg-white/95 px-4 py-2 text-sm font-semibold text-slate-700 shadow">
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-emerald-600" /> Ada kamar kosong</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-slate-400" /> Penuh</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-slate-900" /> Titik acuan</span>
      </div>
    </div>
  );
}