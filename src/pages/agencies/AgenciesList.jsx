import { useState } from "react";
import { LuPlus, LuEye, LuPencil, LuTrash2 } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import { ConfirmDialog } from "../../components/common/Modal";
import QuickFormModal from "../../components/common/QuickFormModal";
import { AGENCIES } from "../../data/mockData";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";

const FIELDS = [
  { key: "name", label: "Agency name", placeholder: "e.g. Skyline Realty" },
  { key: "city", label: "City", placeholder: "e.g. Bengaluru" },
  { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
];

export default function AgenciesList() {
  const toast = useToast();
  const { permissions } = useAuth();
  const [rows, setRows] = useState(AGENCIES);
  const [toDelete, setToDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const columns = [
    { key: "name", label: "Agency", render: (r) => (
      <div><p className="font-semibold text-ink-900">{r.name}</p><p className="text-xs text-ink-500">{r.id} • {r.city}</p></div>
    ) },
    { key: "brokers", label: "Brokers" },
    { key: "activeListings", label: "Active Listings" },
    { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
  ];

  const getActions = (row) => [
    { label: "View agency", icon: LuEye, onClick: () => toast.push(`Opening ${row.name}…`, "info") },
    { label: "Edit agency", icon: LuPencil, onClick: () => { setEditing(row); setModalOpen(true); }, hidden: !permissions.edit },
    { label: "Remove agency", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: !permissions.delete },
  ];

  const handleSave = (data) => {
    if (editing) {
      setRows((r) => r.map((x) => (x.id === editing.id ? { ...x, ...data } : x)));
      toast.push(`${data.name} updated.`, "success");
    } else {
      setRows((r) => [{ id: `AG-${Math.floor(Math.random() * 90 + 10)}`, brokers: 0, activeListings: 0, ...data }, ...r]);
      toast.push(`${data.name} onboarded.`, "success");
    }
    setModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Agency Management"
        title="Agencies"
        subtitle="Onboard agencies and manage their brokers and inventory."
        actions={permissions.create && <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary"><LuPlus className="h-4 w-4" /> Add agency</button>}
      />
      <DataTable
        columns={columns}
        data={rows}
        searchKeys={["name", "city", "id"]}
        filters={[{ key: "status", label: "Status", options: ["Active", "Inactive"] }]}
        getActions={getActions}
        emptyTitle="No agencies yet"
        emptySubtitle="Agencies you onboard will manage their own brokers and listings."
      />
      <QuickFormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSave}
        title={editing ? "Edit agency" : "Add agency"}
        description="Agency admins can manage their own brokers, inventory and leads."
        fields={FIELDS} initial={editing || { status: "Active" }}
        submitLabel={editing ? "Save changes" : "Add agency"}
      />
      <ConfirmDialog
        open={!!toDelete} onClose={() => setToDelete(null)}
        onConfirm={() => { setRows((r) => r.filter((x) => x.id !== toDelete.id)); toast.push(`${toDelete.name} removed.`, "success"); setToDelete(null); }}
        title="Remove this agency?" description={`${toDelete?.name} and its broker access will be revoked.`}
      />
    </div>
  );
}
