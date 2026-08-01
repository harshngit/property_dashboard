import { useState } from "react";
import { LuEye, LuRefreshCw, LuWallet } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import StatCard from "../../components/common/StatCard";
import { useToast } from "../../components/common/ToastProvider";

const PAYMENTS = [
  { id: "PAY-9021", customer: "Divya Prakash", deal: "DL-88", milestone: "Booking Amount", amount: "₹15,00,000", status: "Active", date: "Jul 28, 2026" },
  { id: "PAY-9020", customer: "Karan Mehta", deal: "DL-85", milestone: "Token Advance", amount: "₹2,00,000", status: "Active", date: "Jul 22, 2026" },
  { id: "PAY-9019", customer: "Farhan Sheikh", deal: "DL-87", milestone: "Booking Amount", amount: "₹10,50,000", status: "Pending Approval", date: "Jul 20, 2026" },
  { id: "PAY-9018", customer: "Suresh Iyer", deal: "DL-86", milestone: "Token Advance", amount: "₹5,00,000", status: "Inactive", date: "Jul 12, 2026" },
];

export default function PaymentsPage() {
  const toast = useToast();
  const [rows] = useState(PAYMENTS);

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

  return (
    <div>
      <PageHeader
        eyebrow="Payment Tracking"
        title="Payments"
        subtitle="Transaction and milestone history across every active deal."
      />
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Collected (MTD)" value="₹32.5 L" delta="+18%" tone="up" index={0} />
        <StatCard label="Pending Approval" value="₹10.5 L" delta="1 transaction" tone="warn" index={1} />
        <StatCard label="Failed / Retried" value="₹0" delta="All clear" tone="flat" index={2} />
      </div>
      <DataTable
        columns={columns}
        data={rows}
        searchKeys={["customer", "id", "deal"]}
        filters={[{ key: "status", label: "Status", options: ["Active", "Pending Approval", "Inactive"] }]}
        getActions={getActions}
        emptyTitle="No payments recorded"
        emptySubtitle="Payment attempts and statuses will appear here once initiated."
      />
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-xs text-ink-500">
        <LuWallet className="h-4 w-4 text-indigo-500" /> Payment gateway integration requires client KYC and merchant approval before going live.
      </div>
    </div>
  );
}
