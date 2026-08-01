import { useSelector, useDispatch } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import { getActionPermissions } from "../config/roles";

export default function useAuth() {
  const { user, status, error } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const permissions = user ? getActionPermissions(user.role) : {};

  return {
    user,
    role: user?.role,
    isAuthenticated: !!user,
    status,
    error,
    permissions,
    signOut: () => dispatch(logout()),
  };
}
