import { useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { LuPlus, LuCircleAlert, LuTriangleAlert } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { API_BASE_URL } from "../../config/api";
import { formatDate, titleCase } from "../../lib/format";
import CampaignForm, { inr } from "./CampaignForm";

// Module 17 - Advertiser & Monetization.
//   A R staff    revenue dashboard, campaign approval queue, advertiser
//                eligibility approval (AV code + portal login), rate card,
//                suggested advertisers to approach.
//   Advertiser   the Advertiser Portal: own campaigns with impressions,
//                clicks and CTR, invoices and payment, the rate card.

const STAFF = ["internal_sales", "admin", "super_admin"];
const ADMIN = ["admin", "super_admin"];
const STATUS_LABEL = { pending_payment: "Awaiting payment", pending_review: "In review", approved: "Approved", scheduled: "Scheduled", active: "Live", paused: "Paused", rejected: "Changes needed", ended: "Ended", cancelled: "Cancelled" };
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
const th = "px-4 py-3";

function Stat({ label, value, tone = "text-ink-950", hint }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 font-display text-2xl font-extrabold ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-500">{hint}</p>}
    </div>
  );
}

// The invoice PDF needs the bearer token, so fetch it and open the blob.
function useInvoicePdf() {
  const token = useSelector((s) => s.auth.accessToken);
  const toast = useToast();
  return async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/ads/invoices/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Could not open the invoice");
      window.open(URL.createObjectURL(await res.blob()), "_blank", "noopener");
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
}

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load the payment window"));
    document.body.appendChild(s);
  });

// ------------------------------------------------------------ campaign detail

