import { motion } from "framer-motion";

export default function PageLoader({ label = "Loading your workspace" }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface-muted">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-2xl border-[3px] border-red-500/20 border-t-red-500"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        />
        <motion.div
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ff512f_0%,#dd2476_100%)] shadow-pop"
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
            <path d="M6 20V11l6-4.5 6 4.5v9h-4v-5H10v5z" />
          </svg>
        </motion.div>
      </div>
      <p className="mt-5 font-display text-sm font-semibold text-ink-700">{label}&hellip;</p>
      <div className="mt-3 h-1 w-40 overflow-hidden rounded-full bg-ink-900/5">
        <motion.div
          className="h-full w-1/3 rounded-full bg-[linear-gradient(90deg,#ff512f_0%,#dd2476_100%)]"
          animate={{ x: ["-120%", "220%"] }}
          transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

export function InlineSpinner({ className = "" }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="mb-3 flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton h-4 flex-1" style={{ animationDelay: `${(r + c) * 40}ms` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
