import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, Transition } from "@headlessui/react";
import { LuEllipsisVertical } from "react-icons/lu";
import clsx from "clsx";

/**
 * items: [{ label, icon: Icon, onClick, tone: 'default'|'danger', hidden?: bool }]
 */
export default function ActionMenu({ items = [] }) {
  const wrapperRef = useRef(null);
  const [position, setPosition] = useState(null);

  const visibleItems = items.filter((i) => !i.hidden);

  const updatePosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const flipUp = spaceBelow < 220;
      setPosition({
        top: flipUp ? undefined : rect.bottom + 6,
        bottom: flipUp ? window.innerHeight - rect.top + 6 : undefined,
        right: window.innerWidth - rect.right,
      });
    }
  };

  useLayoutEffect(() => {
    updatePosition();
  }, []);

  useEffect(() => {
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  if (visibleItems.length === 0) return null;

  const menuPortalRoot = typeof document !== "undefined" ? document.body : null;

  return (
    <Menu as="div" ref={wrapperRef} className="relative inline-block text-left">
      <Menu.Button
        onClick={(e) => { e.stopPropagation(); updatePosition(); }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-surface-sunk hover:text-ink-900"
        aria-label="Open row actions"
      >
        <LuEllipsisVertical className="h-4 w-4" />
      </Menu.Button>
      {menuPortalRoot && position && createPortal(
        <Transition
          as={Fragment}
          enter="transition ease-out duration-120"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="transition ease-in duration-90"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <Menu.Items
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: position.top,
              bottom: position.bottom,
              right: position.right,
            }}
            className="z-[9999] w-48 overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-pop focus:outline-none"
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
        </Transition>,
        menuPortalRoot
      )}
    </Menu>
  );
}
