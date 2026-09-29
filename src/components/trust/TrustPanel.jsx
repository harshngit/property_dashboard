import { useState } from "react";
import { LuRefreshCw, LuShieldCheck, LuTriangleAlert } from "react-icons/lu";
import { useToast } from "../common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";

// Sec. 8 trust summary for a user (staff view): score, component bars,
// badges (warning = 7 days to restore) and pending verifications.
const LABELS = { verification: "Verification", deals: "Deals", response: "Response", ratings: "Ratings", geo: "Geo" };

export default function TrustPanel({ userId }) {
  const toast = useToast();
  const call = useApiCall();
  const { data: t, loading, error, reload } = useApiQuery(userId ? `/trust/users/${userId}` : null);
  const [busy, setBusy] = useState(false);
  const recompute = async () => {
    setBusy(true);
    try {
      await call(`/trust/users/${userId}/recompute`, { method: "POST" });
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wide text-ink-500">Trust score</h4>
        <button title="Recompute" disabled={busy} onClick={recompute} className="rounded-lg border border-line p-1.5 text-ink-600 hover:bg-surface-muted disabled:opacity-50">
          <LuRefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {loading && !t ? (
        <p className="text-xs text-ink-500">Loading…</p>
      ) : error ? (
        <p className="text-xs text-ink-500">{error}</p>
      ) : (
        <>
          <p className="font-display text-3xl font-extrabold text-ink-950">{t.score}<span className="text-sm font-semibold text-ink-500">/100</span></p>
          <ul className="mt-3 space-y-1.5 text-xs">
            {Object.entries(LABELS).map(([k, l]) => (
              <li key={k}>
                <div className="flex justify-between"><span className="text-ink-700">{l} ({t.weights[k]}%)</span><span className="text-ink-600">{t.components[k]?.score ?? 0}</span></div>
                <div className="mt-0.5 h-1 rounded-full bg-surface-muted"><div className="h-1 rounded-full bg-red-500" style={{ width: `${t.components[k]?.score ?? 0}%` }} /></div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-1">
            {t.badges.map((b) => (
              <span key={b.id} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${b.status === "warning" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                {b.status === "warning" ? <LuTriangleAlert className="h-3 w-3" /> : <LuShieldCheck className="h-3 w-3" />} {b.label}
              </span>
            ))}
          </div>
          {t.verifications.some((v) => v.status === "pending") && (
            <p className="mt-3 text-xs text-amber-700">Pending verifications - review them in Trust & Reviews.</p>
          )}
          {t.inputs?.reviews ? <p className="mt-2 text-xs text-ink-500">{t.inputs.ratingAvg}★ from {t.inputs.reviews} reviews · {t.inputs.deals} deals</p> : null}
        </>
      )}
    </div>
  );
}
