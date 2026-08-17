const SCRIPT_ID = "google-maps-script";
const CALLBACK_NAME = "__onGoogleMapsLoaded";

let loadPromise = null;

// Injects the Google Maps JS SDK (places library) once and caches the
// promise, so every caller across the app shares the same script tag.
// A failed attempt is NOT cached - a missing/blocked script is often
// fixable (e.g. .env fixed + dev server restarted, extension disabled)
// without a full page reload, so the next caller gets a fresh try.
export function loadGoogleMaps() {
  if (loadPromise) return loadPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("VITE_GOOGLE_MAPS_API_KEY is not set"));
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google.maps);
  }

  const attempt = new Promise((resolve, reject) => {
    // Google calls this global if the key is invalid, unauthorized for this
    // referrer, or the Maps JavaScript API isn't enabled/billed - in all of
    // those cases the <script> still loads fine, so this is the only
    // reliable signal for that whole failure class.
    window.gm_authFailure = () => {
      reject(new Error("Google rejected the API key (invalid key, referrer not allowed, API not enabled, or billing not set up on the Google Cloud project)."));
    };

    // Resolve via Google's own `callback` param, NOT the <script> tag's
    // `load` event and NOT importLibrary() - `load` fires as soon as the
    // script itself finishes executing, which can be well before the
    // `places` library is actually attached to google.maps, and
    // importLibrary() only exists with Google's separate inline bootstrap
    // snippet, not this URL-based loading style. `callback` is the one
    // signal Google guarantees fires only once the API *and* every library
    // named in `libraries=` below are fully ready.
    window[CALLBACK_NAME] = () => resolve(window.google.maps);

    // Clear out any previous failed attempt's tag so a retry always starts
    // from a clean script element.
    document.getElementById(SCRIPT_ID)?.remove();

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=${CALLBACK_NAME}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load the Google Maps script (network blocked or ad-blocker)."));
    document.head.appendChild(script);
  });

  loadPromise = attempt.then(
    (maps) => maps,
    (err) => {
      loadPromise = null;
      throw err;
    }
  );

  return loadPromise;
}
