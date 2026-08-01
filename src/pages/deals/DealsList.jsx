import { useState } from "react";
import { LuPlus, LuEye, LuPencil, LuTrash2, LuFileCheck2 } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import { ConfirmDialog } from "../../components/common/Modal";
import QuickFormModal from "../../components/common/QuickFormModal";
import { DEALS } from "../../data/mockData";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";

const STAGES = ["Inquiry", "Site Visit", "Negotiation", "Booking", "Documentation", "Closed", "Lost"];
const FIELDS = [
  { key: "customer", label: "Customer", placeholder: "e.g. Karan Mehta" },
  { key: "property", label: "Property", placeholder: "e.g. Orchid Heights" },
  { key: "value", label: "Deal value", placeholder: "e.g. 1.4 Cr" },
  { key: "owner", label: "Owner", placeholder: "e.g. Priya Menon" },
  { key: "stage", label: "Stage", type: "select", options: STAGES },
  { key: "closing", label: "Expected closing", placeholder: "e.g. Aug 20" },
];

export default function DealsList() {
  const toast = useToast();
  const { permissions } = useAuth();
  const [rows, setRows] = useState(DEALS);
  const [toDelete, setToDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const stageCounts = STAGES.map((s) => ({ stage: s, count: rows.filter((r) => r.stage === s).length }));

  const columns = [
    { key: "customer", label: "Customer", render: (r) => (
      <div><p className="font-semibold text-ink-900">{r.customer}</p><p className="text-xs text-ink-500">{r.id}</p></div>
    ) },
    { key: "property", label: "Property" },
    { key: "value", label: "Deal Value" },
    { key: "stage", label: "Stage", render: (r) => <StatusBadge value={r.stage} /> },
    { key: "owner", label: "Owner" },
    { key: "closing", label: "Expected Closing" },
  ];

  const getActions = (row) => [
    { label: "View deal", icon: LuEye, onClick: () => toast.push(`Opening deal ${row.id}…`, "info") },
    { label: "Edit deal", icon: LuPencil, onClick: () => { setEditing(row); setModalOpen(true); }, hidden: !permissions.edit },
    { label: "Mark as won", icon: LuFileCheck2, onClick: () => { setRows((r) => r.map((x) => x.id === row.id ? { ...x, stage: "Closed" } : x)); toast.push(`${row.customer}'s deal marked won.`, "success"); }, hidden: !permissions.edit || row.stage === "Closed" },
    { label: "Delete deal", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: !permissions.delete },
  ];

  const handleSave = (data) => {
    if (editing) {
      setRows((r) => r.map((x) => (x.id === editing.id ? { ...x, ...data } : x)));
      toast.push(`Deal for ${data.customer} updated.`, "success");
    } else {
      setRows((r) => [{ id: `DL-${Math.floor(Math.random() * 90 + 10)}`, ...data }, ...r]);
      toast.push(`Deal for ${data.customer} created.`, "success");
    }
    setModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Deal Pipeline"
        title="Deals"
        subtitle="Track every deal from inquiry through documentation to close."
        actions={permissions.create && <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary"><LuPlus className="h-4 w-4" /> Add deal</button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {stageCounts.map((s) => (
          <div key={s.stage} className="card px-3 py-3 text-center">
            <p className="font-display text-xl font-extrabold text-ink-950">{s.count}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-ink-500">{s.stage}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchKeys={["customer", "property", "id"]}
        filters={[{ key: "stage", label: "Stage", options: STAGES }]}
        getActions={getActions}
        onExport={permissions.export ? () => toast.push("Exporting deals to CSV…", "info") : undefined}
        emptyTitle="No deals yet"
        emptySubtitle="Deals move here once a lead progresses past first contact."
      />
      <QuickFormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSave}
        title={editing ? "Edit deal" : "Add deal"}
        description="Track value, owner and expected closing date for this deal."
        fields={FIELDS} initial={editing || { stage: "Inquiry" }}
        submitLabel={editing ? "Save changes" : "Add deal"}
      />
      <ConfirmDialog
        open={!!toDelete} onClose={() => setToDelete(null)}
        onConfirm={() => { setRows((r) => r.filter((x) => x.id !== toDelete.id)); toast.push(`Deal ${toDelete.id} deleted.`, "success"); setToDelete(null); }}
        title="Delete this deal?" description={`This removes ${toDelete?.customer}'s deal and its milestone history.`}
      />
    </div>
  );
}
