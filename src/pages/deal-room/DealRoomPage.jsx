import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { LuArrowLeft, LuUpload, LuCircleCheck, LuCircleX, LuBan, LuDownload, LuFileText, LuEye } from "react-icons/lu";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import { TextareaField } from "../../components/common/FormField";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { API_BASE_URL } from "../../config/api";
import { formatDate, titleCase } from "../../lib/format";

// Module 39 deal room for one deal (staff): upload documents and new
// versions, approve versions, set download / watermark / expiry, approve or
// reject NDA-signed access requests, and read / export the access log.

const DOC_TYPES = [
  ["auction_notice", "Auction notice"], ["sale_notice", "Sale notice"], ["emd_receipt", "EMD details"], ["title_documents", "Title documents"],
  ["valuation_report", "Valuation report"], ["legal_opinion", "Legal opinion"], ["inspection_report", "Inspection report"],
  ["term_sheet", "Term sheet"], ["financials", "Financials"], ["photos", "Photos"],
  // Institutional due diligence (Engine 7) - these tick the regulatory checklist.
  ["land_records", "Land records"], ["noc", "NOC"], ["fire_noc", "Fire NOC"], ["municipal_approval", "Municipal approval"], ["encumbrance_certificate", "Encumbrance certificate"],
  ["audited_financials", "Audited financials"], ["affiliation_certificate", "Affiliation certificate"], ["trust_deed", "Trust deed"], ["enrollment_records", "Enrollment records"],
  ["regulatory_approval", "Regulatory approval"], ["other", "Other"],
];
const ADMIN_ROLES = ["admin", "super_admin"];

