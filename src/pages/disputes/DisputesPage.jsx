import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LuPlus, LuClock, LuCircleAlert, LuPaperclip, LuHistory } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";

// Engine 5 Dispute Resolution + sec. 9.6 lead conflicts + DD queue.
//   Cases - open / respond with evidence; A R staff triage, ask for info,
//     post internal notes and view the full reconstructed action trail;
//     admins resolve within the 48 h SLA (overdue cases escalate).
//   Lead conflicts - the same buyer in two brokers' CRMs: routing /
//     different property / transfer, attribution from the logs, escalation.
//   Due diligence (staff) - listings with document issues or missing papers.

const STAFF = ["internal_sales", "admin", "super_admin"];
const ADMIN = ["admin", "super_admin"];
const TYPES = [
  ["broker_dispute", "Broker dispute"],
  ["duplicate_listing", "Duplicate listing conflict"],
  ["fake_claim", "Fake claim report"],
  ["institutional_data_access", "Institutional data-room access"],
  ["commission", "Commission"],
  ["review", "Review"],
  ["other", "Other"],
];

function SlaBadge({ d }) {
  if (!["open", "under_review", "awaiting_info"].includes(d.status)) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${d.overdue ? "bg-red-50 text-red-700" : "bg-surface-muted text-ink-700"}`}>
      {d.overdue ? <LuCircleAlert className="h-3 w-3" /> : <LuClock className="h-3 w-3" />} {d.overdue ? "Overdue" : "Due"} {formatDate(d.sla_due_at, true)}
    </span>
  );
}

function NewDispute({ open, onClose, onDone }) {
  const toast = useToast();
  const call = useApiCall();
  const fileRef = useRef(null);
  const partners = useApiQuery(open ? "/matching/partners" : null);
  const [f, setF] = useState({ type: "broker_dispute", title: "", description: "", againstUserId: "", propertyId: "" });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const form = new FormData();
      Object.entries(f).forEach(([k, v]) => v && form.append(k, v));
      for (const file of fileRef.current?.files || []) form.append("files", file);
      await call("/disputes", { method: "POST", body: form, isFormData: true });
      toast.push("Dispute opened - A R resolves it within 48 hours.", "success");
      onDone();
      onClose();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Open a dispute" description="Contact details are not allowed in the text.">
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-ink-600">Type
          <select className="field-input mt-1" value={f.type} onChange={(e) => setF((x) => ({ ...x, type: e.target.value }))}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold text-ink-600">Title<input className="field-input mt-1" value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} /></label>
        <TextareaField label="What happened?" rows={4} value={f.description} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} />
        <label className="block text-xs font-semibold text-ink-600">Against (optional)
          <select className="field-input mt-1" value={f.againstUserId} onChange={(e) => setF((x) => ({ ...x, againstUserId: e.target.value }))}>
            <option value="">No specific person</option>
            {(partners.data || []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold text-ink-600">Listing id (optional)<input className="field-input mt-1" value={f.propertyId} onChange={(e) => setF((x) => ({ ...x, propertyId: e.target.value.trim() }))} placeholder="Paste the listing id from its page URL" /></label>
        <label className="block text-xs font-semibold text-ink-600">Evidence<input ref={fileRef} type="file" multiple className="field-input mt-1 py-1.5" /></label>
        <div className="flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy || f.title.length < 5 || f.description.length < 10} onClick={submit}>Open dispute</button>
        </div>
      </div>
    </Modal>
  );
}

function CaseModal({ id, onClose, onChanged }) {
  const toast = useToast();
  const call = useApiCall();
  const { role } = useAuth();
  const staff = STAFF.includes(role);
  const { data: d, loading, reload } = useApiQuery(id ? `/disputes/${id}` : null);
  const trail = useApiQuery(id && staff ? `/disputes/${id}/reconstruction` : null);
  const fileRef = useRef(null);
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);
  const [showTrail, setShowTrail] = useState(false);
  const [resolution, setResolution] = useState("");
  const [favour, setFavour] = useState("");
  const [busy, setBusy] = useState(false);
  const act = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      toast.push(msg, "success");
      reload();
      onChanged();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const comment = () => {
    const form = new FormData();
    if (text) form.append("body", text);
    if (internal) form.append("internal", "true");
    for (const f of fileRef.current?.files || []) form.append("files", f);
    act(() => call(`/disputes/${id}/comments`, { method: "POST", body: form, isFormData: true }), "Added.").then(() => {
      setText("");
      if (fileRef.current) fileRef.current.value = "";
    });
  };
  const openEvidence = async (path) => {
    try {
      const res = await call(`/disputes/${id}/evidence?path=${encodeURIComponent(path)}`);
      window.open(res.data.url, "_blank", "noopener");
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const open = d && ["open", "under_review", "awaiting_info"].includes(d.status);
  return (
    <Modal open={!!id} onClose={onClose} title={d ? `${d.case_number} · ${d.title}` : "Dispute"} description={d ? `${titleCase(d.type)} · raised by ${d.raised_by_name}${d.against_name ? ` against ${d.against_name}` : ""}` : ""} maxWidth="max-w-3xl">
      {loading || !d ? <InlineSpinner /> : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={titleCase(d.status)} />
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink-700">{titleCase(d.priority)} priority</span>
            <SlaBadge d={d} />
            {d.property_id && <Link to={`/app/properties/${d.property_id}`} className="text-xs font-semibold text-red-600">{d.property_title || "Listing"}</Link>}
            {staff && <button className="btn-outline btn-sm ml-auto" onClick={() => setShowTrail((v) => !v)}><LuHistory className="h-3.5 w-3.5" /> {showTrail ? "Case timeline" : "Full action trail"}</button>}
          </div>
          {d.resolution && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800"><b>Resolution:</b> {d.resolution}</p>}

          {showTrail ? (
            <ol className="max-h-[420px] space-y-2 overflow-y-auto border-l border-line pl-4">
              {(trail.data?.events || []).map((e, i) => (
                <li key={i} className="text-xs">
                  <span className="font-semibold text-ink-900">{titleCase(e.source)} · {titleCase(e.action)}</span>
                  <span className="text-ink-500"> · {e.actor || "System"} · {formatDate(e.at, true)}</span>
                  {e.detail && <p className="text-ink-700">{String(e.detail).slice(0, 300)}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <ol className="max-h-[380px] space-y-3 overflow-y-auto border-l border-line pl-4">
              {d.timeline.map((e) => (
                <li key={e.id} className={e.visibility === "internal" ? "rounded-lg bg-amber-50/60 p-2" : ""}>
                  <p className="text-xs text-ink-500">{e.actor_name || "System"} · {titleCase(e.kind)} · {formatDate(e.created_at, true)}{e.visibility === "internal" ? " · internal" : ""}</p>
                  {e.body && <p className="whitespace-pre-line text-ink-800">{e.body}</p>}
                  {(e.attachments || []).map((a) => (
                    <button key={a.path} className="mr-2 inline-flex items-center gap-1 text-xs font-semibold text-red-600" onClick={() => openEvidence(a.path)}><LuPaperclip className="h-3 w-3" /> {a.name}</button>
                  ))}
                </li>
              ))}
            </ol>
          )}

          {open && (
            <div className="rounded-xl border border-line p-3">
              <TextareaField label="Add a comment" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <input ref={fileRef} type="file" multiple className="text-xs" />
                <span className="flex items-center gap-3">
                  {staff && <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note</label>}
                  <button className="btn-primary btn-sm" disabled={busy} onClick={comment}>Post</button>
                </span>
              </div>
            </div>
          )}

          {open && staff && (
            <div className="flex flex-wrap gap-2">
              <button className="btn-outline btn-sm" onClick={() => act(() => call(`/disputes/${id}`, { method: "PUT", body: { status: "under_review" } }), "Under review.")}>Under review</button>
              <button className="btn-outline btn-sm" onClick={() => {
                const n = window.prompt("What information do you need from the parties?");
                if (n) act(() => call(`/disputes/${id}`, { method: "PUT", body: { status: "awaiting_info", note: n } }), "Parties asked for information.");
              }}>Ask for info</button>
              {["high", "urgent"].map((p) => (
                <button key={p} className="btn-outline btn-sm" onClick={() => act(() => call(`/disputes/${id}`, { method: "PUT", body: { priority: p } }), `Priority ${p}.`)}>Mark {p}</button>
              ))}
            </div>
          )}

          {open && ADMIN.includes(role) && (
            <div className="rounded-xl border border-line p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Resolve</p>
              <TextareaField label="Resolution (shared with both parties)" rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} />
              <label className="mt-2 block text-xs font-semibold text-ink-600">In favour of
                <select className="field-input mt-1" value={favour} onChange={(e) => setFavour(e.target.value)}>
                  <option value="">Nobody / not applicable</option>
                  <option value={d.raised_by}>{d.raised_by_name} (raised)</option>
                  {d.against_user_id && <option value={d.against_user_id}>{d.against_name} (against)</option>}
                </select>
              </label>
              <div className="mt-3 flex justify-end gap-2">
                <button className="btn-outline" disabled={busy || resolution.length < 5} onClick={() => act(() => call(`/disputes/${id}/resolve`, { method: "POST", body: { decision: "dismiss", resolution } }), "Dismissed.")}>Dismiss</button>
                <button className="btn-primary" disabled={busy || resolution.length < 5} onClick={() => act(() => call(`/disputes/${id}/resolve`, { method: "POST", body: { decision: "resolve", resolution, inFavourOf: favour || undefined } }), "Resolved.")}>Resolve</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Cases() {
  const { role } = useAuth();
  const [status, setStatus] = useState("open");
  const { data, loading, reload } = useApiQuery(`/disputes?status=${status}`);
  const [opening, setOpening] = useState(false);
  const [viewing, setViewing] = useState(null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select className="field-input w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="open">Unresolved</option>
          <option value="">All</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
        {role !== "customer" && <button className="btn-primary" onClick={() => setOpening(true)}><LuPlus className="h-4 w-4" /> Open dispute</button>}
      </div>
      {loading ? <InlineSpinner /> : !(data || []).length ? <div className="card p-8 text-center text-sm text-ink-500">No disputes.</div> : (
        <div className="card divide-y divide-line">
          {data.map((d) => (
            <button key={d.id} className="block w-full px-4 py-3 text-left text-sm hover:bg-surface-muted" onClick={() => setViewing(d.id)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink-900">{d.case_number} · {d.title}</span>
                <span className="flex items-center gap-1.5"><StatusBadge value={titleCase(d.status)} /><SlaBadge d={d} /></span>
              </div>
              <p className="text-xs text-ink-500">
                {titleCase(d.type)} · {d.raised_by_name}{d.against_name ? ` vs ${d.against_name}` : ""}{d.property_title ? ` · ${d.property_title}` : ""} · {formatDate(d.created_at, true)}
              </p>
            </button>
          ))}
        </div>
      )}
      <NewDispute open={opening} onClose={() => setOpening(false)} onDone={reload} />
      <CaseModal id={viewing} onClose={() => setViewing(null)} onChanged={reload} />
    </div>
  );
}

function Conflicts() {
  const toast = useToast();
  const call = useApiCall();
  const { user } = useAuth();
  const { data, loading, reload } = useApiQuery("/disputes/lead-conflicts");
  const [attr, setAttr] = useState(null);
  const act = async (id, body, msg) => {
    try {
      await call(`/disputes/lead-conflicts/${id}`, { method: "PUT", body });
      toast.push(msg, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const showAttribution = async (id) => {
    try {
      const res = await call(`/disputes/lead-conflicts/${id}/attribution`);
      setAttr(res.data);
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const escalate = async (id) => {
    const reason = window.prompt("Why should A R decide this?");
    if (reason === null) return;
    try {
      await call(`/disputes/lead-conflicts/${id}/escalate`, { method: "POST", body: { reason } });
      toast.push("Escalated to A R - decided within 48 hours.", "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  if (loading) return <InlineSpinner />;
  const rows = data || [];
  if (!rows.length) return <div className="card p-8 text-center text-sm text-ink-500">No lead conflicts.</div>;
  return (
    <div className="space-y-3">
      {rows.map((c) => {
        const later = c.later_broker_id === user?.id;
        const first = c.first_broker_id === user?.id;
        const openish = ["open", "routing_requested"].includes(c.status);
        return (
          <div key={c.id} className="card p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink-900">Buyer {c.customer_name} · first with {c.first_broker_name}, then {c.later_broker_name}</p>
                <p className="text-xs text-ink-500">Detected {formatDate(c.created_at, true)}{c.resolution ? ` · ${titleCase(c.resolution)}` : ""}</p>
              </div>
              <StatusBadge value={titleCase(c.status)} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button className="btn-outline btn-sm" onClick={() => showAttribution(c.id)}>Attribution</button>
              {later && c.status === "open" && (
                <>
                  <button className="btn-outline btn-sm" onClick={() => act(c.id, { action: "request_routing" }, "Routing requested.")}>Request routing</button>
                  <button className="btn-outline btn-sm" onClick={() => {
                    const pid = window.prompt("Listing id of the different property you will work");
                    if (pid) act(c.id, { action: "different_property", propertyId: pid.trim() }, "Noted - you will work a different property.");
                  }}>Different property</button>
                  <button className="btn-outline btn-sm" onClick={() => act(c.id, { action: "transfer" }, "Lead transferred.")}>Transfer lead</button>
                </>
              )}
              {first && c.status === "routing_requested" && (
                <>
                  <button className="btn-outline btn-sm" onClick={() => act(c.id, { action: "accept_routing" }, "Routing accepted.")}>Accept routing</button>
                  <button className="btn-outline btn-sm" onClick={() => act(c.id, { action: "decline_routing" }, "Routing declined.")}>Decline</button>
                </>
              )}
              {openish && !c.dispute_id && <button className="btn-outline btn-sm" onClick={() => escalate(c.id)}>Escalate to A R</button>}
            </div>
          </div>
        );
      })}
      <Modal open={!!attr} onClose={() => setAttr(null)} title="Commission attribution" description={attr?.note}>
        {attr && (
          <div className="space-y-2 text-sm">
            {attr.steps.map((s) => (
              <p key={s.step}><b>{s.step}</b> ({s.weight}%): {s.by}{s.at ? ` · ${formatDate(s.at, true)}` : ""}</p>
            ))}
            {attr.suggestedSplit && (
              <p className="rounded-lg bg-surface-muted px-3 py-2">Suggested split: {Object.entries(attr.suggestedSplit).map(([k, v]) => `${k} ${v}%`).join(" · ")}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function DdQueue() {
  const { data, loading } = useApiQuery("/due-diligence/queue");
  if (loading) return <InlineSpinner />;
  const rows = data || [];
  if (!rows.length) return <div className="card p-8 text-center text-sm text-ink-500">No due-diligence issues.</div>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-500">
          <tr><th className="px-4 py-3">Listing</th><th className="px-4 py-3">DD status</th><th className="px-4 py-3">Missing</th><th className="px-4 py-3">Flags</th><th className="px-4 py-3">Pending docs</th><th className="px-4 py-3">Title</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.property_id}>
              <td className="px-4 py-3"><Link to={`/app/properties/${r.property_id}`} className="font-semibold text-ink-900 hover:text-red-600">{r.title}</Link><p className="text-xs text-ink-500">{r.city}</p></td>
              <td className="px-4 py-3"><StatusBadge value={titleCase(r.status)} /></td>
              <td className="px-4 py-3 text-xs">{(r.missing || []).map((m) => m.label).slice(0, 3).join(", ") || "—"}{(r.missing || []).length > 3 ? ` +${r.missing.length - 3}` : ""}</td>
              <td className="px-4 py-3 text-xs">{(r.risk_flags || []).filter((f) => f.severity === "high").length} high / {(r.risk_flags || []).length}</td>
              <td className="px-4 py-3">{r.pending_docs}</td>
              <td className="px-4 py-3 text-xs">{r.title_years ? `${r.title_years} yrs` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DisputesPage() {
  const { role } = useAuth();
  const staff = STAFF.includes(role);
  const [tab, setTab] = useState("cases");
  const tabs = [["cases", "Cases"], ["conflicts", "Lead conflicts"], ...(staff ? [["dd", "Due diligence"]] : [])];
  return (
    <div>
      <PageHeader eyebrow="Engine 5" title="Disputes & Due Diligence" subtitle="Dispute cases with a 48-hour SLA, lead conflicts between brokers, and listings with document issues." />
      <div className="mb-4 flex gap-1 rounded-lg bg-surface-muted p-1 sm:w-fit">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-xs font-semibold ${tab === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>
        ))}
      </div>
      {tab === "cases" && <Cases />}
      {tab === "conflicts" && <Conflicts />}
      {tab === "dd" && <DdQueue />}
    </div>
  );
}
