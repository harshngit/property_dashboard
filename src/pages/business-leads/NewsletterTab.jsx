import { useState } from "react";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../components/common/ToastProvider";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate } from "../../lib/format";

// Newsletter sign-ups from the website (Blogs & Insights "Stay ahead of the
// market") - GET/PUT /content/manage/newsletter. Admins can unsubscribe or
// resubscribe an address and export the list.

export default function NewsletterTab() {
  const toast = useToast();
  const call = useApiCall();
  const [status, setStatus] = useState("subscribed");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApiQuery(`/content/manage/newsletter${buildQuery({ status, search, page, limit: 50 })}`);

  const items = data?.items || [];
  const stats = data?.stats || {};
  const totalPages = data?.pagination?.totalPages || 1;

  const toggle = async (row) => {
    const next = row.status === "subscribed" ? "unsubscribed" : "subscribed";
    try {
      await call(`/content/manage/newsletter/${row.id}`, { method: "PUT", body: { status: next } });
      toast.push(next === "subscribed" ? "Resubscribed" : "Unsubscribed", "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const exportCsv = () => {
    const lines = ["email,status,subscribed_at,source_page", ...items.map((r) => [r.email, r.status, r.subscribed_at, r.source_page || ""].join(","))];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-${status || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Subscribed", stats.subscribed],
          ["New in last 30 days", stats.last_30_days],
          ["Unsubscribed", stats.unsubscribed],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-ink-950">{value ?? "—"}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search email"
          className="field-input h-9 w-60"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="field-select h-9 w-44"
        >
          <option value="subscribed">Subscribed</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="">All</option>
        </select>
        <button className="btn-outline btn-sm ml-auto" onClick={exportCsv} disabled={!items.length}>
          Export CSV
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Subscribed</th>
              <th className="px-5 py-3">From page</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 font-semibold text-ink-900">{r.email}</td>
                <td className="px-5 py-3">
                  <StatusBadge value={r.status === "subscribed" ? "Active" : "Inactive"} />
                </td>
                <td className="px-5 py-3 text-ink-500">{formatDate(r.subscribed_at)}</td>
                <td className="px-5 py-3 text-ink-500">{r.source_page || "—"}</td>
                <td className="px-5 py-3 text-right">
                  <button className="text-xs font-semibold text-red-600" onClick={() => toggle(r)}>
                    {r.status === "subscribed" ? "Unsubscribe" : "Resubscribe"}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && !items.length && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-ink-500">
                  No subscribers yet - sign-ups from the website's Blogs &amp; Insights page appear here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="text-ink-500">
            Page {page} of {totalPages}
          </span>
          <button className="btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
