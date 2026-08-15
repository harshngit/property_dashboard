import { useState } from "react";
import { LuPlus, LuEye, LuPencil, LuTrash2 } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import { ConfirmDialog } from "../../components/common/Modal";
import QuickFormModal from "../../components/common/QuickFormModal";
import { BUILDERS } from "../../data/mockData";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";

const FIELDS = [
  { key: "name", label: "Builder / Developer", placeholder: "e.g. Desai Developers" },
  { key: "city", label: "City", placeholder: "e.g. Mumbai" },
  { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
];

export default function BuildersList() {
  const toast = useToast();
  const { permissions } = useAuth();
  const [rows, setRows] = useState(BUILDERS);
  const [toDelete, setToDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const columns = [
    { key: "name", label: "Builder", render: (r) => (
      <div><p className="font-semibold text-ink-900">{r.name}</p><p className="text-xs text-ink-500">{r.id} • {r.city}</p></div>
    ) },
    { key: "projects", label: "Projects" },
    { key: "units", label: "Total Units" },
    { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
  ];

  const getActions = (row) => [
    { label: "View projects", icon: LuEye, onClick: () => toast.push(`Opening ${row.name}'s projects…`, "info") },
    { label: "Edit builder", icon: LuPencil, onClick: () => { setEditing(row); setModalOpen(true); }, hidden: !permissions.edit },
    { label: "Remove builder", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: !permissions.delete },
  ];

  const handleSave = (data) => {
    if (editing) {
      setRows((r) => r.map((x) => (x.id === editing.id ? { ...x, ...data } : x)));
      toast.push(`${data.name} updated.`, "success");
    } else {
      setRows((r) => [{ id: `BD-${Math.floor(Math.random() * 90 + 10)}`, projects: 0, units: 0, ...data }, ...r]);
      toast.push(`${data.name} onboarded.`, "success");
    }
    setModalOpen(false);
  };

  const handleKanbanDrop = (row, status) => {
    setRows((current) => current.map((item) => (
      item.id === row.id ? { ...item, status } : item
    )));
    toast.push(`${row.name} moved to ${status}.`, "success");
  };

  const builderStats = [
    { label: "Total Builders", value: rows.length, meta: "partner developers" },
    { label: "Active Builders", value: rows.filter((row) => row.status === "Active").length, meta: "currently enabled" },
    { label: "Projects", value: rows.reduce((sum, row) => sum + Number(row.projects || 0), 0), meta: "live portfolios" },
    { label: "Total Units", value: rows.reduce((sum, row) => sum + Number(row.units || 0), 0), meta: "builder inventory" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Builder Management"
        title="Builders"
        subtitle="Manage builder projects, units and inquiry allocation."
      />
      <DataTable
        columns={columns}
        data={rows}
        statsItems={builderStats}
        toolbarActions={permissions.create ? <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary"><LuPlus className="h-4 w-4" /> Add builder</button> : undefined}
        searchKeys={["name", "city", "id"]}
        filters={[{ key: "status", label: "Status", options: ["Active", "Inactive"] }]}
        getActions={getActions}
        renderCard={(r) => (
          <div>
            <p className="font-semibold text-ink-900">{r.name}</p>
            <p className="mt-1 text-xs text-ink-500">{r.id} • {r.city}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={r.status} />
            </div>
            <div className="mt-3 text-xs text-ink-500">
              <p>Projects: {r.projects}</p>
              <p>Total units: {r.units}</p>
            </div>
          </div>
        )}
        kanban={{ key: "status", columns: ["Active", "Inactive"] }}
        onKanbanDrop={permissions.edit ? handleKanbanDrop : undefined}
        emptyTitle="No builders yet"
        emptySubtitle="Builders you onboard can manage their own projects and units."
      />
      <QuickFormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSave}
        title={editing ? "Edit builder" : "Add builder"}
        description="Builders manage their own projects, units and inventory status."
        fields={FIELDS} initial={editing || { status: "Active" }}
        submitLabel={editing ? "Save changes" : "Add builder"}
      />
      <ConfirmDialog
        open={!!toDelete} onClose={() => setToDelete(null)}
        onConfirm={() => { setRows((r) => r.filter((x) => x.id !== toDelete.id)); toast.push(`${toDelete.name} removed.`, "success"); setToDelete(null); }}
        title="Remove this builder?" description={`${toDelete?.name} and its project data will be archived.`}
      />
    </div>
  );
}
