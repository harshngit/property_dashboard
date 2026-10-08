import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";

// Module 45 - Property Exchange desk (A R staff).
//   An owner raises a request on the website. Here the representative
//   reviews the indicative valuation, sees every option the owner was
//   shown, confirms the one they chose (which opens the linked deals), and
//   closes both legs together once each has met its own closing checks.

const th = "px-4 py-3";
const money = (v) => (v === null || v === undefined ? "—" : formatINR(v, { compact: false }));
const STATUS_LABEL = { open: "Open", option_chosen: "Option chosen", in_progress: "Deals in progress", closed: "Closed", cancelled: "Cancelled" };
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;

function Detail({ id, onChanged }) {
  const call = useApiCall();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: d, loading, reload } = useApiQuery(`/exchange/requests/${id}`);
  const [value, setValue] = useState(null);
  const [decline, setDecline] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  if (loading && !d) return <Spinner />;
  if (!d) return null;
  const run = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      toast.push(msg, "success");
      setValue(null);
      setDecline(null);
      reload();
      onChanged();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const waiting = d.interests.filter((i) => i.status === "interested");
  const titleOf = (i) => d.options.flatMap((o) => o.items).find((x) => x.propertyId === i.targetPropertyId)?.title || (i.targetPropertyId ? "Listing" : d.oldProperty.title);
  return (
    <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-500" data-no-translate>{d.requestNumber} · {d.owner?.name}</p>
          <p className="font-display text-lg font-extrabold text-ink-950" data-no-translate>{d.oldProperty.title}</p>
          <p className="text-xs text-ink-600" data-no-translate>{[d.oldProperty.locality, d.oldProperty.city].filter(Boolean).join(", ")} · {d.oldProperty.propertyType}{d.oldProperty.bedrooms ? ` · ${d.oldProperty.bedrooms} BHK` : ""}</p>
        </div>
        <StatusBadge value={STATUS_LABEL[d.status]} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Indicative value</p><p className="mt-1 font-display text-xl font-extrabold">{money(d.oldPropertyValuation)}</p><p className="text-[11px] text-ink-500">{titleCase(d.valuationSource || "not valued")} · asking {money(d.oldProperty.askingPrice)}</p>{["open", "option_chosen", "in_progress"].includes(d.status) && <button className="mt-1 text-xs font-semibold text-red-600 hover:underline" onClick={() => setValue({ value: d.oldPropertyValuation || "", note: "" })}>Set valuation</button>}</div>
        <div className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Wants</p><p className="mt-1 text-sm font-semibold text-ink-900">{d.reinvestmentIntentLabel}</p><p className="text-xs text-ink-600" data-no-translate>{[d.wanted.propertyType, d.wanted.bedroomsMin ? `${d.wanted.bedroomsMin}+ BHK` : null, d.wanted.city, ...(d.wanted.localities || [])].filter(Boolean).join(" · ") || "Open to suggestions"}{d.wanted.budgetMax ? ` · up to ${money(d.wanted.budgetMax)}` : ""}</p></div>
        <div className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Typical target / gap</p><p className="mt-1 font-display text-xl font-extrabold">{money(d.guidance.targetTypicalValue)}</p><p className="text-[11px] text-ink-500">{d.guidance.estimatedGap === null ? d.guidance.targetBasis : d.guidance.estimatedGap >= 0 ? `Owner adds ${money(d.guidance.estimatedGap)}` : `Surplus ${money(-d.guidance.estimatedGap)}`}</p></div>
      </div>
      {d.valuationBasis?.note && <p className="rounded-lg bg-surface-muted p-3 text-xs text-ink-700">Valuation basis: {d.valuationBasis.note}</p>}
      {d.notes && <p className="rounded-lg bg-surface-muted p-3 text-xs text-ink-700" data-no-translate>Owner's note: {d.notes}</p>}

      {waiting.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-bold text-amber-900">The owner has chosen - confirm to open the deal{waiting.some((i) => ["direct_swap", "trade_in"].includes(i.optionKind)) ? "s" : ""}</p>
          {waiting.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-2 border-t border-amber-200 py-2 first:border-0">
              <div className="min-w-0 flex-1 text-sm"><p className="font-semibold text-ink-900">{i.optionLabel}</p><p className="text-xs text-ink-600" data-no-translate>{titleOf(i)} · {money(i.targetValue)}{i.valueDifference !== null ? ` · difference ${money(i.valueDifference)}` : ""}</p>{i.note && <p className="text-xs text-ink-600" data-no-translate>{i.note}</p>}</div>
              {i.optionKind !== "hold_and_rent" && <button className="btn-primary btn-sm" disabled={busy} onClick={() => run(() => call(`/exchange/interests/${i.id}/confirm`, { method: "POST" }), "Confirmed - deals opened.")}>Confirm</button>}
              <button className="btn-outline btn-sm" onClick={() => { setNote(""); setDecline(i); }}>Decline</button>
            </div>
          ))}
        </div>
      )}

      {d.legs.length > 0 && (
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-3"><p className="text-sm font-bold text-ink-900">{d.exchangeType ? `${titleCase(d.exchangeType.replace("_", " "))} - linked legs` : "Deal"}</p>{d.valueDifference !== null && <p className="text-xs text-ink-600">Value difference {money(Math.abs(d.valueDifference))} ({d.valueDifference >= 0 ? "owner adds" : "owner receives"}), settled off-platform</p>}</div>
          {d.legs.map((l) => (
            <div key={l.dealId} className="flex flex-wrap items-center gap-2 border-t border-line py-2 text-sm">
              <span className="min-w-0 flex-1 truncate" data-no-translate>{l.property}</span><span className="text-xs text-ink-600">{money(l.dealValue)}</span><StatusBadge value={titleCase(l.stage.replace(/_/g, " "))} />
              <button className="text-xs font-semibold text-red-600 hover:underline" onClick={() => navigate(`/app/deals/${l.dealId}`)}>Open deal</button>
            </div>
          ))}
          <p className="mt-2 text-xs text-ink-500">{d.feeNote}</p>
          {d.status === "in_progress" && d.legs.length > 1 && <div className="mt-3 flex justify-end"><button className="btn-primary btn-sm" disabled={busy} onClick={() => run(() => call(`/exchange/requests/${id}/close`, { method: "POST" }), "Both legs closed.")}>Close both legs together</button></div>}
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-bold text-ink-900">Options shown to the owner</p>
        {d.options.length === 0 ? <p className="card p-4 text-sm text-ink-500">Nothing on the platform matches yet.</p> : d.options.map((o) => (
          <div key={o.kind} className="card mb-2 p-4">
            <p className="text-sm font-semibold text-ink-900">{o.label}{o.model ? ` (Model ${o.model})` : ""}{d.guidance.recommended[0] === o.kind ? " · recommended first" : ""}</p>
            {o.kind === "hold_and_rent" ? <p className="text-xs text-ink-600">{o.description} Indicative rent {money(o.indicativeMonthlyRent)} a month.</p> : (
              <ul className="mt-1 divide-y divide-line">
                {o.items.map((it) => <li key={it.propertyId} className="flex flex-wrap items-center gap-2 py-1.5 text-xs"><span className="min-w-0 flex-1 truncate text-ink-800" data-no-translate>{it.title} · {[it.locality, it.city].filter(Boolean).join(", ")}</span><span>{money(it.value)}</span><span className="text-ink-500">{it.valueDifference === null ? "" : it.valueDifference >= 0 ? `+${money(it.valueDifference)}` : `-${money(-it.valueDifference)}`}</span>{it.interest && <StatusBadge value={titleCase(it.interest)} />}</li>)}
              </ul>
            )}
          </div>
        ))}
        <p className="text-[11px] text-ink-400">{d.guidance.disclaimer}</p>
      </div>

      <Modal open={!!value} onClose={() => setValue(null)} title="Indicative valuation" description="Shown to the owner with the standard disclaimer.">
        {value && (
          <div className="space-y-3">
            <TextField label="Indicative value (₹)" type="number" min="0" value={value.value} onChange={(e) => setValue({ ...value, value: e.target.value })} />
            <TextareaField label="What it is based on" rows={2} value={value.note} onChange={(e) => setValue({ ...value, note: e.target.value })} />
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setValue(null)}>Cancel</button><button className="btn-primary" disabled={busy || !(Number(value.value) > 0) || value.note.trim().length < 5} onClick={() => run(() => call(`/exchange/requests/${id}/valuation`, { method: "PUT", body: { value: Number(value.value), note: value.note } }), "Valuation saved.")}>Save</button></div>
          </div>
        )}
      </Modal>
      <Modal open={!!decline} onClose={() => setDecline(null)} title="Decline this option" description={decline?.optionLabel}>
        <div className="space-y-3">
          <TextareaField label="Reason (shown to the owner)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setDecline(null)}>Cancel</button><button className="btn-primary" disabled={busy || note.trim().length < 5} onClick={() => run(() => call(`/exchange/interests/${decline.id}/decline`, { method: "POST", body: { note } }), "Owner told.")}>Decline</button></div>
        </div>
      </Modal>
    </div>
  );
}

