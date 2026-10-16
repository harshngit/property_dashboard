// Sec. 14 franchise branding for the CRM sign-in page: on a white-label
// franchisee host the page carries their name, logo and primary colour.
// On A R Buildwel's own host the API answers "no branding" and nothing changes.
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";

let cached;
const listeners = new Set();

async function load() {
  try {
    const here = window.location.hostname;
    const local = here === "localhost" || here === "127.0.0.1";
    const host = (local && new URLSearchParams(window.location.search).get("brand_host")) || here;
    const res = await fetch(`${API_BASE_URL}/branding?host=${encodeURIComponent(host)}`).then((r) => r.json());
    cached = res?.data?.brandMode === "white_label" ? res.data : null;
  } catch {
    cached = null;
  }
  listeners.forEach((fn) => fn(cached));
}

export function useBranding() {
  const [b, setB] = useState(cached || null);
  useEffect(() => {
    listeners.add(setB);
    if (cached === undefined) load();
    else setB(cached);
    return () => listeners.delete(setB);
  }, []);
  return b;
}
