import { useEffect, useRef, useState } from "react";
import { LuMapPin } from "react-icons/lu";
import { loadGoogleMaps } from "../../lib/googleMaps";

const findComponent = (components, type) => components.find((c) => c.types.includes(type))?.long_name || "";

export default function LocationAutocomplete({
  label = "Search location",
  placeholder = "Search for an address, locality or landmark…",
  onPlaceSelected,
  className = "",
}) {
  const inputRef = useRef(null);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  const [error, setError] = useState(null);

  useEffect(() => {
    onPlaceSelectedRef.current = onPlaceSelected;
  }, [onPlaceSelected]);

  useEffect(() => {
    let listener;
    let cancelled = false;

    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !inputRef.current) return;
        const autocomplete = new maps.places.Autocomplete(inputRef.current, {
          fields: ["address_components", "formatted_address", "geometry", "name"],
        });
        listener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.geometry) return;
          const components = place.address_components || [];
          onPlaceSelectedRef.current?.({
            address: place.formatted_address || place.name || "",
            city: findComponent(components, "locality") || findComponent(components, "administrative_area_level_2"),
            locality: findComponent(components, "sublocality_level_1") || findComponent(components, "sublocality") || findComponent(components, "neighborhood"),
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
          });
        });
      })
      .catch((err) => {
        console.error("Google location search unavailable:", err);
        setError(err.message || "Google location search failed to load.");
      });

    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, []);

  return (
    <div className={className}>
      <label className="field-label">{label}</label>
      <div className="relative">
        <LuMapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500/60" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          disabled={!!error}
          className="field-input pl-9 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
