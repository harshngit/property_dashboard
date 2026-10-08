import { useState } from "react";
import { LuCircleCheck, LuCircle, LuLock, LuCircleAlert } from "react-icons/lu";
import { TextField, TextareaField } from "../../components/common/FormField";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";

// One institutional deal: the nine-stage tracker, what the next stage is
// waiting for, the NDA / data-room status, the action that fits the current
// stage, term sheets and offers, and the log. The stage moves on by itself
// when its requirement is met; admins can move it by hand with a reason.

const cr = (v) => (v === null || v === undefined ? "—" : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`);
const ADMIN = ["admin", "super_admin"];
const EVENT = { created: "Intent received", stage: "Stage", note: "Note", site_visit: "Site visit", valuation: "Valuation shared", legal: "Legal due diligence", offer: "Offer", hold: "Hold", dropped: "Dropped", closed: "Closed", override: "Manual stage move" };

function describe(e, stages) {
  const d = e.detail || {};
  const label = (s) => stages.find((x) => x.value === s)?.label || s;
  if (e.kind === "stage" || e.kind === "override") return `${label(e.fromStage)} → ${label(e.toStage)}${d.reason ? ` · ${d.reason}` : d.auto ? " · automatic" : ""}`;
  if (e.kind === "site_visit") return d.completed ? "Campus visit completed" : `Scheduled for ${formatDate(d.scheduledAt, true)}`;
  if (e.kind === "offer") return `${titleCase(String(d.kind || d.decision || "").replace(/_/g, " "))}${d.byParty ? ` by ${d.byParty}` : ""} · ${cr(d.amountCr)}`;
  if (e.kind === "valuation") return d.range ? `${cr(d.range.lowCr)} – ${cr(d.range.highCr)}` : "";
  if (e.kind === "closed") return `Agreed ${cr(d.agreedValueCr)} · advisory fee ${cr(d.advisoryFeeCr)}`;
  return d.text || d.note || d.reason || "";
}

export default function InstitutionalDealPanel({ dealId }) {
  const { role } = useAuth();
  const call = useApiCall();
  const toast = useToast();
  const { data: d, reload } = useApiQuery(`/institutional/deals/${dealId}`);
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  if (!d) return <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const run = async (fn, message) => {
    setBusy(true);
    try {
      await fn();
      toast.push(message, "success");
      setF({});
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const act = (action, body, message) => run(() => call(`/institutional/manage/deals/${dealId}/${action}`, { method: "POST", body: body || {} }), message);
  const active = d.status === "active";
  const openOffer = d.offers.find((o) => o.status === "open");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-ink-950">{d.dealNumber} · {d.listing.institutionName || d.listing.title}</p>
          <p className="text-sm text-ink-600">{d.listing.assetClassLabel} · asking {cr(d.listing.askingPriceCr)} · buyer: {d.buyer?.fullName || "not registered"}{d.buyer?.profile ? ` (${d.buyer.profile.buyerTypeLabel}, ${titleCase(d.buyer.profile.status)})` : ""}</p>
          <p className="text-xs text-ink-500">Representative: {d.representative?.name || "unassigned"} · opened {formatDate(d.createdAt)} · {titleCase(d.source || "")}</p>
        </div>
        <div className="text-right text-xs">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold ${d.nda.signed ? "bg-emerald-50 text-emerald-700" : "bg-surface-muted text-ink-600"}`}><LuLock className="h-3.5 w-3.5" /> {d.nda.signed ? `NDA signed ${formatDate(d.nda.signedAt)}` : "NDA not signed"}</span>
          <p className="mt-1 text-ink-500">Data room: {titleCase(d.nda.access.replace(/_/g, " "))}</p>
          {d.status !== "active" && <p className="mt-1 font-bold uppercase text-ink-700">{titleCase(d.status.replace(/_/g, " "))}{d.dropReason ? ` · ${d.dropReason}` : ""}</p>}
        </div>
      </div>

      <ol className="grid grid-cols-3 gap-1.5 md:grid-cols-9">
        {d.stages.map((s) => (
          <li key={s.value} className={`rounded-lg px-2 py-2 text-center text-[11px] font-semibold leading-tight ${s.done ? "bg-emerald-50 text-emerald-700" : s.current ? "bg-red-600 text-white" : "bg-surface-muted text-ink-500"}`}>
            <span className="block text-[10px] opacity-80">{s.number}</span>{s.label}
          </li>
        ))}
      </ol>

      {active && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-surface-muted p-4">
            <p className={`flex items-center gap-1.5 text-sm font-semibold ${d.slaOverdue ? "text-red-700" : "text-ink-900"}`}>
              {d.slaOverdue && <LuCircleAlert className="h-4 w-4" />}{d.daysInStage} day(s) in {d.stageLabel}{d.slaDays ? ` · expected ${d.slaDays}` : ""}
            </p>
            {d.nextLabel && <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-500">To reach {d.nextLabel}</p>}
            {!d.nextLabel && d.stage === "closure" && <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-500">To close the deal</p>}
            <ul className="mt-1.5 space-y-1">
              {d.nextRequirements.map((r) => (
                <li key={r.key} className={`flex items-start gap-1.5 text-sm ${r.met ? "text-emerald-700" : "text-ink-700"}`}>{r.met ? <LuCircleCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <LuCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" />} {r.label}</li>
              ))}
            </ul>
          </div>

          {/* The action that belongs to the current stage */}
          <div className="rounded-xl border border-line p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Action</p>
            {d.stage === "intent_received" && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-ink-700">Speak to the buyer and confirm the intent is genuine.</p>
                <TextField label="Screening note (optional)" value={f.note || ""} onChange={set("note")} />
                <button className="btn-primary btn-sm" disabled={busy} onClick={() => act("screen", { note: f.note || undefined }, "Intent screened.")}>Mark screened</button>
              </div>
            )}
            {d.stage === "buyer_qualification" && <p className="mt-2 text-sm text-ink-700">Qualify the buyer under the Buyers tab. The buyer then signs the NDA on the listing page - the deal moves on by itself.</p>}
            {d.stage === "nda_executed" && <p className="mt-2 text-sm text-ink-700">The NDA is signed. An admin approves the data-room request under Opportunity Deals → Deal rooms; the deal then moves to Data Room Access.</p>}
            {d.stage === "data_room_access" && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-ink-700">The buyer can now see the documents. Schedule the campus visit.</p>
                <TextField label="Visit date & time" type="datetime-local" value={f.at || ""} onChange={set("at")} />
                <button className="btn-primary btn-sm" disabled={busy || !f.at} onClick={() => act("schedule_visit", { at: new Date(f.at).toISOString() }, "Campus visit scheduled - buyer notified.")}>Schedule visit</button>
              </div>
            )}
            {d.stage === "site_visit" && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-ink-700">Visit on {formatDate(d.siteVisitAt, true)}.</p>
                <button className="btn-primary btn-sm" disabled={busy} onClick={() => act("complete_visit", {}, "Visit marked completed.")}>Mark visit completed</button>
              </div>
            )}
            {d.stage === "valuation_discussion" && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-ink-700">Take the buyer through the valuation (see the listing's valuation), then record that it was shared.</p>
                <button className="btn-primary btn-sm" disabled={busy} onClick={() => act("share_valuation", {}, "Valuation shared.")}>Valuation shared with buyer</button>
              </div>
            )}
            {d.stage === "legal_due_diligence" && (
              <div className="mt-2 space-y-2">
                <TextareaField label="Legal panel's finding (title, trust deed, regulatory compliance)" rows={3} value={f.note || ""} onChange={set("note")} />
                <button className="btn-primary btn-sm" disabled={busy || !(f.note || "").trim()} onClick={() => act("clear_legal", { note: f.note }, "Legal due diligence cleared.")}>Clear legal due diligence</button>
              </div>
            )}
            {d.stage === "offer_negotiation" && (
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block"><span className="field-label">Type</span><select id="offer-kind" className="field-select" value={f.kind || "term_sheet"} onChange={set("kind")}><option value="term_sheet">Term sheet</option><option value="offer">Offer</option><option value="counter_offer">Counter-offer</option></select></label>
                  <label className="block"><span className="field-label">From</span><select id="offer-party" className="field-select" value={f.byParty || "seller"} onChange={set("byParty")}><option value="seller">Seller</option><option value="buyer">Buyer</option><option value="platform">A R Buildwel</option></select></label>
                </div>
                <TextField label="Amount (₹ Cr)" type="number" value={f.amountCr || ""} onChange={set("amountCr")} />
                <TextareaField label="Key terms" rows={2} value={f.terms || ""} onChange={set("terms")} />
                <button className="btn-primary btn-sm" disabled={busy || !(Number(f.amountCr) > 0)} onClick={() => run(() => call(`/institutional/deals/${dealId}/offers`, { method: "POST", body: { kind: f.kind || "term_sheet", byParty: f.byParty || "seller", amountCr: Number(f.amountCr), terms: f.terms || undefined } }), "Recorded.")}>Record</button>
              </div>
            )}
            {d.stage === "closure" && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-ink-700">Agreed value {cr(d.agreedValueCr)}. Record execution and payment to close.</p>
                <TextField label="Agreement executed on" type="date" value={f.agreementDate || ""} onChange={set("agreementDate")} />
                <label className="flex items-center gap-2 text-sm text-ink-700"><input id="close-paid" type="checkbox" checked={!!f.paid} onChange={(e) => setF((x) => ({ ...x, paid: e.target.checked }))} className="h-4 w-4 accent-red-600" /> Payment confirmed</label>
                <button className="btn-primary btn-sm" disabled={busy || !f.agreementDate || !f.paid} onClick={() => run(() => call(`/institutional/manage/deals/${dealId}/close`, { method: "POST", body: { agreementDate: f.agreementDate, paymentConfirmed: true } }), "Deal closed.")}>Close deal</button>
              </div>
            )}
          </div>
        </div>
      )}

      {d.offers.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Term sheets and offers</p>
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
            {d.offers.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span><b>{titleCase(o.kind.replace(/_/g, " "))}</b> from the {o.byParty === "platform" ? "desk" : o.byParty} · <b>{cr(o.amountCr)}</b>{o.terms ? ` · ${o.terms}` : ""}<span className="ml-2 text-xs text-ink-500">{formatDate(o.createdAt, true)}</span></span>
                <span className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${o.status === "accepted" ? "bg-emerald-50 text-emerald-700" : o.status === "open" ? "bg-amber-50 text-amber-700" : "bg-surface-muted text-ink-500"}`}>{titleCase(o.status)}</span>
                  {o.status === "open" && active && (
                    <>
                      <button className="btn-primary btn-sm" disabled={busy} onClick={() => run(() => call(`/institutional/manage/offers/${o.id}`, { method: "PUT", body: { decision: "accepted" } }), "Offer accepted - deal moves to Closure.")}>Accept</button>
                      <button className="btn-outline btn-sm" disabled={busy} onClick={() => run(() => call(`/institutional/manage/offers/${o.id}`, { method: "PUT", body: { decision: "rejected" } }), "Offer rejected.")}>Reject</button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {openOffer && d.stage === "offer_negotiation" && <p className="mt-1 text-xs text-ink-500">Recording a new offer replaces the open one.</p>}
        </div>
      )}

      {d.status !== "closed_won" && d.status !== "dropped" && (
        <div className="flex flex-wrap items-end gap-2 border-t border-line pt-4">
          <div className="min-w-[220px] flex-1"><TextField label="Note / reason" value={f.extra || ""} onChange={set("extra")} /></div>
          <button className="btn-outline btn-sm" disabled={busy || !(f.extra || "").trim()} onClick={() => act("note", { note: f.extra }, "Note added.")}>Add note</button>
          {active ? <button className="btn-outline btn-sm" disabled={busy} onClick={() => act("hold", { note: f.extra || undefined }, "Deal put on hold.")}>Hold</button> : <button className="btn-outline btn-sm" disabled={busy} onClick={() => act("resume", {}, "Deal resumed.")}>Resume</button>}
          <button className="btn-outline btn-sm" disabled={busy || !(f.extra || "").trim()} onClick={() => act("drop", { note: f.extra }, "Deal dropped.")}>Drop</button>
          {ADMIN.includes(role) && active && (
            <>
              <select id="move-stage" className="field-select h-9 w-48" value={f.move || ""} onChange={set("move")}><option value="">Move stage (admin)…</option>{d.stages.map((s) => <option key={s.value} value={s.value}>{s.number}. {s.label}</option>)}</select>
              <button className="btn-outline btn-sm" disabled={busy || !f.move || !(f.extra || "").trim()} onClick={() => act("move", { stage: f.move, note: f.extra }, "Stage moved (logged).")}>Move</button>
            </>
          )}
        </div>
      )}

      {d.status === "closed_won" && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Closed {formatDate(d.closedAt)} · agreed {cr(d.agreedValueCr)} · agreement {formatDate(d.agreementDate)} · advisory fee {cr(d.advisoryFeeCr)}</p>}
      {d.legalNotes && <p className="text-xs text-ink-600"><b>Legal finding:</b> {d.legalNotes}</p>}

      <details className="border-t border-line pt-3" open>
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ink-500">Log ({(d.events || []).length})</summary>
        <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
          {(d.events || []).map((e) => (
            <li key={e.id} className="text-xs text-ink-600"><b>{EVENT[e.kind] || e.kind}</b>{describe(e, d.stages) ? ` · ${describe(e, d.stages)}` : ""} · {e.actorName || "System"} · {formatDate(e.createdAt, true)}</li>
          ))}
        </ul>
      </details>
      <p className="text-[11px] text-ink-400">{d.disclaimer}</p>
    </div>
  );
}
