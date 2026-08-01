import { useState } from "react";
import { LuPlus, LuEye, LuPencil, LuTrash2, LuUserX } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import Avatar from "../../components/common/Avatar";
import { ConfirmDialog } from "../../components/common/Modal";
import QuickFormModal from "../../components/common/QuickFormModal";
import { BROKERS } from "../../data/mockData";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";

const FIELDS = [
  { key: "name", label: "Broker name", placeholder: "e.g. Priya Menon" },
  { key: "agency", label: "Agency", placeholder: "e.g. Skyline Realty" },
  { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
];

export default function BrokersList() {
  const toast = useToast();
  const { permissions } = useAuth();
  const [rows, setRows] = useState(BROKERS);
  const [toDelete, setToDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const columns = [
    {
      key: "name", label: "Broker",
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} size={32} color="#FF7A59" />
          <div>
            <p className="font-semibold text-ink-900">{r.name}</p>
            <p className="text-xs text-ink-500">{r.id} • {r.agency}</p>
          </div>
        </div>
      ),
    },
    { key: "leads", label: "Leads Assigned" },
    { key: "deals", label: "Deals Won" },
    { key: "conversion", label: "Conversion" },
    { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
  ];

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (row) => { setEditing(row); setModalOpen(true); };

  const getActions = (row) => [
    { label: "View performance", icon: LuEye, onClick: () => toast.push(`Opening ${row.name}'s performance…`, "info") },
    { label: "Edit broker", icon: LuPencil, onClick: () => openEdit(row), hidden: !permissions.edit },
    { label: "Deactivate", icon: LuUserX, onClick: () => toast.push(`${row.name} deactivated.`, "info"), hidden: !permissions.edit || row.status === "Inactive" },
    { label: "Remove broker", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: !permissions.delete },
  ];

  const handleSave = (data) => {
    if (editing) {
      setRows((r) => r.map((x) => (x.id === editing.id ? { ...x, ...data } : x)));
      toast.push(`${data.name} updated.`, "success");
    } else {
      setRows((r) => [{ id: `BR-${Math.floor(Math.random() * 90 + 10)}`, leads: 0, deals: 0, conversion: "0%", ...data }, ...r]);
      toast.push(`${data.name} added as a broker.`, "success");
    }
    setModalOpen(false);
  };

  const confirmDelete = () => {
    setRows((r) => r.filter((x) => x.id !== toDelete.id));
    toast.push(`${toDelete.name} removed.`, "success");
    setToDelete(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Broker CRM"
        title="Brokers"
        subtitle="Manage broker accounts, assigned leads and performance."
        actions={permissions.create && <button onClick={openCreate} className="btn-primary"><LuPlus className="h-4 w-4" /> Add broker</button>}
      />
      <DataTable
        columns={columns}
        data={rows}
        searchKeys={["name", "agency", "id"]}
        filters={[{ key: "status", label: "Status", options: ["Active", "Inactive"] }]}
        getActions={getActions}
        onExport={permissions.export ? () => toast.push("Exporting brokers to CSV…", "info") : undefined}
        emptyTitle="No brokers yet"
        emptySubtitle="Invite brokers to start assigning them leads and listings."
      />
      <QuickFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
        title={editing ? "Edit broker" : "Add broker"}
        description="Broker accounts get access to assigned leads, inventory and follow-ups."
        fields={FIELDS}
        initial={editing || { status: "Active" }}
        submitLabel={editing ? "Save changes" : "Add broker"}
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Remove this broker?"
        description={`${toDelete?.name}'s assigned leads will need to be reassigned.`}
      />
    </div>
  );
}
