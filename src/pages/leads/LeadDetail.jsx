import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  LuArrowLeft, LuPencil, LuPhone, LuMessageCircle, LuMapPin, LuWallet, LuUserCheck, LuSend,
  LuMail, LuSparkles, LuRefreshCw, LuMessageSquare, LuClock3, LuBuilding2, LuGlobe,
} from "react-icons/lu";
import { usePageTitle } from "../../context/PageTitleContext";
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

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

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

const TIMELINE_META = {
  note: { icon: LuMessageSquare, tone: "bg-indigo-50 text-indigo-600" },
  lead_created: { icon: LuSparkles, tone: "bg-green-50 text-green-600" },
  assigned: { icon: LuUserCheck, tone: "bg-amber-50 text-amber-600" },
  status_changed: { icon: LuRefreshCw, tone: "bg-red-50 text-red-600" },
};
const timelineMeta = (entry) => TIMELINE_META[entry.type === "note" ? "note" : entry.action] || { icon: LuClock3, tone: "bg-ink-900/5 text-ink-600" };

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

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();

  const { current: lead, timeline, status, timelineStatus } = useSelector((s) => s.leads);
  const { list: users } = useSelector((s) => s.users);
  const { setTitle } = usePageTitle();

  const [assignOpen, setAssignOpen] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [feedFilter, setFeedFilter] = useState("all");

  useEffect(() => {
    dispatch(fetchLeadById(id));
    dispatch(fetchLeadTimeline(id));
    dispatch(fetchUsers({ limit: 100 }));
    return () => dispatch(clearCurrentLead());
  }, [dispatch, id]);

  useEffect(() => {
    setTitle(lead?.id === id ? lead.customerName || "Lead" : "Lead");
  }, [lead, id, setTitle]);

  const orderedTimeline = useMemo(() => [...timeline].reverse(), [timeline]);
  const visibleTimeline = feedFilter === "notes" ? orderedTimeline.filter((t) => t.type === "note") : orderedTimeline;

  if (!lead || lead.id !== id) {
    if (status === "failed") return <EmptyState title="Lead not found" subtitle={`No lead with id ${id}.`} />;
    return (
      <div className="flex items-center justify-center py-24 text-ink-500">
        <InlineSpinner className="h-6 w-6" />
      </div>
    );
  }

  const assigneeOptions = users.filter((u) => u.role !== ROLES.CUSTOMER).map((u) => ({ value: u.id, label: u.name }));
  const budgetLabel = formatMoney(lead.budgetMin) && formatMoney(lead.budgetMax)
    ? `${formatMoney(lead.budgetMin)} - ${formatMoney(lead.budgetMax)}`
    : formatMoney(lead.budgetMin) || formatMoney(lead.budgetMax) || "Not captured";

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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left — profile & lead details */}
        <div className="card p-6 lg:col-span-3">
          <div className="flex flex-col items-center text-center">
            <Avatar name={lead.customerName || "Unknown"} size={72} color="#5C6BB8" />
            <p className="mt-3 font-display text-lg font-bold text-ink-950">{lead.customerName || "Unknown"}</p>
            {lead.source && (
              <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium capitalize text-ink-500">
                <LuGlobe className="h-3.5 w-3.5" /> via {lead.source}
              </span>
            )}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2">
            <IconAction icon={LuPhone} label="Call" onClick={() => toast.push(`Dialing ${lead.customerMobile || "—"}…`, "info")} />
            <IconAction icon={LuMessageCircle} label="WhatsApp" onClick={() => navigate("/app/whatsapp")} />
            <IconAction icon={LuUserCheck} label="Reassign" onClick={() => setAssignOpen(true)} />
          </div>

          <button onClick={() => navigate(`/app/leads/${lead.id}/edit`)} className="btn-primary mt-4 w-full justify-center">
            <LuPencil className="h-4 w-4" /> Edit lead
          </button>

          {orderedTimeline[0] && (
            <p className="mt-3 text-center text-xs text-ink-500">Last activity {formatRelative(orderedTimeline[0].createdAt)}</p>
          )}

          <div className="mt-6 space-y-3 border-t border-line pt-5">
            <div className="flex items-center justify-between text-sm">
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
            <InfoRow label="Owner">
              <button onClick={() => setAssignOpen(true)} className="text-indigo-600 hover:underline">
                {lead.assignedToName || "Unassigned"}
              </button>
            </InfoRow>
            <InfoRow label="Email">{lead.customerEmail || "—"}</InfoRow>
            <InfoRow label="Mobile">{lead.customerMobile || "—"}</InfoRow>
            <InfoRow label="Budget">{budgetLabel}</InfoRow>
            <InfoRow label="Created">{formatDate(lead.createdAt)}</InfoRow>
          </div>
        </div>

        {/* Middle — activity feed */}
        <div className="card p-6 lg:col-span-6">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-1">
              {[{ key: "all", label: "Activity" }, { key: "notes", label: "Notes" }].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFeedFilter(t.key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                    feedFilter === t.key ? "bg-red-50 text-red-600" : "text-ink-500 hover:bg-surface-sunk"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-ink-500">{visibleTimeline.length} events</span>
          </div>

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
            ) : visibleTimeline.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-500">{feedFilter === "notes" ? "No notes yet." : "No activity yet."}</p>
            ) : (
              visibleTimeline.map((t) => {
                const meta = timelineMeta(t);
                return (
                  <div key={`${t.type}-${t.id}`} className="flex gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
                      <meta.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 border-b border-line pb-4">
                      <p className="text-sm font-medium text-ink-900">{timelineLabel(t)}</p>
                      <p className="mt-0.5 text-xs text-ink-500">{formatRelative(t.createdAt)}{t.type === "note" && t.authorName ? ` · ${t.authorName}` : ""}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right — customer & property */}
        <div className="space-y-5 lg:col-span-3">
          <div className="card p-5">
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-500">Customer</h4>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={lead.customerName || "Unknown"} size={40} color="#5C6BB8" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink-900">{lead.customerName || "Unknown"}</p>
                <p className="truncate text-xs text-ink-500">{lead.id}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-ink-700">
              <div className="flex items-center gap-2"><LuMail className="h-4 w-4 text-ink-400" /> <span className="truncate">{lead.customerEmail || "—"}</span></div>
              <div className="flex items-center gap-2"><LuPhone className="h-4 w-4 text-ink-400" /> <span className="truncate">{lead.customerMobile || "—"}</span></div>
            </div>
            <button onClick={() => navigate("/app/customers")} className="btn-outline btn-sm mt-4 w-full justify-center">
              View customers
            </button>
          </div>

          <div className="card p-5">
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-500">Interested property</h4>
            {lead.propertyId ? (
              <div className="mt-3">
                <div className="flex items-start gap-2">
                  <LuBuilding2 className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <p className="text-sm font-semibold text-ink-900">{lead.propertyTitle}</p>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-ink-700">
                  <LuWallet className="h-4 w-4 text-ink-400" /> {formatMoney(lead.propertyPrice) || "Price not set"}
                </div>
                <button onClick={() => navigate(`/app/properties/${lead.propertyId}`)} className="btn-outline btn-sm mt-4 w-full justify-center">
                  <LuMapPin className="h-3.5 w-3.5" /> View listing
                </button>
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-500">No property linked yet.</p>
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
