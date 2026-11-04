import { useEffect, useState } from "react";
import { LuTriangleAlert, LuX } from "react-icons/lu";
import { useApiCall } from "../../hooks/useApi";
import { formatDate } from "../../lib/format";

// Sec. 25.5.4: while a platform incident is open (or maintenance is coming
// up in the next day) every CRM user sees it here, with the expected fix
// time. A person can hide an incident; a new update brings it back.

const SITE = import.meta.env.VITE_WEBSITE_URL || "https://propertyserch.com";
const KEY = "ps-status-hidden";
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
};

export default function StatusBanner() {
  const call = useApiCall();
  const [data, setData] = useState(null);
  const [hidden, setHidden] = useState(read);
  useEffect(() => {
    let gone = false;
    const load = () => call("/status/banner").then((r) => !gone && setData(r.data)).catch(() => {});
    load();
    const t = setInterval(load, 120000);
    return () => {
      gone = true;
      clearInterval(t);
    };
  }, [call]);
  if (!data) return null;
  const soon = Date.now() + 24 * 3600000;
  const items = [
    ...data.active.map((i) => ({ ...i, text: i.latest?.message })),
    ...data.upcoming.filter((i) => new Date(i.startsAt).getTime() <= soon).map((i) => ({ ...i, text: `Planned: ${formatDate(i.startsAt, true)} to ${formatDate(i.etaAt, true)}` })),
  ].filter((i) => hidden[i.id] !== (i.latest?.at || i.startsAt));
  if (!items.length) return null;
  const hide = (i) => {
    const next = { ...hidden, [i.id]: i.latest?.at || i.startsAt };
    setHidden(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode - hides for this page only */
    }
  };
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${i.impact === "critical" ? "border-red-200 bg-red-50 text-red-900" : i.impact === "maintenance" ? "border-sky-200 bg-sky-50 text-sky-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{i.title}</p>
            <p className="text-xs">{i.text}{i.etaAt && i.impact !== "maintenance" ? ` Expected fix: ${formatDate(i.etaAt, true)}.` : ""} <a className="font-semibold underline" href={`${SITE}/status`} target="_blank" rel="noreferrer">Status page</a></p>
          </div>
          <button aria-label="Hide" className="shrink-0 opacity-60 hover:opacity-100" onClick={() => hide(i)}><LuX className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}
