import { useMemo, useRef, useState } from "react";
import { LuArrowDown, LuArrowUp, LuEye, LuEyeOff, LuListFilter, LuPencil, LuPlus, LuRotateCcw, LuTrash2, LuType, LuUpload } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal, { ConfirmDialog } from "../../components/common/Modal";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { useSiteConfig } from "../../context/SiteConfigContext";
import { formatDate } from "../../lib/format";

// Super Admin: every dropdown list and editable text of the dashboard and the
// website (GET/PUT /site-config/manage). Lists the system reads (fixed values)
// can be renamed, hidden and reordered; other lists also take new options.
// Text left empty falls back to its default. Changes reach visitors within a
// minute and are written to the audit log.

const TABS = [
  { key: "lists", label: "Dropdown lists", icon: LuListFilter },
  { key: "content", label: "Content", icon: LuType },
];
const APPS = [
  { key: "website", label: "Website" },
  { key: "dashboard", label: "Dashboard" },
];

const slug = (label) => label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 100);

function Segmented({ items, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg bg-surface-sunk p-1">
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-semibold ${value === key ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}
        >
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- lists

function ListEditor({ list, onSaved, onClose }) {
  const call = useApiCall();
  const toast = useToast();
  const hasRange = list.options.some((o) => o.min != null || o.max != null);
  const [rows, setRows] = useState(() => list.options.map((o) => ({ ...o, active: o.active !== false, isNew: false })));
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const update = (i, patch) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const move = (i, d) =>
    setRows((r) => {
      const next = [...r];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  const add = () => setRows((r) => [...r, { value: "", label: "", active: true, isNew: true }]);

  const save = async () => {
    setSaving(true);
    try {
      const options = rows.map(({ value, label, active, min, max, isNew }) => ({
        value: isNew && !value.trim() ? slug(label) : value,
        label,
        active,
        ...(hasRange ? { min: min === "" ? null : min, max: max === "" ? null : max } : {}),
      }));
      const res = await call(`/site-config/manage/lists/${encodeURIComponent(list.key)}`, { method: "PUT", body: { options } });
      toast.push("List saved - the dashboard and website pick it up within a minute.", "success");
      onSaved(res.data);
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    try {
      const res = await call(`/site-config/manage/lists/${encodeURIComponent(list.key)}/reset`, { method: "POST" });
      toast.push("List put back to its original options.", "success");
      onSaved(res.data);
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-surface-sunk px-4 py-2.5 text-xs text-ink-500">
        {list.extensible
          ? "Rename, hide, reorder, add or remove options. Records that already use a removed option keep their value."
          : "The system reads these values, so you can rename, hide and reorder them, but not add or remove options."}
      </p>
      <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
        {rows.map((row, i) => (
          <div key={i} className={`flex flex-wrap items-center gap-2 rounded-xl border border-line p-2.5 ${row.active ? "" : "bg-surface-sunk opacity-70"}`}>
            <div className="flex flex-col">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-0.5 text-ink-400 hover:text-ink-900 disabled:opacity-30" title="Move up">
                <LuArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="rounded p-0.5 text-ink-400 hover:text-ink-900 disabled:opacity-30" title="Move down">
                <LuArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <input className="field-input h-9 min-w-[140px] flex-1" placeholder="Label shown to users" value={row.label} onChange={(e) => update(i, { label: e.target.value })} />
            {row.isNew ? (
              <input className="field-input h-9 w-32 font-mono text-xs" placeholder={slug(row.label) || "stored value"} value={row.value} onChange={(e) => update(i, { value: e.target.value })} title="Stored value (optional - made from the label)" />
            ) : (
              <span className="w-32 truncate font-mono text-[11px] text-ink-400" title={`Stored value: ${row.value}`}>{row.value}</span>
            )}
            {hasRange && (
              <>
                <input className="field-input h-9 w-32" type="number" min="0" placeholder="Min ₹" value={row.min ?? ""} onChange={(e) => update(i, { min: e.target.value })} />
                <input className="field-input h-9 w-32" type="number" min="0" placeholder="Max ₹" value={row.max ?? ""} onChange={(e) => update(i, { max: e.target.value })} />
              </>
            )}
            <button type="button" onClick={() => update(i, { active: !row.active })} className="btn-outline btn-sm w-[86px] justify-center" title={row.active ? "Hide this option" : "Show this option"}>
              {row.active ? <LuEye className="h-3.5 w-3.5" /> : <LuEyeOff className="h-3.5 w-3.5" />}
              {row.active ? "Shown" : "Hidden"}
            </button>
            {(list.extensible || row.isNew) && (
              <button type="button" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} className="rounded-lg p-2 text-coral-600 hover:bg-coral-50" title="Remove option">
                <LuTrash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      {list.extensible && (
        <button type="button" onClick={add} className="btn-outline btn-sm">
          <LuPlus className="h-3.5 w-3.5" /> Add option
        </button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <button type="button" onClick={() => setConfirmReset(true)} disabled={!list.customised} className="btn-outline btn-sm">
          <LuRotateCcw className="h-3.5 w-3.5" /> Reset to original
        </button>
        <div className="flex gap-2">
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save list"}</button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          reset();
        }}
        title="Reset this list?"
        description="Labels, order, visibility and any added options go back to the original list."
        confirmLabel="Reset"
      />
    </div>
  );
}

function ListsTab({ lists, app, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const shown = lists.filter((l) => l.app === app && (!q || `${l.label} ${l.usedIn || ""}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="space-y-4">
      <input className="field-input h-9 w-full sm:w-72" placeholder="Search lists" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((l) => {
          const visible = l.options.filter((o) => o.active !== false);
          return (
            <div key={l.key} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">{l.label}</p>
                  {l.usedIn && <p className="mt-0.5 text-xs text-ink-500">{l.usedIn}</p>}
                </div>
                <button type="button" className="btn-outline btn-sm shrink-0" onClick={() => setEditing(l)}>
                  <LuPencil className="h-3.5 w-3.5" /> Edit
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {visible.slice(0, 8).map((o) => (
                  <span key={o.value} className="rounded-full bg-surface-sunk px-2.5 py-0.5 text-[11px] text-ink-700">{o.label}</span>
                ))}
                {visible.length > 8 && <span className="px-1 text-[11px] text-ink-400">+{visible.length - 8} more</span>}
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3 text-[10px]">
                <span className={`rounded px-1.5 py-0.5 font-bold ${l.extensible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {l.extensible ? "Editable list" : "Fixed values"}
                </span>
                {l.options.length !== visible.length && <span className="rounded bg-amber-50 px-1.5 py-0.5 font-bold text-amber-700">{l.options.length - visible.length} hidden</span>}
                {l.customised && <span className="rounded bg-sky-50 px-1.5 py-0.5 font-bold text-sky-700">Customised</span>}
                {l.updatedBy && <span className="text-ink-400">by {l.updatedBy} · {formatDate(l.updatedAt, true)}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {!shown.length && <p className="rounded-xl bg-surface-sunk px-4 py-3 text-xs text-ink-500">No lists match.</p>}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.label} description={editing?.usedIn} maxWidth="max-w-4xl">
        {editing && (
          <ListEditor
            key={editing.key}
            list={editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              onChanged();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

// -------------------------------------------------------------- content

function ContentItem({ item, onChanged }) {
  const call = useApiCall();
  const toast = useToast();
  const fileRef = useRef(null);
  const [value, setValue] = useState(item.value ?? "");
  const [busy, setBusy] = useState(false);
  const dirty = (item.value ?? "") !== value;

  const run = async (fn, okMessage) => {
    setBusy(true);
    try {
      await fn();
      toast.push(okMessage, "success");
      onChanged();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const save = (v = value) =>
    run(() => call(`/site-config/manage/content/${encodeURIComponent(item.key)}`, { method: "PUT", body: { value: v } }), v ? "Saved." : "Back to the default.");
  const upload = (file) => {
    const form = new FormData();
    form.append("file", file);
    return run(() => call(`/site-config/manage/content/${encodeURIComponent(item.key)}/image`, { method: "POST", body: form, isFormData: true }), "Image uploaded.");
  };

  const inputType = { email: "email", phone: "tel", url: "url" }[item.kind] || "text";
  return (
    <div className="flex flex-col gap-2 px-5 py-4 lg:flex-row lg:items-start">
      <div className="lg:w-64 lg:shrink-0">
        <p className="text-sm font-semibold text-ink-900">{item.label}</p>
        {item.updatedBy && <p className="text-[10px] text-ink-400">Changed by {item.updatedBy} · {formatDate(item.updatedAt, true)}</p>}
      </div>
      <div className="min-w-0 flex-1">
        {item.kind === "image" ? (
          <div className="flex items-center gap-3">
            {item.previewUrl ? <img src={item.previewUrl} alt="" className="h-16 w-28 rounded-lg border border-line object-cover" /> : <span className="text-xs text-ink-400">Using the default image</span>}
            <button type="button" className="btn-outline btn-sm" disabled={busy} onClick={() => fileRef.current?.click()}>
              <LuUpload className="h-3.5 w-3.5" /> Upload
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </div>
        ) : item.kind === "textarea" ? (
          <textarea className="field-input min-h-[72px] py-2" maxLength={item.maxLength} placeholder={item.defaultValue || "Empty"} value={value} onChange={(e) => setValue(e.target.value)} />
        ) : (
          <input className="field-input" type={inputType} maxLength={item.maxLength} placeholder={item.defaultValue || (item.kind === "url" ? "https://" : "Empty")} value={value} onChange={(e) => setValue(e.target.value)} />
        )}
        <p className="mt-1 text-[11px] text-ink-400">
          {item.kind !== "image" && <>{value.length}/{item.maxLength} · </>}
          {item.defaultValue ? <>Left empty, it shows the default: “{item.defaultValue.length > 90 ? `${item.defaultValue.slice(0, 90)}…` : item.defaultValue}”</> : "Left empty, it is hidden."}
        </p>
      </div>
      <div className="flex gap-2 lg:pt-0.5">
        {item.kind !== "image" && (
          <button type="button" className="btn-primary btn-sm" disabled={!dirty || busy} onClick={() => save()}>
            Save
          </button>
        )}
        <button
          type="button"
          className="btn-outline btn-sm"
          disabled={busy || !item.value}
          onClick={() => {
            setValue("");
            save("");
          }}
          title="Use the default"
        >
          <LuRotateCcw className="h-3.5 w-3.5" /> Default
        </button>
      </div>
    </div>
  );
}

function ContentTab({ content, app, onChanged }) {
  const sections = useMemo(() => {
    const map = new Map();
    for (const c of content.filter((x) => x.app === app)) map.set(c.section, [...(map.get(c.section) || []), c]);
    return [...map.entries()];
  }, [content, app]);
  return (
    <div className="space-y-5">
      {sections.map(([section, items]) => (
        <div key={section} className="card overflow-hidden">
          <h3 className="border-b border-line bg-surface-muted/40 px-5 py-3 text-sm font-bold uppercase tracking-wide text-ink-500">{section}</h3>
          <div className="divide-y divide-line">
            {items.map((item) => (
              <ContentItem key={`${item.key}:${item.updatedAt}`} item={item} onChanged={onChanged} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SiteConfigPage() {
  const [tab, setTab] = useState("lists");
  const [app, setApp] = useState("website");
  const { data, loading, error, reload } = useApiQuery("/site-config/manage");
  const siteConfig = useSiteConfig();
  const changed = () => {
    reload();
    siteConfig.reload();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Super Admin"
        title="Site configuration"
        subtitle="Dropdown options and text shown on the website and in the dashboard. Changes go live within a minute and are recorded in the audit log."
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented items={TABS} value={tab} onChange={setTab} />
        <Segmented items={APPS} value={app} onChange={setApp} />
      </div>
      {error && <p className="rounded-xl bg-coral-50 px-4 py-3 text-sm text-coral-700">{error}</p>}
      {loading && !data && <p className="text-sm text-ink-500">Loading…</p>}
      {data && tab === "lists" && <ListsTab lists={data.lists} app={app} onChanged={changed} />}
      {data && tab === "content" && <ContentTab content={data.content} app={app} onChanged={changed} />}
    </div>
  );
}
