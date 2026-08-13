import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LuPlus, LuPencil, LuTrash2, LuShieldCheck, LuKeyRound, LuCircleCheck, LuCheck, LuX, LuMail, LuClock, LuCalendar } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import Avatar from "../../components/common/Avatar";
import { ConfirmDialog } from "../../components/common/Modal";
import QuickFormModal from "../../components/common/QuickFormModal";
import { ROLES, ROLE_LABELS, ROLE_BADGE_CLASS } from "../../config/roles";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";
import {
  fetchUsers, updateUser, deleteUser, changeUserRole, resetUserPassword, clearUsersError,
} from "../../redux/slices/usersSlice";
import { registerUser, activateUserAccount, clearAuthError, clearRegisteredUser } from "../../redux/slices/authSlice";

const STATUS_OPTIONS = ["active", "pending_approval", "suspended"];
const STATUS_LABEL = { active: "Active", pending_approval: "Pending approval", suspended: "Suspended" };
const STATUS_CLASS = {
  active: "bg-green-50 text-green-700",
  pending_approval: "bg-amber-50 text-amber-700",
  suspended: "bg-coral-50 text-coral-700",
};

const assignableRoles = (currentRole) => {
  if (currentRole === ROLES.SUPER_ADMIN) return Object.values(ROLES);
  if (currentRole === ROLES.ADMIN) {
    return [ROLES.CUSTOMER, ROLES.BROKER, ROLES.AGENCY_ADMIN, ROLES.BUILDER, ROLES.SALES];
  }
  return [];
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

const formatDateTime = (iso) => {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export default function UsersPage() {
  const dispatch = useDispatch();
  const toast = useToast();
  const { user, role } = useAuth();
  const { list: rows, status } = useSelector((s) => s.users);
  const { registeredUser, error: inviteError, status: inviteStatus } = useSelector((s) => s.auth);

  const [toDelete, setToDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState(null);
  const [pwTarget, setPwTarget] = useState(null);

  useEffect(() => {
    dispatch(fetchUsers({ limit: 100 }));
    return () => dispatch(clearUsersError());
  }, [dispatch]);

  const canInvite = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
  const canChangeRole = role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
  const roleOptions = useMemo(() => assignableRoles(role), [role]);

  const EDIT_FIELDS = useMemo(() => {
    const fields = [
      { key: "fullName", label: "Full name", placeholder: "e.g. Jane Doe" },
      { key: "email", label: "Email", placeholder: "name@propertyserch.com" },
      { key: "mobile", label: "Mobile", placeholder: "9876543210" },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s] })) },
    ];
    if (role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN) {
      fields.push({ key: "tenantId", label: "Tenant ID", placeholder: "Optional" });
    }
    return fields;
  }, [role]);

  const INVITE_FIELDS = useMemo(() => [
    { key: "fullName", label: "Full name", placeholder: "e.g. Jane Doe" },
    { key: "email", label: "Email", placeholder: "name@propertyserch.com" },
    { key: "mobile", label: "Mobile", placeholder: "9876543210" },
    { key: "password", label: "Temporary password", type: "password", placeholder: "••••••••" },
    { key: "role", label: "Role", type: "select", options: roleOptions.map((r) => ({ value: r, label: ROLE_LABELS[r] })) },
  ], [roleOptions]);

  const ROLE_FIELDS = useMemo(() => [
    { key: "role", label: "New role", type: "select", options: roleOptions.map((r) => ({ value: r, label: ROLE_LABELS[r] })) },
  ], [roleOptions]);

  const PASSWORD_FIELDS = [
    { key: "newPassword", label: "New password", type: "password", placeholder: "••••••••" },
  ];

  useEffect(() => {
    if (registeredUser) {
      toast.push(`${registeredUser.name} invited.`, "success");
      setInviteOpen(false);
      dispatch(clearRegisteredUser());
      dispatch(fetchUsers({ limit: 100 }));
    }
  }, [registeredUser, toast, dispatch]);

  useEffect(() => {
    if (inviteStatus === "failed" && inviteError && inviteOpen) {
      toast.push(inviteError, "error");
      dispatch(clearAuthError());
    }
  }, [inviteStatus, inviteError, inviteOpen, toast, dispatch]);

  const columns = [
    { key: "name", label: "User", render: (r) => (
      <div className="flex items-center gap-3">
        <Avatar name={r.name} size={32} src={r.profilePictureUrl} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-ink-900 truncate">{r.name}</p>
            <span
              title={r.emailVerified ? "Email verified" : "Email not verified"}
              className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${r.emailVerified ? "bg-green-100 text-green-600" : "bg-ink-100 text-ink-400"}`}
            >
              <LuMail className="h-2.5 w-2.5" />
            </span>
          </div>
          <p className="text-xs text-ink-500 truncate">{r.email}</p>
          {r.tenantId && <p className="text-[11px] text-ink-400 truncate">Tenant: {r.tenantId}</p>}
        </div>
      </div>
    ) },
    { key: "role", label: "Role", render: (r) => <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${ROLE_BADGE_CLASS[r.role]}`}>{ROLE_LABELS[r.role] || r.role}</span> },
    { key: "mobile", label: "Mobile", render: (r) => (
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-ink-500">{r.mobile || "—"}</span>
        {r.mobile && (
          <span title={r.mobileVerified ? "Mobile verified" : "Mobile not verified"} className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${r.mobileVerified ? "bg-green-100 text-green-600" : "bg-ink-100 text-ink-400"}`}>
            {r.mobileVerified ? <LuCheck className="h-2.5 w-2.5" /> : <LuX className="h-2.5 w-2.5" />}
          </span>
        )}
      </div>
    ) },
    { key: "status", label: "Status", render: (r) => (
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${STATUS_CLASS[r.status] || "bg-surface-sunk text-ink-500"}`}>
        {STATUS_LABEL[r.status] || r.status || "—"}
      </span>
    ) },
    { key: "createdAt", label: "Created", render: (r) => (
      <div className="flex items-center gap-1.5 text-ink-500 whitespace-nowrap">
        <LuCalendar className="h-3.5 w-3.5 shrink-0 text-ink-400" />
        <span className="text-xs">{formatDate(r.createdAt)}</span>
      </div>
    ) },
    { key: "lastLoginAt", label: "Last Login", render: (r) => (
      <div className="flex items-center gap-1.5 text-ink-500 whitespace-nowrap">
        <LuClock className="h-3.5 w-3.5 shrink-0 text-ink-400" />
        <span className="text-xs">{formatDateTime(r.lastLoginAt)}</span>
      </div>
    ) },
  ];

  const getActions = (row) => [
    { label: "Edit user", icon: LuPencil, onClick: () => { setEditing(row); setEditOpen(true); } },
    { label: "Change role", icon: LuShieldCheck, onClick: () => setRoleTarget(row), hidden: !canChangeRole },
    { label: "Activate account", icon: LuCircleCheck, onClick: () => handleActivate(row), hidden: row.status !== "pending_approval" },
    { label: "Reset password", icon: LuKeyRound, onClick: () => setPwTarget(row) },
    { label: "Remove user", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: row.id === user?.id },
  ];

  const handleActivate = async (row) => {
    const res = await dispatch(activateUserAccount(row.id));
    if (activateUserAccount.fulfilled.match(res)) {
      toast.push(`${row.name} activated.`, "success");
      dispatch(fetchUsers({ limit: 100 }));
    } else {
      toast.push(res.payload || "Failed to activate user.", "error");
    }
  };

  const handleEditSave = async (data) => {
    const res = await dispatch(updateUser({ id: editing.id, ...data }));
    if (updateUser.fulfilled.match(res)) {
      toast.push(`${data.fullName || editing.name} updated.`, "success");
    } else {
      toast.push(res.payload || "Failed to update user.", "error");
    }
    setEditOpen(false);
  };

  const handleInvite = async (data) => {
    dispatch(registerUser({ ...data, tenantId: user?.tenantId ?? null }));
  };

  const handleRoleSave = async (data) => {
    const res = await dispatch(changeUserRole({ id: roleTarget.id, role: data.role }));
    if (changeUserRole.fulfilled.match(res)) {
      toast.push(`${roleTarget.name}'s role updated.`, "success");
    } else {
      toast.push(res.payload || "Failed to change role.", "error");
    }
    setRoleTarget(null);
  };

  const handlePasswordSave = async (data) => {
    const res = await dispatch(resetUserPassword({ id: pwTarget.id, newPassword: data.newPassword }));
    if (resetUserPassword.fulfilled.match(res)) {
      toast.push(`Password reset for ${pwTarget.name}. Their sessions have been revoked.`, "success");
    } else {
      toast.push(res.payload || "Failed to reset password.", "error");
    }
    setPwTarget(null);
  };

  const handleDelete = async () => {
    const res = await dispatch(deleteUser(toDelete.id));
    if (deleteUser.fulfilled.match(res)) {
      toast.push(`${toDelete.name} removed.`, "success");
    } else {
      toast.push(res.payload || "Failed to remove user.", "error");
    }
    setToDelete(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Users & Roles"
        title="Team members"
        subtitle="Manage user accounts, tenant access and role-based permissions."
        actions={canInvite && <button onClick={() => setInviteOpen(true)} className="btn-primary"><LuPlus className="h-4 w-4" /> Invite user</button>}
      />
      <DataTable
        columns={columns}
        data={rows}
        loading={status === "loading"}
        searchKeys={["name", "email", "mobile", "role", "tenantId"]}
        filters={[
          { key: "role", label: "Role", options: Object.values(ROLES) },
          { key: "status", label: "Status", options: STATUS_OPTIONS },
        ]}
        getActions={getActions}
        emptyTitle="No users yet"
        emptySubtitle="Invited users will appear here with their assigned role."
      />

      <QuickFormModal
        open={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleEditSave}
        title="Edit user"
        description="Update this user's profile details."
        fields={EDIT_FIELDS} initial={editing || {}}
        submitLabel="Save changes"
      />

      <QuickFormModal
        open={inviteOpen} onClose={() => setInviteOpen(false)} onSubmit={handleInvite}
        title="Invite user"
        description="New users get access scoped to their role and tenant."
        fields={INVITE_FIELDS} initial={{ role: roleOptions[0] }}
        submitLabel="Send invite"
      />

      <QuickFormModal
        open={!!roleTarget} onClose={() => setRoleTarget(null)} onSubmit={handleRoleSave}
        title="Change role" description={roleTarget ? `Update the role for ${roleTarget.name}.` : ""}
        fields={ROLE_FIELDS} initial={{ role: roleTarget?.role }}
        submitLabel="Update role"
      />

      <QuickFormModal
        open={!!pwTarget} onClose={() => setPwTarget(null)} onSubmit={handlePasswordSave}
        title="Reset password" description={pwTarget ? `Set a new password for ${pwTarget.name}. This revokes their active sessions.` : ""}
        fields={PASSWORD_FIELDS} initial={{}}
        submitLabel="Reset password"
      />

      <ConfirmDialog
        open={!!toDelete} onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Remove this user?" description={`${toDelete?.name} will lose access immediately.`}
      />
    </div>
  );
}
