import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LuMessagesSquare } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { SelectField, TextField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate } from "../../lib/format";

// Engine 1: property posts typed into WhatsApp / Telegram, parsed into listing
// fields. Nothing is published until staff check the details and approve;
// institutional sales are approved into the institutional desk. Plus the log
// of every message read (intent, rules or AI, where it went).

const INTENT = { sell: "Sale", rent_out: "Rent out", institutional_sale: "Institutional sale", buy: "Buy", rent: "Rent", institutional_buy: "Institutional buy", other: "Unclear", greeting: "Greeting" };
const CHANNEL = { whatsapp: "WhatsApp", telegram: "Telegram" };
const STATUS_TONE = { pending_review: "bg-amber-50 text-amber-700", approved: "bg-emerald-50 text-emerald-700", rejected: "bg-slate-100 text-slate-600" };
const STATUS_LABEL = { pending_review: "To review", approved: "Approved", rejected: "Rejected" };
const ROUTED = { listing: "Listing", requirement: "Requirement lead", photo: "Photo added", needs_phone: "Waiting for number", ignored: "Left to the bot" };
const TYPES = [
  { value: "apartment", label: "Apartment" }, { value: "villa", label: "Villa" }, { value: "independent_house", label: "Independent house" },
  { value: "plot", label: "Plot" }, { value: "commercial", label: "Commercial" }, { value: "farmhouse", label: "Farmhouse" },
];
const ASSET_CLASSES = [
  { value: "k12_school", label: "K-12 School" }, { value: "international_school", label: "International School" }, { value: "college", label: "Private College" },
  { value: "university", label: "University" }, { value: "coaching_center", label: "Coaching campus" }, { value: "vocational_institute", label: "Vocational institute" },
  { value: "hospital", label: "Hospital & Healthcare" }, { value: "hotel", label: "Hotel & Hospitality" }, { value: "corporate_campus", label: "Corporate campus" },
  { value: "senior_living", label: "Senior living" }, { value: "entertainment", label: "Entertainment & Media" },
];
const th = "px-4 py-3";

export default function ChatIntakePage() {
  const [tab, setTab] = useState("queue");
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Leads" title="Chat listings" subtitle="Properties and requirements people type into the WhatsApp and Telegram bots. Check each listing and approve it before it goes live." />
      <div className="flex gap-2">
        {[["queue", "Listings to review"], ["log", "Messages read"]].map(([k, l]) => (
          <button key={k} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === k ? "bg-ink-900 text-white" : "bg-surface-muted text-ink-700"}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === "queue" ? <Queue /> : <MessageLog />}
    </div>
  );
}

