import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LuArrowLeft, LuPencil, LuPhone, LuMessageCircle, LuMapPin, LuWallet, LuUserCheck, LuSend } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Avatar from "../../components/common/Avatar";
import EmptyState from "../../components/common/EmptyState";
import QuickFormModal from "../../components/common/QuickFormModal";
import Select from "../../components/common/Select";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import { ROLES } from "../../config/roles";
import {
  fetchLeadById, fetchLeadTimeline, assignLead, updateLeadStatus, addLeadNote, clearCurrentLead,
} from "../../redux/slices/leadsSlice";
import { fetchUsers } from "../../redux/slices/usersSlice";

const LEAD_STATUSES = ["new", "contacted", "qualified", "hot", "warm", "cold", "won", "lost"];

const formatMoney = (value) => (value == null || value === "" ? null : `₹${Number(value).toLocaleString("en-IN")}`);

const formatRelative = (iso) => {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

const timelineLabel = (entry) => {
  if (entry.type === "note") return entry.note;
  const by = entry.authorName ? ` by ${entry.authorName}` : "";
  switch (entry.action) {
    case "lead_created": return `Lead created${by}`;
    case "assigned": return `Reassigned${by}`;
    case "status_changed": return `Status changed to "${entry.details?.to}"${by}`;
    default: return `${entry.action}${by}`;
  }
};

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();

  const { current: lead, timeline, status, timelineStatus } = useSelector((s) => s.leads);
  const { list: users } = useSelector((s) => s.users);

  const [assignOpen, setAssignOpen] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    dispatch(fetchLeadById(id));
    dispatch(fetchLeadTimeline(id));
    dispatch(fetchUsers({ limit: 100 }));
    return () => dispatch(clearCurrentLead());
  }, [dispatch, id]);

  if (!lead || lead.id !== id) {
    if (status === "failed") return <EmptyState title="Lead not found" subtitle={`No lead with id ${id}.`} />;
    return (
      <div className="flex items-center justify-center py-24 text-ink-500">
        <InlineSpinner className="h-6 w-6" />
      </div>
    );
  }

  const assigneeOptions = users.filter((u) => u.role !== ROLES.CUSTOMER).map((u) => ({ value: u.id, label: u.name }));

  const handleStatusChange = async (nextStatus) => {
    const res = await dispatch(updateLeadStatus({ id: lead.id, status: nextStatus }));
    if (updateLeadStatus.fulfilled.match(res)) {
      toast.push("Status updated.", "success");
      dispatch(fetchLeadTimeline(id));
    } else {
      toast.push(res.payload || "Failed to update status.", "error");
    }
  };

  const handleAssignSave = async (data) => {
    const res = await dispatch(assignLead({ id: lead.id, assignedTo: data.assignedTo }));
    if (assignLead.fulfilled.match(res)) {
      toast.push("Lead reassigned.", "success");
      dispatch(fetchLeadTimeline(id));
    } else {
      toast.push(res.payload || "Failed to reassign lead.", "error");
    }
    setAssignOpen(false);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSavingNote(true);
    const res = await dispatch(addLeadNote({ id: lead.id, note: note.trim() }));
    setSavingNote(false);
    if (addLeadNote.fulfilled.match(res)) {
      setNote("");
      dispatch(fetchLeadTimeline(id));
    } else {
      toast.push(res.payload || "Failed to add note.", "error");
    }
  };

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
        <LuArrowLeft className="h-4 w-4" /> Back to leads
      </button>

      <PageHeader
        eyebrow={lead.id}
        title={lead.customerName || "Unknown lead"}
        subtitle="Full inquiry history, status and assignment for this lead."
        actions={
          <>
            <button className="btn-outline" onClick={() => toast.push(`Dialing ${lead.customerMobile || "—"}…`, "info")}>
              <LuPhone className="h-4 w-4" /> Call
            </button>
            <button className="btn-outline" onClick={() => navigate("/app/whatsapp")}>
              <LuMessageCircle className="h-4 w-4" /> WhatsApp
            </button>
            <button onClick={() => navigate(`/app/leads/${lead.id}/edit`)} className="btn-primary">
              <LuPencil className="h-4 w-4" /> Edit
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <div className="flex items-center gap-3">
            <Avatar name={lead.customerName || "Unknown"} size={48} color="#5C6BB8" />
            <div>
              <p className="font-display font-bold text-ink-950">{lead.customerName || "Unknown"}</p>
              <p className="text-xs text-ink-500">{lead.customerMobile || lead.customerEmail || "—"}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-500">Status</span>
              <Select
                variant="ghost"
                className="min-w-[7.5rem]"
                buttonClassName="rounded-lg border border-line bg-white px-2 py-1 text-xs"
                panelClassName="text-xs"
                value={lead.status}
                onChange={handleStatusChange}
                options={LEAD_STATUSES}
              />
            </div>
            <div className="flex items-center justify-between"><span className="text-ink-500">Source</span><span className="font-semibold capitalize text-ink-900">{lead.source}</span></div>
            <div className="flex items-center justify-between">
              <span className="text-ink-500">Owner</span>
              <button onClick={() => setAssignOpen(true)} className="flex items-center gap-1.5 font-semibold text-indigo-600 hover:underline">
                {lead.assignedToName || "Unassigned"} <LuUserCheck className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex items-center gap-2 text-ink-700"><LuMapPin className="h-4 w-4 text-indigo-500" /> {lead.propertyTitle || "No property linked"}</div>
            <div className="flex items-center gap-2 text-ink-700">
              <LuWallet className="h-4 w-4 text-indigo-500" />
              Budget: {formatMoney(lead.budgetMin) && formatMoney(lead.budgetMax)
                ? `${formatMoney(lead.budgetMin)} - ${formatMoney(lead.budgetMax)}`
                : formatMoney(lead.budgetMin) || formatMoney(lead.budgetMax) || "Not captured"}
            </div>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h3 className="font-display text-base font-bold text-ink-950">Activity timeline</h3>
          <form onSubmit={handleAddNote} className="mt-4 flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note — call summary, next steps…"
              className="field-input flex-1"
            />
            <button type="submit" disabled={savingNote || !note.trim()} className="btn-primary">
              {savingNote ? <InlineSpinner className="h-4 w-4" /> : <LuSend className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 space-y-4">
            {timelineStatus === "loading" && timeline.length === 0 ? (
              <div className="flex justify-center py-8"><InlineSpinner className="h-5 w-5 text-ink-400" /></div>
            ) : timeline.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-500">No activity yet.</p>
            ) : (
              [...timeline].reverse().map((t, i) => (
                <div key={`${t.type}-${t.id}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`h-2.5 w-2.5 rounded-full ${t.type === "note" ? "bg-indigo-500" : "bg-red-500"}`} />
                    {i < timeline.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-line" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-ink-900">{timelineLabel(t)}</p>
                    <p className="text-xs text-ink-500">{formatRelative(t.createdAt)}{t.type === "note" && t.authorName ? ` · ${t.authorName}` : ""}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <QuickFormModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onSubmit={handleAssignSave}
        title="Reassign lead"
        description={`Choose who should own ${lead.customerName || "this lead"}.`}
        fields={[{ key: "assignedTo", label: "Assign to", type: "select", options: assigneeOptions, full: true }]}
        initial={{ assignedTo: lead.assignedTo || assigneeOptions[0]?.value }}
        submitLabel="Reassign"
      />
    </div>
  );
}
