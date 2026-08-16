import { API_BASE_URL } from "../config/api";

// Set once from main.jsx after the store is created. client.js can't import
// the store directly - authSlice imports apiRequest from this file, so a
// top-level `import { store } from "../redux/store"` here would be circular.
let storeRef = null;
export function injectStore(store) {
  storeRef = store;
}

// Dedupe concurrent 401s: if 3 requests expire at once, only one
// /auth/refresh-token call should fire; the rest await the same promise.
let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = storeRef?.getState().auth.refreshToken;
  if (!refreshToken) throw new Error("No refresh token available");

  const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok || payload?.success === false) {
    throw new Error(payload?.message || "Session expired");
  }

  return payload.data.accessToken;
}

function buildHeaders(authToken, isFormData) {
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  return headers;
}

export async function apiRequest(path, { method = "GET", body, token, isFormData = false, skipAuthRefresh = false } = {}) {
  const requestBody = body === undefined ? undefined : isFormData ? body : JSON.stringify(body);

  let res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders(token, isFormData),
    body: requestBody,
  });

  // Access token expired mid-session - refresh once and retry the original
  // request. Skipped for anonymous calls (no token) and for the refresh/login
  // endpoints themselves to avoid recursion.
  if (res.status === 401 && token && !skipAuthRefresh) {
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;
      storeRef?.dispatch({ type: "auth/tokenRefreshed", payload: { accessToken: newAccessToken } });

      res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: buildHeaders(newAccessToken, isFormData),
        body: requestBody,
      });
    } catch {
      storeRef?.dispatch({ type: "auth/sessionExpired" });
      if (typeof window !== "undefined") window.location.assign("/login");
      throw new Error("Your session has expired. Please log in again.");
    }
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok || payload?.success === false) {
    throw new Error(payload?.message || `Request failed with status ${res.status}`);
  }

  return payload;
}
