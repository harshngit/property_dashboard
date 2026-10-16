import { useEffect, useState } from "react";
import MapPicker from "./MapPicker";
import { useApiCall, useApiQuery } from "../../hooks/useApi";

// Dynamic Field Manager (sec. 5): draws the fields a Super Admin has added to
// a form, for the record's city (state-specific fields appear only there) and
// the signed-in role. Used inside the built-in forms: the parent keeps the
// values and sends them as `customFields`.
//   <DynamicFields entityType="property" city={form.city} core={form} values={custom} onChange={setCustom} errors={fieldErrors} />

const same = (a, b) => String(a) === String(b);
const empty = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
function test(c, values) {
  if (!c) return true;
  if (Array.isArray(c.all)) return c.all.every((x) => test(x, values));
  if (Array.isArray(c.any)) return c.any.some((x) => test(x, values));
  const v = values[c.field];
  const list = Array.isArray(c.value) ? c.value : [c.value];
  const has = (x) => (Array.isArray(v) ? v.some((y) => same(y, x)) : same(v ?? "", x ?? ""));
  switch (c.operator) {
    case "equals": return has(c.value);
    case "not_equals": return !has(c.value);
    case "in": return list.some(has);
    case "not_in": return !list.some(has);
    case "gt": return Number(v) > Number(c.value);
    case "lt": return Number(v) < Number(c.value);
    case "is_set": return !empty(v) && v !== false;
    case "is_empty": return empty(v) || v === false;
    default: return true;
  }
}
export const isShown = (field, values) => {
  const l = field.conditionalLogic;
  if (!l) return true;
  if (l.show_if && !test(l.show_if, values)) return false;
  if (l.hide_if && test(l.hide_if, values)) return false;
  return true;
};

// What to send: a phone the screen only saw masked goes back as "unchanged".
export function toPayload(values) {
  const out = {};
  for (const [k, v] of Object.entries(values || {})) out[k] = v && typeof v === "object" && v.masked ? { unchanged: true } : v === "" ? null : v;
  return out;
}

// Server errors ({ field, message }) by field name.
export const fieldErrors = (details) => Object.fromEntries((details || []).filter((e) => e.field).map((e) => [e.field, e.message]));

