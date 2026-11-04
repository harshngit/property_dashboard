import { useEffect, useState } from "react";
import { LuPlus, LuRefreshCw, LuUpload, LuTrash2 } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR } from "../../lib/format";

// Smart Audience Engine (Module 49). Behaviour segments kept up to date from
// events, lead scores, requirements and investor profiles. Each rule is
// edited here - no code change. Members with marketing consent go to Meta
// (Custom Audience) and Google Ads (Customer Match) as SHA-256 hashes only;
// without the ad accounts connected, syncs are recorded as skipped.

const th = "px-3 py-2.5";
const TYPE_LABEL = {
  event_count: "Did an action",
  search_count: "Searched a property type",
  budget_above: "Budget above",
  distinct_views: "Viewed many properties",
  lead_score: "Lead score at least",
  nri: "NRI",
  combo: "Group of conditions",
};
const BLANK = {
  event_count: { eventTypes: ["site_visit_requested"], minCount: 1, days: 30 },
  search_count: { propertyTypes: ["commercial"], minCount: 3, days: 14 },
  budget_above: { minRupees: 20000000 },
  distinct_views: { minProperties: 10, minLocalities: 3, days: 30 },
  lead_score: { min: 70 },
  nri: { homeCountry: "IN" },
  combo: { match: "all", conditions: [{ type: "lead_score", min: 70 }] },
};
const STATUS_TONE = { success: "text-emerald-700", failed: "text-red-600", skipped: "text-ink-500" };

function describe(c) {
  switch (c.type) {
    case "event_count": return `${c.eventTypes.join(" / ")} ${c.minCount}+ times in ${c.days} days`;
    case "search_count": return `searched ${c.propertyTypes.join(" / ")} ${c.minCount}+ times in ${c.days} days`;
    case "budget_above": return `budget above ${formatINR(c.minRupees)}`;
    case "distinct_views": return `viewed ${c.minProperties}+ properties in ${c.minLocalities}+ localities in ${c.days} days`;
    case "lead_score": return `lead score ${c.min}+`;
    case "nri": return `NRI profile or registered outside ${c.homeCountry}`;
    case "combo": return `(${c.conditions.map(describe).join(c.match === "all" ? " and " : " or ")})`;
    default: return c.type;
  }
}
const ruleText = (r) => (r?.conditions || []).map(describe).join(r?.match === "all" ? " and " : " or ");

const list = (v) => v.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);

function NumberInput({ label, value, onChange, min = 0 }) {
  return (
    <label className="text-xs font-semibold text-ink-600">
      {label}
      <input className="field-input mt-1 w-28" type="number" min={min} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
    </label>
  );
}

function Condition({ c, onChange, onRemove, depth }) {
  const set = (k, v) => onChange({ ...c, [k]: v });
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-ink-600">
          Condition
          <select className="field-select mt-1 w-56" value={c.type} onChange={(e) => onChange({ type: e.target.value, ...BLANK[e.target.value] })}>
            {Object.entries(TYPE_LABEL).filter(([k]) => k !== "combo" || depth < 2).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        {c.type === "event_count" && <>
          <label className="text-xs font-semibold text-ink-600">Event types (comma separated)<input className="field-input mt-1 w-64" value={c.eventTypes.join(", ")} onChange={(e) => set("eventTypes", list(e.target.value))} /></label>
          <NumberInput label="At least" value={c.minCount} onChange={(v) => set("minCount", v)} min={1} />
          <NumberInput label="In days" value={c.days} onChange={(v) => set("days", v)} min={1} />
        </>}
        {c.type === "search_count" && <>
          <label className="text-xs font-semibold text-ink-600">Property types (comma separated)<input className="field-input mt-1 w-56" value={c.propertyTypes.join(", ")} onChange={(e) => set("propertyTypes", list(e.target.value))} /></label>
          <NumberInput label="At least" value={c.minCount} onChange={(v) => set("minCount", v)} min={1} />
          <NumberInput label="In days" value={c.days} onChange={(v) => set("days", v)} min={1} />
        </>}
        {c.type === "budget_above" && <NumberInput label="Rupees" value={c.minRupees} onChange={(v) => set("minRupees", v)} min={1} />}
        {c.type === "distinct_views" && <>
          <NumberInput label="Properties" value={c.minProperties} onChange={(v) => set("minProperties", v)} min={1} />
          <NumberInput label="Localities" value={c.minLocalities} onChange={(v) => set("minLocalities", v)} min={1} />
          <NumberInput label="In days" value={c.days} onChange={(v) => set("days", v)} min={1} />
        </>}
        {c.type === "lead_score" && <NumberInput label="Score" value={c.min} onChange={(v) => set("min", v)} />}
        {c.type === "nri" && <label className="text-xs font-semibold text-ink-600">Home country<input className="field-input mt-1 w-20 uppercase" maxLength={2} value={c.homeCountry} onChange={(e) => set("homeCountry", e.target.value.toUpperCase())} /></label>}
        <button type="button" className="ml-auto text-ink-500 hover:text-red-600" title="Remove" onClick={onRemove}><LuTrash2 className="h-4 w-4" /></button>
      </div>
      {c.type === "combo" && <div className="mt-3"><RuleEditor rule={c} onChange={(r) => onChange({ type: "combo", ...r })} depth={depth + 1} /></div>}
    </div>
  );
}

