import { useState } from "react";
import { LuClipboardPen, LuExternalLink } from "react-icons/lu";
import Modal from "../../components/common/Modal";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate } from "../../lib/format";

// Sec. 25.5.2: a crawler source that is paused, refused by robots.txt or has
// not crawled for a long time is checked by hand until it recovers. Staff
// enter its new items (they join the same review queue as crawled ones) or
// record that there was nothing new. The task closes by itself once the
// source crawls again.

const REASON = { dead_letter: "Paused after repeated failures", blocked_robots: "Refused by robots.txt", stale: "No successful crawl for a long time" };
const BLANK = { title: "", city: "", locality: "", pincode: "", property_type: "", reserve_price: "", emd_amount: "", auction_date: "", emd_deadline: "", source_bank: "", auction_reference_id: "", auction_portal_url: "", description: "" };

function ItemForm({ task, onClose, onDone }) {
  const call = useApiCall();
  const toast = useToast();
  const [f, setF] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const field = (k, label, props = {}) => (
    <label className="field-label">{label}<input className="field-input mt-1" value={f[k]} onChange={set(k)} {...props} /></label>
  );
  const save = async (another) => {
    setBusy(true);
    try {
      const body = Object.fromEntries(Object.entries(f).filter(([, v]) => String(v).trim() !== ""));
      const r = await call(`/crawlers/manual-tasks/${task.id}/items`, { method: "POST", body });
      const st = r.data.summary.items?.[0]?.status;
      toast.push(st === "duplicate" ? "Entered - it looks like a duplicate and waits for review." : r.data.summary.skipped_existing ? "Already entered earlier (same reference)." : "Entered - waiting for review in the intake queue.", "success");
      onDone();
      if (another) setF({ ...BLANK, city: f.city, source_bank: f.source_bank });
      else onClose();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title={`Enter an item from ${task.sourceName}`} description="Copy it from the source's own website. It goes through the same checks and review as crawled items." maxWidth="max-w-2xl">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">{field("title", "Title *", { placeholder: "3 BHK flat, Sector 12 - bank auction" })}</div>
        {field("city", "City *")}
        {field("locality", "Locality")}
        {field("pincode", "Pincode", { inputMode: "numeric", maxLength: 6 })}
        {field("property_type", "Property type", { placeholder: "flat, plot, shop…" })}
        {field("reserve_price", "Reserve price (Rs)", { inputMode: "numeric" })}
        {field("emd_amount", "EMD (Rs)", { inputMode: "numeric" })}
        {field("auction_date", "Auction date", { type: "date" })}
        {field("emd_deadline", "EMD last date", { type: "date" })}
        {field("source_bank", "Bank / institution")}
        {field("auction_reference_id", "Auction / notice reference")}
        <div className="sm:col-span-2">{field("auction_portal_url", "Link to the notice", { placeholder: task.sourceUrl || "https://" })}</div>
        <label className="field-label sm:col-span-2">Details<textarea className="field-input mt-1 h-20 py-2" value={f.description} onChange={set("description")} /></label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-outline" onClick={onClose}>Close</button>
        <button className="btn-outline" disabled={busy || !f.title.trim() || !f.city.trim()} onClick={() => save(true)}>Save and enter another</button>
        <button className="btn-primary" disabled={busy || !f.title.trim() || !f.city.trim()} onClick={() => save(false)}>Save</button>
      </div>
    </Modal>
  );
}

export default function ManualEntryQueue() {
  const call = useApiCall();
  const toast = useToast();
  const { data, reload } = useApiQuery("/crawlers/manual-tasks");
  const [entering, setEntering] = useState(null);
  const tasks = data || [];
  if (!tasks.length) return null;
  const check = async (t) => {
    const note = window.prompt(`You checked ${t.sourceName} by hand. What did you find? (e.g. "No new notices since yesterday", or how many you entered)`);
    if (!note) return;
    try {
      await call(`/crawlers/manual-tasks/${t.id}/checks`, { method: "POST", body: { note } });
      toast.push("Check recorded - the next one is due later.", "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  return (
    <div className="card border-amber-200 p-5">
      <div className="flex items-center gap-2">
        <LuClipboardPen className="h-5 w-5 text-amber-600" />
        <p className="text-sm font-bold text-ink-900">Manual entry - sources that cannot be crawled</p>
      </div>
      <p className="mt-1 text-xs text-ink-500">Until a source crawls again, check its website by hand and enter its new items, so that category does not go stale. Each closes by itself when the source recovers.</p>
      <ul className="mt-3 divide-y divide-line">
        {tasks.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-semibold text-ink-900">{t.sourceName} <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">{REASON[t.reason]}</span></p>
              <p className="text-xs text-ink-500">
                {t.itemsEntered} entered by hand · next check {t.overdue ? <b className="text-red-600">overdue since {formatDate(t.dueAt, true)}</b> : `due ${formatDate(t.dueAt, true)}`}
                {t.checks?.length ? ` · last: "${t.checks[t.checks.length - 1].note}" (${t.checks[t.checks.length - 1].byName || "staff"})` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {t.sourceUrl && <a className="btn-outline btn-sm" href={t.sourceUrl} target="_blank" rel="noreferrer"><LuExternalLink className="h-3.5 w-3.5" /> Open source</a>}
              {t.output === "opportunity" && <button className="btn-outline btn-sm" onClick={() => setEntering(t)}>Enter item</button>}
              <button className="btn-primary btn-sm" onClick={() => check(t)}>Record check</button>
            </div>
          </li>
        ))}
      </ul>
      {entering && <ItemForm task={entering} onClose={() => setEntering(null)} onDone={reload} />}
    </div>
  );
}
