import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, Transition } from "@headlessui/react";
import { LuBell } from "react-icons/lu";
import { useApiCall } from "../../hooks/useApi";
import { InlineSpinner } from "./PageLoader";

// Header bell: unread badge (GET /notifications/unread-count, polled every
// minute) and the latest notifications on open, with mark-read on click.

const ROUTES = {
  lead: (id) => `/app/leads/${id}`,
  property: (id) => `/app/properties/${id}`,
  deal: () => "/app/deals",
  task: () => "/app/tasks",
  bd_lead: () => "/app/business-leads",
  opportunity_interest: () => "/app/opportunities",
  investor_profile: () => "/app/investors",
  nri_service_request: () => "/app/investors",
};

function timeAgo(value) {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function NotificationBell() {
  const call = useApiCall();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState(null);

  const refreshCount = useCallback(() => {
    call("/notifications/unread-count")
      .then((res) => setUnread(res.data.count))
      .catch(() => {});
  }, [call]);

  useEffect(() => {
    refreshCount();
    const timer = setInterval(refreshCount, 60000);
    return () => clearInterval(timer);
  }, [refreshCount]);

  const load = () => {
    setItems(null);
    call("/notifications?limit=10")
      .then((res) => setItems(res.data.items || []))
      .catch(() => setItems([]));
  };

  const open = async (n, close) => {
    if (!n.is_read) {
      call(`/notifications/${n.id}/read`, { method: "PUT" }).then(refreshCount).catch(() => {});
    }
    const route = ROUTES[n.related_entity_type];
    close();
    if (route) navigate(route(n.related_entity_id));
  };

  const markAll = async () => {
    await call("/notifications/read-all", { method: "PUT" }).catch(() => {});
    setItems((list) => (list || []).map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  return (
    <Popover className="relative">
      <Popover.Button onClick={load} className="relative rounded-lg p-2 text-ink-700 hover:bg-surface-sunk" title="Notifications">
        <LuBell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Popover.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-75"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <Popover.Panel className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
          {({ close }) => (
            <>
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="text-sm font-bold text-ink-950">Notifications</p>
                {unread > 0 && (
                  <button onClick={markAll} className="text-xs font-semibold text-red-600 hover:text-red-700">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {items === null ? (
                  <div className="flex justify-center py-6"><InlineSpinner /></div>
                ) : items.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-ink-500">You&apos;re all caught up.</p>
                ) : (
                  items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => open(n, close)}
                      className={`block w-full border-b border-line px-4 py-3 text-left last:border-0 hover:bg-surface-muted ${n.is_read ? "" : "bg-red-50/40"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${n.is_read ? "text-ink-700" : "font-semibold text-ink-950"}`}>{n.title}</p>
                        <span className="shrink-0 text-[11px] text-ink-400">{timeAgo(n.created_at)}</span>
                      </div>
                      {n.message && <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{n.message}</p>}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}
