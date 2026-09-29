import { useRef, useState } from "react";
import { LuFileText, LuCircleCheck, LuCircleX, LuTriangleAlert, LuUpload, LuPlus } from "react-icons/lu";
import Modal from "../common/Modal";
import StatusBadge from "../common/StatusBadge";
import { TextareaField } from "../common/FormField";
import { useToast } from "../common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";

// Module 20 / 21 on a listing: document checklist with missing items, AI /
// rule classification + risk flags per document, title chain (years,
// breaks), encumbrance, possession risk and NRI considerations. Owners,
// listing brokers and A R staff can add documents with role visibility;
// staff review documents, add title links and record the DD review.

const STAFF = ["internal_sales", "admin", "super_admin"];
export const DOC_TYPES = [
  "sale_deed", "title_document", "encumbrance_certificate", "tax_receipt", "id_proof", "agreement_to_sell", "allotment_letter",
  "occupancy_certificate", "completion_certificate", "approved_plan", "mutation_record", "society_noc", "bank_noc",
  "power_of_attorney", "possession_letter", "rent_agreement", "utility_bill", "rera_certificate", "payment_receipt", "other",
];
const SEVERITY = { high: "text-red-700 bg-red-50", medium: "text-amber-800 bg-amber-50", low: "text-ink-700 bg-surface-muted" };
const STATUS_TONE = { complete: "bg-emerald-50 text-emerald-700", issues: "bg-red-50 text-red-700", in_progress: "bg-amber-50 text-amber-800", not_started: "bg-surface-muted text-ink-600" };

