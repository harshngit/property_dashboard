import { useState } from "react";
import { LuPlus, LuX } from "react-icons/lu";
import { TextField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall } from "../../hooks/useApi";

// Create / edit an institutional listing: identity (confidential), campus,
// people, regulatory approvals, land and deal, and the self-reported
// financials the valuation is built from. Latitude and longitude are
// mandatory. Fields adapt to the asset class (students for education, beds
// or rooms otherwise).

const blank = {
  institutionName: "", assetClass: "k12_school", subType: "", boardAffiliation: "", yearEstablished: "", city: "", locality: "", address: "", latitude: "", longitude: "",
  campusAreaAcres: "", campusAreaSqft: "", builtUpAreaSqft: "", buildingCount: "", infrastructure: "", studentEnrollment: "", facultyCount: "", capacityUnits: "",
  nocStatus: "not_applicable", landOwnership: "owned", dealType: "full_sale", askingPriceCr: "", annualRevenueCr: "", ebitdaCr: "", approvals: [], enrollmentHistory: [], isConfidential: true,
};

export default function InstitutionalListingForm({ listing, meta, onCancel, onSaved }) {
  const call = useApiCall();
  const toast = useToast();
  const [f, setF] = useState(() => (listing ? { ...blank, ...Object.fromEntries(Object.entries(listing).filter(([k, v]) => k in blank && v !== null && v !== undefined)) } : blank));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const cls = meta?.assetClasses.find((a) => a.value === f.assetClass);
  const education = cls?.sector === "education";

  const setRow = (key, i, patch) => setF((x) => ({ ...x, [key]: x[key].map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const addRow = (key, row) => setF((x) => ({ ...x, [key]: [...x[key], row] }));
  const delRow = (key, i) => setF((x) => ({ ...x, [key]: x[key].filter((_, j) => j !== i) }));

  const save = async () => {
    const numeric = ["yearEstablished", "latitude", "longitude", "campusAreaAcres", "campusAreaSqft", "builtUpAreaSqft", "buildingCount", "studentEnrollment", "facultyCount", "capacityUnits", "askingPriceCr", "annualRevenueCr", "ebitdaCr"];
    const body = { ...f };
    for (const k of numeric) body[k] = body[k] === "" || body[k] === null ? undefined : Number(body[k]);
    for (const k of ["subType", "boardAffiliation", "locality", "address", "infrastructure"]) if (!body[k]) body[k] = listing ? null : undefined;
    body.approvals = f.approvals.filter((a) => a.name.trim());
    body.enrollmentHistory = f.enrollmentHistory.filter((e) => e.year && e.count !== "").map((e) => ({ year: Number(e.year), count: Number(e.count) }));
    // Acres is the field people fill; let the server derive sq ft from it.
    if (body.campusAreaAcres) delete body.campusAreaSqft;
    setBusy(true);
    try {
      await call(listing ? `/institutional/listings/${listing.id}` : "/institutional/listings", { method: listing ? "PUT" : "POST", body });
      toast.push(listing ? "Listing updated - valuation refreshed." : "Institutional listing saved.", "success");
      onSaved();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const H = ({ children }) => <h4 className="mt-2 text-xs font-bold uppercase tracking-wide text-ink-500">{children}</h4>;

  return (
    <div className="space-y-3">
      <H>Institution (confidential)</H>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2"><TextField label="Institution name" value={f.institutionName} onChange={set("institutionName")} /></div>
        <label className="block"><span className="field-label">Type</span><select id="il-class" className="field-select" value={f.assetClass} onChange={set("assetClass")}>{(meta?.assetClasses || []).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select></label>
        <TextField label={education ? "Board / affiliation" : "Category / brand"} placeholder={education ? "CBSE, ICSE, IB, UGC, AICTE…" : ""} value={f.boardAffiliation} onChange={set("boardAffiliation")} />
        <TextField label="Stream / speciality" placeholder={education ? "Engineering, Management…" : "Multi-specialty, 5-star…"} value={f.subType} onChange={set("subType")} />
        <TextField label="Year established" type="number" value={f.yearEstablished} onChange={set("yearEstablished")} />
      </div>

      <H>Location (only the locality is public)</H>
      <div className="grid gap-3 sm:grid-cols-4">
        <TextField label="City" value={f.city} onChange={set("city")} />
        <TextField label="Locality" value={f.locality} onChange={set("locality")} />
        <TextField label="Latitude" type="number" value={f.latitude} onChange={set("latitude")} />
        <TextField label="Longitude" type="number" value={f.longitude} onChange={set("longitude")} />
        <div className="sm:col-span-4"><TextField label="Address" value={f.address} onChange={set("address")} /></div>
      </div>

      <H>Campus and people</H>
      <div className="grid gap-3 sm:grid-cols-4">
        <TextField label="Campus (acres)" type="number" value={f.campusAreaAcres} onChange={set("campusAreaAcres")} />
        <TextField label="Built-up area (sq ft)" type="number" value={f.builtUpAreaSqft} onChange={set("builtUpAreaSqft")} />
        <TextField label="Buildings" type="number" value={f.buildingCount} onChange={set("buildingCount")} />
        {education ? <TextField label="Students enrolled" type="number" value={f.studentEnrollment} onChange={set("studentEnrollment")} /> : <TextField label={`Capacity (${cls?.capacityLabel || "units"})`} type="number" value={f.capacityUnits} onChange={set("capacityUnits")} />}
        <TextField label={education ? "Faculty" : "Staff"} type="number" value={f.facultyCount} onChange={set("facultyCount")} />
        <div className="sm:col-span-3"><TextField label="Infrastructure" placeholder="Labs, hostel, transport, operating theatres, banquet halls…" value={f.infrastructure} onChange={set("infrastructure")} /></div>
      </div>
      {education && (
        <div>
          <p className="field-label">Enrollment by year (for the trend)</p>
          <div className="flex flex-wrap items-center gap-2">
            {f.enrollmentHistory.map((e, i) => (
              <span key={i} className="flex items-center gap-1 rounded-lg border border-line p-1">
                <input aria-label="Year" className="field-input h-8 w-20" type="number" placeholder="Year" value={e.year} onChange={(ev) => setRow("enrollmentHistory", i, { year: ev.target.value })} />
                <input aria-label="Students" className="field-input h-8 w-24" type="number" placeholder="Students" value={e.count} onChange={(ev) => setRow("enrollmentHistory", i, { count: ev.target.value })} />
                <button type="button" title="Remove" className="px-1 text-ink-400 hover:text-red-600" onClick={() => delRow("enrollmentHistory", i)}><LuX className="h-4 w-4" /></button>
              </span>
            ))}
            <button type="button" className="btn-outline btn-sm" onClick={() => addRow("enrollmentHistory", { year: new Date().getFullYear() - f.enrollmentHistory.length, count: "" })}><LuPlus className="h-4 w-4" /> Year</button>
          </div>
        </div>
      )}

      <H>Regulatory</H>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block"><span className="field-label">NOC status</span><select id="il-noc" className="field-select" value={f.nocStatus} onChange={set("nocStatus")}><option value="valid">Valid</option><option value="pending">Pending</option><option value="expired">Expired</option><option value="not_applicable">Not applicable</option></select></label>
        <label className="block"><span className="field-label">Land ownership</span><select id="il-land" className="field-select" value={f.landOwnership} onChange={set("landOwnership")}><option value="owned">Owned</option><option value="leased">Leased</option><option value="trust_held">Trust-held</option><option value="mixed">Mixed</option></select></label>
      </div>
      <div>
        <p className="field-label">Approvals{cls?.expectedApprovals?.length ? ` (expected: ${cls.expectedApprovals.join("; ")})` : ""}</p>
        <div className="space-y-2">
          {f.approvals.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <input aria-label="Approval" className="field-input h-9 flex-1" placeholder="e.g. CBSE affiliation" value={a.name} onChange={(e) => setRow("approvals", i, { name: e.target.value })} />
              <select aria-label="Status" className="field-select h-9 w-36" value={a.status} onChange={(e) => setRow("approvals", i, { status: e.target.value })}><option value="valid">Valid</option><option value="pending">Pending</option><option value="expired">Expired</option><option value="not_applicable">N/A</option></select>
              <button type="button" title="Remove" className="text-ink-400 hover:text-red-600" onClick={() => delRow("approvals", i)}><LuX className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" className="btn-outline btn-sm" onClick={() => addRow("approvals", { name: "", status: "valid" })}><LuPlus className="h-4 w-4" /> Approval</button>
        </div>
      </div>

      <H>Deal and financials (self-reported, ₹ crore)</H>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="block"><span className="field-label">Transaction</span><select id="il-deal" className="field-select" value={f.dealType} onChange={set("dealType")}>{(meta?.dealTypes || []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
        <TextField label="Asking price" type="number" value={f.askingPriceCr} onChange={set("askingPriceCr")} />
        <TextField label="Annual revenue" type="number" value={f.annualRevenueCr} onChange={set("annualRevenueCr")} />
        <TextField label="EBITDA" type="number" value={f.ebitdaCr} onChange={set("ebitdaCr")} />
      </div>
      <p className="text-xs text-ink-500">Revenue and EBITDA multiples are worked out from these. All figures are indicative and self-reported.</p>

      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={busy || !f.institutionName.trim() || !f.city.trim() || f.latitude === "" || f.longitude === "" || !(Number(f.askingPriceCr) > 0)} onClick={save}>{busy ? "Saving…" : "Save listing"}</button>
      </div>
    </div>
  );
}
