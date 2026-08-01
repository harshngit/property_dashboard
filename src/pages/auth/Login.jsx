import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LuMail, LuLock, LuLogIn, LuEye, LuEyeOff } from "react-icons/lu";
import AuthLayout from "../../layouts/AuthLayout";
import { loginUser, clearAuthError } from "../../redux/slices/authSlice";
import { InlineSpinner } from "../../components/common/PageLoader";
import { ROLES, ROLE_LABELS } from "../../config/roles";
import { MOCK_USERS } from "../../data/mockData";

const DEMO_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.AGENCY_ADMIN, ROLES.BROKER, ROLES.BUILDER, ROLES.SALES];

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error, user } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ email: "", password: "", role: ROLES.BROKER });
  const [showPw, setShowPw] = useState(false);

  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);

  useEffect(() => {
    if (user) {
      const dest = location.state?.from?.pathname || "/app/dashboard";
      navigate(dest, { replace: true });
    }
  }, [user, navigate, location]);

  const submit = (e) => {
    e.preventDefault();
    dispatch(loginUser(form));
  };

  const fillDemo = (role) => {
    const demo = MOCK_USERS.find((u) => u.role === role);
    setForm({ email: demo.email, password: "demo1234", role });
  };

  return (
    <AuthLayout
      panelTitle="Every listing, lead and deal — one operating system."
      panelSubtitle="From first inquiry to final handover, built for brokers, builders and agencies who move fast."
    >
      <h1 className="font-display text-2xl font-extrabold text-ink-950">Welcome back</h1>
      <p className="mt-1.5 text-sm text-ink-500">Sign in to your PropertySerch workspace.</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <div>
          <label className="field-label">Sign in as</label>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ROLES.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setForm((f) => ({ ...f, role: r }))}
                className={`rounded-lg border px-2 py-2 text-[11px] font-semibold transition-all ${
                  form.role === r
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-line bg-white text-ink-500 hover:border-indigo-200"
                }`}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="field-label">Email address</label>
          <div className="relative">
            <LuMail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500/60" />
            <input
              type="email" required placeholder="you@propertyserch.com"
              className="field-input pl-10"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="field-label">Password</label>
          <div className="relative">
            <LuLock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500/60" />
            <input
              type={showPw ? "text" : "password"} required placeholder="••••••••"
              className="field-input pl-10 pr-10"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-500/60 hover:text-ink-900">
              {showPw ? <LuEyeOff className="h-4 w-4" /> : <LuEye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-ink-500">
            <input type="checkbox" className="h-3.5 w-3.5 rounded border-line text-red-500 focus:ring-red-500" />
            Remember me
          </label>
          <button type="button" onClick={() => fillDemo(form.role)} className="font-semibold text-red-600 hover:text-red-700">
            Autofill demo login
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-coral-200 bg-coral-50 px-3.5 py-2.5 text-xs font-medium text-coral-600">
            {error}
          </div>
        )}

        <button type="submit" disabled={status === "loading"} className="btn-primary w-full">
          {status === "loading" ? <InlineSpinner className="h-4 w-4" /> : <LuLogIn className="h-4 w-4" />}
          {status === "loading" ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        New to PropertySerch?{" "}
        <Link to="/register" className="font-semibold text-red-600 hover:text-red-700">Create an account</Link>
      </p>

      <p className="mt-4 rounded-xl bg-surface-sunk px-3.5 py-2.5 text-center text-[11px] text-ink-500">
        Demo tip: pick a role above, tap "Autofill demo login", then Sign in.
      </p>
    </AuthLayout>
  );
}
