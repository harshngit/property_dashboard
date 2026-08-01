import { useState } from "react";
import { LuPlus, LuEye, LuPencil, LuTrash2, LuFileText } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import Avatar from "../../components/common/Avatar";
import { ConfirmDialog } from "../../components/common/Modal";
import QuickFormModal from "../../components/common/QuickFormModal";
import { CUSTOMERS } from "../../data/mockData";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";

const FIELDS = [
  { key: "name", label: "Customer name", placeholder: "e.g. Karan Mehta" },
  { key: "phone", label: "Phone", placeholder: "+91 98200 11223" },
  { key: "requirement", label: "Requirement", placeholder: "e.g. 3BHK, Whitefield", full: true },
  { key: "budget", label: "Budget", placeholder: "e.g. 1.4 Cr" },
  { key: "stage", label: "Deal stage", type: "select", options: ["Inquiry", "Site Visit", "Negotiation", "Booking", "Documentation", "Closed"] },
];

export default function CustomersList() {
  const toast = useToast();
  const { permissions } = useAuth();
  const [rows, setRows] = useState(CUSTOMERS);
  const [toDelete, setToDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const columns = [
    { key: "name", label: "Customer", render: (r) => (
      <div className="flex items-center gap-3">
        <Avatar name={r.name} size={32} color="#2B3A67" />
        <div><p className="font-semibold text-ink-900">{r.name}</p><p className="text-xs text-ink-500">{r.id} • {r.phone}</p></div>
      </div>
    ) },
    { key: "requirement", label: "Requirement" },
    { key: "budget", label: "Budget" },
    { key: "stage", label: "Deal Stage", render: (r) => <StatusBadge value={r.stage} /> },
  ];

  const getActions = (row) => [
    { label: "View 360° profile", icon: LuEye, onClick: () => toast.push(`Opening ${row.name}'s profile…`, "info") },
    { label: "Edit customer", icon: LuPencil, onClick: () => { setEditing(row); setModalOpen(true); }, hidden: !permissions.edit },
    { label: "View documents", icon: LuFileText, onClick: () => toast.push(`Opening documents for ${row.name}…`, "info") },
    { label: "Delete customer", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: !permissions.delete },
  ];

  const handleSave = (data) => {
    if (editing) {
      setRows((r) => r.map((x) => (x.id === editing.id ? { ...x, ...data } : x)));
      toast.push(`${data.name} updated.`, "success");
    } else {
      setRows((r) => [{ id: `CU-${Math.floor(Math.random() * 900 + 100)}`, ...data }, ...r]);
      toast.push(`${data.name} added.`, "success");
    }
    setModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Customer 360°"
        title="Customers"
        subtitle="A single profile for requirements, conversations, documents and deal stage."
        actions={permissions.create && <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary"><LuPlus className="h-4 w-4" /> Add customer</button>}
      />
      <DataTable
        columns={columns}
        data={rows}
        searchKeys={["name", "phone", "id"]}
        filters={[{ key: "stage", label: "Stage", options: ["Inquiry", "Site Visit", "Negotiation", "Booking", "Documentation", "Closed"] }]}
        getActions={getActions}
        emptyTitle="No customers yet"
        emptySubtitle="Customer profiles are created automatically from qualified leads."
      />
      <QuickFormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSave}
        title={editing ? "Edit customer" : "Add customer"}
        description="Keep requirements and budget up to date for accurate matching."
        fields={FIELDS} initial={editing || { stage: "Inquiry" }}
        submitLabel={editing ? "Save changes" : "Add customer"}
      />
      <ConfirmDialog
        open={!!toDelete} onClose={() => setToDelete(null)}
        onConfirm={() => { setRows((r) => r.filter((x) => x.id !== toDelete.id)); toast.push(`${toDelete.name} removed.`, "success"); setToDelete(null); }}
        title="Delete this customer?" description={`${toDelete?.name}'s profile and linked history will be removed.`}
      />
    </div>
  );
}
