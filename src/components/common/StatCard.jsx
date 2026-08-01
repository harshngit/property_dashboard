import { motion } from "framer-motion";
import { LuArrowUpRight, LuArrowDownRight, LuMinus } from "react-icons/lu";
import clsx from "clsx";

const TONE = {
  up: { icon: LuArrowUpRight, cls: "text-green-600 bg-green-50" },
  down: { icon: LuArrowDownRight, cls: "text-coral-600 bg-coral-50" },
  warn: { icon: LuArrowUpRight, cls: "text-amber-600 bg-amber-50" },
  flat: { icon: LuMinus, cls: "text-ink-500 bg-ink-900/5" },
};

export default function StatCard({ label, value, delta, tone = "flat", index = 0 }) {
  const t = TONE[tone] || TONE.flat;
  const Icon = t.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="card cursor-pointer p-5 transition-all duration-200 hover:-translate-y-1 hover:border-red-200 hover:shadow-pop"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
        <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", t.cls)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-extrabold text-ink-950">{value}</p>
      <span className={clsx("mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold", t.cls)}>
        {delta}
      </span>
    </motion.div>
  );
}
