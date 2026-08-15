import { LuInfo } from "react-icons/lu";

export default function ListStatsStrip({ items = [] }) {
  if (!items.length) return null;

  return (
    <div className="mb-5 overflow-hidden rounded-[24px] border border-line bg-white shadow-card">
      <div className={`grid ${items.length >= 4 ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" : "grid-cols-1 sm:grid-cols-2"}`}>
        {items.map((item, index) => (
          <div
            key={item.label}
            className={`px-5 py-4 ${index !== items.length - 1 ? "border-b border-line sm:border-b-0 sm:border-r" : ""}`}
          >
            <div className="flex items-center gap-1.5 text-sm font-semibold text-ink-700">
              <span>{item.label}</span>
              <LuInfo className="h-3.5 w-3.5 text-ink-400" />
            </div>
            <p className="mt-2 font-display text-[2rem] font-extrabold leading-none text-ink-950">{item.value}</p>
            {(item.meta || item.badge) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                {item.meta && <span>{item.meta}</span>}
                {item.badge && (
                  <span className="rounded-md bg-green-50 px-2 py-0.5 font-semibold text-green-600">
                    {item.badge}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
