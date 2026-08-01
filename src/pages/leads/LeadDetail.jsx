import { useNavigate, useParams } from "react-router-dom";
import { LuArrowLeft, LuPencil, LuPhone, LuMessageCircle, LuSparkles, LuMapPin, LuWallet } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import Avatar from "../../components/common/Avatar";
import EmptyState from "../../components/common/EmptyState";
import { LEADS } from "../../data/mockData";

const TIMELINE = [
  { title: "Lead created from Website inquiry", time: "3 days ago" },
  { title: "AI qualification: hot lead, budget matched", time: "3 days ago" },
  { title: "Assigned to broker for follow-up", time: "2 days ago" },
  { title: "Call completed — interested in site visit", time: "1 day ago" },
  { title: "Site visit scheduled", time: "2 hrs ago" },
];

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const lead = LEADS.find((l) => l.id === id);

  if (!lead) return <EmptyState title="Lead not found" subtitle={`No lead with id ${id}.`} />;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
        <LuArrowLeft className="h-4 w-4" /> Back to leads
      </button>

      <PageHeader
        eyebrow={lead.id}
        title={lead.name}
        subtitle="Full inquiry history, AI qualification and matched properties."
        actions={
          <>
            <button className="btn-outline"><LuPhone className="h-4 w-4" /> Call</button>
            <button className="btn-outline"><LuMessageCircle className="h-4 w-4" /> WhatsApp</button>
            <button onClick={() => navigate(`/app/leads/${lead.id}/edit`)} className="btn-primary">
              <LuPencil className="h-4 w-4" /> Edit
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <div className="flex items-center gap-3">
            <Avatar name={lead.name} size={48} color="#5C6BB8" />
            <div>
              <p className="font-display font-bold text-ink-950">{lead.name}</p>
              <p className="text-xs text-ink-500">{lead.phone}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-ink-500">Score</span><StatusBadge value={lead.score} /></div>
            <div className="flex items-center justify-between"><span className="text-ink-500">Status</span><StatusBadge value={lead.status} /></div>
            <div className="flex items-center justify-between"><span className="text-ink-500">Source</span><span className="font-semibold text-ink-900">{lead.source}</span></div>
            <div className="flex items-center justify-between"><span className="text-ink-500">Owner</span><span className="font-semibold text-ink-900">{lead.owner}</span></div>
          </div>
          <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex items-center gap-2 text-ink-700"><LuMapPin className="h-4 w-4 text-indigo-500" /> {lead.property}</div>
            <div className="flex items-center gap-2 text-ink-700"><LuWallet className="h-4 w-4 text-indigo-500" /> Budget: {lead.budget}</div>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <LuSparkles className="h-4 w-4 text-red-500" />
            <h3 className="font-display text-base font-bold text-ink-950">AI qualification summary</h3>
          </div>
          <p className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-ink-700">
            Prospect is actively searching for a {lead.property.split(",")[1]?.trim() || "matching unit"} near
            {" "}{lead.property.split(",")[0]}, budget around {lead.budget}, timeline within 60 days. Scored{" "}
            <strong className="capitalize">{lead.score}</strong> based on responsiveness and budget fit.
          </p>

          <h3 className="mb-3 mt-6 font-display text-base font-bold text-ink-950">Activity timeline</h3>
          <div className="space-y-4">
            {TIMELINE.map((t, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  {i < TIMELINE.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-line" />}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium text-ink-900">{t.title}</p>
                  <p className="text-xs text-ink-500">{t.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
