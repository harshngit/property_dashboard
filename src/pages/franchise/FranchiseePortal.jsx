import CommissionShares from "../tax/CommissionShares";
import { useState } from "react";
import { LuPlus } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";
import { LevelPill, ShareTable, TicketThread } from "./FranchisePage";

// Sec. 14.5 Franchisee Partner Dashboard (Franchisee Admin).
// Numbers only: lead counts, conversion, pipeline by stage, commission,
// invoices. No lead, customer or contact is ever shown here (sec. 14.9).

const th = "px-4 py-3";
const money = (v) => formatINR(v, { compact: false });
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
const GRANT = { exclusive: "Exclusive", open: "Open / non-exclusive" };
const STAGE = { inquiry: "Lead", requirement: "Requirement", match: "Match", site_visit: "Site visit", negotiation: "Negotiation", legal_coordination: "Legal coordination", loan_referral: "Loan referral", insurance_referral: "Insurance referral", payment: "Payment", closed_won: "Closed - won", closed_lost: "Closed - lost", on_hold: "On hold" };
const SUSPENSION_TEXT = {
  level_1: "Payment overdue. Broker access is unchanged for now - please clear the invoice.",
  level_2: "No new inquiries or matches for your brokers until the overdue invoice is paid. A late fee applies.",
  level_3: "Service suspended: your brokers are blocked and open inquiries have moved to A R Buildwel representatives. Payment restores access at once.",
};

function useRun(reload) {
  const call = useApiCall();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn, msg, after) => {
    setBusy(true);
    try {
      const out = await fn(call);
      if (msg) toast.push(msg, "success");
      reload?.();
      after?.(out);
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return { run, busy };
}

function Tile({ label, value, hint }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-ink-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

function Overview({ d, goInvoices }) {
  return (
    <div className="space-y-4">
      {d.suspension.status !== "active" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-bold"><LevelPill level={d.suspension.status} /> Outstanding {money(d.suspension.outstandingAmount)}</p>
          <p className="mt-1">{SUSPENSION_TEXT[d.suspension.status]}</p>
          <button className="btn-primary btn-sm mt-3" onClick={goInvoices}>View invoices and pay</button>
        </div>
      )}
      {!d.franchise.brandingCompliant && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Your presentation as A R Buildwel is marked not compliant, so territory-routed inquiries are paused. Contact A R Buildwel support.</div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Leads this month" value={d.leads.thisMonth} hint={`${d.leads.total} in total`} />
        <Tile label="Lead conversion rate" value={`${d.leads.conversionRatePercent}%`} hint={`${d.leads.converted} converted`} />
        <Tile label="Commission earned" value={money(d.revenue.commissionEarned)} hint={`${money(d.revenue.pending)} not yet released`} />
        <Tile label="Deal volume" value={money(d.revenue.dealVolume)} hint={`${d.revenue.deals} closed deals`} />
        <Tile label="Open invoices" value={d.invoices.open} hint={d.invoices.collectionRatePercent != null ? `${d.invoices.collectionRatePercent}% paid` : "None raised yet"} />
        <Tile label="KYC to approve" value={d.kycQueue} />
        <Tile label="Open support tickets" value={d.openTickets} />
        <Tile label="Active brokers" value={d.reach?.brokers ?? "—"} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4 text-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Deal pipeline by stage</p>
          {d.pipeline.length === 0 ? <p className="text-ink-500">No deals yet.</p> : d.pipeline.map((s) => <p key={s.stage} className="flex justify-between border-b border-line py-1 last:border-0"><span>{STAGE[s.stage] || titleCase(s.stage)}</span><span className="font-semibold">{s.n}</span></p>)}
        </div>
        <div className="card p-4 text-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Top brokers by deals closed</p>
          {d.topBrokers.length === 0 ? <p className="text-ink-500">Add brokers to see them here.</p> : d.topBrokers.map((b) => <p key={b.name} className="flex justify-between border-b border-line py-1 last:border-0"><span data-no-translate>{b.name}</span><span className="font-semibold">{b.deals_closed}</span></p>)}
        </div>
        <div className="card p-4 text-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Area demand in your territory</p>
          {d.areaDemand.length === 0 ? <p className="text-ink-500">No buyer requirements in your pincodes yet.</p> : d.areaDemand.map((a) => <p key={a.area} className="flex justify-between border-b border-line py-1 last:border-0"><span data-no-translate>{a.area}</span><span className="font-semibold">{a.requirements}</span></p>)}
        </div>
        <div className="card p-4 text-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Your territory</p>
          {d.territories.length === 0 ? <p className="text-ink-500">No territory granted yet.</p> : d.territories.map((t) => <p key={t.id} className="mb-1"><span className="font-semibold" data-no-translate>{t.name}</span> · {GRANT[t.grantType] || titleCase(t.grantType)}<br /><span className="text-xs text-ink-500" data-no-translate>{t.pincodes.join(", ")}</span></p>)}
          {d.reach?.suggestion && <p className="mt-2 text-xs text-ink-600">{d.reach.suggestion}</p>}
        </div>
      </div>
      <p className="text-xs text-ink-500">These are totals only. Leads and customer contact details stay with A R Buildwel and the assigned representative.</p>
    </div>
  );
}

function Commission() {
  const { data, loading } = useApiQuery("/franchisee/commissions");
  const rows = data || [];
  const label = { calculated: "Waiting for client payment", releasable: "Ready to release", released: "Released" };
  if (loading && !data) return <Spinner />;
  if (!rows.length) return <EmptyState title="No commission yet" subtitle="A calculation appears here when a deal in your territory is closed." />;
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-600">Both sides' professional fee is clubbed into one pool, then split by role. Your share is released once A R Buildwel has collected the client invoices. Raise your GST invoice to A R Buildwel for your share.</p>
      {rows.map((c) => (
        <div key={c.id} className="card p-4 text-sm">
          <p className="font-semibold text-ink-900">Pool {money(c.pool)} · your share {money(c.franchiseeBase)} <StatusBadge value={label[c.status]} /></p>
          <p className="text-xs text-ink-500">Deal value {money(c.dealValue)} · {formatDate(c.createdAt)}{c.payoutReference ? <> · paid, reference <span data-no-translate>{c.payoutReference}</span></> : null}</p>
          <ShareTable shares={c.shares} />
        </div>
      ))}
    </div>
  );
}

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load the payment window"));
    document.body.appendChild(s);
    return undefined;
  });

