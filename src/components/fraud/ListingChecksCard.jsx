import { useRef, useState } from "react";
import { LuShieldCheck, LuTriangleAlert, LuCopy, LuFileText, LuRefreshCw } from "react-icons/lu";
import Modal from "../common/Modal";
import StatusBadge from "../common/StatusBadge";
import { TextareaField } from "../common/FormField";
import { useToast } from "../common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";

// Sec. 9 on a listing: verification level (System / Seller / Legally /
// Site Verified), fraud band (+ score and factors for A R staff), duplicate
// findings, and the actions each party can take - request a level, resolve
// a duplicate hold, appeal, and (staff) decide verifications / re-assess.

const STAFF = ["internal_sales", "admin", "super_admin"];
const LEVELS = { 1: "Verified by System", 2: "Seller Verified", 3: "Legally Verified", 4: "Site Verified" };
const BAND = {
  green: "bg-emerald-50 text-emerald-700",
  yellow: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  critical: "bg-red-600 text-white",
};
export const CHECK_LABELS = {
  min_3_images: "At least 3 photos",
  mandatory_fields: "Mandatory fields",
  geo_in_india: "Map location in India",
  no_duplicate: "Not a duplicate",
  no_spam: "No spam / contact details",
  ownership_proof: "Ownership proof checked",
  id_verified: "Owner ID (KYC) verified",
  callback_done: "Phone callback by A R done",
  photos_recent: "Recent photos confirmed",
  title_chain_3y: "Title chain 3+ years",
  encumbrance_clear: "Encumbrance clear",
  no_litigation: "No litigation",
  tax_paid: "Property tax paid",
  regulatory_compliance: "Regulatory compliance",
  photos_match: "Photos match site",
  condition_ok: "Condition as described",
  amenities_match: "Amenities present",
  measurements_ok: "Measurements verified",
  inspection_report: "Inspection report uploaded",
};

export function VerificationDecisionModal({ open, onClose, propertyId, level, required = [], current = {}, onDone }) {
  const toast = useToast();
  const call = useApiCall();
  const fileRef = useRef(null);
  const [checks, setChecks] = useState(current || {});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (status) => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("status", status);
      form.append("checks", JSON.stringify(checks));
      if (notes) form.append("notes", notes);
      for (const f of fileRef.current?.files || []) form.append("files", f);
      await call(`/fraud/listings/${propertyId}/verifications/${level}`, { method: "PUT", body: form, isFormData: true });
      toast.push(status === "verified" ? `${LEVELS[level]} granted.` : status === "rejected" ? "Rejected." : "Saved.", "success");
      onDone?.();
      onClose();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={LEVELS[level]} description="Every check must pass to verify. A reason is required to reject.">
      <div className="space-y-2">
        {required.map((k) => (
          <label key={k} className="flex items-center gap-2 text-sm text-ink-800">
            <input type="checkbox" checked={!!checks[k]} onChange={(e) => setChecks((c) => ({ ...c, [k]: e.target.checked }))} />
            {CHECK_LABELS[k] || titleCase(k)}
          </label>
        ))}
      </div>
      <TextareaField className="mt-3" label="Notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <label className="mt-3 block text-xs font-semibold text-ink-600">
        Evidence / inspection report (optional)
        <input ref={fileRef} type="file" multiple className="field-input mt-1 py-1.5" />
      </label>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button className="btn-outline" disabled={busy} onClick={() => submit("in_progress")}>Save progress</button>
        <button className="btn-outline" disabled={busy || !notes.trim()} onClick={() => submit("rejected")}>Reject</button>
        <button className="btn-primary" disabled={busy || !required.every((k) => checks[k])} onClick={() => submit("verified")}>Verify</button>
      </div>
    </Modal>
  );
}

