import { useState } from "react";
import { LuCoins, LuSparkles } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR } from "../../lib/format";

// AI credits wallet: 1 credit = Rs 1. Buy a pack, then each AI action takes its
// credits (the price list below). When the balance runs out, buy again.

export const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load the payment window"));
    document.body.appendChild(s);
  });

const KIND = { purchase: "Bought", spend: "Used", refund: "Returned", grant: "Added by A R Buildwel", adjust: "Correction" };
const th = "px-4 py-3";

export default function AiCreditsPage() {
  const call = useApiCall();
  const toast = useToast();
  const { data: w, error, reload } = useApiQuery("/ai-credits/wallet");
  const [buying, setBuying] = useState(null);

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
      toast.push(`${pack.totalCredits} credits added.`, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBuying(null);
    }
  };

  if (error) return <div className="card p-6 text-sm text-coral-700">{error}</div>;
  if (!w) return <div className="flex justify-center py-16"><InlineSpinner className="h-6 w-6" /></div>;
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="AI" title="AI credits" subtitle="1 credit = Rs 1. AI actions take credits from this balance; when it runs out, buy a pack again." />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card flex items-center gap-4 p-5 md:col-span-1">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><LuCoins className="h-6 w-6" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Balance</p>
            <p className="font-display text-3xl font-extrabold text-ink-950">{w.balance.toLocaleString("en-IN")}</p>
            <p className="text-xs text-ink-500">{w.lifetimePurchased.toLocaleString("en-IN")} bought · {w.lifetimeSpent.toLocaleString("en-IN")} used</p>
          </div>
        </div>
        <div className="card p-5 md:col-span-2">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">What AI actions cost</p>
          {w.staffFree && <p className="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">You are A R Buildwel staff - AI actions are free for you.</p>}
          <ul className="grid gap-2 sm:grid-cols-2">
            {w.prices.map((p) => (
              <li key={p.key} className="flex items-start justify-between gap-3 rounded-lg border border-line px-3 py-2">
                <span className="min-w-0"><span className="block text-sm font-semibold text-ink-900">{p.label}</span><span className="block text-[11px] text-ink-500">{p.description}</span></span>
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">{p.credits} credits</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Buy credits</h3>
        {!w.paymentOnline && <p className="mb-3 rounded-lg bg-surface-muted px-4 py-3 text-xs text-ink-600">Online payment is not switched on yet. Pay by bank transfer and your A R Buildwel contact adds the credits with the transfer reference.</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          {w.packs.map((p) => (
            <div key={p.id} className="card flex flex-col p-5">
              <p className="text-sm font-bold text-ink-900">{p.name}</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-ink-950">{p.totalCredits.toLocaleString("en-IN")} <span className="text-sm font-semibold text-ink-500">credits</span></p>
              {p.bonusCredits > 0 && <p className="text-xs font-semibold text-emerald-700">includes {p.bonusCredits.toLocaleString("en-IN")} bonus</p>}
              <p className="mt-2 text-xs text-ink-500">{formatINR(p.priceInr, { compact: false })} + {w.gstPercent}% GST = <span className="font-semibold text-ink-800">{formatINR(p.totalInr, { compact: false })}</span></p>
              <button className="btn-primary mt-4" disabled={!w.paymentOnline || !!buying} onClick={() => buy(p)}>{buying === p.id ? "Opening payment…" : "Buy"}</button>
            </div>
          ))}
        </div>
      </div>

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
    </div>
  );
}
