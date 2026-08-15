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
      className="relative z-0 mb-6 flex justify-end"
    >
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </motion.div>
  );
}
