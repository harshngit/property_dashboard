import { useState } from "react";
import { Link } from "react-router-dom";
import { LuCopy, LuRefreshCw } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { SelectField, TextField, TextareaField } from "../../components/common/FormField";
import Select from "../../components/common/Select";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR } from "../../lib/format";

// Settings > Lead Sources (Engine 2): every source an org can switch on
// itself - no developer per tenant. Org admins connect sources for their own
// org; A R admins pick the org (A R Buildwel or any franchisee). Plus the
// ingestion review queue, the Super Admin source catalogue and master view.

const ADMIN = ["admin", "super_admin"];
const FIELD_LABELS = {
  page_id: "Facebook page id",
  page_access_token: "Page access token",
  app_secret: "Meta app secret (signature check)",
  verify_token: "Webhook verify token",
  form_ids: "Lead form ids (comma separated, for pull)",
  google_key: "Webhook key (paste into Google Ads)",
  customer_id: "Google Ads customer id (pull)",
  developer_token: "Google Ads developer token (pull)",
  client_id: "OAuth client id (pull)",
  client_secret: "OAuth client secret (pull)",
  refresh_token: "OAuth refresh token (pull)",
  login_customer_id: "Manager (MCC) customer id (optional)",
  api_key: "API key / shared secret",
  pull_url: "Lead pull URL (JSON)",
  pull_since_param: "Pull 'since' query parameter (default: since)",
  pull_auth_header: "Pull auth header name (default: x-api-key)",
};
const STATUS_TONE = {
  active: "bg-emerald-50 text-emerald-700",
  error: "bg-red-50 text-red-700",
  inactive: "bg-surface-muted text-ink-500",
  lead_created: "bg-emerald-50 text-emerald-700",
  duplicate_detected: "bg-indigo-50 text-indigo-700",
  parse_failed: "bg-amber-50 text-amber-700",
  rejected: "bg-surface-muted text-ink-500",
  parsed: "bg-surface-muted text-ink-600",
};
const Pill = ({ value }) => <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${STATUS_TONE[value] || "bg-surface-muted text-ink-600"}`}>{String(value || "").replace(/_/g, " ")}</span>;

export default function LeadSourcesPage() {
  const { role } = useAuth();
  const admin = ADMIN.includes(role);
  const [tab, setTab] = useState("connections");
  const tabs = [["connections", "Connections"], ["inbox", "Review queue"], ...(admin ? [["master", "All orgs"]] : []), ...(role === "super_admin" ? [["catalogue", "Source catalogue"]] : [])];
  return (
    <div>
      <PageHeader title="Lead Sources" />
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-surface-muted p-1 sm:w-fit">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-xs font-semibold ${tab === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>
        ))}
      </div>
      {tab === "connections" && <Connections admin={admin} />}
      {tab === "inbox" && <Inbox />}
      {tab === "master" && <Master />}
      {tab === "catalogue" && <Catalogue />}
    </div>
  );
}

function copy(text, toast) {
  navigator.clipboard?.writeText(text).then(() => toast.push("Copied.", "success")).catch(() => {});
}

function Connections({ admin }) {
  const toast = useToast();
  const call = useApiCall();
  const [org, setOrg] = useState("arb");
  const { data: tenants } = useApiQuery(admin ? "/tenants?limit=100" : null);
  const { data, loading, reload } = useApiQuery(`/lead-sources/connections${admin ? buildQuery({ tenantId: org }) : ""}`);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const orgOptions = [{ value: "arb", label: "A R Buildwel (master)" }, ...((tenants?.items || tenants || []).map((t) => ({ value: t.id, label: t.name })))];

  const save = async (status) => {
    setBusy(true);
    try {
      await call(`/lead-sources/connections/${editing.source.key}`, { method: "PUT", body: { tenantId: admin ? org : undefined, credentials: editing.values, ...(status ? { status } : {}) } });
      toast.push(status === "inactive" ? "Source switched off." : "Source connected.", "success");
      setEditing(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const pull = async (id) => {
    try {
      const r = await call(`/lead-sources/connections/${id}/pull`, { method: "POST" });
      toast.push(`Pulled ${r.data.fetched}: ${r.data.created} new, ${r.data.duplicates} already in.`, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        {admin && <Select value={org} onChange={setOrg} options={orgOptions} className="w-72" />}
        {data?.mailbox && (
          <div className="card flex items-center gap-2 px-3 py-2 text-xs">
            <span className="text-ink-500">Portal lead mailbox:</span>
            <span className="font-semibold text-ink-900">{data.mailbox}</span>
            <button onClick={() => copy(data.mailbox, toast)} className="text-ink-500 hover:text-ink-900"><LuCopy className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>
      {loading && !data ? (
        <div className="flex justify-center py-16"><InlineSpinner className="h-6 w-6" /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(data?.items || []).map(({ source, connection }) => (
            <div key={source.key} className={`card p-4 ${source.isActive ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink-900">{source.name}</p>
                  <p className="text-[11px] text-ink-500">{source.tag} · {source.syncMode}</p>
                </div>
                {connection ? <Pill value={connection.status} /> : source.configRequired ? <Pill value="not connected" /> : <Pill value="active" />}
              </div>
              {!source.configRequired ? (
                <p className="mt-3 text-xs text-ink-500">Built in - works for every org with no setup.</p>
              ) : connection ? (
                <div className="mt-3 space-y-1 text-xs text-ink-600">
                  <div className="flex items-center gap-1">
                    <span className="truncate font-mono text-[11px] text-ink-800" title={connection.webhookUrl}>{connection.webhookUrl}</span>
                    <button onClick={() => copy(connection.webhookUrl, toast)} className="shrink-0 text-ink-500 hover:text-ink-900"><LuCopy className="h-3.5 w-3.5" /></button>
                  </div>
                  <p>This month: <b>{connection.leadsThisMonth}</b> leads from {connection.payloadsThisMonth} payloads</p>
                  <p>Last push {connection.lastPushAt ? formatDate(connection.lastPushAt, true) : "–"} · last pull {connection.lastPullAt ? formatDate(connection.lastPullAt, true) : "–"}</p>
                  {connection.lastError && <p className="text-red-600">{connection.consecutiveFailures} failed pull(s): {connection.lastError}</p>}
                </div>
              ) : (
                <p className="mt-3 text-xs text-ink-500">{source.configLabel || "Not connected for this org."}</p>
              )}
              {source.configRequired && source.isActive && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => setEditing({ source, connection, values: Object.fromEntries(source.credentialFields.map((f) => [f, connection?.credentials?.[f] ? (Array.isArray(connection.credentials[f]) ? connection.credentials[f].join(", ") : connection.credentials[f]) : ""])) })}
                  >
                    {connection ? "Configure" : "Connect"}
                  </button>
                  {connection && source.supportsPull && source.syncMode !== "push" && (
                    <button className="btn-outline btn-sm inline-flex items-center gap-1" onClick={() => pull(connection.id)}><LuRefreshCw className="h-3.5 w-3.5" /> Pull now</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `${editing.connection ? "Configure" : "Connect"} ${editing.source.name}` : ""} description={editing?.source.configLabel || ""} maxWidth="max-w-lg">
        {editing && (
          <div className="space-y-3">
            {editing.source.credentialFields.map((f) => (
              <TextField
                key={f}
                label={FIELD_LABELS[f] || f}
                value={editing.values[f] || ""}
                onChange={(e) => setEditing((x) => ({ ...x, values: { ...x.values, [f]: e.target.value } }))}
                placeholder={f === "google_key" || f === "verify_token" ? "Generated for you if left empty" : ""}
              />
            ))}
            <p className="text-xs text-ink-500">Secrets are stored encrypted and shown masked. Leave a masked value unchanged to keep it.</p>
            <div className="flex justify-between gap-2 pt-2">
              {editing.connection && editing.connection.status !== "inactive" ? (
                <button className="btn-outline" disabled={busy} onClick={() => save("inactive")}>Switch off</button>
              ) : <span />}
              <div className="flex gap-2">
                <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn-primary" disabled={busy} onClick={() => save(editing.connection?.status === "inactive" ? "active" : undefined)}>Save</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Inbox() {
  const toast = useToast();
  const call = useApiCall();
  const [status, setStatus] = useState("parse_failed");
  const { data, loading, reload } = useApiQuery(`/lead-sources/inbox${buildQuery({ status, limit: 100 })}`);
  const [item, setItem] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const counts = data?.counts || {};

  const open = async (id) => {
    try {
      const r = await call(`/lead-sources/inbox/${id}`);
      setItem(r.data);
      setForm({ name: r.data.parsed_name || "", phone: "", email: r.data.parsed_email || "", city: r.data.parsed_city || "", locality: r.data.parsed_locality || "", budget: r.data.parsed_budget || "", message: r.data.parsed_message || "" });
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const act = async (kind) => {
    setBusy(true);
    try {
      if (kind === "resolve") {
        const r = await call(`/lead-sources/inbox/${item.id}/resolve`, { method: "POST", body: { ...form, phone: form.phone || undefined } });
        toast.push(r.data.created ? "Lead created and assigned." : "Merged into the existing lead.", "success");
      } else {
        await call(`/lead-sources/inbox/${item.id}/reject`, { method: "POST", body: { reason: form.reason || "Not a lead" } });
        toast.push("Rejected.", "success");
      }
      setItem(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg bg-surface-muted p-1 sm:w-fit">
        {[["parse_failed", "Needs review"], ["lead_created", "Lead created"], ["duplicate_detected", "Duplicates"], ["rejected", "Rejected"], ["", "All"]].map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${status === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>
            {l}{k && counts[k] ? ` (${counts[k]})` : ""}
          </button>
        ))}
      </div>
      {loading && !data ? (
        <div className="flex justify-center py-16"><InlineSpinner className="h-6 w-6" /></div>
      ) : !(data?.items || []).length ? (
        <EmptyState title="Nothing here" subtitle={status === "parse_failed" ? "Every inbound lead was read confidently." : "No inbound leads in this view yet."} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Org</th>
                <th className="px-4 py-3">Parsed</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 text-xs">{formatDate(i.created_at, true)}<p className="text-ink-500">{i.ingestion_method.replace("_", " ")}</p></td>
                  <td className="px-4 py-3 text-xs">{i.source_name || i.source_key}{i.external_lead_id && <p className="text-ink-500">#{i.external_lead_id}</p>}</td>
                  <td className="px-4 py-3 text-xs">{i.org_name}</td>
                  <td className="px-4 py-3 text-xs">
                    <p className="font-semibold text-ink-900">{i.parsed_name || "–"}</p>
                    <p className="text-ink-500">{[i.parsed_phone_masked, i.parsed_email, [i.parsed_locality, i.parsed_city].filter(Boolean).join(", "), i.parsed_budget && formatINR(i.parsed_budget)].filter(Boolean).join(" · ")}</p>
                    {i.parse_error && <p className="text-amber-700">{i.parse_error}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs">{i.parse_confidence != null ? `${Math.round(i.parse_confidence)}%` : "–"}{i.parsed_by_ai ? " · AI" : ""}</td>
                  <td className="px-4 py-3">
                    <Pill value={i.parse_status} />
                    {i.dedup_result && i.dedup_result !== "unique" && <p className="mt-1 text-[11px] text-ink-500">{i.dedup_result.replace(/_/g, " ")}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {i.created_lead_id ? (
                      <Link to={`/app/leads/${i.created_lead_id}`} className="text-xs font-semibold text-red-600 hover:underline">Open lead</Link>
                    ) : ["parse_failed", "parsed"].includes(i.parse_status) ? (
                      <button className="btn-outline btn-sm" onClick={() => open(i.id)}>Review</button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!item} onClose={() => setItem(null)} title="Review inbound lead" description="Complete what the parser missed. A phone number or email is required." maxWidth="max-w-2xl">
        {item && (
          <div className="space-y-3">
            <pre className="max-h-40 overflow-auto rounded-lg bg-surface-muted p-3 text-[11px] text-ink-700">{String(item.raw_payload || "").slice(0, 4000)}</pre>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <TextField label={`Mobile${item.parsed_phone_masked ? ` (on file: ${item.parsed_phone_masked})` : ""}`} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <TextField label="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              <TextField label="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              <TextField label="Locality" value={form.locality} onChange={(e) => setForm((f) => ({ ...f, locality: e.target.value }))} />
              <TextField label="Budget (e.g. 85 Lakh)" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />
            </div>
            <TextareaField label="Message" rows={2} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
            <div className="flex justify-between gap-2 pt-1">
              <button className="btn-outline" disabled={busy} onClick={() => act("reject")}>Reject (not a lead)</button>
              <button className="btn-primary" disabled={busy} onClick={() => act("resolve")}>Create lead</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Master() {
  const { data, loading } = useApiQuery("/lead-sources/master");
  if (loading && !data) return <div className="flex justify-center py-16"><InlineSpinner className="h-6 w-6" /></div>;
  const rows = (data || []).filter((r) => r.connection_id);
  if (!rows.length) return <EmptyState title="No org has connected a source yet" />;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Org</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Leads this month</th>
            <th className="px-4 py-3">Last push / pull</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.connection_id}>
              <td className="px-4 py-3">{r.source_name}<p className="text-[11px] text-ink-500">{r.source_tag}</p></td>
              <td className="px-4 py-3 text-xs">{r.org_name}</td>
              <td className="px-4 py-3"><Pill value={r.status} />{r.consecutive_failures > 0 && <p className="mt-1 text-[11px] text-red-600">{r.consecutive_failures} failures</p>}</td>
              <td className="px-4 py-3 text-right font-semibold">{r.leads_this_month}</td>
              <td className="px-4 py-3 text-xs">{r.last_push_at ? formatDate(r.last_push_at, true) : "–"} / {r.last_pull_at ? formatDate(r.last_pull_at, true) : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Catalogue() {
  const toast = useToast();
  const call = useApiCall();
  const { data, loading, reload } = useApiQuery("/lead-sources");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      let fieldMapping;
      try {
        fieldMapping = editing.mappingText.trim() ? JSON.parse(editing.mappingText) : {};
      } catch {
        throw new Error("Field mapping must be valid JSON, e.g. {\"phone\": [\"cust_mobile\"]}");
      }
      if (editing.isNew) {
        await call("/lead-sources", {
          method: "POST",
          body: { sourceKey: editing.source_key, sourceName: editing.source_name, sourceTag: editing.source_tag, channel: editing.channel, normaliserModule: editing.normaliser_module, syncMode: editing.sync_mode, pollIntervalMinutes: editing.poll_interval_minutes, fieldMapping, tenantConfigLabel: editing.tenant_config_label },
        });
      } else {
        await call(`/lead-sources/${editing.source_key}`, {
          method: "PUT",
          body: { sourceName: editing.source_name, isActive: editing.is_active, syncMode: editing.sync_mode, pollIntervalMinutes: editing.poll_interval_minutes, fieldMapping, tenantConfigLabel: editing.tenant_config_label },
        });
      }
      toast.push("Source saved.", "success");
      setEditing(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <div className="flex justify-center py-16"><InlineSpinner className="h-6 w-6" /></div>;
  return (
    <>
      <div className="mb-3 flex justify-end">
        <button className="btn-primary btn-sm" onClick={() => setEditing({ isNew: true, source_key: "", source_name: "", source_tag: "", channel: "portal", normaliser_module: "portal", sync_mode: "push", poll_interval_minutes: 30, is_active: true, mappingText: "{}", tenant_config_label: "" })}>Add source</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Tag (immutable)</th>
              <th className="px-4 py-3">Normaliser</th>
              <th className="px-4 py-3">Sync</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(data || []).map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3">{s.source_name}<p className="text-[11px] text-ink-500">{s.source_key} · {s.channel}</p></td>
                <td className="px-4 py-3 font-mono text-xs">{s.source_tag}</td>
                <td className="px-4 py-3 text-xs">{s.normaliser_module}</td>
                <td className="px-4 py-3 text-xs">{s.sync_mode}{s.sync_mode !== "push" ? ` · every ${s.poll_interval_minutes} min` : ""}</td>
                <td className="px-4 py-3"><Pill value={s.is_active ? "active" : "inactive"} /></td>
                <td className="px-4 py-3 text-right">
                  {!["form", "manual", "whatsapp", "telegram"].includes(s.normaliser_module) && (
                    <button className="btn-outline btn-sm" onClick={() => setEditing({ ...s, mappingText: JSON.stringify(s.field_mapping || {}, null, 2) })}>Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.isNew ? "Add lead source" : `Edit ${editing?.source_name || ""}`} description="A new portal or ad platform is a catalogue row - every org can then connect it themselves." maxWidth="max-w-lg">
        {editing && (
          <div className="space-y-3">
            {editing.isNew && (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Key (e.g. commonfloor)" value={editing.source_key} onChange={(e) => setEditing((x) => ({ ...x, source_key: e.target.value }))} />
                <TextField label="Tag (e.g. Portal-CommonFloor)" value={editing.source_tag} onChange={(e) => setEditing((x) => ({ ...x, source_tag: e.target.value }))} />
                <SelectField label="Channel" value={editing.channel} onChange={(e) => setEditing((x) => ({ ...x, channel: e.target.value }))} options={[{ value: "portal", label: "Portal" }, { value: "social_ad", label: "Social ad" }]} />
                <SelectField label="Normaliser" value={editing.normaliser_module} onChange={(e) => setEditing((x) => ({ ...x, normaliser_module: e.target.value }))} options={[{ value: "portal", label: "Portal (JSON / form)" }, { value: "generic", label: "Generic" }]} />
              </div>
            )}
            <TextField label="Name" value={editing.source_name} onChange={(e) => setEditing((x) => ({ ...x, source_name: e.target.value }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label="Sync mode" value={editing.sync_mode} onChange={(e) => setEditing((x) => ({ ...x, sync_mode: e.target.value }))} options={[{ value: "push", label: "Push (webhook)" }, { value: "push+pull", label: "Push + pull" }, { value: "pull", label: "Pull only" }]} />
              <TextField label="Poll every (minutes)" type="number" value={editing.poll_interval_minutes} onChange={(e) => setEditing((x) => ({ ...x, poll_interval_minutes: e.target.value }))} />
            </div>
            <TextField label="Hint shown to orgs" value={editing.tenant_config_label || ""} onChange={(e) => setEditing((x) => ({ ...x, tenant_config_label: e.target.value }))} />
            <TextareaField label="Field mapping (JSON: field -> payload keys)" rows={5} value={editing.mappingText} onChange={(e) => setEditing((x) => ({ ...x, mappingText: e.target.value }))} />
            {!editing.isNew && (
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing((x) => ({ ...x, is_active: e.target.checked }))} /> Active on the platform
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy} onClick={save}>Save</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
