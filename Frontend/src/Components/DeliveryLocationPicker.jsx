import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, MapPin, Loader2 } from 'lucide-react';

// Vite bundles Leaflet's marker images fine, but Leaflet's default icon
// paths assume a plain <script> setup and resolve to broken URLs under a
// bundler — the standard fix is pointing L.Icon.Default at the actual
// bundled asset URLs instead of trusting its own relative-path guessing.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

// Namibia-centered default view (Windhoek) — just a starting viewport, not
// a guessed location; nothing is ever submitted until the customer
// actually places or confirms a pin.
const DEFAULT_CENTER = [-22.5609, 17.0658];
const DEFAULT_ZOOM = 6;
const PINNED_ZOOM = 16;

/**
 * Lets the customer drop a real pin for their delivery location instead
 * of hand-typing a street address — per spec: the ministry's delivery
 * person should be able to open a ready map link and just follow it,
 * not interpret a written description. No API key required (OpenStreetMap
 * tiles + the browser's own Geolocation API); see Checkout.jsx for how
 * the resulting {lat, lng} is submitted alongside the order.
 */
export default function DeliveryLocationPicker({ value, onChange }) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  // Holds the current placeMarker(lat, lng) closure so useMyLocation()
  // below can reuse the exact same marker-creation/drag-binding logic
  // the map's own click handler uses, instead of duplicating it.
  const placeMarkerRef = useRef(() => {});
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');

  // Mount the map exactly once — re-created markers/view updates happen
  // imperatively below rather than by re-rendering the map itself, which
  // Leaflet doesn't support cleanly with React's render cycle.
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const map = L.map(mapElRef.current, {
      center: value ? [value.lat, value.lng] : DEFAULT_CENTER,
      zoom: value ? PINNED_ZOOM : DEFAULT_ZOOM,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    function placeMarker(lat, lng) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current.getLatLng();
          onChange({ lat: pos.lat, lng: pos.lng });
        });
      }
      onChange({ lat, lng });
    }
    placeMarkerRef.current = placeMarker;

    map.on('click', (e) => placeMarker(e.latlng.lat, e.latlng.lng));

    if (value) {
      placeMarker(value.lat, value.lng);
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Intentionally mount-once: `value` is only read for the initial pin;
    // subsequent external value changes (e.g. "Use my location" below)
    // are applied imperatively via placeMarkerRef instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocateError("Your browser doesn't support location detection — please tap the map to pin your location instead.");
      return;
    }
    setLocating(true);
    setLocateError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.setView([latitude, longitude], PINNED_ZOOM);
        placeMarkerRef.current(latitude, longitude);
        setLocating(false);
      },
      (err) => {
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied — please tap the map to pin your location instead.'
            : "Couldn't detect your location — please tap the map to pin it instead."
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-ink/50">Tap the map to drop a pin, drag it to adjust, or use your current location.</p>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold hover:bg-secondary/20 transition disabled:opacity-60"
        >
          {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
          Use My Location
        </button>
      </div>

      <div
        ref={mapElRef}
        className="w-full h-56 rounded-2xl overflow-hidden border border-ink/10"
      />

      {locateError && <p className="text-xs text-red-500 mt-2">{locateError}</p>}

      {value ? (
        <p className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-2">
          <MapPin className="w-3.5 h-3.5" /> Pinned: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </p>
      ) : (
        <p className="text-xs text-ink/40 mt-2">No location pinned yet.</p>
      )}
    </div>
  );
}
