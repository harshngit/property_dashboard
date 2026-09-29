import { useState } from "react";
import { useSelector } from "react-redux";
import { LuDownload } from "react-icons/lu";
import { API_BASE_URL } from "../../config/api";
import { useToast } from "../common/ToastProvider";

// Shared bits for professional-fee invoices (deal panel + Invoice Centre).

export const INVOICE_KIND = { instalment_1: "Instalment 1 · ATS", instalment_2: "Instalment 2 · Sale Deed", lease: "Lease" };

export function invoiceTone(inv) {
  if (inv.status === "paid") return "bg-emerald-50 text-emerald-700";
  if (inv.status === "waived") return "bg-surface-muted text-ink-600";
  if (inv.status === "overdue" || inv.is_overdue) return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

export function InvoiceStatus({ inv }) {
  const overdue = inv.status === "overdue" || inv.is_overdue;
  const label = overdue && inv.status !== "paid" ? `Overdue${inv.days_overdue ? ` ${inv.days_overdue}d` : ""}` : inv.status === "invoiced" ? "Due" : inv.status;
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${invoiceTone(inv)}`}>{label}</span>;
}

// The PDF needs the bearer token, so fetch it and open the blob.
export function PdfButton({ id, className = "" }) {
  const token = useSelector((s) => s.auth.accessToken);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orchestration/invoices/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Could not load the invoice PDF");
      const url = URL.createObjectURL(await res.blob());
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button title="Invoice PDF" onClick={open} disabled={busy} className={`rounded-lg border border-line p-1.5 text-ink-600 hover:bg-surface-muted ${className}`}>
      <LuDownload className="h-4 w-4" />
    </button>
  );
}
