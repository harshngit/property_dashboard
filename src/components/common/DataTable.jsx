import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { LuSearch, LuChevronLeft, LuChevronRight, LuSlidersHorizontal, LuDownload, LuLayoutGrid, LuList, LuArrowUpDown, LuTag, LuPencil, LuTrash2, LuEllipsis, LuX } from "react-icons/lu";
import ActionMenu from "./ActionMenu";
import EmptyState from "./EmptyState";
import ListStatsStrip from "./ListStatsStrip";
import { TableSkeleton } from "./PageLoader";

const DEFAULT_PAGE_SIZE = 10;

export default function DataTable({
  columns,
  data,
  searchKeys = [],
  filters = [],
  toolbarActions,
  getActions,
  loading = false,
  emptyTitle = "No records found",
  emptySubtitle = "Try adjusting your search or filters.",
  statsItems = [],
  onExport,
  renderCard,
  kanban,
  onKanbanDrop,
}) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [view, setView] = useState("list");
  const [sortKey, setSortKey] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [kanbanOrder, setKanbanOrder] = useState(() => data.map((row) => row.id));
  const [dragState, setDragState] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

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

  const canToggleView = !!renderCard;
  const canDragKanban = !!kanban?.key && !!onKanbanDrop;
  const sortableColumns = useMemo(
    () => columns.filter((column) => !column.render).map((column) => ({ key: column.key, label: column.label })),
    [columns]
  );

  useEffect(() => {
    if (!sortKey && sortableColumns.length) {
      setSortKey(sortableColumns[0].key);
    }
  }, [sortableColumns, sortKey]);

  useEffect(() => {
    setKanbanOrder((current) => {
      const ids = data.map((row) => row.id);
      const existing = current.filter((id) => ids.includes(id));
      const missing = ids.filter((id) => !existing.includes(id));
      return [...existing, ...missing];
    });
  }, [data]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => data.some((row) => row.id === id)));
  }, [data]);

  const kanbanColumns = useMemo(() => {
    if (!kanban?.key) return [];
    if (Array.isArray(kanban.columns) && kanban.columns.length) return kanban.columns;
    const filterOptions = filters.find((f) => f.key === kanban.key)?.options;
    if (filterOptions?.length) return filterOptions;
    return Array.from(new Set(filtered.map((row) => row[kanban.key]).filter(Boolean)));
  }, [kanban, filters, filtered]);

  const orderedFiltered = useMemo(() => {
    const sortedRows = [...filtered];
    if (sortKey) {
      sortedRows.sort((a, b) => String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), undefined, { numeric: true, sensitivity: "base" }));
    }
    const orderIndex = new Map(kanbanOrder.map((id, index) => [id, index]));
    return sortedRows.sort((a, b) => {
      const aIndex = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
  }, [filtered, kanbanOrder, sortKey]);

  const totalPages = Math.max(1, Math.ceil(orderedFiltered.length / pageSize));
  const paged = orderedFiltered.slice((page - 1) * pageSize, page * pageSize);
  const allVisibleSelected = paged.length > 0 && paged.every((row) => selectedIds.includes(row.id));

  const groupedRows = useMemo(() => {
    if (!kanban?.key) return {};
    return orderedFiltered.reduce((acc, row) => {
      const group = row[kanban.key] || "Uncategorized";
      if (!acc[group]) acc[group] = [];
      acc[group].push(row);
      return acc;
    }, {});
  }, [orderedFiltered, kanban]);

  const updateFilter = (key, value) => {
    setActiveFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const updatePageSize = (value) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const activeFilterCount = Object.values(activeFilters).filter((value) => value && value !== "All").length + (query.trim() ? 1 : 0);

  const toggleRowSelection = (id) => {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((rowId) => rowId !== id) : [...current, id]
    ));
  };

  const toggleVisibleSelection = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !paged.some((row) => row.id === id)));
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      paged.forEach((row) => next.add(row.id));
      return Array.from(next);
    });
  };

  const moveCard = (draggedId, targetGroup, targetRowId = null) => {
    const draggedRow = filtered.find((row) => row.id === draggedId);
    if (!draggedRow || !kanban?.key) return;

    setKanbanOrder((current) => {
      const next = current.filter((id) => id !== draggedId);
      if (targetRowId) {
        const insertAt = next.indexOf(targetRowId);
        next.splice(insertAt === -1 ? next.length : insertAt, 0, draggedId);
        return next;
      }

      const targetRows = (groupedRows[targetGroup] || []).filter((row) => row.id !== draggedId);
      if (!targetRows.length) {
        next.push(draggedId);
        return next;
      }

      const lastTargetId = targetRows[targetRows.length - 1].id;
      const insertAt = next.indexOf(lastTargetId);
      next.splice(insertAt + 1, 0, draggedId);
      return next;
    });

    if (draggedRow[kanban.key] !== targetGroup) {
      onKanbanDrop(draggedRow, targetGroup);
    }
  };

  const handleCardDrop = (event, targetGroup, targetRowId) => {
    event.preventDefault();
    event.stopPropagation();
    if (!dragState) return;
    moveCard(dragState.id, targetGroup, targetRowId);
    setDragState(null);
    setDropTarget(null);
  };

  const handleColumnDrop = (event, targetGroup) => {
    event.preventDefault();
    if (!dragState) return;
    moveCard(dragState.id, targetGroup);
    setDragState(null);
    setDropTarget(null);
  };

  const visiblePageButtons = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, totalPages];
    if (page >= totalPages - 2) return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, page - 1, page, page + 1, totalPages];
  })();

  const portalRoot = typeof document !== "undefined" ? document.body : null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="px-1 py-1">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {canToggleView && (
              <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-[0_8px_22px_-22px_rgba(17,20,43,0.35)]">
                {view === "list" ? (
                  <LuList className="h-4 w-4 text-ink-500/70" />
                ) : (
                  <LuLayoutGrid className="h-4 w-4 text-ink-500/70" />
                )}
                <select
                  className="bg-transparent font-semibold text-ink-700 outline-none"
                  value={view}
                  onChange={(e) => setView(e.target.value)}
                >
                  <option value="list">Table View</option>
                  <option value="kanban">Kanban</option>
                </select>
              </div>
            )}
            {sortableColumns.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-[0_8px_22px_-22px_rgba(17,20,43,0.35)]">
                <LuArrowUpDown className="h-4 w-4 text-ink-500/70" />
                <select
                  className="bg-transparent font-semibold text-ink-700 outline-none"
                  value={sortKey}
                  onChange={(e) => {
                    setSortKey(e.target.value);
                    setPage(1);
                  }}
                >
                  {sortableColumns.map((column) => (
                    <option key={column.key} value={column.key}>
                      Sort: {column.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink-700 shadow-[0_8px_22px_-22px_rgba(17,20,43,0.35)] hover:bg-surface-sunk"
            >
              <LuSlidersHorizontal className="h-4 w-4 text-ink-500/70" />
              Filter
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff512f_0%,#dd2476_100%)] px-1.5 text-[11px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {toolbarActions && (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {toolbarActions}
              </div>
            )}
            {onExport && (
              <button onClick={onExport} className="btn-outline min-h-[44px] rounded-xl">
                <LuDownload className="h-4 w-4" /> Export
              </button>
            )}
          </div>
        </div>
      </div>

      <ListStatsStrip items={statsItems} />

      {filtersOpen && portalRoot && createPortal(
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 bg-ink-950/30"
          />
          <aside className="fixed inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-white shadow-[0_20px_50px_-12px_rgba(17,20,43,0.24)]">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="text-base font-bold text-ink-950">Filters</p>
                <p className="text-sm text-ink-500">Search and narrow the records.</p>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink-500 hover:bg-surface-sunk"
              >
                <LuX className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink-700">Search</label>
                <div className="relative">
                  <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500/60" />
                  <input
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                    placeholder="Search records..."
                    className="field-input bg-white pl-9"
                  />
                </div>
              </div>

              {filters.map((f) => (
                <div key={f.key}>
                  <label className="mb-2 block text-sm font-semibold text-ink-700">{f.label}</label>
                  <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-3">
                    <LuSlidersHorizontal className="h-4 w-4 text-ink-500/70" />
                    <select
                      className="w-full bg-transparent font-semibold text-ink-700 outline-none"
                      value={activeFilters[f.key] || "All"}
                      onChange={(e) => updateFilter(f.key, e.target.value)}
                    >
                      <option>All</option>
                      {f.options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveFilters({});
                  if (sortableColumns.length) setSortKey(sortableColumns[0].key);
                  setPage(1);
                }}
                className="btn-outline min-h-[44px] flex-1 rounded-xl"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="btn-primary min-h-[44px] flex-1 rounded-xl"
              >
                Apply filters
              </button>
            </div>
          </aside>
        </div>,
        portalRoot
      )}

      {view === "kanban" && canToggleView ? (
        loading ? (
          <TableSkeleton cols={3} />
        ) : filtered.length === 0 ? (
          <div className="table-wrap">
            <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {kanbanColumns.map((group) => {
              const rows = groupedRows[group] || [];
              return (
                <div
                  key={group}
                  onDragOver={(event) => {
                    if (!canDragKanban) return;
                    event.preventDefault();
                    setDropTarget({ group, rowId: null, placement: "end" });
                  }}
                  onDragLeave={() => {
                    if (dropTarget?.group === group && dropTarget?.rowId === null) {
                      setDropTarget(null);
                    }
                  }}
                  onDrop={(event) => handleColumnDrop(event, group)}
                  className={`rounded-2xl border bg-white p-3 shadow-card transition ${
                    dropTarget?.group === group
                      ? "border-indigo-300 ring-2 ring-indigo-100"
                      : "border-line"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
                    <div>
                      <p className="text-sm font-bold text-ink-900">{group}</p>
                      <p className="text-[11px] text-ink-500">{rows.length} items</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {rows.length ? rows.map((row) => (
                      <div
                        key={row.id}
                        draggable={canDragKanban}
                        onDragStart={() => setDragState({ id: row.id, group })}
                        onDragEnd={() => {
                          setDragState(null);
                          setDropTarget(null);
                        }}
                        onDragOver={(event) => {
                          if (!canDragKanban) return;
                          event.preventDefault();
                          event.stopPropagation();
                          if (dragState?.id !== row.id) {
                            setDropTarget({ group, rowId: row.id, placement: "before" });
                          }
                        }}
                        onDrop={(event) => handleCardDrop(event, group, row.id)}
                        className={`rounded-xl border bg-surface-muted/60 p-3 transition ${
                          dragState?.id === row.id
                            ? "cursor-grabbing border-indigo-300 opacity-60"
                            : canDragKanban
                              ? "cursor-grab border-line"
                              : "border-line"
                        } ${
                          dropTarget?.group === group && dropTarget?.rowId === row.id
                            ? "ring-2 ring-indigo-200"
                            : ""
                        }`}
                      >
                        {renderCard(row)}
                        {getActions && (
                          <div className="mt-3 flex justify-end">
                            <ActionMenu items={getActions(row)} />
                          </div>
                        )}
                      </div>
                    )) : (
                      <div className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-ink-500">
                        No items
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-[#ECEEF4] bg-white shadow-[0_8px_24px_-24px_rgba(17,20,43,0.14)]">
          {loading ? (
            <TableSkeleton cols={columns.length} />
          ) : paged.length === 0 ? (
            <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table-base min-w-full">
                  <thead>
                    <tr>
                      <th className="w-12">
                        <label className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleVisibleSelection}
                            className="h-4 w-4 rounded border-line text-[#ff512f] focus:ring-[#dd2476]"
                          />
                        </label>
                      </th>
                      {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                      {getActions && <th className="w-14 text-center text-lg font-medium">+</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((row) => {
                      const isSelected = selectedIds.includes(row.id);
                      return (
                        <tr key={row.id} className={isSelected ? "bg-[#FFF8F6]" : "bg-white"}>
                          <td className={`relative w-12 ${isSelected ? "before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-[#ff6a3d]" : ""}`}>
                            <label className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRowSelection(row.id)}
                                className="h-4 w-4 rounded border-line text-[#ff512f] focus:ring-[#dd2476]"
                              />
                            </label>
                          </td>
                          {columns.map((c) => (
                            <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
                          ))}
                          {getActions && (
                            <td className="text-center">
                              <ActionMenu items={getActions(row)} />
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!loading && orderedFiltered.length > 0 && view === "list" && (
                <div className="border-t border-[#ECEEF4] bg-white px-5 py-4 lg:px-6">
                  {selectedIds.length > 0 && (
                    <div className="mb-4 flex justify-center">
                      <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-[#E9EBF1] bg-white px-4 py-3 shadow-[0_18px_34px_-24px_rgba(17,20,43,0.25)]">
                        <span className="pr-2 text-sm font-semibold text-ink-500">{selectedIds.length} Selected</span>
                        <button type="button" className="btn-outline btn-sm rounded-xl border-[#ECEEF4]">
                          <LuTag className="h-4 w-4" /> Apply Code
                        </button>
                        <button type="button" className="btn-outline btn-sm rounded-xl border-[#ECEEF4]">
                          <LuPencil className="h-4 w-4" /> Edit Info
                        </button>
                        <button type="button" className="btn-outline btn-sm rounded-xl border-[#ECEEF4]">
                          <LuTrash2 className="h-4 w-4" /> Delete
                        </button>
                        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ECEEF4] text-ink-500 hover:bg-surface-sunk">
                          <LuEllipsis className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedIds([])}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ECEEF4] text-ink-500 hover:bg-surface-sunk"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2 text-sm text-ink-500">
                      <span>Showing per page</span>
                      <select
                        value={pageSize}
                        onChange={(e) => updatePageSize(e.target.value)}
                        className="h-10 rounded-xl border border-[#ECEEF4] bg-white px-3 text-sm font-semibold text-ink-700 outline-none"
                      >
                        {[10, 20, 30].map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ECEEF4] bg-white text-ink-400 disabled:opacity-40 hover:bg-surface-sunk"
                      >
                        <LuChevronLeft className="h-4 w-4" />
                      </button>
                      {visiblePageButtons.map((pageNumber, index) => (
                        <button
                          key={`${pageNumber}-${index}`}
                          type="button"
                          onClick={() => setPage(pageNumber)}
                          className={`flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold ${
                            page === pageNumber
                              ? "bg-[linear-gradient(135deg,#ff512f_0%,#dd2476_100%)] text-white shadow-[0_12px_24px_-18px_rgba(221,36,118,0.5)]"
                              : "border border-[#ECEEF4] bg-white text-ink-600 hover:bg-surface-sunk"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      ))}
                      {totalPages > 5 && page < totalPages - 2 && (
                        <button
                          type="button"
                          disabled
                          className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-[#ECEEF4] bg-white px-3 text-sm font-semibold text-ink-400"
                        >
                          ...
                        </button>
                      )}
                      <button
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#ECEEF4] bg-white text-ink-500 disabled:opacity-40 hover:bg-surface-sunk"
                      >
                        <LuChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-end gap-2 text-sm text-ink-500">
                      <span>Go to page</span>
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={page}
                        onChange={(e) => {
                          const nextPage = Number(e.target.value);
                          if (nextPage >= 1 && nextPage <= totalPages) setPage(nextPage);
                        }}
                        className="h-10 w-14 rounded-xl border border-[#ECEEF4] px-2 text-center font-semibold text-ink-700 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setPage(Math.min(Math.max(page, 1), totalPages))}
                        className="text-sm font-bold text-ink-900"
                      >
                        Go ›
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
