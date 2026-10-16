import { useEffect, useState } from "react";
import Modal from "../../components/common/Modal";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall } from "../../hooks/useApi";

// Section 35: suspend or remove an account. One action takes the person out of
// public view at once - listings, requirements, share links, trust score,
// badges and ratings - and freezes commission due to them. A reason is optional.
export default function SuspendModal({ user, initialAction = "suspended", onClose, onDone }) {
  const call = useApiCall();
  const toast = useToast();
  const [action, setAction] = useState(initialAction);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [impact, setImpact] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) return;
    setAction(initialAction);
    setReason("");
    setNote("");
    setImpact(null);
    call(`/suspensions/users/${user.id}/impact`).then((r) => setImpact(r.data)).catch(() => setImpact(null));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async () => {
    setBusy(true);
    try {
      await call(`/suspensions/users/${user.id}`, { method: "POST", body: { action, reason: reason.trim() || null, note: note.trim() || null } });
      toast.push(action === "removed" ? "Account removed and taken out of public view." : "Account suspended and taken out of public view.", "success");
      onDone?.();
      onClose();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={!!user} onClose={onClose} title={action === "removed" ? "Remove account" : "Suspend account"} description={user?.name} maxWidth="max-w-lg">
      {user && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[["suspended", "Suspend"], ["removed", "Remove"]].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setAction(k)} className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${action === k ? "border-red-600 bg-red-50 text-red-700" : "border-line text-ink-700"}`}>{l}</button>
            ))}
          </div>
          <div className="rounded-xl bg-surface-muted p-4 text-sm text-ink-700">
            <p className="font-semibold text-ink-900">This happens at once</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              <li>Sign-in and open sessions stop working.</li>
              <li>{impact ? `${impact.listings} listing(s), ${impact.requirements} requirement(s) and ${impact.shareLinks} share link(s)` : "Their listings, requirements and share links"} leave search and matching.</li>
              <li>Profile, trust score, badges and ratings leave public view; the referral code stops working.</li>
              {impact?.commissionsToFreeze > 0 && <li>{impact.commissionsToFreeze} pending commission share(s) are frozen for the Super Admin to decide.</li>}
              {impact?.activeDeals > 0 && <li>{impact.activeDeals} active deal(s): the representative and other parties are told; the Super Admin decides how each continues.</li>}
              <li>Afterwards only the Super Admin sees the account. Nothing is deleted.</li>
            </ul>
          </div>
          <label className="field-label">Reason (optional - recorded, never shown publicly)<textarea className="field-input mt-1" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <label className="field-label">Internal note (optional)<input className="field-input mt-1" value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
            <button type="button" className="btn-primary" disabled={busy} onClick={submit}>{action === "removed" ? "Remove account" : "Suspend account"}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
