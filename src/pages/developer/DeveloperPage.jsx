import { useState } from "react";
import { LuPlus, LuCopy, LuKeyRound, LuWebhook } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal, { ConfirmDialog } from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { API_BASE_URL } from "../../config/api";
import { formatDate, titleCase } from "../../lib/format";

// Module 35 - API & Webhooks: connect your own website or software.
//   API keys   read listings, leads, deals and matches, and create leads,
//              from your own system. A key can do no more than your account.
//   Webhooks   be told the moment a lead, deal, match or mandate changes.

const ADMIN = ["admin", "super_admin"];
const th = "px-4 py-3";
const EVENT_LABEL = { "lead.created": "New lead", "lead.status_changed": "Lead status changed", "deal.stage_changed": "Deal moved stage", "deal.closed": "Deal closed", "match.found": "New requirement match", "mandate.status_changed": "Mandate changed", "message.new": "New message" };
const copy = (text, toast) => navigator.clipboard?.writeText(text).then(() => toast.push("Copied.", "success"), () => toast.push("Could not copy - select and copy it by hand.", "error"));

function Secret({ label, value, toast }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-semibold text-amber-900">{label} - copy it now, it will not be shown again.</p>
      <div className="mt-1.5 flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded bg-white px-2 py-1.5 text-xs" data-no-translate>{value}</code>
        <button className="btn-outline btn-sm shrink-0" onClick={() => copy(value, toast)}><LuCopy className="h-4 w-4" /> Copy</button>
      </div>
    </div>
  );
}

