import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "../redux/slices/authSlice";
import { getActionPermissions } from "../config/roles";

export default function useAuth() {
  const { user, accessToken, status, error } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const permissions = user ? getActionPermissions(user.role) : {};

  return {
    user,
    role: user?.role,
    isAuthenticated: !!user && !!accessToken,
    status,
    error,
    permissions,
    signOut: () => dispatch(logoutUser()),
  };
}
