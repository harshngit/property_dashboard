import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LuMail, LuLock, LuLogIn, LuEye, LuEyeOff } from "react-icons/lu";
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
      panelTitle="Every listing, lead and deal — one operating system."
      panelSubtitle="From first inquiry to final handover, built for brokers, builders and agencies who move fast."
    >
      <h1 className="font-display text-2xl font-extrabold text-ink-950">Welcome back</h1>
      <p className="mt-1.5 text-sm text-ink-500">Sign in to your PropertySerch workspace.</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <div>
          <label className="field-label">Email or mobile number</label>
          <div className="relative">
            <LuMail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500/60" />
            <input
              type="text" required placeholder="you@propertyserch.com or 9876543210"
              className="field-input pl-10"
              value={form.identifier}
              onChange={(e) => setForm((f) => ({ ...f, identifier: e.target.value }))}
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
    </AuthLayout>
  );
}
