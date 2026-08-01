import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuSearch } from "react-icons/lu";
import { LEADS, PROPERTIES, CUSTOMERS } from "../../data/mockData";
import { MODULES, canAccessModule } from "../../config/roles";

const GROUPS = [
  {
    key: MODULES.LEADS,
    label: "Leads",
    data: LEADS,
    match: (l, q) => l.name.toLowerCase().includes(q) || l.id.toLowerCase().includes(q) || l.property.toLowerCase().includes(q),
    title: (l) => l.name,
    sub: (l) => l.property,
    to: (l) => `/app/leads/${l.id}`,
  },
  {
    key: MODULES.PROPERTIES,
    label: "Properties",
    data: PROPERTIES,
    match: (p, q) => p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.location.toLowerCase().includes(q),
    title: (p) => p.title,
    sub: (p) => p.location,
    to: (p) => `/app/properties/${p.id}`,
  },
  {
    key: MODULES.CUSTOMERS,
    label: "Customers",
    data: CUSTOMERS,
    match: (c, q) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.requirement.toLowerCase().includes(q),
    title: (c) => c.name,
    sub: (c) => c.requirement,
    to: () => "/app/customers",
  },
];

export default function GlobalSearch({ role }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const rootRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return GROUPS.filter((g) => canAccessModule(role, g.key))
      .map((g) => ({ ...g, items: g.data.filter((item) => g.match(item, q)).slice(0, 4) }))
      .filter((g) => g.items.length > 0);
  }, [query, role]);

  const handleSelect = (group, item) => {
    navigate(group.to(item));
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <div className="flex items-center gap-2 rounded-full bg-surface-sunk px-3.5 py-2 text-sm focus-within:ring-2 focus-within:ring-red-500/20">
        <LuSearch className="h-4 w-4 shrink-0 text-ink-500" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search leads, properties, customers…"
          className="w-52 bg-transparent text-ink-900 placeholder:text-ink-500/60 outline-none lg:w-72"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-96 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-pop">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-ink-500">No matches for "{query}"</p>
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
                    <span className="text-sm font-semibold text-ink-900">{group.title(item)}</span>
                    <span className="text-xs text-ink-500">{group.sub(item)}</span>
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
