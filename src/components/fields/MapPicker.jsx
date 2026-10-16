import { useEffect, useRef, useState } from "react";

// Map picker for "map location" fields: click the map (or drag the pin) to set
// the point. Uses Leaflet with OpenStreetMap tiles, loaded on demand - no key
// and nothing added to the bundle. VITE_MAP_TILE_URL swaps the tile server.
// If the map cannot load, the latitude / longitude boxes still work.

const VERSION = "1.9.4";
const TILES = import.meta.env.VITE_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const INDIA = [22.6, 79.0];
let loading = null;

function loadLeaflet() {
  if (window.L?.map) return Promise.resolve(window.L);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `https://unpkg.com/leaflet@${VERSION}/dist/leaflet.css`;
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = `https://unpkg.com/leaflet@${VERSION}/dist/leaflet.js`;
    js.onload = () => resolve(window.L);
    js.onerror = () => {
      loading = null;
      reject(new Error("The map could not be loaded"));
    };
    document.head.appendChild(js);
  });
  return loading;
}

export default function MapPicker({ value, onChange }) {
  const box = useRef(null);
  const map = useRef(null);
  const pin = useRef(null);
  const [failed, setFailed] = useState(false);
  const lat = value?.lat === "" || value?.lat === undefined ? null : Number(value.lat);
  const lng = value?.lng === "" || value?.lng === undefined ? null : Number(value.lng);
  const has = Number.isFinite(lat) && Number.isFinite(lng);
  const emit = useRef(onChange);
  emit.current = onChange;

  useEffect(() => {
    let gone = false;
    loadLeaflet()
      .then((L) => {
        if (gone || !box.current || map.current) return;
        const m = L.map(box.current, { scrollWheelZoom: false }).setView(has ? [lat, lng] : INDIA, has ? 15 : 4);
        L.tileLayer(TILES, { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(m);
        // A plain dot: the default marker image needs asset paths that a CDN build does not have.
        const icon = L.divIcon({ className: "", html: '<div style="width:18px;height:18px;border-radius:50%;background:#e51c23;border:3px solid #fff;box-shadow:0 0 0 1px #e51c23"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
        const place = (p) => {
          const point = { lat: Number(p.lat.toFixed(7)), lng: Number(p.lng.toFixed(7)) };
          if (!pin.current) {
            pin.current = L.marker(p, { draggable: true, icon }).addTo(m);
            pin.current.on("dragend", () => place(pin.current.getLatLng()));
          } else pin.current.setLatLng(p);
          emit.current(point);
        };
        m.on("click", (e) => place(e.latlng));
        if (has) {
          pin.current = L.marker([lat, lng], { draggable: true, icon }).addTo(m);
          pin.current.on("dragend", () => place(pin.current.getLatLng()));
        }
        map.current = m;
      })
      .catch(() => setFailed(true));
    return () => {
      gone = true;
      map.current?.remove();
      map.current = null;
      pin.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Typed coordinates or "use my location" move the pin too.
  useEffect(() => {
    if (!map.current || !has || !window.L) return;
    if (pin.current) pin.current.setLatLng([lat, lng]);
    map.current.setView([lat, lng], Math.max(map.current.getZoom(), 15));
  }, [lat, lng, has]);

  if (failed) return <p className="text-xs text-[#6B7280]">The map could not be loaded here - enter the latitude and longitude, or use your location.</p>;
  return <div ref={box} style={{ height: 240, borderRadius: 12, border: "1px solid #e5e7eb", zIndex: 0 }} aria-label="Map: click to set the location" />;
}
