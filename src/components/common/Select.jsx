import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { LuCheck, LuChevronDown } from "react-icons/lu";
import clsx from "clsx";

const normalizeOptions = (options = []) =>
  options.map((o) =>
    typeof o === "object" && o !== null
      ? { value: o.value, label: o.label ?? String(o.value) }
      : { value: o, label: String(o) }
  );

/**
 * Custom div-based dropdown (Headless UI Listbox) replacing native <select>
 * so the open/closed state renders with our own styling in every browser/OS.
 */
export default function Select({
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  disabled = false,
  variant = "field", // "field" (bordered form control) | "ghost" (transparent, for toolbar/filter chrome)
  className = "",
  buttonClassName = "",
  panelClassName = "",
}) {
  const opts = normalizeOptions(options);
  const current = opts.find((o) => String(o.value) === String(value));

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className={clsx("relative", className)}>
        <Listbox.Button
          className={clsx(
            "flex w-full items-center justify-between gap-2 text-left",
            variant === "field" ? "field-select" : "bg-transparent font-semibold text-ink-700 outline-none",
            disabled && "cursor-not-allowed opacity-60",
            buttonClassName
          )}
        >
          <span className={clsx("truncate", !current && "text-ink-500/60")}>
            {current ? current.label : placeholder}
          </span>
          <LuChevronDown className="h-4 w-4 shrink-0 text-ink-500/60" aria-hidden="true" />
        </Listbox.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-120"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="transition ease-in duration-90"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <Listbox.Options
            className={clsx(
              "absolute z-30 mt-2 max-h-64 w-full min-w-[9rem] overflow-auto rounded-xl border border-line bg-white p-1.5 shadow-pop focus:outline-none",
              panelClassName
            )}
          >
            {opts.map((o) => (
              <Listbox.Option
                key={o.value}
                value={o.value}
                className={({ active, selected }) =>
                  clsx(
                    "flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm",
                    active && "bg-surface-sunk",
                    selected ? "font-semibold text-red-600" : "font-medium text-ink-700"
                  )
                }
              >
                {({ selected }) => (
                  <>
                    <span className="truncate">{o.label}</span>
                    {selected && <LuCheck className="h-4 w-4 shrink-0" />}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
