import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { LuUser, LuMail, LuPhone, LuLock, LuUserPlus, LuCircleCheck } from "react-icons/lu";
import AuthLayout from "../../layouts/AuthLayout";
import { registerUser, clearAuthError, clearRegisteredUser } from "../../redux/slices/authSlice";
import { InlineSpinner } from "../../components/common/PageLoader";
import { ROLES, ROLE_LABELS } from "../../config/roles";

const SELF_SERVICE_ROLES = [ROLES.BROKER, ROLES.CUSTOMER];

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error, registeredUser } = useSelector((s) => s.auth);
  const [form, setForm] = useState({
    fullName: "", email: "", mobile: "", password: "", confirm: "", role: ROLES.BROKER,
  });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    dispatch(clearAuthError());
    dispatch(clearRegisteredUser());
  }, [dispatch]);

  const mismatch = touched && form.confirm && form.confirm !== form.password;

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (form.password !== form.confirm) return;
    dispatch(registerUser(form));
  };

  if (registeredUser) {
    return (
      <AuthLayout
        panelTitle="Set up your team in minutes, not weeks."
        panelSubtitle="Role-based access for admins, agencies, brokers, builders and sales — from day one."
      >
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <LuCircleCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-950">Account created</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Welcome, {registeredUser.name}. You can now sign in with your email or mobile number.
          </p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="btn-primary mt-6 w-full"
          >
            Go to sign in
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      panelTitle="Set up your team in minutes, not weeks."
      panelSubtitle="Role-based access for admins, agencies, brokers, builders and sales — from day one."
    >
      <h1 className="font-display text-2xl font-extrabold text-ink-950">Create your account</h1>
      <p className="mt-1.5 text-sm text-ink-500">Get your workspace up and running.</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <div>
          <label className="field-label">Full name</label>
          <div className="relative">
            <LuUser className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500/60" />
            <input required placeholder="Jane Doe" className="field-input pl-10"
              value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Email</label>
            <div className="relative">
              <LuMail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500/60" />
              <input type="email" required placeholder="you@company.com" className="field-input pl-10"
                value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="field-label">Mobile number</label>
            <div className="relative">
              <LuPhone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500/60" />
              <input type="tel" required placeholder="9876543210" className="field-input pl-10"
                value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} />
            </div>
          </div>
        </div>

        <div>
          <label className="field-label">Register as</label>
          <div className="grid grid-cols-2 gap-2">
            {SELF_SERVICE_ROLES.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setForm((f) => ({ ...f, role: r }))}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-all ${
                  form.role === r
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-line bg-white text-ink-500 hover:border-indigo-200"
                }`}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-ink-500">
            Agency, builder and internal roles are added by an existing admin from Users settings.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Password</label>
            <div className="relative">
              <LuLock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500/60" />
              <input type="password" required minLength={8} placeholder="••••••••" className="field-input pl-10"
                value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="field-label">Confirm</label>
            <div className="relative">
              <LuLock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500/60" />
              <input type="password" required placeholder="••••••••" className="field-input pl-10"
                value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} />
            </div>
          </div>
        </div>
        {mismatch && <p className="field-error -mt-2">Passwords don't match.</p>}

        {error && (
          <div className="rounded-xl border border-coral-200 bg-coral-50 px-3.5 py-2.5 text-xs font-medium text-coral-600">
            {error}
          </div>
        )}

        <button type="submit" disabled={status === "loading"} className="btn-accent w-full">
          {status === "loading" ? <InlineSpinner className="h-4 w-4" /> : <LuUserPlus className="h-4 w-4" />}
          {status === "loading" ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-red-600 hover:text-red-700">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
