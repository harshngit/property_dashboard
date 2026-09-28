import { useMemo, useState } from "react";
import { LuEye, LuWallet } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import { useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, shortId, titleCase } from "../../lib/format";

// Payment tracking across every deal the user can see (GET /payments,
// GET /payments/stats). Status changes come from the gateway webhook, so
// this screen is read-only.

const STATUS_LABELS = { initiated: "Initiated", success: "Success", failed: "Failed", refunded: "Refunded" };

export default function PaymentsPage() {
  const { data, loading, error } = useApiQuery("/payments?limit=100");
  const { data: stats } = useApiQuery("/payments/stats");
  const [viewing, setViewing] = useState(null);

  const rows = useMemo(
    () =>
      (data?.items || []).map((p) => ({
        id: p.id,
        ref: shortId(p.id, "PAY-"),
        customer: p.customer_name,
        deal: p.property_title || shortId(p.deal_id, "DL-"),
        milestone: p.milestone_name || "—",
        amount: formatINR(p.amount, { compact: false }),
        gateway: titleCase(p.gateway),
        status: STATUS_LABELS[p.status] || p.status,
        date: formatDate(p.created_at),
        raw: p,
      })),
    [data]
  );

  const columns = [
    { key: "ref", label: "Transaction" },
    { key: "customer", label: "Customer" },
    { key: "deal", label: "Deal / Property" },
    { key: "milestone", label: "Milestone" },
    { key: "amount", label: "Amount" },
    { key: "gateway", label: "Gateway" },
    { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
    { key: "date", label: "Date" },
  ];

  const statsItems = stats
    ? [
        { label: "Collected", value: formatINR(stats.collected_amount), meta: `${stats.successful} successful payments` },
        { label: "Pending", value: stats.pending, meta: "initiated, awaiting gateway" },
        { label: "Outstanding", value: formatINR(stats.outstanding_amount), meta: `${stats.pending_milestones} open milestones` },
        { label: "Overdue milestones", value: stats.overdue_milestones, meta: `${stats.failed} failed payments` },
      ]
    : [];

  return (
    <div>
      <PageHeader eyebrow="Payment Tracking" title="Payments" subtitle="Transaction and milestone history across every active deal." />
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        statsItems={statsItems}
        searchKeys={["customer", "ref", "deal"]}
        filters={[
          { key: "status", label: "Status", options: Object.values(STATUS_LABELS) },
          { key: "gateway", label: "Gateway", options: ["Razorpay", "Payu", "Manual"] },
        ]}
        getActions={(row) => [{ label: "View transaction", icon: LuEye, onClick: () => setViewing(row.raw) }]}
        renderCard={(r) => (
          <div>
            <p className="font-semibold text-ink-900">{r.ref}</p>
            <p className="mt-1 text-xs text-ink-500">
              {r.customer} • {r.deal}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={r.status} />
            </div>
            <div className="mt-3 text-xs text-ink-500">
              <p>{r.milestone}</p>
              <p>
                {r.amount} • {r.date}
              </p>
            </div>
          </div>
        )}
        kanban={{ key: "status", columns: Object.values(STATUS_LABELS) }}
        emptyTitle="No payments recorded"
        emptySubtitle="Payments initiated against deals will appear here."
      />
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-xs text-ink-500">
        <LuWallet className="h-4 w-4 text-indigo-500" /> Payment gateway integration requires client KYC and merchant approval before going live.
      </div>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Transaction details" maxWidth="max-w-lg">
        {viewing && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {[
              ["Reference", shortId(viewing.id, "PAY-")],
              ["Status", <StatusBadge key="s" value={STATUS_LABELS[viewing.status] || viewing.status} />],
              ["Customer", viewing.customer_name],
              ["Property", viewing.property_title || "—"],
              ["Milestone", viewing.milestone_name || "—"],
              ["Amount", formatINR(viewing.amount, { compact: false })],
              ["Gateway", titleCase(viewing.gateway)],
              ["Gateway order", viewing.gateway_order_id || "—"],
              ["Gateway payment", viewing.gateway_payment_id || "—"],
              ["Initiated by", viewing.initiated_by_name || "—"],
              ["Created", formatDate(viewing.created_at, true)],
              ["Deal stage", titleCase(viewing.deal_stage)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-ink-500">{label}</dt>
                <dd className="font-medium text-ink-900">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </div>
  );
}
