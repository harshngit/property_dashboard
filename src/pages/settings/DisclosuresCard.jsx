import { useState } from "react";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";

// Contract sec. 33.12: employees disclose their own PAN and their immediate
// family's (spouse, parent, child) mobile numbers / PANs. Any listing,
// inquiry or deal they take part in is then flagged as related-party - never
// assigned to you and kept out of your performance, but not blocked.
export default function DisclosuresCard() {
  const call = useApiCall();
  const toast = useToast();
  const { data, error, reload } = useApiQuery("/related-party/disclosures/mine");
  const [f, setF] = useState({ relation: "spouse", fullName: "", mobile: "", pan: "" });
  const [busy, setBusy] = useState(false);
  if (error) return null; // not an employee
  if (!data) return null;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const add = async () => {
    setBusy(true);
    try {
      const r = await call("/related-party/disclosures", { method: "POST", body: { relation: f.relation, fullName: f.fullName || undefined, mobile: f.mobile || undefined, pan: f.pan || undefined } });
      toast.push(r.data.scan.rerouted ? `Recorded. ${r.data.scan.rerouted} inquiry(ies) were moved off you.` : "Recorded.", "success");
      setF({ relation: "spouse", fullName: "", mobile: "", pan: "" });
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const withdraw = async (id) => {
    const note = window.prompt("Why is this withdrawn? (e.g. the number changed hands)");
    if (!note) return;
    try {
      await call(`/related-party/disclosures/${id}/withdraw`, { method: "POST", body: { note } });
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const self = f.relation === "self";
  return (
    <div className="card space-y-4 p-6">
      <div>
        <h3 className="text-base font-bold text-ink-900">Family disclosures</h3>
        <p className="mt-1 text-sm text-ink-600">As an A R Buildwel employee you may buy or sell on the platform. Disclose your own PAN and your spouse's, parents' and children's mobile numbers or PANs: their transactions are then never assigned to you and do not count towards your performance. An undisclosed related party is a policy violation.</p>
      </div>
      {data.disclosures.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line text-sm">
          {data.disclosures.map((d) => (
            <li key={d.id} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${d.removedAt ? "opacity-50" : ""}`}>
              <span data-no-translate>{titleCase(d.relation)}{d.fullName ? ` - ${d.fullName}` : ""} · {[d.mobile, d.panLast4 ? `PAN ••••${d.panLast4}` : null].filter(Boolean).join(" · ")}</span>
              {d.removedAt ? <span className="text-xs text-ink-500">Withdrawn {formatDate(d.removedAt)}</span> : <button className="text-xs font-semibold text-ink-500 hover:text-red-600" onClick={() => withdraw(d.id)}>Withdraw</button>}
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field-label">Who<select className="field-select mt-1" value={f.relation} onChange={set("relation")}>{data.relations.map((r) => <option key={r} value={r}>{r === "self" ? "Myself (PAN)" : titleCase(r)}</option>)}</select></label>
        {!self && <label className="field-label">Name<input className="field-input mt-1" value={f.fullName} onChange={set("fullName")} /></label>}
        {!self && <label className="field-label">Mobile<input className="field-input mt-1" value={f.mobile} onChange={set("mobile")} placeholder="10 digits" /></label>}
        <label className="field-label">PAN{self ? "" : " (optional)"}<input className="field-input mt-1 uppercase" value={f.pan} onChange={set("pan")} placeholder="ABCDE1234F" maxLength={10} /></label>
      </div>
      <p className="text-[11px] text-ink-500">Only the last digits are shown back; the PAN is stored as a one-way fingerprint for matching.</p>
      <button className="btn-primary btn-sm" disabled={busy || (self ? f.pan.length !== 10 : !(f.fullName.trim() && (f.mobile.trim() || f.pan.trim())))} onClick={add}>Add disclosure</button>
    </div>
  );
}