function CampaignDetail({ id, staff, admin, payOnline, rateCard, onChanged }) {
  const call = useApiCall();
  const toast = useToast();
  const openPdf = useInvoicePdf();
  const { data: c, loading, reload } = useApiQuery(`/ads/campaigns/${id}`);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  if (loading && !c) return <Spinner />;
  if (!c) return null;

  const run = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      if (msg) toast.push(msg, "success");
      reload();
      onChanged();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const payNow = () => run(async () => {
    const order = (await call(`/ads/invoices/${c.invoice.id}/pay/order`, { method: "POST" })).data;
    await loadRazorpay();
    await new Promise((resolve, reject) => {
      new window.Razorpay({
        key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency, name: "PropertySerch.com", description: `Invoice ${order.invoiceNumber}`,
        handler: (r) => call(`/ads/invoices/${c.invoice.id}/pay/verify`, { method: "POST", body: { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature } }).then(resolve, reject),
        modal: { ondismiss: () => reject(new Error("Payment was not completed")) },
      }).open();
    });
  }, "Payment received - your campaign is now in review.");

  if (editing) return <CampaignForm campaign={c} rateCard={rateCard} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); onChanged(); }} />;

  const t = c.targeting || {};
  const audience = [t.cities?.length && `Cities: ${t.cities.join(", ")}`, t.localities?.length && `Localities: ${t.localities.join(", ")}`, t.roles?.length && `Audience: ${t.roles.map(titleCase).join(", ")}`, t.propertyTypes?.length && `Types: ${t.propertyTypes.join(", ")}`,
    (t.budgetMin || t.budgetMax) && `Budget: ${t.budgetMin ? inr(t.budgetMin) : "any"} – ${t.budgetMax ? inr(t.budgetMax) : "any"}`, t.device && t.device !== "all" && `${titleCase(t.device)} only`].filter(Boolean);
  const blocking = (c.reviewFlags || []).filter((f) => f.severity === "block");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-500">{c.businessName} · {c.avCode}</p>
          <p className="font-display text-lg font-extrabold text-ink-950">{c.name}</p>
          <p className="text-xs text-ink-600">{c.formatLabel} · {c.startDate} to {c.endDate} · {c.units} {c.pricingUnit}{c.units === 1 ? "" : "s"}</p>
        </div>
        <StatusBadge value={STATUS_LABEL[c.state] || titleCase(c.state)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Impressions" value={c.stats.impressions.toLocaleString("en-IN")} hint={`${c.stats.impressionsToday} today · ${c.stats.impressionsWeek} this week`} />
        <Stat label="Clicks" value={c.stats.clicks.toLocaleString("en-IN")} hint={`${c.stats.clicksWeek} this week`} />
        <Stat label="CTR" value={`${c.stats.ctr}%`} />
        <Stat label="Spent / remaining" value={inr(c.spent)} hint={`${inr(c.remaining)} remaining of ${inr(c.amount)}`} />
      </div>
      {c.stats.variants.length > 1 && (
        <div className="card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">A/B test</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[...c.stats.variants].sort((a, b) => a.variant.localeCompare(b.variant)).map((v) => (
              <div key={v.variant} className="rounded-xl border border-line p-3 text-sm">
                <p className="font-bold text-ink-900">Version {v.variant}: {v.variant === "B" ? c.variantB?.headline || c.headline : c.headline}</p>
                <p className="mt-1 text-xs text-ink-600">{v.impressions} impressions · {v.clicks} clicks · <b>{v.ctr}% CTR</b></p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card space-y-2 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Creative</p>
          {c.imageUrl && <img src={c.imageUrl} alt="" className="max-h-36 w-full rounded-lg border border-line object-cover" />}
          {c.propertyTitle && <p className="text-ink-700">Promoted listing: <b>{c.propertyTitle}</b></p>}
          {c.headline && <p className="font-bold text-ink-900">{c.headline}</p>}
          {c.body && <p className="text-ink-700">{c.body}</p>}
          {c.ctaUrl && <p className="truncate text-xs text-ink-500">{c.ctaLabel || "Learn more"} → {c.ctaUrl}</p>}
          <p className="text-xs text-ink-500">RERA: {c.reraNumber || "—"}</p>
        </div>
        <div className="card space-y-2 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Audience and placement</p>
          <p className="text-ink-700">Shown in: {c.placements.map((p) => titleCase(p.replace(/_/g, " "))).join(", ")}</p>
          {audience.length ? audience.map((a) => <p key={a} className="text-ink-700">{a}</p>) : <p className="text-ink-500">Everyone, all cities</p>}
          {c.invoice && (
            <p className="border-t border-line pt-2 text-ink-700">
              Invoice {c.invoice.number} · {inr(c.invoice.total)} incl. GST · <b>{titleCase(c.invoice.status)}</b>{" "}
              <button className="font-semibold text-red-600 hover:underline" onClick={() => openPdf(c.invoice.id)}>PDF</button>
            </p>
          )}
        </div>
      </div>

      {c.reviewNote && c.status === "rejected" && <p className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{c.reviewNote}</p>}
      {(c.reviewFlags || []).length > 0 && ["pending_review", "rejected"].includes(c.status) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="mb-1 font-semibold text-amber-900">Checks</p>
          {c.reviewFlags.map((f, i) => <p key={i} className={`flex gap-2 ${f.severity === "block" ? "text-red-700" : "text-amber-800"}`}><LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{f.detail}{f.severity === "block" ? " (must be fixed)" : ""}</p>)}
        </div>
      )}

      {c.status === "pending_payment" && (
        <div className="card space-y-3 p-4">
          <p className="text-sm text-ink-700">Pay <b>{inr(c.invoice.total)}</b> (incl. GST) to send this campaign for review.</p>
          <div className="flex flex-wrap items-end gap-2">
            {payOnline && <button className="btn-primary" disabled={busy} onClick={payNow}>Pay online</button>}
            {!payOnline && !staff && <p className="text-xs text-ink-500">Pay by bank transfer and share the reference (UTR) with your A R Buildwel contact - the campaign moves to review once it is recorded.</p>}
            {staff && (
              <>
                <TextField label="Payment reference (UTR / cheque no.)" value={reference} onChange={(e) => setReference(e.target.value)} className="w-64" />
                <button className="btn-primary" disabled={busy || reference.trim().length < 3} onClick={() => run(() => call(`/ads/invoices/${c.invoice.id}/pay/record`, { method: "POST", body: { reference } }), "Payment recorded - campaign is in review.")}>Record payment</button>
              </>
            )}
            <button className="btn-outline ml-auto" disabled={busy} onClick={() => run(() => call(`/ads/campaigns/${c.id}/cancel`, { method: "POST" }), "Campaign cancelled.")}>Cancel campaign</button>
          </div>
        </div>
      )}

      {admin && c.status === "pending_review" && (
        <div className="card space-y-3 p-4">
          <p className="text-sm font-semibold text-ink-900">Review this campaign</p>
          <TextareaField label="Note to the advertiser (required to reject)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" disabled={busy || !note.trim()} onClick={() => run(() => call(`/ads/campaigns/${c.id}/review`, { method: "POST", body: { decision: "reject", note } }), "Campaign sent back to the advertiser.")}>Reject</button>
            <button className="btn-primary" disabled={busy || blocking.length > 0} title={blocking.length ? "Fix the blocking checks first" : ""} onClick={() => run(() => call(`/ads/campaigns/${c.id}/review`, { method: "POST", body: { decision: "approve", note: note || undefined } }), "Campaign approved.")}>Approve</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {c.status === "approved" && <button className="btn-outline" disabled={busy} onClick={() => run(() => call(`/ads/campaigns/${c.id}/pause`, { method: "POST" }), "Campaign paused.")}>Pause</button>}
        {c.status === "paused" && <button className="btn-outline" disabled={busy} onClick={() => run(() => call(`/ads/campaigns/${c.id}/resume`, { method: "POST" }), "Campaign resumed.")}>Resume</button>}
        {!["ended", "cancelled"].includes(c.status) && <button className="btn-outline" onClick={() => setEditing(true)}>Edit creative / audience</button>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ tabs

function Campaigns({ staff, admin, payOnline, rateCard, advertisers, onChanged }) {
  const [status, setStatus] = useState("");
  const { data, loading, reload } = useApiQuery(`/ads/campaigns${buildQuery({ status })}`);
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const rows = data || [];
  const changed = () => { reload(); onChanged(); };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select id="ad-campaign-status" className="field-select h-9 w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All campaigns</option><option value="pending_review">In review</option><option value="pending_payment">Awaiting payment</option><option value="live">Live now</option><option value="approved">Approved</option><option value="paused">Paused</option><option value="rejected">Changes needed</option><option value="ended">Ended</option>
        </select>
        <button className="btn-primary btn-sm ml-auto" onClick={() => setCreating(true)}><LuPlus className="h-4 w-4" /> New campaign</button>
      </div>
      {loading && !data ? <Spinner /> : rows.length === 0 ? (
        <EmptyState title="No campaigns here" subtitle={staff ? "Campaigns appear here once an advertiser books one." : "Create your first campaign - choose where it appears, add your creative and pay the invoice."} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
              <tr><th className={th}>Campaign</th><th className={th}>Format</th><th className={th}>Dates</th><th className={th}>Impressions</th><th className={th}>Clicks</th><th className={th}>CTR</th><th className={th}>Amount</th><th className={th}>Status</th><th className={th} /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={c.id} className="cursor-pointer hover:bg-surface-muted/50" onClick={() => setOpenId(c.id)}>
                  <td className={th}><p className="font-semibold text-ink-900">{c.name}</p>{staff && <p className="text-xs text-ink-500">{c.businessName} · {c.avCode}</p>}</td>
                  <td className={th}>{c.formatLabel}</td>
                  <td className={`${th} text-xs`}>{c.startDate}<br />{c.endDate}</td>
                  <td className={th}>{c.stats.impressions.toLocaleString("en-IN")}</td>
                  <td className={th}>{c.stats.clicks}</td>
                  <td className={th}>{c.stats.ctr}%</td>
                  <td className={th}>{inr(c.amount)}</td>
                  <td className={th}><StatusBadge value={STATUS_LABEL[c.state] || titleCase(c.state)} /></td>
                  <td className={`${th} text-right text-xs font-semibold text-red-600`}>{c.status === "pending_review" && admin ? "Review" : c.status === "pending_payment" ? "Pay" : "Open"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!openId} onClose={() => setOpenId(null)} title="Campaign" maxWidth="max-w-4xl">
        <div className="max-h-[75vh] overflow-y-auto pr-1">{openId && <CampaignDetail id={openId} staff={staff} admin={admin} payOnline={payOnline} rateCard={rateCard} onChanged={changed} />}</div>
      </Modal>
      <Modal open={creating} onClose={() => setCreating(false)} title="New campaign" maxWidth="max-w-3xl">
        <div className="max-h-[75vh] overflow-y-auto pr-1">{creating && <CampaignForm rateCard={rateCard} advertisers={staff ? advertisers || [] : null} onCancel={() => setCreating(false)} onSaved={() => { setCreating(false); changed(); }} />}</div>
      </Modal>
    </div>
  );
}

function Invoices({ staff }) {
  const { data, loading } = useApiQuery("/ads/invoices");
  const openPdf = useInvoicePdf();
  const rows = data || [];
  if (loading && !data) return <Spinner />;
  if (!rows.length) return <EmptyState title="No invoices yet" subtitle="An invoice is raised when a campaign is created." />;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Invoice</th><th className={th}>Campaign</th><th className={th}>Amount</th><th className={th}>GST</th><th className={th}>Total</th><th className={th}>Status</th><th className={th} /></tr></thead>
        <tbody className="divide-y divide-line">
          {rows.map((i) => (
            <tr key={i.id}>
              <td className={th}><p className="font-semibold text-ink-900">{i.invoiceNumber}</p><p className="text-xs text-ink-500">{formatDate(i.createdAt)}</p></td>
              <td className={th}>{i.campaignName}{staff && <p className="text-xs text-ink-500">{i.businessName} · {i.avCode}</p>}</td>
              <td className={th}>{inr(i.amount)}</td><td className={th}>{inr(i.gstAmount)}</td><td className={`${th} font-semibold`}>{inr(i.total)}</td>
              <td className={th}><StatusBadge value={titleCase(i.status)} />{i.paymentReference && <p className="mt-1 text-[11px] text-ink-500">{i.paymentReference}</p>}</td>
              <td className={`${th} text-right`}><button className="text-xs font-semibold text-red-600 hover:underline" onClick={() => openPdf(i.id)}>PDF</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RateCard({ rateCard, admin, reload }) {
  const call = useApiCall();
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const items = rateCard?.items || [];
  const save = async () => {
    setBusy(true);
    try {
      await call("/ads/manage/rates", { method: "POST", body: edit.id ? { id: edit.id, rate: Number(edit.rate), minUnits: Number(edit.minUnits) || undefined, isActive: edit.isActive, maxConcurrent: edit.maxConcurrent } : { formatKey: edit.formatKey, city: edit.city, rate: Number(edit.rate) } });
      toast.push("Rate saved.", "success");
      setEdit(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="text-xs text-ink-500">{rateCard?.note} New bookings use the rate on the day they are made; running campaigns keep theirs.</p>
        {admin && <button className="btn-outline btn-sm ml-auto shrink-0" onClick={() => setEdit({ formatKey: items[0]?.formatKey, city: "", rate: "" })}><LuPlus className="h-4 w-4" /> City rate</button>}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Format</th><th className={th}>Where it appears</th><th className={th}>Rate (excl. GST)</th><th className={th}>Minimum</th>{admin && <th className={th} />}</tr></thead>
          <tbody className="divide-y divide-line">
            {items.map((r) => (
              <tr key={r.id} className={r.isActive ? "" : "opacity-50"}>
                <td className={th}><p className="font-semibold text-ink-900">{r.label}{r.city ? ` - ${r.city}` : ""}</p>{!r.city && <p className="max-w-[320px] text-xs text-ink-500">{r.description}</p>}</td>
                <td className={`${th} text-xs text-ink-600`}>{r.placements.map((p) => titleCase(p.replace(/_/g, " "))).join(", ")}{r.maxConcurrent ? ` · exclusive (${r.maxConcurrent})` : ""}</td>
                <td className={`${th} font-semibold`}>{r.rate > 0 ? `${inr(r.rate)} / ${r.pricingUnit}` : <span className="text-amber-700">Not set</span>}</td>
                <td className={th}>{r.minUnits} {r.pricingUnit}{r.minUnits === 1 ? "" : "s"}</td>
                {admin && <td className={`${th} text-right`}><button className="text-xs font-semibold text-red-600 hover:underline" onClick={() => setEdit({ ...r, maxConcurrent: r.maxConcurrent ?? "" })}>Edit</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Rate - ${edit.label}${edit.city ? ` (${edit.city})` : ""}` : "City-specific rate"}>
        {edit && (
          <div className="space-y-3">
            {!edit.id && (
              <>
                <label className="block"><span className="field-label">Format</span><select id="rate-format" className="field-select" value={edit.formatKey} onChange={(e) => setEdit({ ...edit, formatKey: e.target.value })}>{items.filter((r) => !r.city).map((r) => <option key={r.formatKey} value={r.formatKey}>{r.label}</option>)}</select></label>
                <TextField label="City" value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} />
              </>
            )}
            <TextField label={`Rate in ₹ (excl. GST)${edit.pricingUnit ? ` per ${edit.pricingUnit}` : ""}`} type="number" min="0" value={edit.rate} onChange={(e) => setEdit({ ...edit, rate: e.target.value })} />
            {edit.id && (
              <>
                <TextField label={`Minimum booking (${edit.pricingUnit}s)`} type="number" min="1" value={edit.minUnits} onChange={(e) => setEdit({ ...edit, minUnits: e.target.value })} />
                <TextField label="Exclusive slot - campaigns allowed at the same time (blank = no limit)" type="number" min="1" value={edit.maxConcurrent} onChange={(e) => setEdit({ ...edit, maxConcurrent: e.target.value })} />
                <label className="flex items-center gap-2 text-sm text-ink-700"><input type="checkbox" checked={!!edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /> Available for booking</label>
              </>
            )}
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" disabled={busy || edit.rate === "" || (!edit.id && !edit.city.trim())} onClick={save}>Save</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Advertisers({ admin, data, reload, onChanged }) {
  const call = useApiCall();
  const toast = useToast();
  const enquiries = useApiQuery("/ads/manage/enquiries");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const categories = data?.eligibleCategories || [];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const start = (lead) => setForm({ bdLeadId: lead?.id || "", businessName: lead?.business_name || "", businessCategory: lead?.business_category || categories[0] || "", contactName: lead?.full_name || "", loginEmail: lead?.email || "", contactMobile: lead?.mobile || "", gstin: "", billingAddress: "", reraNumber: "", password: "" });
  const approve = async () => {
    setBusy(true);
    try {
      const res = await call("/ads/manage/advertisers", { method: "POST", body: Object.fromEntries(Object.entries(form).filter(([, v]) => v !== "")) });
      toast.push(`Advertiser approved - code ${res.data.avCode}. Share the login email and password with them.`, "success");
      setForm(null);
      reload();
      enquiries.reload();
      onChanged();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (a) => {
    try {
      await call(`/ads/manage/advertisers/${a.id}`, { method: "PATCH", body: { status: a.status === "active" ? "suspended" : "active" } });
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const pending = enquiries.data || [];
  const rows = data?.items || [];
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <h3 className="text-sm font-bold text-ink-900">Enquiries awaiting eligibility approval ({pending.length})</h3>
          {admin && <button className="btn-outline btn-sm ml-auto" onClick={() => start(null)}><LuPlus className="h-4 w-4" /> Add advertiser (outbound)</button>}
        </div>
        {pending.length === 0 ? <p className="card p-4 text-sm text-ink-500">No "Advertise With Us" enquiries are waiting.</p> : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Business</th><th className={th}>Category</th><th className={th}>Contact</th><th className={th}>Wants</th><th className={th}>Received</th><th className={th} /></tr></thead>
              <tbody className="divide-y divide-line">
                {pending.map((b) => (
                  <tr key={b.id}>
                    <td className={`${th} font-semibold text-ink-900`}>{b.business_name}</td>
                    <td className={th}>{titleCase((b.business_category || "").replace(/_/g, " "))}{!b.eligible && <p className="text-[11px] font-semibold text-red-600">Not an eligible category</p>}</td>
                    <td className={`${th} text-xs`}>{b.full_name}<br />{b.email || b.mobile}</td>
                    <td className={`${th} max-w-[220px] text-xs text-ink-600`}>{[b.desired_placement, b.budget_range].filter(Boolean).join(" · ") || "—"}</td>
                    <td className={`${th} text-xs`}>{formatDate(b.created_at)}</td>
                    <td className={`${th} text-right`}>{admin && b.eligible && <button className="btn-primary btn-sm" onClick={() => start(b)}>Approve</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold text-ink-900">Approved advertisers ({rows.length})</h3>
        {rows.length === 0 ? <EmptyState title="No advertisers yet" subtitle="Approve an enquiry above, or add an advertiser you approached directly." /> : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Code</th><th className={th}>Business</th><th className={th}>Category</th><th className={th}>Portal login</th><th className={th}>Campaigns</th><th className={th}>Spend</th><th className={th}>Status</th><th className={th} /></tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className={`${th} font-mono text-xs font-bold`}>{a.avCode}</td>
                    <td className={th}><p className="font-semibold text-ink-900">{a.businessName}</p><p className="text-xs text-ink-500">{titleCase(a.source)}</p></td>
                    <td className={th}>{titleCase((a.businessCategory || "").replace(/_/g, " "))}</td>
                    <td className={`${th} text-xs`}>{a.contactEmail}</td>
                    <td className={th}>{a.campaigns} <span className="text-xs text-ink-500">({a.liveCampaigns} live)</span></td>
                    <td className={th}>{inr(a.totalSpend)}</td>
                    <td className={th}><StatusBadge value={titleCase(a.status)} /></td>
                    <td className={`${th} text-right`}>{admin && <button className="text-xs font-semibold text-red-600 hover:underline" onClick={() => toggle(a)}>{a.status === "active" ? "Suspend" : "Reactivate"}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.bdLeadId ? "Approve advertiser" : "Add advertiser"} description="Confirms the business belongs to the real-estate ecosystem, issues its AV code and creates the Advertiser Portal login.">
        {form && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Business name" value={form.businessName} onChange={set("businessName")} />
              <label className="block"><span className="field-label">Category</span><select id="adv-category" className="field-select" value={form.businessCategory} onChange={set("businessCategory")}>{categories.map((c) => <option key={c} value={c}>{titleCase(c.replace(/_/g, " "))}</option>)}</select></label>
              <TextField label="Contact person" value={form.contactName} onChange={set("contactName")} />
              <TextField label="Mobile" value={form.contactMobile} onChange={set("contactMobile")} />
              <TextField label="Portal login email" type="email" value={form.loginEmail} onChange={set("loginEmail")} />
              <TextField label="Initial password (min 8)" type="text" autoComplete="off" value={form.password} onChange={set("password")} />
              <TextField label="GSTIN (for invoices)" value={form.gstin} onChange={set("gstin")} />
              <TextField label="RERA number (builders)" value={form.reraNumber} onChange={set("reraNumber")} />
            </div>
            <TextareaField label="Billing address" rows={2} value={form.billingAddress} onChange={set("billingAddress")} />
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" disabled={busy || !form.businessName.trim() || !form.loginEmail.trim() || form.password.length < 8} onClick={approve}>Approve and create login</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Overview({ rev, setTab }) {
  const suggestions = useApiQuery("/ads/manage/suggestions");
  if (!rev) return <Spinner />;
  const s = suggestions.data;
  const maxFormat = Math.max(...rev.revenueByFormat.map((f) => f.revenue), 1);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <p className="mb-3 text-sm font-bold text-ink-900">Revenue by format</p>
          {rev.revenueByFormat.length === 0 ? <p className="text-sm text-ink-500">No paid campaigns yet.</p> : rev.revenueByFormat.map((f) => (
            <div key={f.format_key} className="mb-2">
              <div className="flex justify-between text-xs"><span className="text-ink-700">{f.label} ({f.campaigns})</span><span className="font-semibold text-ink-900">{inr(f.revenue)}</span></div>
              <div className="mt-1 h-2 rounded-full bg-surface-muted"><div className="h-2 rounded-full bg-red-500" style={{ width: `${Math.max((f.revenue / maxFormat) * 100, 2)}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="card p-5">
          <p className="mb-3 text-sm font-bold text-ink-900">Top advertisers</p>
          {rev.topAdvertisers.length === 0 ? <p className="text-sm text-ink-500">No paid campaigns yet.</p> : rev.topAdvertisers.map((a) => (
            <div key={a.id} className="flex justify-between border-b border-line py-1.5 text-sm last:border-0"><span className="text-ink-800">{a.business_name} <span className="text-xs text-ink-500">{a.av_code} · {a.campaigns} campaign{a.campaigns === 1 ? "" : "s"}</span></span><span className="font-semibold">{inr(a.spend)}</span></div>
          ))}
        </div>
      </div>
      <div className="card p-5">
        <div className="mb-3 flex items-center"><p className="text-sm font-bold text-ink-900">Upcoming renewals</p><button className="ml-auto text-xs font-semibold text-red-600 hover:underline" onClick={() => setTab("campaigns")}>All campaigns</button></div>
        {rev.upcomingRenewals.length === 0 ? <p className="text-sm text-ink-500">No campaigns are ending in the next few days.</p> : rev.upcomingRenewals.map((r) => (
          <div key={r.id} className="flex justify-between border-b border-line py-1.5 text-sm last:border-0"><span className="text-ink-800">{r.name} <span className="text-xs text-ink-500">{r.business_name} · {r.av_code}</span></span><span className="text-xs font-semibold text-amber-700">ends {r.end_date}</span></div>
        ))}
      </div>
      <div className="card p-5">
        <p className="text-sm font-bold text-ink-900">Suggested advertisers to approach</p>
        <p className="mb-3 text-xs text-ink-500">From platform activity: active builders and broker firms that are not advertising, and cities where buyers ask for loans, insurance or legal help but no such advertiser is running.</p>
        {!s ? <Spinner /> : s.firms.length + s.categories.length === 0 ? <p className="text-sm text-ink-500">No suggestions yet - they appear as listings and enquiries grow.</p> : (
          <div className="grid gap-2 sm:grid-cols-2">
            {s.firms.map((f) => <div key={`${f.userId}${f.city}`} className="rounded-xl border border-line p-3 text-sm"><p className="font-semibold text-ink-900">{f.business}</p><p className="text-xs text-ink-500">{f.type} · {f.reason}</p></div>)}
            {s.categories.map((c, i) => <div key={i} className="rounded-xl border border-line p-3 text-sm"><p className="font-semibold text-ink-900">{c.approach} - {c.city}</p><p className="text-xs text-ink-500">{c.reason}</p></div>)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdvertisingPage() {
  const { role } = useAuth();
  const staff = STAFF.includes(role);
  const admin = ADMIN.includes(role);
  const [params, setParams] = useSearchParams();
  const first = staff ? "overview" : "campaigns";
  const tab = params.get("tab") || first;
  const setTab = (k) => setParams(k === first ? {} : { tab: k }, { replace: true });
  const rateCard = useApiQuery("/ads/rate-card");
  const revenue = useApiQuery(staff ? "/ads/manage/revenue" : null);
  const advertisers = useApiQuery(staff ? "/ads/manage/advertisers" : null);
  const portal = useApiQuery(staff ? null : "/ads/portal");
  const refresh = () => { revenue.reload(); portal.reload(); advertisers.reload(); };
  const r = revenue.data;
  const p = portal.data;
  const tabs = staff
    ? [["overview", "Overview"], ["campaigns", `Campaigns${r?.pendingApprovals ? ` (${r.pendingApprovals})` : ""}`], ["advertisers", `Advertisers${r?.advertiserEnquiries ? ` (${r.advertiserEnquiries})` : ""}`], ["invoices", "Invoices"], ["rates", "Rate card"]]
    : [["campaigns", "My campaigns"], ["invoices", "Invoices"], ["rates", "Rate card"]];

  if (!staff && portal.error) return <div className="space-y-5"><PageHeader title="Advertiser Portal" /><p className="card p-5 text-sm text-red-700">{portal.error}</p></div>;
  return (
    <div className="space-y-5">
      <PageHeader title={staff ? "Advertising" : "Advertiser Portal"} />
      {staff && r && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Revenue this month" value={inr(r.revenueThisMonth)} hint={`GST collected ${inr(r.gstThisMonth)}`} tone="text-emerald-700" />
          <Stat label="Revenue this year" value={inr(r.revenueYtd)} hint="Financial year to date" />
          <Stat label="Live campaigns" value={r.activeCampaigns} />
          <Stat label="To approve" value={r.pendingApprovals} tone={r.pendingApprovals ? "text-red-600" : "text-ink-950"} hint={`${r.advertiserEnquiries} advertiser enquir${r.advertiserEnquiries === 1 ? "y" : "ies"}`} />
          <Stat label="Unpaid invoices" value={inr(r.outstanding)} hint={`${r.awaitingPayment} campaign${r.awaitingPayment === 1 ? "" : "s"}`} />
        </div>
      )}
      {!staff && p && (
        <>
          <p className="text-sm text-ink-600">{p.advertiser.businessName} · advertiser code <b className="font-mono">{p.advertiser.avCode}</b></p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Live campaigns" value={p.totals.live} hint={`${p.totals.campaigns} in all`} />
            <Stat label="Impressions" value={p.totals.impressions.toLocaleString("en-IN")} />
            <Stat label="Clicks" value={p.totals.clicks.toLocaleString("en-IN")} hint={p.totals.impressions ? `${Math.round((p.totals.clicks / p.totals.impressions) * 10000) / 100}% CTR` : undefined} />
            <Stat label="Spent" value={inr(p.totals.spent)} />
            <Stat label="Budget remaining" value={inr(p.totals.remaining)} tone={p.totals.awaitingPayment ? "text-amber-700" : "text-ink-950"} hint={p.totals.awaitingPayment ? `${p.totals.awaitingPayment} awaiting payment` : undefined} />
          </div>
        </>
      )}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-surface-muted p-1 sm:w-fit">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`shrink-0 rounded-md px-4 py-1.5 text-xs font-semibold ${tab === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>
        ))}
      </div>
      {tab === "overview" && staff && <Overview rev={r} setTab={setTab} />}
      {tab === "campaigns" && <Campaigns staff={staff} admin={admin} payOnline={!!p?.paymentOnline} rateCard={rateCard.data} advertisers={advertisers.data?.items} onChanged={refresh} />}
      {tab === "advertisers" && staff && <Advertisers admin={admin} data={advertisers.data} reload={advertisers.reload} onChanged={refresh} />}
      {tab === "invoices" && <Invoices staff={staff} />}
      {tab === "rates" && <RateCard rateCard={rateCard.data} admin={admin} reload={rateCard.reload} />}
    </div>
  );
}