export default function ExchangePage() {
  const [status, setStatus] = useState("active");
  const summary = useApiQuery("/exchange/summary");
  const { data, loading, reload } = useApiQuery(`/exchange/requests${buildQuery({ status })}`);
  const [open, setOpen] = useState(null);
  const s = summary.data;
  const rows = data || [];
  return (
    <div className="space-y-5">
      <PageHeader title="Property Exchange" />
      {s && (
        <div className="grid gap-3 sm:grid-cols-5">
          {[["Open requests", s.open], ["Options to confirm", s.to_confirm, s.to_confirm ? "text-red-600" : ""], ["To value", s.to_value, s.to_value ? "text-amber-700" : ""], ["Deals in progress", s.in_progress], ["Closed", s.closed, "text-emerald-700"]].map(([l, v, tone]) => (
            <div key={l} className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{l}</p><p className={`mt-1 font-display text-2xl font-extrabold ${tone || "text-ink-950"}`}>{v}</p></div>
          ))}
        </div>
      )}
      <select id="ex-status" className="field-select h-9 w-52" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="active">Active</option><option value="open">Open</option><option value="in_progress">Deals in progress</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option><option value="">All</option>
      </select>
      {loading && !data ? <Spinner /> : rows.length === 0 ? (
        <EmptyState title="No exchange requests here" subtitle="Owners raise an exchange request on one of their listings from the website dashboard." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Request</th><th className={th}>Old property</th><th className={th}>Indicative value</th><th className={th}>Wants</th><th className={th}>Representative</th><th className={th}>Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-surface-muted/50" onClick={() => setOpen(r.id)}>
                  <td className={th}><p className="font-mono text-xs font-bold">{r.requestNumber}</p><p className="text-xs text-ink-500">{formatDate(r.createdAt)}</p></td>
                  <td className={th} data-no-translate><p className="font-semibold text-ink-900">{r.oldProperty.title}</p><p className="text-xs text-ink-500">{r.owner?.name} · {[r.oldProperty.locality, r.oldProperty.city].filter(Boolean).join(", ")}</p></td>
                  <td className={th}>{money(r.oldPropertyValuation)}<p className="text-[11px] text-ink-500">{titleCase(r.valuationSource || "not valued")}</p></td>
                  <td className={`${th} max-w-[240px] text-xs text-ink-600`}>{r.reinvestmentIntentLabel}<p data-no-translate>{[r.wanted.propertyType, r.wanted.city].filter(Boolean).join(" · ")}</p></td>
                  <td className={`${th} text-xs`} data-no-translate>{r.representative?.name || "—"}</td>
                  <td className={th}><StatusBadge value={STATUS_LABEL[r.status]} />{r.interestsWaiting > 0 && <p className="mt-0.5 text-[11px] font-semibold text-red-600">{r.interestsWaiting} to confirm</p>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title="Exchange request" maxWidth="max-w-4xl">
        {open && <Detail id={open} onChanged={() => { reload(); summary.reload(); }} />}
      </Modal>
    </div>
  );
}
