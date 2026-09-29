import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LuClock, LuCircleAlert, LuTriangleAlert, LuImage } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";
import { VerificationDecisionModal, CHECK_LABELS } from "../../components/fraud/ListingChecksCard";

// Sec. 9 / Module 19 review desk for A R staff:
//   Listings  - Yellow (live, Under Review, 2 h), Red (held, 24 h), Critical
//               (auto-rejected) and duplicate holds, with SLA and risk factors;
//   Verifications - Seller / Legally / Site Verified requests with checklists;
//   Duplicates - open 4-layer findings and mandate-verification routing;
//   Appeals, flagged users, and an image checker.

const ADMIN = ["admin", "super_admin"];
const BAND = { green: "bg-emerald-50 text-emerald-700", yellow: "bg-amber-50 text-amber-800", red: "bg-red-50 text-red-700", critical: "bg-red-600 text-white" };

function Listings({ rows, reload }) {
  const toast = useToast();
  const call = useApiCall();
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState("");
  const act = async (id, action, n) => {
    try {
      await call(`/fraud/listings/${id}/review`, { method: "PUT", body: { action, note: n || undefined } });
      toast.push({ clear: "Cleared.", hold: "Held.", reject: "Rejected.", contacted: "Logged." }[action], "success");
      setRejecting(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  if (!rows.length) return <div className="card p-8 text-center text-sm text-ink-500">No listings waiting for review.</div>;
  return (
    <div className="space-y-3">
      {rows.map((l) => (
        <div key={l.id} className="card p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link to={`/app/properties/${l.id}`} className="font-semibold text-ink-900 hover:text-red-600">{l.title}</Link>
              <p className="text-xs text-ink-500">
                {[l.locality, l.city].filter(Boolean).join(", ")} · {formatINR(l.price_value) || l.price} · {l.lister_name} ({titleCase(l.lister_role)}) · listed {formatDate(l.created_at, true)}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {l.fraud_band && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${BAND[l.fraud_band]}`}>{titleCase(l.fraud_band)} · {l.fraud_score}</span>}
                <StatusBadge value={titleCase(l.status)} />
                {l.duplicate_status && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">Duplicate {l.duplicate_status}</span>}
                {l.review_due_at && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${l.overdue ? "bg-red-50 text-red-700" : "bg-surface-muted text-ink-700"}`}>
                    {l.overdue ? <LuCircleAlert className="h-3 w-3" /> : <LuClock className="h-3 w-3" />} {l.overdue ? "Overdue" : "Due"} {formatDate(l.review_due_at, true)}
                  </span>
                )}
              </div>
              {(l.fraud_factors || []).length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-ink-700">
                  {l.fraud_factors.map((f) => (
                    <li key={f.key}><LuTriangleAlert className="mr-1 inline h-3 w-3 text-amber-600" /><b>+{f.points}</b> {f.label}{f.detail ? ` - ${f.detail}` : ""}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {l.status !== "rejected" && <button className="btn-outline btn-sm" onClick={() => act(l.id, "clear")}>Clear</button>}
              {l.status === "approved" && <button className="btn-outline btn-sm" onClick={() => act(l.id, "hold")}>Hold</button>}
              {l.fraud_band === "red" && <button className="btn-outline btn-sm" onClick={() => act(l.id, "contacted")}>Lister contacted</button>}
              {l.status !== "rejected" && <button className="btn-outline btn-sm" onClick={() => { setRejecting(l); setNote(""); }}>Reject</button>}
            </div>
          </div>
        </div>
      ))}
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject listing" description={rejecting?.title}>
        <TextareaField label="Reason (shown to the lister)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setRejecting(null)}>Cancel</button>
          <button className="btn-primary" disabled={!note.trim()} onClick={() => act(rejecting.id, "reject", note.trim())}>Reject</button>
        </div>
      </Modal>
    </div>
  );
}

function Verifications({ rows, reload }) {
  const [deciding, setDeciding] = useState(null);
  if (!rows.length) return <div className="card p-8 text-center text-sm text-ink-500">No verification requests.</div>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-500">
          <tr><th className="px-4 py-3">Listing</th><th className="px-4 py-3">Level</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Evidence</th><th className="px-4 py-3" /></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((v) => (
            <tr key={v.id}>
              <td className="px-4 py-3"><Link to={`/app/properties/${v.property_id}`} className="font-semibold text-ink-900 hover:text-red-600">{v.title}</Link><p className="text-xs text-ink-500">{v.city} · {formatINR(v.price_value)}</p></td>
              <td className="px-4 py-3">{v.name}{v.auto_requested ? <span className="block text-xs text-ink-500">auto-requested</span> : null}</td>
              <td className="px-4 py-3"><StatusBadge value={titleCase(v.status)} /></td>
              <td className="px-4 py-3 text-xs text-ink-500">{v.due_at ? formatDate(v.due_at, true) : "—"}</td>
              <td className="px-4 py-3 text-xs">{(v.evidence || []).length} file(s)</td>
              <td className="px-4 py-3 text-right"><button className="btn-outline btn-sm" onClick={() => setDeciding(v)}>Decide</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {deciding && (
        <VerificationDecisionModal open onClose={() => setDeciding(null)} propertyId={deciding.property_id} level={deciding.level} required={deciding.requiredChecks} current={deciding.checks} onDone={reload} />
      )}
    </div>
  );
}

function Duplicates({ rows }) {
  const toast = useToast();
  const call = useApiCall();
  const routing = useApiQuery("/fraud/routing");
  const respond = async (id, action) => {
    try {
      await call(`/fraud/routing/${id}`, { method: "PUT", body: { action } });
      toast.push(action === "accept" ? "Accepted." : "Declined.", "success");
      routing.reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-500">
            <tr><th className="px-4 py-3">New listing</th><th className="px-4 py-3">Original (first listed)</th><th className="px-4 py-3">Layer</th><th className="px-4 py-3">Decision</th><th className="px-4 py-3">Found</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {!rows.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-500">No open duplicate findings.</td></tr>}
            {rows.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3"><Link to={`/app/properties/${d.property_id}`} className="font-semibold text-ink-900 hover:text-red-600">{d.title}</Link></td>
                <td className="px-4 py-3"><Link to={`/app/properties/${d.original_id}`} className="text-ink-700 hover:text-red-600">{d.original_title}</Link></td>
                <td className="px-4 py-3">{titleCase(d.layer)}<span className="block text-xs text-ink-500">{d.detail}</span></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${d.decision === "block" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>{d.decision === "block" ? "Blocked" : "Flagged"}{d.same_lister ? " · same lister" : " · different lister"}</span></td>
                <td className="px-4 py-3 text-xs text-ink-500">{formatDate(d.created_at, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-500">Mandate-verification routing requests</h3>
        {routing.loading ? <InlineSpinner /> : !(routing.data || []).length ? <p className="text-sm text-ink-500">None.</p> : (
          <ul className="divide-y divide-line text-sm">
            {routing.data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <b>{r.requester_name}</b> → {r.original_lister_name} on <b>{r.original_title}</b>
                  <span className="block text-xs text-ink-500">Split {r.split?.original}/{r.split?.requester} · {formatDate(r.created_at, true)}{r.note ? ` · "${r.note}"` : ""}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <StatusBadge value={titleCase(r.status)} />
                  {r.status === "pending" && (
                    <>
                      <button className="btn-outline btn-sm" onClick={() => respond(r.id, "accept")}>Accept</button>
                      <button className="btn-outline btn-sm" onClick={() => respond(r.id, "decline")}>Decline</button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Appeals({ rows, reload }) {
  const toast = useToast();
  const call = useApiCall();
  const { role } = useAuth();
  const decide = async (id, decision) => {
    const note = window.prompt(decision === "uphold" ? "Note (optional)" : "Reason for dismissing (shown to the lister)") || undefined;
    try {
      await call(`/fraud/appeals/${id}`, { method: "PUT", body: { decision, note } });
      toast.push(decision === "uphold" ? "Upheld - listing reinstated." : "Dismissed.", "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  if (!rows.length) return <div className="card p-8 text-center text-sm text-ink-500">No pending appeals.</div>;
  return (
    <div className="space-y-3">
      {rows.map((a) => (
        <div key={a.id} className="card p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link to={`/app/properties/${a.property_id}`} className="font-semibold text-ink-900 hover:text-red-600">{a.title}</Link>
              <p className="text-xs text-ink-500">{a.user_name} · {formatDate(a.created_at, true)} · risk {a.fraud_score}</p>
              <p className="mt-2 text-ink-800">{a.reason}</p>
              <p className="mt-1 text-xs text-ink-500">{(a.evidence || []).length} evidence file(s)</p>
            </div>
            {ADMIN.includes(role) ? (
              <div className="flex gap-1.5">
                <button className="btn-outline btn-sm" onClick={() => decide(a.id, "uphold")}>Uphold</button>
                <button className="btn-outline btn-sm" onClick={() => decide(a.id, "dismiss")}>Dismiss</button>
              </div>
            ) : <span className="text-xs text-ink-500">Admins decide</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Flags({ rows, reload }) {
  const toast = useToast();
  const call = useApiCall();
  const { role } = useAuth();
  if (!rows.length) return <div className="card p-8 text-center text-sm text-ink-500">No open user flags.</div>;
  return (
    <div className="card divide-y divide-line">
      {rows.map((f) => (
        <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
          <span>
            <b>{f.full_name}</b> · {titleCase(f.reason)} · <StatusBadge value={titleCase(f.user_status)} />
            <span className="block text-xs text-ink-500">{formatDate(f.created_at, true)}{f.detail?.score ? ` · risk ${f.detail.score}` : ""}</span>
          </span>
          {ADMIN.includes(role) && (
            <button className="btn-outline btn-sm" onClick={async () => {
              try {
                await call(`/fraud/flags/${f.id}/resolve`, { method: "PUT" });
                toast.push("Resolved.", "success");
                reload();
              } catch (err) {
                toast.push(err.message, "error");
              }
            }}>Resolve</button>
          )}
        </div>
      ))}
    </div>
  );
}

function ImageCheck() {
  const toast = useToast();
  const call = useApiCall();
  const ref = useRef(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const check = async () => {
    const f = ref.current?.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await call("/fraud/scan-image", { method: "POST", body: form, isFormData: true });
      setResult(res.data);
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card max-w-xl p-5">
      <p className="text-sm text-ink-700">Check any photo: contact details / visiting card scan, fingerprint and photo GPS.</p>
      <div className="mt-3 flex gap-2">
        <input ref={ref} type="file" accept="image/*" className="field-input py-1.5" />
        <button className="btn-primary" disabled={busy} onClick={check}><LuImage className="h-4 w-4" /> {busy ? "Checking…" : "Check"}</button>
      </div>
      {result && (
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div><dt className="text-xs text-ink-500">Scan</dt><dd className="font-semibold">{titleCase(result.scan.status)}{result.scan.ai ? " (AI)" : " (heuristic)"}</dd></div>
          <div><dt className="text-xs text-ink-500">Size</dt><dd>{result.width} × {result.height}</dd></div>
          <div className="col-span-2"><dt className="text-xs text-ink-500">Reasons</dt><dd>{result.scan.reasons.join("; ") || "None"}</dd></div>
          <div><dt className="text-xs text-ink-500">Fingerprint</dt><dd className="truncate font-mono text-xs">{result.phash}</dd></div>
          <div><dt className="text-xs text-ink-500">Photo GPS</dt><dd>{result.exif?.lat != null ? `${result.exif.lat}, ${result.exif.lng}` : "None"}</dd></div>
        </dl>
      )}
    </div>
  );
}

export default function FraudPage() {
  const { data, loading, error, reload } = useApiQuery("/fraud/queue");
  const [tab, setTab] = useState("listings");
  const counts = data ? { listings: data.listings.length, verifications: data.verifications.length, duplicates: data.duplicates.length, appeals: data.appeals.length, flags: data.flags.length } : {};
  const tabs = [["listings", "Listings"], ["verifications", "Verifications"], ["duplicates", "Duplicates"], ["appeals", "Appeals"], ["flags", "Flagged users"], ["image", "Image check"]];
  return (
    <div>
      <PageHeader eyebrow="Engine 5" title="Verification & Fraud" subtitle="Risk-scored listings, 4-level verification, duplicates and appeals." />
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-surface-muted p-1 sm:w-fit">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-semibold ${tab === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>
            {l}{counts[k] ? ` (${counts[k]})` : ""}
          </button>
        ))}
      </div>
      {tab === "image" ? <ImageCheck /> : loading ? <InlineSpinner /> : error ? <p className="text-sm text-red-600">{error}</p> : (
        <>
          {tab === "listings" && <Listings rows={data.listings} reload={reload} />}
          {tab === "verifications" && <Verifications rows={data.verifications} reload={reload} />}
          {tab === "duplicates" && <Duplicates rows={data.duplicates} />}
          {tab === "appeals" && <Appeals rows={data.appeals} reload={reload} />}
          {tab === "flags" && <Flags rows={data.flags} reload={reload} />}
        </>
      )}
      <p className="mt-6 text-xs text-ink-400">Checks: {Object.values(CHECK_LABELS).slice(0, 5).join(" · ")} (L1, automatic).</p>
    </div>
  );
}
