import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  LuArrowLeft, LuPencil, LuPhone, LuMail, LuCircleCheck, LuUserX, LuTrash2, LuBuilding2,
  LuHandshake, LuMailCheck, LuPhoneCall,
} from "react-icons/lu";
import { usePageTitle } from "../../context/PageTitleContext";
import Avatar from "../../components/common/Avatar";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import QuickFormModal from "../../components/common/QuickFormModal";
import { ConfirmDialog } from "../../components/common/Modal";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import {
  fetchUserById, updateUser, deleteUser, clearCurrentUser,
} from "../../redux/slices/usersSlice";
import { activateUserAccount } from "../../redux/slices/authSlice";
import { fetchLeads } from "../../redux/slices/leadsSlice";

const STATUS_OPTIONS = ["active", "pending_approval", "suspended", "inactive"];
const STATUS_LABEL = { active: "Active", pending_approval: "Pending Approval", suspended: "Suspended", inactive: "Inactive" };
const STATUS_CLASS = {
  active: "bg-green-50 text-green-700",
  pending_approval: "bg-amber-50 text-amber-700",
  suspended: "bg-coral-50 text-coral-700",
  inactive: "bg-ink-100 text-ink-500",
};

const EDIT_FIELDS = [
  { key: "fullName", label: "Broker name", placeholder: "e.g. Priya Menon" },
  { key: "email", label: "Email", placeholder: "name@propertyserch.com" },
  { key: "mobile", label: "Mobile", placeholder: "9876543210" },
  { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s] })) },
];

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};
const formatDateTime = (iso) => {
  if (!iso) return "Never";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

function IconAction({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="shrink-0 text-ink-500">{label}</span>
      <span className="min-w-0 truncate text-right font-semibold text-ink-900">{children}</span>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-xl border border-line px-4 py-3 text-center">
      <p className="font-display text-xl font-extrabold text-ink-950">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-ink-500">{label}</p>
    </div>
  );
}

export default function BrokerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const { permissions } = useAuth();

  const { current: broker, status } = useSelector((s) => s.users);
  const { list: leads } = useSelector((s) => s.leads);
  const { setTitle } = usePageTitle();

  const [editOpen, setEditOpen] = useState(false);
  const [toDelete, setToDelete] = useState(false);

  useEffect(() => {
    dispatch(fetchUserById(id));
    dispatch(fetchLeads({ limit: 100 }));
    return () => dispatch(clearCurrentUser());
  }, [dispatch, id]);

  useEffect(() => {
    setTitle(broker?.id === id ? broker.name || "Broker" : "Broker");
  }, [broker, id, setTitle]);

  const assignedLeads = useMemo(() => leads.filter((l) => l.assignedTo === id), [leads, id]);

  if (!broker || broker.id !== id) {
    if (status === "failed") return <EmptyState title="Broker not found" subtitle={`No broker with id ${id}.`} />;
    return (
      <div className="flex items-center justify-center py-24 text-ink-500">
        <InlineSpinner className="h-6 w-6" />
      </div>
    );
  }

  const wonLeads = assignedLeads.filter((l) => l.status === "won");
  const conversion = assignedLeads.length ? `${Math.round((wonLeads.length / assignedLeads.length) * 100)}%` : "0%";

  const handleEditSave = async (data) => {
    const res = await dispatch(updateUser({ id: broker.id, ...data }));
    if (updateUser.fulfilled.match(res)) toast.push(`${data.fullName || broker.name} updated.`, "success");
    else toast.push(res.payload || "Failed to update broker.", "error");
    setEditOpen(false);
  };

  const handleActivate = async () => {
    const res = await dispatch(activateUserAccount(broker.id));
    if (activateUserAccount.fulfilled.match(res)) {
      toast.push(`${broker.name} activated.`, "success");
      dispatch(fetchUserById(id));
    } else {
      toast.push(res.payload || "Failed to activate broker.", "error");
    }
  };

  const handleDeactivate = async () => {
    const res = await dispatch(updateUser({ id: broker.id, status: "inactive" }));
    if (updateUser.fulfilled.match(res)) toast.push(`${broker.name} marked inactive.`, "success");
    else toast.push(res.payload || "Failed to update broker.", "error");
  };

  const handleDelete = async () => {
    const res = await dispatch(deleteUser(broker.id));
    if (deleteUser.fulfilled.match(res)) {
      toast.push(`${broker.name} removed.`, "success");
      navigate("/app/brokers");
    } else {
      toast.push(res.payload || "Failed to remove broker.", "error");
    }
    setToDelete(false);
  };

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
        <LuArrowLeft className="h-4 w-4" /> Back to brokers
      </button>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left — profile */}
        <div className="card p-6 lg:col-span-3">
          <div className="flex flex-col items-center text-center">
            <Avatar name={broker.name || "Unknown"} size={72} color="#FF7A59" src={broker.profilePictureUrl} />
            <p className="mt-3 font-display text-lg font-bold text-ink-950">{broker.name || "Unknown"}</p>
            {broker.tenantName && (
              <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
                <LuBuilding2 className="h-3.5 w-3.5" /> {broker.tenantName}
              </span>
            )}
            <span className={`mt-2 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_CLASS[broker.status] || "bg-surface-sunk text-ink-500"}`}>
              {STATUS_LABEL[broker.status] || broker.status || "—"}
            </span>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2">
            <IconAction icon={LuPhone} label="Call" onClick={() => toast.push(`Dialing ${broker.mobile || "—"}…`, "info")} />
            <IconAction icon={LuMail} label="Email" onClick={() => broker.email && window.open(`mailto:${broker.email}`, "_blank")} />
            {permissions.edit && broker.status === "pending_approval" && (
              <IconAction icon={LuCircleCheck} label="Activate" onClick={handleActivate} />
            )}
            {permissions.edit && broker.status !== "inactive" && (
              <IconAction icon={LuUserX} label="Deactivate" onClick={handleDeactivate} />
            )}
          </div>

          {permissions.edit && (
            <button onClick={() => setEditOpen(true)} className="btn-primary mt-4 w-full justify-center">
              <LuPencil className="h-4 w-4" /> Edit broker
            </button>
          )}

          <div className="mt-6 space-y-3 border-t border-line pt-5">
            <InfoRow label="Email">{broker.email || "—"}</InfoRow>
            <InfoRow label="Mobile">{broker.mobile || "—"}</InfoRow>
            <InfoRow label="Agency">{broker.tenantName || "—"}</InfoRow>
            <InfoRow label="Joined">{formatDate(broker.createdAt)}</InfoRow>
            <InfoRow label="Last login">{formatDateTime(broker.lastLoginAt)}</InfoRow>
          </div>

          <div className="mt-5 flex items-center gap-4 border-t border-line pt-4 text-xs">
            <span className={`flex items-center gap-1 ${broker.emailVerified ? "text-green-600" : "text-ink-400"}`}>
              <LuMailCheck className="h-3.5 w-3.5" /> Email {broker.emailVerified ? "verified" : "unverified"}
            </span>
            <span className={`flex items-center gap-1 ${broker.mobileVerified ? "text-green-600" : "text-ink-400"}`}>
              <LuPhoneCall className="h-3.5 w-3.5" /> Mobile {broker.mobileVerified ? "verified" : "unverified"}
            </span>
          </div>

          {permissions.delete && (
            <button onClick={() => setToDelete(true)} className="btn-outline mt-5 w-full justify-center text-coral-600">
              <LuTrash2 className="h-4 w-4" /> Remove broker
            </button>
          )}
        </div>

        {/* Middle — assigned leads */}
        <div className="card p-6 lg:col-span-6">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-950">
              <LuHandshake className="h-4.5 w-4.5 text-red-600" /> Assigned leads
            </h3>
            <span className="text-xs text-ink-500">{assignedLeads.length} total</span>
          </div>

          <div className="mt-4 space-y-3">
            {assignedLeads.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-500">No leads assigned yet.</p>
            ) : (
              assignedLeads.map((l) => (
                <button
                  key={l.id}
                  onClick={() => navigate(`/app/leads/${l.id}`)}
                  className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-left hover:bg-surface-sunk"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">{l.customerName || "Unknown"}</p>
                    <p className="truncate text-xs text-ink-500">{l.propertyTitle || l.source || "—"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge value={l.status} />
                    <span className="text-xs text-ink-400">{formatDate(l.updatedAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right — performance */}
        <div className="space-y-5 lg:col-span-3">
          <div className="card p-5">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-500">Performance</h4>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Leads Assigned" value={assignedLeads.length} />
              <StatBox label="Deals Won" value={wonLeads.length} />
              <StatBox label="Conversion" value={conversion} />
              <StatBox label="Open Leads" value={assignedLeads.length - wonLeads.length} />
            </div>
          </div>
        </div>
      </div>

      <QuickFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSave}
        title="Edit broker"
        description="Update this broker's profile and status."
        fields={EDIT_FIELDS}
        initial={{ fullName: broker.name, email: broker.email, mobile: broker.mobile, status: broker.status }}
        submitLabel="Save changes"
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(false)}
        onConfirm={handleDelete}
        title="Remove this broker?"
        description={`${broker.name}'s assigned leads will need to be reassigned.`}
      />
    </div>
  );
}
