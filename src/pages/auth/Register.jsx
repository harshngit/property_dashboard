import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { LuUser, LuMail, LuLock, LuBuilding, LuUserPlus } from "react-icons/lu";
import AuthLayout from "../../layouts/AuthLayout";
import { registerUser, clearAuthError } from "../../redux/slices/authSlice";
import { InlineSpinner } from "../../components/common/PageLoader";
import { ROLES, ROLE_LABELS } from "../../config/roles";

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error, user } = useSelector((s) => s.auth);
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirm: "", role: ROLES.BROKER, agency: "",
  });
  const [touched, setTouched] = useState(false);

  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);
  useEffect(() => {
    if (user) navigate("/app/dashboard", { replace: true });
  }, [user, navigate]);

  const mismatch = touched && form.confirm && form.confirm !== form.password;

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (form.password !== form.confirm) return;
    dispatch(registerUser(form));
  };

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
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="field-label">Work email</label>
          <div className="relative">
            <LuMail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500/60" />
            <input type="email" required placeholder="you@company.com" className="field-input pl-10"
              value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Role</label>
            <select
              className="field-select"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              {Object.values(ROLES).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Agency / Company</label>
            <div className="relative">
              <LuBuilding className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500/60" />
              <input placeholder="Optional" className="field-input pl-10"
                value={form.agency} onChange={(e) => setForm((f) => ({ ...f, agency: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Password</label>
            <div className="relative">
              <LuLock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500/60" />
              <input type="password" required minLength={4} placeholder="••••••••" className="field-input pl-10"
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
