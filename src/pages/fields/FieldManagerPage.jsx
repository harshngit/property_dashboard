import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import DynamicFields from "../../components/fields/DynamicFields";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { titleCase } from "../../lib/format";

// Section 5 - Dynamic Field Manager. The Super Admin adds, edits, reorders,
// shows or hides fields on a form; the change is live on the next page load,
// with no deployment. Admins and staff can look but not change.

const th = "px-4 py-3";
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
const csv = (v) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean);
const OPERATOR = { equals: "is", not_equals: "is not", in: "is one of", not_in: "is none of", gt: "is more than", lt: "is less than", is_set: "is filled in", is_empty: "is empty" };
const NUMERIC = ["number", "decimal", "currency", "rating"];
const TEXTUAL = ["text", "textarea"];
const UPLOAD = ["file", "image"];

const blank = (entityType) => ({
  entityType, label: "", name: "", type: "text", section: "Additional details", helpText: "", placeholder: "", required: false, visiblePublicly: false, searchable: false,
  optionsText: "", min: "", max: "", maxLength: "", regex: "", precision: "", multiple: false, maxSizeMb: "", acceptedTypes: "", states: "", cities: "", roles: [], ruleField: "", ruleOperator: "equals", ruleValue: "", ruleKind: "show_if", defaultValue: "", optionsSource: "",
});

// A stored field -> the edit form.
function toForm(f) {
  const v = f.validation || {};
  const kind = f.conditionalLogic?.hide_if ? "hide_if" : "show_if";
  const rule = f.conditionalLogic?.[kind] || {};
  return {
    id: f.id, entityType: f.entityType, label: f.label, name: f.name, type: f.type, section: f.section, helpText: f.helpText || "", placeholder: f.placeholder || "", required: f.required, visiblePublicly: f.visiblePublicly, searchable: f.searchable,
    optionsText: (f.options || []).map((o) => `${o.value}${o.label !== o.value ? ` | ${o.label}` : ""}${o.is_active === false ? " | off" : ""}`).join("\n"),
    min: v.min ?? "", max: v.max ?? "", maxLength: v.max_length ?? "", regex: v.regex ?? "", precision: v.precision ?? "", multiple: !!v.multiple, maxSizeMb: v.max_file_size ? v.max_file_size / 1048576 : "", acceptedTypes: (v.accepted_file_types || []).join(", "),
    states: (f.applicableStates || []).join(", "), cities: (f.applicableCities || []).join(", "), roles: f.applicableRoles || [],
    ruleField: rule.field || "", ruleOperator: rule.operator || "equals", ruleValue: Array.isArray(rule.value) ? rule.value.join(", ") : rule.value ?? "", ruleKind: kind,
    defaultValue: f.defaultValue === null || f.defaultValue === undefined || typeof f.defaultValue === "object" ? "" : String(f.defaultValue),
    keep: v, optionsSource: f.optionsSource || "", system: f.system, locked: f.locked, defaultLabel: f.defaultLabel,
  };
}

