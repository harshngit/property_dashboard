import { useEffect } from "react";
import { motion } from "framer-motion";
import { usePageTitle } from "../../context/PageTitleContext";

export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  const { setTitle } = usePageTitle();

  useEffect(() => {
    setTitle(title);
  }, [title, setTitle]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="relative z-0 mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        {eyebrow && (
          <span className="mb-1.5 inline-block text-xs font-bold uppercase tracking-wider text-red-600">
            {eyebrow}
          </span>
        )}
        {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </motion.div>
  );
}