function RuleEditor({ rule, onChange, depth = 1 }) {
  const conds = rule.conditions || [];
  const setAt = (i, c) => onChange({ ...rule, conditions: conds.map((x, j) => (j === i ? c : x)) });
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
        Member when
        <select className="field-select w-24" value={rule.match || "any"} onChange={(e) => onChange({ ...rule, match: e.target.value })}>
          <option value="any">any</option>
          <option value="all">all</option>
        </select>
        of these hold
      </label>
      {conds.map((c, i) => <Condition key={i} c={c} depth={depth} onChange={(v) => setAt(i, v)} onRemove={() => onChange({ ...rule, conditions: conds.filter((_, j) => j !== i) })} />)}
      <button type="button" className="btn-outline btn-sm" onClick={() => onChange({ ...rule, conditions: [...conds, { type: "lead_score", min: 70 }] })}><LuPlus className="h-3.5 w-3.5" /> Add condition</button>
    </div>
  );
}

function Members({ id }) {
  const [page, setPage] = useState(1);
  const { data, loading } = useApiQuery(`/audiences/${id}/members?page=${page}&limit=25`);
  if (loading && !data) return <InlineSpinner className="h-5 w-5" />;
  const rows = data?.items || [];
  if (!rows.length) return <p className="text-sm text-ink-500">No members yet.</p>;
  const pages = Math.max(1, Math.ceil((data.total || 0) / 25));
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-line bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Customer</th><th className={th}>Contact</th><th className={th}>Lead score</th><th className={th}>Marketing consent</th><th className={th}>Joined</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((m) => (
              <tr key={m.customerId}>
                <td className={th} data-no-translate>{m.name || "—"}</td>
                <td className={`${th} font-mono text-xs`} data-no-translate>{[m.mobile, m.email].filter(Boolean).join(" · ") || "—"}</td>
                <td className={th}>{m.leadScore ?? "—"}</td>
                <td className={th}>{m.marketingConsent ? "Yes - can be synced" : "No - never sent"}</td>
                <td className={`${th} text-xs text-ink-500`}>{formatDate(m.joinedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-ink-500">
        <span>{data.total} members</span>
        <span className="flex gap-2">
          <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="self-center">Page {page} of {pages}</span>
          <button className="btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </span>
      </div>
    </div>
  );
}

function Editor({ seg, onClose, onSaved }) {
  const toast = useToast();
  const call = useApiCall();
  const isNew = !seg.id;
  const detail = useApiQuery(isNew ? null : `/audiences/${seg.id}`);
  const [tab, setTab] = useState("rule");
  const [form, setForm] = useState(() => ({
    key: "", name: seg.name || "", description: seg.description || "", active: seg.active !== false, rule: seg.rule || { match: "any", conditions: [{ type: "lead_score", min: 70 }] },
    syncMeta: !!seg.sync?.meta, syncGoogle: !!seg.sync?.google, metaAudienceId: seg.sync?.metaAudienceId || "", googleUserList: seg.sync?.googleUserList || "",
  }));
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  useEffect(() => setPreview(null), [form.rule]);

  const run = async (fn, msg) => {
    setBusy(true);
    try {
      const out = await fn();
      if (msg) toast.push(msg, "success");
      return out;
    } catch (err) {
      toast.push(err.message, "error");
      return null;
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    const body = { name: form.name.trim(), description: form.description.trim() || null, active: form.active, rule: form.rule, syncMeta: form.syncMeta, syncGoogle: form.syncGoogle, metaAudienceId: form.metaAudienceId.trim() || null, googleUserList: form.googleUserList.trim() || null };
    const out = await run(() => (isNew ? call("/admin/audiences", { method: "POST", body: { ...body, key: form.key.trim() } }) : call(`/admin/audiences/${seg.id}`, { method: "PUT", body })), isNew ? "Audience created." : "Audience saved.");
    if (out) onSaved();
  };
  const history = detail.data?.syncHistory || [];

  return (
    <Modal open onClose={onClose} title={isNew ? "New audience" : seg.name} description={isNew ? "A behaviour segment for ad retargeting." : `${seg.members} members · last computed ${seg.lastComputedAt ? formatDate(seg.lastComputedAt, true) : "never"}`} maxWidth="max-w-4xl">
      {!isNew && (
        <div className="mb-4 flex gap-1 border-b border-line text-sm">
          {[["rule", "Rule and sync"], ["members", "Members"], ["history", "Sync history"]].map(([k, l]) => (
            <button key={k} className={`px-3 py-2 font-semibold ${tab === k ? "border-b-2 border-ink-900 text-ink-900" : "text-ink-500"}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      )}
      {tab === "members" && <Members id={seg.id} />}
      {tab === "history" && (!history.length ? <p className="text-sm text-ink-500">Not synced yet.</p> : (
        <ul className="divide-y divide-line text-sm">
          {history.map((h, i) => (
            <li key={i} className="py-2">
              <span className="font-semibold">{h.platform === "meta" ? "Meta" : "Google Ads"}</span> · <span className={STATUS_TONE[h.status]}>{h.status}</span> · {formatDate(h.at, true)}
              <span className="text-ink-600"> · {h.sent} added, {h.removed} removed{h.heldBack ? `, ${h.heldBack} held back (no marketing consent or no contact)` : ""}</span>
              {h.detail && <p className="text-xs text-ink-500">{h.detail}</p>}
            </li>
          ))}
        </ul>
      ))}
      {tab === "rule" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {isNew && <label className="text-xs font-semibold text-ink-600">Key (lowercase, used by the API)<input className="field-input mt-1 w-full" value={form.key} onChange={(e) => set("key", e.target.value.toLowerCase())} placeholder="e.g. plot_investors" /></label>}
            <label className="text-xs font-semibold text-ink-600">Name<input className="field-input mt-1 w-full" value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
            <label className="text-xs font-semibold text-ink-600 sm:col-span-2">Description<input className="field-input mt-1 w-full" value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
          </div>
          <RuleEditor rule={form.rule} onChange={(r) => set("rule", r)} />
          <div className="flex items-center gap-3">
            <button className="btn-outline btn-sm" disabled={busy} onClick={async () => { const out = await run(() => call("/audiences/preview", { method: "POST", body: { rule: form.rule } })); if (out) setPreview(out.data.members); }}>Count members</button>
            {preview != null && <span className="text-sm text-ink-700">{preview} customers match this rule now.</span>}
          </div>
          <div className="rounded-xl bg-surface-muted p-3 text-sm">
            <p className="mb-2 font-semibold text-ink-900">Sync to ad platforms</p>
            <p className="mb-3 text-xs text-ink-600">Only members who gave marketing consent are sent, as SHA-256 hashes of their email and mobile. Joiners are added and leavers removed on each sync (every 6 hours).</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.syncMeta} onChange={(e) => set("syncMeta", e.target.checked)} /> Meta Custom Audience</label>
                <input className="field-input w-full" placeholder="Custom audience id" value={form.metaAudienceId} onChange={(e) => set("metaAudienceId", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.syncGoogle} onChange={(e) => set("syncGoogle", e.target.checked)} /> Google Ads Customer Match</label>
                <input className="field-input w-full" placeholder="customers/123.../userLists/456..." value={form.googleUserList} onChange={(e) => set("googleUserList", e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /> Active (recomputed and synced)</label>
            <div className="flex gap-2">
              <button className="btn-outline" onClick={onClose}>Cancel</button>
              <button className="btn-primary" disabled={busy || form.name.trim().length < 3 || (isNew && !/^[a-z][a-z0-9_]{2,39}$/.test(form.key))} onClick={save}>{isNew ? "Create" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function AudiencesPage() {
  const toast = useToast();
  const call = useApiCall();
  const { data, loading, error, reload } = useApiQuery("/audiences");
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(null);
  const act = async (key, path, msg) => {
    setBusy(key);
    try {
      const out = await call(path, { method: "POST" });
      toast.push(typeof msg === "function" ? msg(out) : msg, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(null);
    }
  };
  const rows = data?.items || [];
  return (
    <div className="space-y-4">
      <PageHeader
        title="Audiences"
        subtitle="Behaviour segments for retargeting on Meta and Google Ads, kept up to date from what customers do on the platform."
        actions={<button className="btn-primary" onClick={() => setOpen({})}><LuPlus className="h-4 w-4" /> New audience</button>}
      />
      {data && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-2.5 py-1 font-semibold ${data.connected.meta ? "bg-emerald-50 text-emerald-700" : "bg-surface-muted text-ink-600"}`}>Meta {data.connected.meta ? "connected" : "not connected"}</span>
          <span className={`rounded-full px-2.5 py-1 font-semibold ${data.connected.google ? "bg-emerald-50 text-emerald-700" : "bg-surface-muted text-ink-600"}`}>Google Ads {data.connected.google ? "connected" : "not connected"}</span>
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-ink-600">Marketing consent {data.settings.requireMarketingConsent ? "required" : "not required"} · lists sync from {data.settings.minSyncSize} members</span>
        </div>
      )}
      {loading && !data ? <InlineSpinner /> : error ? <p className="text-sm text-red-600">{error}</p> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-500">
              <tr><th className={th}>Audience</th><th className={th}>Rule</th><th className={th}>Members</th><th className={th}>Last sync</th><th className={th} /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((s) => (
                <tr key={s.id} className={s.active ? "" : "opacity-60"}>
                  <td className={th}>
                    <button className="text-left font-semibold text-ink-900 hover:underline" onClick={() => setOpen(s)}>{s.name}</button>
                    {!s.active && <span className="ml-1 text-xs text-ink-500">(off)</span>}
                    {s.description && <p className="text-xs text-ink-500">{s.description}</p>}
                  </td>
                  <td className={`${th} max-w-[320px] text-xs text-ink-700`}>{ruleText(s.rule)}</td>
                  <td className={th}><span className="font-semibold">{s.members}</span><p className="text-[11px] text-ink-500">{s.lastComputedAt ? formatDate(s.lastComputedAt, true) : "not computed"}</p></td>
                  <td className={`${th} text-xs`}>
                    {!s.sync.meta && !s.sync.google ? <span className="text-ink-500">Sync off</span> : s.lastSyncs.length ? s.lastSyncs.map((l) => (
                      <p key={l.platform}><span className="font-semibold">{l.platform === "meta" ? "Meta" : "Google"}</span> <span className={STATUS_TONE[l.status]}>{l.status}</span>{l.status === "success" ? ` +${l.sent} / -${l.removed}` : ""}</p>
                    )) : <span className="text-ink-500">Not synced yet</span>}
                  </td>
                  <td className={th}>
                    <div className="flex justify-end gap-1.5">
                      <button className="btn-outline btn-sm" disabled={busy === `r${s.id}`} onClick={() => act(`r${s.id}`, `/audiences/${s.id}/refresh`, (o) => `${o.data.members} members (${o.data.joined} joined, ${o.data.left} left).`)}><LuRefreshCw className="h-3.5 w-3.5" /> Refresh</button>
                      {(s.sync.meta || s.sync.google) && <button className="btn-outline btn-sm" disabled={busy === `s${s.id}`} onClick={() => act(`s${s.id}`, `/audiences/${s.id}/sync`, (o) => o.data.map((r) => `${r.platform === "meta" ? "Meta" : "Google"}: ${r.status}${r.detail ? ` - ${r.detail}` : ""}`).join(" · "))}><LuUpload className="h-3.5 w-3.5" /> Sync</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <Editor seg={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); reload(); }} />}
    </div>
  );
}
