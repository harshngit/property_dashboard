import { useState } from "react";
import { useToast } from "../common/ToastProvider";
import { useApiCall } from "../../hooks/useApi";

// "Have a coupon?" - checks a COU- scheme coupon, shows what it gives, then
// applies it to this record (a campaign, or a deal for its customer).
export default function CouponBox({ service, entityId, userId, onApplied, label = "Have a coupon?" }) {
  const call = useApiCall();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [checked, setChecked] = useState(null);
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true);
    try {
      setChecked((await call("/coupons/check", { method: "POST", body: { code, service, entityId, userId } })).data);
    } catch (err) {
      setChecked({ valid: false, reason: err.message });
    } finally {
      setBusy(false);
    }
  };
  const apply = async () => {
    setBusy(true);
    try {
      const r = (await call("/coupons/apply", { method: "POST", body: { code, entityId, userId } })).data;
      toast.push(r.message, "success");
      setCode("");
      setChecked(null);
      onApplied?.(r);
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ink-600">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input className="field-input h-9 w-48 uppercase" placeholder="COU-BU-DIW26" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setChecked(null); }} maxLength={20} />
        {!checked?.valid ? (
          <button className="btn-outline btn-sm" disabled={busy || code.trim().length < 6} onClick={check}>Check</button>
        ) : (
          <button className="btn-primary btn-sm" disabled={busy} onClick={apply}>Apply {checked.coupon.code}</button>
        )}
      </div>
      {checked && (
        <p className={`text-xs ${checked.valid ? "text-emerald-700" : "text-red-600"}`}>
          {checked.valid ? `${checked.coupon.name}: ${checked.coupon.benefit}${service === "professional_fee" ? " - taken off the next professional-fee invoice, never below the 1% minimum" : ""}.` : checked.reason}
        </p>
      )}
    </div>
  );
}
