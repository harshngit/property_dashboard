import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/common/StatusBadge";
import Avatar from "../../components/common/Avatar";
import { LuSparkles, LuCheck, LuX } from "react-icons/lu";
import { LEADS } from "../../data/mockData";

export default function AIPage() {
  const sample = LEADS.slice(0, 5);

  return (
    <div>
      <PageHeader
        eyebrow="AI Lead Qualification"
        title="AI Qualification"
        subtitle="Review how AI is scoring, summarising and routing incoming leads."
      />
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Leads Qualified (7d)" value="186" delta="+14%" tone="up" index={0} />
        <StatCard label="Avg. Scoring Confidence" value="91%" delta="Stable" tone="flat" index={1} />
        <StatCard label="Manual Overrides" value="12" delta="6.4%" tone="warn" index={2} />
        <StatCard label="Routing Accuracy" value="96%" delta="+2%" tone="up" index={3} />
      </div>

      <div className="card">
        <div className="flex items-center gap-2 border-b border-line p-5">
          <LuSparkles className="h-4 w-4 text-red-500" />
          <h3 className="font-display text-base font-bold text-ink-950">Recent AI qualifications</h3>
        </div>
        <div className="divide-y divide-line">
          {sample.map((lead) => (
            <div key={lead.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={lead.name} size={36} color="#5C6BB8" />
                <div>
                  <p className="text-sm font-semibold text-ink-900">{lead.name}</p>
                  <p className="text-xs text-ink-500">
                    Extracted: {lead.property} • Budget {lead.budget} • Routed to {lead.owner}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge value={lead.score} />
                <button className="rounded-lg p-1.5 text-green-600 hover:bg-green-50" title="Confirm score"><LuCheck className="h-4 w-4" /></button>
                <button className="rounded-lg p-1.5 text-coral-600 hover:bg-coral-50" title="Override score"><LuX className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
        AI recommendations assist qualification and routing only. Final lead assignment and deal decisions can always be manually reviewed or overridden.
      </div>
    </div>
  );
}
