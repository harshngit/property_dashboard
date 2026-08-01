import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { LuX } from "react-icons/lu";

export default function Modal({ open, onClose, title, description, children, maxWidth = "max-w-md" }) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-180" enterFrom="opacity-0 scale-95 translate-y-2" enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-120" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className={`w-full ${maxWidth} rounded-2xl bg-white p-6 shadow-pop`}>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  {title && <Dialog.Title className="font-display text-lg font-bold text-ink-950">{title}</Dialog.Title>}
                  {description && <Dialog.Description className="mt-1 text-sm text-ink-500">{description}</Dialog.Description>}
                </div>
                <button onClick={onClose} className="rounded-lg p-1.5 text-ink-500 hover:bg-surface-sunk">
                  <LuX className="h-4 w-4" />
                </button>
              </div>
              {children}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Delete", tone = "danger", loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="mt-2 flex justify-end gap-3">
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button
          className={tone === "danger" ? "btn-danger" : "btn-primary"}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