export function AccessRequests({ rows, onChanged, showDeal = false }) {
  const call = useApiCall();
  const toast = useToast();
  const { role } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(role);
  const [deciding, setDeciding] = useState(null); // { row, action }
  const [reason, setReason] = useState("");

  const decide = async (row, action, why) => {
    try {
      await call(`/deal-room/manage/access/${row.id}`, { method: "PUT", body: { action, reason: why || undefined } });
      toast.push(action === "approve" ? "Access approved - the investor has been notified." : `Access ${action === "reject" ? "rejected" : "revoked"}.`, "success");
      setDeciding(null);
      onChanged();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  return (
    <>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Investor</th>
              {showDeal && <th className="px-4 py-3">Deal</th>}
              <th className="px-4 py-3">Verification</th>
              <th className="px-4 py-3">NDA</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Opens</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2.5">
                  <p className="font-semibold text-ink-900">{r.full_name}</p>
                  <p className="text-xs text-ink-500">{r.email || r.mobile} · {titleCase(r.role)}{r.is_nri ? " · NRI" : ""}{r.is_hni ? " · HNI" : ""}</p>
                </td>
                {showDeal && (
                  <td className="px-4 py-2.5">
                    <Link to={`/app/deal-room/${r.property_id}`} className="font-semibold text-ink-900 hover:text-red-600">{r.property_title}</Link>
                    <p className="text-xs text-ink-500">{titleCase(r.listing_category)} · {r.city}</p>
                  </td>
                )}
                <td className="px-4 py-2.5">{r.role === "customer" ? <StatusBadge value={titleCase(r.verification_status || "none")} /> : "Broker / staff"}</td>
                <td className="px-4 py-2.5 text-xs text-ink-600">
                  v{r.nda_version} · “{r.nda_signed_name}”
                  <br />
                  {formatDate(r.nda_signed_at, true)} · {r.nda_ip || "—"}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge value={titleCase(r.status)} />
                  {r.access_expires_at && r.status === "approved" && <p className="mt-0.5 text-[10px] text-ink-400">until {formatDate(r.access_expires_at)}</p>}
                  {r.decision_reason && <p className="mt-0.5 max-w-[180px] text-[11px] text-ink-500">{r.decision_reason}</p>}
                </td>
                <td className="px-4 py-2.5">{r.document_opens}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  {isAdmin && r.status !== "approved" && (
                    <button title="Approve" className="mr-2 text-green-600 hover:text-green-800" onClick={() => decide(r, "approve")}>
                      <LuCircleCheck className="h-4 w-4" />
                    </button>
                  )}
                  {isAdmin && r.status === "pending_approval" && (
                    <button title="Reject" className="mr-2 text-red-600 hover:text-red-800" onClick={() => { setReason(""); setDeciding({ row: r, action: "reject" }); }}>
                      <LuCircleX className="h-4 w-4" />
                    </button>
                  )}
                  {isAdmin && r.status === "approved" && (
                    <button title="Revoke" className="text-ink-500 hover:text-red-700" onClick={() => { setReason(""); setDeciding({ row: r, action: "revoke" }); }}>
                      <LuBan className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={showDeal ? 7 : 6} className="px-4 py-8 text-center text-ink-500">No access requests.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Modal open={!!deciding} onClose={() => setDeciding(null)} title={deciding?.action === "reject" ? "Reject access request" : "Revoke access"} description={deciding?.row.full_name}>
        <div className="space-y-4">
          <TextareaField label="Reason (shown to the investor)" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setDeciding(null)}>Cancel</button>
            <button className="btn-primary" disabled={!reason.trim()} onClick={() => decide(deciding.row, deciding.action, reason.trim())}>Confirm</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// Module 38 AI investor-deal matching: who this deal suits best.
function MatchedInvestors({ propertyId }) {
  const { data, loading, error } = useApiQuery(`/opportunities/${propertyId}/matched-investors?limit=15`);
  return (
    <div className="card p-5">
      <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-ink-500">Matched investors</h3>
      <p className="mb-3 text-xs text-ink-500">Verified investors ranked by fit - stated preferences, what they engage with, and deal quality.</p>
      {loading ? (
        <InlineSpinner />
      ) : error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : !(data || []).length ? (
        <p className="text-xs text-ink-500">No verified investors yet.</p>
      ) : (
        <ul className="divide-y divide-line text-sm">
          {data.map((m) => (
            <li key={m.investorProfileId} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">
                  {m.name} <span className="font-normal text-ink-500">· {m.type || "Investor"}{m.manager ? ` · RM ${m.manager}` : ""}</span>
                </p>
                <p className="text-xs text-ink-500">
                  {(m.reasons || []).join(" · ") || "Weak fit"}
                  {m.alreadyInterested ? " · already interested" : m.alerted ? " · alerted" : ""}
                </p>
              </div>
              <span className={`shrink-0 font-bold ${m.score >= 70 ? "text-emerald-600" : "text-ink-700"}`}>{m.score}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DealRoomPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const call = useApiCall();
  const token = useSelector((s) => s.auth.accessToken);
  const { role } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(role);
  const { data: room, loading, error, reload } = useApiQuery(`/deal-room/${propertyId}/manage`);
  const { data: log, reload: reloadLog } = useApiQuery(isAdmin ? `/deal-room/${propertyId}/access-log` : null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", documentType: "auction_notice", description: "", downloadAllowed: false, watermark: true, expiresAt: "" });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const versionRef = useRef(null);
  const [versionFor, setVersionFor] = useState(null);

  const refresh = () => {
    reload();
    reloadLog?.();
  };

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.push("Choose a file.", "error");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      Object.entries(form).forEach(([k, v]) => v !== "" && body.append(k, String(v)));
      await call(`/deal-room/${propertyId}/documents`, { method: "POST", body, isFormData: true });
      toast.push(isAdmin ? "Document added and published to approved investors." : "Document added - an admin needs to approve it.", "success");
      setAdding(false);
      setForm({ title: "", documentType: "auction_notice", description: "", downloadAllowed: false, watermark: true, expiresAt: "" });
      refresh();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const uploadVersion = async (file) => {
    const body = new FormData();
    body.append("file", file);
    try {
      await call(`/deal-room/manage/documents/${versionFor}/versions`, { method: "POST", body, isFormData: true });
      toast.push("New version uploaded.", "success");
      refresh();
    } catch (err) {
      toast.push(err.message, "error");
    }
    if (versionRef.current) versionRef.current.value = "";
  };

  const setDoc = async (doc, patch, message) => {
    try {
      await call(`/deal-room/manage/documents/${doc.id}`, { method: "PUT", body: patch });
      toast.push(message, "success");
      refresh();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const approveVersion = async (versionId) => {
    try {
      await call(`/deal-room/manage/versions/${versionId}/approve`, { method: "PUT" });
      toast.push("Version approved - investors now see it.", "success");
      refresh();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const preview = async (doc) => {
    try {
      const res = await call(`/deal-room/documents/${doc.id}/url?purpose=view`);
      window.open(res.data.url, "_blank", "noopener");
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const exportLog = async () => {
    const res = await fetch(`${API_BASE_URL}/deal-room/${propertyId}/access-log?format=csv`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return toast.push("Export failed.", "error");
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `deal-room-access-log-${propertyId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !room) return <div className="flex justify-center py-24"><InlineSpinner className="h-6 w-6" /></div>;
  if (error || !room) return <div className="card p-6 text-sm text-red-700">{error || "Deal room not found."}</div>;

  const activity = room.activity || {};

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900">
        <LuArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Deal room · {titleCase(room.deal.listing_category)}</p>
          <h2 className="mt-1 text-xl font-bold text-ink-950">{room.deal.title}</h2>
          <p className="text-sm text-ink-500">{[room.deal.locality, room.deal.city].filter(Boolean).join(", ")}</p>
          <p className="mt-2 text-xs text-ink-500">
            Investors see documents only after: verified profile + NDA signed on the platform + admin approval. Links expire in 15 minutes; PDFs are watermarked per viewer.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          {[["Views", activity.viewed || 0], ["Downloads", activity.downloaded || 0], ["Blocked", activity.download_blocked || 0]].map(([l, v]) => (
            <div key={l}><p className="text-xl font-bold text-ink-950">{v}</p><p className="text-xs text-ink-500">{l}</p></div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Documents ({room.documents.length})</h3>
          <button className="btn-primary btn-sm" onClick={() => setAdding(true)}><LuUpload className="h-4 w-4" /> Add document</button>
        </div>
        <input ref={versionRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadVersion(e.target.files[0])} />
        {room.documents.length === 0 ? (
          <p className="text-sm text-ink-500">No documents yet - add the auction notice, sale notice, EMD details, title papers and so on.</p>
        ) : (
          <div className="space-y-3">
            {room.documents.map((d) => (
              <div key={d.id} className={`rounded-xl border border-line p-4 ${d.is_active ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-ink-900"><LuFileText className="h-4 w-4 text-ink-400" /> {d.title}</p>
                    <p className="text-xs text-ink-500">
                      {DOC_TYPES.find(([k]) => k === d.document_type)?.[1]} · added by {d.created_by_name || "—"} {d.expires_at ? `· expires ${formatDate(d.expires_at)}` : ""}
                      {!d.is_active ? " · archived" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <label className="flex items-center gap-1"><input type="checkbox" checked={d.download_allowed} onChange={(e) => setDoc(d, { downloadAllowed: e.target.checked }, "Download setting saved.")} /> Download allowed</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={d.watermark} onChange={(e) => setDoc(d, { watermark: e.target.checked }, "Watermark setting saved.")} /> Watermark</label>
                    <button className="font-semibold text-ink-700 hover:text-ink-950" onClick={() => preview(d)}><LuEye className="inline h-3.5 w-3.5" /> Preview</button>
                    <button className="font-semibold text-red-600" onClick={() => { setVersionFor(d.id); versionRef.current?.click(); }}>New version</button>
                    <button className="font-semibold text-ink-500" onClick={() => setDoc(d, { isActive: !d.is_active }, d.is_active ? "Archived." : "Restored.")}>{d.is_active ? "Archive" : "Restore"}</button>
                  </div>
                </div>
                <ul className="mt-3 space-y-1 border-t border-line pt-2">
                  {d.versions.map((v) => (
                    <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-ink-700">
                        v{v.version} · {v.file_name} · {v.size_bytes ? `${Math.round(v.size_bytes / 1024)} KB` : ""} · {v.uploaded_by_name || "—"} · {formatDate(v.created_at, true)}
                      </span>
                      <span className="flex items-center gap-2">
                        <StatusBadge value={titleCase(v.status)} />
                        {isAdmin && v.status === "pending" && <button className="font-semibold text-green-700" onClick={() => approveVersion(v.id)}>Approve</button>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-500">Access requests</h3>
        <AccessRequests rows={room.access} onChanged={refresh} />
      </div>

      <MatchedInvestors propertyId={propertyId} />

      {isAdmin && (
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Access log</h3>
            <button className="btn-outline btn-sm" onClick={exportLog}><LuDownload className="h-4 w-4" /> Export CSV</button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white text-left uppercase text-ink-500"><tr><th className="py-2">When</th><th>Who</th><th>Action</th><th>Document</th><th>IP</th><th>Device</th></tr></thead>
              <tbody className="divide-y divide-line">
                {(log || []).map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap py-1.5 text-ink-500">{formatDate(l.created_at, true)}</td>
                    <td>{l.user_name || "—"}</td>
                    <td className={l.action === "download_blocked" ? "font-semibold text-red-600" : ""}>{titleCase(l.action)}</td>
                    <td>{l.document_title ? `${l.document_title}${l.version ? ` v${l.version}` : ""}` : "—"}</td>
                    <td className="text-ink-500">{l.ip_address || "—"}</td>
                    <td className="text-ink-500">{l.device_fingerprint || "—"}</td>
                  </tr>
                ))}
                {(log || []).length === 0 && <tr><td colSpan={6} className="py-6 text-center text-ink-500">No activity yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add deal room document" maxWidth="max-w-lg">
        <div className="space-y-3">
          <label className="block"><span className="field-label">Title</span><input className="field-input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. SARFAESI sale notice" /></label>
          <label className="block"><span className="field-label">Type</span>
            <select className="field-select" value={form.documentType} onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value }))}>
              {DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="block"><span className="field-label">Note for investors (optional)</span><input className="field-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></label>
          <label className="block"><span className="field-label">Available until (optional)</span><input type="date" className="field-input" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} /></label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.downloadAllowed} onChange={(e) => setForm((f) => ({ ...f, downloadAllowed: e.target.checked }))} /> Allow download</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.watermark} onChange={(e) => setForm((f) => ({ ...f, watermark: e.target.checked }))} /> Watermark PDFs</label>
          </div>
          <input ref={fileRef} type="file" className="block w-full text-sm" />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn-primary" disabled={busy} onClick={upload}>{busy ? "Uploading…" : "Upload"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
