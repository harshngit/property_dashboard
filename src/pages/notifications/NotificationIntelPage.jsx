import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate } from "../../lib/format";

// Module 43 - Notification Intelligence (admin): what left the app and on
// which channel, what was held or batched and why, the dead letters, and the
// posting windows the digests follow.

const th = "px-4 py-3";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const REASON = { quiet_hours: "Quiet hours", burst: "Burst of the same alert", fatigue_cap: "Daily cap reached", frequency: "Person chose a digest", low_priority: "Low priority", low_engagement: "Category left unread" };
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
const blank = { contentType: "notification_digest", city: "", dayOfWeek: "", timeStart: "09:30", timeEnd: "10:30", priority: 0, notes: "", isActive: true };

function Stat({ label, value, tone }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${tone || "text-ink-950"}`}>{value}</p>
    </div>
  );
}

export default function NotificationIntelPage() {
  const call = useApiCall();
  const toast = useToast();
  const [tab, setTab] = useState("overview");
  const [status, setStatus] = useState("dead");
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const ov = useApiQuery("/notifications/manage/overview");
  const log = useApiQuery(tab === "deliveries" ? `/notifications/manage/deliveries${buildQuery({ status, limit: 100 })}` : null);
  const windows = useApiQuery(tab === "windows" ? "/notifications/manage/windows" : null);

  const act = async (path, { method = "POST", body, msg, after } = {}) => {
    setBusy(true);
    try {
      await call(path, { method, body });
      if (msg) toast.push(msg, "success");
      after?.();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const d = ov.data;
  const totals = (key) => (d?.channels || []).reduce((sum, c) => sum + c[key], 0);
  const saveWindow = () => act(edit.id ? `/notifications/manage/windows/${edit.id}` : "/notifications/manage/windows", {
    method: edit.id ? "PUT" : "POST",
    body: { ...edit, dayOfWeek: edit.dayOfWeek === "" ? null : Number(edit.dayOfWeek), priority: Number(edit.priority) || 0 },
    msg: "Posting window saved.",
    after: () => { setEdit(null); windows.reload(); ov.reload(); },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin"
        title="Notification Intelligence"
        subtitle="Critical alerts go out at once on WhatsApp. Everything else is sent, held or gathered into a digest according to each person's preferences, quiet hours and how much they have already received today."
        actions={
          <div className="flex gap-2">
            <button className="btn-outline btn-sm" disabled={busy} onClick={() => act("/notifications/manage/run", { body: { job: "queue" }, msg: "Queue processed.", after: () => { ov.reload(); log.reload?.(); } })}>Process queue now</button>
            <button className="btn-outline btn-sm" disabled={busy} onClick={() => act("/notifications/manage/run", { body: { job: "digest", force: true }, msg: "Digests sent.", after: ov.reload })}>Send digests now</button>
          </div>
        }
      />
      <div className="flex gap-2 border-b border-line">
        {[["overview", "Overview"], ["deliveries", "Delivery log"], ["windows", "Posting windows"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${tab === k ? "border-red-600 text-red-600" : "border-transparent text-ink-500 hover:text-ink-800"}`}>{label}</button>
        ))}
      </div>

      {tab === "overview" && (!d ? <Spinner /> : (
        <>
          {d.mock && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Test mode: WhatsApp, SMS and email are simulated on this server.</div>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={`Sent, last ${d.days} days`} value={totals("sent")} />
            <Stat label="Held for later" value={totals("held")} />
            <Stat label="Retrying" value={totals("retrying")} tone={totals("retrying") ? "text-amber-600" : undefined} />
            <Stat label="Dead letters" value={totals("dead")} tone={totals("dead") ? "text-red-600" : undefined} />
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                <tr><th className={th}>Channel</th><th className={th}>Set up</th><th className={th}>Sent</th><th className={th}>Held</th><th className={th}>Retrying</th><th className={th}>Dead</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.channels.map((c) => (
                  <tr key={c.key}>
                    <td className={`${th} font-semibold text-ink-900`}>{c.label}</td>
                    <td className={th}>{c.available ? <span className="font-semibold text-emerald-600">Yes</span> : <span className="text-ink-400">Not set up</span>}</td>
                    <td className={th}>{c.sent}</td><td className={th}>{c.held}</td><td className={th}>{c.retrying}</td>
                    <td className={`${th} ${c.dead ? "font-bold text-red-600" : ""}`}>{c.dead}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card space-y-2 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Why messages waited</h3>
              {[...Object.entries(d.held), ...Object.entries(d.waitingForDigest).map(([k, v]) => [`${k}`, v, true])].length === 0 && <p className="text-sm text-ink-500">Nothing was held in this period.</p>}
              {Object.entries(d.held).map(([k, v]) => <p key={k} className="flex justify-between text-sm"><span>{REASON[k] || k} - held, then sent together</span><b>{v}</b></p>)}
              {Object.entries(d.waitingForDigest).map(([k, v]) => <p key={`w-${k}`} className="flex justify-between text-sm"><span>{REASON[k] || k} - waiting for the next digest</span><b>{v}</b></p>)}
              {d.digests.map((g) => <p key={g.frequency} className="flex justify-between text-sm"><span>{g.frequency === "weekly" ? "Weekly summaries" : "Daily digests"} sent</span><b>{g.digests} ({g.items} items)</b></p>)}
            </div>
            <div className="card space-y-2 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Read rate by type</h3>
              {!d.readRate.length && <p className="text-sm text-ink-500">No notifications in this period.</p>}
              {d.readRate.map((r) => (
                <div key={r.category}>
                  <p className="flex justify-between text-sm"><span>{r.label}</span><b>{r.percent}% of {r.sent}</b></p>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-sunk"><div className="h-1.5 rounded-full bg-red-500" style={{ width: `${r.percent}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="card space-y-2 p-5 text-sm">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Current rules</h3>
            <p>Channels by priority: {Object.entries(d.settings.routing).map(([k, v]) => `${k} → ${v.length ? v.join(", ") : "digest only"}`).join(" · ")}</p>
            <p>Default quiet hours {d.settings.quiet.start} to {d.settings.quiet.end} · at most {d.settings.fatigueDailyCap} instant messages a person a day · same alert within {d.settings.burstMinutes} minutes is combined · retries after {d.settings.retrySeconds.join(", ")} seconds · weekly summary on {DAYS[d.settings.weeklyDay]}</p>
            <p>Digest window today: {d.digestWindow.configured ? `${d.digestWindow.start} to ${d.digestWindow.end}${d.digestWindow.open ? " (open now)" : ""}` : "none set - digests will not go out"}</p>
            <p className="text-xs text-ink-500">These values are in Admin Panel → Configuration under "notifications".</p>
          </div>
        </>
      ))}

      {tab === "deliveries" && (
        <>
          <div className="flex flex-wrap gap-2">
            {["dead", "failed", "held", "queued", "sent"].map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${status === s ? "border-red-600 bg-red-600 text-white" : "border-line bg-white text-ink-700"}`}>{{ dead: "Dead letters", failed: "Retrying", held: "Held", queued: "Queued", sent: "Sent" }[s]}</button>
            ))}
          </div>
          {!log.data ? <Spinner /> : !log.data.items.length ? <div className="card"><EmptyState title="Nothing here" subtitle={status === "dead" ? "No delivery has failed after every retry." : undefined} /></div> : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <tr><th className={th}>When</th><th className={th}>To</th><th className={th}>Channel</th><th className={th}>Message</th><th className={th}>Status</th><th className={th}>Detail</th><th className={th} /></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {log.data.items.map((x) => (
                    <tr key={x.id}>
                      <td className={`${th} whitespace-nowrap text-ink-500`}>{formatDate(x.created_at)}</td>
                      <td className={th} data-no-translate>{x.user_name}</td>
                      <td className={th}>{x.channel}</td>
                      <td className={`${th} max-w-xs truncate`} data-no-translate title={x.title}>{x.title}</td>
                      <td className={th}><StatusBadge value={x.status} /></td>
                      <td className={`${th} text-xs text-ink-500`}>{x.last_error ? <span data-no-translate>{x.last_error}</span> : REASON[x.reason] || (x.digest_id ? "Digest" : x.batched ? "Sent in one message" : "")}{x.attempts > 1 ? ` · ${x.attempts} attempts` : ""}</td>
                      <td className={th}>{x.status === "dead" && <button className="btn-outline btn-sm" disabled={busy} onClick={() => act(`/notifications/manage/deliveries/${x.id}/retry`, { msg: "Sent again.", after: () => { log.reload(); ov.reload(); } })}>Send again</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "windows" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-600">Digests and scheduled posts go out inside these windows (India time). A window for a city or a day takes precedence over a general one.</p>
            <button className="btn-primary btn-sm" onClick={() => setEdit({ ...blank })}>Add window</button>
          </div>
          {!windows.data ? <Spinner /> : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <tr><th className={th}>Content</th><th className={th}>City</th><th className={th}>Day</th><th className={th}>Time</th><th className={th}>Priority</th><th className={th}>Notes</th><th className={th} /></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {windows.data.map((w) => (
                    <tr key={w.id} className={w.isActive ? "" : "opacity-50"}>
                      <td className={`${th} font-semibold text-ink-900`} data-no-translate>{w.contentType}</td>
                      <td className={th} data-no-translate>{w.city || "All cities"}</td>
                      <td className={th}>{w.dayOfWeek === null ? "Every day" : DAYS[w.dayOfWeek]}</td>
                      <td className={th}>{w.timeStart} - {w.timeEnd}</td>
                      <td className={th}>{w.priority}</td>
                      <td className={`${th} text-xs text-ink-500`} data-no-translate>{w.notes}</td>
                      <td className={`${th} whitespace-nowrap text-right`}>
                        <button className="btn-outline btn-sm" onClick={() => setEdit({ ...w, city: w.city || "", dayOfWeek: w.dayOfWeek === null ? "" : String(w.dayOfWeek), notes: w.notes || "" })}>Edit</button>{" "}
                        <button className="btn-outline btn-sm" disabled={busy} onClick={() => window.confirm("Remove this posting window?") && act(`/notifications/manage/windows/${w.id}`, { method: "DELETE", msg: "Removed.", after: windows.reload })}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit posting window" : "Add posting window"} maxWidth="max-w-lg">
        {edit && (
          <div className="space-y-3">
            <label className="field-label">Content<input id="pw-type" className="field-input mt-1" value={edit.contentType} onChange={(e) => setEdit({ ...edit, contentType: e.target.value })} /></label>
            <p className="-mt-2 text-xs text-ink-500">notification_digest is the daily and weekly digest; match_digest is the warm-match digest.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="field-label">City (empty = all)<input id="pw-city" className="field-input mt-1" value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></label>
              <label className="field-label">Day
                <select id="pw-day" className="field-select mt-1" value={edit.dayOfWeek} onChange={(e) => setEdit({ ...edit, dayOfWeek: e.target.value })}>
                  <option value="">Every day</option>
                  {DAYS.map((name, i) => <option key={name} value={i}>{name}</option>)}
                </select>
              </label>
              <label className="field-label">From<input id="pw-start" type="time" className="field-input mt-1" value={edit.timeStart} onChange={(e) => setEdit({ ...edit, timeStart: e.target.value })} /></label>
              <label className="field-label">Until<input id="pw-end" type="time" className="field-input mt-1" value={edit.timeEnd} onChange={(e) => setEdit({ ...edit, timeEnd: e.target.value })} /></label>
              <label className="field-label">Priority<input id="pw-priority" type="number" className="field-input mt-1" value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value })} /></label>
              <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-ink-800"><input id="pw-active" type="checkbox" className="h-4 w-4 accent-red-600" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} />Active</label>
            </div>
            <label className="field-label">Notes<input id="pw-notes" className="field-input mt-1" value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-outline" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy} onClick={saveWindow}>Save</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
