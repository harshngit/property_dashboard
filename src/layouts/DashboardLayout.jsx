import { Fragment, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Menu, Transition } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LuMenu, LuBell, LuChevronDown, LuLogOut, LuUserCog, LuSettings, LuX,
} from "react-icons/lu";
import { NAV_ITEMS } from "../config/navigation";
import { ROLE_LABELS, canAccessModule } from "../config/roles";
import { toggleMobileNav, closeMobileNav } from "../redux/slices/uiSlice";
import useAuth from "../hooks/useAuth";
import useRouteLoading from "../hooks/useRouteLoading";
import Avatar from "../components/common/Avatar";
import PageLoader from "../components/common/PageLoader";
import GlobalSearch from "../components/common/GlobalSearch";
import { PageTitleProvider, usePageTitle } from "../context/PageTitleContext";

function BrandMark({ collapsed }) {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 shadow-glow">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-white"><path d="M6 20V11l6-4.5 6 4.5v9h-4v-5H10v5z" /></svg>
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <p className="font-display text-sm font-extrabold text-ink-950">PropertySerch</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Transaction OS</p>
        </div>
      )}
    </div>
  );
}

function SidebarContent({ role, collapsed }) {
  return (
    <nav className="no-scrollbar mt-6 flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
      {NAV_ITEMS.filter((item) => canAccessModule(role, item.key)).map((item) => (
        <NavLink
          key={item.key}
          to={item.to}
          className={({ isActive }) => (isActive ? "sidebar-link-active" : "sidebar-link")}
          title={collapsed ? item.label : undefined}
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

export default function DashboardLayout() {
  return (
    <PageTitleProvider>
      <DashboardShell />
    </PageTitleProvider>
  );
}

function DashboardShell() {
  const { user, role, signOut } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { mobileNavOpen } = useSelector((s) => s.ui);
  const routeLoading = useRouteLoading();
  const [sidebarHovering, setSidebarHovering] = useState(false);
  const sidebarExpanded = sidebarHovering;
  const { title } = usePageTitle();

  const handleLogout = () => {
    signOut();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-muted/90">
      {/* Desktop sidebar */}
      <aside
        onMouseEnter={() => setSidebarHovering(true)}
        onMouseLeave={() => setSidebarHovering(false)}
        className={`relative z-10 hidden shrink-0 flex-col border-r border-line bg-white transition-all duration-200 lg:flex ${
          sidebarExpanded ? "w-64 shadow-[0_16px_40px_-12px_rgba(220,38,38,0.35)]" : "w-[76px] shadow-card"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-1">
          <BrandMark collapsed={!sidebarExpanded} />
        </div>
        <SidebarContent role={role} collapsed={!sidebarExpanded} />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileNavOpen && (
          <Fragment>
            <motion.div
              className="fixed inset-0 z-40 bg-ink-950/50 lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => dispatch(closeMobileNav())}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-white lg:hidden"
              initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <div className="flex h-16 items-center justify-between border-b border-line px-4">
                <BrandMark collapsed={false} />
                <button onClick={() => dispatch(closeMobileNav())} className="text-ink-500"><LuX className="h-5 w-5" /></button>
              </div>
              <SidebarContent role={role} collapsed={false} />
            </motion.aside>
          </Fragment>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="relative z-30 flex h-16 shrink-0 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => dispatch(toggleMobileNav())} className="rounded-lg p-2 text-ink-700 hover:bg-surface-sunk lg:hidden">
              <LuMenu className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl font-extrabold text-ink-950">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <GlobalSearch role={role} />

            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-2.5 rounded-xl p-1 pr-2 hover:bg-surface-sunk">
                <Avatar name={user?.name} color={user?.avatarColor} size={36} />
                <div className="hidden text-left leading-tight sm:block">
                  <p className="text-sm font-bold text-ink-950">{user?.name}</p>
                  <p className="text-xs text-ink-500">{ROLE_LABELS[role]}</p>
                </div>
                <LuChevronDown className="hidden h-4 w-4 text-ink-500 sm:block" />
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-120" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                leave="transition ease-in duration-90" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-30 mt-2 w-56 origin-top-right overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-pop focus:outline-none">
                  <div className="border-b border-line px-3 py-2.5">
                    <p className="text-sm font-bold text-ink-900">{user?.name}</p>
                    <p className="truncate text-xs text-ink-500">{user?.email}</p>
                  </div>
                  <Menu.Item>
                    {({ active }) => (
                      <button onClick={() => navigate("/app/settings")} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-surface-sunk" : ""}`}>
                        <LuUserCog className="h-4 w-4" /> My Profile
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button onClick={() => navigate("/app/settings")} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-surface-sunk" : ""}`}>
                        <LuSettings className="h-4 w-4" /> Settings
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button onClick={handleLogout} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-coral-600 ${active ? "bg-coral-50" : ""}`}>
                        <LuLogOut className="h-4 w-4" /> Log out
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>

            <button onClick={() => navigate("/app/settings")} className="rounded-lg p-2 text-ink-700 hover:bg-surface-sunk" title="Settings">
              <LuSettings className="h-5 w-5" />
            </button>
            <button className="relative rounded-lg p-2 text-ink-700 hover:bg-surface-sunk" title="Notifications">
              <LuBell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-coral-500 ring-2 ring-white" />
            </button>
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {routeLoading && (
            <div className="absolute inset-0 z-20 flex items-start justify-center bg-red-50/70 pt-24 backdrop-blur-[1px]">
              <div className="h-8 w-8 animate-spinSlow rounded-full border-[3px] border-red-500/25 border-t-red-500" />
            </div>
          )}
          <div className="mx-auto max-w-[1600px] animate-rise">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
