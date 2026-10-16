import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR } from "../../lib/format";

// Engine 8 / Section 33.2 - scheme coupons. Codes are COU-[CATEGORY]-[CAMPAIGN];
// an admin sets the validity, caps, service and stacking. Coupons are
// deactivated, never deleted, and never create a commission.

const th = "px-4 py-3";
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
const local = (d) => (d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const benefit = (c) => (c.benefitType === "percent" ? `${c.benefitValue}% off${c.maxDiscount ? ` (max ${formatINR(c.maxDiscount)})` : ""}` : c.benefitType === "flat" ? `${formatINR(c.benefitValue)} off` : c.benefitType === "days" ? `${c.benefitValue} days` : "Delivered by staff");
const blank = () => ({ category: "BU", campaign: "", name: "", description: "", service: "professional_fee", benefitType: "percent", benefitValue: "", maxDiscount: "", minAmount: "", validFrom: local(new Date()), validUntil: local(new Date(Date.now() + 30 * 86400000)), perUserLimit: 1, totalLimit: "", stackable: false });
const STATUS = { reserved: "Waiting for invoice", applied: "Applied", pending: "To deliver", fulfilled: "Delivered", reversed: "Taken back" };

function Editor({ form, setForm, meta, onSave, busy }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const svc = meta.services.find((s) => s.key === form.service);
  const field = (label, k, props = {}) => <label className="field-label">{label}<input className="field-input mt-1" value={form[k]} onChange={set(k)} {...props} /></label>;
  const code = `COU-${form.category}-${(form.campaign || "").toUpperCase()}`;
  return (
    <div className="space-y-4">
      {form.id ? (
        <p className="rounded-lg bg-surface-muted px-3 py-2 font-mono text-sm font-bold">{form.code}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="field-label">For
            <select className="field-select mt-1" value={form.category} onChange={set("category")}>{meta.categories.map((c) => <option key={c.key} value={c.key}>{c.key} - {c.label}</option>)}</select>
          </label>
          <label className="field-label">Campaign (3 to 6 letters / digits)<input className="field-input mt-1 uppercase" maxLength={6} value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} placeholder="DIW26" /></label>
          <div className="field-label">Code<p className="mt-2 font-mono text-sm font-bold text-ink-900">{code}</p></div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {field("Scheme name", "name", { placeholder: "Diwali 2026 buyer offer" })}
        <label className="field-label">Applies to
          <select className="field-select mt-1" value={form.service} disabled={!!form.id} onChange={(e) => { const s = meta.services.find((x) => x.key === e.target.value); setForm({ ...form, service: e.target.value, benefitType: s.benefits[0] }); }}>
            {meta.services.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
      </div>
      {field("Description shown to people (optional)", "description")}
      {form.benefitType !== "manual" && (
        <div className="grid gap-3 sm:grid-cols-4">
          {svc.benefits.length > 1 && (
            <label className="field-label">Benefit
              <select className="field-select mt-1" value={form.benefitType} onChange={set("benefitType")}>{svc.benefits.map((b) => <option key={b} value={b}>{b === "percent" ? "Percentage off" : "Amount off"}</option>)}</select>
            </label>
          )}
          {field(form.benefitType === "percent" ? "Percent" : form.benefitType === "flat" ? "Amount (₹)" : "Days of Full CRM", "benefitValue", { type: "number", min: 0 })}
          {form.benefitType === "percent" && field("Largest discount (₹, optional)", "maxDiscount", { type: "number", min: 0 })}
          {field("Smallest bill it applies to (₹, optional)", "minAmount", { type: "number", min: 0 })}
        </div>
      )}
      {form.service === "professional_fee" && <p className="-mt-2 text-xs text-ink-500">Taken off the next professional-fee invoice of the deal it is applied to. The fee never goes below 1% of the transaction value, so at a 1% rate there is nothing to take off.</p>}
      <div className="grid gap-3 sm:grid-cols-4">
        {field("Valid from", "validFrom", { type: "datetime-local" })}
        {field("Valid until", "validUntil", { type: "datetime-local" })}
        {field("Uses per person", "perUserLimit", { type: "number", min: 1 })}
        {field("Total uses (empty = no limit)", "totalLimit", { type: "number", min: 1 })}
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-ink-800"><input type="checkbox" className="h-4 w-4 accent-red-600" checked={form.stackable} onChange={set("stackable")} />Can be combined with other coupons on the same deal or invoice</label>
      <div className="flex justify-end"><button className="btn-primary" disabled={busy || form.name.trim().length < 3 || (!form.id && form.campaign.length < 3)} onClick={onSave}>{form.id ? "Save coupon" : "Create coupon"}</button></div>
    </div>
  );
}

function Uses({ coupon, admin }) {
  const call = useApiCall();
  const toast = useToast();
  const { data, reload } = useApiQuery(`/coupons/manage/redemptions?couponId=${coupon.id}`);
  const act = async (path, body, msg) => {
    try {
      await call(path, { method: "POST", body });
      toast.push(msg, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  if (!data) return <Spinner />;
  if (!data.length) return <p className="py-6 text-center text-sm text-ink-500">Nobody has used this coupon yet.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className="py-2">Person</th><th>As</th><th>When</th><th>Benefit</th><th>Status</th><th /></tr></thead>
      <tbody className="divide-y divide-line">
        {data.map((r) => (
          <tr key={r.id}>
            <td className="py-2" data-no-translate>{r.userName}</td>
            <td>{r.roleAtIssue}</td>
            <td className="text-xs text-ink-500">{formatDate(r.createdAt)}</td>
            <td>{r.discount ? formatINR(r.discount) : r.daysGranted ? `${r.daysGranted} days` : "—"}{r.note && <p className="text-[11px] text-ink-500" data-no-translate>{r.note}</p>}</td>
            <td><StatusBadge value={STATUS[r.status] || r.status} /></td>
            <td className="whitespace-nowrap text-right">
              {r.status === "pending" && <button className="btn-outline btn-sm" onClick={() => { const note = window.prompt("How was it delivered? (shown to the person)"); if (note !== null) act(`/coupons/manage/redemptions/${r.id}/fulfil`, { note }, "Marked delivered."); }}>Delivered</button>}{" "}
              {admin && r.status !== "reversed" && <button className="btn-outline btn-sm" onClick={() => { const reason = window.prompt("Why is this being taken back?"); if (reason) act(`/coupons/manage/redemptions/${r.id}/reverse`, { reason }, "Taken back."); }}>Take back</button>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function CouponsPage() {
  const { role } = useAuth();
  const admin = ["admin", "super_admin"].includes(role);
  const call = useApiCall();
  const toast = useToast();
  const meta = useApiQuery("/coupons/manage/meta");
  const [status, setStatus] = useState("");
  const list = useApiQuery(`/coupons/manage${buildQuery({ status })}`);
  const [form, setForm] = useState(null);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!meta.data) return <Spinner />;
  const save = async () => {
    setBusy(true);
    const body = {
      name: form.name, description: form.description || null, benefitType: form.benefitType, benefitValue: form.benefitValue === "" ? null : Number(form.benefitValue),
      maxDiscount: form.maxDiscount === "" ? null : Number(form.maxDiscount), minAmount: form.minAmount === "" ? null : Number(form.minAmount),
      validFrom: new Date(form.validFrom).toISOString(), validUntil: new Date(form.validUntil).toISOString(), perUserLimit: Number(form.perUserLimit) || 1, totalLimit: form.totalLimit === "" ? null : Number(form.totalLimit), stackable: form.stackable,
    };
    try {
      if (form.id) await call(`/coupons/manage/${form.id}`, { method: "PUT", body });
      else await call("/coupons/manage", { method: "POST", body: { ...body, code: `COU-${form.category}-${form.campaign}`, service: form.service } });
      toast.push(form.id ? "Coupon saved." : "Coupon created.", "success");
      setForm(null);
      list.reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (c) => {
    const reason = c.isActive ? window.prompt("Why is this coupon being switched off?") : null;
    if (c.isActive && !reason) return;
    try {
      await call(`/coupons/manage/${c.id}/${c.isActive ? "deactivate" : "reactivate"}`, { method: "POST", body: reason ? { reason } : {} });
      list.reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Engine 8"
        title="Scheme coupons"
        subtitle="Time-bound COU- coupons for a category of user: a discount on a professional fee or an ad campaign, days of the Full CRM workspace, or a benefit your team delivers. Coupons never create a commission and are never deleted."
        actions={admin && <button className="btn-primary btn-sm" onClick={() => setForm(blank())}>New coupon</button>}
      />
      <div className="flex flex-wrap gap-2">
        {[["", "All"], ["live", "Live"], ["scheduled", "Starting later"], ["expired", "Expired"], ["inactive", "Switched off"]].map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${status === k ? "border-red-600 bg-red-600 text-white" : "border-line bg-white text-ink-700"}`}>{l}</button>
        ))}
      </div>
      {!list.data ? <Spinner /> : !list.data.length ? <div className="card"><EmptyState title="No coupons" subtitle={admin ? "Create the first scheme with New coupon." : undefined} /></div> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <tr><th className={th}>Code</th><th className={th}>Scheme</th><th className={th}>Benefit</th><th className={th}>Valid</th><th className={th}>Used</th><th className={th}>Status</th><th className={th} /></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.data.map((c) => (
                <tr key={c.id}>
                  <td className={`${th} font-mono font-bold text-ink-900`} data-no-translate>{c.code}</td>
                  <td className={th}><p className="font-semibold text-ink-900" data-no-translate>{c.name}</p><p className="text-xs text-ink-500">{c.categoryLabel} · {c.serviceLabel}{c.stackable ? " · combinable" : ""}</p></td>
                  <td className={th}>{benefit(c)}</td>
                  <td className={`${th} text-xs`}>{formatDate(c.validFrom)} – {formatDate(c.validUntil)}</td>
                  <td className={th}>{c.used}{c.totalLimit ? ` / ${c.totalLimit}` : ""}{c.discountGiven ? <p className="text-xs text-ink-500">{formatINR(c.discountGiven)} off</p> : null}</td>
                  <td className={th}><StatusBadge value={{ live: "Live", scheduled: "Starting later", expired: "Expired", inactive: "Switched off" }[c.status]} />{c.deactivatedReason && <p className="mt-0.5 text-[11px] text-ink-500" data-no-translate>{c.deactivatedReason}</p>}</td>
                  <td className={`${th} whitespace-nowrap text-right`}>
                    <button className="btn-outline btn-sm" onClick={() => setOpen(c)}>Uses</button>{" "}
                    {admin && c.status !== "expired" && <button className="btn-outline btn-sm" onClick={() => setForm({ ...c, benefitValue: c.benefitValue ?? "", maxDiscount: c.maxDiscount ?? "", minAmount: c.minAmount ?? "", totalLimit: c.totalLimit ?? "", description: c.description || "", validFrom: local(c.validFrom), validUntil: local(c.validUntil) })}>Edit</button>}{" "}
                    {admin && c.status !== "expired" && <button className="btn-outline btn-sm" onClick={() => toggle(c)}>{c.isActive ? "Switch off" : "Switch on"}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit coupon" : "New coupon"} maxWidth="max-w-3xl">
        {form && <Editor form={form} setForm={setForm} meta={meta.data} onSave={save} busy={busy} />}
      </Modal>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `Uses of ${open.code}` : ""} maxWidth="max-w-3xl">
        {open && <Uses coupon={open} admin={admin} />}
      </Modal>
    </div>
  );
}
