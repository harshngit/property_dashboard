import { useEffect, useState } from "react";
import { LuCoins, LuSparkles, LuDownload, LuGift } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import Modal from "../../components/common/Modal";
import { InlineSpinner } from "../../components/common/PageLoader";
import { SelectField, TextField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { API_BASE_URL } from "../../config/api";
import { useSelector } from "react-redux";
import { formatDate, formatINR } from "../../lib/format";

// AI credits wallet: 1 credit = Rs 1. Every AI action (Serchi) is paid from
// the wallet of the person who asks - staff included. Buy a pack online, or
// pay by bank transfer / UPI and report it for approval. Plus spend limits,
// GST invoices, referral credits and credits about to expire.

export const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load the payment window"));
    document.body.appendChild(s);
  });

const KIND = { purchase: "Bought", spend: "Used", refund: "Returned", grant: "Added by A R Buildwel", adjust: "Correction", referral: "Referral reward", expire: "Expired", refund_out: "Refunded to you" };
const TOPUP_TONE = { pending: "bg-amber-50 text-amber-700", approved: "bg-emerald-50 text-emerald-700", rejected: "bg-slate-100 text-slate-600" };
const th = "px-4 py-3";

export default function AiCreditsPage() {
  const call = useApiCall();
  const toast = useToast();
  const token = useSelector((s) => s.auth.accessToken);
  const { data: w, error, reload } = useApiQuery("/ai-credits/wallet");
  const [buying, setBuying] = useState(null);
  const [transfer, setTransfer] = useState(null);

  const buy = async (pack) => {
    setBuying(pack.id);
    try {
      const order = (await call("/ai-credits/purchases", { method: "POST", body: { packId: pack.id } })).data;
      await loadRazorpay();
      await new Promise((resolve, reject) => {
        new window.Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          name: "PropertySerch.com",
          description: `${pack.name} - ${pack.totalCredits} AI credits (${order.receiptNumber})`,
          handler: (r) =>
            call(`/ai-credits/purchases/${order.purchaseId}/verify`, { method: "POST", body: { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature } }).then(resolve, reject),
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        }).open();
      });
      toast.push(`${pack.totalCredits} credits added. Your GST invoice is below.`, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBuying(null);
    }
  };

  const invoice = async (id, number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/ai-credits/purchases/${id}/invoice`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Could not download the invoice");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  if (error) return <div className="card p-6 text-sm text-coral-700">{error}</div>;
  if (!w) return <div className="flex justify-center py-16"><InlineSpinner className="h-6 w-6" /></div>;
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="AI" title="AI credits" subtitle="1 credit = Rs 1. Every AI action takes its credits from your balance, and you see the price before you press the button." />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card flex items-center gap-4 p-5 md:col-span-1">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><LuCoins className="h-6 w-6" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Balance</p>
            <p className="font-display text-3xl font-extrabold text-ink-950">{w.balance.toLocaleString("en-IN")}</p>
            <p className="text-xs text-ink-500">{w.lifetimePurchased.toLocaleString("en-IN")} bought · {w.lifetimeSpent.toLocaleString("en-IN")} used</p>
            {w.expiring?.length > 0 && <p className="mt-1 text-xs font-semibold text-amber-700">{w.expiring[0].credits} credits expire on {formatDate(w.expiring[0].expiresAt)}</p>}
          </div>
        </div>
        <div className="card p-5 md:col-span-2">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">What AI actions cost</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {w.prices.map((p) => (
              <li key={p.key} className="flex items-start justify-between gap-3 rounded-lg border border-line px-3 py-2">
                <span className="min-w-0"><span className="block text-sm font-semibold text-ink-900">{p.label}</span><span className="block text-[11px] text-ink-500">{p.description}</span></span>
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">{p.credits} credits</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-ink-500">If an AI action cannot run, its credits come back automatically. With no credits, the AI buttons stay off - the rest of the platform works as usual.</p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Buy credits</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {w.packs.map((p) => (
            <div key={p.id} className="card flex flex-col p-5">
              <p className="text-sm font-bold text-ink-900">{p.name}</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-ink-950">{p.totalCredits.toLocaleString("en-IN")} <span className="text-sm font-semibold text-ink-500">credits</span></p>
              {p.bonusCredits > 0 && <p className="text-xs font-semibold text-emerald-700">includes {p.bonusCredits.toLocaleString("en-IN")} bonus</p>}
              <p className="mt-2 text-xs text-ink-500">{formatINR(p.priceInr, { compact: false })} + {w.gstPercent}% GST = <span className="font-semibold text-ink-800">{formatINR(p.totalInr, { compact: false })}</span></p>
              <div className="mt-4 flex flex-col gap-2">
                {w.paymentOnline && <button className="btn-primary" disabled={!!buying} onClick={() => buy(p)}>{buying === p.id ? "Opening payment…" : "Pay online"}</button>}
                <button className="btn-secondary" onClick={() => setTransfer(p)}>Pay by bank transfer / UPI</button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-ink-500">A GST invoice is issued for every purchase. Credit validity and refunds follow the PropertySerch Terms & Conditions{w.refundDays != null ? ` (unused purchased credits can be refunded within ${w.refundDays} days)` : ""}.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Limits settings={w.settings} onSaved={reload} />
        <Referrals referrals={w.referrals} />
      </div>

      {w.topups?.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Bank / UPI payments you reported</h3>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500"><tr><th className={th}>Reported</th><th className={th}>Pack</th><th className={th}>Reference</th><th className={th}>Status</th></tr></thead>
              <tbody>
                {w.topups.map((t) => (
                  <tr key={t.id} className="border-b border-line last:border-0">
                    <td className={`${th} text-xs text-ink-600`}>{formatDate(t.createdAt, true)}</td>
                    <td className={th}>{t.packName} · {formatINR(t.amountInr, { compact: false })}</td>
                    <td className={`${th} font-mono text-xs`}>{t.method.toUpperCase()} {t.reference}</td>
                    <td className={th}><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${TOPUP_TONE[t.status]}`}>{t.status === "pending" ? "Being checked" : t.status === "approved" ? "Credited" : "Not accepted"}</span>{t.decisionNote && t.status === "rejected" && <span className="block text-[11px] text-ink-500">{t.decisionNote}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {w.invoices?.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">GST invoices</h3>
          <div className="card divide-y divide-line">
            {w.invoices.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span><span className="font-mono text-xs font-semibold text-ink-900">{i.invoiceNumber}</span> <span className="text-ink-600">· {i.packName} · {i.credits} credits · {formatINR(i.totalInr, { compact: false })} · {formatDate(i.paidAt)}</span>{i.status === "refunded" && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{i.refundedCredits} refunded</span>}</span>
                <button className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline" onClick={() => invoice(i.id, i.invoiceNumber)}><LuDownload className="h-3.5 w-3.5" /> PDF</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">History</h3>
        {w.history.length === 0 ? (
          <div className="card"><EmptyState icon={LuSparkles} title="No credit activity yet" /></div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500"><tr><th className={th}>When</th><th className={th}>What</th><th className={`${th} text-right`}>Credits</th><th className={`${th} text-right`}>Balance</th></tr></thead>
              <tbody>
                {w.history.map((h) => (
                  <tr key={h.id} className="border-b border-line last:border-0">
                    <td className={`${th} text-xs text-ink-600`}>{formatDate(h.at, true)}</td>
                    <td className={th}><span className="font-semibold text-ink-900">{KIND[h.kind] || h.kind}</span>{h.label && <span className="block text-xs text-ink-500">{h.label}</span>}</td>
                    <td className={`${th} text-right font-mono font-semibold ${h.credits < 0 ? "text-coral-600" : "text-emerald-700"}`}>{h.credits > 0 ? `+${h.credits}` : h.credits}</td>
                    <td className={`${th} text-right font-mono`}>{h.balanceAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!transfer} onClose={() => setTransfer(null)} title={transfer ? `Pay for the ${transfer.name} pack` : ""} description="Pay by bank transfer or UPI, then report it here. Your credits are added once A R Buildwel matches the payment.">
        {transfer && <TransferForm pack={transfer} details={w.paymentDetails} onDone={() => { setTransfer(null); reload(); }} />}
      </Modal>
    </div>
  );
}

function TransferForm({ pack, details, onDone }) {
  const call = useApiCall();
  const toast = useToast();
  const [form, setForm] = useState({ method: "upi", reference: "", paidOn: "" });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await call("/ai-credits/topups", { method: "POST", body: { packId: pack.id, method: form.method, reference: form.reference.trim(), paidOn: form.paidOn || undefined } });
      toast.push("Payment reported. We will add the credits once it is checked.", "success");
      onDone();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-lg bg-surface-muted p-3">
        <p className="font-semibold text-ink-900">Amount to pay: {formatINR(pack.totalInr, { compact: false })} <span className="font-normal text-ink-500">(incl. GST)</span></p>
        {details?.upi && <p className="mt-1 text-ink-700">UPI: <span className="font-mono">{details.upi}</span></p>}
        {details?.bank && <p className="mt-1 text-ink-700">Bank: {details.bank}</p>}
      </div>
      <SelectField label="Paid by" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))} options={[{ value: "upi", label: "UPI" }, { value: "bank", label: "Bank transfer (NEFT / RTGS / IMPS)" }]} />
      <TextField label="UTR / transaction reference" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="e.g. 4211 0987 6543" />
      <TextField label="Paid on (optional)" type="date" value={form.paidOn} onChange={(e) => setForm((f) => ({ ...f, paidOn: e.target.value }))} />
      <button className="btn-primary" disabled={busy || form.reference.trim().length < 6} onClick={submit}>{busy ? "Sending…" : "Report payment"}</button>
    </div>
  );
}

function Limits({ settings, onSaved }) {
  const call = useApiCall();
  const toast = useToast();
  const [f, setF] = useState({ lowBalanceAlert: "", dailyCap: "", monthlyCap: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setF({ lowBalanceAlert: settings?.lowBalanceAlert ?? "", dailyCap: settings?.dailyCap ?? "", monthlyCap: settings?.monthlyCap ?? "" });
  }, [settings]);
  const save = async () => {
    setBusy(true);
    try {
      const n = (v) => (v === "" || v === null ? null : Number(v));
      await call("/ai-credits/settings", { method: "PUT", body: { lowBalanceAlert: n(f.lowBalanceAlert), dailyCap: n(f.dailyCap), monthlyCap: n(f.monthlyCap) } });
      toast.push("Saved.", "success");
      onSaved();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <div className="card space-y-3 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Alerts and limits</p>
      <TextField label={`Tell me when my balance falls below (default ${settings?.defaultLowBalanceAlert ?? 25})`} type="number" min="0" value={f.lowBalanceAlert} onChange={set("lowBalanceAlert")} />
      <div className="grid grid-cols-2 gap-2">
        <TextField label="Daily AI limit (credits)" type="number" min="1" placeholder="No limit" value={f.dailyCap} onChange={set("dailyCap")} />
        <TextField label="Monthly AI limit (credits)" type="number" min="1" placeholder="No limit" value={f.monthlyCap} onChange={set("monthlyCap")} />
      </div>
      <button className="btn-secondary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
    </div>
  );
}

function Referrals({ referrals }) {
  if (!referrals) return null;
  const r = referrals.rewards || {};
  const earned = Object.values(referrals.earned || {}).reduce((n, x) => n + x.credits, 0);
  return (
    <div className="card space-y-2 p-5">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-500"><LuGift className="h-4 w-4" /> Earn credits by introducing people</p>
      {referrals.code && <p className="text-sm text-ink-800">Your code: <span className="font-mono font-bold">{referrals.code}</span></p>}
      <ul className="ml-4 list-disc text-sm text-ink-700">
        {r.join > 0 && <li>{r.join} credits when someone you introduced joins</li>}
        {r.usagePercent > 0 && <li>{r.usagePercent}% of the AI credits they use, for as long as they use them</li>}
        {r.dealClosed > 0 && <li>{r.dealClosed} credits when their deal closes</li>}
      </ul>
      <p className="text-xs text-ink-500">Earned so far: <span className="font-semibold text-ink-800">{earned} credits</span></p>
    </div>
  );
}
