import { useState } from "react";
import { LuEye, LuRefreshCw, LuWallet } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../components/common/ToastProvider";

const PAYMENTS = [
  { id: "PAY-9021", customer: "Divya Prakash", deal: "DL-88", milestone: "Booking Amount", amount: "₹15,00,000", status: "Active", date: "Jul 28, 2026" },
  { id: "PAY-9020", customer: "Karan Mehta", deal: "DL-85", milestone: "Token Advance", amount: "₹2,00,000", status: "Active", date: "Jul 22, 2026" },
  { id: "PAY-9019", customer: "Farhan Sheikh", deal: "DL-87", milestone: "Booking Amount", amount: "₹10,50,000", status: "Pending Approval", date: "Jul 20, 2026" },
  { id: "PAY-9018", customer: "Suresh Iyer", deal: "DL-86", milestone: "Token Advance", amount: "₹5,00,000", status: "Inactive", date: "Jul 12, 2026" },
];

export default function PaymentsPage() {
  const toast = useToast();
  const [rows, setRows] = useState(PAYMENTS);

  const columns = [
    { key: "id", label: "Transaction" },
    { key: "customer", label: "Customer" },
    { key: "deal", label: "Deal" },
    { key: "milestone", label: "Milestone" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
    { key: "date", label: "Date" },
  ];

  const getActions = (row) => [
    { label: "View transaction", icon: LuEye, onClick: () => toast.push(`Opening ${row.id}…`, "info") },
    { label: "Re-check status", icon: LuRefreshCw, onClick: () => toast.push(`Refreshing status for ${row.id}…`, "info") },
  ];

  const handleKanbanDrop = (row, status) => {
    setRows((current) => current.map((item) => (
      item.id === row.id ? { ...item, status } : item
    )));
    toast.push(`${row.id} moved to ${status}.`, "success");
  };

  const parseAmount = (amount) => Number(String(amount).replace(/[^\d]/g, "")) || 0;
  const paymentStats = [
    { label: "Total Payments", value: rows.length, meta: "all transactions" },
    { label: "Collected", value: `₹${(rows.filter((row) => row.status === "Active").reduce((sum, row) => sum + parseAmount(row.amount), 0) / 100000).toFixed(1)}L`, meta: "active receipts" },
    { label: "Pending Approval", value: rows.filter((row) => row.status === "Pending Approval").length, meta: "awaiting confirmation" },
    { label: "Inactive", value: rows.filter((row) => row.status === "Inactive").length, meta: "failed or archived" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Payment Tracking"
        title="Payments"
        subtitle="Transaction and milestone history across every active deal."
      />
      <DataTable
        columns={columns}
        data={rows}
        statsItems={paymentStats}
        searchKeys={["customer", "id", "deal"]}
        filters={[{ key: "status", label: "Status", options: ["Active", "Pending Approval", "Inactive"] }]}
        getActions={getActions}
        renderCard={(r) => (
          <div>
            <p className="font-semibold text-ink-900">{r.id}</p>
            <p className="mt-1 text-xs text-ink-500">{r.customer} • {r.deal}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={r.status} />
            </div>
            <div className="mt-3 text-xs text-ink-500">
              <p>{r.milestone}</p>
              <p>{r.amount} • {r.date}</p>
            </div>
          </div>
        )}
        kanban={{ key: "status", columns: ["Active", "Pending Approval", "Inactive"] }}
        onKanbanDrop={handleKanbanDrop}
        emptyTitle="No payments recorded"
        emptySubtitle="Payment attempts and statuses will appear here once initiated."
      />
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-xs text-ink-500">
        <LuWallet className="h-4 w-4 text-indigo-500" /> Payment gateway integration requires client KYC and merchant approval before going live.
      </div>
    </div>
  );
}