function Keys({ admin }) {
  const call = useApiCall();
  const toast = useToast();
  const { data, loading, reload } = useApiQuery("/developer/keys");
  const [form, setForm] = useState(null);
  const [created, setCreated] = useState(null);
  const [revoke, setRevoke] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const create = () => run(async () => {
    const res = await call("/developer/keys", { method: "POST", body: { name: form.name, scopes: form.scopes, expiresInDays: form.expiresInDays ? Number(form.expiresInDays) : undefined } });
    setCreated(res.data);
    setForm(null);
  });
  if (loading && !data) return <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
  const rows = data?.items || [];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="text-sm text-ink-600">Send the key in the <code className="rounded bg-surface-muted px-1">X-API-Key</code> header to <code className="rounded bg-surface-muted px-1" data-no-translate>{API_BASE_URL}/v1</code>. <a className="font-semibold text-red-600 hover:underline" href={`${API_BASE_URL.replace(/\/api$/, "")}/api-docs`} target="_blank" rel="noreferrer">API reference</a></p>
        <button className="btn-primary btn-sm ml-auto shrink-0" onClick={() => setForm({ name: "", scopes: ["properties:read", "leads:read"], expiresInDays: "" })}><LuPlus className="h-4 w-4" /> New key</button>
      </div>
      {created && <Secret label={`API key "${created.name}"`} value={created.key} toast={toast} />}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Key</th><th className={th}>Permissions</th><th className={th}>Limit</th><th className={th}>Last used</th><th className={th}>Status</th><th className={th} /></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((k) => (
              <tr key={k.id} className={k.status === "active" ? "" : "opacity-60"}>
                <td className={th}><p className="font-semibold text-ink-900" data-no-translate>{k.name}</p><p className="font-mono text-xs text-ink-500" data-no-translate>{k.prefix}{k.ownerName ? ` · ${k.ownerName}` : ""}</p></td>
                <td className={`${th} max-w-[260px] text-xs text-ink-600`} data-no-translate>{k.scopes.join(", ")}</td>
                <td className={`${th} text-xs`}>{k.rateLimitPerMin} / min{admin && k.status === "active" && <button className="ml-2 font-semibold text-red-600 hover:underline" onClick={() => { const v = window.prompt("Requests per minute", k.rateLimitPerMin); if (v) run(() => call(`/developer/keys/${k.id}/rate-limit`, { method: "PUT", body: { perMin: Number(v) } })); }}>Change</button>}</td>
                <td className={`${th} text-xs`}>{k.lastUsedAt ? formatDate(k.lastUsedAt, true) : "Never"}<p className="text-ink-400">{k.requestCount.toLocaleString("en-IN")} requests</p></td>
                <td className={th}><StatusBadge value={titleCase(k.status)} />{k.expiresAt && <p className="mt-0.5 text-[11px] text-ink-500">expires {formatDate(k.expiresAt)}</p>}</td>
                <td className={`${th} text-right`}>{k.status === "active" && <button className="text-xs font-semibold text-red-600 hover:underline" onClick={() => setRevoke(k)}>Revoke</button>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-500">No API keys yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title="New API key" description="The key acts as your account: it can reach only what you can reach in the CRM.">
        {form && (
          <div className="space-y-3">
            <TextField label="Name (what will use this key)" placeholder="Website sync" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div>
              <span className="field-label">Permissions</span>
              {(data?.scopes || []).map((s) => (
                <label key={s.key} className="flex items-start gap-2 py-1 text-sm text-ink-800">
                  <input type="checkbox" className="mt-1" checked={form.scopes.includes(s.key)} onChange={() => setForm({ ...form, scopes: form.scopes.includes(s.key) ? form.scopes.filter((x) => x !== s.key) : [...form.scopes, s.key] })} />
                  <span>{s.label} <code className="text-[11px] text-ink-500" data-no-translate>{s.key}</code></span>
                </label>
              ))}
            </div>
            <TextField label="Expires after (days, blank = no expiry)" type="number" min="1" value={form.expiresInDays} onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })} />
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" disabled={busy || form.name.trim().length < 3 || !form.scopes.length} onClick={create}>Create key</button></div>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!revoke} onClose={() => setRevoke(null)} title="Revoke this key?" description={`"${revoke?.name}" stops working immediately. This cannot be undone.`} confirmLabel="Revoke" loading={busy}
        onConfirm={() => run(async () => { await call(`/developer/keys/${revoke.id}`, { method: "DELETE" }); setRevoke(null); })} />
    </div>
  );
}

function Webhooks() {
  const call = useApiCall();
  const toast = useToast();
  const { data, loading, reload } = useApiQuery("/developer/webhooks");
  const [form, setForm] = useState(null);
  const [created, setCreated] = useState(null);
  const [log, setLog] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      if (msg) toast.push(msg, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const test = (w) => run(async () => {
    const r = await call(`/developer/webhooks/${w.id}/test`, { method: "POST" });
    toast.push(r.data.delivered ? `Test delivered (your server answered ${r.data.responseCode}).` : `Test failed: ${r.data.error}`, r.data.delivered ? "success" : "error");
  });
  const openLog = async (w) => {
    try {
      setLog({ hook: w, rows: (await call(`/developer/webhooks/${w.id}/deliveries`)).data });
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  if (loading && !data) return <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
  const rows = data?.items || [];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="text-sm text-ink-600">We POST a small JSON message to your address when something changes. It carries ids, never phone numbers or emails - read the detail through the API. Check the <code className="rounded bg-surface-muted px-1">X-PropertySerch-Signature</code> header with your signing secret.</p>
        <button className="btn-primary btn-sm ml-auto shrink-0" onClick={() => setForm({ url: "https://", description: "", events: ["lead.created"] })}><LuPlus className="h-4 w-4" /> Add webhook</button>
      </div>
      {created && <Secret label="Signing secret" value={created.secret} toast={toast} />}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Address</th><th className={th}>Events</th><th className={th}>Last delivery</th><th className={th}>Status</th><th className={th} /></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((w) => (
              <tr key={w.id}>
                <td className={`${th} max-w-[300px]`}><p className="truncate font-mono text-xs text-ink-900" data-no-translate>{w.url}</p><p className="text-xs text-ink-500" data-no-translate>{w.description || ""}{w.ownerName ? ` · ${w.ownerName}` : ""}</p></td>
                <td className={`${th} max-w-[240px] text-xs text-ink-600`}>{w.events.map((e) => EVENT_LABEL[e] || e).join(", ")}</td>
                <td className={`${th} text-xs`}>{w.lastDeliveryAt ? formatDate(w.lastDeliveryAt, true) : "—"}</td>
                <td className={th}><StatusBadge value={titleCase(w.status)} />{w.pausedReason && <p className="mt-0.5 max-w-[180px] text-[11px] text-amber-700">{w.pausedReason}</p>}</td>
                <td className={`${th} whitespace-nowrap text-right text-xs font-semibold`}>
                  <button className="mr-3 text-red-600 hover:underline" disabled={busy} onClick={() => test(w)}>Send test</button>
                  <button className="mr-3 text-ink-700 hover:underline" onClick={() => openLog(w)}>Deliveries</button>
                  <button className="mr-3 text-ink-700 hover:underline" disabled={busy} onClick={() => run(() => call(`/developer/webhooks/${w.id}`, { method: "PUT", body: { status: w.status === "active" ? "paused" : "active" } }))}>{w.status === "active" ? "Pause" : "Resume"}</button>
                  <button className="text-ink-500 hover:underline" disabled={busy} onClick={() => window.confirm("Delete this webhook?") && run(() => call(`/developer/webhooks/${w.id}`, { method: "DELETE" }), "Webhook deleted.")}>Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-500">No webhooks yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-500">A failed delivery is retried after 1, 5 and 30 minutes, then 2, 6 and 12 hours. An address that keeps failing is paused; resume it once your server is back.</p>
      <Modal open={!!form} onClose={() => setForm(null)} title="Add webhook">
        {form && (
          <div className="space-y-3">
            <TextField label="Address (https://)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <TextField label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div>
              <span className="field-label">Tell me about</span>
              {(data?.events || []).map((e) => (
                <label key={e} className="flex items-center gap-2 py-1 text-sm text-ink-800">
                  <input type="checkbox" checked={form.events.includes(e)} onChange={() => setForm({ ...form, events: form.events.includes(e) ? form.events.filter((x) => x !== e) : [...form.events, e] })} />
                  {EVENT_LABEL[e] || e} <code className="text-[11px] text-ink-500" data-no-translate>{e}</code>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" disabled={busy || !form.events.length || form.url.length < 12} onClick={() => run(async () => { setCreated((await call("/developer/webhooks", { method: "POST", body: form })).data); setForm(null); })}>Add</button></div>
          </div>
        )}
      </Modal>
      <Modal open={!!log} onClose={() => setLog(null)} title="Recent deliveries" description={log?.hook.url} maxWidth="max-w-3xl">
        {log && (
          <div className="max-h-[60vh] overflow-y-auto">
            {log.rows.length === 0 ? <p className="py-6 text-center text-sm text-ink-500">Nothing sent yet.</p> : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className="py-2 pr-3">When</th><th className="py-2 pr-3">Event</th><th className="py-2 pr-3">Result</th><th className="py-2">Attempts</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {log.rows.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2 pr-3 text-xs">{formatDate(d.created_at, true)}</td>
                      <td className="py-2 pr-3 text-xs" data-no-translate>{d.event}</td>
                      <td className="py-2 pr-3 text-xs"><StatusBadge value={titleCase(d.status)} />{d.response_code ? ` ${d.response_code}` : ""}{d.last_error && <p className="text-[11px] text-red-600" data-no-translate>{d.last_error}</p>}</td>
                      <td className="py-2 text-xs">{d.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function DeveloperPage() {
  const { role } = useAuth();
  const [tab, setTab] = useState("keys");
  return (
    <div className="space-y-5">
      <PageHeader title="API & Webhooks" />
      <div className="flex gap-1 rounded-lg bg-surface-muted p-1 sm:w-fit">
        {[["keys", "API keys", LuKeyRound], ["webhooks", "Webhooks", LuWebhook]].map(([k, l, Icon]) => <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-semibold ${tab === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}><Icon className="h-3.5 w-3.5" />{l}</button>)}
      </div>
      {tab === "keys" ? <Keys admin={ADMIN.includes(role)} /> : <Webhooks />}
    </div>
  );
}
