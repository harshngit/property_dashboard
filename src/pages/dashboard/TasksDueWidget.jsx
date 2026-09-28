import { Link } from "react-router-dom";
import { LuAlarmClock, LuCalendarCheck } from "react-icons/lu";
import { useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";

// Follow-ups due today and overdue (GET /tasks/today, /tasks/overdue) -
// the caller's own tasks, or their team's for managers.

function TaskList({ title, icon: Icon, tone, tasks, empty }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tone}`} />
        <h3 className="text-sm font-bold text-ink-900">{title}</h3>
        <span className="ml-auto rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-600">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-ink-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {tasks.slice(0, 6).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">{t.title}</p>
                <p className="text-xs text-ink-500">
                  Due {formatDate(t.due_date, true)}
                  {t.priority ? ` · ${titleCase(t.priority)}` : ""}
                </p>
              </div>
              {t.related_entity_type === "lead" && t.related_entity_id && (
                <Link to={`/app/leads/${t.related_entity_id}`} className="shrink-0 text-xs font-semibold text-red-600">
                  Open lead
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TasksDueWidget() {
  const today = useApiQuery("/tasks/today");
  const overdue = useApiQuery("/tasks/overdue");
  const list = (d) => (Array.isArray(d) ? d : d?.items || []);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <TaskList title="Due today" icon={LuCalendarCheck} tone="text-violet-600" tasks={list(today.data)} empty="Nothing due today." />
      <TaskList title="Overdue" icon={LuAlarmClock} tone="text-red-600" tasks={list(overdue.data)} empty="No overdue follow-ups - nice work." />
    </div>
  );
}
