import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LuPlus, LuEye, LuPencil, LuTrash2, LuUserX, LuCircleCheck } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import Avatar from "../../components/common/Avatar";
import { ConfirmDialog } from "../../components/common/Modal";
import QuickFormModal from "../../components/common/QuickFormModal";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";
import { ROLES } from "../../config/roles";
import { fetchUsers, updateUser, deleteUser, clearUsersError } from "../../redux/slices/usersSlice";
import { activateUserAccount, registerUser, clearAuthError, clearRegisteredUser } from "../../redux/slices/authSlice";
import { fetchProjects } from "../../redux/slices/projectsSlice";

const STATUS_OPTIONS = ["active", "pending_approval", "suspended", "inactive"];
const STATUS_LABEL = { active: "Active", pending_approval: "Pending Approval", suspended: "Suspended", inactive: "Inactive" };
const STATUS_CLASS = {
  active: "bg-green-50 text-green-700",
  pending_approval: "bg-amber-50 text-amber-700",
  suspended: "bg-coral-50 text-coral-700",
  inactive: "bg-ink-100 text-ink-500",
};

const FIELDS = [
  { key: "fullName", label: "Builder / Developer", placeholder: "e.g. Desai Developers" },
  { key: "email", label: "Email", placeholder: "name@propertyserch.com" },
  { key: "mobile", label: "Mobile", placeholder: "9876543210" },
  { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s] })) },
];

const INVITE_FIELDS = [
  { key: "fullName", label: "Builder / Developer", placeholder: "e.g. Desai Developers" },
  { key: "email", label: "Email", placeholder: "name@propertyserch.com" },
  { key: "mobile", label: "Mobile", placeholder: "9876543210" },
  { key: "password", label: "Temporary password", type: "password", placeholder: "••••••••" },
];

