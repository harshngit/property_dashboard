import { motion } from "framer-motion";

const BUILDINGS = [
  { w: 34, h: 90, x: 10, delay: 0.05, color: "#232F55" },
  { w: 46, h: 140, x: 50, delay: 0.15, color: "#2B3A67" },
  { w: 30, h: 70, x: 104, delay: 0.02, color: "#1B2542" },
  { w: 54, h: 176, x: 142, delay: 0.22, color: "#2B3A67" },
  { w: 36, h: 110, x: 204, delay: 0.1, color: "#232F55" },
  { w: 44, h: 150, x: 248, delay: 0.28, color: "#1B2542" },
  { w: 30, h: 84, x: 300, delay: 0.06, color: "#2B3A67" },
  { w: 50, h: 130, x: 338, delay: 0.18, color: "#232F55" },
];

function Skyline() {
  return (
    <svg viewBox="0 0 400 200" className="w-full max-w-md">
      <defs>
        <linearGradient id="skyfade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F87171" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#F87171" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="196" width="400" height="4" fill="#F87171" opacity="0.35" />
      {BUILDINGS.map((b, i) => (
        <motion.g key={i}>
          <motion.rect
            x={b.x} width={b.w} fill={b.color} rx="3"
            initial={{ height: 0, y: 200 }}
            animate={{ height: b.h, y: 200 - b.h }}
            transition={{ duration: 0.9, delay: b.delay, ease: [0.22, 1, 0.36, 1] }}
          />
          {/* windows */}
          {Array.from({ length: Math.floor(b.h / 22) }).map((_, wi) => (
            <motion.rect
              key={wi}
              x={b.x + 7} y={200 - b.h + 12 + wi * 22}
              width={6} height={8} fill="#F87171"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.4, 1] }}
              transition={{ duration: 2.4, delay: b.delay + 0.6 + wi * 0.15, repeat: Infinity, repeatDelay: 2 }}
            />
          ))}
        </motion.g>
      ))}
    </svg>
  );
}

export default function AuthLayout({ children, panelTitle, panelSubtitle }) {
  return (
    <div className="flex min-h-screen bg-surface-muted">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 px-12 py-10 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-64 w-64 rounded-full bg-coral-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-white"><path d="M6 20V11l6-4.5 6 4.5v9h-4v-5H10v5z" /></svg>
          </div>
          <span className="font-display text-lg font-extrabold">PropertySerch</span>
        </div>

        <div className="relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="font-display text-3xl font-extrabold leading-snug text-white"
          >
            {panelTitle || "Every listing, lead and deal — one operating system."}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-3 max-w-sm text-sm text-indigo-100/80"
          >
            {panelSubtitle || "From first inquiry to final handover, built for brokers, builders and agencies who move fast."}
          </motion.p>

          <div className="mt-8 flex justify-center">
            <Skyline />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-6 flex gap-3"
          >
            {[
              { k: "1,204", v: "Active leads" },
              { k: "312", v: "Live listings" },
              { k: "16.4%", v: "Conversion" },
            ].map((s) => (
              <div key={s.v} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                <p className="font-display text-lg font-extrabold text-red-300">{s.k}</p>
                <p className="text-[11px] text-indigo-100/70">{s.v}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <p className="relative z-10 text-xs text-indigo-100/50">© {new Date().getFullYear()} PropertySerch.com — Real Estate Transaction OS</p>
      </div>

      <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-12 lg:w-1/2 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          className="mx-auto w-full max-w-sm"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