// The edit form -> what the API takes.
function toBody(f, hasOptions) {
  // A built-in field: only how it is presented.
  if (f.system) return { label: f.label, helpText: f.helpText, placeholder: f.placeholder, required: f.required };
  const validation = { ...(f.keep || {}) };
  const put = (key, value) => { if (value === "" || value === undefined || value === false) delete validation[key]; else validation[key] = value; };
  put("min", f.min === "" ? "" : f.type === "date" ? f.min : Number(f.min));
  put("max", f.max === "" ? "" : f.type === "date" ? f.max : Number(f.max));
  put("max_length", f.maxLength === "" ? "" : Number(f.maxLength));
  put("regex", f.regex);
  put("precision", f.precision === "" ? "" : Number(f.precision));
  put("multiple", f.multiple);
  put("max_file_size", f.maxSizeMb === "" ? "" : Math.round(Number(f.maxSizeMb) * 1048576));
  put("accepted_file_types", csv(f.acceptedTypes).length ? csv(f.acceptedTypes) : "");
  const options = hasOptions
    ? f.optionsText.split("\n").map((line) => line.split("|").map((x) => x.trim())).filter((p) => p[0]).map((p) => ({ value: p[0], label: p[1] && p[1] !== "off" ? p[1] : p[0], is_active: p[p.length - 1] !== "off" }))
    : [];
  const noValue = ["is_set", "is_empty"].includes(f.ruleOperator);
  const many = ["in", "not_in"].includes(f.ruleOperator);
  const conditionalLogic = f.ruleField.trim() ? { [f.ruleKind]: { field: f.ruleField.trim(), operator: f.ruleOperator, ...(noValue ? {} : { value: many ? csv(f.ruleValue) : f.ruleValue }) } } : null;
  let defaultValue = null;
  if (f.defaultValue !== "") defaultValue = f.type === "checkbox" ? f.defaultValue === "true" : f.type === "multiselect" ? csv(f.defaultValue) : f.defaultValue;
  return {
    entityType: f.entityType, label: f.label, name: f.name || undefined, type: f.type, section: f.section, helpText: f.helpText, placeholder: f.placeholder, required: f.required, visiblePublicly: f.visiblePublicly, searchable: f.searchable,
    options, optionsSource: f.optionsSource || null, validation, conditionalLogic, defaultValue, applicableStates: csv(f.states).map((s) => s.toUpperCase()), applicableCities: csv(f.cities), applicableRoles: f.roles,
  };
}

