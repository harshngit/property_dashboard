import { useState } from "react";
import { LuCircleAlert, LuCircleCheck, LuPlus, LuTriangleAlert } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate } from "../../lib/format";

// Sec. 25.5.4 incident communication. Admins post an incident or planned
// maintenance (which parts of the platform, how bad, when it should be fixed)
// and add updates until it is resolved; the public page at
// propertyserch.com/status and the CRM banner show it, and franchisees /
// brokers are told in-app about major ones. Below: automatic checks of the
// things that usually cause incidents (backups, providers, crawler, geocoding).

const STATE = {
  operational: ["Working", "bg-emerald-50 text-emerald-700"],
  maintenance: ["Maintenance", "bg-sky-50 text-sky-700"],
  degraded: ["Slow / partly affected", "bg-amber-50 text-amber-700"],
  partial_outage: ["Partly down", "bg-orange-50 text-orange-700"],
  major_outage: ["Down", "bg-red-50 text-red-700"],
};
const IMPACT = { minor: "Minor - some users notice", major: "Major - a feature is down (users are told)", critical: "Critical - the platform is down (users are told)", maintenance: "Planned maintenance (users are told)" };
const STATUS = { investigating: "Investigating", identified: "Cause found", monitoring: "Fixed - monitoring", scheduled: "Scheduled", resolved: "Resolved" };
const LEVEL = { ok: [LuCircleCheck, "text-emerald-600"], warn: [LuTriangleAlert, "text-amber-600"], down: [LuCircleAlert, "text-red-600"] };
const localInput = (d) => (d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

function IncidentForm({ components, onClose, onDone }) {
  const call = useApiCall();
  const toast = useToast();
  const [f, setF] = useState({ title: "", impact: "major", components: [], message: "", etaAt: "", startsAt: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const toggle = (k) => setF((x) => ({ ...x, components: x.components.includes(k) ? x.components.filter((c) => c !== k) : [...x.components, k] }));
  const save = async () => {
    setBusy(true);
    try {
      const r = await call("/status/incidents", {
        method: "POST",
        body: { ...f, etaAt: f.etaAt ? new Date(f.etaAt).toISOString() : null, startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null },
      });
      toast.push(`${r.data.reference} posted${r.data.notified ? ` - ${r.data.notified} people told` : ""}.`, "success");
      onDone();
      onClose();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const maintenance = f.impact === "maintenance";
  return (
    <Modal open onClose={onClose} title="Post an incident" description="Shown on the public status page and the CRM banner." maxWidth="max-w-xl">
      <div className="space-y-3">
        <label className="field-label">Title<input className="field-input mt-1" placeholder="WhatsApp messages delayed" value={f.title} onChange={set("title")} /></label>
        <label className="field-label">How bad<select className="field-select mt-1" value={f.impact} onChange={set("impact")}>{Object.entries(IMPACT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <div>
          <p className="field-label">Affected</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {components.map((c) => (
              <button key={c.key} type="button" onClick={() => toggle(c.key)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${f.components.includes(c.key) ? "border-red-600 bg-red-50 text-red-700" : "border-line text-ink-600"}`}>{c.label}</button>
            ))}
          </div>
        </div>
        <label className="field-label">What users will notice<textarea className="field-input mt-1 h-20 py-2" value={f.message} onChange={set("message")} placeholder="Messages arrive late. Enquiries are not lost - they are being delivered." /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          {maintenance && <label className="field-label">Starts<input type="datetime-local" className="field-input mt-1" value={f.startsAt} onChange={set("startsAt")} /></label>}
          <label className="field-label">{maintenance ? "Ends" : "Expected fix (optional)"}<input type="datetime-local" className="field-input mt-1" value={f.etaAt} onChange={set("etaAt")} /></label>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={busy || f.title.trim().length < 5 || !f.components.length || f.message.trim().length < 5 || (maintenance && !f.etaAt)} onClick={save}>Post</button>
      </div>
    </Modal>
  );
}

function UpdateForm({ incident, onClose, onDone }) {
  const call = useApiCall();
  const toast = useToast();
  const [f, setF] = useState({ status: incident.status === "scheduled" ? "scheduled" : incident.status, message: "", etaAt: localInput(incident.etaAt) });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await call(`/status/incidents/${incident.id}/updates`, { method: "POST", body: { status: f.status, message: f.message, etaAt: f.etaAt ? new Date(f.etaAt).toISOString() : null } });
      toast.push(f.status === "resolved" ? "Resolved - everyone who was told has been told it is over." : "Update posted.", "success");
      onDone();
      onClose();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title={`Update ${incident.reference}`} description={incident.title}>
      <div className="space-y-3">
        <label className="field-label">Status<select className="field-select mt-1" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="field-label">Update<textarea className="field-input mt-1 h-20 py-2" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></label>
        {f.status !== "resolved" && <label className="field-label">Expected fix<input type="datetime-local" className="field-input mt-1" value={f.etaAt} onChange={(e) => setF({ ...f, etaAt: e.target.value })} /></label>}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={busy || f.message.trim().length < 5} onClick={save}>Post update</button>
      </div>
    </Modal>
  );
}

export default function StatusPage() {
  const { data, reload } = useApiQuery("/status/admin");
  const [posting, setPosting] = useState(false);
  const [updating, setUpdating] = useState(null);
  if (!data) return <div className="flex justify-center py-16"><InlineSpinner className="h-6 w-6" /></div>;
  const open = data.incidents.filter((i) => i.status !== "resolved");
  const past = data.incidents.filter((i) => i.status === "resolved");
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Operations" title="Platform status" subtitle="What franchisees, brokers and the public see at propertyserch.com/status - and the checks that warn before something breaks." actions={<button className="btn-primary" onClick={() => setPosting(true)}><LuPlus className="h-4 w-4" /> Post incident</button>} />

      <div className="card p-5">
        <p className="text-sm font-bold text-ink-900">Right now: <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${STATE[data.overall][1]}`}>{data.overall === "operational" ? "Everything working" : STATE[data.overall][0]}</span></p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.components.map((c) => (
            <div key={c.key} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"><span>{c.label}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATE[c.state][1]}`}>{STATE[c.state][0]}</span></div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <p className="text-sm font-bold text-ink-900">Automatic checks</p>
        <ul className="mt-2 divide-y divide-line">
          {data.checks.map((c) => {
            const [Icon, color] = LEVEL[c.level] || LEVEL.warn;
            return (
              <li key={c.key} className="flex items-start gap-3 py-2 text-sm"><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} /><span className="w-40 shrink-0 font-semibold text-ink-900">{c.label}</span><span className="text-ink-600">{c.detail}</span></li>
            );
          })}
        </ul>
        <p className="mt-2 text-[11px] text-ink-500">Backups and restore tests are run by the backup jobs (docs/BACKUP_AND_DR_RUNBOOK.md in the API repository).</p>
      </div>

      {[["Open and scheduled", open], ["Resolved (last 90 days)", past]].map(([label, list]) => (
        <div key={label} className="card p-5">
          <p className="text-sm font-bold text-ink-900">{label}</p>
          {!list.length ? <p className="mt-2 text-sm text-ink-500">None.</p> : (
            <ul className="mt-2 divide-y divide-line">
              {list.map((i) => (
                <li key={i.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink-900"><span className="font-mono text-xs text-ink-500">{i.reference}</span> {i.title}</p>
                      <p className="text-xs text-ink-500">{IMPACT[i.impact].split(" - ")[0]} · {STATUS[i.status]} · {i.components.map((k) => data.componentsAvailable.find((c) => c.key === k)?.label || k).join(", ")} · from {formatDate(i.startsAt, true)}{i.etaAt && i.status !== "resolved" ? ` · fix expected ${formatDate(i.etaAt, true)}` : ""}{i.resolvedAt ? ` · resolved ${formatDate(i.resolvedAt, true)}` : ""}</p>
                    </div>
                    {i.status !== "resolved" && <button className="btn-outline btn-sm" onClick={() => setUpdating(i)}>Add update</button>}
                  </div>
                  <ol className="mt-2 space-y-1 border-l-2 border-line pl-3">
                    {i.updates.map((u, n) => <li key={n} className="text-xs text-ink-600"><b>{STATUS[u.status]}</b> · {formatDate(u.at, true)} - {u.message}</li>)}
                  </ol>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {posting && <IncidentForm components={data.componentsAvailable} onClose={() => setPosting(false)} onDone={reload} />}
      {updating && <UpdateForm incident={updating} onClose={() => setUpdating(null)} onDone={reload} />}
    </div>
  );
}
