import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LuPlus, LuEye, LuPencil, LuTrash2 } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import { ConfirmDialog } from "../../components/common/Modal";
import QuickFormModal from "../../components/common/QuickFormModal";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";
import { fetchAgencies, createAgency, updateAgency, deleteAgency, clearAgenciesError } from "../../redux/slices/agenciesSlice";

const STATUS_OPTIONS = ["active", "inactive"];
const STATUS_LABEL = { active: "Active", inactive: "Inactive" };

const FIELDS = [
  { key: "name", label: "Agency name", placeholder: "e.g. Skyline Realty" },
  { key: "slug", label: "URL slug (optional)", placeholder: "auto-generated from name" },
  { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s] })) },
];

export default function AgenciesList() {
  const toast = useToast();
  const dispatch = useDispatch();
  const { permissions } = useAuth();
  const { list: rows, status } = useSelector((s) => s.agencies);

  const [toDelete, setToDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchAgencies());
    return () => dispatch(clearAgenciesError());
  }, [dispatch]);

  const columns = [
    { key: "name", label: "Agency", render: (r) => (
      <div><p className="font-semibold text-ink-900">{r.name}</p><p className="text-xs text-ink-500">{r.slug}</p></div>
    ) },
    { key: "brokerCount", label: "Brokers" },
    { key: "activeListingCount", label: "Active Listings" },
    { key: "status", label: "Status", render: (r) => <StatusBadge value={STATUS_LABEL[r.status] || r.status} /> },
  ];

  const getActions = (row) => [
    { label: "View agency", icon: LuEye, onClick: () => toast.push(`${row.name} — ${row.brokerCount} brokers, ${row.activeListingCount} active listings.`, "info") },
    { label: "Edit agency", icon: LuPencil, onClick: () => { setEditing(row); setModalOpen(true); }, hidden: !permissions.edit },
    { label: "Remove agency", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: !permissions.delete },
  ];

  const handleSave = async (data) => {
    const payload = { name: data.name, status: data.status || "active" };
    if (!editing && data.slug) payload.slug = data.slug;

    const res = editing
      ? await dispatch(updateAgency({ id: editing.id, ...payload }))
      : await dispatch(createAgency(payload));

    const success = editing ? updateAgency.fulfilled.match(res) : createAgency.fulfilled.match(res);
    if (success) toast.push(`${data.name} ${editing ? "updated" : "onboarded"}.`, "success");
    else toast.push(res.payload || "Something went wrong.", "error");
    setModalOpen(false);
  };

  const handleKanbanDrop = async (row, statusLabel) => {
    const nextStatus = STATUS_OPTIONS.find((s) => STATUS_LABEL[s] === statusLabel) || statusLabel;
    const res = await dispatch(updateAgency({ id: row.id, status: nextStatus }));
    if (updateAgency.fulfilled.match(res)) toast.push(`${row.name} moved to ${STATUS_LABEL[nextStatus]}.`, "success");
    else toast.push(res.payload || "Failed to update agency.", "error");
  };

  const handleDelete = async () => {
    const res = await dispatch(deleteAgency(toDelete.id));
    if (deleteAgency.fulfilled.match(res)) toast.push(`${toDelete.name} removed.`, "success");
    else toast.push(res.payload || "Failed to remove agency.", "error");
    setToDelete(null);
  };

  const agencyStats = [
    { label: "Total Agencies", value: rows.length, meta: "onboarded partners" },
    { label: "Active Agencies", value: rows.filter((row) => row.status === "active").length, meta: "currently operating" },
    { label: "Total Brokers", value: rows.reduce((sum, row) => sum + row.brokerCount, 0), meta: "across agencies" },
    { label: "Active Listings", value: rows.reduce((sum, row) => sum + row.activeListingCount, 0), meta: "managed inventory" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Agency Management"
        title="Agencies"
        subtitle="Onboard agencies and manage their brokers and inventory."
      />
      <DataTable
        columns={columns}
        data={rows}
        loading={status === "loading"}
        statsItems={agencyStats}
        toolbarActions={permissions.create ? <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary"><LuPlus className="h-4 w-4" /> Add agency</button> : undefined}
        searchKeys={["name", "slug"]}
        filters={[{ key: "status", label: "Status", options: STATUS_OPTIONS.map((s) => STATUS_LABEL[s]) }]}
        getActions={getActions}
        renderCard={(r) => (
          <div>
            <p className="font-semibold text-ink-900">{r.name}</p>
            <p className="mt-1 text-xs text-ink-500">{r.slug}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={STATUS_LABEL[r.status] || r.status} />
            </div>
            <div className="mt-3 text-xs text-ink-500">
              <p>Brokers: {r.brokerCount}</p>
              <p>Active listings: {r.activeListingCount}</p>
            </div>
          </div>
        )}
        kanban={{ key: "status", columns: STATUS_OPTIONS.map((s) => STATUS_LABEL[s]) }}
        onKanbanDrop={permissions.edit ? handleKanbanDrop : undefined}
        emptyTitle="No agencies yet"
        emptySubtitle="Agencies you onboard will manage their own brokers and listings."
      />
      <QuickFormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSave}
        title={editing ? "Edit agency" : "Add agency"}
        description="Agency admins can manage their own brokers, inventory and leads."
        fields={editing ? FIELDS.filter((f) => f.key !== "slug") : FIELDS}
        initial={editing ? { name: editing.name, status: editing.status } : { status: "active" }}
        submitLabel={editing ? "Save changes" : "Add agency"}
      />
      <ConfirmDialog
        open={!!toDelete} onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Remove this agency?" description={`${toDelete?.name} and its broker access will be revoked.`}
      />
    </div>
  );
}
