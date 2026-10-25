import { useState } from "react";
import { LuPencil, LuPlus } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";

// Serchi (AI) settings. Each AI activity names its model (simple work on the
// cheaper OpenAI model, important work such as agreements on Claude), the
// fallback used when that provider fails and the credits the asking user pays
// (1 credit = Rs 1 - every AI call is user-paid, staff included). Credit packs,
// the actual API cost in rupees against the credits charged, bank / UPI
// payments to approve, purchases (invoices, refunds) and credits added by hand.

const th = "px-4 py-3";
const USD = (n) => `$${Number(n || 0).toFixed(Number(n) < 1 ? 4 : 2)}`;

function ActivityEditor({ a, models, onSaved, onClose }) {
  const call = useApiCall();
  const toast = useToast();
  const [f, setF] = useState({ provider: a.provider, model: a.model, fallbackProvider: a.fallbackProvider || "", fallbackModel: a.fallbackModel || "", effort: a.effort, maxOutputTokens: a.maxOutputTokens, credits: a.credits, active: a.active });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const modelsOf = (p) => models.filter((m) => (p === "claude" ? m.startsWith("claude") : !m.startsWith("claude")));
  const save = async () => {
    setBusy(true);
    try {
      await call(`/ai-credits/admin/activities/${a.key}`, {
        method: "PUT",
        body: { ...f, fallbackProvider: f.fallbackProvider || null, fallbackModel: f.fallbackProvider ? f.fallbackModel : null, maxOutputTokens: Number(f.maxOutputTokens), credits: Number(f.credits) },
      });
      toast.push("Saved - used from the next AI call.", "success");
      onSaved();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const select = (label, k, options) => (
    <label className="field-label">{label}
      <select className="field-select mt-1" value={f[k]} onChange={set(k)}>{options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}</select>
    </label>
  );
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-600">{a.description}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {select("Provider", "provider", [{ value: "openai", label: "OpenAI" }, { value: "claude", label: "Claude (Anthropic)" }])}
        {select("Model", "model", modelsOf(f.provider))}
        {select("If it fails, fall back to", "fallbackProvider", [{ value: "", label: "No fallback" }, { value: "openai", label: "OpenAI" }, { value: "claude", label: "Claude (Anthropic)" }])}
        {f.fallbackProvider ? select("Fallback model", "fallbackModel", ["", ...modelsOf(f.fallbackProvider)]) : <span />}
        {select("Effort (Claude)", "effort", ["low", "medium", "high", "xhigh", "max"])}
        <label className="field-label">Longest reply (tokens)<input className="field-input mt-1" type="number" min="50" max="64000" value={f.maxOutputTokens} onChange={set("maxOutputTokens")} /></label>
        <label className="field-label">Credits per use, paid by the asking user (1 credit = Rs 1)<input className="field-input mt-1" type="number" min="0" value={f.credits} onChange={set("credits")} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-ink-800"><input type="checkbox" className="h-4 w-4 accent-red-600" checked={!!f.active} onChange={set("active")} /> Switched on</label>
      <div className="flex justify-end gap-2">
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={busy || (f.fallbackProvider && !f.fallbackModel)} onClick={save}>Save</button>
      </div>
    </div>
  );
}

function PackEditor({ pack, onSaved, onClose }) {
  const call = useApiCall();
  const toast = useToast();
  const [f, setF] = useState(pack ? { name: pack.name, priceInr: pack.priceInr, credits: pack.credits, bonusCredits: pack.bonusCredits, active: pack.active, sortOrder: pack.sortOrder } : { name: "", priceInr: "", credits: "", bonusCredits: 0, active: true, sortOrder: 0 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const save = async () => {
    try {
      await call(pack ? `/ai-credits/admin/packs/${pack.id}` : "/ai-credits/admin/packs", { method: pack ? "PUT" : "POST", body: { ...f, priceInr: Number(f.priceInr), credits: Number(f.credits), bonusCredits: Number(f.bonusCredits), sortOrder: Number(f.sortOrder) } });
      toast.push("Pack saved.", "success");
      onSaved();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field-label">Name<input className="field-input mt-1" value={f.name} onChange={set("name")} /></label>
        <label className="field-label">Price before GST (Rs)<input className="field-input mt-1" type="number" min="1" value={f.priceInr} onChange={set("priceInr")} /></label>
        <label className="field-label">Credits<input className="field-input mt-1" type="number" min="1" value={f.credits} onChange={set("credits")} /></label>
        <label className="field-label">Bonus credits<input className="field-input mt-1" type="number" min="0" value={f.bonusCredits} onChange={set("bonusCredits")} /></label>
        <label className="field-label">Order<input className="field-input mt-1" type="number" value={f.sortOrder} onChange={set("sortOrder")} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-ink-800"><input type="checkbox" className="h-4 w-4 accent-red-600" checked={!!f.active} onChange={set("active")} /> On sale</label>
      <div className="flex justify-end gap-2"><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={!f.name || !f.priceInr || !f.credits} onClick={save}>Save pack</button></div>
    </div>
  );
}

function AddCredits({ packs, onDone }) {
  const call = useApiCall();
  const toast = useToast();
  const [q, setQ] = useState("");
  const users = useApiQuery(q.trim().length >= 3 ? `/users${buildQuery({ search: q.trim(), limit: 8 })}` : null);
  const [userPick, setUserPick] = useState(null);
  const [mode, setMode] = useState("pack");
  const [f, setF] = useState({ packId: "", reference: "", credits: "", note: "" });
  const list = Array.isArray(users.data) ? users.data : users.data?.items || users.data?.users || [];
  const save = async () => {
    try {
      const body = mode === "pack" ? { userId: userPick.id, packId: f.packId, reference: f.reference } : { userId: userPick.id, credits: Number(f.credits), note: f.note };
      const r = await call("/ai-credits/admin/credit", { method: "POST", body });
      toast.push(`Done - balance now ${r.data.balance} credits.`, "success");
      setF({ packId: "", reference: "", credits: "", note: "" });
      onDone();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  return (
    <div className="card space-y-3 p-5">
      <p className="text-sm font-bold text-ink-900">Add credits to a user</p>
      {!userPick ? (
        <>
          <input className="field-input" placeholder="Search by name, email or mobile" value={q} onChange={(e) => setQ(e.target.value)} />
          {list.length > 0 && (
            <ul className="divide-y divide-line rounded-lg border border-line text-sm">
              {list.slice(0, 8).map((u) => <li key={u.id}><button className="w-full px-3 py-2 text-left hover:bg-surface-muted" onClick={() => setUserPick(u)} data-no-translate>{u.full_name || u.fullName} <span className="text-xs text-ink-500">{u.email} · {titleCase(String(u.role_name || u.role || "").replace(/_/g, " "))}</span></button></li>)}
            </ul>
          )}
        </>
      ) : (
        <>
          <p className="text-sm" data-no-translate>For <span className="font-semibold">{userPick.full_name || userPick.fullName}</span> ({userPick.email}) <button className="ml-2 text-xs font-semibold text-red-600" onClick={() => setUserPick(null)}>Change</button></p>
          <div className="inline-flex rounded-lg bg-surface-sunk p-1">
            {[["pack", "Bank-transfer purchase"], ["grant", "Grant / correction"]].map(([k, l]) => <button key={k} onClick={() => setMode(k)} className={`rounded-md px-3 py-1 text-xs font-semibold ${mode === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>)}
          </div>
          {mode === "pack" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="field-select" value={f.packId} onChange={(e) => setF({ ...f, packId: e.target.value })}><option value="">Choose the pack paid for</option>{packs.map((p) => <option key={p.id} value={p.id}>{p.name} - {p.totalCredits} credits ({formatINR(p.totalInr, { compact: false })})</option>)}</select>
              <input className="field-input" placeholder="Bank transfer / UTR reference" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <input className="field-input" type="number" placeholder="Credits (+/-)" value={f.credits} onChange={(e) => setF({ ...f, credits: e.target.value })} />
              <input className="field-input" placeholder="Why (kept on record)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
            </div>
          )}
          <button className="btn-primary btn-sm" disabled={mode === "pack" ? !f.packId || f.reference.trim().length < 4 : !Number(f.credits) || f.note.trim().length < 5} onClick={save}>Add</button>
        </>
      )}
    </div>
  );
}

function TopupQueue({ onDone }) {
  const call = useApiCall();
  const toast = useToast();
  const { data, reload } = useApiQuery("/ai-credits/admin/topups?status=pending");
  const decide = async (t, action) => {
    const note = action === "reject" ? window.prompt("Why is this payment not accepted? (sent to the user)") : "Matched with the bank statement";
    if (action === "reject" && !note) return;
    try {
      await call(`/ai-credits/admin/topups/${t.id}/decide`, { method: "POST", body: { action, note } });
      toast.push(action === "approve" ? "Approved - credits added and GST invoice issued." : "Rejected.", "success");
      reload();
      onDone();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  return (
    <div className="card p-5">
      <p className="mb-2 text-sm font-bold text-ink-900">Bank / UPI payments to check{data?.length ? ` (${data.length})` : ""}</p>
      {!data?.length ? <p className="text-xs text-ink-500">Nothing waiting.</p> : (
        <ul className="divide-y divide-line text-sm">
          {data.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <span data-no-translate><span className="font-semibold">{t.userName}</span> · {t.packName} · {formatINR(t.amountInr, { compact: false })}<span className="block font-mono text-xs text-ink-500">{t.method.toUpperCase()} {t.reference}{t.paidOn ? ` · paid ${String(t.paidOn).slice(0, 10)}` : ""} · reported {formatDate(t.createdAt, true)}</span></span>
              <span className="flex gap-2"><button className="btn-primary btn-sm" onClick={() => decide(t, "approve")}>Approve</button><button className="btn-outline btn-sm" onClick={() => decide(t, "reject")}>Reject</button></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Purchases({ purchases, onDone }) {
  const call = useApiCall();
  const toast = useToast();
  const refund = async (p) => {
    const note = window.prompt(`Refund the ${p.unusedCredits} unused credits of ${p.receiptNumber}? Give the reason (the money itself is returned by finance).`);
    if (!note) return;
    try {
      const r = await call(`/ai-credits/admin/purchases/${p.id}/refund`, { method: "POST", body: { note } });
      toast.push(`${r.data.refundedCredits} credits taken back - refund Rs ${r.data.refundInr}.`, "success");
      onDone();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  if (!purchases.length) return null;
  return (
    <div className="card overflow-x-auto">
      <p className="px-5 pt-4 text-sm font-bold text-ink-900">Credit purchases</p>
      <table className="w-full min-w-[820px] text-sm">
        <thead className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500"><tr><th className={th}>Paid</th><th className={th}>User</th><th className={th}>Pack</th><th className={th}>Invoice</th><th className={th}>Paid by</th><th className={th}>Unused</th><th className={th} /></tr></thead>
        <tbody>
          {purchases.map((p) => (
            <tr key={p.id} className="border-b border-line last:border-0">
              <td className={`${th} text-xs text-ink-600`}>{formatDate(p.paidAt, true)}</td>
              <td className={th} data-no-translate>{p.userName}</td>
              <td className={th}>{p.packName} · {p.credits} credits<span className="block text-xs text-ink-500">{formatINR(p.totalInr, { compact: false })}</span></td>
              <td className={`${th} font-mono text-xs`}>{p.invoiceNumber || "—"}</td>
              <td className={`${th} text-xs`}>{p.gateway}{p.reference ? ` · ${p.reference}` : ""}</td>
              <td className={th}>{p.status === "refunded" ? <span className="text-xs text-ink-500">Refunded {p.refundedCredits} (Rs {p.refundInr})</span> : p.unusedCredits ?? "—"}</td>
              <td className={`${th} text-right`}>{p.status === "paid" && p.unusedCredits > 0 && <button className="btn-outline btn-sm" onClick={() => refund(p)}>Refund unused</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AiSettingsPage() {
  const { role } = useAuth();
  const superAdmin = role === "super_admin";
  const { data, reload } = useApiQuery("/ai-credits/admin");
  const [editing, setEditing] = useState(null);
  const [pack, setPack] = useState(undefined); // undefined closed, null new, object edit
  if (!data) return <div className="flex justify-center py-16"><InlineSpinner className="h-6 w-6" /></div>;
  const models = Object.keys(data.modelPrices || {});
  const price = (m) => data.modelPrices?.[m];
  const totalCost = data.usage30d.reduce((s, u) => s + Number(u.costInr || 0), 0);
  const totalCredits = data.usage30d.reduce((s, u) => s + Number(u.credits || 0), 0);
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="AI" title="AI settings" subtitle="Serchi - the one AI service every feature uses. Which model each task runs on, what the asking user pays in credits, and what each call actually cost." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["OpenAI", data.providers.openai ? "Connected" : "No key"], ["Claude", data.providers.claude ? "Connected" : "No key"], ["API cost, 30 days", formatINR(totalCost, { compact: false })], ["Credits charged, 30 days", totalCredits.toLocaleString("en-IN")], ["Credit sales, 30 days", formatINR(data.revenue30d.revenue_inr, { compact: false })]].map(([l, v]) => (
          <div key={l} className="card p-4"><p className="text-xs font-semibold text-ink-500">{l}</p><p className="mt-1 font-display text-lg font-extrabold text-ink-950">{v}</p></div>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500"><tr><th className={th}>AI task</th><th className={th}>Model</th><th className={th}>Fallback</th><th className={th}>Model price / 1M tokens</th><th className={th}>User pays</th><th className={th} /></tr></thead>
          <tbody>
            {data.activities.map((a) => (
              <tr key={a.key} className={`border-b border-line last:border-0 ${a.active ? "" : "opacity-50"}`}>
                <td className={th}><span className="font-semibold text-ink-900">{a.label}</span><span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${a.tier === "important" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-600"}`}>{a.tier}</span></td>
                <td className={`${th} font-mono text-xs`}>{a.model}</td>
                <td className={`${th} font-mono text-xs text-ink-500`}>{a.fallbackModel || "—"}</td>
                <td className={`${th} text-xs`}>{price(a.model) ? `$${price(a.model).input} in / $${price(a.model).output} out` : "—"}</td>
                <td className={th}>{a.active ? <span className="font-semibold">{a.credits} credits</span> : <span className="text-xs text-ink-500">Off (rules / self-hosted)</span>}</td>
                <td className={`${th} text-right`}>{superAdmin && <button className="btn-outline btn-sm" onClick={() => setEditing(a)}><LuPencil className="h-3.5 w-3.5" /> Edit</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold text-ink-900">Credit packs</p>{superAdmin && <button className="btn-outline btn-sm" onClick={() => setPack(null)}><LuPlus className="h-3.5 w-3.5" /> Add pack</button>}</div>
          <ul className="divide-y divide-line text-sm">
            {data.packs.map((p) => (
              <li key={p.id} className={`flex items-center justify-between gap-3 py-2 ${p.active ? "" : "opacity-50"}`}>
                <span><span className="font-semibold">{p.name}</span> - {p.totalCredits.toLocaleString("en-IN")} credits{p.bonusCredits ? ` (incl. ${p.bonusCredits} bonus)` : ""}<span className="block text-xs text-ink-500">{formatINR(p.priceInr, { compact: false })} + {data.gstPercent}% GST = {formatINR(p.totalInr, { compact: false })}</span></span>
                {superAdmin && <button className="btn-outline btn-sm" onClick={() => setPack(p)}>Edit</button>}
              </li>
            ))}
          </ul>
        </div>
        <AddCredits packs={data.packs.filter((p) => p.active)} onDone={reload} />
      </div>

      <div className="card overflow-x-auto">
        <p className="px-5 pt-4 text-sm font-bold text-ink-900">Cost against credits, last 30 days</p>
        <p className="px-5 text-xs text-ink-500">Actual API cost in rupees (at Rs {data.usdInrRate} per US$) against the credits charged. Keep every price above its cost.</p>
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500"><tr><th className={th}>Task</th><th className={th}>Model</th><th className={th}>Runs</th><th className={th}>Failed</th><th className={th}>Tokens in / out</th><th className={th}>API cost</th><th className={th}>Per run</th><th className={th}>Credits</th><th className={th}>Margin</th></tr></thead>
          <tbody>
            {data.usage30d.length === 0 ? <tr><td colSpan={9} className="px-5 py-4 text-xs text-ink-500">No AI calls yet.</td></tr> : data.usage30d.map((u) => (
              <tr key={`${u.activity_key}-${u.model}`} className="border-b border-line last:border-0">
                <td className={th}>{data.activities.find((a) => a.key === u.activity_key)?.label || u.activity_key}</td>
                <td className={`${th} font-mono text-xs`}>{u.model}</td>
                <td className={th}>{u.runs}</td><td className={th}>{u.failed}</td>
                <td className={`${th} text-xs`}>{Number(u.input_tokens || 0).toLocaleString("en-IN")} / {Number(u.output_tokens || 0).toLocaleString("en-IN")}</td>
                <td className={th}>Rs {u.costInr.toFixed(2)}<span className="block text-[11px] text-ink-500">{USD(u.cost_usd)}</span></td>
                <td className={`${th} text-xs`}>Rs {u.costPerRunInr.toFixed(2)}</td>
                <td className={th}>{u.credits}</td>
                <td className={`${th} font-semibold ${u.belowCost ? "text-coral-600" : "text-emerald-700"}`}>{u.belowCost ? "Below cost " : ""}Rs {u.marginInr.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TopupQueue onDone={reload} />
      <Purchases purchases={data.purchases || []} onDone={reload} />

      <div className="card overflow-x-auto">
        <p className="px-5 pt-4 text-sm font-bold text-ink-900">Latest AI actions</p>
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-500"><tr><th className={th}>When</th><th className={th}>Task</th><th className={th}>Asked by</th><th className={th}>Model</th><th className={th}>API cost</th><th className={th}>Credits</th></tr></thead>
          <tbody>
            {(data.recentRuns || []).slice(0, 30).map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className={`${th} text-xs text-ink-600`}>{formatDate(r.at, true)}</td>
                <td className={th}>{r.label || r.activityKey}{r.status !== "ok" && <span className="ml-2 rounded bg-coral-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-coral-700">{r.status}</span>}</td>
                <td className={th} data-no-translate>{r.userName || "—"}</td>
                <td className={`${th} font-mono text-xs`}>{r.model || "—"}</td>
                <td className={th}>Rs {r.costInr.toFixed(2)}</td>
                <td className={`${th} ${r.belowCost ? "font-semibold text-coral-600" : ""}`}>{r.creditsCharged}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.label || ""} maxWidth="max-w-2xl">
        {editing && <ActivityEditor key={editing.key} a={editing} models={models} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      </Modal>
      <Modal open={pack !== undefined} onClose={() => setPack(undefined)} title={pack ? `Edit ${pack.name}` : "New credit pack"}>
        {pack !== undefined && <PackEditor pack={pack} onClose={() => setPack(undefined)} onSaved={() => { setPack(undefined); reload(); }} />}
      </Modal>
    </div>
  );
}
