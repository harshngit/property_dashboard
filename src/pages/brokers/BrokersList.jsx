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
import { fetchLeads } from "../../redux/slices/leadsSlice";

const STATUS_OPTIONS = ["active", "pending_approval", "suspended", "inactive"];
const STATUS_LABEL = { active: "Active", pending_approval: "Pending Approval", suspended: "Suspended", inactive: "Inactive" };
const STATUS_CLASS = {
  active: "bg-green-50 text-green-700",
  pending_approval: "bg-amber-50 text-amber-700",
  suspended: "bg-coral-50 text-coral-700",
  inactive: "bg-ink-100 text-ink-500",
};

const FIELDS = [
  { key: "fullName", label: "Broker name", placeholder: "e.g. Priya Menon" },
  { key: "email", label: "Email", placeholder: "name@propertyserch.com" },
  { key: "mobile", label: "Mobile", placeholder: "9876543210" },
  { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s] })) },
];

const INVITE_FIELDS = [
  { key: "fullName", label: "Broker name", placeholder: "e.g. Priya Menon" },
  { key: "email", label: "Email", placeholder: "name@propertyserch.com" },
  { key: "mobile", label: "Mobile", placeholder: "9876543210" },
  { key: "password", label: "Temporary password", type: "password", placeholder: "••••••••" },
];

