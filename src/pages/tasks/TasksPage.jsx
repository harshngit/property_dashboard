import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LuPlus, LuCircleCheck, LuCircle, LuClock } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import QuickFormModal from "../../components/common/QuickFormModal";
import { InlineSpinner } from "../../components/common/PageLoader";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";
import { fetchTasks, createTask, completeTask, clearTasksError } from "../../redux/slices/tasksSlice";
import clsx from "clsx";

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
const RELATED_TYPES = [
  { value: "", label: "None" },
  { value: "lead", label: "Lead" },
  { value: "customer", label: "Customer" },
  { value: "deal", label: "Deal" },
  { value: "property", label: "Property" },
];
const PRIORITY_CLASS = {
  high: "bg-coral-50 text-coral-600",
  medium: "bg-indigo-50 text-indigo-500",
  low: "bg-surface-sunk text-ink-500",
};

const FIELDS = [
  { key: "title", label: "Task", placeholder: "e.g. Call the customer", full: true },
  { key: "dueDate", label: "Due date", type: "datetime-local", full: true },
  { key: "priority", label: "Priority", type: "select", options: PRIORITIES },
  { key: "relatedEntityType", label: "Related to", type: "select", options: RELATED_TYPES },
];

const formatDue = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  return `${isToday ? "Today" : d.toLocaleDateString(undefined, { month: "short", day: "2-digit" })}, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
};

export default function TasksPage() {
  const toast = useToast();
  const dispatch = useDispatch();
  const { permissions } = useAuth();
  const { list: tasks, status, mutationStatus } = useSelector((s) => s.tasks);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchTasks({ limit: 100 }));
    return () => dispatch(clearTasksError());
  }, [dispatch]);

  const toggle = async (task) => {
    if (task.status === "completed") return;
    const res = await dispatch(completeTask(task.id));
    if (completeTask.fulfilled.match(res)) toast.push("Task marked complete.", "success");
    else toast.push(res.payload || "Failed to complete task.", "error");
  };

  const handleSave = async (data) => {
    const res = await dispatch(createTask({
      title: data.title,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      priority: data.priority || "medium",
      relatedEntityType: data.relatedEntityType || undefined,
    }));
    if (createTask.fulfilled.match(res)) toast.push("Task added.", "success");
    else toast.push(res.payload || "Failed to add task.", "error");
    setModalOpen(false);
  };

  const pending = tasks.filter((t) => t.status !== "completed");
  const done = tasks.filter((t) => t.status === "completed");

  return (
    <div>
      <PageHeader
        eyebrow="Tasks & Follow-ups"
        title="Today's task list"
        subtitle="Stay on top of reminders, overdue alerts and daily follow-ups."
        actions={permissions.create && <button onClick={() => setModalOpen(true)} className="btn-primary"><LuPlus className="h-4 w-4" /> Add task</button>}
      />

      <div className="card p-2">
        {status === "loading" && tasks.length === 0 ? (
          <div className="flex justify-center py-10"><InlineSpinner className="h-6 w-6 text-ink-400" /></div>
        ) : tasks.length === 0 ? (
          <EmptyState title="No tasks yet" subtitle="Create a task to keep your follow-ups on track." />
        ) : (
          <div className="divide-y divide-line">
            {[...pending, ...done].map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                <button
                  onClick={() => toggle(t)}
                  disabled={t.status === "completed" || mutationStatus === "loading"}
                  className={clsx("shrink-0", t.status === "completed" ? "text-green-500" : "text-ink-500/50 hover:text-green-500")}
                >
                  {t.status === "completed" ? <LuCircleCheck className="h-5 w-5" /> : <LuCircle className="h-5 w-5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={clsx("truncate text-sm font-semibold", t.status === "completed" ? "text-ink-500 line-through" : "text-ink-900")}>{t.title}</p>
                  <p className="flex items-center gap-1.5 text-xs text-ink-500">
                    <LuClock className="h-3 w-3" /> {formatDue(t.dueDate)}
                    <span className={clsx("ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold", t.status === "overdue" ? "bg-coral-50 text-coral-600" : PRIORITY_CLASS[t.priority])}>
                      {t.status === "overdue" ? "Overdue" : t.priority}
                    </span>
                    {t.relatedEntityType && (
                      <span className="rounded-full bg-surface-sunk px-2 py-0.5 text-[10px] font-bold capitalize text-ink-500">{t.relatedEntityType}</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <QuickFormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSave}
        title="Add task" description="Add a reminder or follow-up to your daily list."
        fields={FIELDS} initial={{ priority: "medium", relatedEntityType: "" }} submitLabel="Add task"
      />
    </div>
  );
}
