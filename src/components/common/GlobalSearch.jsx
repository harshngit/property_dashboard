import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuSearch } from "react-icons/lu";
import { useApiCall } from "../../hooks/useApi";
import { MODULES, canAccessModule } from "../../config/roles";

// Search across the records this user can see. Each list endpoint applies the
// usual access rules, so nothing extra is exposed here.
const GROUPS = [
  {
    key: MODULES.LEADS,
    label: "Leads",
    path: "/leads",
    title: (l) => l.customer_name || "Lead",
    sub: (l) => l.property_title || l.source || "",
    to: (l) => `/app/leads/${l.id}`,
  },
  {
    key: MODULES.PROPERTIES,
    label: "Properties",
    path: "/properties",
    title: (p) => p.title,
    sub: (p) => [p.locality, p.city].filter(Boolean).join(", "),
    to: (p) => `/app/properties/${p.id}`,
  },
  {
    key: MODULES.CUSTOMERS,
    label: "Customers",
    path: "/customers",
    title: (c) => c.full_name || "Customer",
    sub: (c) => c.city || "",
    to: (c) => `/app/customers/${c.id}`,
  },
];

export default function GlobalSearch({ role }) {
  const call = useApiCall();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const rootRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const groups = GROUPS.filter((g) => canAccessModule(role, g.key));
      const found = await Promise.all(
        groups.map((g) =>
          call(`${g.path}?search=${encodeURIComponent(q)}&limit=4`)
            .then((r) => ({ ...g, items: (Array.isArray(r.data) ? r.data : r.data?.items || []).slice(0, 4) }))
            .catch(() => ({ ...g, items: [] }))
        )
      );
      if (!cancelled) {
        setResults(found.filter((g) => g.items.length > 0));
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, role, call]);

  const handleSelect = (group, item) => {
    navigate(group.to(item));
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <div className="flex items-center gap-2 rounded-full bg-surface-sunk px-3.5 py-2 text-sm focus-within:ring-2 focus-within:ring-red-200">
        <LuSearch className="h-4 w-4 shrink-0 text-ink-500" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search leads, properties, customers…"
          className="w-52 bg-transparent text-ink-900 placeholder:text-ink-500/60 outline-none lg:w-72"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-96 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-ink-500">{loading ? "Searching…" : `No matches for "${query}"`}</p>
          ) : (
            results.map((group) => (
              <div key={group.key} className="mb-1 last:mb-0">
                <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">{group.label}</p>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(group, item)}
                    className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left hover:bg-red-50"
                  >
                    <span className="text-sm font-semibold text-ink-900" data-no-translate>{group.title(item)}</span>
                    <span className="text-xs text-ink-500" data-no-translate>{group.sub(item)}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
