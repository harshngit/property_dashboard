import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { LuUser, LuMail, LuPhone, LuLock, LuUserPlus, LuCircleCheck, LuEye, LuEyeOff } from "react-icons/lu";
import { FaGoogle } from "react-icons/fa";
import AuthLayout from "../../layouts/AuthLayout";
import { registerUser, clearAuthError, clearRegisteredUser } from "../../redux/slices/authSlice";
import { InlineSpinner } from "../../components/common/PageLoader";
import { ROLES, ROLE_LABELS } from "../../config/roles";

const SELF_SERVICE_ROLES = [ROLES.AGENCY_ADMIN, ROLES.CUSTOMER, ROLES.BROKER];

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error, registeredUser } = useSelector((s) => s.auth);
  const [form, setForm] = useState({
    fullName: "", email: "", mobile: "", password: "", confirm: "", role: ROLES.BROKER,
  });
  const [touched, setTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
        panelEyebrow="Workspace ready"
        panelTitle="Set up your team, projects and property pipeline in minutes."
        panelSubtitle="Create the account, sign in, and start routing leads, inventory and follow-ups from one place."
      >
        <div className="flex flex-col items-center py-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <LuCircleCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold text-ink-950">Account created</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Welcome, {registeredUser.name}. You can now sign in with your email or mobile number.
          </p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="btn auth-submit mt-6 w-full"
          >
            Go to sign in
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      panelEyebrow="Launch your workspace"
      panelTitle="Set up your team, projects and property pipeline in minutes."
      panelSubtitle="Create a workspace for brokers or customers, then manage leads, listings and deal flow from a single CRM."
    >
      <div className="mb-4">
        <div className="text-red-600">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M10.67 2h2.66v6.08L18.6 5.05l1.33 2.31-5.27 3.03 5.27 3.03-1.33 2.31-5.27-3.03V19h-2.66v-6.33L5.4 15.7l-1.33-2.31 5.27-3.03-5.27-3.03L5.4 5.05l5.27 3.03V2Z" /></svg>
        </div>
        <h1 className="auth-panel-title">Create an account</h1>
        <p className="auth-panel-copy">Access your tasks, notes, and projects anytime, anywhere - and keep everything flowing in one place.</p>
        <button
          type="button"
          className="mt-3 flex min-h-[40px] w-full items-center justify-center gap-2.5 rounded-2xl border border-line bg-white px-4 text-[13px] font-medium text-ink-900 transition-colors hover:border-red-200 hover:bg-red-50/40"
        >
          <FaGoogle className="h-4 w-4 text-[#4285F4]" />
          Sign up with Google
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="field-label">Full name</label>
          <div className="relative">
            <LuUser className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B3B3BC]" />
            <input required placeholder="Jane Doe" className="field-input auth-field pl-11"
              value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Email</label>
            <div className="relative">
              <LuMail className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B3B3BC]" />
              <input type="email" required placeholder="you@company.com" className="field-input auth-field pl-11"
                value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="field-label">Mobile number</label>
            <div className="relative">
              <LuPhone className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B3B3BC]" />
              <input type="tel" required placeholder="9876543210" className="field-input auth-field pl-11"
                value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} />
            </div>
          </div>
        </div>

        <div>
          <label className="field-label">Register as</label>
          <div className="grid grid-cols-3 gap-2">
            {SELF_SERVICE_ROLES.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setForm((f) => ({ ...f, role: r }))}
                className={`rounded-2xl border px-3 py-2.5 text-[11px] font-semibold transition-all ${
                  form.role === r
                    ? "border-red-500 bg-red-50 text-red-700 shadow-[0_8px_24px_-18px_rgba(220,38,38,0.45)]"
                    : "border-line bg-white text-ink-500 hover:border-red-200 hover:bg-red-50/40"
                }`}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
         
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Password</label>
            <div className="relative">
              <LuLock className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B3B3BC]" />
              <input type={showPassword ? "text" : "password"} required minLength={8} placeholder="••••••••" className="field-input auth-field pl-11 pr-11"
                value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#AEAFB8] hover:text-red-600">
                {showPassword ? <LuEyeOff className="h-3.5 w-3.5" /> : <LuEye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="field-label">Confirm</label>
            <div className="relative">
              <LuLock className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B3B3BC]" />
              <input type={showConfirm ? "text" : "password"} required placeholder="••••••••" className="field-input auth-field pl-11 pr-11"
                value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} />
              <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#AEAFB8] hover:text-red-600">
                {showConfirm ? <LuEyeOff className="h-3.5 w-3.5" /> : <LuEye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
        {mismatch && <p className="field-error -mt-2">Passwords don't match.</p>}

        {error && (
          <div className="rounded-2xl border border-coral-200 bg-coral-50 px-4 py-3 text-xs font-medium text-coral-600">
            {error}
          </div>
        )}

        <button type="submit" disabled={status === "loading"} className="btn auth-submit mt-2 w-full">
          {status === "loading" ? <InlineSpinner className="h-4 w-4" /> : <LuUserPlus className="h-4 w-4" />}
          {status === "loading" ? "Creating account…" : "Ger Started"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-[#6F6F78]">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-red-600 hover:text-red-700">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