function Queue() {
  const [status, setStatus] = useState("pending_review");
  const [intent, setIntent] = useState("");
  const [openId, setOpenId] = useState(null);
  const { data, loading, error, reload } = useApiQuery(`/chat-intake/submissions${buildQuery({ status, intent: intent || undefined })}`);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <SelectField className="w-44" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "pending_review", label: `To review${data?.counts?.pending_review ? ` (${data.counts.pending_review})` : ""}` }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }, { value: "all", label: "All" }]} />
        <SelectField className="w-52" label="Type" value={intent} onChange={(e) => setIntent(e.target.value)} options={[{ value: "", label: "All types" }, { value: "sell", label: "Sale" }, { value: "rent_out", label: "Rent out" }, { value: "institutional_sale", label: "Institutional sale" }]} />
      </div>
      {error && <div className="card p-4 text-sm text-coral-700">{error}</div>}
      {loading && !data ? (
        <div className="flex justify-center py-12"><InlineSpinner className="h-6 w-6" /></div>
      ) : !data?.items?.length ? (
        <div className="card"><EmptyState icon={LuMessagesSquare} title="Nothing here" description="Listings posted on WhatsApp or Telegram show up here for review." /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <tr><th className={th}>Reference</th><th className={th}>Listing</th><th className={th}>From</th><th className={th}>Photos</th><th className={th}>Duplicates</th><th className={th}>Status</th><th className={th} /></tr>
            </thead>
            <tbody>
              {data.items.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0">
                  <td className={th}><span className="font-mono text-xs font-semibold text-ink-900">{s.reference}</span><span className="block text-[11px] text-ink-500">{formatDate(s.createdAt, true)}</span></td>
                  <td className={th}>
                    <span className="block font-semibold text-ink-900">{s.parsed.title}</span>
                    <span className="text-xs text-ink-500">{INTENT[s.intent]}{s.parsed.price ? ` · Rs ${s.parsed.price}` : " · no price yet"} · read by {s.parsedBy === "ai" ? "AI" : "rules"}</span>
                  </td>
                  <td className={th}><span className="block text-ink-800">{s.contactName || "—"}</span><span className="text-xs text-ink-500">{CHANNEL[s.channel]}{s.contactPhone ? ` · ${s.contactPhone}` : " · number not shared"}</span></td>
                  <td className={th}>{s.photoCount}{s.photosRejected ? <span className="block text-[11px] text-coral-600">{s.photosRejected} dropped</span> : null}</td>
                  <td className={th}>{s.duplicates.length ? <span className="rounded-full bg-coral-50 px-2 py-0.5 text-xs font-bold text-coral-700">{s.duplicates.length} possible</span> : <span className="text-xs text-ink-500">None</span>}</td>
                  <td className={th}><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_TONE[s.status]}`}>{STATUS_LABEL[s.status]}</span></td>
                  <td className={`${th} text-right`}><button className="text-sm font-semibold text-red-600 hover:underline" onClick={() => setOpenId(s.id)}>{s.status === "pending_review" ? "Review" : "View"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!openId} onClose={() => setOpenId(null)} title="Chat listing" maxWidth="max-w-4xl">
        {openId && <Review key={openId} id={openId} onDone={() => { setOpenId(null); reload(); }} />}
      </Modal>
    </div>
  );
}

function Review({ id, onDone }) {
  const call = useApiCall();
  const toast = useToast();
  const { data: s, error } = useApiQuery(`/chat-intake/submissions/${id}`);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (s) setForm({ ...s.parsed, price: s.parsed.price || "", intent: s.intent });
  }, [s]);
  if (error) return <p className="text-sm text-coral-700">{error}</p>;
  if (!s || !form) return <div className="flex justify-center py-10"><InlineSpinner className="h-6 w-6" /></div>;
  const open = s.status === "pending_review";
  const institutional = form.intent === "institutional_sale";
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const num = (v) => (v === "" || v == null ? null : Number(v));
  const payload = () => {
    const base = { intent: form.intent, title: form.title, propertyType: form.propertyType || null, transactionType: form.intent === "rent_out" ? "rent" : "sell", price: form.price || null, city: form.city || null, locality: form.locality || null, areaSqft: num(form.areaSqft), bedrooms: num(form.bedrooms), bathrooms: num(form.bathrooms), furnishing: form.furnishing || null, description: form.description || null };
    if (!institutional) return base;
    return { ...base, institutionName: form.institutionName || null, assetClass: form.assetClass || null, askingPriceCr: num(form.askingPriceCr), latitude: num(form.latitude), longitude: num(form.longitude) };
  };
  const act = async (kind) => {
    setBusy(kind);
    try {
      if (kind === "save") {
        await call(`/chat-intake/submissions/${id}`, { method: "PUT", body: payload() });
        toast.push("Saved.", "success");
      } else if (kind === "approve") {
        const r = await call(`/chat-intake/submissions/${id}/approve`, { method: "POST", body: payload() });
        toast.push(institutional ? "Sent to the institutional desk." : r.data.propertyStatus === "approved" ? "Approved - the listing is live." : "Approved - the listing is in the duplicate / fraud check.", "success");
        onDone();
      } else {
        await call(`/chat-intake/submissions/${id}/reject`, { method: "POST", body: { reason } });
        toast.push("Rejected.", "success");
        onDone();
      }
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1 text-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs text-ink-500">{s.reference} · {CHANNEL[s.channel]} · {formatDate(s.createdAt, true)} · read by {s.parsedBy === "ai" ? "AI" : "rules"} ({s.confidence}% sure)</p>
          <div className="rounded-lg bg-surface-muted p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Message</p>
            <p className="mt-1 whitespace-pre-wrap text-ink-800">{s.rawText}</p>
            <p className="mt-2 text-xs text-ink-600">From {s.contactName || "unknown"}{s.contactPhone ? ` · ${s.contactPhone}` : " · number not shared yet"}</p>
          </div>
          {s.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {s.photos.map((p, i) => (p.url ? <img key={i} src={p.url} alt="" className="h-24 w-full rounded-lg object-cover" /> : <div key={i} className="flex h-24 items-center justify-center rounded-lg bg-surface-muted text-[11px] text-ink-500">Photo {i + 1}</div>))}
            </div>
          )}
          {s.photosRejected > 0 && <p className="text-xs text-coral-600">{s.photosRejected} photo(s) dropped because they showed contact details.</p>}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Possible duplicates</p>
            {s.duplicates.length ? (
              <ul className="mt-1 space-y-1">
                {s.duplicates.map((d) => (
                  <li key={d.propertyId} className="rounded-lg border border-coral-200 px-3 py-2">
                    <Link to={`/app/properties/${d.propertyId}`} className="font-semibold text-ink-900 hover:underline">{d.title}</Link>
                    <span className="block text-xs text-ink-600">{d.reason}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-1 text-xs text-ink-500">None found. The full duplicate and fraud check runs again on approval.</p>}
          </div>
        </div>
        <div className="space-y-3">
          <SelectField label="Type of post" value={form.intent} disabled={!open} onChange={set("intent")} options={[{ value: "sell", label: "Sale" }, { value: "rent_out", label: "Rent out" }, { value: "institutional_sale", label: "Institutional sale" }]} />
          {institutional ? (
            <>
              <TextField label="Institution name" value={form.institutionName || ""} disabled={!open} onChange={set("institutionName")} />
              <SelectField label="Type of institution" value={form.assetClass || ""} disabled={!open} onChange={set("assetClass")} options={ASSET_CLASSES} placeholder="Choose" />
              <div className="grid grid-cols-3 gap-2">
                <TextField label="Asking price (Cr)" type="number" value={form.askingPriceCr ?? (form.priceValue ? +(form.priceValue / 1e7).toFixed(2) : "")} disabled={!open} onChange={set("askingPriceCr")} />
                <TextField label="Latitude" type="number" value={form.latitude ?? ""} disabled={!open} onChange={set("latitude")} />
                <TextField label="Longitude" type="number" value={form.longitude ?? ""} disabled={!open} onChange={set("longitude")} />
              </div>
            </>
          ) : (
            <>
              <TextField label="Title" value={form.title || ""} disabled={!open} onChange={set("title")} />
              <div className="grid grid-cols-2 gap-2">
                <SelectField label="Property type" value={form.propertyType || ""} disabled={!open} onChange={set("propertyType")} options={TYPES} placeholder="Choose" />
                <TextField label={form.intent === "rent_out" ? "Rent a month" : "Price"} placeholder={form.intent === "rent_out" ? "e.g. 25000" : "e.g. 1.2 Cr"} value={form.price || ""} disabled={!open} onChange={set("price")} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <TextField label="BHK" type="number" value={form.bedrooms ?? ""} disabled={!open} onChange={set("bedrooms")} />
                <TextField label="Bathrooms" type="number" value={form.bathrooms ?? ""} disabled={!open} onChange={set("bathrooms")} />
                <TextField label="Area (sq ft)" type="number" value={form.areaSqft ?? ""} disabled={!open} onChange={set("areaSqft")} />
              </div>
              <SelectField label="Furnishing" value={form.furnishing || ""} disabled={!open} onChange={set("furnishing")} options={[{ value: "", label: "Not stated" }, { value: "furnished", label: "Furnished" }, { value: "semi-furnished", label: "Semi-furnished" }, { value: "unfurnished", label: "Unfurnished" }]} />
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <TextField label="City" value={form.city || ""} disabled={!open} onChange={set("city")} />
            <TextField label="Locality / sector" value={form.locality || ""} disabled={!open} onChange={set("locality")} />
          </div>
          {!institutional && <TextareaField label="Description (contact details removed)" rows={4} value={form.description || ""} disabled={!open} onChange={set("description")} />}
        </div>
      </div>
      {open ? (
        rejecting ? (
          <div className="space-y-2 rounded-lg border border-line p-3">
            <TextField label="Reason (sent to the poster)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Photos do not match the description" />
            <div className="flex gap-2">
              <button className="btn-primary" disabled={reason.trim().length < 3 || !!busy} onClick={() => act("reject")}>{busy === "reject" ? "Rejecting…" : "Reject listing"}</button>
              <button className="btn-secondary" onClick={() => setRejecting(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            <button className="btn-primary" disabled={!!busy} onClick={() => act("approve")}>{busy === "approve" ? "Approving…" : institutional ? "Approve to institutional desk" : "Approve listing"}</button>
            <button className="btn-secondary" disabled={!!busy} onClick={() => act("save")}>{busy === "save" ? "Saving…" : "Save changes"}</button>
            <button className="btn-secondary text-coral-700" disabled={!!busy} onClick={() => setRejecting(true)}>Reject</button>
          </div>
        )
      ) : (
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-600">
          {STATUS_LABEL[s.status]} {s.reviewedAt ? formatDate(s.reviewedAt, true) : ""}{s.reviewNote ? ` - ${s.reviewNote}` : ""}
          {s.propertyId && <> · <Link to={`/app/properties/${s.propertyId}`} className="font-semibold underline">Open listing</Link></>}
        </p>
      )}
    </div>
  );
}

function MessageLog() {
  const [days, setDays] = useState("7");
  const { data, loading, error } = useApiQuery(`/chat-intake/log${buildQuery({ days })}`);
  if (error) return <div className="card p-4 text-sm text-coral-700">{error}</div>;
  if (loading && !data) return <div className="flex justify-center py-12"><InlineSpinner className="h-6 w-6" /></div>;
  const total = data.stats.reduce((n, s) => n + s.n, 0);
  const byAi = data.stats.filter((s) => s.method === "ai").reduce((n, s) => n + s.n, 0);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <SelectField className="w-40" label="Period" value={days} onChange={(e) => setDays(e.target.value)} options={[{ value: "1", label: "Today" }, { value: "7", label: "7 days" }, { value: "30", label: "30 days" }]} />
        <p className="pb-2 text-xs text-ink-600">{total} message(s) read · {byAi} needed AI (the rest were clear enough for the rules)</p>
      </div>
      {!data.items.length ? (
        <div className="card"><EmptyState icon={LuMessagesSquare} title="No messages in this period" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <tr><th className={th}>When</th><th className={th}>Message</th><th className={th}>Intent</th><th className={th}>Read by</th><th className={th}>Went to</th></tr>
            </thead>
            <tbody>
              {data.items.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0 align-top">
                  <td className={`${th} whitespace-nowrap text-xs text-ink-600`}>{formatDate(m.createdAt, true)}<span className="block">{CHANNEL[m.channel]} · {m.contact || "—"}</span></td>
                  <td className={`${th} max-w-md text-ink-800`}>{m.text || <span className="text-ink-500">{m.photoCount} photo(s)</span>}</td>
                  <td className={th}>{INTENT[m.intent] || m.intent}</td>
                  <td className={`${th} text-xs`}>{m.method === "ai" ? "AI" : m.method === "rules" ? "Rules" : "—"}{m.confidence ? ` · ${m.confidence}%` : ""}</td>
                  <td className={`${th} text-xs`}>{ROUTED[m.routedTo] || m.routedTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
