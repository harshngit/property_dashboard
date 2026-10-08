import { useState } from "react";
import { useSelector } from "react-redux";
import { useToast } from "../../components/common/ToastProvider";
import { ConfirmDialog } from "../../components/common/Modal";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { API_BASE_URL } from "../../config/api";
import { formatDate } from "../../lib/format";

// Module 33 (DPDP): a person's own data - download a copy, ask for deletion.
export default function PrivacyCard() {
  const call = useApiCall();
  const toast = useToast();
  const token = useSelector((s) => s.auth.accessToken);
  const { data, reload } = useApiQuery("/user/privacy");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const download = async (format) => {
    try {
      const res = await fetch(`${API_BASE_URL}/user/my-data?format=${format}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Could not prepare your data");
      const blob = format === "csv" ? await res.blob() : new Blob([JSON.stringify((await res.json()).data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `propertyserch-my-data.${format}`;
      a.click();
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const run = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      toast.push(msg, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };
  const open = data?.openDeletion;
  return (
    <div className="card space-y-4 p-6">
      <div>
        <h3 className="text-base font-semibold text-ink-900">Privacy and your data</h3>
        <p className="text-sm text-ink-600">Under the Digital Personal Data Protection Act, 2023 you can get a copy of the personal data we hold about you and ask for it to be deleted.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-outline btn-sm" onClick={() => download("csv")}>Download my data (CSV)</button>
        <button className="btn-outline btn-sm" onClick={() => download("json")}>Download my data (JSON)</button>
      </div>
      {data?.consents && <p className="text-xs text-ink-500">Consent on record: policy version {data.consents.items.find((c) => c.granted)?.version || "none"}{data.consents.upToDate ? "" : " - the current version has not been accepted yet"}.</p>}
      {open ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>{open.status === "on_hold" ? "Your deletion request is on hold:" : `Your data will be anonymised on ${formatDate(open.dueAt)}.`} {(open.holdReasons || []).map((h) => h.detail).join("; ")}</p>
          <button className="mt-2 text-xs font-semibold underline" disabled={busy} onClick={() => run(() => call("/user/request-deletion", { method: "DELETE" }), "Deletion request cancelled.")}>Cancel the request</button>
        </div>
      ) : (
        <button className="text-sm font-semibold text-red-600 hover:underline" onClick={() => setConfirm(true)}>Delete my data</button>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => run(() => call("/user/request-deletion", { method: "POST", body: {} }), "Deletion request recorded. You can cancel it within 30 days.")}
        title="Delete my data?"
        description="After a 30-day notice your name, contact details and sign-in are removed and your listings leave public view. Invoices and other records the law requires are kept. You can cancel during the 30 days."
        confirmLabel="Request deletion"
      />
    </div>
  );
}
