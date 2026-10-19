import { useState } from "react";
import { Link } from "react-router-dom";
import { LuRefreshCw, LuTriangleAlert, LuUsers } from "react-icons/lu";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";

// Contract sec. 33.12 - related-party transactions for City Head / Super Admin
// review. A listing, inquiry or deal is flagged when a party is an employee's
// own account or a disclosed family member's; it is routed away from the
// employee and their incentive, not blocked. Every detection and review is
// kept on record; "undisclosed" goes to the Super Admin for a Section 35 decision.

const KIND_LABEL = { property: "Listing", lead: "Inquiry", deal: "Deal" };
const OUTCOMES = [
  { value: "disclosed_ok", label: "Disclosed - in order" },
  { value: "not_related", label: "Not actually related" },
  { value: "noted", label: "Noted - keep watching" },
  { value: "undisclosed", label: "Undisclosed - Section 35 matter" },
];
const OUTCOME_TONE = { disclosed_ok: "bg-emerald-50 text-emerald-700", not_related: "bg-slate-100 text-slate-600", noted: "bg-sky-50 text-sky-700", undisclosed: "bg-red-50 text-red-700" };
const th = "px-4 py-3";

function ReviewModal({ item, onClose, onDone }) {
  const call = useApiCall();
  const toast = useToast();
  const hist = useApiQuery(`/related-party/${item.entityType}/${item.id}`);
  const [outcome, setOutcome] = useState("disclosed_ok");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await call(`/related-party/${item.entityType}/${item.id}/review`, { method: "POST", body: { outcome, note } });
      toast.push(outcome === "undisclosed" ? "Recorded - the Super Admin is alerted for a Section 35 decision." : "Review recorded.", "success");
      onDone();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const h = hist.data;
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-700">
        {KIND_LABEL[item.entityType]} linked to {item.employees.map((e) => e.name).join(", ")}.{" "}
        <Link to={item.link} className="font-semibold text-red-600 hover:underline">Open the record</Link>
      </p>
      {item.selfAssigned && <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><LuTriangleAlert className="h-4 w-4 shrink-0" /> The linked employee is its representative. Reassign it to someone else.</p>}
      {!h ? <InlineSpinner /> : (
        <div className="space-y-2 text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-500">On record</p>
          <ul className="space-y-1 border-l border-line pl-4">
            {h.detections.map((d, i) => <li key={`d${i}`}>Detected {formatDate(d.detected_at, true)}</li>)}
            {h.cascade.map((c, i) => <li key={`c${i}`}>{c.kind === "rp_rerouted" ? "Moved off the linked employee by the cascade" : "No other representative - sent to the Team Leader / admins for manual assignment"} · {formatDate(c.created_at, true)}</li>)}
            {h.reviews.map((r, i) => <li key={`r${i}`}><span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${OUTCOME_TONE[r.outcome]}`}>{OUTCOMES.find((o) => o.value === r.outcome)?.label}</span> {r.note} <span className="text-xs text-ink-500">- {r.reviewer || "—"}, {formatDate(r.reviewed_at, true)}</span></li>)}
          </ul>
        </div>
      )}
      <div className="grid gap-3">
        <label className="field-label">Outcome
          <select className="field-select mt-1" value={outcome} onChange={(e) => setOutcome(e.target.value)}>{OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </label>
        <label className="field-label">What was checked (kept on record, cannot be edited)
          <textarea className="field-input mt-1 min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={busy || note.trim().length < 5} onClick={save}>Record review</button>
      </div>
    </div>
  );
}

export default function RelatedPartyTab() {
  const call = useApiCall();
  const toast = useToast();
  const [view, setView] = useState("queue");
  const [review, setReview] = useState("open");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const [scanning, setScanning] = useState(false);
  const dash = useApiQuery(`/related-party/dashboard${buildQuery({ review, entityType: kind, q })}`);
  const linked = useApiQuery(view === "accounts" ? "/related-party/linked-accounts" : null);
  const disclosures = useApiQuery(view === "disclosures" ? "/related-party/disclosures" : null);
  const s = dash.data?.summary;

  const rescan = async () => {
    setScanning(true);
    try {
      const r = await call("/related-party/rescan", { method: "POST" });
      toast.push(`Re-checked: ${r.data.changed} record(s) changed, ${r.data.rerouted} inquiry(ies) moved off a linked employee.`, "success");
      dash.reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-surface-muted px-4 py-3 text-xs text-ink-600">
        Employees may buy or sell on the platform. When a party is an employee's own account or a disclosed family member's (matched by mobile or PAN), the transaction is flagged, never assigned to that employee, and kept out of their performance - not blocked. Detections and reviews cannot be edited or deleted.
      </p>
      {s && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[["Linked accounts", s.linked_accounts], ["Listings", s.listings], ["Inquiries", s.inquiries], ["Deals", s.deals], ["Disclosures on file", s.disclosures], ["Detected in 30 days", s.detected_30d]].map(([l, v]) => (
            <div key={l} className="card p-4"><p className="text-xs font-semibold text-ink-500">{l}</p><p className="mt-1 font-display text-xl font-extrabold text-ink-950">{v}</p></div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg bg-surface-sunk p-1">
          {[["queue", "Transactions"], ["accounts", "Linked accounts"], ["disclosures", "Disclosures"]].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} className={`rounded-md px-4 py-1.5 text-xs font-semibold ${view === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>
          ))}
        </div>
        <button className="btn-outline btn-sm ml-auto" disabled={scanning} onClick={rescan}><LuRefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} /> Re-check now</button>
      </div>

      {view === "queue" && (
        <>
          <div className="flex flex-wrap gap-2">
            <select className="field-select h-9 w-44" value={review} onChange={(e) => setReview(e.target.value)}><option value="open">Not reviewed yet</option><option value="all">All</option></select>
            <select className="field-select h-9 w-40" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">Every kind</option><option value="property">Listings</option><option value="lead">Inquiries</option><option value="deal">Deals</option></select>
            <input className="field-input h-9 w-56" placeholder="Search title, city, employee" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {!dash.data ? <div className="flex justify-center py-10"><InlineSpinner className="h-6 w-6" /></div> : dash.data.items.length === 0 ? (
            <div className="card"><EmptyState icon={LuUsers} title={review === "open" ? "Nothing waiting for review" : "No related-party transactions"} /></div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <tr><th className={th}>Transaction</th><th className={th}>Linked employee</th><th className={th}>Detected</th><th className={th}>Review</th><th className={th} /></tr>
                </thead>
                <tbody>
                  {dash.data.items.map((i) => (
                    <tr key={`${i.entityType}-${i.id}`} className="border-b border-line last:border-0">
                      <td className={th}>
                        <span className="mr-2 rounded bg-surface-sunk px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-600">{KIND_LABEL[i.entityType]}</span>
                        <Link to={i.link} className="font-semibold text-ink-900 hover:underline" data-no-translate>{i.title}</Link>
                        <span className="block text-xs text-ink-500" data-no-translate>{i.city || ""}{i.open ? "" : " · closed"}</span>
                        {i.selfAssigned && <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-red-600"><LuTriangleAlert className="h-3 w-3" /> With the linked employee</span>}
                      </td>
                      <td className={th} data-no-translate>{i.employees.map((e) => <span key={e.id} className="block">{e.name}{e.designation ? ` (${e.designation.toUpperCase()})` : e.role ? ` (${titleCase(e.role.replace(/_/g, " "))})` : ""}</span>)}</td>
                      <td className={`${th} text-xs text-ink-600`}>{formatDate(i.detectedAt, true)}</td>
                      <td className={th}>{i.lastReview ? <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${OUTCOME_TONE[i.lastReview.outcome]}`}>{OUTCOMES.find((o) => o.value === i.lastReview.outcome)?.label}</span> : <span className="text-xs text-ink-500">Not reviewed</span>}</td>
                      <td className={`${th} text-right`}><button className="btn-outline btn-sm" onClick={() => setOpen(i)}>{i.lastReview ? "History" : "Review"}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === "accounts" && (
        !linked.data ? <InlineSpinner /> : linked.data.length === 0 ? <div className="card"><EmptyState title="No accounts linked to an employee" /></div> : (
          <div className="card divide-y divide-line">
            {linked.data.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <div><p className="font-semibold text-ink-900" data-no-translate>{a.name}</p><p className="text-xs text-ink-500">{titleCase(a.role.replace(/_/g, " "))} · since {formatDate(a.since)}</p></div>
                <p className="text-xs text-ink-700" data-no-translate>Linked to {a.employees.map((e) => e.name).join(", ")} <span className="text-ink-500">({a.via.map((v) => (v === "self" ? "employee's own" : v)).join(", ")})</span></p>
              </div>
            ))}
          </div>
        )
      )}

      {view === "disclosures" && (
        !disclosures.data ? <InlineSpinner /> : disclosures.data.length === 0 ? <div className="card"><EmptyState title="No disclosures yet" subtitle="Employees add their family's mobile numbers and PANs from Settings." /></div> : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500"><tr><th className={th}>Employee</th><th className={th}>Relation</th><th className={th}>Name</th><th className={th}>Mobile / PAN</th><th className={th}>Added</th></tr></thead>
              <tbody>
                {disclosures.data.map((d) => (
                  <tr key={d.id} className={`border-b border-line last:border-0 ${d.removedAt ? "opacity-50" : ""}`}>
                    <td className={th} data-no-translate>{d.employeeName}</td>
                    <td className={th}>{titleCase(d.relation)}</td>
                    <td className={th} data-no-translate>{d.fullName || "—"}</td>
                    <td className={`${th} font-mono text-xs`} data-no-translate>{[d.mobile, d.panLast4 ? `PAN ••••${d.panLast4}` : null].filter(Boolean).join(" · ")}</td>
                    <td className={`${th} text-xs`}>{formatDate(d.createdAt)}{d.removedAt ? ` · withdrawn ${formatDate(d.removedAt)}: ${d.removalNote}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${KIND_LABEL[open.entityType]}: ${open.title}` : ""} maxWidth="max-w-2xl">
        {open && <ReviewModal key={`${open.entityType}-${open.id}`} item={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); dash.reload(); }} />}
      </Modal>
    </div>
  );
}
