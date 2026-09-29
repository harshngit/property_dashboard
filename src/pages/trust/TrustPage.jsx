import { useRef, useState } from "react";
import { LuShieldCheck, LuStar, LuShare2, LuFileText, LuPlay, LuFlag, LuReply, LuTriangleAlert } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { API_BASE_URL } from "../../config/api";
import { formatDate, titleCase } from "../../lib/format";

// Module 6 / sec. 8 Trust & Reputation.
//   My trust (brokers, builders, agencies, staff): score 0-100 with the
//     binding component weights, badges (warning = 7 days to restore),
//     shareable award images, verifications, reviews about me (reply once,
//     report), score history.
//   Staff: verification queue, review moderation (fraud score + reasons),
//     trust leaderboard by region, and trust jobs (admin).

const STAFF = ["internal_sales", "admin", "super_admin"];
const ADMIN = ["admin", "super_admin"];
const COMPONENTS = { verification: "Verification", deals: "Deal count", response: "Response time", ratings: "Ratings", geo: "Geo-validation" };
const VERIFY_KINDS = [
  { value: "kyc", label: "KYC (ID document)", hint: "Upload PAN / Aadhaar / passport. Only the last 4 characters of the number are stored." },
  { value: "rera", label: "RERA registration", hint: "Agent / promoter RERA number." },
  { value: "gst", label: "GSTIN", hint: "15-character GST number." },
  { value: "company", label: "Company registration", hint: "CIN / LLPIN - builders." },
  { value: "institutional_cert", label: "Institutional broker certification", hint: "Required for the Institutional Specialist badge." },
];

