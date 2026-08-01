import { useMemo, useState } from "react";
import { LuSearch, LuChevronLeft, LuChevronRight, LuSlidersHorizontal, LuDownload } from "react-icons/lu";
import ActionMenu from "./ActionMenu";
import EmptyState from "./EmptyState";
import { TableSkeleton } from "./PageLoader";

const PAGE_SIZE = 6;

export default function DataTable({
  columns,
  data,
  searchKeys = [],
  filters = [],
  getActions,
  loading = false,
  emptyTitle = "No records found",
  emptySubtitle = "Try adjusting your search or filters.",
  onExport,
}) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let rows = data;
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((row) =>
        searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(q))
      );
    }
    Object.entries(activeFilters).forEach(([key, val]) => {
      if (val && val !== "All") {
        rows = rows.filter((row) => String(row[key]) === val);
      }
    });
    return rows;
  }, [data, query, searchKeys, activeFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateFilter = (key, value) => {
    setActiveFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500/60" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search…"
            className="field-input pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <div key={f.key} className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 py-1.5">
              <LuSlidersHorizontal className="h-3.5 w-3.5 text-ink-500/70" />
              <select
                className="bg-transparent text-xs font-semibold text-ink-700 outline-none"
                value={activeFilters[f.key] || "All"}
                onChange={(e) => updateFilter(f.key, e.target.value)}
              >
                <option>All</option>
                {f.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          {onExport && (
            <button onClick={onExport} className="btn-outline btn-sm">
              <LuDownload className="h-3.5 w-3.5" /> Export
            </button>
          )}
        </div>
      </div>

      <div className="table-wrap">
        {loading ? (
          <TableSkeleton cols={columns.length} />
        ) : paged.length === 0 ? (
          <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                {getActions && <th className="w-12" />}
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => (
                <tr key={row.id}>
                  {columns.map((c) => (
                    <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
                  ))}
                  {getActions && (
                    <td className="text-right">
                      <ActionMenu items={getActions(row)} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-500">
          <span>
            Showing <span className="font-semibold text-ink-900">{(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)}</span> of{" "}
            <span className="font-semibold text-ink-900">{filtered.length}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white disabled:opacity-40 hover:bg-surface-sunk"
            >
              <LuChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-ink-700">{page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white disabled:opacity-40 hover:bg-surface-sunk"
            >
              <LuChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
