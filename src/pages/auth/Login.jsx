import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LuMail, LuLock, LuLogIn, LuEye, LuEyeOff } from "react-icons/lu";
import { FaGoogle } from "react-icons/fa";
import AuthLayout from "../../layouts/AuthLayout";
import { loginUser, clearAuthError } from "../../redux/slices/authSlice";
import { InlineSpinner } from "../../components/common/PageLoader";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error, user, accessToken } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPw, setShowPw] = useState(false);

  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);

  useEffect(() => {
    if (user && accessToken) {
      const dest = location.state?.from?.pathname || "/app/dashboard";
      navigate(dest, { replace: true });
    }
  }, [user, accessToken, navigate, location]);

  const submit = (e) => {
    e.preventDefault();
    dispatch(loginUser(form));
  };

  return (
    <AuthLayout
      panelEyebrow="Brokerage operations"
      panelTitle="Close more property deals from one clean, shared workspace."
      panelSubtitle="Manage listings, leads, site visits and deal movement with a CRM built for real estate teams."
    >
      <div className="mb-6">
        <div className="text-red-600">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M10.67 2h2.66v6.08L18.6 5.05l1.33 2.31-5.27 3.03 5.27 3.03-1.33 2.31-5.27-3.03V19h-2.66v-6.33L5.4 15.7l-1.33-2.31 5.27-3.03-5.27-3.03L5.4 5.05l5.27 3.03V2Z" /></svg>
        </div>
        <h1 className="auth-panel-title">Welcome back</h1>
        <p className="auth-panel-copy">Access your leads, listings and broker workflow from one clean workspace.</p>
        <button
          type="button"
          className="mt-3 flex min-h-[40px] w-full items-center justify-center gap-2.5 rounded-2xl border border-line bg-white px-4 text-[13px] font-medium text-ink-900 transition-colors hover:border-red-200 hover:bg-red-50/40"
        >
          <FaGoogle className="h-4 w-4 text-[#4285F4]" />
          Login with Google
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="field-label">Your email or mobile</label>
          <div className="relative">
            <LuMail className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B3B3BC]" />
            <input
              type="text" required placeholder="you@propertyserch.com or 9876543210"
              className="field-input auth-field pl-11"
              value={form.identifier}
              onChange={(e) => setForm((f) => ({ ...f, identifier: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="field-label">Password</label>
          <div className="relative">
            <LuLock className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B3B3BC]" />
            <input
              type={showPw ? "text" : "password"} required placeholder="••••••••"
              className="field-input auth-field pl-11 pr-11"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#AEAFB8] hover:text-red-600">
              {showPw ? <LuEyeOff className="h-3.5 w-3.5" /> : <LuEye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end text-[11px]">
          <label className="flex items-center gap-1.5 text-ink-500">
            <input type="checkbox" className="h-3.5 w-3.5 rounded border-line text-red-600 focus:ring-red-500" />
            Remember me
          </label>
        </div>

        {error && (
          <div className="rounded-2xl border border-coral-200 bg-coral-50 px-4 py-3 text-xs font-medium text-coral-600">
            {error}
          </div>
        )}

        <button type="submit" disabled={status === "loading"} className="btn auth-submit mt-2 w-full">
          {status === "loading" ? <InlineSpinner className="h-4 w-4" /> : <LuLogIn className="h-4 w-4" />}
          {status === "loading" ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-[#6F6F78]">
        New to PropertySerch?{" "}
        <Link to="/register" className="font-semibold text-red-600 hover:text-red-700">Sign up</Link>
      </p>
    </AuthLayout>
  );
}
