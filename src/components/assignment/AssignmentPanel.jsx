import { useEffect, useState } from "react";
import { LuPhoneCall } from "react-icons/lu";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { useToast } from "../common/ToastProvider";
import { formatDate } from "../../lib/format";

// Sec. 34 assignment cascade on Lead Detail: the A R representative holding
// the inquiry, the hop and its window, the overall response SLA, the "Log
// first contact" action (stops the cascade) and the full transfer trail.

const ROUTE = {
  buyer_broker_rm: "Buyer's broker's RM",
  seller_broker_rm: "Seller's broker's RM",
  unmapped_broker_rm: "Least-busy RM (broker not mapped)",
  dm_least_busy: "Least-busy DM in region",
  next_free: "Next free RM / DM",
  system_pool: "System pool",
  preassigned_rm: "Investor's own RM",
  manual: "Manual reassignment",
  legacy: "Before the cascade",
};
const KIND = {
  assigned: "Assigned",
  transferred: "Transferred",
  missed: "Window missed",
  manual_reassign: "Reassigned manually",
  exit_reinjected: "Re-routed (rep left)",
  contacted: "First contact logged",
  mapping_gap: "Broker has no mapped RM",
  sla_breached: "Response SLA breached",
};

function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function left(due, now) {
  const mins = Math.round((new Date(due).getTime() - now) / 60000);
  if (mins <= 0) return { text: "overdue", tone: "text-red-600" };
  if (mins < 60) return { text: `${mins} min left`, tone: mins <= 5 ? "text-red-600" : "text-amber-700" };
  const h = Math.floor(mins / 60);
  return { text: `${h} h ${mins % 60} min left`, tone: "text-ink-600" };
}

export default function AssignmentPanel({ leadId, onChange }) {
  const { user, role } = useAuth();
  const toast = useToast();
  const call = useApiCall();
  const now = useNow();
  const { data, reload } = useApiQuery(leadId ? `/leads/${leadId}/assignment` : null);
  const [busy, setBusy] = useState(false);
  if (!data) return null;

  const isRep = data.arb_rep_id && data.arb_rep_id === user?.id;
  const canLog = !data.first_contacted_at && (isRep || ["admin", "super_admin"].includes(role));
  const logContact = async () => {
    setBusy(true);
    try {
      await call(`/leads/${leadId}/contacted`, { method: "POST" });
      toast.push("First contact logged - the inquiry stays with you.", "success");
      reload();
      onChange?.();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const windowLeft = data.assignment_due_at && !data.first_contacted_at ? left(data.assignment_due_at, now) : null;
  const slaLeft = data.response_sla_due_at && !data.first_contacted_at ? left(data.response_sla_due_at, now) : null;

  return (
    <div className="card p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-500">A R representative</p>
      {data.representative ? (
        <div className="mt-2">
          <p className="font-semibold text-ink-900">{data.representative.name}</p>
          <p className="text-xs text-ink-500">
            {(data.representative.designation || "rep").toUpperCase()}
            {data.representative.platformNumber ? ` · ${data.representative.platformNumber}` : " · no platform number set"}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-amber-700">Not assigned yet - no representative available. It is retried automatically.</p>
      )}
      <div className="mt-3 space-y-1 text-xs text-ink-600">
        {data.assignment_hop > 0 && <p>Hop {data.assignment_hop} · {ROUTE[data.assignment_route] || data.assignment_route}</p>}
        {data.first_contacted_at ? (
          <p className="font-semibold text-emerald-700">First contact {formatDate(data.first_contacted_at, true)}{data.first_contacted_by_name ? ` by ${data.first_contacted_by_name}` : ""} - assignment is sticky.</p>
        ) : (
          <>
            {windowLeft && <p>Hop window: <span className={`font-semibold ${windowLeft.tone}`}>{windowLeft.text}</span> (moves on automatically)</p>}
            {slaLeft && <p>Response SLA ({data.response_sla_hours} h): <span className={`font-semibold ${slaLeft.tone}`}>{slaLeft.text}</span></p>}
          </>
        )}
      </div>
      {canLog && (
        <button className="btn-primary btn-sm mt-3 inline-flex w-full items-center justify-center gap-1.5" disabled={busy} onClick={logContact}>
          <LuPhoneCall className="h-3.5 w-3.5" /> Log first contact
        </button>
      )}
      {(data.events || []).length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-3 text-xs">
          {data.events.map((e, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="text-ink-800">
                {KIND[e.kind] || e.kind}
                {e.to_name && e.kind !== "contacted" ? ` → ${e.to_name}` : ""}
                {e.from_name && ["missed", "exit_reinjected", "contacted", "sla_breached"].includes(e.kind) ? ` (${e.from_name})` : ""}
              </span>
              <span className="shrink-0 text-ink-500">{formatDate(e.created_at, true)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
