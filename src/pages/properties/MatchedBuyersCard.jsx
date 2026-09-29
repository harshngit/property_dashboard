import { useState } from "react";
import { LuSend } from "react-icons/lu";
import MatchBadge from "../../components/common/MatchBadge";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";

// Sec. 7 smart recommendations: buyers whose requirements match this
// listing (identity masked - mandatory intermediation), with match badge +
// breakdown. The listing broker / A R staff can send the listing into a
// buyer's matches (needed for Lukewarm matches, which are not shown
// automatically). Price-Compatible is visible to A R staff only.
export default function MatchedBuyersCard({ propertyId, status }) {
  const toast = useToast();
  const call = useApiCall();
  const { data, loading, error, reload } = useApiQuery(status === "approved" ? `/matching/listings/${propertyId}/buyers` : null);
  const [busy, setBusy] = useState(null);
  const rows = data || [];

  const send = async (requirementId) => {
    setBusy(requirementId);
    try {
      await call(`/matching/requirements/${requirementId}/send`, { method: "POST", body: { propertyId } });
      toast.push("Sent to the buyer's matches.", "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card p-5">
      <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-ink-500">Matched buyers ({rows.length})</h3>
      <p className="mb-3 text-xs text-ink-500">Buyer requirements this listing matches. Buyer identity stays with the A R representative.</p>
      {status !== "approved" ? (
        <p className="text-sm text-ink-500">Matching runs once the listing is live.</p>
      ) : loading && !data ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-ink-500">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-500">No active requirements match this listing yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
              <tr><th className="py-2">Requirement</th><th className="py-2">Budget</th><th className="py-2">Match</th><th className="py-2">Posted</th><th className="py-2" /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.requirement.id}>
                  <td className="py-2">
                    <p className="font-semibold text-ink-900">
                      {titleCase(r.requirement.propertyType) || "Any property"} · {[...(r.requirement.localities || []), r.requirement.city].filter(Boolean).join(", ")}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {r.requirement.hot && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">Hot requirement</span>}
                      {r.requirement.priority && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">Priority buyer</span>}
                      {r.priceCompatible && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Price-compatible</span>}
                    </div>
                  </td>
                  <td className="py-2">{r.requirement.budgetDisplay}</td>
                  <td className="py-2"><MatchBadge score={r.score} tier={r.tier} breakdown={r.breakdown} /></td>
                  <td className="py-2 text-ink-500">{formatDate(r.requirement.postedAt)}</td>
                  <td className="py-2 text-right">
                    {r.sentAt ? (
                      <span className="text-xs text-ink-500">Sent {formatDate(r.sentAt)}</span>
                    ) : (
                      <button className="btn-outline btn-sm" disabled={busy === r.requirement.id} onClick={() => send(r.requirement.id)}>
                        <LuSend className="h-3.5 w-3.5" /> Send
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
