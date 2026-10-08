import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LuPlus, LuPencil, LuTrash2, LuLock, LuCircleAlert } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";
import InstitutionalDealPanel from "./InstitutionalDealPanel";
import InstitutionalListingForm from "./InstitutionalListingForm";
import InstitutionalListingDetail from "./InstitutionalListingDetail";

// Engine 7 - Institutional desk.
//   Pipeline    the nine stages (Intent Received ... Closure) with each
//               deal's buyer, NDA status and time in stage
//   Listings    institutional assets - confidential details, valuation
//               intelligence and due diligence
//   Buyers      qualification queue (buyer type, budget, financial capacity)
//   Comparables transactions used to benchmark asking prices
// Certified institutional brokers see their own listings and can add one.

const STAFF = ["internal_sales", "admin", "super_admin"];
export const cr = (v) => (v === null || v === undefined ? "—" : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`);

function Stat({ label, value, tone = "text-ink-950" }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 font-display text-2xl font-extrabold ${tone}`}>{value}</p>
    </div>
  );
}

function Pipeline({ onOpen }) {
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const { data, loading } = useApiQuery(`/institutional/manage/deals${buildQuery({ stage, status, search })}`);
  const rows = data?.items || [];
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(data?.stages || []).map((s) => (
          <button key={s.value} onClick={() => setStage(stage === s.value ? "" : s.value)} className={`min-w-[132px] shrink-0 rounded-xl border p-3 text-left transition ${stage === s.value ? "border-red-400 bg-red-50" : "border-line bg-white hover:border-red-200"}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Stage {s.number}</p>
            <p className="text-sm font-bold text-ink-900">{s.label}</p>
            <p className="mt-1 font-display text-xl font-extrabold text-ink-950">{s.count}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input id="inst-deal-search" className="field-input h-9 w-64" placeholder="Search deal, institution, buyer" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select id="inst-deal-status" className="field-select h-9 w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Active</option><option value="on_hold">On hold</option><option value="closed_won">Closed</option><option value="dropped">Dropped</option><option value="all">All</option>
        </select>
        {stage && <button className="text-xs font-semibold text-red-600" onClick={() => setStage("")}>Clear stage filter</button>}
      </div>
      {loading && !data ? (
        <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>
      ) : rows.length === 0 ? (
        <EmptyState title="No institutional deals here" subtitle="A deal opens when a buyer expresses interest in an institutional listing, or when you open one for a buyer." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
              <tr><th className="px-4 py-3">Deal</th><th className="px-4 py-3">Institution</th><th className="px-4 py-3">Buyer</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">NDA / data room</th><th className="px-4 py-3">Representative</th><th className="px-4 py-3">In stage</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((d) => (
                <tr key={d.id} className="cursor-pointer hover:bg-surface-muted/60" onClick={() => onOpen(d.id)}>
                  <td className="px-4 py-3"><p className="font-semibold text-ink-900">{d.dealNumber}</p><p className="text-xs text-ink-500">{titleCase(d.source)}</p></td>
                  <td className="px-4 py-3"><p className="font-semibold text-ink-900">{d.institutionName}</p><p className="text-xs text-ink-500">{d.assetClassLabel} · {[d.locality, d.city].filter(Boolean).join(", ")} · {cr(d.askingPriceCr)}</p></td>
                  <td className="px-4 py-3"><p>{d.buyerName || "—"}</p><p className={`text-xs ${d.buyerStatus === "qualified" ? "text-emerald-700" : "text-amber-700"}`}>{titleCase(d.buyerStatus.replace(/_/g, " "))}</p></td>
                  <td className="px-4 py-3"><span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">{d.stageNumber}/9</span> <span className="font-semibold">{d.stageLabel}</span>{d.status !== "active" && <p className="text-xs text-ink-500">{titleCase(d.status.replace(/_/g, " "))}</p>}</td>
                  <td className="px-4 py-3 text-xs"><span className={`inline-flex items-center gap-1 font-semibold ${d.ndaSigned ? "text-emerald-700" : "text-ink-500"}`}><LuLock className="h-3.5 w-3.5" /> {d.ndaSigned ? "NDA signed" : "No NDA"}</span><p className="text-ink-500">{titleCase(d.accessStatus.replace(/_/g, " "))}</p></td>
                  <td className="px-4 py-3 text-xs">{d.repName || <span className="text-amber-700">Unassigned</span>}</td>
                  <td className={`px-4 py-3 text-xs ${d.slaOverdue ? "font-semibold text-red-600" : "text-ink-600"}`}>{d.slaOverdue && <LuCircleAlert className="mr-1 inline h-3.5 w-3.5" />}{d.daysInStage} day(s)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Listings({ staff, meta }) {
  const path = staff ? "/institutional/manage/listings" : "/institutional/my/listings";
  const [search, setSearch] = useState("");
  const { data, loading, reload } = useApiQuery(`${path}${staff ? buildQuery({ search }) : ""}`);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const rows = data || [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {staff && <input id="inst-listing-search" className="field-input h-9 w-64" placeholder="Search institution or city" value={search} onChange={(e) => setSearch(e.target.value)} />}
        <button className="btn-primary btn-sm ml-auto" onClick={() => setEditing({})}><LuPlus className="h-4 w-4" /> New institutional listing</button>
      </div>
      {loading && !data ? (
        <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>
      ) : rows.length === 0 ? (
        <EmptyState title="No institutional listings" subtitle="Add a school, college, hospital, hotel or campus. The name stays confidential - the public sees only type, locality and ranges." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
              <tr><th className="px-4 py-3">Institution</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Deal</th><th className="px-4 py-3">Asking</th><th className="px-4 py-3">Indicative range</th><th className="px-4 py-3">Interest</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3"><button className="text-left font-semibold text-red-600 hover:underline" onClick={() => setViewing(l.id)}>{l.institutionName}</button><p className="text-xs text-ink-500">{[l.locality, l.city].filter(Boolean).join(", ")} · public: “{l.title}”</p></td>
                  <td className="px-4 py-3">{l.assetClassLabel}<p className="text-xs text-ink-500">{l.boardAffiliation || l.subType || ""}</p></td>
                  <td className="px-4 py-3">{l.dealTypeLabel}</td>
                  <td className="px-4 py-3 font-semibold">{cr(l.askingPriceCr)}</td>
                  <td className="px-4 py-3 text-xs">{l.valuationRange ? `${cr(l.valuationRange.lowCr)} – ${cr(l.valuationRange.highCr)}` : "—"}</td>
                  <td className="px-4 py-3 text-xs">{(l.deals || l.interest)?.active ?? 0} active · {(l.deals || l.interest)?.total ?? 0} total</td>
                  <td className="px-4 py-3"><StatusBadge value={titleCase(String(l.status).replace(/_/g, " "))} /></td>
                  <td className="px-4 py-3 text-right"><button title="Edit" className="text-ink-500 hover:text-ink-900" onClick={() => setEditing(l)}><LuPencil className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit institutional listing" : "New institutional listing"} description="The institution's name is confidential: it is never shown publicly and is released only after buyer qualification, NDA and admin approval." maxWidth="max-w-4xl">
        {editing && <InstitutionalListingForm listing={editing.id ? editing : null} meta={meta} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      </Modal>
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Institutional listing" maxWidth="max-w-4xl">
        {viewing && <InstitutionalListingDetail id={viewing} staff={staff} />}
      </Modal>
    </div>
  );
}

function Buyers() {
  const call = useApiCall();
  const toast = useToast();
  const [status, setStatus] = useState("pending");
  const { data, loading, reload } = useApiQuery(`/institutional/manage/buyers${buildQuery({ status })}`);
  const [deciding, setDeciding] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const rows = data || [];
  const decide = async (decision) => {
    setBusy(true);
    try {
      await call(`/institutional/manage/buyers/${deciding.userId}`, { method: "PUT", body: { decision, note: note || undefined } });
      toast.push(decision === "qualified" ? "Buyer qualified - they can now sign NDAs." : "Buyer profile rejected.", "success");
      setDeciding(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const openDoc = async (b) => {
    try {
      const res = await call(`/institutional/manage/buyers/${b.userId}/capacity-document`);
      window.open(res.data.url, "_blank", "noopener");
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  return (
    <div className="space-y-3">
      <select id="inst-buyer-status" className="field-select h-9 w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="pending">To qualify</option><option value="qualified">Qualified</option><option value="rejected">Rejected</option><option value="">All</option>
      </select>
      {loading && !data ? (
        <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>
      ) : rows.length === 0 ? (
        <EmptyState title="No buyers here" subtitle="Institutional buyers submit a profile (type, budget, financial capacity) from the website. Qualifying a buyer lets them sign the NDA." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
              <tr><th className="px-4 py-3">Buyer</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Budget</th><th className="px-4 py-3">Looking for</th><th className="px-4 py-3">Financial capacity</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((b) => (
                <tr key={b.userId}>
                  <td className="px-4 py-3"><p className="font-semibold text-ink-900">{b.fullName}</p><p className="text-xs text-ink-500">{b.organisationName || "—"} · {b.mobile || b.email || ""}</p></td>
                  <td className="px-4 py-3">{b.buyerTypeLabel}</td>
                  <td className="px-4 py-3 text-xs">{b.budgetMinCr || b.budgetMaxCr ? `${cr(b.budgetMinCr)} – ${cr(b.budgetMaxCr)}` : "—"}</td>
                  <td className="max-w-[220px] px-4 py-3 text-xs text-ink-600">{[...(b.assetClasses || []).map((a) => titleCase(a.replace(/_/g, " "))), ...(b.geographies || [])].join(", ") || "—"}{b.intent ? <p className="mt-1">{b.intent}</p> : null}</td>
                  <td className="max-w-[220px] px-4 py-3 text-xs text-ink-600">{b.capacityNote || "—"}{b.hasCapacityDocument && <button className="mt-1 block font-semibold text-red-600 hover:underline" onClick={() => openDoc(b)}>View proof of funds</button>}</td>
                  <td className="px-4 py-3"><StatusBadge value={titleCase(b.status)} />{b.decisionNote && <p className="mt-1 max-w-[160px] text-[11px] text-ink-500">{b.decisionNote}</p>}</td>
                  <td className="px-4 py-3 text-right">{b.status !== "qualified" || status === "" ? <button className="btn-outline btn-sm" onClick={() => { setNote(""); setDeciding(b); }}>Review</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!deciding} onClose={() => setDeciding(null)} title="Qualify buyer" description={deciding ? `${deciding.fullName} · ${deciding.buyerTypeLabel}` : ""}>
        <div className="space-y-4">
          <p className="text-sm text-ink-600">Qualify once the buyer's identity and financial capacity are checked. A reason is required to reject.</p>
          <TextareaField label="Note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setDeciding(null)}>Cancel</button>
            <button className="btn-outline" disabled={busy || !note.trim()} onClick={() => decide("rejected")}>Reject</button>
            <button className="btn-primary" disabled={busy} onClick={() => decide("qualified")}>Qualify</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Comparables({ meta }) {
  const call = useApiCall();
  const toast = useToast();
  const { data, reload } = useApiQuery("/institutional/manage/comparables");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const rows = data || [];
  const label = (v) => meta?.assetClasses.find((a) => a.value === v)?.label || v;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    try {
      await call("/institutional/manage/comparables", { method: "POST", body: Object.fromEntries(Object.entries(form).filter(([, v]) => v !== "")) });
      toast.push("Comparable added - listings of this type were re-benchmarked.", "success");
      setForm(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (c) => {
    try {
      await call(`/institutional/manage/comparables/${c.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="text-xs text-ink-500">Closed transactions used to benchmark asking prices (EV / EBITDA, value per student / bed / room, value per acre). Platform deals are added automatically on closure.</p>
        <button className="btn-primary btn-sm ml-auto shrink-0" onClick={() => setForm({ assetClass: "k12_school", city: "", state: "", dealType: "full_sale", dealYear: new Date().getFullYear(), dealValueCr: "", revenueCr: "", ebitdaCr: "", enrollment: "", capacityUnits: "", areaAcres: "", source: "" })}><LuPlus className="h-4 w-4" /> Add comparable</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className="px-4 py-3">Asset class</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Year</th><th className="px-4 py-3">Deal value</th><th className="px-4 py-3">EBITDA</th><th className="px-4 py-3">Students / units</th><th className="px-4 py-3">Acres</th><th className="px-4 py-3">Source</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2.5 font-semibold text-ink-900">{label(c.asset_class)}</td><td className="px-4 py-2.5">{c.city || "—"}</td><td className="px-4 py-2.5">{c.deal_year || "—"}</td>
                <td className="px-4 py-2.5 font-semibold">{cr(c.deal_value_cr)}</td><td className="px-4 py-2.5">{cr(c.ebitda_cr)}</td><td className="px-4 py-2.5">{c.enrollment || c.capacity_units || "—"}</td><td className="px-4 py-2.5">{c.area_acres || "—"}</td>
                <td className="px-4 py-2.5 text-xs text-ink-600">{c.source || "—"}</td>
                <td className="px-4 py-2.5 text-right">{!c.deal_id && <button title="Remove" className="text-red-500 hover:text-red-700" onClick={() => remove(c)}><LuTrash2 className="h-4 w-4" /></button>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-ink-500">No comparables yet - benchmarking starts once you add some.</td></tr>}
          </tbody>
        </table>
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title="Add comparable transaction">
        {form && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="field-label">Asset class</span><select id="cmp-class" className="field-select" value={form.assetClass} onChange={set("assetClass")}>{(meta?.assetClasses || []).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select></label>
              <TextField label="City" value={form.city} onChange={set("city")} />
              <TextField label="Deal value (₹ Cr)" type="number" value={form.dealValueCr} onChange={set("dealValueCr")} />
              <TextField label="Year" type="number" value={form.dealYear} onChange={set("dealYear")} />
              <TextField label="EBITDA (₹ Cr)" type="number" value={form.ebitdaCr} onChange={set("ebitdaCr")} />
              <TextField label="Revenue (₹ Cr)" type="number" value={form.revenueCr} onChange={set("revenueCr")} />
              <TextField label="Students" type="number" value={form.enrollment} onChange={set("enrollment")} />
              <TextField label="Beds / rooms / units" type="number" value={form.capacityUnits} onChange={set("capacityUnits")} />
              <TextField label="Campus (acres)" type="number" value={form.areaAcres} onChange={set("areaAcres")} />
              <TextField label="Source" placeholder="e.g. press report, registry" value={form.source} onChange={set("source")} />
            </div>
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" disabled={busy || !(Number(form.dealValueCr) > 0)} onClick={save}>Add</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function InstitutionalPage() {
  const { role } = useAuth();
  const staff = STAFF.includes(role);
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || (staff ? "pipeline" : "listings");
  const setTab = (k) => setParams(k === "pipeline" ? {} : { tab: k }, { replace: true });
  const meta = useApiQuery("/institutional/meta");
  const summary = useApiQuery(staff ? "/institutional/manage/summary" : null);
  const [dealId, setDealId] = useState(null);
  const s = summary.data;
  const tabs = staff ? [["pipeline", "Pipeline"], ["listings", "Listings"], ["buyers", `Buyers${s?.buyers_pending ? ` (${s.buyers_pending})` : ""}`], ["comparables", "Comparables"]] : [["listings", "My institutional listings"]];

  return (
    <div className="space-y-5">
      <PageHeader title="Institutional" />
      {staff && s && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Live listings" value={s.live_listings} />
          <Stat label="Active deals" value={s.active_deals} />
          <Stat label="Pipeline (asking)" value={cr(s.pipeline_value_cr)} />
          <Stat label="Intents to screen" value={s.intents_to_screen} tone={s.intents_to_screen ? "text-red-600" : "text-ink-950"} />
          <Stat label="Closed" value={`${s.closed_deals} · ${cr(s.closed_value_cr)}`} tone="text-emerald-700" />
        </div>
      )}
      <div className="flex gap-1 rounded-lg bg-surface-muted p-1 sm:w-fit">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-xs font-semibold ${tab === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>
        ))}
      </div>
      {tab === "pipeline" && staff && <Pipeline key={dealId ? "open" : "closed"} onOpen={setDealId} />}
      {tab === "listings" && <Listings staff={staff} meta={meta.data} />}
      {tab === "buyers" && staff && <Buyers />}
      {tab === "comparables" && staff && <Comparables meta={meta.data} />}
      {meta.data && <p className="text-[11px] text-ink-400">{meta.data.disclaimer}</p>}

      <Modal open={!!dealId} onClose={() => { setDealId(null); summary.reload(); }} title="Institutional deal" maxWidth="max-w-4xl">
        {dealId && <InstitutionalDealPanel dealId={dealId} />}
      </Modal>
    </div>
  );
}
