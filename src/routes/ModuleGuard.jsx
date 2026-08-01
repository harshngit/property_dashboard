import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { canAccessModule } from "../config/roles";

export default function ModuleGuard({ moduleKey }) {
  const { role } = useAuth();
  if (!canAccessModule(role, moduleKey)) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return <Outlet />;
}
