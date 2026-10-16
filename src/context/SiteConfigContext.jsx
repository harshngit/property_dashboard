import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client";

// Dropdown lists and text the Super Admin sets in Site configuration
// (GET /site-config?app=dashboard). Every screen passes its own built-in list
// as the fallback, so it works the same before the config loads or if the
// call fails.

const SiteConfigContext = createContext({ options: {}, content: {}, reload: () => {} });

export function SiteConfigProvider({ children }) {
  const [config, setConfig] = useState({ options: {}, content: {} });
  const load = useCallback(() => {
    apiRequest("/site-config?app=dashboard")
      .then((res) => setConfig({ options: res.data?.options || {}, content: res.data?.content || {} }))
      .catch(() => {});
  }, []);
  useEffect(load, [load]);
  const value = useMemo(() => ({ ...config, reload: load }), [config, load]);
  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}

export const useSiteConfig = () => useContext(SiteConfigContext);

// The options for one list. A leading "Not specified" / "None" entry (empty
// value) from the fallback is kept, and a value the record already holds
// stays selectable even after the Super Admin hides it.
export function useOptions(key, fallback = [], current) {
  const { options } = useContext(SiteConfigContext);
  return useMemo(() => {
    const remote = options[key];
    let list = remote?.length ? remote.map(({ value, label }) => ({ value, label })) : fallback.filter((o) => o.value !== "");
    if (fallback[0]?.value === "") list = [fallback[0], ...list];
    const held = Array.isArray(current) ? current : current ? [current] : [];
    for (const v of held) {
      if (!list.some((o) => o.value === v)) list = [...list, fallback.find((o) => o.value === v) || { value: v, label: v }];
    }
    return list;
  }, [options, key, fallback, current]);
}

export function useSiteContent(key, fallback = "") {
  const { content } = useContext(SiteConfigContext);
  return content[key] ?? fallback;
}
