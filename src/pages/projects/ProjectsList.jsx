import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LuPlus, LuPencil, LuTrash2, LuLayoutGrid } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import { ConfirmDialog } from "../../components/common/Modal";
import QuickFormModal from "../../components/common/QuickFormModal";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";
import { ROLES } from "../../config/roles";
import {
  fetchProjects, createProject, updateProject, deleteProject, bulkDeleteProjects,
  clearProjectsError,
} from "../../redux/slices/projectsSlice";
import { fetchUsers } from "../../redux/slices/usersSlice";
import UnitsModal from "./UnitsModal";

const PROJECT_STATUSES = ["draft", "upcoming", "ongoing", "completed", "on_hold"];
const STATUS_LABEL = {
  draft: "Draft", upcoming: "Upcoming", ongoing: "Ongoing", completed: "Completed", on_hold: "On Hold",
};

const FIELDS = [
  { key: "name", label: "Project name", placeholder: "e.g. Palm Grove Villas" },
  { key: "city", label: "City", placeholder: "e.g. Pune" },
  { key: "locality", label: "Locality", placeholder: "e.g. Baner" },
  { key: "address", label: "Address", placeholder: "Full address" },
  { key: "description", label: "Description", placeholder: "Short project summary", full: true },
];

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

export default function ProjectsList() {
  const toast = useToast();
  const dispatch = useDispatch();
  const { user, role, permissions } = useAuth();
  const { list: rows, status } = useSelector((s) => s.projects);
  const { list: users } = useSelector((s) => s.users);

  const canCreate = role === ROLES.BUILDER || role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
  const canDelete = role === ROLES.BUILDER || role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
  const isBuilder = role === ROLES.BUILDER;

  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState(null);
  const [unitsTarget, setUnitsTarget] = useState(null);

  useEffect(() => {
    dispatch(fetchProjects({ limit: 100 }));
    if (!isBuilder) dispatch(fetchUsers({ role: ROLES.BUILDER, limit: 100 }));
    return () => dispatch(clearProjectsError());
  }, [dispatch, isBuilder]);

  const builderOptions = useMemo(
    () => users.filter((u) => u.role === ROLES.BUILDER).map((u) => ({ value: u.id, label: u.name })),
    [users]
  );

  const builderName = (builderId) => {
    if (isBuilder && builderId === user?.id) return user?.name || "You";
    return users.find((u) => u.id === builderId)?.name || "—";
  };

  const rowsWithBuilder = useMemo(
    () => rows.map((p) => ({ ...p, builderName: builderName(p.builderId) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, users]
  );

  const columns = [
    { key: "name", label: "Project", render: (r) => (
      <div><p className="font-semibold text-ink-900">{r.name}</p><p className="text-xs text-ink-500">{[r.locality, r.city].filter(Boolean).join(", ") || "—"}</p></div>
    ) },
    { key: "builderName", label: "Builder" },
    { key: "status", label: "Status", render: (r) => <StatusBadge value={STATUS_LABEL[r.status] || r.status} /> },
    { key: "createdAt", label: "Created", render: (r) => <span className="text-xs text-ink-500">{formatDate(r.createdAt)}</span> },
  ];

  const getActions = (row) => [
    { label: "Manage units", icon: LuLayoutGrid, onClick: () => setUnitsTarget(row) },
    { label: "Edit project", icon: LuPencil, onClick: () => { setEditing(row); setModalOpen(true); }, hidden: !permissions.edit },
    { label: "Delete project", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: !canDelete },
  ];

  const handleSave = async (data) => {
    const payload = {
      name: data.name,
      city: data.city,
      locality: data.locality || undefined,
      address: data.address || undefined,
      description: data.description || undefined,
    };
    if (editing) {
      const res = await dispatch(updateProject({ id: editing.id, ...payload }));
      if (updateProject.fulfilled.match(res)) toast.push(`${data.name} updated.`, "success");
      else toast.push(res.payload || "Failed to update project.", "error");
    } else {
      if (!isBuilder) payload.builderId = data.builderId;
      const res = await dispatch(createProject(payload));
      if (createProject.fulfilled.match(res)) toast.push(`${data.name} created.`, "success");
      else toast.push(res.payload || "Failed to create project.", "error");
    }
    setModalOpen(false);
  };

  const handleKanbanDrop = async (row, statusLabel) => {
    const nextStatus = PROJECT_STATUSES.find((s) => STATUS_LABEL[s] === statusLabel) || statusLabel;
    const res = await dispatch(updateProject({ id: row.id, status: nextStatus }));
    if (updateProject.fulfilled.match(res)) toast.push(`${row.name} moved to ${STATUS_LABEL[nextStatus]}.`, "success");
    else toast.push(res.payload || "Failed to update project.", "error");
  };

  const confirmDelete = async () => {
    const res = await dispatch(deleteProject(toDelete.id));
    if (deleteProject.fulfilled.match(res)) toast.push(`${toDelete.name} deleted.`, "success");
    else toast.push(res.payload || "Failed to delete project.", "error");
    setToDelete(null);
  };

  const confirmBulkDelete = async () => {
    const res = await dispatch(bulkDeleteProjects(bulkDeleteIds));
    if (bulkDeleteProjects.fulfilled.match(res)) toast.push(`${res.payload.deletedCount} project(s) deleted.`, "success");
    else toast.push(res.payload || "Failed to delete projects.", "error");
    setBulkDeleteIds(null);
  };

  const projectStats = [
    { label: "Total Projects", value: rows.length, meta: "builder portfolios" },
    { label: "Ongoing", value: rows.filter((r) => r.status === "ongoing").length, meta: "under construction" },
    { label: "Upcoming", value: rows.filter((r) => r.status === "upcoming").length, meta: "launching soon" },
    { label: "Completed", value: rows.filter((r) => r.status === "completed").length, meta: "ready to move" },
  ];

  const CREATE_FIELDS = isBuilder ? FIELDS : [
    ...FIELDS.slice(0, 1),
    { key: "builderId", label: "Builder", type: "select", options: builderOptions },
    ...FIELDS.slice(1),
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Builder Inventory"
        title="Projects"
        subtitle="Manage builder projects and the units within them."
      />
      <DataTable
        columns={columns}
        data={rowsWithBuilder}
        statsItems={projectStats}
        loading={status === "loading"}
        toolbarActions={canCreate ? <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary"><LuPlus className="h-4 w-4" /> Add project</button> : undefined}
        searchKeys={["name", "city", "locality", "builderName"]}
        filters={[{ key: "status", label: "Status", options: PROJECT_STATUSES.map((s) => STATUS_LABEL[s]) }]}
        getActions={getActions}
        onBulkDelete={canDelete ? setBulkDeleteIds : undefined}
        renderCard={(r) => (
          <div>
            <p className="font-semibold text-ink-900">{r.name}</p>
            <p className="mt-1 text-xs text-ink-500">{[r.locality, r.city].filter(Boolean).join(", ") || "—"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={STATUS_LABEL[r.status] || r.status} />
            </div>
            <p className="mt-3 text-xs text-ink-500">Builder: {r.builderName}</p>
          </div>
        )}
        kanban={{ key: "status", columns: PROJECT_STATUSES.map((s) => STATUS_LABEL[s]) }}
        onKanbanDrop={permissions.edit ? handleKanbanDrop : undefined}
        emptyTitle="No projects yet"
        emptySubtitle="Projects created by builders will appear here with their unit inventory."
      />
      <QuickFormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSave}
        title={editing ? "Edit project" : "Add project"}
        description={editing ? "Update this project's details." : "New projects start in the Draft stage."}
        fields={editing ? FIELDS : CREATE_FIELDS}
        initial={editing || {}}
        submitLabel={editing ? "Save changes" : "Create project"}
      />
      <ConfirmDialog
        open={!!toDelete} onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this project?"
        description={`${toDelete?.name} and all of its units will be permanently removed.`}
      />
      <ConfirmDialog
        open={!!bulkDeleteIds} onClose={() => setBulkDeleteIds(null)}
        onConfirm={confirmBulkDelete}
        title={`Delete ${bulkDeleteIds?.length || 0} projects?`}
        description="These projects and all of their units will be permanently removed."
      />
      <UnitsModal
        project={unitsTarget}
        open={!!unitsTarget}
        onClose={() => setUnitsTarget(null)}
        canManage={canDelete}
      />
    </div>
  );
}