function Stars({ value }) {
  return (
    <span className="inline-flex text-amber-500">
      {[1, 2, 3, 4, 5].map((i) => (
        <LuStar key={i} className="h-3.5 w-3.5" fill={i <= value ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

function ScoreRing({ score }) {
  const tone = score >= 85 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";
  return (
    <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border-8 border-surface-muted">
      <span className={`font-display text-3xl font-extrabold ${tone}`}>{score}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">trust</span>
    </div>
  );
}

function VerificationForm({ onDone }) {
  const toast = useToast();
  const call = useApiCall();
  const fileRef = useRef(null);
  const [kind, setKind] = useState("kyc");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("kind", kind);
      if (reference) form.append("reference", reference);
      if (fileRef.current?.files?.[0]) form.append("file", fileRef.current.files[0]);
      await call("/trust/verifications", { method: "POST", body: form, isFormData: true });
      toast.push("Submitted - A R will verify it shortly.", "success");
      setReference("");
      if (fileRef.current) fileRef.current.value = "";
      onDone();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const info = VERIFY_KINDS.find((k) => k.value === kind);
  return (
    <div className="grid gap-3 sm:grid-cols-[200px_1fr_1fr_auto] sm:items-end">
      <label className="text-xs font-semibold text-ink-600">
        Type
        <select className="field-input mt-1" value={kind} onChange={(e) => setKind(e.target.value)}>
          {VERIFY_KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-ink-600">
        Number / reference
        <input className="field-input mt-1" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={kind === "gst" ? "29ABCDE1234F1Z5" : ""} />
      </label>
      <label className="text-xs font-semibold text-ink-600">
        Document (optional)
        <input ref={fileRef} type="file" accept=".pdf,image/*" className="field-input mt-1 py-1.5" />
      </label>
      <button className="btn-primary" disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit"}</button>
      <p className="text-xs text-ink-500 sm:col-span-4">{info?.hint}</p>
    </div>
  );
}

function MyTrust() {
  const toast = useToast();
  const call = useApiCall();
  const { data: t, loading, error, reload } = useApiQuery("/trust/me");
  const reviews = useApiQuery("/trust/reviews/about-me");
  const [replying, setReplying] = useState(null);
  const [reporting, setReporting] = useState(null);
  const [text, setText] = useState("");

  const act = async (path, body, msg, done) => {
    try {
      await call(path, { method: "POST", body });
      toast.push(msg, "success");
      reviews.reload();
      done();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  if (loading) return <InlineSpinner />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-6 p-5">
        <ScoreRing score={t.score} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-700">
            Recomputed {formatDate(t.computedAt, true)}{t.region ? ` · region ${t.region}` : ""}
            {t.leadPriority ? " · lead priority" : ""}
            {t.commissionDiscount ? " · commission discount eligible" : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {t.badges.length === 0 && <span className="text-xs text-ink-500">No badges yet.</span>}
            {t.badges.map((b) => (
              <span
                key={b.id}
                title={b.effect}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  b.status === "warning" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"
                }`}
              >
                {b.status === "warning" ? <LuTriangleAlert className="h-3.5 w-3.5" /> : <LuShieldCheck className="h-3.5 w-3.5" />}
                {b.label}
                {b.status === "warning" && ` - restore by ${formatDate(new Date(new Date(b.warning_at).getTime() + 7 * 86400000))}`}
                {b.shareable && (
                  <a href={`${API_BASE_URL}/trust/badges/${b.id}/image.svg`} target="_blank" rel="noreferrer" title="Download share image" className="ml-1">
                    <LuShare2 className="h-3.5 w-3.5" />
                  </a>
                )}
              </span>
            ))}
          </div>
          {t.nextSteps.length > 0 && <p className="mt-2 text-xs text-ink-500">Improve your score: {t.nextSteps.join(" · ")}</p>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-500">Score breakdown</h3>
          <ul className="space-y-3 text-sm">
            {Object.entries(COMPONENTS).map(([k, label]) => (
              <li key={k}>
                <div className="flex justify-between">
                  <span className="font-semibold text-ink-800">{label} <span className="font-normal text-ink-500">({t.weights[k]}%)</span></span>
                  <span className="text-ink-700">{t.components[k]?.score ?? 0}/100</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-surface-muted"><div className="h-1.5 rounded-full bg-red-500" style={{ width: `${t.components[k]?.score ?? 0}%` }} /></div>
                <p className="mt-0.5 text-xs text-ink-500">{t.components[k]?.detail}</p>
              </li>
            ))}
            {t.inputs?.mandateBonus ? <li className="text-xs text-ink-600">+{t.inputs.mandateBonus} Exclusive Mandate bonus</li> : null}
          </ul>
        </div>
        <div className="card p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-500">Verifications</h3>
          <ul className="mb-4 divide-y divide-line text-sm">
            {t.verifications.length === 0 && <li className="py-2 text-xs text-ink-500">Nothing submitted yet.</li>}
            {t.verifications.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-semibold text-ink-900">{VERIFY_KINDS.find((k) => k.value === v.kind)?.label}</span>
                  <span className="text-ink-500"> {v.reference || ""}</span>
                  {v.notes && <span className="block text-xs text-red-600">{v.notes}</span>}
                </span>
                <StatusBadge value={titleCase(v.status)} />
              </li>
            ))}
          </ul>
          <VerificationForm onDone={reload} />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-500">Reviews about you ({(reviews.data || []).length})</h3>
        {(reviews.data || []).length === 0 ? (
          <p className="text-sm text-ink-500">No reviews yet. Customers can review you after a closed deal or a completed site visit.</p>
        ) : (
          <ul className="divide-y divide-line">
            {reviews.data.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="font-semibold text-ink-900">{r.title || titleCase(r.interaction)}</span>
                    <span className="text-xs text-ink-500">{r.reviewerFirstName} · {formatDate(r.createdAt)}</span>
                  </span>
                  <span className="flex gap-2">
                    {!r.reply && (
                      <button className="btn-outline btn-sm" onClick={() => { setReplying(r); setText(""); }}><LuReply className="h-3.5 w-3.5" /> Reply</button>
                    )}
                    <button className="btn-outline btn-sm" onClick={() => { setReporting(r); setText(""); }}><LuFlag className="h-3.5 w-3.5" /> Report</button>
                  </span>
                </div>
                {r.body && <p className="mt-1 text-ink-700">{r.body}</p>}
                {r.reply && <p className="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-700"><b>Your reply:</b> {r.reply}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-500">Score history</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          {t.history.map((h, i) => (
            <span key={i} className="rounded-full bg-surface-muted px-2.5 py-1 text-ink-700">{h.score} · {titleCase(h.reason)} · {formatDate(h.created_at)}</span>
          ))}
        </div>
      </div>

      <Modal open={!!replying} onClose={() => setReplying(null)} title="Reply to review" description="Your reply is public and can be posted once. Contact details are not allowed.">
        <TextareaField label="Reply" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setReplying(null)}>Cancel</button>
          <button className="btn-primary" disabled={text.trim().length < 2} onClick={() => act(`/trust/reviews/${replying.id}/reply`, { reply: text.trim() }, "Reply posted.", () => setReplying(null))}>Post reply</button>
        </div>
      </Modal>
      <Modal open={!!reporting} onClose={() => setReporting(null)} title="Report review" description="An A R admin will review it. It stays visible until a decision.">
        <TextareaField label="What is wrong with this review?" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setReporting(null)}>Cancel</button>
          <button className="btn-primary" disabled={text.trim().length < 5} onClick={() => act(`/trust/reviews/${reporting.id}/report`, { reason: text.trim() }, "Reported.", () => setReporting(null))}>Report</button>
        </div>
      </Modal>
    </div>
  );
}

function VerificationQueue() {
  const toast = useToast();
  const call = useApiCall();
  const [status, setStatus] = useState("pending");
  const { data, loading, reload } = useApiQuery(`/trust/verifications?status=${status}`);
  const [rejecting, setRejecting] = useState(null);
  const [notes, setNotes] = useState("");
  const decide = async (id, action, n) => {
    try {
      await call(`/trust/verifications/${id}`, { method: "PUT", body: { action, notes: n || undefined } });
      toast.push(action === "verify" ? "Verified." : "Rejected.", "success");
      setRejecting(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const openDoc = async (id) => {
    try {
      const res = await call(`/trust/verifications/${id}/document`);
      window.open(res.data.url, "_blank", "noopener");
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  return (
    <div className="space-y-3">
      <select className="field-input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
        {["pending", "verified", "rejected", "all"].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
      </select>
      {loading ? <InlineSpinner /> : !(data || []).length ? (
        <div className="card p-8 text-center text-sm text-ink-500">Nothing here.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-500">
              <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3"><p className="font-semibold text-ink-900">{v.full_name}</p><p className="text-xs text-ink-500">{titleCase(v.role)} · {v.email}</p></td>
                  <td className="px-4 py-3">{VERIFY_KINDS.find((k) => k.value === v.kind)?.label}</td>
                  <td className="px-4 py-3">{v.reference || "—"}</td>
                  <td className="px-4 py-3 text-ink-500">{formatDate(v.created_at)}</td>
                  <td className="px-4 py-3"><StatusBadge value={titleCase(v.status)} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {v.has_document && <button className="btn-outline btn-sm" onClick={() => openDoc(v.id)}><LuFileText className="h-3.5 w-3.5" /> Document</button>}
                      {v.status !== "verified" && <button className="btn-outline btn-sm" onClick={() => decide(v.id, "verify")}>Verify</button>}
                      {v.status !== "rejected" && <button className="btn-outline btn-sm" onClick={() => { setRejecting(v); setNotes(""); }}>Reject</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject verification" description={rejecting?.full_name}>
        <TextareaField label="Reason (shown to the user)" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setRejecting(null)}>Cancel</button>
          <button className="btn-primary" disabled={!notes.trim()} onClick={() => decide(rejecting.id, "reject", notes.trim())}>Reject</button>
        </div>
      </Modal>
    </div>
  );
}

function Moderation() {
  const toast = useToast();
  const call = useApiCall();
  const { role } = useAuth();
  const { data, loading, reload } = useApiQuery("/trust/reviews/moderation");
  const act = async (id, action) => {
    const note = action === "approve" ? undefined : window.prompt("Note for the audit log (optional)") || undefined;
    try {
      await call(`/trust/reviews/${id}/moderate`, { method: "PUT", body: { action, note } });
      toast.push(`Review ${action === "approve" ? "published" : action === "reject" ? "rejected" : "hidden"}.`, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  if (loading) return <InlineSpinner />;
  const rows = data || [];
  if (!rows.length) return <div className="card p-8 text-center text-sm text-ink-500">No reviews waiting for moderation.</div>;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="card p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <Stars value={r.rating} />
                <span className="font-semibold text-ink-900">{r.title || titleCase(r.interaction)}</span>
                <StatusBadge value={titleCase(r.status)} />
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {r.reviewerName} → {r.subjectName} · {titleCase(r.interaction)} · {formatDate(r.createdAt, true)}
              </p>
              {r.body && <p className="mt-2 text-ink-800">{r.body}</p>}
              <p className="mt-2 text-xs">
                <span className={`font-bold ${r.fraudScore >= 40 ? "text-red-600" : "text-ink-700"}`}>Fraud score {r.fraudScore}</span>
                {r.fraudReasons?.length ? <span className="text-ink-500"> · {r.fraudReasons.join(" · ")}</span> : null}
              </p>
              {r.reportedAt && <p className="mt-1 text-xs text-amber-700">Reported by the reviewed person: {r.reportReason}</p>}
            </div>
            {ADMIN.includes(role) ? (
              <div className="flex gap-1.5">
                <button className="btn-outline btn-sm" onClick={() => act(r.id, "approve")}>Publish</button>
                <button className="btn-outline btn-sm" onClick={() => act(r.id, "hide")}>Hide</button>
                <button className="btn-outline btn-sm" onClick={() => act(r.id, "reject")}>Reject</button>
              </div>
            ) : (
              <span className="text-xs text-ink-500">Admins moderate</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Leaderboard() {
  const toast = useToast();
  const call = useApiCall();
  const { role } = useAuth();
  const [region, setRegion] = useState("");
  const { data, loading, reload } = useApiQuery(`/trust/leaderboard${region ? `?region=${encodeURIComponent(region)}` : ""}`);
  const [busy, setBusy] = useState(null);
  const job = async (name) => {
    setBusy(name);
    try {
      const res = await call(`/trust/jobs/${name}`, { method: "POST" });
      toast.push(res.message, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="text-xs font-semibold text-ink-600">
          Region (city)
          <input className="field-input mt-1 w-56" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="All regions" />
        </label>
        {ADMIN.includes(role) && (
          <div className="flex flex-wrap gap-2">
            {[["daily", "Recompute all"], ["featured", "Award Featured Agents"], ["best_quarter", "Best Broker (quarter)"], ["best_year", "Best Broker (year)"]].map(([k, l]) => (
              <button key={k} className="btn-outline btn-sm" disabled={!!busy} onClick={() => job(k)}><LuPlay className="h-3.5 w-3.5" /> {busy === k ? "Running…" : l}</button>
            ))}
          </div>
        )}
      </div>
      {loading ? <InlineSpinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-500">
              <tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Region</th><th className="px-4 py-3">Trust</th><th className="px-4 py-3">Deals</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3">Badges</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(data || []).map((r, i) => (
                <tr key={r.user_id}>
                  <td className="px-4 py-3 text-ink-500">{i + 1}</td>
                  <td className="px-4 py-3"><p className="font-semibold text-ink-900">{r.full_name}</p><p className="text-xs text-ink-500">{titleCase(r.role)}</p></td>
                  <td className="px-4 py-3">{r.region || "—"}</td>
                  <td className="px-4 py-3 font-bold">{r.score}</td>
                  <td className="px-4 py-3">{r.inputs?.deals ?? 0}</td>
                  <td className="px-4 py-3">{r.inputs?.ratingAvg != null ? `${r.inputs.ratingAvg} (${r.inputs.reviews})` : "—"}</td>
                  <td className="px-4 py-3 text-xs">{(r.badges || []).map(titleCase).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function TrustPage() {
  const { role } = useAuth();
  const staff = STAFF.includes(role);
  const tabs = [["mine", "My trust"], ...(staff ? [["verifications", "Verifications"], ["moderation", "Review moderation"], ["leaderboard", "Leaderboard"]] : [])];
  const [tab, setTab] = useState(staff ? "verifications" : "mine");
  return (
    <div>
      <PageHeader eyebrow="Engine 5" title="Trust & Reviews" subtitle="Trust score, badges, verifications and verified-interaction reviews." />
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-surface-muted p-1 sm:w-fit">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-semibold ${tab === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>
        ))}
      </div>
      {tab === "mine" && <MyTrust />}
      {tab === "verifications" && <VerificationQueue />}
      {tab === "moderation" && <Moderation />}
      {tab === "leaderboard" && <Leaderboard />}
    </div>
  );
}
