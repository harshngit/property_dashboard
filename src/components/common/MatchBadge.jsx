import { useEffect, useRef, useState } from "react";

// Sec. 7.3 match badge: "96% Match", colour-coded green > 90, yellow 70-90,
// orange 50-70, red < 50. Clicking it reveals the parameter-wise breakdown
// (location / budget / type / area / amenities with their weights).

const LABELS = { location: "Location", budget: "Budget", type: "Property type", area: "Area / size", amenities: "Amenities" };

export function matchTone(score) {
  if (score > 90) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (score >= 70) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (score >= 50) return "bg-orange-100 text-orange-800 border-orange-200";
  return "bg-red-100 text-red-800 border-red-200";
}

export default function MatchBadge({ score, breakdown, tier, align = "left" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  if (score == null) return null;
  const s = Math.round(Number(score));
  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${matchTone(s)}`}
        title="Show match breakdown"
      >
        {s}% Match{tier === "hot" ? " · Hot" : ""}
      </button>
      {open && breakdown && (
        <div className={`absolute z-30 mt-1 w-64 rounded-xl border border-line bg-white p-3 text-left shadow-pop ${align === "right" ? "right-0" : "left-0"}`}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-500">Match breakdown</p>
          <ul className="space-y-2">
            {Object.entries(breakdown).map(([k, v]) => (
              <li key={k}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink-800">{LABELS[k] || k}</span>
                  <span className="text-ink-600">{v.score}% × {v.weight}</span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-surface-muted">
                  <div className="h-1 rounded-full bg-red-500" style={{ width: `${v.score}%` }} />
                </div>
                {v.detail && <p className="mt-0.5 text-[11px] text-ink-500">{v.detail}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}