function Upload({ field, value, onChange }) {
  const call = useApiCall();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const multiple = !!field.validation?.multiple;
  const files = empty(value) ? [] : Array.isArray(value) ? value : [value];
  const pick = async (e) => {
    const chosen = [...e.target.files];
    e.target.value = "";
    if (!chosen.length) return;
    setBusy(true);
    setError(null);
    try {
      const done = [];
      for (const file of chosen) {
        const fd = new FormData();
        fd.append("file", file);
        done.push((await call(`/fields/${field.id}/upload`, { method: "POST", body: fd, isFormData: true })).data);
      }
      onChange(multiple ? [...files, ...done] : done[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <span key={f.path} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-muted px-2.5 py-1.5 text-xs" data-no-translate>
            {field.type === "image" && f.url ? <img src={f.url} alt="" className="h-8 w-8 rounded object-cover" /> : null}
            {f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="font-semibold text-red-600">{f.name}</a> : f.name}
            <button type="button" className="text-ink-500" title="Remove" onClick={() => onChange(multiple ? files.filter((_, j) => j !== i) : null)}>×</button>
          </span>
        ))}
      </div>
      {(multiple || !files.length) && <input type="file" multiple={multiple} disabled={busy} accept={field.type === "image" ? "image/jpeg,image/png,image/webp" : (field.validation?.accepted_file_types || []).join(",") || undefined} onChange={pick} className="mt-1.5 block text-xs text-ink-600" />}
      {busy && <p className="mt-1 text-xs text-ink-500">Uploading…</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Input({ field, value, onChange }) {
  const id = `cf-${field.name}`;
  const v = field.validation || {};
  const common = { id, className: "field-input", placeholder: field.placeholder || undefined };
  switch (field.type) {
    case "textarea":
      return <textarea {...common} rows={Number(v.rows) || 3} maxLength={v.max_length || 5000} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "number":
      return <input {...common} type="number" step={v.step || 1} min={v.min} max={v.max} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
    case "decimal":
    case "currency":
      return (
        <div className="relative">
          {field.type === "currency" && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500">₹</span>}
          <input {...common} className={`field-input ${field.type === "currency" ? "pl-7" : ""}`} type="number" step={1 / 10 ** (v.precision ?? 2)} min={v.min ?? (field.type === "currency" ? 0 : undefined)} max={v.max} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
        </div>
      );
    case "dropdown":
      return (
        <select id={id} className="field-select" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose…</option>
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case "multiselect": {
      const list = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-2">
          {field.options.map((o) => {
            const on = list.includes(o.value);
            return <button type="button" key={o.value} onClick={() => onChange(on ? list.filter((x) => x !== o.value) : [...list, o.value])} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? "border-red-600 bg-red-600 text-white" : "border-line bg-white text-ink-700"}`}>{o.label}</button>;
          })}
        </div>
      );
    }
    case "date":
      return <input {...common} type="date" min={v.min === "today" ? new Date().toISOString().slice(0, 10) : v.min} max={v.max === "today" ? new Date().toISOString().slice(0, 10) : v.max} value={value ? String(value).slice(0, 10) : ""} onChange={(e) => onChange(e.target.value)} />;
    case "datetime": {
      // The control works in local time; the value is kept as an ISO instant.
      const local = value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
      return <input {...common} type="datetime-local" value={local} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")} />;
    }
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm text-ink-800">
          <input id={id} type="checkbox" className="h-4 w-4 accent-red-600" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
          Yes
        </label>
      );
    case "file":
    case "image":
      return <Upload field={field} value={value} onChange={onChange} />;
    case "email":
      return <input {...common} type="email" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "phone":
      if (value && typeof value === "object" && value.masked) {
        return (
          <div className="flex items-center gap-3 text-sm text-ink-700">
            <span data-no-translate>{value.countryCode} {value.number}</span>
            <button type="button" className="text-xs font-semibold text-red-600" onClick={() => onChange("")}>Change</button>
          </div>
        );
      }
      return <input {...common} type="tel" inputMode="tel" maxLength={16} value={typeof value === "object" && value ? value.number || "" : value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "address": {
      const a = value && typeof value === "object" ? value : {};
      const set = (k) => (e) => onChange({ ...a, [k]: e.target.value });
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="field-input sm:col-span-2" placeholder="Address line 1" value={a.line1 || ""} onChange={set("line1")} />
          <input className="field-input sm:col-span-2" placeholder="Address line 2" value={a.line2 || ""} onChange={set("line2")} />
          <input className="field-input" placeholder="City" value={a.city || ""} onChange={set("city")} />
          <input className="field-input" placeholder="State" value={a.state || ""} onChange={set("state")} />
          <input className="field-input" placeholder="Pincode" inputMode="numeric" maxLength={6} value={a.pincode || ""} onChange={set("pincode")} />
        </div>
      );
    }
    case "geo_point": {
      const g = value && typeof value === "object" ? value : {};
      const set = (k) => (e) => onChange({ ...g, [k]: e.target.value });
      const here = () => navigator.geolocation?.getCurrentPosition((p) => onChange({ lat: Number(p.coords.latitude.toFixed(7)), lng: Number(p.coords.longitude.toFixed(7)) }));
      return (
        <div className="space-y-2">
        <MapPicker value={g} onChange={onChange} />
        <div className="flex flex-wrap items-center gap-2">
          <input className="field-input w-36" type="number" step="any" placeholder="Latitude" value={g.lat ?? ""} onChange={set("lat")} />
          <input className="field-input w-36" type="number" step="any" placeholder="Longitude" value={g.lng ?? ""} onChange={set("lng")} />
          <button type="button" className="btn-outline btn-sm" onClick={here}>Use my location</button>
          {g.lat && g.lng ? <a className="text-xs font-semibold text-red-600" href={`https://www.google.com/maps/search/?api=1&query=${g.lat},${g.lng}`} target="_blank" rel="noreferrer">Check on the map</a> : null}
        </div>
        </div>
      );
    }
    case "rating": {
      const max = Number(v.max) || 5;
      return (
        <div className="flex gap-1">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button type="button" key={n} aria-label={`${n} of ${max}`} onClick={() => onChange(value === n ? "" : n)} className={`text-2xl leading-none ${Number(value) >= n ? "text-amber-500" : "text-ink-300"}`}>★</button>
          ))}
        </div>
      );
    }
    default:
      return <input {...common} type="text" maxLength={v.max_length || 500} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }
}

export default function DynamicFields({ entityType, city, module, core = {}, values = {}, onChange, errors = {}, onFields }) {
  // Wait for the typing to stop before asking which fields this city has.
  const [place, setPlace] = useState(city || "");
  useEffect(() => {
    const t = setTimeout(() => setPlace(city || ""), 500);
    return () => clearTimeout(t);
  }, [city]);
  const qs = new URLSearchParams({ entityType, ...(place ? { city: place } : {}), ...(module ? { module } : {}) }).toString();
  const { data } = useApiQuery(`/fields/form?${qs}`);
  useEffect(() => {
    if (!data) return;
    onFields?.(data.sections.flatMap((s) => s.fields));
    // Defaults for fields the record has no value for yet.
    const defaults = {};
    for (const f of data.sections.flatMap((s) => s.fields)) if (values[f.name] === undefined && f.defaultValue !== null && f.defaultValue !== undefined) defaults[f.name] = f.defaultValue;
    if (Object.keys(defaults).length) onChange({ ...defaults, ...values });
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data || !data.count) return null;
  const all = { ...core, ...values };
  return (
    <>
      {data.sections.map((section) => {
        const fields = section.fields.filter((f) => isShown(f, all));
        if (!fields.length) return null;
        return (
          <div key={section.name}>
            <p className="mb-3 text-sm font-bold text-ink-900">{section.name}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.name} className={["textarea", "address", "multiselect", "geo_point", "file", "image"].includes(f.type) ? "sm:col-span-2" : ""}>
                  <label htmlFor={`cf-${f.name}`} className="field-label">{f.label}{f.required ? " *" : ""}</label>
                  <div className="mt-1"><Input field={f} value={values[f.name]} onChange={(v) => onChange({ ...values, [f.name]: v })} /></div>
                  {f.helpText && <p className="mt-1 text-xs text-ink-500">{f.helpText}</p>}
                  {errors[f.name] && <p className="mt-1 text-xs font-semibold text-red-600">{errors[f.name]}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

// Read-only list of a record's custom fields (from `customFieldList` on the record).
export function CustomFieldList({ list }) {
  if (!list?.length) return null;
  const sections = [...new Set(list.map((f) => f.section))];
  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <div key={s}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">{s}</p>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {list.filter((f) => f.section === s).map((f) => (
              <div key={f.name} className="flex justify-between gap-4 border-b border-line py-1.5">
                <dt className="text-ink-500">{f.label}</dt>
                <dd className="text-right font-semibold text-ink-900" data-no-translate>
                  {["file", "image"].includes(f.type)
                    ? (Array.isArray(f.value) ? f.value : [f.value]).map((x) => (x.url ? <a key={x.path} href={x.url} target="_blank" rel="noreferrer" className="block text-red-600">{x.name}</a> : <span key={x.path} className="block">{x.name}</span>))
                    : f.display}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

// The added fields of one record, shown and edited in place - for forms that
// have no screen of their own (KYC, due diligence, agreement, profile).
// Draws nothing when the Super Admin has added no field to that form.
export function RecordFields({ entityType, entityId, city, title, canEdit = true }) {
  const call = useApiCall();
  const form = useApiQuery(`/fields/form?${new URLSearchParams({ entityType, ...(city ? { city } : {}) }).toString()}`);
  const saved = useApiQuery(form.data?.count && entityId ? `/fields/values/${entityType}/${entityId}` : null);
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (saved.data) setValues(saved.data.values || {});
  }, [saved.data]);
  if (!form.data?.count || !entityId || values === null) return null;
  const save = async () => {
    setBusy(true);
    setErrors({});
    setNote(null);
    try {
      const r = await call(`/fields/values/${entityType}/${entityId}`, { method: "PUT", body: { customFields: toPayload(values), ...(city ? { city } : {}) } });
      setValues(r.data.values || {});
      setNote("Saved.");
    } catch (err) {
      setErrors(fieldErrors(err.details));
      setNote(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card space-y-4 p-6">
      {title && <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">{title}</h3>}
      {canEdit ? (
        <>
          <DynamicFields entityType={entityType} city={city} values={values} onChange={setValues} errors={errors} />
          <div className="flex items-center gap-3">
            <button type="button" className="btn-primary btn-sm" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
            {note && <span className="text-xs text-ink-500">{note}</span>}
          </div>
        </>
      ) : (
        <CustomFieldList list={saved.data?.list} />
      )}
    </div>
  );
}
