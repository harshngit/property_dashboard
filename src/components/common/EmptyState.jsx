import { LuInbox } from "react-icons/lu";

export default function EmptyState({ icon: Icon = LuInbox, title = "Nothing here yet", subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
        <Icon className="h-6 w-6 text-indigo-400" />
      </div>
      <h3 className="font-display text-base font-bold text-ink-900">{title}</h3>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-ink-500">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