export default function BrokersList() {
  const toast = useToast();
  const dispatch = useDispatch();
  const { user, permissions } = useAuth();
  const { list: users, status } = useSelector((s) => s.users);
  const { list: leads } = useSelector((s) => s.leads);
  const { registeredUser, error: inviteError, status: inviteStatus } = useSelector((s) => s.auth);

  const [toDelete, setToDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchUsers({ role: ROLES.BROKER, limit: 100 }));
    dispatch(fetchLeads({ limit: 100 }));
    return () => dispatch(clearUsersError());
  }, [dispatch]);

  useEffect(() => {
    if (registeredUser) {
      toast.push(`${registeredUser.name} invited as a broker.`, "success");
      setInviteOpen(false);
      dispatch(clearRegisteredUser());
      dispatch(fetchUsers({ role: ROLES.BROKER, limit: 100 }));
    }
  }, [registeredUser, toast, dispatch]);

  useEffect(() => {
    if (inviteStatus === "failed" && inviteError && inviteOpen) {
      toast.push(inviteError, "error");
      dispatch(clearAuthError());
    }
  }, [inviteStatus, inviteError, inviteOpen, toast, dispatch]);

  // No bulk "broker performance" endpoint exists on the backend - these are
  // derived client-side from the already-loaded leads list (same data the
  // Leads page uses), grouped by assignedTo.
  const rows = useMemo(() => users.map((u) => {
    const assigned = leads.filter((l) => l.assignedTo === u.id);
    const won = assigned.filter((l) => l.status === "won");
    return {
      ...u,
      leadsAssigned: assigned.length,
      dealsWon: won.length,
      conversion: assigned.length ? `${Math.round((won.length / assigned.length) * 100)}%` : "0%",
    };
  }), [users, leads]);

  const columns = [
    {
      key: "name", label: "Broker",
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} size={32} src={r.profilePictureUrl} color="#FF7A59" />
          <div>
            <p className="font-semibold text-ink-900">{r.name}</p>
            <p className="text-xs text-ink-500">{r.tenantName || "No agency"}</p>
          </div>
        </div>
      ),
    },
    { key: "mobile", label: "Contact", render: (r) => <span className="text-ink-500">{r.mobile || r.email || "—"}</span> },
    { key: "leadsAssigned", label: "Leads Assigned" },
    { key: "dealsWon", label: "Deals Won" },
    { key: "conversion", label: "Conversion" },
    { key: "status", label: "Status", render: (r) => (
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${STATUS_CLASS[r.status] || "bg-surface-sunk text-ink-500"}`}>
        {STATUS_LABEL[r.status] || r.status}
      </span>
    ) },
  ];

  const openEdit = (row) => { setEditing(row); setEditOpen(true); };

  const getActions = (row) => [
    { label: "View performance", icon: LuEye, onClick: () => toast.push(`${row.name}: ${row.leadsAssigned} leads, ${row.dealsWon} won, ${row.conversion} conversion.`, "info") },
    { label: "Edit broker", icon: LuPencil, onClick: () => openEdit(row), hidden: !permissions.edit },
    { label: "Activate account", icon: LuCircleCheck, onClick: () => handleActivate(row), hidden: row.status !== "pending_approval" },
    { label: "Deactivate", icon: LuUserX, onClick: () => handleStatus(row, "inactive"), hidden: !permissions.edit || row.status === "inactive" },
    { label: "Remove broker", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: !permissions.delete },
  ];

  const handleActivate = async (row) => {
    const res = await dispatch(activateUserAccount(row.id));
    if (activateUserAccount.fulfilled.match(res)) {
      toast.push(`${row.name} activated.`, "success");
      dispatch(fetchUsers({ role: ROLES.BROKER, limit: 100 }));
    } else {
      toast.push(res.payload || "Failed to activate broker.", "error");
    }
  };

  const handleStatus = async (row, newStatus) => {
    const res = await dispatch(updateUser({ id: row.id, status: newStatus }));
    if (updateUser.fulfilled.match(res)) toast.push(`${row.name} marked ${STATUS_LABEL[newStatus].toLowerCase()}.`, "success");
    else toast.push(res.payload || "Failed to update broker.", "error");
  };

  const handleEditSave = async (data) => {
    const res = await dispatch(updateUser({ id: editing.id, ...data }));
    if (updateUser.fulfilled.match(res)) toast.push(`${data.fullName || editing.name} updated.`, "success");
    else toast.push(res.payload || "Failed to update broker.", "error");
    setEditOpen(false);
  };

  const handleInvite = (data) => {
    dispatch(registerUser({ ...data, role: ROLES.BROKER, tenantId: user?.tenantId ?? null }));
  };

  const handleDelete = async () => {
    const res = await dispatch(deleteUser(toDelete.id));
    if (deleteUser.fulfilled.match(res)) toast.push(`${toDelete.name} removed.`, "success");
    else toast.push(res.payload || "Failed to remove broker.", "error");
    setToDelete(null);
  };

  const handleKanbanDrop = (row, newStatus) => handleStatus(row, newStatus);

  const brokerStats = [
    { label: "Total Brokers", value: rows.length, meta: "registered accounts" },
    { label: "Active Brokers", value: rows.filter((row) => row.status === "active").length, meta: "currently taking leads" },
    { label: "Assigned Leads", value: rows.reduce((sum, row) => sum + row.leadsAssigned, 0), meta: "open assignments" },
    { label: "Deals Won", value: rows.reduce((sum, row) => sum + row.dealsWon, 0), meta: "converted opportunities" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Broker CRM"
        title="Brokers"
        subtitle="Manage broker accounts, assigned leads and performance."
      />
      <DataTable
        columns={columns}
        data={rows}
        statsItems={brokerStats}
        loading={status === "loading"}
        toolbarActions={permissions.create ? <button onClick={() => setInviteOpen(true)} className="btn-primary"><LuPlus className="h-4 w-4" /> Add broker</button> : undefined}
        searchKeys={["name", "email", "mobile", "tenantName"]}
        filters={[{ key: "status", label: "Status", options: STATUS_OPTIONS }]}
        getActions={getActions}
        renderCard={(r) => (
          <div>
            <div className="flex items-center gap-3">
              <Avatar name={r.name} size={36} src={r.profilePictureUrl} color="#FF7A59" />
              <div>
                <p className="font-semibold text-ink-900">{r.name}</p>
                <p className="text-xs text-ink-500">{r.tenantName || "No agency"}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_CLASS[r.status] || "bg-surface-sunk text-ink-500"}`}>{STATUS_LABEL[r.status] || r.status}</span>
            </div>
            <div className="mt-3 text-xs text-ink-500">
              <p>Leads: {r.leadsAssigned}</p>
              <p>Deals: {r.dealsWon} • Conversion: {r.conversion}</p>
            </div>
          </div>
        )}
        kanban={{ key: "status", columns: STATUS_OPTIONS }}
        onKanbanDrop={permissions.edit ? handleKanbanDrop : undefined}
        onExport={permissions.export ? () => toast.push("Exporting brokers to CSV…", "info") : undefined}
        emptyTitle="No brokers yet"
        emptySubtitle="Invite brokers to start assigning them leads and listings."
      />
      <QuickFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSave}
        title="Edit broker"
        description="Update this broker's profile and status."
        fields={FIELDS}
        initial={editing || {}}
        submitLabel="Save changes"
      />
      <QuickFormModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSubmit={handleInvite}
        title="Add broker"
        description="Broker accounts always start pending approval - use Activate on this list once you're ready to give them access."
        fields={INVITE_FIELDS}
        initial={{}}
        submitLabel="Add broker"
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Remove this broker?"
        description={`${toDelete?.name}'s assigned leads will need to be reassigned.`}
      />
    </div>
  );
}
