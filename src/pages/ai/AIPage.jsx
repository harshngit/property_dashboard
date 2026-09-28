import { useState } from "react";
import { Link } from "react-router-dom";
import { LuSparkles, LuCheck, LuX } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/common/StatusBadge";
import Avatar from "../../components/common/Avatar";
import Modal from "../../components/common/Modal";
import { SelectField, TextareaField } from "../../components/common/FormField";
import EmptyState from "../../components/common/EmptyState";
import Select from "../../components/common/Select";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery, buildQuery } from "../../hooks/useApi";
import { formatINR, titleCase } from "../../lib/format";

// AI lead qualification review: headline stats (GET /ai/stats), the latest
// insight per lead (GET /ai/insights) and a confirm / override action
// (POST /ai/lead/:id/review). An override also moves the lead's status.

const SCORE_OPTIONS = [
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
];

function budget(i) {
  if (i.extracted_budget_min == null && i.extracted_budget_max == null) return null;
  return `${formatINR(i.extracted_budget_min)} - ${formatINR(i.extracted_budget_max)}`;
}

export default function AIPage() {
  const toast = useToast();
  const call = useApiCall();
  const [days, setDays] = useState(7);
  const [scoreFilter, setScoreFilter] = useState("");
  const [reviewedFilter, setReviewedFilter] = useState("");
  const [overriding, setOverriding] = useState(null);
  const [override, setOverride] = useState({ score: "hot", reason: "" });
  const [busyId, setBusyId] = useState(null);

  const { data: stats } = useApiQuery(`/ai/stats?days=${days}`);
  const { data, loading, reload } = useApiQuery(
    `/ai/insights${buildQuery({ limit: 50, score: scoreFilter, reviewed: reviewedFilter })}`
  );
  const insights = data?.items || [];

  const review = async (insight, body) => {
    setBusyId(insight.lead_id);
    try {
      await call(`/ai/lead/${insight.lead_id}/review`, { method: "POST", body });
      toast.push(body.action === "override" ? "Score overridden and lead updated." : "AI score confirmed.", "success");
      setOverriding(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="AI Lead Qualification" title="AI Qualification" subtitle="Review how AI is scoring, summarising and routing incoming leads." />

      <div className="mb-3 flex justify-end gap-1">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${days === d ? "bg-ink-950 text-white" : "bg-surface-muted text-ink-500"}`}
          >
            {d}d
          </button>
        ))}
      </div>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Leads Qualified (${days}d)`} value={stats?.leads_qualified ?? "—"} delta={stats ? `${stats.hot} hot • ${stats.warm} warm` : ""} tone="up" index={0} />
        <StatCard label="Avg. Scoring Confidence" value={stats?.avg_confidence_percent != null ? `${stats.avg_confidence_percent}%` : "—"} delta={`${stats?.cold ?? 0} cold`} tone="flat" index={1} />
        <StatCard label="Manual Overrides" value={stats?.manual_overrides ?? "—"} delta={stats?.override_rate_percent != null ? `${stats.override_rate_percent}% of reviews` : "No reviews yet"} tone="warn" index={2} />
        <StatCard label="Human Agreement" value={stats?.agreement_rate_percent != null ? `${stats.agreement_rate_percent}%` : "—"} delta={`${stats?.confirmed ?? 0} confirmed`} tone="up" index={3} />
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div className="flex items-center gap-2">
            <LuSparkles className="h-4 w-4 text-red-500" />
            <h3 className="font-display text-base font-bold text-ink-950">Recent AI qualifications</h3>
          </div>
          <div className="flex gap-2">
            <Select
              value={scoreFilter}
              onChange={setScoreFilter}
              options={[{ value: "", label: "All scores" }, ...SCORE_OPTIONS]}
              className="w-36"
            />
            <Select
              value={reviewedFilter}
              onChange={setReviewedFilter}
              options={[
                { value: "", label: "All" },
                { value: "false", label: "Needs review" },
                { value: "true", label: "Reviewed" },
              ]}
              className="w-40"
            />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><InlineSpinner /></div>
        ) : insights.length === 0 ? (
          <EmptyState title="No AI qualifications yet" subtitle="Leads are scored when a summary or score is generated from their notes." />
        ) : (
          <div className="divide-y divide-line">
            {insights.map((i) => (
              <div key={i.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={i.customer_name} size={36} color="#5C6BB8" />
                  <div className="min-w-0">
                    <Link to={`/app/leads/${i.lead_id}`} className="text-sm font-semibold text-ink-900 hover:text-red-600">
                      {i.customer_name}
                    </Link>
                    <p className="truncate text-xs text-ink-500">
                      {[i.extracted_intent && titleCase(i.extracted_intent), i.extracted_property_type && titleCase(i.extracted_property_type), i.extracted_location, budget(i) && `Budget ${budget(i)}`]
                        .filter(Boolean)
                        .join(" • ") || i.summary}
                      {i.assigned_to_name ? ` • Routed to ${i.assigned_to_name}` : " • Unassigned"}
                    </p>
                    {i.review_action && (
                      <p className="mt-0.5 text-[11px] text-ink-400">
                        {i.review_action === "override" ? `Overridden from ${i.ai_score}` : "Confirmed"}
                        {i.review_reason ? ` - ${i.review_reason}` : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-[11px] text-ink-400">{Math.round(Number(i.confidence || 0) * 100)}% conf.</span>
                  <StatusBadge value={titleCase(i.effective_score)} />
                  {busyId === i.lead_id ? (
                    <InlineSpinner />
                  ) : (
                    <>
                      <button onClick={() => review(i, { action: "confirm" })} className="rounded-lg p-1.5 text-green-600 hover:bg-green-50" title="Confirm score">
                        <LuCheck className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setOverride({ score: i.effective_score === "hot" ? "warm" : "hot", reason: "" });
                          setOverriding(i);
                        }}
                        className="rounded-lg p-1.5 text-coral-600 hover:bg-coral-50"
                        title="Override score"
                      >
                        <LuX className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
        AI recommendations assist qualification and routing only. Final lead assignment and deal decisions can always be manually reviewed or overridden.
      </div>

      <Modal open={!!overriding} onClose={() => setOverriding(null)} title="Override AI score" description={overriding?.customer_name}>
        <div className="space-y-4">
          <SelectField label="Correct score" value={override.score} onChange={(e) => setOverride((o) => ({ ...o, score: e.target.value }))} options={SCORE_OPTIONS} />
          <TextareaField label="Reason" rows={3} value={override.reason} onChange={(e) => setOverride((o) => ({ ...o, reason: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setOverriding(null)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={busyId === overriding?.lead_id}
              onClick={() => review(overriding, { action: "override", score: override.score, reason: override.reason || undefined })}
            >
              Save override
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
