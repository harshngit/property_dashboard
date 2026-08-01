export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  AGENCY_ADMIN: "agency_admin",
  BROKER: "broker",
  BUILDER: "builder",
  SALES: "sales",
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADMIN]: "Admin",
  [ROLES.AGENCY_ADMIN]: "Agency Admin",
  [ROLES.BROKER]: "Broker / Agent",
  [ROLES.BUILDER]: "Builder / Developer",
  [ROLES.SALES]: "Internal Sales",
};

export const ROLE_BADGE_CLASS = {
  [ROLES.SUPER_ADMIN]: "bg-ink-900 text-white",
  [ROLES.ADMIN]: "bg-indigo-500 text-white",
  [ROLES.AGENCY_ADMIN]: "bg-red-600 text-white",
  [ROLES.BROKER]: "bg-coral-500 text-white",
  [ROLES.BUILDER]: "bg-amber-500 text-white",
  [ROLES.SALES]: "bg-indigo-400 text-white",
};

// Module keys used across nav + permission checks
export const MODULES = {
  DASHBOARD: "dashboard",
  LEADS: "leads",
  PROPERTIES: "properties",
  CUSTOMERS: "customers",
  BROKERS: "brokers",
  AGENCIES: "agencies",
  BUILDERS: "builders",
  DEALS: "deals",
  DOCUMENTS: "documents",
  PAYMENTS: "payments",
  WHATSAPP: "whatsapp",
  AI: "ai",
  REPORTS: "reports",
  TASKS: "tasks",
  SETTINGS: "settings",
  USERS: "users",
};

// Which modules each role can access, and which actions they get in list pages
export const ROLE_ACCESS = {
  [ROLES.SUPER_ADMIN]: {
    modules: Object.values(MODULES),
    actions: { create: true, edit: true, delete: true, approve: true, export: true },
  },
  [ROLES.ADMIN]: {
    modules: [
      MODULES.DASHBOARD, MODULES.LEADS, MODULES.PROPERTIES, MODULES.CUSTOMERS,
      MODULES.BROKERS, MODULES.AGENCIES, MODULES.BUILDERS, MODULES.DEALS,
      MODULES.DOCUMENTS, MODULES.PAYMENTS, MODULES.WHATSAPP, MODULES.AI,
      MODULES.REPORTS, MODULES.TASKS, MODULES.USERS,
    ],
    actions: { create: true, edit: true, delete: true, approve: true, export: true },
  },
  [ROLES.AGENCY_ADMIN]: {
    modules: [
      MODULES.DASHBOARD, MODULES.LEADS, MODULES.PROPERTIES, MODULES.CUSTOMERS,
      MODULES.BROKERS, MODULES.DEALS, MODULES.DOCUMENTS, MODULES.TASKS, MODULES.REPORTS,
    ],
    actions: { create: true, edit: true, delete: false, approve: false, export: true },
  },
  [ROLES.BROKER]: {
    modules: [
      MODULES.DASHBOARD, MODULES.LEADS, MODULES.PROPERTIES, MODULES.CUSTOMERS,
      MODULES.DEALS, MODULES.DOCUMENTS, MODULES.TASKS,
    ],
    actions: { create: true, edit: true, delete: false, approve: false, export: false },
  },
  [ROLES.BUILDER]: {
    modules: [MODULES.DASHBOARD, MODULES.PROPERTIES, MODULES.LEADS, MODULES.DEALS, MODULES.REPORTS],
    actions: { create: true, edit: true, delete: false, approve: false, export: true },
  },
  [ROLES.SALES]: {
    modules: [
      MODULES.DASHBOARD, MODULES.LEADS, MODULES.CUSTOMERS, MODULES.PROPERTIES,
      MODULES.DEALS, MODULES.TASKS, MODULES.DOCUMENTS,
    ],
    actions: { create: true, edit: true, delete: false, approve: false, export: false },
  },
};

export const canAccessModule = (role, moduleKey) =>
  ROLE_ACCESS[role]?.modules.includes(moduleKey);

export const getActionPermissions = (role) =>
  ROLE_ACCESS[role]?.actions || { create: false, edit: false, delete: false, approve: false, export: false };
