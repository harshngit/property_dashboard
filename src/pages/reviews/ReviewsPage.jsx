import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LuStar, LuSearch } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";

// Reviews desk (admin / super admin): every customer review in one place,
// whatever its status - live on the website, held by the fake-review filter,
// hidden or rejected - with the actions to publish, hide or reject it.
// A review shows on the website only while it is "Published".

const TABS = [
  { key: "", label: "All", stat: "total" },
  { key: "pending_moderation", label: "Waiting for approval", stat: "pending" },
  { key: "published", label: "Published", stat: "published" },
  { key: "hidden", label: "Hidden", stat: "hidden" },
  { key: "rejected", label: "Rejected", stat: "rejected" },
];
const STATUS_LABEL = { published: "Published", pending_moderation: "Waiting for approval", hidden: "Hidden", rejected: "Rejected" };
const ACTIONS = {
  approve: { label: "Publish", done: "Review published - it now shows on the website.", note: false },
  hide: { label: "Hide", done: "Review hidden from the website.", note: true },
  reject: { label: "Reject", done: "Review rejected.", note: true },
};

function Stars({ value }) {
  return (
    <span className="inline-flex text-amber-500">
      {[1, 2, 3, 4, 5].map((i) => (
        <LuStar key={i} className="h-3.5 w-3.5" fill={i <= value ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const toast = useToast();
  const call = useApiCall();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [rating, setRating] = useState("");
  const [reported, setReported] = useState(false);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState(null); // { review, action }
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const propertyId = searchParams.get("propertyId") || "";

  useEffect(() => {
    const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, reload } = useApiQuery(`/trust/reviews${buildQuery({ status, rating, q, propertyId, reported: reported ? "true" : "", page, limit: 20 })}`);
  const stats = data?.stats || {};
  const rows = data?.items || [];
  const total = data?.pagination?.total || 0;
  const pages = Math.max(1, Math.ceil(total / 20));

  const run = async (review, action, text) => {
    setBusy(true);
    try {
      await call(`/trust/reviews/${review.id}/moderate`, { method: "PUT", body: { action, note: text || undefined } });
      toast.push(ACTIONS[action].done, "success");
      setActing(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const start = (review, action) => {
    if (!ACTIONS[action].note) return run(review, action);
    setNote("");
    setActing({ review, action });
    return undefined;
  };

  return (
    <div>
      <PageHeader eyebrow="Trust & Reputation" title="Reviews" subtitle="Every customer review and where it stands. Only published reviews show on the website." />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Published", stats.published],
          ["Waiting for approval", stats.pending],
          ["Reported", stats.reported],
          ["Hidden / rejected", (stats.hidden || 0) + (stats.rejected || 0)],
          ["Average rating", stats.average != null ? `${stats.average} / 5` : "—"],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-ink-900">{value ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => { setStatus(t.key); setPage(1); }} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${status === t.key ? "bg-ink-900 text-white" : "bg-surface-muted text-ink-700 hover:bg-line"}`}>
            {t.label} <span className="opacity-70">({stats[t.stat] ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input className="field-input pl-9" placeholder="Search review text, customer, reviewed person or property" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="field-input w-auto" aria-label="Rating" value={rating} onChange={(e) => { setRating(e.target.value); setPage(1); }}>
          <option value="">Any rating</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={reported} onChange={(e) => { setReported(e.target.checked); setPage(1); }} />
          Reported only
        </label>
        {propertyId && <Link to="/app/reviews" className="text-sm font-semibold text-red-600">Showing one property - clear</Link>}
      </div>

      {loading && !data ? (
        <InlineSpinner />
      ) : error ? (
        <div className="card p-6 text-sm text-red-600">{error}</div>
      ) : !rows.length ? (
        <EmptyState title="No reviews here" subtitle="Customers can write a review from their website dashboard after a completed site visit, a closed deal or a confirmed lease." />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="card p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="font-semibold text-ink-900">{r.title || titleCase(r.interaction)}</span>
                    <StatusBadge value={STATUS_LABEL[r.status] || titleCase(r.status)} />
                    {r.reportedAt && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Reported</span>}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    <span data-no-translate>{r.reviewerName}</span> reviewed <span data-no-translate>{r.subjectName}</span> · {titleCase(r.interaction)} · {formatDate(r.createdAt, true)}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    Property:{" "}
                    {r.propertyId ? (
                      <Link to={`/app/properties/${r.propertyId}`} className="font-semibold text-red-600" data-no-translate>{r.propertyTitle || "Open listing"}</Link>
                    ) : (
                      "No property linked"
                    )}
                  </p>
                  {r.body && <p className="mt-2 whitespace-pre-line text-ink-800" data-no-translate>{r.body}</p>}
                  {r.reply && <p className="mt-2 rounded-lg bg-surface-muted p-2 text-xs text-ink-700"><span className="font-semibold">Reply:</span> <span data-no-translate>{r.reply}</span></p>}
                  {(r.fraudScore > 0 || r.fraudReasons?.length > 0) && (
                    <p className="mt-2 text-xs">
                      <span className={`font-bold ${r.fraudScore >= 40 ? "text-red-600" : "text-ink-700"}`}>Fraud score {r.fraudScore}</span>
                      {r.fraudReasons?.length ? <span className="text-ink-500"> · {r.fraudReasons.join(" · ")}</span> : null}
                    </p>
                  )}
                  {r.reportedAt && <p className="mt-1 text-xs text-amber-700">Reported by the reviewed person: {r.reportReason}</p>}
                  {r.moderationNote && <p className="mt-1 text-xs text-ink-500">Admin note: {r.moderationNote}</p>}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {r.status !== "published" && <button className="btn-primary btn-sm" disabled={busy} onClick={() => start(r, "approve")}>Publish</button>}
                  {r.status === "published" && <button className="btn-outline btn-sm" disabled={busy} onClick={() => start(r, "hide")}>Hide</button>}
                  {r.status !== "rejected" && <button className="btn-outline btn-sm" disabled={busy} onClick={() => start(r, "reject")}>Reject</button>}
                </div>
              </div>
            </div>
          ))}
          {pages > 1 && (
            <div className="flex items-center justify-between pt-2 text-sm text-ink-600">
              <span>Page {page} of {pages} · {total} reviews</span>
              <div className="flex gap-2">
                <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                <button className="btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={!!acting} onClose={() => setActing(null)} title={acting ? `${ACTIONS[acting.action].label} this review?` : ""} description="It stops showing on the website. The customer who wrote it is told. You can publish it again later.">
        <TextareaField label="Note for the audit log (optional)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setActing(null)}>Cancel</button>
          <button className="btn-primary" disabled={busy} onClick={() => run(acting.review, acting.action, note.trim())}>{acting ? ACTIONS[acting.action].label : ""}</button>
        </div>
      </Modal>
    </div>
  );
}
