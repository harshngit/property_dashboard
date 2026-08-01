import {
  LuLayoutDashboard, LuUsers, LuBuilding2, LuUserRound, LuHandshake,
  LuFileStack, LuWallet, LuMessageCircle, LuSparkles, LuChartColumn,
  LuListChecks, LuSettings, LuShieldCheck, LuNetwork,
} from "react-icons/lu";
import { MODULES } from "./roles";

export const NAV_ITEMS = [
  { key: MODULES.DASHBOARD, label: "Dashboard", to: "/app/dashboard", icon: LuLayoutDashboard },
  { key: MODULES.LEADS, label: "Leads", to: "/app/leads", icon: LuHandshake },
  { key: MODULES.PROPERTIES, label: "Properties", to: "/app/properties", icon: LuBuilding2 },
  { key: MODULES.CUSTOMERS, label: "Customers", to: "/app/customers", icon: LuUserRound },
  { key: MODULES.BROKERS, label: "Brokers", to: "/app/brokers", icon: LuUsers },
  { key: MODULES.AGENCIES, label: "Agencies", to: "/app/agencies", icon: LuNetwork },
  { key: MODULES.BUILDERS, label: "Builders", to: "/app/builders", icon: LuBuilding2 },
  { key: MODULES.DEALS, label: "Deal Pipeline", to: "/app/deals", icon: LuChartColumn },
  { key: MODULES.TASKS, label: "Tasks & Follow-ups", to: "/app/tasks", icon: LuListChecks },
  { key: MODULES.DOCUMENTS, label: "Documents", to: "/app/documents", icon: LuFileStack },
  { key: MODULES.PAYMENTS, label: "Payments", to: "/app/payments", icon: LuWallet },
  { key: MODULES.WHATSAPP, label: "WhatsApp", to: "/app/whatsapp", icon: LuMessageCircle },
  { key: MODULES.AI, label: "AI Qualification", to: "/app/ai", icon: LuSparkles },
  { key: MODULES.REPORTS, label: "Reports", to: "/app/reports", icon: LuChartColumn },
  { key: MODULES.USERS, label: "Users & Roles", to: "/app/users", icon: LuShieldCheck },
  { key: MODULES.SETTINGS, label: "Settings", to: "/app/settings", icon: LuSettings },
];