function Invoices({ onChanged }) {
  const { data, loading, reload } = useApiQuery("/franchisee/invoices");
  const status = useApiQuery("/franchisee/payment-status");
  const { run, busy } = useRun(() => { reload(); status.reload(); onChanged(); });
  const [claim, setClaim] = useState(null);
  const [ref, setRef] = useState("");
  const rows = data?.invoices || [];
  const payOnline = (inv) => run(async (call) => {
    const order = (await call("/franchisee/pay-invoice", { method: "POST", body: { invoice_id: inv.id, payment_method: "razorpay" } })).data;
    await loadRazorpay();
    await new Promise((resolve, reject) => {
      new window.Razorpay({
        key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency, name: "A R Buildwel", description: `Invoice ${order.invoiceNumber}`,
        handler: (r) => call(`/franchisee/invoices/${inv.id}/razorpay/verify`, { method: "POST", body: { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature } }).then(resolve, reject),
        modal: { ondismiss: () => reject(new Error("Payment was not completed")) },
      }).open();
    });
  }, "Payment received - service resumed.");
  if (loading && !data) return <Spinner />;
  return (
    <div className="space-y-3">
      {status.data && (
        <div className="card flex flex-wrap items-center gap-3 p-4 text-sm">
          <LevelPill level={status.data.status} />
          <span>Outstanding <span className="font-semibold">{money(status.data.outstandingAmount)}</span></span>
          {status.data.daysOverdue > 0 && <span className="text-red-600">{status.data.daysOverdue} days overdue</span>}
        </div>
      )}
      {rows.length === 0 ? <EmptyState title="No invoices" subtitle="Invoices raised to you by A R Buildwel appear here." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Invoice</th><th className={th}>Amount</th><th className={th}>Due</th><th className={th}>Status</th><th className={th} /></tr></thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="border-b border-line last:border-0">
                  <td className={th}><span className="font-semibold" data-no-translate>{i.invoiceNumber}</span><br /><span className="text-xs text-ink-500">{titleCase(i.kind)}{i.description ? ` · ${i.description}` : ""} · {formatDate(i.invoiceDate)}</span></td>
                  <td className={th}>{money(i.amount)}{i.lateFee > 0 && <><br /><span className="text-xs text-red-600">+ {money(i.lateFee)} late fee</span></>}</td>
                  <td className={th}>{formatDate(i.dueDate)}{i.daysOverdue > 0 && <><br /><span className="text-xs text-red-600">{i.daysOverdue} days overdue</span></>}</td>
                  <td className={th}><StatusBadge value={titleCase(i.status)} />{i.paymentClaimedAt && i.status !== "paid" && <><br /><span className="text-xs text-amber-700">Payment reported - waiting for confirmation</span></>}</td>
                  <td className={th}>
                    {["pending", "overdue"].includes(i.status) && (
                      <div className="flex justify-end gap-1.5">
                        {status.data?.paymentOnline && <button className="btn-primary btn-sm" disabled={busy} onClick={() => payOnline(i)}>Pay online</button>}
                        <button className="btn-outline btn-sm" onClick={() => { setRef(""); setClaim(i); }}>I paid by bank transfer</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!claim} onClose={() => setClaim(null)} title="Report a bank transfer" description="A R Buildwel confirms the payment against this reference; access is restored as soon as it is confirmed.">
        <TextField label="Payment reference (UTR)" value={ref} onChange={(e) => setRef(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-outline" onClick={() => setClaim(null)}>Cancel</button>
          <button className="btn-primary" disabled={busy || ref.trim().length < 3} onClick={() => run((call) => call("/franchisee/pay-invoice", { method: "POST", body: { invoice_id: claim.id, payment_method: "bank_transfer", reference: ref.trim() } }), "Payment reported.", () => setClaim(null))}>Report payment</button>
        </div>
      </Modal>
    </div>
  );
}

function Brokers() {
  const { data, loading, reload } = useApiQuery("/franchisee/brokers");
  const { run, busy } = useRun(reload);
  const [form, setForm] = useState(null);
  const rows = data || [];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-600">Performance summaries only - a broker's leads and their contacts are not visible here.</p>
        <button className="btn-primary shrink-0" onClick={() => setForm({ fullName: "", email: "", mobile: "", password: "" })}><LuPlus className="h-4 w-4" /> Add broker</button>
      </div>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="No brokers yet" subtitle="Add your brokers - territory inquiries go to the least busy one first." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Broker</th><th className={th}>Leads handled</th><th className={th}>Response in time</th><th className={th}>Deals closed</th><th className={th}>Live listings</th><th className={th}>Trust</th><th className={th}>Activity score</th><th className={th} /></tr></thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-0">
                  <td className={th}><span className="font-semibold" data-no-translate>{b.name}</span> <StatusBadge value={titleCase(b.status)} /><br /><span className="text-xs text-ink-500" data-no-translate>{b.email}</span></td>
                  <td className={th}>{b.leadsHandled}</td>
                  <td className={th}>{b.slaCompliancePercent != null ? `${b.slaCompliancePercent}%` : "—"}</td>
                  <td className={th}>{b.dealsClosed}</td>
                  <td className={th}>{b.liveListings}</td>
                  <td className={th}>{b.trustScore ?? "—"}</td>
                  <td className={th}><span className="font-semibold">{b.activityScore}</span></td>
                  <td className={th}><button className="btn-outline btn-sm" disabled={busy} onClick={() => run((call) => call(`/franchisee/brokers/${b.id}/status`, { method: "PUT", body: { status: b.status === "active" ? "inactive" : "active" } }), "Broker updated.")}>{b.status === "active" ? "Deactivate" : "Activate"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title="Add broker" description="The broker signs in to the CRM with this email and password.">
        {form && (
          <div className="space-y-3">
            <TextField label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Mobile (optional)" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            <TextField label="Initial password (min 8)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy || form.fullName.trim().length < 2 || !form.email || form.password.length < 8} onClick={() => run((call) => call("/franchisee/brokers", { method: "POST", body: { ...form, mobile: form.mobile || null } }), "Broker added.", () => setForm(null))}>Add broker</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const KIND = { kyc: "KYC (ID document)", rera: "RERA registration", gst: "GSTIN", company: "Company registration", institutional_cert: "Institutional broker certification" };

function Kyc({ onChanged }) {
  const { data, loading, reload } = useApiQuery("/franchisee/kyc");
  const { run, busy } = useRun(() => { reload(); onChanged(); });
  const rows = data || [];
  if (loading && !data) return <Spinner />;
  if (!rows.length) return <EmptyState title="Nothing to approve" subtitle="Verifications submitted by your brokers appear here." />;
  return (
    <div className="space-y-2">
      {rows.map((v) => (
        <div key={v.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span><span className="font-semibold" data-no-translate>{v.brokerName}</span> · {KIND[v.kind] || v.kind}<br /><span className="text-xs text-ink-500">Reference ending <span data-no-translate>{v.referenceLast4 || "—"}</span> · submitted {formatDate(v.submittedAt)}</span></span>
          <span className="flex gap-1.5">
            <button className="btn-primary btn-sm" disabled={busy} onClick={() => run((call) => call(`/franchisee/kyc/${v.id}`, { method: "PUT", body: { action: "verify" } }), "Verified.")}>Verify</button>
            <button className="btn-outline btn-sm" disabled={busy} onClick={() => { const notes = window.prompt("Reason for rejecting (the broker sees this)"); if (notes) run((call) => call(`/franchisee/kyc/${v.id}`, { method: "PUT", body: { action: "reject", notes } }), "Rejected."); }}>Reject</button>
          </span>
        </div>
      ))}
    </div>
  );
}

function Branding() {
  const { data: b, loading, reload } = useApiQuery("/franchisee/branding");
  const { run, busy } = useRun(reload);
  const [edit, setEdit] = useState(null);
  if (loading && !b) return <Spinner />;
  if (!b) return null;
  const merged = { brandName: "", logoUrl: "", faviconUrl: "", primaryColor: "", secondaryColor: "", fontFamily: "", headerText: "", footerText: "", emailFromName: "" };
  Object.keys(merged).forEach((k) => { merged[k] = (b.draft && b.draft[k] !== undefined ? b.draft[k] : b[k]) || ""; });
  const f = edit || merged;
  const set = (k) => (e) => setEdit({ ...f, [k]: e.target.value });
  const hasDraft = b.draft && Object.keys(b.draft).length > 0;
  const body = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === "" ? null : v]));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card space-y-3 p-4">
        <p className="text-sm text-ink-600">{b.brandMode === "white_label" ? "White label: your brand is shown on your site." : "Your site presents as A R Buildwel; your firm name appears small. Colours and logo apply once A R Buildwel switches on white label."}</p>
        <TextField label="Brand name" value={f.brandName} onChange={set("brandName")} />
        <TextField label="Logo link (https)" value={f.logoUrl} onChange={set("logoUrl")} />
        <TextField label="Favicon link (https)" value={f.faviconUrl} onChange={set("faviconUrl")} />
        <div className="grid grid-cols-2 gap-3">
          <div><label className="field-label">Primary colour</label><div className="flex gap-2"><input type="color" className="h-10 w-12 rounded border border-line" value={f.primaryColor || "#E51C23"} onChange={set("primaryColor")} /><input className="field-input" placeholder="#E51C23" value={f.primaryColor} onChange={set("primaryColor")} /></div></div>
          <div><label className="field-label">Secondary colour</label><div className="flex gap-2"><input type="color" className="h-10 w-12 rounded border border-line" value={f.secondaryColor || "#111827"} onChange={set("secondaryColor")} /><input className="field-input" placeholder="#111827" value={f.secondaryColor} onChange={set("secondaryColor")} /></div></div>
        </div>
        <div>
          <label className="field-label">Font</label>
          <select className="field-select" value={f.fontFamily} onChange={set("fontFamily")}><option value="">Platform default</option>{(b.fonts || []).map((x) => <option key={x} value={x}>{x}</option>)}</select>
        </div>
        <TextField label="Header text" value={f.headerText} onChange={set("headerText")} />
        <TextareaField label="Footer text" rows={2} value={f.footerText} onChange={set("footerText")} />
        <TextField label="Email sender name" value={f.emailFromName} onChange={set("emailFromName")} />
        <div className="flex flex-wrap justify-end gap-2">
          <button className="btn-outline" disabled={busy} onClick={() => run((call) => call("/franchisee/branding", { method: "PUT", body }), "Draft saved - check the preview, then publish.", () => setEdit(null))}>Save draft</button>
          <button className="btn-primary" disabled={busy || !hasDraft} onClick={() => run((call) => call("/franchisee/branding/publish", { method: "POST" }), "Branding published.")}>Publish</button>
        </div>
      </div>
      <div className="space-y-3">
        <div className="card overflow-hidden p-0" data-no-translate>
          <p className="border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink-500">Preview{hasDraft ? " (unpublished draft)" : ""}</p>
          <div style={{ fontFamily: f.fontFamily || undefined }}>
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: f.secondaryColor || "#111827", color: "#fff" }}>
              {f.logoUrl ? <img src={f.logoUrl} alt="" className="h-8 max-w-[120px] object-contain" /> : <span className="text-lg font-extrabold">{f.brandName || "Your brand"}</span>}
              <span className="text-xs opacity-80">{f.headerText}</span>
            </div>
            <div className="space-y-3 p-4">
              <p className="text-lg font-extrabold text-ink-900">Verified homes in your city</p>
              <button type="button" className="rounded-full px-4 py-2 text-sm font-bold text-white" style={{ background: f.primaryColor || "#E51C23" }}>Enquire now</button>
            </div>
            <p className="border-t border-line px-4 py-3 text-xs text-ink-500">{f.footerText || "Footer text"}</p>
          </div>
        </div>
        <div className="card p-4 text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Your web address</p>
          <p className="mt-1" data-no-translate>{b.host || "Not mapped yet"}</p>
          <p className="mt-1 text-xs text-ink-500">{b.host ? (b.domainActive ? "Live." : "Mapped, not switched on yet.") : "A R Buildwel creates and holds the address for you."} Domains and DNS are managed by A R Buildwel only.</p>
        </div>
      </div>
    </div>
  );
}

function Support({ onChanged }) {
  const { data, loading, reload } = useApiQuery("/franchisee/tickets");
  const { run, busy } = useRun(() => { reload(); onChanged(); });
  const [form, setForm] = useState(null);
  const [open, setOpen] = useState(null);
  const rows = data || [];
  return (
    <div className="space-y-2">
      <div className="flex justify-end"><button className="btn-primary" onClick={() => setForm({ subject: "", category: "general", body: "" })}><LuPlus className="h-4 w-4" /> New ticket</button></div>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="No tickets yet" subtitle="Raise a ticket and A R Buildwel support replies here." /> : rows.map((t) => (
        <button key={t.id} type="button" className="card flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left text-sm hover:bg-surface-muted" onClick={() => setOpen(t.id)}>
          <span><span className="font-semibold text-ink-900" data-no-translate>{t.ticketNumber} · {t.subject}</span><br /><span className="text-xs text-ink-500">{titleCase(t.category)} · updated {formatDate(t.updatedAt, true)}</span></span>
          <StatusBadge value={titleCase(t.status)} />
        </button>
      ))}
      <Modal open={!!form} onClose={() => setForm(null)} title="New support ticket">
        {form && (
          <div className="space-y-3">
            <TextField label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            <div>
              <label className="field-label">Category</label>
              <select className="field-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="general">General</option><option value="billing">Billing</option><option value="territory">Territory</option><option value="branding">Branding</option><option value="brokers">Brokers</option><option value="technical">Technical</option>
              </select>
            </div>
            <TextareaField label="Describe the issue" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy || form.subject.trim().length < 3 || form.body.trim().length < 5} onClick={() => run((call) => call("/franchisee/tickets", { method: "POST", body: form }), "Ticket raised.", () => setForm(null))}>Raise ticket</button>
            </div>
          </div>
        )}
      </Modal>
      {open && <TicketThread base="/franchisee/tickets" id={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}

// How the franchise's branded emails look (white-label branding, once published).
function EmailPreview() {
  const { data } = useApiQuery("/franchisee/email-preview");
  if (!data) return null;
  return (
    <div className="card mt-4 space-y-2 p-5">
      <p className="text-sm font-bold text-ink-900">Branded email</p>
      <p className="text-xs text-ink-500">{data.brand.franchise ? `Emails to your brokers go out as ${data.brand.fromName}${data.brand.fromAddress ? ` <${data.brand.fromAddress}>` : ""}.` : "Emails carry the PropertySerch brand until white-label branding is published."}</p>
      <iframe title="Email preview" srcDoc={data.html} className="h-[420px] w-full rounded-lg border border-line bg-white" sandbox="" />
    </div>
  );
}

export default function FranchiseePortal() {
  const { data: d, loading, error, reload } = useApiQuery("/franchisee/dashboard");
  const [tab, setTab] = useState("overview");
  const tabs = [["overview", "Overview"], ["commission", "Commission"], ["shares", "GST invoices and payouts"], ["invoices", "Invoices"], ["brokers", "Brokers"], ["kyc", "KYC approvals"], ["branding", "Branding"], ["support", "Support"]];
  return (
    <div>
      <PageHeader eyebrow={d ? `${d.franchise.orgCode} · ${d.franchise.orgSerial}` : "Franchise"} title="Franchise dashboard" subtitle="Your broker network, commission, invoices, branding and support." />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === key ? "bg-ink-900 text-white" : "bg-surface-muted text-ink-700 hover:bg-line"}`}>{label}</button>
        ))}
      </div>
      {tab === "overview" && (loading && !d ? <Spinner /> : error ? <div className="card p-6 text-sm text-red-600">{error}</div> : d && <Overview d={d} goInvoices={() => setTab("invoices")} />)}
      {tab === "commission" && <Commission />}
      {tab === "shares" && <CommissionShares base="/franchisee/shares" />}
      {tab === "invoices" && <Invoices onChanged={reload} />}
      {tab === "brokers" && <Brokers />}
      {tab === "kyc" && <Kyc onChanged={reload} />}
      {tab === "branding" && <><Branding /><EmailPreview /></>}
      {tab === "support" && <Support onChanged={reload} />}
    </div>
  );
}
