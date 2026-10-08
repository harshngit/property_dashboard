export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  AGENCY_ADMIN: "agency_admin",
  BROKER: "broker",
  BUILDER: "builder",
  SALES: "internal_sales",
  CUSTOMER: "customer",
  ADVERTISER: "advertiser",
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADMIN]: "Admin",
  [ROLES.AGENCY_ADMIN]: "Agency Admin",
  [ROLES.BROKER]: "Broker / Agent",
  [ROLES.BUILDER]: "Builder / Developer",
  [ROLES.SALES]: "Internal Sales",
  [ROLES.CUSTOMER]: "Customer",
  [ROLES.ADVERTISER]: "Advertiser",
};

export const ROLE_BADGE_CLASS = {
  [ROLES.SUPER_ADMIN]: "bg-ink-900 text-white",
  [ROLES.ADMIN]: "bg-indigo-500 text-white",
  [ROLES.AGENCY_ADMIN]: "bg-red-600 text-white",
  [ROLES.BROKER]: "bg-coral-500 text-white",
  [ROLES.BUILDER]: "bg-amber-500 text-white",
  [ROLES.SALES]: "bg-indigo-400 text-white",
  [ROLES.CUSTOMER]: "bg-teal-500 text-white",
  [ROLES.ADVERTISER]: "bg-amber-600 text-white",
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
  PROJECTS: "projects",
  DEALS: "deals",
  DOCUMENTS: "documents",
  PAYMENTS: "payments",
  WHATSAPP: "whatsapp",
  AI: "ai",
  REPORTS: "reports",
  TASKS: "tasks",
  SETTINGS: "settings",
  USERS: "users",
  OPPORTUNITIES: "opportunities",
  INVESTORS: "investors",
  BUSINESS_LEADS: "business_leads",
  CONTENT: "content",
  ADMIN_PANEL: "admin_panel",
  // Customer-facing Full CRM (sec. 13.2A): HNI investors from joining,
  // other customers after the usage threshold - the page checks eligibility.
  WORKSPACE: "workspace",
  // Engine 5 Requirement Marketplace + matching engine controls.
  MATCHING: "matching",
  // Module 6 Trust & Reputation (score, badges, verifications, reviews).
  TRUST: "trust",
  // Reviews desk: every customer review, any status (admin / super admin).
  REVIEWS: "reviews",
  // Sec. 9 verification, duplicates & fraud review desk (A R staff).
  FRAUD: "fraud",
  // Engine 5 disputes, lead conflicts and the due-diligence queue.
  DISPUTES: "disputes",
  // Module 40 professional-fee invoices (Instalment 1 / 2, lease).
  INVOICES: "invoices",
  // Engine 5 Deal Intelligence Dashboard.
  INTELLIGENCE: "intelligence",
  // Module 44 Reputation Graph.
  REPUTATION: "reputation",
  // Module 46 Exclusive Mandate management (A R staff).
  MANDATES: "mandates",
  // Sec. 34 representatives, coverage and broker -> RM mapping.
  REPRESENTATIVES: "representatives",
  // Engine 2 lead source activation, ingestion review queue.
  LEAD_SOURCES: "lead_sources",
  // Enquiry desk: enquiries by type + site-visit requests.
  ENQUIRIES: "enquiries",
  // Engine 7 institutional desk (staff: pipeline, listings, buyers; certified brokers: their listings).
  INSTITUTIONAL: "institutional",
  // Module 17 advertising: staff revenue / approvals / rate card; the Advertiser Portal for advertisers.
  ADVERTISING: "advertising",
  // Module 29 points, tiers and leaderboards.
  REWARDS: "rewards",
  // Module 30 interface languages and translations (A R staff).
  LANGUAGES: "languages",
  // Modules 32 / 33: compliance & risk alerts and DPDP data requests (A R staff).
  COMPLIANCE: "compliance",
  // Module 36 in-platform messaging on enquiries.
  MESSAGES: "messages",
  // Module 35 API keys and webhooks for an organisation's own systems.
  DEVELOPER: "developer",
  // Module 45 property exchange desk (A R staff).
  EXCHANGE: "exchange",
  // Module 47 Work From Home field network (A R staff).
  FIELD_NETWORK: "field_network",
  // Module 50 document template engine.
  TEMPLATES: "templates",
};

