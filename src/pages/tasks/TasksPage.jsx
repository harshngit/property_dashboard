import { useState } from "react";
import { LuPlus, LuCircleCheck, LuCircle, LuTrash2, LuClock } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import QuickFormModal from "../../components/common/QuickFormModal";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";
import clsx from "clsx";

const INITIAL_TASKS = [
  { id: "T1", title: "Call Karan Mehta about site visit", due: "Today, 11:30 AM", tag: "Hot lead", done: false },
  { id: "T2", title: "Send WhatsApp brochure — Palm Grove Villas", due: "Today, 2:00 PM", tag: "Follow-up", done: false },
  { id: "T3", title: "Confirm booking documents with Divya Prakash", due: "Today, 4:30 PM", tag: "Documentation", done: false },
  { id: "T4", title: "Follow up Neha Bansal — no response 2 days", due: "Overdue", tag: "Overdue", done: false },
  { id: "T5", title: "Share matched properties with Ananya Rao", due: "Tomorrow, 10:00 AM", tag: "New lead", done: true },
];

const FIELDS = [
  { key: "title", label: "Task", placeholder: "e.g. Call the customer", full: true },
  { key: "due", label: "Due", placeholder: "e.g. Today, 4:00 PM" },
  { key: "tag", label: "Tag", placeholder: "e.g. Follow-up" },
];

export default function TasksPage() {
  const toast = useToast();
  const { permissions } = useAuth();
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [modalOpen, setModalOpen] = useState(false);

  const toggle = (id) => setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const remove = (id) => setTasks((t) => t.filter((x) => x.id !== id));

  const handleSave = (data) => {
    setTasks((t) => [{ id: `T${Date.now()}`, done: false, ...data }, ...t]);
    toast.push("Task added.", "success");
    setModalOpen(false);
  };

  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div>
      <PageHeader
        eyebrow="Tasks & Follow-ups"
        title="Today's task list"
        subtitle="Stay on top of reminders, overdue alerts and daily follow-ups."
        actions={permissions.create && <button onClick={() => setModalOpen(true)} className="btn-primary"><LuPlus className="h-4 w-4" /> Add task</button>}
      />

      <div className="card p-2">
        {tasks.length === 0 ? (
          <EmptyState title="No tasks yet" subtitle="Create a task to keep your follow-ups on track." />
        ) : (
          <div className="divide-y divide-line">
            {[...pending, ...done].map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                <button onClick={() => toggle(t.id)} className={clsx("shrink-0", t.done ? "text-green-500" : "text-ink-500/50 hover:text-green-500")}>
                  {t.done ? <LuCircleCheck className="h-5 w-5" /> : <LuCircle className="h-5 w-5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={clsx("truncate text-sm font-semibold", t.done ? "text-ink-500 line-through" : "text-ink-900")}>{t.title}</p>
                  <p className="flex items-center gap-1.5 text-xs text-ink-500">
                    <LuClock className="h-3 w-3" /> {t.due}
                    <span className={clsx("ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold", t.tag === "Overdue" ? "bg-coral-50 text-coral-600" : "bg-indigo-50 text-indigo-500")}>{t.tag}</span>
                  </p>
                </div>
                <button onClick={() => remove(t.id)} className="rounded-lg p-2 text-ink-500/60 hover:bg-coral-50 hover:text-coral-600">
                  <LuTrash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <QuickFormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSave}
        title="Add task" description="Add a reminder or follow-up to your daily list."
        fields={FIELDS} initial={{}} submitLabel="Add task"
      />
    </div>
  );
}
