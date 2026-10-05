import { Navigate, Route, Routes } from "react-router-dom";
import useAuth from "./hooks/useAuth";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import NotFound from "./pages/NotFound";

import ProtectedRoute from "./routes/ProtectedRoute";
import ModuleGuard from "./routes/ModuleGuard";
import DashboardLayout from "./layouts/DashboardLayout";

import Dashboard from "./pages/dashboard/Dashboard";
import LeadsList from "./pages/leads/LeadsList";
import LeadCreate from "./pages/leads/LeadCreate";
import LeadEdit from "./pages/leads/LeadEdit";
import LeadDetail from "./pages/leads/LeadDetail";
import PropertiesList from "./pages/properties/PropertiesList";
import PropertyCreate from "./pages/properties/PropertyCreate";
import PropertyEdit from "./pages/properties/PropertyEdit";
import PropertyDetail from "./pages/properties/PropertyDetail";
import CustomersList from "./pages/customers/CustomersList";
import CustomerDetail from "./pages/customers/CustomerDetail";
import BrokersList from "./pages/brokers/BrokersList";
import BrokerDetail from "./pages/brokers/BrokerDetail";
import AgenciesList from "./pages/agencies/AgenciesList";
import BuildersList from "./pages/builders/BuildersList";
import ProjectsList from "./pages/projects/ProjectsList";
import ProjectCreate from "./pages/projects/ProjectCreate";
import ProjectEdit from "./pages/projects/ProjectEdit";
import ProjectDetail from "./pages/projects/ProjectDetail";
import DealsList from "./pages/deals/DealsList";
import DealDetail from "./pages/deals/DealDetail";
import DealRoomPage from "./pages/deal-room/DealRoomPage";
import ContentPage from "./pages/content/ContentPage";
import AdminPage from "./pages/admin/AdminPage";
import TasksPage from "./pages/tasks/TasksPage";
import DocumentsPage from "./pages/documents/DocumentsPage";
import PaymentsPage from "./pages/payments/PaymentsPage";
import WhatsAppPage from "./pages/whatsapp/WhatsAppPage";
import AIPage from "./pages/ai/AIPage";
import ReportsPage from "./pages/reports/ReportsPage";
import UsersPage from "./pages/users/UsersPage";
import SettingsPage from "./pages/settings/SettingsPage";
import OpportunitiesPage from "./pages/opportunities/OpportunitiesPage";
import InvestorsPage from "./pages/investors/InvestorsPage";
import BusinessLeadsPage from "./pages/business-leads/BusinessLeadsPage";
import WorkspacePage from "./pages/workspace/WorkspacePage";
import MatchingPage from "./pages/matching/MatchingPage";
import TrustPage from "./pages/trust/TrustPage";
import FraudPage from "./pages/fraud/FraudPage";
import DisputesPage from "./pages/disputes/DisputesPage";
import InvoicesPage from "./pages/invoices/InvoicesPage";
import MandatesPage from "./pages/mandates/MandatesPage";
import RepresentativesPage from "./pages/representatives/RepresentativesPage";
import LeadSourcesPage from "./pages/lead-sources/LeadSourcesPage";
import IntelligencePage from "./pages/intelligence/IntelligencePage";
import ReputationPage from "./pages/reputation/ReputationPage";
import { MODULES } from "./config/roles";

// Customers (investors) land in their workspace, everyone else on the dashboard.
const homeFor = (role) => (role === "customer" ? "/app/workspace" : "/app/dashboard");

function RootRedirect() {
  const { isAuthenticated, role } = useAuth();
  return <Navigate to={isAuthenticated ? homeFor(role) : "/login"} replace />;
}

function AppHome() {
  const { role } = useAuth();
  return <Navigate to={homeFor(role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<DashboardLayout />}>
          <Route index element={<AppHome />} />
          <Route element={<ModuleGuard moduleKey={MODULES.DASHBOARD} />}>
            <Route path="dashboard" element={<Dashboard />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.WORKSPACE} />}>
            <Route path="workspace" element={<WorkspacePage />} />
            <Route path="workspace/:tab" element={<WorkspacePage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.LEADS} />}>
            <Route path="leads" element={<LeadsList />} />
            <Route path="leads/new" element={<LeadCreate />} />
            <Route path="leads/:id" element={<LeadDetail />} />
            <Route path="leads/:id/edit" element={<LeadEdit />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.PROPERTIES} />}>
            <Route path="properties" element={<PropertiesList />} />
            <Route path="properties/new" element={<PropertyCreate />} />
            <Route path="properties/:id" element={<PropertyDetail />} />
            <Route path="properties/:id/edit" element={<PropertyEdit />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.CUSTOMERS} />}>
            <Route path="customers" element={<CustomersList />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.BROKERS} />}>
            <Route path="brokers" element={<BrokersList />} />
            <Route path="brokers/:id" element={<BrokerDetail />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.AGENCIES} />}>
            <Route path="agencies" element={<AgenciesList />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.BUILDERS} />}>
            <Route path="builders" element={<BuildersList />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.PROJECTS} />}>
            <Route path="projects" element={<ProjectsList />} />
            <Route path="projects/new" element={<ProjectCreate />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="projects/:id/edit" element={<ProjectEdit />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.DEALS} />}>
            <Route path="deals" element={<DealsList />} />
            <Route path="deals/:id" element={<DealDetail />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.TASKS} />}>
            <Route path="tasks" element={<TasksPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.DOCUMENTS} />}>
            <Route path="documents" element={<DocumentsPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.PAYMENTS} />}>
            <Route path="payments" element={<PaymentsPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.WHATSAPP} />}>
            <Route path="whatsapp" element={<WhatsAppPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.AI} />}>
            <Route path="ai" element={<AIPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.REPORTS} />}>
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.OPPORTUNITIES} />}>
            <Route path="opportunities" element={<OpportunitiesPage />} />
            <Route path="deal-room/:propertyId" element={<DealRoomPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.DISPUTES} />}>
            <Route path="disputes" element={<DisputesPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.INTELLIGENCE} />}>
            <Route path="intelligence" element={<IntelligencePage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.INVOICES} />}>
            <Route path="invoices" element={<InvoicesPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.MANDATES} />}>
            <Route path="mandates" element={<MandatesPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.REPRESENTATIVES} />}>
            <Route path="representatives" element={<RepresentativesPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.LEAD_SOURCES} />}>
            <Route path="lead-sources" element={<LeadSourcesPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.REPUTATION} />}>
            <Route path="reputation" element={<ReputationPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.FRAUD} />}>
            <Route path="fraud" element={<FraudPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.TRUST} />}>
            <Route path="trust" element={<TrustPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.MATCHING} />}>
            <Route path="matching" element={<MatchingPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.INVESTORS} />}>
            <Route path="investors" element={<InvestorsPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.BUSINESS_LEADS} />}>
            <Route path="business-leads" element={<BusinessLeadsPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.USERS} />}>
            <Route path="users" element={<UsersPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.CONTENT} />}>
            <Route path="content" element={<ContentPage />} />
          </Route>

          <Route element={<ModuleGuard moduleKey={MODULES.ADMIN_PANEL} />}>
            <Route path="admin" element={<AdminPage />} />
          </Route>

          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
