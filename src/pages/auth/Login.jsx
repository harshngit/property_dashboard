import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LuMail, LuLock, LuLogIn, LuEye, LuEyeOff, LuPhone, LuKeyRound } from "react-icons/lu";
import AuthLayout from "../../layouts/AuthLayout";
import { loginUser, googleLogin, sendOtp, verifyOtp, fetchCurrentUser, clearAuthError } from "../../redux/slices/authSlice";
import { InlineSpinner } from "../../components/common/PageLoader";
import GoogleLoginButton from "../../components/common/GoogleLoginButton";

const RESEND_COOLDOWN_SECONDS = 30;

function PasswordLoginForm() {
  const dispatch = useDispatch();
  const { status, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPw, setShowPw] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    dispatch(loginUser(form));
  };

  return (
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
  );
}

function OtpLoginForm() {
  const dispatch = useDispatch();
  const { status, error } = useSelector((s) => s.auth);

  const [step, setStep] = useState("mobile"); // mobile | otp
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [localError, setLocalError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const sendLoginOtp = async (e) => {
    e?.preventDefault();
    setLocalError("");
    if (!mobile.trim()) {
      setLocalError("Enter your registered mobile number.");
      return;
    }
    const res = await dispatch(sendOtp({ identifier: mobile.trim(), purpose: "login" }));
    if (sendOtp.fulfilled.match(res)) {
      setStep("otp");
      startCooldown();
    }
  };

  // verifyOtp only returns tokens (no user object) - fetchCurrentUser fills
  // in state.user right after, which is what the redirect effect below
  // waits on (same as the email/password flow, which sets both at once).
  const verify = async (e) => {
    e.preventDefault();
    setLocalError("");
    if (!otp.trim()) {
      setLocalError("Enter the OTP sent to your mobile.");
      return;
    }
    const res = await dispatch(verifyOtp({ identifier: mobile.trim(), otp: otp.trim(), purpose: "login" }));
    if (verifyOtp.fulfilled.match(res)) {
      dispatch(fetchCurrentUser());
    }
  };

  const shownError = localError || error;

  if (step === "mobile") {
    return (
      <form onSubmit={sendLoginOtp} className="space-y-3">
        <div>
          <label className="field-label">Registered mobile number</label>
          <div className="relative">
            <LuPhone className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B3B3BC]" />
            <input
              type="tel" required placeholder="9876543210"
              className="field-input auth-field pl-11"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
        </div>

        {shownError && (
          <div className="rounded-2xl border border-coral-200 bg-coral-50 px-4 py-3 text-xs font-medium text-coral-600">
            {shownError}
          </div>
        )}

        <button type="submit" disabled={status === "loading"} className="btn auth-submit mt-2 w-full">
          {status === "loading" ? <InlineSpinner className="h-4 w-4" /> : <LuLogIn className="h-4 w-4" />}
          {status === "loading" ? "Sending OTP…" : "Send OTP"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-3">
      <p className="text-[13px] text-[#6F6F78]">
        OTP sent to <span className="font-semibold text-ink-900">{mobile}</span>.{" "}
        <button
          type="button"
          onClick={() => { setStep("mobile"); setOtp(""); setLocalError(""); }}
          className="font-semibold text-red-600 hover:text-red-700"
        >
          Change number
        </button>
      </p>

      <div>
        <label className="field-label">Enter OTP</label>
        <div className="relative">
          <LuKeyRound className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B3B3BC]" />
          <input
            type="text" inputMode="numeric" autoComplete="one-time-code" required placeholder="6-digit code"
            className="field-input auth-field pl-11"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
        </div>
      </div>

      {shownError && (
        <div className="rounded-2xl border border-coral-200 bg-coral-50 px-4 py-3 text-xs font-medium text-coral-600">
          {shownError}
        </div>
      )}

      <button type="submit" disabled={status === "loading"} className="btn auth-submit mt-2 w-full">
        {status === "loading" ? <InlineSpinner className="h-4 w-4" /> : <LuLogIn className="h-4 w-4" />}
        {status === "loading" ? "Verifying…" : "Verify & Sign in"}
      </button>

      <button
        type="button"
        onClick={sendLoginOtp}
        disabled={cooldown > 0 || status === "loading"}
        className="w-full text-center text-[12px] font-semibold text-[#6F6F78] hover:text-ink-900 disabled:cursor-not-allowed disabled:text-[#D1D1D6]"
      >
        {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
      </button>
    </form>
  );
}

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, accessToken, error } = useSelector((s) => s.auth);
  const [mode, setMode] = useState("password"); // password | otp

  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);

  // Login-only here (no allowSelfRegister) - a Google account with no
  // matching CRM user gets a clear error instead of silently creating one,
  // since dashboard accounts are provisioned by an admin, not self-service.
  const handleGoogleCredential = (idToken) => {
    dispatch(googleLogin({ idToken }));
  };

  useEffect(() => {
    if (user && accessToken) {
      const dest = location.state?.from?.pathname || "/app/dashboard";
      navigate(dest, { replace: true });
    }
  }, [user, accessToken, navigate, location]);

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
        <div className="mt-3">
          <GoogleLoginButton onCredential={handleGoogleCredential} />
        </div>
        {error && (
          <div className="mt-3 rounded-2xl border border-coral-200 bg-coral-50 px-4 py-3 text-xs font-medium text-coral-600">
            {error}
          </div>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-surface-muted p-1">
        {[
          { key: "password", label: "Email & Password" },
          { key: "otp", label: "Phone & OTP" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMode(tab.key)}
            className={[
              "h-9 rounded-xl text-[12px] font-bold transition",
              mode === tab.key ? "bg-white text-ink-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]" : "text-[#6F6F78]",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "password" ? <PasswordLoginForm /> : <OtpLoginForm />}

      <p className="mt-6 text-center text-[13px] text-[#6F6F78]">
        New to PropertySerch?{" "}
        <Link to="/register" className="font-semibold text-red-600 hover:text-red-700">Sign up</Link>
      </p>
    </AuthLayout>
  );
}
