import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR } from "../../lib/format";
import { INVOICE_KIND, InvoiceStatus, PdfButton } from "../../components/orchestration/invoices";

// Invoice Centre: every professional-fee invoice (A R staff) or the ones on
// the broker's deals - Instalment 1 at ATS execution, Instalment 2 at Sale
// Deed execution, lease invoices; GST split, due dates, overdue tracking,
// PDF, record payment, waive (admin).

const STAFF = ["internal_sales", "admin", "super_admin"];
const ADMIN = ["admin", "super_admin"];
const FILTERS = [["", "All"], ["invoiced", "Due"], ["overdue", "Overdue"], ["paid", "Paid"], ["waived", "Waived"]];

export default function InvoicesPage() {
  const { role } = useAuth();
  const toast = useToast();
  const call = useApiCall();
  const [status, setStatus] = useState("");
  const { data, loading, reload } = useApiQuery(`/orchestration/invoices${buildQuery({ status })}`);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const rows = data || [];
  const sum = (f) => rows.filter(f).reduce((s, i) => s + Number(i.total_amount), 0);

  const act = async (path, body, message) => {
    setBusy(true);
    try {
      await call(path, { method: "POST", body });
      toast.push(message, "success");
      setModal(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Invoice Centre" />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Outstanding", sum((i) => ["invoiced", "overdue"].includes(i.status)), "text-ink-950"],
          ["Overdue", sum((i) => i.status === "overdue" || (i.is_overdue && i.status === "invoiced")), "text-red-600"],
          ["Collected", sum((i) => i.status === "paid"), "text-emerald-700"],
        ].map(([l, v, tone]) => (
          <div key={l} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{l}{status ? " (filtered)" : ""}</p>
            <p className={`mt-1 font-display text-2xl font-extrabold ${tone}`}>{formatINR(v)}</p>
          </div>
        ))}
      </div>
      <div className="mb-4 flex gap-1 rounded-lg bg-surface-muted p-1 sm:w-fit">
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className={`rounded-md px-4 py-1.5 text-xs font-semibold ${status === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>
        ))}
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>
      ) : rows.length === 0 ? (
        <EmptyState title="No invoices" subtitle="Invoices are raised automatically when the ATS, Sale Deed or lease execution date is recorded on a deal." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Billed to</th>
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">GST</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">{i.invoice_number}</p>
                    <p className="text-xs text-ink-500">
                      {INVOICE_KIND[i.kind]} ·{" "}
                      <Link to={`/app/deals/${i.deal_id}`} className="text-red-600 hover:underline">{i.property_title || "Deal"}</Link>
                    </p>
                  </td>
                  <td className="px-4 py-3">{i.liable_name}<p className="text-xs capitalize text-ink-500">{i.party}</p></td>
                  <td className="px-4 py-3">{formatINR(i.fee_amount, { compact: false })}</td>
                  <td className="px-4 py-3 text-xs">{i.gst_type === "igst" ? `IGST ${formatINR(i.igst_amount, { compact: false })}` : `CGST + SGST ${formatINR(Number(i.cgst_amount) + Number(i.sgst_amount), { compact: false })}`}</td>
                  <td className="px-4 py-3 font-semibold">{formatINR(i.total_amount, { compact: false })}</td>
                  <td className="px-4 py-3 text-xs">{formatDate(i.due_date)}</td>
                  <td className="px-4 py-3"><InvoiceStatus inv={i} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <PdfButton id={i.id} />
                      {STAFF.includes(role) && !["paid", "waived"].includes(i.status) && (
                        <button className="btn-outline btn-sm" onClick={() => { setForm({ id: i.id }); setModal("pay"); }}>Mark paid</button>
                      )}
                      {ADMIN.includes(role) && !["paid", "waived"].includes(i.status) && (
                        <button className="btn-outline btn-sm" onClick={() => { setForm({ id: i.id }); setModal("waive"); }}>Waive</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal === "pay"} onClose={() => setModal(null)} title="Record invoice payment" description="Once both instalments are paid the deal closes automatically.">
        <div className="space-y-4">
          <TextField label="Payment reference (UTR / cheque no.)" value={form.reference || ""} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" disabled={busy} onClick={() => act(`/orchestration/invoices/${form.id}/payment`, { reference: form.reference || undefined }, "Payment recorded.")}>Save</button>
          </div>
        </div>
      </Modal>
      <Modal open={modal === "waive"} onClose={() => setModal(null)} title="Waive invoice">
        <div className="space-y-4">
          <TextareaField label="Reason" rows={3} value={form.note || ""} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" disabled={busy || (form.note || "").length < 3} onClick={() => act(`/orchestration/invoices/${form.id}/waive`, { note: form.note }, "Invoice waived.")}>Waive</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
