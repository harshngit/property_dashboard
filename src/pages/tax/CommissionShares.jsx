import { useEffect, useState } from "react";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR } from "../../lib/format";

// A franchisee's or broker's commission shares (Section 14.6): the GST invoice
// they raise to A R Buildwel for each share, and what was paid after TDS.
// `base` is "/tax/commission-shares" (broker) or "/franchisee/shares".

const Spinner = () => <div className="flex justify-center py-12 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
const STATUS = { calculated: "Waiting for client payment", releasable: "Ready to pay", released: "Paid" };
const INV = { submitted: "Invoice with A R Buildwel", approved: "Invoice approved", rejected: "Invoice not accepted" };

function TaxProfile({ profile, onSaved }) {
  const call = useApiCall();
  const toast = useToast();
  const [f, setF] = useState({ legalName: profile.legalName || "", pan: "", gstin: profile.gstin || "" });
  useEffect(() => setF({ legalName: profile.legalName || "", pan: "", gstin: profile.gstin || "" }), [profile]);
  const save = () => call("/tax/profile", { method: "PUT", body: { legalName: f.legalName || null, pan: f.pan || null, gstin: f.gstin || null } }).then(() => { toast.push("Tax details saved.", "success"); onSaved(); }).catch((e) => toast.push(e.message, "error"));
  return (
    <div className="card space-y-3 p-5">
      <p className="text-sm font-bold text-ink-900">Tax details for payouts</p>
      <p className="text-xs text-ink-500">{profile.hasPan ? `PAN ••••${profile.panLast4} on file${profile.panVerified ? " (verified)" : " - being verified"}.` : "Without a PAN, TDS is deducted at the higher statutory rate."} GST is added to your share only if you are GST-registered.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="field-label">Legal name<input className="field-input mt-1" value={f.legalName} onChange={(e) => setF({ ...f, legalName: e.target.value })} /></label>
        <label className="field-label">{profile.hasPan ? "New PAN (optional)" : "PAN"}<input className="field-input mt-1 uppercase" maxLength={10} value={f.pan} onChange={(e) => setF({ ...f, pan: e.target.value.toUpperCase() })} /></label>
        <label className="field-label">GSTIN (if registered)<input className="field-input mt-1 uppercase" maxLength={15} value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} /></label>
      </div>
      <div className="flex justify-end"><button className="btn-primary btn-sm" onClick={save}>Save tax details</button></div>
    </div>
  );
}

export default function CommissionShares({ base, showProfile = false }) {
  const call = useApiCall();
  const toast = useToast();
  const { data, reload } = useApiQuery(base);
  const [upload, setUpload] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!data) return <Spinner />;
  const send = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      for (const k of ["invoiceNumber", "invoiceDate", "supplierGstin", "taxableAmount", "gstAmount"]) fd.append(k, upload[k]);
      fd.append("file", upload.file);
      await call(`${base}/${upload.commissionId}/invoice`, { method: "POST", body: fd, isFormData: true });
      toast.push("Invoice sent to A R Buildwel.", "success");
      setUpload(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      {showProfile && <TaxProfile profile={data.profile} onSaved={reload} />}
      {!data.shares.length ? <div className="card"><EmptyState title="No commission shares yet" subtitle="A share appears when a deal you worked on in a franchise territory closes." /></div> : data.shares.map((s) => (
        <div key={s.commissionId} className="card space-y-2 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-ink-900">Deal value {formatINR(s.dealValue)} · your share {formatINR(s.total)} <StatusBadge value={STATUS[s.status]} /></p>
            <span className="text-xs text-ink-500">{(s.roles || []).join(", ")} · {formatDate(s.createdAt)}</span>
          </div>
          <p className="text-xs text-ink-600">Base {formatINR(s.base)}{s.gst ? ` + GST ${formatINR(s.gst)}` : " (no GST - not registered)"}</p>
          {s.invoiceNeeded && (
            s.invoice ? (
              <p className="text-xs"><StatusBadge value={INV[s.invoice.status]} /> <span data-no-translate>{s.invoice.invoiceNumber}</span>{s.invoice.reviewNote ? <span className="text-red-600" data-no-translate> - {s.invoice.reviewNote}</span> : null}</p>
            ) : null
          )}
          {s.invoiceNeeded && s.status !== "released" && (!s.invoice || s.invoice.status === "rejected") && (
            <button className="btn-outline btn-sm" onClick={() => setUpload({ commissionId: s.commissionId, invoiceNumber: "", invoiceDate: new Date().toISOString().slice(0, 10), supplierGstin: data.profile?.gstin || "", taxableAmount: s.base, gstAmount: s.gst, file: null })}>Upload my GST invoice for this share</button>
          )}
          {s.paid && <p className="text-xs text-emerald-700">Paid {formatINR(s.paid.net)}{s.paid.tds ? ` after TDS ${formatINR(s.paid.tds)} (${s.paid.tdsRate}%)` : ""}.</p>}
        </div>
      ))}
      <Modal open={!!upload} onClose={() => setUpload(null)} title="GST invoice to A R Buildwel" description="Raise it for exactly your share; A R Buildwel claims the input tax credit." maxWidth="max-w-lg">
        {upload && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field-label">Invoice number<input className="field-input mt-1" value={upload.invoiceNumber} onChange={(e) => setUpload({ ...upload, invoiceNumber: e.target.value })} /></label>
              <label className="field-label">Invoice date<input type="date" className="field-input mt-1" value={upload.invoiceDate} onChange={(e) => setUpload({ ...upload, invoiceDate: e.target.value })} /></label>
              <label className="field-label">Your GSTIN<input className="field-input mt-1 uppercase" maxLength={15} value={upload.supplierGstin} onChange={(e) => setUpload({ ...upload, supplierGstin: e.target.value.toUpperCase() })} /></label>
              <label className="field-label">Taxable amount (₹)<input type="number" className="field-input mt-1" value={upload.taxableAmount} onChange={(e) => setUpload({ ...upload, taxableAmount: e.target.value })} /></label>
              <label className="field-label">GST (₹)<input type="number" className="field-input mt-1" value={upload.gstAmount} onChange={(e) => setUpload({ ...upload, gstAmount: e.target.value })} /></label>
              <label className="field-label">Invoice file (PDF / JPG / PNG)<input type="file" accept="application/pdf,image/jpeg,image/png" className="mt-1 block text-xs" onChange={(e) => setUpload({ ...upload, file: e.target.files[0] || null })} /></label>
            </div>
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setUpload(null)}>Cancel</button><button className="btn-primary" disabled={busy || !upload.file || !upload.invoiceNumber.trim()} onClick={send}>Send invoice</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
