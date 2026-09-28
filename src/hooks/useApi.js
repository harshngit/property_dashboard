import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { apiRequest } from "../api/client";

// Lightweight data hooks for screens that only list/act on one resource and
// don't need shared Redux state. Both use the signed-in user's token from
// the auth slice and the same apiRequest client (auto token refresh).

export function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "All") query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

// GET `path` on mount and whenever it changes; `reload()` refetches.
// Pass null to skip.
export function useApiQuery(path) {
  const token = useSelector((s) => s.auth.accessToken);
  const [state, setState] = useState({ data: null, loading: !!path, error: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    apiRequest(path, { token })
      .then((res) => !cancelled && setState({ data: res.data, loading: false, error: null }))
      .catch((err) => !cancelled && setState({ data: null, loading: false, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [path, token, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

// Returns `call(path, { method, body })` bound to the current token.
export function useApiCall() {
  const token = useSelector((s) => s.auth.accessToken);
  return useCallback((path, options = {}) => apiRequest(path, { ...options, token }), [token]);
}
