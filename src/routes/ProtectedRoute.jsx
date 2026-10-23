import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { getSocket } from "../lib/socket";

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // One shared real-time connection for the whole authenticated session
  // (chat messages, unread badges) - connects on login, disconnects on
  // logout, rather than per-page.
  useEffect(() => {
    if (isAuthenticated) getSocket().connect();
    else getSocket().disconnect();
    return () => getSocket().disconnect();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
