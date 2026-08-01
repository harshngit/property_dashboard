import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LuCircleCheck, LuCircleAlert, LuInfo, LuX } from "react-icons/lu";
import clsx from "clsx";

const ToastContext = createContext(null);

const ICONS = { success: LuCircleCheck, error: LuCircleAlert, info: LuInfo };
const TONE_CLS = {
  success: "border-green-200 bg-green-50 text-green-700",
  error: "border-coral-200 bg-coral-50 text-coral-700",
  info: "border-indigo-200 bg-indigo-50 text-indigo-600",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type] || LuInfo;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                className={clsx(
                  "pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold shadow-pop",
                  TONE_CLS[t.type]
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t.message}
                <button onClick={() => dismiss(t.id)} className="ml-1 opacity-60 hover:opacity-100">
                  <LuX className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
