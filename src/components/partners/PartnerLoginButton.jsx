import { useState } from "react";
import { LuKeyRound } from "react-icons/lu";
import Modal from "../common/Modal";
import { useToast } from "../common/ToastProvider";
import { useApiCall } from "../../hooks/useApi";

// Admin: give an empanelled advocate / valuer (kind "legal") or a verified
// loan / insurance officer (kind "officer") their own login to the Partner
// desk. Offered only once the LP / LO / IO code is issued.
export default function PartnerLoginButton({ kind, record, active, onDone }) {
  const call = useApiCall();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ email: "", password: "", mobile: "" });
  const [busy, setBusy] = useState(false);
  if (record.hasLogin) return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"><LuKeyRound className="h-3 w-3" /> Has login</span>;
  if (!active) return null;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setBusy(true);
    try {
      const r = await call("/partner-desk/logins", { method: "POST", body: { kind, id: record.id, email: f.email.trim(), password: f.password, mobile: f.mobile.trim() || undefined } });
      toast.push(`Login created for ${r.data.email}. Share the first password privately; they change it from Settings.`, "success");
      setOpen(false);
      onDone();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button className="btn-outline btn-sm" onClick={() => { setF({ email: record.email || "", password: "", mobile: record.mobile || "" }); setOpen(true); }}>
        <LuKeyRound className="h-3.5 w-3.5" /> Create login
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Login for ${record.fullName}`} description="They sign in to the CRM and see only the cases assigned or referred to them - never a client's phone or email. Their code stays non-commission-bearing.">
        <div className="space-y-3">
          <label className="field-label">Login email<input className="field-input mt-1" type="email" value={f.email} onChange={set("email")} /></label>
          <label className="field-label">First password (at least 8 characters)<input className="field-input mt-1" type="text" autoComplete="off" value={f.password} onChange={set("password")} /></label>
          <label className="field-label">Mobile (optional)<input className="field-input mt-1" value={f.mobile} onChange={set("mobile")} /></label>
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={busy || f.password.length < 8 || !f.email.includes("@")} onClick={save}>{busy ? "Creating…" : "Create login"}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