// Which modules each role can access, and which actions they get in list pages
export const ROLE_ACCESS = {
  [ROLES.SUPER_ADMIN]: {
    modules: Object.values(MODULES).filter((m) => m !== MODULES.WORKSPACE),
    actions: { create: true, edit: true, delete: true, approve: true, export: true },
  },
  [ROLES.ADMIN]: {
    modules: [
      MODULES.DASHBOARD, MODULES.LEADS, MODULES.ENQUIRIES, MODULES.PROPERTIES, MODULES.CUSTOMERS,
      MODULES.BROKERS, MODULES.AGENCIES, MODULES.BUILDERS, MODULES.PROJECTS, MODULES.DEALS,
      MODULES.DOCUMENTS, MODULES.PAYMENTS, MODULES.WHATSAPP, MODULES.AI,
      MODULES.REPORTS, MODULES.TASKS, MODULES.USERS,
      MODULES.OPPORTUNITIES, MODULES.INSTITUTIONAL, MODULES.INVESTORS, MODULES.BUSINESS_LEADS,
      MODULES.CONTENT, MODULES.ADVERTISING, MODULES.REWARDS, MODULES.LANGUAGES, MODULES.COMPLIANCE, MODULES.MESSAGES, MODULES.DEVELOPER, MODULES.EXCHANGE, MODULES.FIELD_NETWORK, MODULES.TEMPLATES, MODULES.ADMIN_PANEL, MODULES.MATCHING, MODULES.TRUST, MODULES.REVIEWS, MODULES.FRAUD, MODULES.DISPUTES, MODULES.INVOICES, MODULES.INTELLIGENCE, MODULES.REPUTATION, MODULES.MANDATES, MODULES.REPRESENTATIVES, MODULES.LEAD_SOURCES,
    ],
    actions: { create: true, edit: true, delete: true, approve: true, export: true },
  },
  [ROLES.AGENCY_ADMIN]: {
    modules: [
      MODULES.DASHBOARD, MODULES.LEADS, MODULES.ENQUIRIES, MODULES.PROPERTIES, MODULES.CUSTOMERS,
      MODULES.BROKERS, MODULES.DEALS, MODULES.INSTITUTIONAL, MODULES.DOCUMENTS, MODULES.TASKS, MODULES.REPORTS,
      MODULES.USERS, MODULES.BUSINESS_LEADS, MODULES.MATCHING, MODULES.TRUST, MODULES.DISPUTES, MODULES.INVOICES, MODULES.INTELLIGENCE, MODULES.REPUTATION, MODULES.LEAD_SOURCES, MODULES.REWARDS, MODULES.MESSAGES, MODULES.DEVELOPER, MODULES.TEMPLATES,
    ],
    actions: { create: true, edit: true, delete: false, approve: false, export: true },
  },
  [ROLES.BROKER]: {
    modules: [
      MODULES.DASHBOARD, MODULES.LEADS, MODULES.ENQUIRIES, MODULES.PROPERTIES, MODULES.CUSTOMERS,
      MODULES.DEALS, MODULES.INSTITUTIONAL, MODULES.DOCUMENTS, MODULES.TASKS, MODULES.MATCHING, MODULES.TRUST, MODULES.DISPUTES, MODULES.INVOICES, MODULES.INTELLIGENCE, MODULES.REPUTATION, MODULES.REWARDS, MODULES.MESSAGES, MODULES.DEVELOPER, MODULES.TEMPLATES,
    ],
    actions: { create: true, edit: true, delete: false, approve: false, export: false },
  },
  [ROLES.BUILDER]: {
    modules: [MODULES.DASHBOARD, MODULES.PROPERTIES, MODULES.PROJECTS, MODULES.LEADS, MODULES.ENQUIRIES, MODULES.DEALS, MODULES.REPORTS, MODULES.TRUST, MODULES.DISPUTES, MODULES.INVOICES, MODULES.INTELLIGENCE, MODULES.REPUTATION, MODULES.REWARDS, MODULES.MESSAGES, MODULES.DEVELOPER, MODULES.TEMPLATES],
    actions: { create: true, edit: true, delete: false, approve: false, export: true },
  },
  [ROLES.SALES]: {
    modules: [
      MODULES.DASHBOARD, MODULES.LEADS, MODULES.ENQUIRIES, MODULES.CUSTOMERS, MODULES.PROPERTIES,
      MODULES.DEALS, MODULES.TASKS, MODULES.DOCUMENTS,
      MODULES.OPPORTUNITIES, MODULES.INSTITUTIONAL, MODULES.INVESTORS, MODULES.BUSINESS_LEADS, MODULES.ADVERTISING, MODULES.REWARDS, MODULES.LANGUAGES, MODULES.COMPLIANCE, MODULES.MESSAGES, MODULES.EXCHANGE, MODULES.FIELD_NETWORK, MODULES.TEMPLATES, MODULES.MATCHING, MODULES.TRUST, MODULES.FRAUD, MODULES.DISPUTES, MODULES.INVOICES, MODULES.INTELLIGENCE, MODULES.REPUTATION, MODULES.MANDATES, MODULES.REPRESENTATIVES,
    ],
    actions: { create: true, edit: true, delete: false, approve: false, export: false },
  },
  [ROLES.CUSTOMER]: {
    modules: [MODULES.WORKSPACE],
    actions: { create: false, edit: false, delete: false, approve: false, export: false },
  },
  // Approved advertisers only see their portal.
  [ROLES.ADVERTISER]: {
    modules: [MODULES.ADVERTISING],
    actions: { create: true, edit: true, delete: false, approve: false, export: false },
  },
};

export const canAccessModule = (role, moduleKey) =>
  ROLE_ACCESS[role]?.modules.includes(moduleKey);

export const getActionPermissions = (role) =>
  ROLE_ACCESS[role]?.actions || { create: false, edit: false, delete: false, approve: false, export: false };