function FieldEditor({ form, setForm, meta, states, canEdit, onSave, busy }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const type = meta.types.find((t) => t.key === form.type) || {};
  const input = (label, key, props = {}) => <label className="field-label">{label}<input className="field-input mt-1" value={form[key]} onChange={set(key)} disabled={!canEdit} {...props} /></label>;
  const check = (label, key, props = {}) => <label className="flex items-center gap-2 text-sm font-semibold text-ink-800"><input type="checkbox" className="h-4 w-4 accent-red-600" checked={!!form[key]} onChange={set(key)} disabled={!canEdit} {...props} />{label}</label>;
  if (form.system) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink-700">This is a built-in field. You can change how it is presented; its type and place in the form are fixed.{form.locked ? " Every record needs it, so it is always required and cannot be hidden." : ""}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {input("Label shown to people", "label", { id: "fm-label" })}
          <label className="field-label">Original label<input className="field-input mt-1" value={form.defaultLabel || ""} disabled /></label>
          {input("Help text under the field", "helpText")}
          {input("Placeholder", "placeholder")}
        </div>
        {!form.locked && check("Required", "required")}
        {canEdit && <div className="flex justify-end"><button className="btn-primary" disabled={busy || form.label.trim().length < 2} onClick={onSave}>Save field</button></div>}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {input("Label shown to people", "label", { id: "fm-label", placeholder: "e.g. Patta Number" })}
        <label className="field-label">Field type
          <select id="fm-type" className="field-select mt-1" value={form.type} onChange={set("type")} disabled={!canEdit}>
            {meta.types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </label>
        {input("Section of the form", "section", { id: "fm-section" })}
        {form.id ? <label className="field-label">Internal name<input className="field-input mt-1" value={form.name} disabled /></label> : input("Internal name (optional)", "name", { id: "fm-name", placeholder: "made from the label" })}
        {input("Help text under the field", "helpText")}
        {input("Placeholder", "placeholder")}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {check("Required", "required")}
        {check("Show on the public listing", "visiblePublicly", { disabled: !canEdit || type.neverPublic })}
        {check("Use as a search filter", "searchable")}
        {UPLOAD.includes(form.type) && check("Allow several files", "multiple")}
      </div>
      {type.neverPublic && <p className="-mt-2 text-xs text-ink-500">Phone numbers, email addresses, addresses and documents are never shown publicly.</p>}

      {type.hasOptions && (
        <label className="field-label">Where the options come from
          <select id="fm-source" className="field-select mt-1" value={form.optionsSource} onChange={set("optionsSource")} disabled={!canEdit}>
            <option value="">A list I type below</option>
            {(meta.optionSources || []).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </label>
      )}
      {type.hasOptions && !form.optionsSource && (
        <label className="field-label">Options, one per line
          <textarea id="fm-options" className="field-input mt-1 font-mono text-xs" rows={5} value={form.optionsText} onChange={set("optionsText")} disabled={!canEdit} placeholder={"hmda | HMDA approved\ndtcp | DTCP approved"} />
          <span className="mt-1 block text-xs font-normal text-ink-500">Write "value | label". Add "| off" to retire an option without losing records that used it.</span>
        </label>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {(NUMERIC.includes(form.type) || form.type === "date") && input(form.type === "date" ? "Earliest date (or today)" : "Minimum", "min")}
        {(NUMERIC.includes(form.type) || form.type === "date") && input(form.type === "date" ? "Latest date (or today)" : "Maximum", "max")}
        {["decimal", "currency"].includes(form.type) && input("Decimal places", "precision", { type: "number", min: 0, max: 6 })}
        {TEXTUAL.includes(form.type) && input("Maximum length", "maxLength", { type: "number", min: 1 })}
        {form.type === "text" && input("Pattern (regex)", "regex", { placeholder: "^[A-Z0-9-]{4,12}$" })}
        {UPLOAD.includes(form.type) && input("Largest file (MB)", "maxSizeMb", { type: "number", min: 0.1, step: 0.1 })}
        {form.type === "file" && input("Accepted types", "acceptedTypes", { placeholder: "application/pdf, .docx" })}
        {!UPLOAD.includes(form.type) && !["phone", "address", "geo_point"].includes(form.type) && input(form.type === "checkbox" ? "Default (true / false)" : "Default value", "defaultValue")}
      </div>

      <div className="rounded-xl border border-line p-4">
        <p className="mb-2 text-sm font-bold text-ink-900">Where it appears</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="field-label">States (codes, empty = everywhere)
            <input id="fm-states" list="fm-state-list" className="field-input mt-1" value={form.states} onChange={set("states")} disabled={!canEdit} placeholder="TG, DL" />
            <datalist id="fm-state-list">{states.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</datalist>
          </label>
          {input("Cities (names, empty = every city)", "cities", { placeholder: "Hyderabad, Warangal" })}
        </div>
        <p className="mb-1.5 mt-3 text-xs font-semibold text-ink-600">Only for these roles (none ticked = everyone)</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {meta.roles.map((r) => (
            <label key={r} className="flex items-center gap-1.5 text-xs text-ink-800">
              <input type="checkbox" className="h-3.5 w-3.5 accent-red-600" disabled={!canEdit} checked={form.roles.includes(r)} onChange={(e) => setForm({ ...form, roles: e.target.checked ? [...form.roles, r] : form.roles.filter((x) => x !== r) })} />
              {titleCase(r.replace(/_/g, " "))}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-line p-4">
        <p className="mb-2 text-sm font-bold text-ink-900">Show or hide depending on another answer (optional)</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="field-label">This field is
            <select className="field-select mt-1" value={form.ruleKind} onChange={set("ruleKind")} disabled={!canEdit}><option value="show_if">shown when</option><option value="hide_if">hidden when</option></select>
          </label>
          {input("Field name", "ruleField", { placeholder: "transactionType" })}
          <label className="field-label">Condition
            <select className="field-select mt-1" value={form.ruleOperator} onChange={set("ruleOperator")} disabled={!canEdit}>{meta.operators.map((o) => <option key={o} value={o}>{OPERATOR[o] || o}</option>)}</select>
          </label>
          {!["is_set", "is_empty"].includes(form.ruleOperator) && input("Value", "ruleValue", { placeholder: "rent" })}
        </div>
        <p className="mt-1.5 text-xs text-ink-500">Use the internal name of another added field, or a built-in one such as transactionType, propertyType, city or listingCategory.</p>
      </div>

      {canEdit && <div className="flex justify-end"><button className="btn-primary" disabled={busy || form.label.trim().length < 2} onClick={onSave}>{form.id ? "Save field" : "Add field"}</button></div>}
    </div>
  );
}

export default function FieldManagerPage() {
  const { role } = useAuth();
  const canEdit = role === "super_admin";
  const call = useApiCall();
  const toast = useToast();
  const meta = useApiQuery("/fields/meta");
  const geo = useApiQuery("/geo/states");
  const [entity, setEntity] = useState("property");
  const list = useApiQuery(`/fields?entityType=${entity}`);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [previewCity, setPreviewCity] = useState("");
  const [previewValues, setPreviewValues] = useState({});
  const [previewKey, setPreviewKey] = useState(0);
  if (!meta.data) return <Spinner />;
  const states = (Array.isArray(geo.data) ? geo.data : geo.data?.items || []).map((s) => ({ code: s.state_code || s.stateCode || s.code, name: s.state_name || s.stateName || s.name }));
  const fields = list.data || [];
  const sections = [...new Set(fields.map((f) => f.section))];
  const entityInfo = meta.data.entities.find((e) => e.key === entity);

  const act = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      if (msg) toast.push(msg, "success");
      list.reload();
      setPreviewKey((k) => k + 1);
      return true;
    } catch (err) {
      toast.push(err.message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    const body = toBody(form, meta.data.types.find((t) => t.key === form.type)?.hasOptions);
    const ok = await act(() => call(form.id ? `/fields/${form.id}` : "/fields", { method: form.id ? "PUT" : "POST", body }), form.id ? "Field saved. It is live on the next page load." : "Field added. It is live on the next page load.");
    if (ok) setForm(null);
  };
  // Swap a field with its neighbour, then renumber the whole form in tens.
  const move = (f, dir) => {
    // Added fields move among added fields; a built-in field moves inside its own section.
    const order = fields.filter((x) => !!x.system === !!f.system && (!f.system || x.section === f.section));
    const i = order.findIndex((x) => x.id === f.id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const slots = order.map((x) => x.displayOrder).sort((a, b) => a - b);
    [order[i], order[j]] = [order[j], order[i]];
    const spread = new Set(slots).size === slots.length;
    act(() => call("/fields/reorder", { method: "PUT", body: { items: order.map((x, k) => ({ id: x.id, displayOrder: spread ? slots[k] : (k + 1) * 10 })) } }));
  };
  const where = (f) => [f.applicableStates.length ? f.applicableStates.join(", ") : null, f.applicableCities.length ? f.applicableCities.join(", ") : null, f.applicableRoles.length ? f.applicableRoles.map((r) => titleCase(r.replace(/_/g, " "))).join(", ") : null].filter(Boolean).join(" · ") || "Everywhere, everyone";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin"
        title="Dynamic Field Manager"
        subtitle="Add a field to a form without a developer: choose its type, where it applies and who sees it. It appears for everyone on their next page load."
        actions={canEdit && <button className="btn-primary btn-sm" onClick={() => setForm(blank(entity))}>Add field</button>}
      />
      {!canEdit && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Only a Super Admin can add or change fields. You can see what is set up.</p>}
      <div className="flex flex-wrap gap-2">
        {meta.data.entities.map((e) => (
          <button key={e.key} onClick={() => { setEntity(e.key); setPreviewValues({}); }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${entity === e.key ? "border-red-600 bg-red-600 text-white" : "border-line bg-white text-ink-700"}`}>{e.label}</button>
        ))}
      </div>

      {!list.data ? <Spinner /> : !fields.length ? (
        <div className="card"><EmptyState title="No fields on this form yet" subtitle={canEdit ? "Use Add field to create the first one - for example a state-specific land record number." : undefined} /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <tr><th className={th}>Field</th><th className={th}>Type</th><th className={th}>Where it appears</th><th className={th}>Settings</th><th className={th}>Records</th><th className={th} /></tr>
            </thead>
            <tbody>
              {sections.map((s) => [
                <tr key={`s-${s}`} className="bg-surface-sunk"><td colSpan={6} className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-ink-600">{s}</td></tr>,
                ...fields.filter((f) => f.section === s).map((f) => (
                  <tr key={f.id} className={`border-b border-line ${f.active ? "" : "opacity-50"}`}>
                    <td className={th}><p className="font-semibold text-ink-900">{f.label}{f.required ? " *" : ""}{f.system && <span className="ml-2 rounded-full bg-surface-sunk px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-600">Built-in</span>}</p><p className="font-mono text-[11px] text-ink-500" data-no-translate>{f.name}</p></td>
                    <td className={th}>{meta.data.types.find((t) => t.key === f.type)?.label || f.type}</td>
                    <td className={`${th} text-xs`} data-no-translate>{where(f)}</td>
                    <td className={`${th} text-xs text-ink-600`}>{[f.active ? null : "Hidden", f.system && f.label !== f.defaultLabel ? `Was "${f.defaultLabel}"` : null, f.moved ? "Moved" : null, f.locked ? "Always needed" : null, f.optionsSource ? "Options from master data" : null, f.visiblePublicly ? "Public" : null, f.searchable ? "Search filter" : null, f.conditionalLogic ? "Conditional" : null].filter(Boolean).join(" · ") || "—"}</td>
                    <td className={th}>{f.system ? "—" : f.recordsWithValue}</td>
                    <td className={`${th} whitespace-nowrap text-right`}>
                      {canEdit && <>
                        <button className="btn-outline btn-sm" disabled={busy} title="Move up" onClick={() => move(f, -1)}>↑</button>{" "}
                        <button className="btn-outline btn-sm" disabled={busy} title="Move down" onClick={() => move(f, 1)}>↓</button>{" "}
                      </>}
                      {canEdit && !f.locked && <>
                        <button className="btn-outline btn-sm" disabled={busy} onClick={() => act(() => call(`/fields/${f.id}`, { method: "PUT", body: { active: !f.active } }), f.active ? "Field hidden. Its values are kept." : "Field shown again.")}>{f.active ? "Hide" : "Show"}</button>{" "}
                      </>}
                      <button className="btn-outline btn-sm" onClick={() => setForm(toForm(f))}>{canEdit ? "Edit" : "View"}</button>{" "}
                      {canEdit && !f.system && f.recordsWithValue === 0 && <button className="btn-outline btn-sm" disabled={busy} onClick={() => window.confirm(`Delete "${f.label}"? No record has used it.`) && act(() => call(`/fields/${f.id}`, { method: "DELETE" }), "Field deleted.")}>Delete</button>}
                    </td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      )}

      {entityInfo?.inForms ? (
        <div className="card space-y-4 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ink-900">Preview: what people see</p>
              <p className="text-xs text-ink-500">Type a city to see the fields for its state. Role-limited fields follow your own role.</p>
            </div>
            <label className="field-label">City<input id="fm-preview-city" className="field-input mt-1 w-56" value={previewCity} onChange={(e) => setPreviewCity(e.target.value)} placeholder="e.g. Hyderabad" /></label>
          </div>
          <DynamicFields key={`${entity}-${previewKey}`} entityType={entity} city={previewCity} values={previewValues} onChange={setPreviewValues} />
        </div>
      ) : (
        <p className="text-xs text-ink-500">Fields on this form are filled in by staff on the record itself.</p>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? (canEdit ? "Edit field" : "Field") : "Add field"} maxWidth="max-w-3xl">
        {form && <FieldEditor form={form} setForm={setForm} meta={meta.data} states={states} canEdit={canEdit} onSave={save} busy={busy} />}
      </Modal>
    </div>
  );
}
