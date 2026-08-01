import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { LuEllipsisVertical } from "react-icons/lu";
import clsx from "clsx";

/**
 * items: [{ label, icon: Icon, onClick, tone: 'default'|'danger', hidden?: bool }]
 */
export default function ActionMenu({ items = [] }) {
  const visibleItems = items.filter((i) => !i.hidden);
  if (visibleItems.length === 0) return null;

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button
        onClick={(e) => e.stopPropagation()}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-surface-sunk hover:text-ink-900"
        aria-label="Open row actions"
      >
        <LuEllipsisVertical className="h-4 w-4" />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-120"
        enterFrom="opacity-0 scale-95 -translate-y-1"
        enterTo="opacity-100 scale-100 translate-y-0"
        leave="transition ease-in duration-90"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
        <Menu.Items
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 z-30 mt-1.5 w-48 origin-top-right overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-pop focus:outline-none"
        >
          {visibleItems.map((item, idx) => (
            <Menu.Item key={idx} disabled={item.disabled}>
              {({ active }) => (
                <button
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={clsx(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors disabled:opacity-40",
                    item.tone === "danger"
                      ? active ? "bg-coral-50 text-coral-600" : "text-coral-600"
                      : active ? "bg-surface-sunk text-ink-900" : "text-ink-700"
                  )}
                >
                  {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                  {item.label}
                </button>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
