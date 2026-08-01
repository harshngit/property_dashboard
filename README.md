# PropertySerch.com — CRM Frontend

A modern, role-based CRM dashboard for PropertySerch.com's Real Estate Transaction OS, built from the PRD.

## Stack
- React 19 + Vite
- Redux Toolkit (auth login/register/logout, UI state) + React Redux
- React Router v6 (protected + role/module-guarded routes)
- Tailwind CSS (custom design system: indigo/teal/coral palette, Plus Jakarta Sans + Inter)
- Headless UI (dropdown menus, modals)
- Framer Motion (page/loader/auth animations)
- Recharts (dashboard & report charts)
- React Icons (Lucide set)

## Getting started
```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build to /dist
npm run preview   # preview the production build
```

## Demo login
Go to `/login`, pick a role chip (Super Admin / Admin / Agency Admin / Broker / Builder / Sales),
click "Autofill demo login", then Sign in. Each role has its own dashboard, sidebar, and
permission set (create/edit/delete/approve/export) defined in `src/config/roles.js`.

Demo accounts (any password 4+ characters):
- superadmin@propertyserch.com
- admin@propertyserch.com
- agency@propertyserch.com
- broker@propertyserch.com
- builder@propertyserch.com
- sales@propertyserch.com

## Structure
- `src/redux` — store + `authSlice` (login/register/logout) + `uiSlice`
- `src/config` — roles/permissions matrix (`roles.js`) and sidebar nav (`navigation.js`)
- `src/layouts` — `DashboardLayout` (sidebar/topbar shell) and `AuthLayout` (animated split-screen)
- `src/components/common` — reusable library: `DataTable` (search/filter/paginate/actions),
  `ActionMenu` (3-dot row menu), `Modal`/`ConfirmDialog`, `QuickFormModal`, `PageHeader`,
  `StatCard`, `StatusBadge`, `Avatar`, `EmptyState`, `PageLoader`, `ToastProvider`, `FormField`
- `src/pages` — one folder per module (leads, properties, customers, brokers, agencies,
  builders, deals, tasks, documents, payments, whatsapp, ai, reports, users, settings, auth)
- `src/data/mockData.js` — mock records so every screen renders real-looking data out of the box

## Notes
- All data is in-memory mock data (see `src/data/mockData.js`) — wire up your real API
  endpoints where the thunks and page-level handlers currently simulate save/delete.
- Role-based access is enforced both in navigation (sidebar only shows permitted modules) and
  routing (`ModuleGuard` redirects to dashboard if a role hits a disallowed URL directly).
- List → Create/Edit pattern is fully built out for Leads and Properties (dedicated pages);
  simpler modules (Brokers, Agencies, Builders, Deals, Customers, Users) use a shared
  `QuickFormModal` for fast add/edit without leaving the list.