export default function BuildersList() {
  const toast = useToast();
  const dispatch = useDispatch();
  const { user, permissions } = useAuth();
  const { list: users, status } = useSelector((s) => s.users);
  const { list: projects } = useSelector((s) => s.projects);
  const { registeredUser, error: inviteError, status: inviteStatus } = useSelector((s) => s.auth);

  const [toDelete, setToDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchUsers({ role: ROLES.BUILDER, limit: 100 }));
    dispatch(fetchProjects({ limit: 100 }));
    return () => dispatch(clearUsersError());
  }, [dispatch]);

  useEffect(() => {
    if (registeredUser) {
      toast.push(`${registeredUser.name} onboarded as a builder.`, "success");
      setInviteOpen(false);
      dispatch(clearRegisteredUser());
      dispatch(fetchUsers({ role: ROLES.BUILDER, limit: 100 }));
    }
  }, [registeredUser, toast, dispatch]);

  useEffect(() => {
    if (inviteStatus === "failed" && inviteError && inviteOpen) {
      toast.push(inviteError, "error");
      dispatch(clearAuthError());
    }
  }, [inviteStatus, inviteError, inviteOpen, toast, dispatch]);

  // No dedicated builder-portfolio endpoint exists - project counts are
  // derived client-side from the already-loaded projects list, grouped by
  // builder_id (same pattern BrokersList uses for leadsAssigned/dealsWon).
  // Units aren't included on a project row (no cheap aggregate endpoint
  // exists), so that column is left as "—" rather than faked.
  const rows = useMemo(() => users.map((u) => {
    const ownProjects = projects.filter((p) => p.builderId === u.id);
    return {
      ...u,
      projectCount: ownProjects.length,
      liveProjectCount: ownProjects.filter((p) => p.status === "ongoing" || p.status === "upcoming").length,
    };
  }), [users, projects]);

  const columns = [
    {
      key: "name", label: "Builder",
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} size={32} src={r.profilePictureUrl} color="#F59E0B" />
          <div>
            <p className="font-semibold text-ink-900">{r.name}</p>
            <p className="text-xs text-ink-500">{r.tenantName || "Independent"}</p>
          </div>
        </div>
      ),
    },
    { key: "mobile", label: "Contact", render: (r) => <span className="text-ink-500">{r.mobile || r.email || "—"}</span> },
    { key: "projectCount", label: "Projects" },
    { key: "liveProjectCount", label: "Live Projects" },
    { key: "status", label: "Status", render: (r) => (
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${STATUS_CLASS[r.status] || "bg-surface-sunk text-ink-500"}`}>
        {STATUS_LABEL[r.status] || r.status}
      </span>
    ) },
  ];

  const openEdit = (row) => { setEditing(row); setEditOpen(true); };

  const getActions = (row) => [
    { label: "View projects", icon: LuEye, onClick: () => toast.push(`${row.name} has ${row.projectCount} project(s).`, "info") },
    { label: "Edit builder", icon: LuPencil, onClick: () => openEdit(row), hidden: !permissions.edit },
    { label: "Activate account", icon: LuCircleCheck, onClick: () => handleActivate(row), hidden: row.status !== "pending_approval" },
    { label: "Deactivate", icon: LuUserX, onClick: () => handleStatus(row, "inactive"), hidden: !permissions.edit || row.status === "inactive" },
    { label: "Remove builder", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: !permissions.delete },
  ];

  const handleActivate = async (row) => {
    const res = await dispatch(activateUserAccount(row.id));
    if (activateUserAccount.fulfilled.match(res)) {
      toast.push(`${row.name} activated.`, "success");
      dispatch(fetchUsers({ role: ROLES.BUILDER, limit: 100 }));
    } else {
      toast.push(res.payload || "Failed to activate builder.", "error");
    }
  };

  const handleStatus = async (row, newStatus) => {
    const res = await dispatch(updateUser({ id: row.id, status: newStatus }));
    if (updateUser.fulfilled.match(res)) toast.push(`${row.name} marked ${STATUS_LABEL[newStatus].toLowerCase()}.`, "success");
    else toast.push(res.payload || "Failed to update builder.", "error");
  };

  const handleEditSave = async (data) => {
    const res = await dispatch(updateUser({ id: editing.id, ...data }));
    if (updateUser.fulfilled.match(res)) toast.push(`${data.fullName || editing.name} updated.`, "success");
    else toast.push(res.payload || "Failed to update builder.", "error");
    setEditOpen(false);
  };

  const handleInvite = (data) => {
    dispatch(registerUser({ ...data, role: ROLES.BUILDER, tenantId: user?.tenantId ?? null }));
  };

  const handleDelete = async () => {
    const res = await dispatch(deleteUser(toDelete.id));
    if (deleteUser.fulfilled.match(res)) toast.push(`${toDelete.name} removed.`, "success");
    else toast.push(res.payload || "Failed to remove builder.", "error");
    setToDelete(null);
  };

  const handleKanbanDrop = (row, newStatus) => handleStatus(row, newStatus);

  const builderStats = [
    { label: "Total Builders", value: rows.length, meta: "partner developers" },
    { label: "Active Builders", value: rows.filter((row) => row.status === "active").length, meta: "currently enabled" },
    { label: "Projects", value: rows.reduce((sum, row) => sum + row.projectCount, 0), meta: "total portfolios" },
    { label: "Live Projects", value: rows.reduce((sum, row) => sum + row.liveProjectCount, 0), meta: "upcoming or ongoing" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Builder Management"
        title="Builders"
        subtitle="Manage builder accounts, projects and unit inventory."
      />
      <DataTable
        columns={columns}
        data={rows}
        loading={status === "loading"}
        statsItems={builderStats}
        toolbarActions={permissions.create ? <button onClick={() => setInviteOpen(true)} className="btn-primary"><LuPlus className="h-4 w-4" /> Add builder</button> : undefined}
        searchKeys={["name", "email", "mobile", "tenantName"]}
        filters={[{ key: "status", label: "Status", options: STATUS_OPTIONS }]}
        getActions={getActions}
        renderCard={(r) => (
          <div>
            <div className="flex items-center gap-3">
              <Avatar name={r.name} size={36} src={r.profilePictureUrl} color="#F59E0B" />
              <div>
                <p className="font-semibold text-ink-900">{r.name}</p>
                <p className="text-xs text-ink-500">{r.tenantName || "Independent"}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_CLASS[r.status] || "bg-surface-sunk text-ink-500"}`}>{STATUS_LABEL[r.status] || r.status}</span>
            </div>
            <div className="mt-3 text-xs text-ink-500">
              <p>Projects: {r.projectCount}</p>
              <p>Live: {r.liveProjectCount}</p>
            </div>
          </div>
        )}
        kanban={{ key: "status", columns: STATUS_OPTIONS }}
        onKanbanDrop={permissions.edit ? handleKanbanDrop : undefined}
        onExport={permissions.export ? () => toast.push("Exporting builders to CSV…", "info") : undefined}
        emptyTitle="No builders yet"
        emptySubtitle="Onboard builders to start managing their projects and units."
      />
      <QuickFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSave}
        title="Edit builder"
        description="Update this builder's profile and status."
        fields={FIELDS}
        initial={editing || {}}
        submitLabel="Save changes"
      />
      <QuickFormModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={handleInvite}
        title="Add builder"
        description="Builder accounts always start pending approval - use Activate on this list once you're ready to give them access."
        fields={INVITE_FIELDS}
        initial={{}}
        submitLabel="Add builder"
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Remove this builder?"
        description={`${toDelete?.name}'s projects and units will need to be reassigned.`}
      />
    </div>
  );
}