export default function ListingChecksCard({ propertyId, onChanged }) {
  const toast = useToast();
  const call = useApiCall();
  const { role } = useAuth();
  const staff = STAFF.includes(role);
  const { data, loading, error, reload } = useApiQuery(`/fraud/listings/${propertyId}`);
  const [requesting, setRequesting] = useState(null);
  const [deciding, setDeciding] = useState(null);
  const [appealing, setAppealing] = useState(false);
  const [text, setText] = useState("");
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    reload();
    onChanged?.();
  };
  const run = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      toast.push(msg, "success");
      refresh();
      return true;
    } catch (err) {
      toast.push(err.message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const withFiles = (fields) => {
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => v != null && form.append(k, v));
    for (const f of fileRef.current?.files || []) form.append("files", f);
    return form;
  };

  if (loading && !data) return <div className="card p-5 text-sm text-ink-500">Loading checks…</div>;
  if (error) return null;
  const d = data;
  const byLevel = Object.fromEntries((d.verifications || []).map((v) => [v.level, v]));
  const l1 = byLevel[1];

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Verification & risk</h3>
        {staff && (
          <button className="btn-outline btn-sm" disabled={busy} onClick={() => run(() => call(`/fraud/listings/${propertyId}/assess`, { method: "POST" }), "Re-assessed.")}>
            <LuRefreshCw className="h-3.5 w-3.5" /> Re-run checks
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {d.verificationLevel > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <LuShieldCheck className="h-3.5 w-3.5" /> {LEVELS[d.verificationLevel]}
          </span>
        ) : (
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink-600">Not verified yet</span>
        )}
        {d.fraud?.band && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${BAND[d.fraud.band]}`}>
            Risk {titleCase(d.fraud.band)}{staff && d.fraud.score != null ? ` · ${d.fraud.score}/100` : ""}
          </span>
        )}
        {d.underReview && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">Under review</span>}
        {d.duplicateStatus && <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700"><LuCopy className="h-3.5 w-3.5" /> Duplicate {d.duplicateStatus}</span>}
      </div>

      {staff && d.fraud?.factors?.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-ink-700">
          {d.fraud.factors.map((f) => (
            <li key={f.key} className="flex items-start gap-1.5"><LuTriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" /> <span><b>+{f.points}</b> {f.label}{f.detail ? ` - ${f.detail}` : ""}</span></li>
          ))}
        </ul>
      )}

      {l1 && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-semibold text-ink-600">System checks (L1)</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(l1.checks || {}).map(([k, ok]) => (
              <span key={k} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {ok ? "✓" : "✗"} {CHECK_LABELS[k] || k}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-1 text-xs font-semibold text-ink-600">Higher levels</p>
        <ul className="divide-y divide-line text-sm">
          {[2, 3, 4].map((lvl) => {
            const v = byLevel[lvl];
            return (
              <li key={lvl} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-semibold text-ink-900">{LEVELS[lvl]}</span>
                  {v && <span className="ml-2"><StatusBadge value={titleCase(v.status)} /></span>}
                  {v?.auto_requested && lvl === 3 && <span className="ml-2 text-xs text-ink-500">auto-requested (high value)</span>}
                  {v?.due_at && ["requested", "in_progress"].includes(v.status) && <span className="ml-2 text-xs text-ink-500">due {formatDate(v.due_at, true)}</span>}
                  {v?.notes && <span className="block text-xs text-ink-500">{v.notes}</span>}
                </span>
                <span className="flex gap-1.5">
                  {d.status === "approved" && (!v || v.status === "rejected") && (
                    <button className="btn-outline btn-sm" onClick={() => { setRequesting(lvl); setText(""); }}>Request</button>
                  )}
                  {staff && v && v.status !== "verified" && (
                    <button className="btn-outline btn-sm" onClick={() => setDeciding(v)}>Decide</button>
                  )}
                  {staff && (v?.evidence || []).map((e) => (
                    <button
                      key={e.path}
                      title={e.name}
                      className="btn-outline btn-sm"
                      onClick={async () => {
                        try {
                          const res = await call(`/fraud/evidence?path=${encodeURIComponent(e.path)}`);
                          window.open(res.data.url, "_blank", "noopener");
                        } catch (err) {
                          toast.push(err.message, "error");
                        }
                      }}
                    >
                      <LuFileText className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {(d.duplicates || []).length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-semibold text-ink-600">Duplicate findings</p>
          <ul className="space-y-1 text-xs text-ink-700">
            {d.duplicates.map((m, i) => (
              <li key={i}>
                <b>{titleCase(m.layer)}</b> · {m.decision === "block" ? "blocked" : "flagged"} · {m.detail}
                {m.original_title ? ` · original: ${m.original_title}` : ""} · {m.status}
              </li>
            ))}
          </ul>
        </div>
      )}

      {d.duplicateStatus === "blocked" && d.status === "pending_approval" && (
        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-sm">
          <p className="font-semibold text-ink-900">This property was already listed first.</p>
          <p className="text-xs text-ink-600">Choose how to proceed - the first valid listing keeps priority.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="btn-outline btn-sm" disabled={busy} onClick={() => run(() => call(`/fraud/listings/${propertyId}/duplicate-resolution`, { method: "POST", body: { action: "request_routing" } }), "Routing request sent to the original lister.")}>Request routing</button>
            <button className="btn-outline btn-sm" disabled={busy} onClick={() => run(() => call(`/fraud/listings/${propertyId}/duplicate-resolution`, { method: "POST", body: { action: "update_existing" } }), "Sent as an update to the existing listing.")}>Update existing</button>
            <button className="btn-outline btn-sm" disabled={busy} onClick={() => run(() => call(`/fraud/listings/${propertyId}/duplicate-resolution`, { method: "POST", body: { action: "cancel" } }), "Listing cancelled.")}>Cancel listing</button>
          </div>
        </div>
      )}

      {((d.status === "rejected" && d.fraud?.band === "critical") || d.duplicateStatus === "blocked") && !(d.appeals || []).some((a) => a.status === "pending") && (
        <button className="btn-outline btn-sm mt-3" onClick={() => { setAppealing(true); setText(""); }}>Appeal with evidence</button>
      )}
      {(d.appeals || []).map((a) => (
        <p key={a.id} className="mt-2 text-xs text-ink-600">Appeal {formatDate(a.created_at)}: <b>{a.status}</b>{a.decision_note ? ` - ${a.decision_note}` : ""}</p>
      ))}

      <Modal open={!!requesting} onClose={() => setRequesting(null)} title={`Request ${LEVELS[requesting]}`} description={requesting === 2 ? "Upload ownership proof (sale deed, allotment letter). A R will call the owner and confirm recent photos." : requesting === 3 ? "Upload title chain (3+ years), encumbrance certificate, tax receipts - reviewed by the legal panel." : "An A R representative visits the site and uploads an inspection report."}>
        <TextareaField label="Note (optional)" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        <label className="mt-3 block text-xs font-semibold text-ink-600">
          Documents
          <input ref={fileRef} type="file" multiple accept=".pdf,image/*" className="field-input mt-1 py-1.5" />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setRequesting(null)}>Cancel</button>
          <button
            className="btn-primary"
            disabled={busy}
            onClick={() => run(() => call(`/fraud/listings/${propertyId}/verifications`, { method: "POST", body: withFiles({ level: requesting, note: text || null }), isFormData: true }), "Verification requested.").then((ok) => ok && setRequesting(null))}
          >
            Request
          </button>
        </div>
      </Modal>

      <Modal open={appealing} onClose={() => setAppealing(false)} title="Appeal" description="Explain why the decision is wrong and attach evidence. An A R admin reviews every appeal.">
        <TextareaField label="Reason" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        <label className="mt-3 block text-xs font-semibold text-ink-600">
          Evidence
          <input ref={fileRef} type="file" multiple className="field-input mt-1 py-1.5" />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setAppealing(false)}>Cancel</button>
          <button
            className="btn-primary"
            disabled={busy || text.trim().length < 10}
            onClick={() => run(() => call(`/fraud/listings/${propertyId}/appeal`, { method: "POST", body: withFiles({ reason: text.trim() }), isFormData: true }), "Appeal submitted.").then((ok) => ok && setAppealing(false))}
          >
            Submit appeal
          </button>
        </div>
      </Modal>

      {deciding && (
        <VerificationDecisionModal
          open
          onClose={() => setDeciding(null)}
          propertyId={propertyId}
          level={deciding.level}
          required={deciding.requiredChecks}
          current={deciding.checks}
          onDone={refresh}
        />
      )}
    </div>
  );
}
