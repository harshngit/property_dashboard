import { useEffect, useState } from "react";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";

// Notification preferences (saved on the server, per person):
//   - push on this browser (needs the push keys on the server),
//   - which topics are pushed,
//   - quiet hours in the person's own time zone.
// The in-app bell always receives everything - these only control push.

const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const b64ToBytes = (b64) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export default function NotificationPreferences() {
  const call = useApiCall();
  const toast = useToast();
  const prefs = useApiQuery("/notifications/preferences");
  const server = useApiQuery("/notifications/push");
  const [f, setF] = useState(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (prefs.data) setF({ pushEnabled: prefs.data.pushEnabled, pushMuted: prefs.data.pushMuted, quietStart: prefs.data.quietStart || "", quietEnd: prefs.data.quietEnd || "", timezone: prefs.data.timezone });
  }, [prefs.data]);
  useEffect(() => {
    if (!pushSupported()) return;
    navigator.serviceWorker.getRegistration().then((reg) => reg?.pushManager.getSubscription()).then((sub) => setSubscribed(!!sub)).catch(() => {});
  }, []);

  if (!f) return <div className="card p-6 text-sm text-ink-500">Loading…</div>;

  const save = async (next) => {
    setF(next);
    try {
      await call("/notifications/preferences", { method: "PUT", body: { ...next, quietStart: next.quietStart || null, quietEnd: next.quietEnd || null } });
    } catch (err) {
      toast.push(err.message, "error");
      prefs.reload();
    }
  };
  const toggleTopic = (key) => save({ ...f, pushMuted: f.pushMuted.includes(key) ? f.pushMuted.filter((k) => k !== key) : [...f.pushMuted, key] });

  const enableHere = async () => {
    setBusy(true);
    try {
      if ((await Notification.requestPermission()) !== "granted") throw new Error("Notifications are blocked for this site - allow them in your browser settings");
      const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(server.data.publicKey) }));
      await call("/notifications/push", { method: "POST", body: { ...sub.toJSON(), app: "crm" } });
      setSubscribed(true);
      toast.push("Push is on for this browser.", "success");
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const disableHere = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await call("/notifications/push", { method: "DELETE", body: { endpoint: sub.endpoint } }).catch(() => {});
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.push("Push is off for this browser.", "success");
    } finally {
      setBusy(false);
    }
  };
  const quietInvalid = !!f.quietStart !== !!f.quietEnd;

  return (
    <div className="space-y-5">
      <div className="card space-y-3 p-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Push on this browser</h3>
        {!pushSupported() ? (
          <p className="text-sm text-ink-600">This browser does not support push notifications.</p>
        ) : !server.data?.configured ? (
          <p className="text-sm text-ink-600">Push is not switched on for this installation yet (the server needs its push keys). The bell in the header still shows every notification.</p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-700">{subscribed ? "On - new enquiries, visit requests and alerts reach you even when the CRM tab is closed." : "Off - you only see notifications in the bell while the CRM is open."}</p>
            <div className="flex gap-2">
              {subscribed && <button className="btn-outline btn-sm" disabled={busy} onClick={() => call("/notifications/push/test", { method: "POST" }).then(() => toast.push("Test sent.", "success")).catch((e) => toast.push(e.message, "error"))}>Send a test</button>}
              <button className={subscribed ? "btn-outline btn-sm" : "btn-primary btn-sm"} disabled={busy} onClick={subscribed ? disableHere : enableHere}>{subscribed ? "Turn off" : "Turn on"}</button>
            </div>
          </div>
        )}
      </div>

      <div className="card space-y-2.5 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">What gets pushed</h3>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-800">
            All push
            <input id="pref-push-all" type="checkbox" checked={f.pushEnabled} onChange={(e) => save({ ...f, pushEnabled: e.target.checked })} className="h-4 w-4 accent-red-600" />
          </label>
        </div>
        {prefs.data.topics.map((t) => (
          <label key={t.key} className={`flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm ${f.pushEnabled ? "" : "opacity-50"}`}>
            {t.label}
            <input id={`pref-topic-${t.key}`} type="checkbox" disabled={!f.pushEnabled} checked={!f.pushMuted.includes(t.key)} onChange={() => toggleTopic(t.key)} className="h-4 w-4 accent-red-600" />
          </label>
        ))}
        <p className="text-xs text-ink-500">The bell in the header always keeps every notification - these switches only control push.</p>
      </div>

      <div className="card space-y-3 p-6">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Quiet hours</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-semibold text-ink-600">From<input id="pref-quiet-start" type="time" className="field-input mt-1" value={f.quietStart} onChange={(e) => setF({ ...f, quietStart: e.target.value })} /></label>
          <label className="block text-xs font-semibold text-ink-600">Until<input id="pref-quiet-end" type="time" className="field-input mt-1" value={f.quietEnd} onChange={(e) => setF({ ...f, quietEnd: e.target.value })} /></label>
          <label className="block text-xs font-semibold text-ink-600">Time zone<input id="pref-timezone" className="field-input mt-1" value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} /></label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary btn-sm" disabled={quietInvalid} onClick={() => save(f).then(() => toast.push("Quiet hours saved.", "success"))}>Save quiet hours</button>
          {(f.quietStart || f.quietEnd) && <button className="btn-outline btn-sm" onClick={() => save({ ...f, quietStart: "", quietEnd: "" })}>Clear</button>}
          <span className="text-xs text-ink-500">{quietInvalid ? "Set both times, or clear both." : "No push is sent between these times; it waits in the bell."}</span>
        </div>
      </div>
    </div>
  );
}
