import { useState } from "react";
import { Link } from "react-router-dom";
import { LuCircleCheck, LuCircle, LuClock3 } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";

// Module 34 - Get started (brokers, agencies, builders). The details asked at
// onboarding, a checklist that ticks itself from what you have actually done,
// the next best step, and a named A R Buildwel contact to ask for help.

const PROPERTY_TYPES = ["Apartment", "Villa", "Independent house", "Plot", "Commercial", "PG / Co-living"];
const DEAL_TYPES = ["Sale", "Rent", "Lease"];
const csv = (v) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean);

export default function GetStartedPage() {
  const toast = useToast();
  const call = useApiCall();
  const { data: o, loading, error, reload } = useApiQuery("/onboarding/me");
  const [form, setForm] = useState(null);
  const [help, setHelp] = useState(null);
  const [busy, setBusy] = useState(false);
  if (loading && !o) return <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
  if (error || !o) return <div className="card p-6 text-sm text-red-600">{error || "Could not load your onboarding."}</div>;
  const builder = o.role === "builder";
  const d = o.details;
  const f = form || { firmName: d.firmName || "", reraNumber: d.reraNumber || "", cities: (d.cities || []).join(", "), areas: (d.areas || []).join(", "), propertyTypes: d.preferences?.propertyTypes || [], dealTypes: d.preferences?.dealTypes || [], experienceYears: d.preferences?.experienceYears ?? "", teamSize: d.preferences?.teamSize ?? "" };
  const set = (k) => (e) => setForm({ ...f, [k]: e.target.value });
  const toggle = (k, v) => setForm({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });
  const run = async (fn, msg, after) => {
    setBusy(true);
    try {
      await fn();
      toast.push(msg, "success");
      reload();
      after?.();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const save = () => run(() => call("/onboarding/me", { method: "PUT", body: { firmName: f.firmName, reraNumber: f.reraNumber || null, cities: csv(f.cities), areas: csv(f.areas), preferences: { propertyTypes: f.propertyTypes, dealTypes: f.dealTypes, experienceYears: f.experienceYears === "" ? null : Number(f.experienceYears), teamSize: f.teamSize === "" ? null : Number(f.teamSize) } } }), "Details saved.", () => setForm(null));
  const icon = (s) => (s.state === "done" ? <LuCircleCheck className="h-5 w-5 text-emerald-600" /> : s.state === "in_review" ? <LuClock3 className="h-5 w-5 text-amber-600" /> : <LuCircle className="h-5 w-5 text-ink-300" />);
  const detailsOpen = !!form || o.steps[0].state !== "done";
  return (
    <div>
      <PageHeader eyebrow="Onboarding" title="Get started" subtitle={o.complete ? "You are set up. The recommended steps below help you get more from the platform." : "A few steps to get you fully set up. The list ticks itself as you go."} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-lg font-extrabold text-ink-950">{o.progressPercent}% complete</p>
              <p className="text-xs text-ink-500">{o.requiredDone} of {o.requiredTotal} required steps</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${o.progressPercent}%` }} /></div>
            {o.nextAction && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-muted p-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-500">{o.nextAction.waiting ? "With our team" : "Your next step"}</p>
                  <p className="font-semibold text-ink-900">{o.nextAction.label}</p>
                  <p className="text-sm text-ink-600">{o.nextAction.waiting ? "Submitted and being checked - nothing more to do for now." : o.nextAction.hint}</p>
                </div>
                {!o.nextAction.waiting && o.nextAction.key !== "details" && <Link className="btn-primary shrink-0" to={o.nextAction.to}>Do this now</Link>}
              </div>
            )}
          </div>

          <div className="card p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-500">Your checklist</p>
            <div className="space-y-3">
              {o.steps.map((s) => (
                <div key={s.key} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">{icon(s)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{s.label} {!s.required && <span className="ml-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-600">Recommended</span>}{s.state === "in_review" && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Being checked</span>}</p>
                    <p className="text-xs text-ink-500">{s.hint}</p>
                  </div>
                  {s.state === "todo" && s.key !== "details" && <Link className="btn-outline btn-sm shrink-0" to={s.to}>Open</Link>}
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500">{builder ? "Your company" : "Your firm and where you work"}</p>
              {!detailsOpen && <button className="btn-outline btn-sm" onClick={() => setForm(f)}>Edit</button>}
            </div>
            {!detailsOpen ? (
              <div className="text-sm">
                <p className="font-semibold text-ink-900" data-no-translate>{d.firmName}</p>
                <p className="text-ink-600">{builder ? "Cities" : "Areas"}: <span data-no-translate>{(builder ? d.cities : d.areas).join(", ") || "—"}</span></p>
                {!builder && d.cities?.length > 0 && <p className="text-ink-600">Cities: <span data-no-translate>{d.cities.join(", ")}</span></p>}
                {d.reraNumber && <p className="text-ink-600">RERA: <span data-no-translate>{d.reraNumber}</span></p>}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label={builder ? "Company name" : "Firm name"} value={f.firmName} onChange={set("firmName")} />
                  <TextField label={builder ? "RERA number" : "RERA number (optional)"} value={f.reraNumber} onChange={set("reraNumber")} />
                  <TextField label={builder ? "Cities you build in (comma separated)" : "Cities (comma separated)"} value={f.cities} onChange={set("cities")} />
                  {!builder && <TextField label="Areas you work in (comma separated, at least one)" placeholder="Rajouri Garden, Punjabi Bagh" value={f.areas} onChange={set("areas")} />}
                  <TextField label="Years of experience" type="number" min="0" value={f.experienceYears} onChange={set("experienceYears")} />
                  <TextField label="Team size" type="number" min="0" value={f.teamSize} onChange={set("teamSize")} />
                </div>
                <div>
                  <label className="field-label">Property types you handle</label>
                  <div className="flex flex-wrap gap-2">{PROPERTY_TYPES.map((t) => <button key={t} type="button" onClick={() => toggle("propertyTypes", t)} className={`rounded-full px-3 py-1 text-xs font-semibold ${f.propertyTypes.includes(t) ? "bg-ink-900 text-white" : "bg-surface-muted text-ink-700"}`}>{t}</button>)}</div>
                </div>
                {!builder && (
                  <div>
                    <label className="field-label">Deal types</label>
                    <div className="flex flex-wrap gap-2">{DEAL_TYPES.map((t) => <button key={t} type="button" onClick={() => toggle("dealTypes", t)} className={`rounded-full px-3 py-1 text-xs font-semibold ${f.dealTypes.includes(t) ? "bg-ink-900 text-white" : "bg-surface-muted text-ink-700"}`}>{t}</button>)}</div>
                  </div>
                )}
                {!builder && <p className="text-xs text-ink-500">Inquiries and buyer requirements are matched to the areas you choose, so pick the ones you really cover.</p>}
                <div className="flex justify-end gap-2">
                  {form && o.steps[0].state === "done" && <button className="btn-outline" onClick={() => setForm(null)}>Cancel</button>}
                  <button className="btn-primary" disabled={busy || f.firmName.trim().length < 2 || (builder ? !csv(f.cities).length : !csv(f.areas).length)} onClick={save}>Save details</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5 text-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Need a hand?</p>
            {o.assistant ? (
              <p className="mt-2">Your A R Buildwel contact is <span className="font-semibold" data-no-translate>{o.assistant.name}</span>{o.assistant.platformNumber ? <> · <span data-no-translate>{o.assistant.platformNumber}</span></> : null}.</p>
            ) : (
              <p className="mt-2 text-ink-600">Our onboarding team is here to help you get set up.</p>
            )}
            {o.helpRequestedAt && !o.complete && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">We have your request and will get back to you.</p>}
            <button className="btn-outline mt-3 w-full" onClick={() => setHelp("")}>Ask for help</button>
          </div>
          {o.accountStatus === "pending_approval" && <div className="card p-5 text-sm text-ink-700"><p className="text-xs font-bold uppercase tracking-wide text-ink-500">Account approval</p><p className="mt-2">Your account is waiting for approval. You can complete these steps meanwhile.</p></div>}
        </div>
      </div>

      <Modal open={help !== null} onClose={() => setHelp(null)} title="Ask for help" description="Tell us where you are stuck. Please don't include phone numbers or emails - we already have yours.">
        <TextareaField label="What do you need help with?" rows={4} value={help || ""} onChange={(e) => setHelp(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setHelp(null)}>Cancel</button>
          <button className="btn-primary" disabled={busy || (help || "").trim().length < 5} onClick={() => run(() => call("/onboarding/me/help", { method: "POST", body: { message: help.trim() } }), "Request sent - we will get back to you.", () => setHelp(null))}>Send</button>
        </div>
      </Modal>
    </div>
  );
}
