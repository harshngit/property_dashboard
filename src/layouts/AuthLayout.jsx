import { motion } from "framer-motion";

export default function AuthLayout({ children, panelTitle, panelSubtitle, panelEyebrow = "Real estate CRM" }) {
  return (
    <div className="min-h-screen overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(255,81,47,0.14),_transparent_30%),linear-gradient(180deg,_rgba(255,81,47,0.08)_0%,_rgba(221,36,118,0.10)_100%)] px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_35px_100px_-45px_rgba(24,31,66,0.35)] backdrop-blur sm:min-h-[calc(100vh-2rem)]">
        <div className="relative hidden w-[46%] overflow-hidden p-3 lg:flex">
          <div className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[2rem] bg-[url('/loginbg.jpg')] bg-cover bg-center">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,81,47,0.06)_26%,rgba(221,36,118,0.16)_70%,rgba(255,255,255,0.02)_100%)]" />

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="relative z-10 px-6 pt-6 xl:px-7 xl:pt-7"
            >
              <svg viewBox="0 0 24 24" className="h-9 w-9 fill-white xl:h-11 xl:w-11">
                <path d="M10.67 2h2.66v6.08L18.6 5.05l1.33 2.31-5.27 3.03 5.27 3.03-1.33 2.31-5.27-3.03V19h-2.66v-6.33L5.4 15.7l-1.33-2.31 5.27-3.03-5.27-3.03L5.4 5.05l5.27 3.03V2Z" />
              </svg>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="relative z-10 max-w-[320px] px-6 pb-7 xl:max-w-[380px] xl:px-7 xl:pb-8"
            >
              <p className="text-[15px] font-medium tracking-[-0.02em] text-white/92 xl:text-[16px]">
                You can easily
              </p>
              <h2 className="mt-3 font-body text-[24px] font-semibold leading-[1.15] tracking-[-0.04em] text-white xl:mt-5 xl:text-[29px]">
                Get access your personal hub for clarity and productivity
              </h2>
            </motion.div>
          </div>
        </div>

        <div className="flex w-full items-center justify-center bg-white px-4 py-5 sm:px-5 sm:py-5 lg:w-[54%] lg:px-7 xl:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="w-full max-w-[440px] px-1 py-1"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