export default function DueDiligenceCard({ propertyId }) {
  const toast = useToast();
  const call = useApiCall();
  const { role } = useAuth();
  const staff = STAFF.includes(role);
  const report = useApiQuery(`/due-diligence/properties/${propertyId}`);
  const docs = useApiQuery(`/due-diligence/properties/${propertyId}/documents`);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [upload, setUpload] = useState({ documentType: "", visibleTo: ["owner", "broker"] });
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState({ date: "", from: "", to: "", note: "" });
  const [reviewOpen, setReviewOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  if (report.error) return null; // no relationship to this listing
  const r = report.data;
  const refresh = () => {
    report.reload();
    docs.reload();
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
  const submitUpload = () => {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    const form = new FormData();
    form.append("file", f);
    if (upload.documentType) form.append("documentType", upload.documentType);
    form.append("visibleTo", upload.visibleTo.join(","));
    run(() => call(`/due-diligence/properties/${propertyId}/documents`, { method: "POST", body: form, isFormData: true }), "Document added and checked.").then((ok) => ok && setUploading(false));
  };

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Due diligence & documents</h3>
        <div className="flex flex-wrap gap-1.5">
          <button className="btn-outline btn-sm" onClick={() => setUploading(true)}><LuUpload className="h-3.5 w-3.5" /> Add document</button>
          {staff && <button className="btn-outline btn-sm" onClick={() => setLinkOpen(true)}><LuPlus className="h-3.5 w-3.5" /> Title link</button>}
          {staff && <button className="btn-outline btn-sm" onClick={() => { setNotes(r?.staffNotes || ""); setReviewOpen(true); }}>Record review</button>}
        </div>
      </div>
      {!r ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONE[r.status]}`}>{titleCase(r.status)}</span>
            <span className="text-xs text-ink-500">{r.missing.length} required document{r.missing.length === 1 ? "" : "s"} missing{r.reviewedAt ? ` · reviewed ${formatDate(r.reviewedAt)}` : ""}</span>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-ink-600">Checklist</p>
            <div className="grid gap-1 sm:grid-cols-2">
              {r.checklist.map((c) => (
                <span key={c.type} className={`flex items-center gap-1.5 text-xs ${c.present ? "text-emerald-700" : c.required ? "text-red-700" : "text-ink-500"}`}>
                  {c.present ? <LuCircleCheck className="h-3.5 w-3.5" /> : <LuCircleX className="h-3.5 w-3.5" />}
                  {c.label}{!c.required && " (optional)"}
                </span>
              ))}
            </div>
          </div>

          {r.riskFlags.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold text-ink-600">Risk flags</p>
              <ul className="space-y-1">
                {r.riskFlags.map((f, i) => (
                  <li key={i} className={`flex items-start gap-1.5 rounded-lg px-2 py-1 text-xs ${SEVERITY[f.severity] || SEVERITY.low}`}>
                    <LuTriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span><b>{titleCase(f.category)}</b>{f.detail ? ` - ${f.detail}` : ""}{f.source === "ai" ? " (AI)" : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line p-3">
              <p className="text-xs text-ink-500">Title chain</p>
              <p className="font-semibold text-ink-900">{r.titleChain.years ? `${r.titleChain.years} years` : "No dated transfers"}</p>
              {r.titleChain.gaps.length > 0 && <p className="text-xs text-red-700">{r.titleChain.gaps.length} break(s)</p>}
              <ul className="mt-1 space-y-0.5 text-[11px] text-ink-600">
                {r.titleChain.links.map((l, i) => (
                  <li key={i}>{l.date}: {l.from || "?"} → {l.to || "?"}{l.source === "manual" ? " (records)" : ""}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="text-xs text-ink-500">Encumbrance</p>
              <p className="font-semibold text-ink-900">{titleCase(r.encumbrance.status)}</p>
              <p className="text-[11px] text-ink-600">{r.encumbrance.detail}{r.encumbrance.bankNoc ? " · bank NOC on file" : ""}</p>
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="text-xs text-ink-500">Possession risk</p>
              <p className="font-semibold text-ink-900">{titleCase(r.possession.risk)}</p>
              <p className="text-[11px] text-ink-600">{r.possession.reasons.join(" · ") || "No issues found"}</p>
            </div>
          </div>

          {r.nri?.points?.length > 0 && (
            <div className="rounded-xl bg-indigo-50/60 p-3 text-xs text-ink-800">
              <p className="mb-1 font-semibold">NRI considerations {r.nri.seller ? "(NRI seller)" : ""}{r.nri.buyers ? ` (${r.nri.buyers} NRI buyer)` : ""}</p>
              <ul className="list-disc space-y-0.5 pl-4">{r.nri.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-semibold text-ink-600">Documents ({(docs.data?.documents || []).length}){docs.data?.roles ? ` · your access: ${docs.data.roles.join(", ")}` : ""}</p>
            <ul className="divide-y divide-line">
              {(docs.data?.documents || []).map((d) => (
                <li key={d.id} className="py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <a href={d.document_url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-1.5 font-semibold text-ink-900 hover:text-red-600">
                      <LuFileText className="h-4 w-4 shrink-0" /> <span className="truncate">{d.file_name || titleCase(d.document_type)}</span>
                    </a>
                    <span className="flex items-center gap-1.5">
                      <StatusBadge value={titleCase(d.status)} />
                      {staff && d.status !== "approved" && (
                        <button className="btn-outline btn-sm" onClick={() => run(() => call(`/due-diligence/documents/${d.id}/review`, { method: "PUT", body: { status: "approved" } }), "Approved.")}>Approve</button>
                      )}
                      {staff && d.status !== "rejected" && (
                        <button className="btn-outline btn-sm" onClick={() => {
                          const n = window.prompt("Reason for rejecting");
                          if (n) run(() => call(`/due-diligence/documents/${d.id}/review`, { method: "PUT", body: { status: "rejected", notes: n } }), "Rejected.");
                        }}>Reject</button>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-ink-500">
                    {titleCase(d.document_type)}
                    {d.ai_type && d.ai_type !== d.document_type ? ` · looks like ${titleCase(d.ai_type)}` : ""}
                    {d.ai_confidence ? ` (${d.ai_method === "ai" ? "AI" : "rules"} ${d.ai_confidence}%)` : ""} · visible to {(d.visible_to || []).join(", ")} · {formatDate(d.created_at)}
                  </p>
                  {d.ai_summary && <p className="text-xs text-ink-600">{d.ai_summary}</p>}
                  {(d.ai_flags || []).map((f, i) => (
                    <p key={i} className={`mt-0.5 inline-block rounded px-1.5 text-[11px] ${SEVERITY[f.severity] || SEVERITY.low}`}>{titleCase(f.category)}: {f.detail}</p>
                  ))}
                </li>
              ))}
            </ul>
          </div>
          {(r.disclaimers || []).map((d) => <p key={d.key} className="text-[11px] text-ink-400"><b>{d.title}:</b> {d.content_html}</p>)}
        </div>
      )}

      <Modal open={uploading} onClose={() => setUploading(false)} title="Add document" description="It is classified and scanned for risks automatically.">
        <div className="space-y-3">
          <input ref={fileRef} type="file" accept=".pdf,image/*" className="field-input py-1.5" />
          <label className="block text-xs font-semibold text-ink-600">
            Type (leave empty to auto-detect)
            <select className="field-input mt-1" value={upload.documentType} onChange={(e) => setUpload((u) => ({ ...u, documentType: e.target.value }))}>
              <option value="">Auto-detect</option>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
            </select>
          </label>
          <div className="text-xs font-semibold text-ink-600">
            Visible to (A R admin always)
            <div className="mt-1 flex gap-3">
              {["owner", "broker", "buyer"].map((v) => (
                <label key={v} className="flex items-center gap-1.5 font-normal text-ink-800">
                  <input type="checkbox" checked={upload.visibleTo.includes(v)} onChange={(e) => setUpload((u) => ({ ...u, visibleTo: e.target.checked ? [...u.visibleTo, v] : u.visibleTo.filter((x) => x !== v) }))} />
                  {titleCase(v)}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setUploading(false)}>Cancel</button>
            <button className="btn-primary" disabled={busy} onClick={submitUpload}>{busy ? "Uploading…" : "Upload"}</button>
          </div>
        </div>
      </Modal>

      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="Add title-chain link" description="A transfer found in land records / sub-registrar searches.">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-ink-600">Date<input type="date" className="field-input mt-1" value={link.date} onChange={(e) => setLink((l) => ({ ...l, date: e.target.value }))} /></label>
          <span />
          <label className="text-xs font-semibold text-ink-600">From<input className="field-input mt-1" value={link.from} onChange={(e) => setLink((l) => ({ ...l, from: e.target.value }))} /></label>
          <label className="text-xs font-semibold text-ink-600">To<input className="field-input mt-1" value={link.to} onChange={(e) => setLink((l) => ({ ...l, to: e.target.value }))} /></label>
        </div>
        <TextareaField className="mt-3" label="Note" rows={2} value={link.note} onChange={(e) => setLink((l) => ({ ...l, note: e.target.value }))} />
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setLinkOpen(false)}>Cancel</button>
          <button className="btn-primary" disabled={!link.date || busy} onClick={() => run(() => call(`/due-diligence/properties/${propertyId}/title-links`, { method: "POST", body: link }), "Title link added.").then((ok) => ok && (setLinkOpen(false), setLink({ date: "", from: "", to: "", note: "" })))}>Add</button>
        </div>
      </Modal>

      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="Due-diligence review">
        <TextareaField label="Review notes (internal)" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setReviewOpen(false)}>Cancel</button>
          <button className="btn-primary" disabled={busy} onClick={() => run(() => call(`/due-diligence/properties/${propertyId}/review`, { method: "PUT", body: { notes } }), "Review recorded.").then((ok) => ok && setReviewOpen(false))}>Save</button>
        </div>
      </Modal>
    </div>
  );
}
