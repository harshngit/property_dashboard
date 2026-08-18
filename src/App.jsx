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
import DealsList from "./pages/deals/DealsList";
import TasksPage from "./pages/tasks/TasksPage";
import DocumentsPage from "./pages/documents/DocumentsPage";
import PaymentsPage from "./pages/payments/PaymentsPage";
import WhatsAppPage from "./pages/whatsapp/WhatsAppPage";
import AIPage from "./pages/ai/AIPage";
import ReportsPage from "./pages/reports/ReportsPage";
import UsersPage from "./pages/users/UsersPage";
import SettingsPage from "./pages/settings/SettingsPage";
import { MODULES } from "./config/roles";

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? "/app/dashboard" : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<DashboardLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

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

          <Route element={<ModuleGuard moduleKey={MODULES.DEALS} />}>
            <Route path="deals" element={<DealsList />} />
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

          <Route element={<ModuleGuard moduleKey={MODULES.USERS} />}>
            <Route path="users" element={<UsersPage />} />
          </Route>

          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
