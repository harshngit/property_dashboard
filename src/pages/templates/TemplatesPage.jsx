import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { LuPlus, LuDownload, LuFileText } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { API_BASE_URL } from "../../config/api";
import { formatDate, titleCase } from "../../lib/format";

// Module 50 - Document Template Engine.
//   Generate   pick a template, fill in only its variables (what the deal
//              already knows is filled in), download DOCX / PDF, or a blank
//              version for offline execution.
//   Documents  what has been generated; the assigned RM / DM marks advocate
//              review complete, which removes the DRAFT watermark.
//   Manage     (admin) add or edit a template and its variables - an edit
//              makes a new version; activate or retire. No code change.

const STAFF = ["internal_sales", "admin", "super_admin"];
const ADMIN = ["admin", "super_admin"];
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const th = "px-4 py-3";
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;

function useDownload() {
  const token = useSelector((s) => s.auth.accessToken);
  const toast = useToast();
  return async (id, format) => {
    try {
      const res = await fetch(`${API_BASE_URL}/templates/generated/${id}/download?format=${format}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Could not download the document");
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") || "")?.[1] || `document.${format}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(await res.blob());
      a.download = name;
      a.click();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
}

// Step 2-4 of the download flow: only this template's variables.
function GenerateForm({ template, initialDeal, onDone }) {
  const call = useApiCall();
  const toast = useToast();
  const download = useDownload();
  const [dealRef, setDealRef] = useState(initialDeal || "");
  const [stateCode, setStateCode] = useState("");
  const dealId = dealRef.match(UUID)?.[0];
  const { data: form, loading, error } = useApiQuery(`/templates/${template.id}/form${buildQuery({ dealId, stateCode })}`);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState(null);
  useEffect(() => { setValues({}); setErrors({}); }, [form?.dealId, form?.stateCode]);
  const val = (f) => (values[f.name] !== undefined ? values[f.name] : f.value ?? "");
  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }));
  const generate = async (blank) => {
    setBusy(true);
    setErrors({});
    try {
      const body = blank ? { blank: true } : { dealId, stateCode: form.stateCode || stateCode || undefined, values: Object.fromEntries(form.fields.map((f) => [f.name, val(f)])) };
      const res = await call(`/templates/${template.id}/generate`, { method: "POST", body });
      setMade(res.data);
      onDone();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  if (made) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">{made.isBlank ? "Blank form ready" : "Document ready"}: <span data-no-translate>{made.documentNumber}</span> (template v{made.templateVersion})</p>
          <p className="mt-1 text-xs">{made.isBlank ? "Variables are shown as underlined blanks for filling in by hand." : "It carries the working-draft disclaimer and a DRAFT watermark until advocate review is marked complete."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => download(made.id, "pdf")}><LuDownload className="h-4 w-4" /> Download PDF</button>
          <button className="btn-outline" onClick={() => download(made.id, "docx")}><LuDownload className="h-4 w-4" /> Download DOCX</button>
          <button className="btn-outline ml-auto" onClick={() => setMade(null)}>Make another</button>
        </div>
      </div>
    );
  }
  return (
    <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
      <TextField label="Deal (paste its link or ID to pre-fill; leave blank for a standalone document)" value={dealRef} onChange={(e) => setDealRef(e.target.value)} />
      {loading && !form ? <Spinner /> : error ? <p className="text-sm text-red-700">{error}</p> : form && (
        <>
          {form.needsState && (
            <label className="block"><span className="field-label">State the property is in (for stamp duty and state clauses)</span>
              <select id="tpl-state" className="field-select" value={stateCode} onChange={(e) => setStateCode(e.target.value)} data-no-translate><option value="">Choose the state</option>{form.states.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
            </label>
          )}
          <p className="text-xs text-ink-500">{form.fields.filter((f) => f.prefilled).length} of {form.fields.length} fields are already filled from the deal. {form.missing} still needed.{form.computed.length ? ` ${form.computed.map((c) => c.label).join(", ")} are worked out automatically.` : ""}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {form.fields.map((f) => (
              <label key={f.name} className={`block ${f.fieldType === "longtext" ? "sm:col-span-2" : ""}`}>
                <span className="field-label">{f.label}{f.isRequired ? " *" : ""}{f.prefilled && <span className="ml-1.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">from the deal</span>}</span>
                {f.fieldType === "longtext" ? <textarea className="field-input min-h-[64px]" rows={2} value={val(f)} onChange={set(f.name)} />
                  : ["dropdown", "party_picker"].includes(f.fieldType) ? <select className="field-select" value={val(f)} onChange={set(f.name)}><option value="">Choose</option>{(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}</select>
                    : <input className="field-input" type={f.fieldType === "date" ? "date" : ["number", "currency"].includes(f.fieldType) ? "number" : "text"} value={val(f)} onChange={set(f.name)} />}
                {f.helpText && <span className="mt-0.5 block text-[11px] text-ink-500">{f.helpText}</span>}
                {errors[f.name] && <span className="field-error">{errors[f.name]}</span>}
              </label>
            ))}
          </div>
          <p className="rounded-lg bg-surface-muted p-3 text-xs text-ink-600">{form.disclaimer}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn-outline" disabled={busy} onClick={() => generate(true)}>Blank version</button>
            <button className="btn-primary" disabled={busy || (form.needsState && !stateCode)} onClick={() => generate(false)}>Generate document</button>
          </div>
        </>
      )}
    </div>
  );
}

function Library({ staff, initialDeal, onGenerated }) {
  const { data, loading } = useApiQuery("/templates");
  const [open, setOpen] = useState(null);
  const rows = (data || []).filter((t) => t.status === "active");
  if (loading && !data) return <Spinner />;
  const groups = [...new Set(rows.map((t) => t.category))];
  return (
    <div className="space-y-5">
      {rows.length === 0 && <EmptyState title="No templates available" subtitle="An admin activates templates under Manage." />}
      {groups.map((g) => (
        <div key={g}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">{titleCase(g)}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.filter((t) => t.category === g).map((t) => (
              <button key={t.id} onClick={() => setOpen(t)} className="card p-4 text-left transition hover:border-red-200">
                <p className="flex items-start gap-2 text-sm font-bold text-ink-900"><LuFileText className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />{t.name}</p>
                <p className="mt-1 text-xs text-ink-500">{t.description}</p>
                <p className="mt-2 text-[11px] text-ink-400">{t.variables} variables · v{t.currentVersion}{staff && t.generated ? ` · ${t.generated} generated` : ""}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name} description="Fill in only what is missing." maxWidth="max-w-3xl">
        {open && <GenerateForm key={open.id} template={open} initialDeal={initialDeal} onDone={onGenerated} />}
      </Modal>
    </div>
  );
}

function Documents({ staff, nonce, initialDeal }) {
  const call = useApiCall();
  const toast = useToast();
  const download = useDownload();
  const dealId = initialDeal?.match(UUID)?.[0];
  const { data, loading, reload } = useApiQuery(`/templates/generated${buildQuery({ dealId, n: nonce })}`);
  const review = async (g) => {
    try {
      await call(`/templates/generated/${g.id}/advocate-reviewed`, { method: "POST" });
      toast.push("Advocate review recorded - the DRAFT watermark is removed.", "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const rows = data || [];
  if (loading && !data) return <Spinner />;
  if (!rows.length) return <EmptyState title="No documents generated yet" subtitle="Generate one from the template library." />;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Document</th><th className={th}>Template</th><th className={th}>Generated</th><th className={th}>Status</th><th className={th} /></tr></thead>
        <tbody className="divide-y divide-line">
          {rows.map((g) => (
            <tr key={g.id}>
              <td className={th}><p className="font-mono text-xs font-bold" data-no-translate>{g.documentNumber}</p>{g.dealId && <p className="text-[11px] text-ink-500">On a deal</p>}</td>
              <td className={th}>{g.templateName} <span className="text-xs text-ink-500">v{g.templateVersion}</span></td>
              <td className={`${th} text-xs`}>{formatDate(g.createdAt, true)}<p className="text-ink-500" data-no-translate>{g.createdByName}</p></td>
              <td className={th}><StatusBadge value={g.isBlank ? "Blank form" : g.draft ? "Draft" : "Advocate reviewed"} /></td>
              <td className={`${th} whitespace-nowrap text-right text-xs font-semibold`}>
                <button className="mr-3 text-red-600 hover:underline" onClick={() => download(g.id, "pdf")}>PDF</button>
                <button className="mr-3 text-red-600 hover:underline" onClick={() => download(g.id, "docx")}>DOCX</button>
                {staff && g.draft && !g.isBlank && <button className="text-ink-700 hover:underline" onClick={() => review(g)}>Advocate review complete</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const newVariable = () => ({ name: "", label: "", fieldType: "text", isRequired: true, helpText: "", prefill: "", options: "", computedKind: "amount_in_words", computedOf: "", stateCodes: "", min: "", max: "", pattern: "" });
const toEditable = (v) => ({ name: v.name, label: v.label, fieldType: v.fieldType, isRequired: v.isRequired, helpText: v.helpText || "", prefill: v.prefill || "", options: (v.options || []).join(", "), computedKind: v.computed?.kind || "amount_in_words", computedOf: v.computed?.of || "", stateCodes: (v.stateCodes || []).join(", "), min: v.validation?.min ?? "", max: v.validation?.max ?? "", pattern: v.validation?.pattern || "" });
const toPayload = (v) => ({
  name: v.name, label: v.label, fieldType: v.fieldType, isRequired: v.isRequired, helpText: v.helpText || undefined, prefill: v.prefill || undefined,
  options: v.fieldType === "dropdown" ? v.options.split(",").map((o) => o.trim()).filter(Boolean) : undefined,
  computed: v.fieldType === "computed" ? { kind: v.computedKind, of: v.computedOf || undefined } : undefined,
  stateCodes: v.stateCodes.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
  validation: { min: v.min === "" ? undefined : Number(v.min), max: v.max === "" ? undefined : Number(v.max), pattern: v.pattern || undefined },
});

function Editor({ id, onSaved, onCancel }) {
  const call = useApiCall();
  const toast = useToast();
  const meta = useApiQuery("/templates/meta");
  const existing = useApiQuery(id ? `/templates/${id}` : null);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id) setF({ name: "", category: "general", audience: "professional", dutyTransaction: "sale", description: "", body: "# Document title\n\nThis document is made at {{execution_place}} on this {{execution_date}}.", stateBlocks: [], variables: [{ ...newVariable(), name: "execution_place", label: "Place of execution" }, { ...newVariable(), name: "execution_date", label: "Date of execution", fieldType: "date" }], changeNote: "" });
    else if (existing.data) setF({ ...existing.data, description: existing.data.description || "", variables: existing.data.variables.map(toEditable), changeNote: "" });
  }, [id, existing.data]);
  if (!f) return <Spinner />;
  const used = [...new Set([...f.body.matchAll(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g)].map((m) => m[1]))].filter((n) => n !== "state_clauses");
  const undefinedVars = used.filter((u) => !f.variables.some((v) => v.name === u));
  const setVar = (i, k) => (e) => setF((s) => ({ ...s, variables: s.variables.map((v, j) => (j === i ? { ...v, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value } : v)) }));
  const save = async () => {
    setBusy(true);
    try {
      await call("/templates", { method: "POST", body: { id: id || undefined, name: f.name, category: f.category, audience: f.audience, dutyTransaction: f.dutyTransaction, description: f.description, body: f.body, stateBlocks: f.stateBlocks, variables: f.variables.map(toPayload), changeNote: f.changeNote || undefined } });
      toast.push(id ? "Saved as a new version." : "Template created as a draft - activate it when ready.", "success");
      onSaved();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <TextField label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="sm:col-span-2" />
        <TextField label="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
        <label className="block"><span className="field-label">Who can use it</span><select id="tpl-audience" className="field-select" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}><option value="staff">A R staff only</option><option value="professional">Staff, brokers and builders</option><option value="all">Everyone on the deal</option></select></label>
        <TextField label="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="sm:col-span-3" />
        <label className="block"><span className="field-label">Stamp duty rule used</span><select id="tpl-duty" className="field-select" value={f.dutyTransaction} onChange={(e) => setF({ ...f, dutyTransaction: e.target.value })}><option value="sale">Sale</option><option value="lease">Lease</option><option value="gift">Gift</option></select></label>
      </div>
      <div>
        <span className="field-label">Template text - "# " title, "## " clause heading, a blank line between paragraphs, {"{{variable_name}}"} for a variable, {"{{state_clauses}}"} where the state block goes</span>
        <textarea id="tpl-body" data-no-translate className="field-input min-h-[280px] font-mono text-xs" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        {undefinedVars.length > 0 && <p className="mt-1 text-xs text-red-600">Define these variables below: {undefinedVars.map((u) => `{{${u}}}`).join(", ")} <button className="ml-2 font-semibold underline" onClick={() => setF({ ...f, variables: [...f.variables, ...undefinedVars.map((u) => ({ ...newVariable(), name: u, label: titleCase(u.replace(/_/g, " ")) }))] })}>Add them</button></p>}
      </div>
      <div>
        <div className="mb-1 flex items-center"><span className="field-label !mb-0">State-specific clauses</span><button className="ml-auto text-xs font-semibold text-red-600 hover:underline" onClick={() => setF({ ...f, stateBlocks: [...f.stateBlocks, { stateCode: "", body: "" }] })}>+ Add a state</button></div>
        {f.stateBlocks.map((b, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input aria-label="State code" className="field-input h-9 w-20" placeholder="KA" maxLength={3} value={b.stateCode} onChange={(e) => setF({ ...f, stateBlocks: f.stateBlocks.map((x, j) => (j === i ? { ...x, stateCode: e.target.value.toUpperCase() } : x)) })} />
            <textarea aria-label="State clause" data-no-translate className="field-input min-h-[60px] flex-1 font-mono text-xs" value={b.body} onChange={(e) => setF({ ...f, stateBlocks: f.stateBlocks.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })} />
            <button className="text-xs text-red-600" onClick={() => setF({ ...f, stateBlocks: f.stateBlocks.filter((_, j) => j !== i) })}>Remove</button>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-1 flex items-center"><span className="field-label !mb-0">Variables ({f.variables.length})</span><button className="ml-auto text-xs font-semibold text-red-600 hover:underline" onClick={() => setF({ ...f, variables: [...f.variables, newVariable()] })}><LuPlus className="inline h-3.5 w-3.5" /> Add variable</button></div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[1040px] text-xs">
            <thead className="bg-surface-muted text-left uppercase tracking-wide text-ink-500"><tr><th className="px-2 py-2">Name</th><th className="px-2 py-2">Label</th><th className="px-2 py-2">Type</th><th className="px-2 py-2">Details</th><th className="px-2 py-2">Pre-fill from</th><th className="px-2 py-2">Help text</th><th className="px-2 py-2">States</th><th className="px-2 py-2">Req.</th><th /></tr></thead>
            <tbody className="divide-y divide-line">
              {f.variables.map((v, i) => (
                <tr key={i} className={used.includes(v.name) || v.fieldType === "computed" ? "" : "bg-amber-50"}>
                  <td className="px-2 py-1.5"><input aria-label="Variable name" data-no-translate className="field-input h-8 w-36 font-mono" value={v.name} onChange={setVar(i, "name")} /></td>
                  <td className="px-2 py-1.5"><input aria-label="Label" className="field-input h-8 w-40" value={v.label} onChange={setVar(i, "label")} /></td>
                  <td className="px-2 py-1.5"><select aria-label="Type" className="field-select h-8 w-28" value={v.fieldType} onChange={setVar(i, "fieldType")}>{(meta.data?.fieldTypes || []).map((t) => <option key={t} value={t}>{titleCase(t.replace("_", " "))}</option>)}</select></td>
                  <td className="px-2 py-1.5">
                    {v.fieldType === "dropdown" && <input aria-label="Choices" className="field-input h-8 w-44" placeholder="Choices, comma separated" value={v.options} onChange={setVar(i, "options")} />}
                    {v.fieldType === "computed" && <span className="flex gap-1"><select aria-label="Computed as" className="field-select h-8 w-32" value={v.computedKind} onChange={setVar(i, "computedKind")}>{(meta.data?.computedKinds || []).map((k) => <option key={k} value={k}>{titleCase(k.replace(/_/g, " "))}</option>)}</select><input aria-label="Of variable" data-no-translate className="field-input h-8 w-28 font-mono" placeholder="of variable" value={v.computedOf} onChange={setVar(i, "computedOf")} /></span>}
                    {["number", "currency"].includes(v.fieldType) && <span className="flex gap-1"><input aria-label="Minimum" className="field-input h-8 w-20" placeholder="min" value={v.min} onChange={setVar(i, "min")} /><input aria-label="Maximum" className="field-input h-8 w-20" placeholder="max" value={v.max} onChange={setVar(i, "max")} /></span>}
                    {v.fieldType === "text" && <input aria-label="Pattern" data-no-translate className="field-input h-8 w-44 font-mono" placeholder="pattern (optional)" value={v.pattern} onChange={setVar(i, "pattern")} />}
                  </td>
                  <td className="px-2 py-1.5"><select aria-label="Pre-fill" className="field-select h-8 w-40" value={v.prefill} onChange={setVar(i, "prefill")}><option value="">Ask the user</option>{Object.entries(meta.data?.prefillSources || {}).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></td>
                  <td className="px-2 py-1.5"><input aria-label="Help text" className="field-input h-8 w-40" value={v.helpText} onChange={setVar(i, "helpText")} /></td>
                  <td className="px-2 py-1.5"><input aria-label="States" data-no-translate className="field-input h-8 w-20" placeholder="all" value={v.stateCodes} onChange={setVar(i, "stateCodes")} /></td>
                  <td className="px-2 py-1.5"><input type="checkbox" aria-label="Required" checked={v.isRequired} disabled={v.fieldType === "computed"} onChange={setVar(i, "isRequired")} /></td>
                  <td className="px-2 py-1.5"><button className="text-red-600" title="Remove" onClick={() => setF({ ...f, variables: f.variables.filter((_, j) => j !== i) })}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[11px] text-ink-500">A highlighted row is a variable the text does not use. The text is checked for phone numbers, emails, links and forbidden terms when you save.</p>
      </div>
      {id && <TextareaField label="What changed (kept in the version history)" rows={2} value={f.changeNote} onChange={(e) => setF({ ...f, changeNote: e.target.value })} />}
      <div className="flex justify-end gap-2"><button className="btn-outline" onClick={onCancel}>Cancel</button><button className="btn-primary" disabled={busy || !f.name.trim() || undefinedVars.length > 0} onClick={save}>{id ? "Save as new version" : "Create template"}</button></div>
    </div>
  );
}

function Manage() {
  const call = useApiCall();
  const toast = useToast();
  const { data, loading, reload } = useApiQuery("/templates");
  const [edit, setEdit] = useState(undefined); // undefined = list, null = new, id = edit
  const setStatus = async (t, status) => {
    try {
      await call(`/templates/${t.id}/status`, { method: "PUT", body: { status } });
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  if (edit !== undefined) return <Editor id={edit} onCancel={() => setEdit(undefined)} onSaved={() => { setEdit(undefined); reload(); }} />;
  if (loading && !data) return <Spinner />;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3"><p className="text-sm text-ink-600">Adding a document type needs no developer: write the text with {"{{variables}}"}, define the variables, activate. An edit makes a new version; documents already generated keep the version they were made from.</p><button className="btn-primary btn-sm ml-auto shrink-0" onClick={() => setEdit(null)}><LuPlus className="h-4 w-4" /> New template</button></div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Template</th><th className={th}>Who can use it</th><th className={th}>Version</th><th className={th}>Generated</th><th className={th}>Status</th><th className={th} /></tr></thead>
          <tbody className="divide-y divide-line">
            {(data || []).map((t) => (
              <tr key={t.id} className={t.status === "retired" ? "opacity-60" : ""}>
                <td className={th}><p className="font-semibold text-ink-900">{t.name}</p><p className="text-xs text-ink-500">{titleCase(t.category)} · {t.variables} variables</p></td>
                <td className={`${th} text-xs`}>{{ staff: "A R staff only", professional: "Staff, brokers and builders", all: "Everyone on the deal" }[t.audience]}</td>
                <td className={th}>v{t.currentVersion}</td><td className={th}>{t.generated}</td>
                <td className={th}><StatusBadge value={titleCase(t.status)} /></td>
                <td className={`${th} whitespace-nowrap text-right text-xs font-semibold`}>
                  <button className="mr-3 text-red-600 hover:underline" onClick={() => setEdit(t.id)}>Edit</button>
                  {t.status !== "active" && <button className="mr-3 text-ink-700 hover:underline" onClick={() => setStatus(t, "active")}>Activate</button>}
                  {t.status === "active" && <button className="text-ink-500 hover:underline" onClick={() => setStatus(t, "retired")}>Retire</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const { role } = useAuth();
  const staff = STAFF.includes(role);
  const admin = ADMIN.includes(role);
  const [params] = useSearchParams();
  const initialDeal = params.get("deal") || "";
  const [tab, setTab] = useState("library");
  const [nonce, setNonce] = useState(0);
  const tabs = [["library", "Generate"], ["documents", "Documents"], ...(admin ? [["manage", "Manage templates"]] : [])];
  return (
    <div className="space-y-5">
      <PageHeader title="Document Templates" />
      <div className="flex gap-1 rounded-lg bg-surface-muted p-1 sm:w-fit">
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-xs font-semibold ${tab === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>)}
      </div>
      {tab === "library" && <Library staff={staff} initialDeal={initialDeal} onGenerated={() => setNonce((n) => n + 1)} />}
      {tab === "documents" && <Documents staff={staff} nonce={nonce} initialDeal={initialDeal} />}
      {tab === "manage" && admin && <Manage />}
      <p className="text-xs text-ink-500">Every document is a working draft for the client's chosen advocate to review, stamp and register before execution. A R Buildwel facilitates and does not act as legal counsel.</p>
    </div>
  );
}
