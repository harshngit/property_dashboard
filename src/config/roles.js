export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  AGENCY_ADMIN: "agency_admin",
  BROKER: "broker",
  BUILDER: "builder",
  SALES: "internal_sales",
  CUSTOMER: "customer",
  ADVERTISER: "advertiser",
  FRANCHISEE_ADMIN: "franchisee_admin",
  // Panel partners (sec. 33.8): their own login, their own cases, never commission-bearing.
  LEGAL_PROFESSIONAL: "legal_professional",
  LOAN_OFFICER: "loan_officer",
  INSURANCE_OFFICER: "insurance_officer",
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
  [ROLES.FRANCHISEE_ADMIN]: "Franchisee Admin",
  [ROLES.LEGAL_PROFESSIONAL]: "Legal Professional",
  [ROLES.LOAN_OFFICER]: "Loan Officer",
  [ROLES.INSURANCE_OFFICER]: "Insurance Officer",
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
  [ROLES.FRANCHISEE_ADMIN]: "bg-teal-700 text-white",
  [ROLES.LEGAL_PROFESSIONAL]: "bg-slate-700 text-white",
  [ROLES.LOAN_OFFICER]: "bg-emerald-600 text-white",
  [ROLES.INSURANCE_OFFICER]: "bg-sky-600 text-white",
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
  // Sec. 14 franchise: the A R Buildwel desk, and the Franchisee Admin's own dashboard.
  FRANCHISE: "franchise",
  // Module 24 Legal Desk: legal cases and the panel of advocates / valuers.
  LEGAL: "legal",
  // Modules 25 / 26 Loan & Insurance Desk: applications, requests and the partner panel.
  FINANCE_DESK: "finance_desk",
  // Module 34 onboarding: the partner's own "Get started" and the staff desk.
  GET_STARTED: "get_started",
  ONBOARDING_DESK: "onboarding_desk",
  NOTIFICATION_INTEL: "notification_intel",
  FIELD_MANAGER: "field_manager",
  COUPONS: "coupons",
  SUSPENSIONS: "suspensions",
  TAX: "tax",
  // The panel partners' own desk (advocates, loan and insurance officers).
  PARTNER_DESK: "partner_desk",
  // Super Admin: dropdown lists and editable text of the dashboard and website.
  SITE_CONFIG: "site_config",
  // Module 37 Broker Network: co-broking.
  BROKER_NETWORK: "broker_network",
  MARKET_DIGEST: "market_digest",
  FRANCHISEE_PORTAL: "franchisee_portal",
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
    modules: Object.values(MODULES).filter((m) => m !== MODULES.WORKSPACE && m !== MODULES.FRANCHISEE_PORTAL && m !== MODULES.GET_STARTED && m !== MODULES.PARTNER_DESK),
    actions: { create: true, edit: true, delete: true, approve: true, export: true },
  },
  [ROLES.ADMIN]: {
    modules: [
      MODULES.DASHBOARD, MODULES.LEADS, MODULES.ENQUIRIES, MODULES.PROPERTIES, MODULES.CUSTOMERS,
      MODULES.BROKERS, MODULES.AGENCIES, MODULES.BUILDERS, MODULES.PROJECTS, MODULES.DEALS,
      MODULES.DOCUMENTS, MODULES.PAYMENTS, MODULES.WHATSAPP, MODULES.AI,
      MODULES.REPORTS, MODULES.TASKS, MODULES.USERS,
      MODULES.OPPORTUNITIES, MODULES.INSTITUTIONAL, MODULES.INVESTORS, MODULES.BUSINESS_LEADS,
      MODULES.CONTENT, MODULES.ADVERTISING, MODULES.REWARDS, MODULES.LANGUAGES, MODULES.COMPLIANCE, MODULES.MESSAGES, MODULES.DEVELOPER, MODULES.EXCHANGE, MODULES.FIELD_NETWORK, MODULES.TEMPLATES, MODULES.ADMIN_PANEL, MODULES.NOTIFICATION_INTEL, MODULES.FIELD_MANAGER, MODULES.COUPONS, MODULES.SUSPENSIONS, MODULES.TAX, MODULES.MATCHING, MODULES.TRUST, MODULES.REVIEWS, MODULES.FRANCHISE, MODULES.LEGAL, MODULES.FINANCE_DESK, MODULES.ONBOARDING_DESK, MODULES.BROKER_NETWORK, MODULES.MARKET_DIGEST, MODULES.TAX, MODULES.FRAUD, MODULES.DISPUTES, MODULES.INVOICES, MODULES.INTELLIGENCE, MODULES.REPUTATION, MODULES.MANDATES, MODULES.REPRESENTATIVES, MODULES.LEAD_SOURCES,
    ],
    actions: { create: true, edit: true, delete: true, approve: true, export: true },
  },
  [ROLES.AGENCY_ADMIN]: {
    modules: [
      MODULES.DASHBOARD, MODULES.LEADS, MODULES.ENQUIRIES, MODULES.PROPERTIES, MODULES.CUSTOMERS,
      MODULES.BROKERS, MODULES.DEALS, MODULES.INSTITUTIONAL, MODULES.DOCUMENTS, MODULES.TASKS, MODULES.REPORTS,
      MODULES.USERS, MODULES.BUSINESS_LEADS, MODULES.MATCHING, MODULES.TRUST, MODULES.GET_STARTED, MODULES.BROKER_NETWORK, MODULES.MARKET_DIGEST, MODULES.TAX, MODULES.DISPUTES, MODULES.INVOICES, MODULES.INTELLIGENCE, MODULES.REPUTATION, MODULES.LEAD_SOURCES, MODULES.REWARDS, MODULES.MESSAGES, MODULES.DEVELOPER, MODULES.TEMPLATES,
    ],
    actions: { create: true, edit: true, delete: false, approve: false, export: true },
  },
  [ROLES.BROKER]: {
    modules: [
      MODULES.DASHBOARD, MODULES.LEADS, MODULES.ENQUIRIES, MODULES.PROPERTIES, MODULES.CUSTOMERS,
      MODULES.DEALS, MODULES.INSTITUTIONAL, MODULES.DOCUMENTS, MODULES.TASKS, MODULES.MATCHING, MODULES.TRUST, MODULES.GET_STARTED, MODULES.BROKER_NETWORK, MODULES.MARKET_DIGEST, MODULES.TAX, MODULES.DISPUTES, MODULES.INVOICES, MODULES.INTELLIGENCE, MODULES.REPUTATION, MODULES.REWARDS, MODULES.MESSAGES, MODULES.DEVELOPER, MODULES.TEMPLATES,
    ],
    actions: { create: true, edit: true, delete: false, approve: false, export: false },
  },
  [ROLES.BUILDER]: {
    modules: [MODULES.MARKET_DIGEST, MODULES.DASHBOARD, MODULES.PROPERTIES, MODULES.PROJECTS, MODULES.LEADS, MODULES.ENQUIRIES, MODULES.DEALS, MODULES.REPORTS, MODULES.TRUST, MODULES.GET_STARTED, MODULES.DISPUTES, MODULES.INVOICES, MODULES.INTELLIGENCE, MODULES.REPUTATION, MODULES.REWARDS, MODULES.MESSAGES, MODULES.DEVELOPER, MODULES.TEMPLATES],
    actions: { create: true, edit: true, delete: false, approve: false, export: true },
  },
  [ROLES.SALES]: {
    modules: [
      MODULES.DASHBOARD, MODULES.LEADS, MODULES.ENQUIRIES, MODULES.CUSTOMERS, MODULES.PROPERTIES,
      MODULES.DEALS, MODULES.TASKS, MODULES.DOCUMENTS,
      MODULES.OPPORTUNITIES, MODULES.INSTITUTIONAL, MODULES.INVESTORS, MODULES.BUSINESS_LEADS, MODULES.ADVERTISING, MODULES.REWARDS, MODULES.LANGUAGES, MODULES.COMPLIANCE, MODULES.MESSAGES, MODULES.EXCHANGE, MODULES.FIELD_NETWORK, MODULES.TEMPLATES, MODULES.MATCHING, MODULES.TRUST, MODULES.FRANCHISE, MODULES.LEGAL, MODULES.FINANCE_DESK, MODULES.ONBOARDING_DESK, MODULES.BROKER_NETWORK, MODULES.MARKET_DIGEST, MODULES.TAX, MODULES.FRAUD, MODULES.DISPUTES, MODULES.INVOICES, MODULES.INTELLIGENCE, MODULES.REPUTATION, MODULES.MANDATES, MODULES.REPRESENTATIVES,
    ],
    actions: { create: true, edit: true, delete: false, approve: false, export: false },
  },
  [ROLES.CUSTOMER]: {
    modules: [MODULES.WORKSPACE],
    actions: { create: false, edit: false, delete: false, approve: false, export: false },
  },
  // A Franchisee Admin sees the franchise dashboard only - never leads or customers (sec. 14.9).
  [ROLES.FRANCHISEE_ADMIN]: {
    modules: [MODULES.FRANCHISEE_PORTAL],
    actions: { create: true, edit: true, delete: false, approve: true, export: false },
  },
  // Panel partners see their own desk and settings - nothing else in the CRM.
  [ROLES.LEGAL_PROFESSIONAL]: { modules: [MODULES.PARTNER_DESK, MODULES.SETTINGS], actions: { create: false, edit: true, delete: false, approve: false, export: false } },
  [ROLES.LOAN_OFFICER]: { modules: [MODULES.PARTNER_DESK, MODULES.SETTINGS], actions: { create: false, edit: true, delete: false, approve: false, export: false } },
  [ROLES.INSURANCE_OFFICER]: { modules: [MODULES.PARTNER_DESK, MODULES.SETTINGS], actions: { create: false, edit: true, delete: false, approve: false, export: false } },
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
