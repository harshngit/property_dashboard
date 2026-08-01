import { useState } from "react";
import { LuPlus, LuPencil, LuTrash2, LuShieldCheck } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import Avatar from "../../components/common/Avatar";
import { ConfirmDialog } from "../../components/common/Modal";
import QuickFormModal from "../../components/common/QuickFormModal";
import { MOCK_USERS } from "../../data/mockData";
import { ROLES, ROLE_LABELS, ROLE_BADGE_CLASS } from "../../config/roles";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";

const FIELDS = [
  { key: "name", label: "Full name", placeholder: "e.g. Jane Doe" },
  { key: "email", label: "Email", placeholder: "name@propertyserch.com" },
  { key: "agency", label: "Agency / Company", placeholder: "e.g. Skyline Realty" },
  { key: "role", label: "Role", type: "select", options: Object.values(ROLES).map((r) => ({ value: r, label: ROLE_LABELS[r] })) },
];

export default function UsersPage() {
  const toast = useToast();
  const { permissions } = useAuth();
  const [rows, setRows] = useState(MOCK_USERS);
  const [toDelete, setToDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const columns = [
    { key: "name", label: "User", render: (r) => (
      <div className="flex items-center gap-3">
        <Avatar name={r.name} color={r.avatarColor} size={32} />
        <div><p className="font-semibold text-ink-900">{r.name}</p><p className="text-xs text-ink-500">{r.email}</p></div>
      </div>
    ) },
    { key: "role", label: "Role", render: (r) => <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ROLE_BADGE_CLASS[r.role]}`}>{ROLE_LABELS[r.role]}</span> },
    { key: "agency", label: "Agency / Company" },
  ];

  const getActions = (row) => [
    { label: "Edit user", icon: LuPencil, onClick: () => { setEditing(row); setModalOpen(true); }, hidden: !permissions.edit },
    { label: "Manage permissions", icon: LuShieldCheck, onClick: () => toast.push(`Opening permission matrix for ${row.name}…`, "info") },
    { label: "Remove user", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: !permissions.delete },
  ];

  const handleSave = (data) => {
    if (editing) {
      setRows((r) => r.map((x) => (x.id === editing.id ? { ...x, ...data } : x)));
      toast.push(`${data.name} updated.`, "success");
    } else {
      setRows((r) => [{ id: `u_${Date.now()}`, avatarColor: "#2B3A67", ...data }, ...r]);
      toast.push(`${data.name} invited.`, "success");
    }
    setModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Users & Roles"
        title="Team members"
        subtitle="Manage user accounts, tenant access and role-based permissions."
        actions={permissions.create && <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary"><LuPlus className="h-4 w-4" /> Invite user</button>}
      />
      <DataTable
        columns={columns}
        data={rows}
        searchKeys={["name", "email", "agency"]}
        filters={[{ key: "role", label: "Role", options: Object.values(ROLES) }]}
        getActions={getActions}
        emptyTitle="No users yet"
        emptySubtitle="Invited users will appear here with their assigned role."
      />
      <QuickFormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSave}
        title={editing ? "Edit user" : "Invite user"}
        description="Users get access scoped to their role and tenant."
        fields={FIELDS} initial={editing || { role: ROLES.SALES }}
        submitLabel={editing ? "Save changes" : "Send invite"}
      />
      <ConfirmDialog
        open={!!toDelete} onClose={() => setToDelete(null)}
        onConfirm={() => { setRows((r) => r.filter((x) => x.id !== toDelete.id)); toast.push(`${toDelete.name} removed.`, "success"); setToDelete(null); }}
        title="Remove this user?" description={`${toDelete?.name} will lose access immediately.`}
      />
    </div>
  );
}
