import { useMemo, useRef, useState } from "react";
import { LuPlus, LuPencil, LuTrash2, LuUpload, LuDatabase, LuSlidersHorizontal, LuScrollText } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import Modal, { ConfirmDialog } from "../../components/common/Modal";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";

// Admin panel (Annexure A: "everything configurable, no developer"):
//   Master data - geography, stamp duty, circle rates, SROs, feature flags,
//                 disclaimers; forms are generated from the backend's field
//                 metadata (GET /admin/master), plus CSV bulk import.
//   Settings    - app_config values (statutory keys need super admin).
//   Audit log   - append-only log of every configuration / sensitive change.

const TABS = [
  { key: "master", label: "Master data", icon: LuDatabase },
  { key: "config", label: "Settings", icon: LuSlidersHorizontal },
  { key: "audit", label: "Audit log", icon: LuScrollText },
];

const label = (key) => titleCase(key.replace(/([A-Z])/g, " $1").replace(/Id$/, ""));
const show = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value).slice(0, 60);
  return String(value).length > 60 ? `${String(value).slice(0, 60)}…` : String(value);
};

// ------------------------------------------------------------ master data

function RecordForm({ entity, record, onSaved, onCancel }) {
  const call = useApiCall();
  const toast = useToast();
  const [values, setValues] = useState(() => {
    const init = {};
    entity.fields.forEach((f) => {
      const v = record ? record[f.column] : undefined;
      init[f.key] = f.type === "json" ? (v ? JSON.stringify(v, null, 2) : "") : f.type === "boolean" ? !!v : v ?? "";
      if (f.acceptsReference) init[`${f.key}__ref`] = "";
    });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }));

  const submit = async () => {
    setSaving(true);
    try {
      const body = {};
      for (const f of entity.fields) {
        if (f.acceptsReference) {
          const ref = values[`${f.key}__ref`].trim();
          if (ref) body[f.acceptsReference[0]] = ref;
          else if (values[f.key]) body[f.key] = values[f.key];
          continue;
        }
        let v = values[f.key];
        if (v === "" || v === undefined) {
          if (record) body[f.key] = null;
          continue;
        }
        if (f.type === "json") v = JSON.parse(v);
        else if (["numeric", "int"].includes(f.type)) v = Number(v);
        body[f.key] = v;
      }
      const path = `/admin/master/${entity.name}${record ? `/${record.id}` : ""}`;
      await call(path, { method: record ? "PUT" : "POST", body });
      toast.push(record ? "Record updated." : "Record added.", "success");
      onSaved();
    } catch (err) {
      toast.push(err instanceof SyntaxError ? "One of the JSON fields isn't valid JSON." : err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        {entity.fields.map((f) => (
          <label key={f.key} className={f.type === "json" || f.type === "text" ? "sm:col-span-2" : ""}>
            <span className="field-label">
              {label(f.key)}
              {f.required ? " *" : ""}
            </span>
            {f.acceptsReference ? (
              <>
                <input
                  className="field-input"
                  placeholder={`${label(f.acceptsReference[0])}${record ? " (leave blank to keep)" : ""}`}
                  value={values[`${f.key}__ref`]}
                  onChange={(e) => set(`${f.key}__ref`, e.target.value)}
                />
                {record && values[f.key] && <span className="text-[10px] text-ink-400">Current: {String(values[f.key]).slice(0, 8)}…</span>}
              </>
            ) : f.type === "boolean" ? (
              <select className="field-select" value={values[f.key] ? "true" : "false"} onChange={(e) => set(f.key, e.target.value === "true")}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : f.enum ? (
              <select className="field-select" value={values[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">—</option>
                {f.enum.map((o) => (
                  <option key={o} value={o}>
                    {titleCase(o)}
                  </option>
                ))}
              </select>
            ) : f.type === "json" || f.type === "text" ? (
              <textarea className="field-input h-24 py-2 font-mono text-xs" value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} />
            ) : (
              <input
                className="field-input"
                type={f.type === "date" ? "date" : ["numeric", "int"].includes(f.type) ? "number" : "text"}
                step={f.type === "numeric" ? "any" : undefined}
                value={f.type === "date" && values[f.key] ? String(values[f.key]).slice(0, 10) : values[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={saving} onClick={submit}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function MasterDataTab() {
  const call = useApiCall();
  const toast = useToast();
  const { data: entities } = useApiQuery("/admin/master");
  const [entityName, setEntityName] = useState("cities");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // {} for new, record for edit
  const [toDelete, setToDelete] = useState(null);
  const fileRef = useRef(null);
  const entity = (entities || []).find((e) => e.name === entityName);
  const { data, loading, reload } = useApiQuery(`/admin/master/${entityName}${buildQuery({ search, page, limit: 25 })}`);
  const items = data?.items || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const columns = useMemo(() => (entity ? entity.fields.filter((f) => f.type !== "uuid" && f.type !== "json").slice(0, 6) : []), [entity]);

  const importCsv = async (file) => {
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await call(`/admin/master/${entityName}/import`, { method: "POST", body, isFormData: true });
      const r = res.data || {};
      toast.push(`Imported ${r.inserted ?? r.imported ?? 0} row(s)${r.errors?.length ? `, ${r.errors.length} error(s)` : ""}.`, r.errors?.length ? "error" : "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = async () => {
    try {
      await call(`/admin/master/${entityName}/${toDelete.id}`, { method: "DELETE" });
      toast.push("Record deleted.", "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
    setToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="field-select h-9 w-56"
          value={entityName}
          onChange={(e) => {
            setEntityName(e.target.value);
            setPage(1);
            setSearch("");
          }}
        >
          {(entities || []).map((e) => (
            <option key={e.name} value={e.name}>
              {titleCase(e.name.replace(/_/g, " "))}
            </option>
          ))}
        </select>
        <input className="field-input h-9 w-56" placeholder="Search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <div className="ml-auto flex gap-2">
          <button className="btn-outline btn-sm" onClick={() => fileRef.current?.click()} title="CSV with snake_case headers matching the fields">
            <LuUpload className="h-4 w-4" /> Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
          <button className="btn-primary btn-sm" disabled={!entity} onClick={() => setEditing({})}>
            <LuPlus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3">{label(c.key)}</th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-2.5 text-ink-800">
                    {c.key === "status" || c.key === "isActive" ? <StatusBadge value={titleCase(show(row[c.column]))} /> : show(row[c.column])}
                  </td>
                ))}
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  <button className="mr-2 text-ink-500 hover:text-ink-900" title="Edit" onClick={() => setEditing(row)}>
                    <LuPencil className="h-4 w-4" />
                  </button>
                  <button className="text-red-500 hover:text-red-700" title="Delete" onClick={() => setToDelete(row)}>
                    <LuTrash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-ink-500">No records.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="text-ink-500">Page {page} of {totalPages}</span>
          <button className="btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}

      <Modal open={!!editing && !!entity} onClose={() => setEditing(null)} title={editing?.id ? "Edit record" : `Add ${titleCase(entityName.replace(/_/g, " "))}`} maxWidth="max-w-2xl">
        {editing && entity && (
          <RecordForm
            entity={entity}
            record={editing.id ? editing : null}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} title="Delete record?" description="This removes it from master data. Records other data depends on can't be deleted." />
    </div>
  );
}

// --------------------------------------------------------------- settings

function ConfigTab() {
  const call = useApiCall();
  const toast = useToast();
  const { role } = useAuth();
  const { data, reload } = useApiQuery("/admin/config");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState(null);
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const rows = (data || []).filter((c) => !category || c.category === category);
  const categories = [...new Set((data || []).map((c) => c.category))];

  const open = (row) => {
    setEditing(row);
    setText(JSON.stringify(row.value, null, 2));
    setReason("");
  };
  const save = async () => {
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      toast.push("Value must be valid JSON (wrap text in quotes).", "error");
      return;
    }
    try {
      await call(`/admin/config/${encodeURIComponent(editing.config_key)}`, { method: "PUT", body: { value, reason: reason || undefined } });
      toast.push("Setting saved - takes effect within 30 seconds.", "success");
      setEditing(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  return (
    <div className="space-y-4">
      <select className="field-select h-9 w-56" value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>{titleCase(c.replace(/_/g, " "))}</option>
        ))}
      </select>
      <div className="card divide-y divide-line">
        {rows.map((c) => (
          <div key={c.config_key} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs font-semibold text-ink-900">
                {c.config_key} {c.is_statutory && <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 font-sans text-[10px] font-bold text-amber-700">Statutory</span>}
              </p>
              {c.description && <p className="mt-0.5 text-xs text-ink-500">{c.description}</p>}
              <p className="mt-1 truncate font-mono text-xs text-ink-700">{show(c.value)}</p>
              {c.updated_by_name && <p className="text-[10px] text-ink-400">Last changed by {c.updated_by_name} · {formatDate(c.updated_at, true)}</p>}
            </div>
            <button className="btn-outline btn-sm" disabled={c.is_statutory && role !== "super_admin"} onClick={() => open(c)}>
              <LuPencil className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        ))}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.config_key} description={editing?.description} maxWidth="max-w-2xl">
        <div className="space-y-3">
          <textarea className="field-input h-64 py-2 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
          <input className="field-input" placeholder="Reason for change (saved in the audit log)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" onClick={save}>Save</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// -------------------------------------------------------------- audit log

function AuditTab() {
  const [filters, setFilters] = useState({ entityType: "", action: "", dateFrom: "", dateTo: "", page: 1 });
  const { data, loading } = useApiQuery(`/admin/audit-logs${buildQuery({ ...filters, limit: 50 })}`);
  const items = data?.items || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const [open, setOpen] = useState(null);
  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value, page: 1 }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input className="field-input h-9 w-44" placeholder="Entity (e.g. app_config)" value={filters.entityType} onChange={set("entityType")} />
        <input className="field-input h-9 w-44" placeholder="Action" value={filters.action} onChange={set("action")} />
        <input className="field-input h-9 w-40" type="date" value={filters.dateFrom} onChange={set("dateFrom")} />
        <input className="field-input h-9 w-40" type="date" value={filters.dateTo} onChange={set("dateTo")} />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-ink-500">{formatDate(a.created_at, true)}</td>
                <td className="px-4 py-2.5">{a.actor_name || a.actor_role || "System"}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{a.action}</td>
                <td className="px-4 py-2.5 text-xs text-ink-600">
                  {a.entity_type} {a.entity_id ? `· ${String(a.entity_id).slice(0, 12)}` : ""}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {(a.before_json || a.after_json) && (
                    <button className="text-xs font-semibold text-red-600" onClick={() => setOpen(a)}>Changes</button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-500">No audit entries.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <button className="btn-outline btn-sm" disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>Previous</button>
          <span className="text-ink-500">Page {filters.page} of {totalPages}</span>
          <button className="btn-outline btn-sm" disabled={filters.page >= totalPages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Next</button>
        </div>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.action} description={open ? `${open.entity_type} · ${formatDate(open.created_at, true)}` : ""} maxWidth="max-w-3xl">
        {open && (
          <div className="grid gap-3 sm:grid-cols-2">
            {[["Before", open.before_json], ["After", open.after_json]].map(([t, v]) => (
              <div key={t}>
                <p className="mb-1 text-xs font-bold uppercase text-ink-500">{t}</p>
                <pre className="max-h-80 overflow-auto rounded-lg bg-surface-muted p-3 text-[11px]">{v ? JSON.stringify(v, null, 2) : "—"}</pre>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState("master");
  return (
    <div>
      <PageHeader eyebrow="Administration" title="Admin panel" subtitle="Geography, rates, disclaimers and feature flags; platform settings; and the audit trail - all without code changes." />
      <div className="mb-5 flex gap-1 rounded-lg bg-surface-muted p-1 sm:w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-semibold ${tab === t.key ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>
      {tab === "master" && <MasterDataTab />}
      {tab === "config" && <ConfigTab />}
      {tab === "audit" && <AuditTab />}
    </div>
  );
}
