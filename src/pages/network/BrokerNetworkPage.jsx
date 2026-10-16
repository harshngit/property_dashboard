import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";

// Module 37 - Broker Network: co-broking.
//   Find partners  brokers by city with their trust score and track record
//   My co-broking  proposals to answer, agreements, the linked deal, the split
//   All (staff)    every agreement on the platform
// Brokers never see each other's phone or email; clients stay with the
// A R Buildwel representative.

const STAFF = ["internal_sales", "admin", "super_admin"];
const th = "px-4 py-3";
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
const STATUS = { proposed: "Proposed", countered: "Counter-offer", accepted: "Agreed", declined: "Declined", withdrawn: "Withdrawn", expired: "Expired", deal_open: "Deal open", completed: "Completed", cancelled: "Cancelled" };
const EVENT = { ...STATUS, message: "Message", deal_linked: "Deal linked" };
const money = (v) => (v === null || v === undefined ? "—" : formatINR(v, { compact: false }));

function useAct(reload) {
  const call = useApiCall();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const act = async (path, { method = "POST", body, msg, after } = {}) => {
    setBusy(true);
    try {
      const res = await call(path, { method, body });
      if (msg) toast.push(msg, "success");
      reload?.();
      after?.(res?.data);
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return { act, busy };
}

function Subject({ a }) {
  if (a.property) return <span><span data-no-translate>{a.property.title}</span><span className="text-xs text-ink-500"> · <span data-no-translate>{[a.property.locality, a.property.city].filter(Boolean).join(", ")}</span>{a.property.price ? <> · <span data-no-translate>{a.property.price}</span></> : null}</span></span>;
  if (a.requirement) return <span>Buyer requirement<span className="text-xs text-ink-500"> · <span data-no-translate>{[a.requirement.propertyType, a.requirement.city].filter(Boolean).join(", ")}</span>{a.requirement.budgetMax ? ` · up to ${money(a.requirement.budgetMax)}` : ""}</span></span>;
  return <span>—</span>;
}

function AgreementDetail({ id, staff, onClose, onChanged }) {
  const { data: a, loading, reload } = useApiQuery(`/cobroke/${id}`);
  const { act, busy } = useAct(() => { reload(); onChanged(); });
  const [share, setShare] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [dealId, setDealId] = useState("");
  if (loading && !a) return <Modal open onClose={onClose} title="Co-broking"><Spinner /></Modal>;
  if (!a) return null;
  const open = ["proposed", "countered"].includes(a.status);
  const closed = ["declined", "withdrawn", "expired", "cancelled"].includes(a.status);
  return (
    <Modal open onClose={onClose} title={a.agreementNumber} description={`${STATUS[a.status]}${a.expiresAt ? ` · answer by ${formatDate(a.expiresAt)}` : ""}`}>
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1 text-sm">
        <div className="rounded-xl bg-surface-muted p-3"><Subject a={a} /></div>
        <div className="grid grid-cols-2 gap-3">
          {[a.proposer, a.partner].map((b, i) => (
            <div key={b.id} className={`rounded-xl border p-3 ${a.myRole === (i === 0 ? "proposer" : "partner") ? "border-ink-900" : "border-line"}`}>
              <p className="text-xs text-ink-500">{b.side}{a.myRole === (i === 0 ? "proposer" : "partner") ? " · you" : ""}</p>
              <p className="font-semibold" data-no-translate>{b.name}</p>
              {b.firmName && <p className="text-xs text-ink-500" data-no-translate>{b.firmName}</p>}
              <p className="mt-1 font-display text-2xl font-extrabold text-ink-900">{b.sharePercent}%</p>
              {a.settlement?.basis != null && <p className="text-xs text-ink-600">{money(i === 0 ? a.settlement.proposerAmount : a.settlement.partnerAmount)}</p>}
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-500">The percentages split the brokers' share on this deal. The client stays with the A R Buildwel representative.</p>

        {open && a.awaitingMe && (
          <div className="space-y-2 rounded-xl border border-line p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Your answer</p>
            <TextField label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex flex-wrap items-end gap-2">
              <TextField label="Or ask for a different share (%)" type="number" min="1" max="99" className="w-56" value={share} onChange={(e) => setShare(e.target.value)} />
              <button className="btn-outline btn-sm" disabled={busy || !(Number(share) > 0)} onClick={() => act(`/cobroke/${id}/respond`, { body: { action: "counter", myShare: Number(share), note: note || null }, msg: "Counter-offer sent.", after: () => { setShare(""); setNote(""); } })}>Counter</button>
              <button className="btn-outline btn-sm" disabled={busy} onClick={() => act(`/cobroke/${id}/respond`, { body: { action: "decline", note: note || null }, msg: "Declined." })}>Decline</button>
              <button className="btn-primary btn-sm" disabled={busy} onClick={() => act(`/cobroke/${id}/respond`, { body: { action: "accept", note: note || null }, msg: "Agreed. Open the deal with the representative - it links by itself." })}>Accept {a.mySharePercent}% for me</button>
            </div>
          </div>
        )}
        {open && a.myRole && !a.awaitingMe && <p className="rounded-xl bg-surface-muted p-3 text-ink-700">Waiting for the other broker to answer.{a.myRole === "proposer" && <button className="ml-2 font-semibold text-red-600" disabled={busy} onClick={() => act(`/cobroke/${id}/withdraw`, { msg: "Proposal withdrawn." })}>Withdraw</button>}</p>}

        {a.status === "accepted" && (
          <div className="space-y-2 rounded-xl border border-line p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Deal</p>
            <p className="text-ink-700">No deal linked yet. It links by itself when the deal is opened on this listing; or paste the deal's ID.</p>
            <div className="flex gap-2"><input className="field-input flex-1" placeholder="Deal ID" value={dealId} onChange={(e) => setDealId(e.target.value)} /><button className="btn-outline btn-sm" disabled={busy || !/^[0-9a-f-]{36}$/i.test(dealId.trim())} onClick={() => act(`/cobroke/${id}/link-deal`, { body: { dealId: dealId.trim() }, msg: "Deal linked." })}>Link deal</button></div>
          </div>
        )}
        {a.dealId && <p>Deal: <Link className="font-semibold text-red-600" to={`/app/deals/${a.dealId}`}>Open deal</Link>{a.dealStage ? ` · ${titleCase(a.dealStage)}` : ""}</p>}
        {a.settlement && <p className="rounded-xl bg-emerald-50 p-3 text-emerald-900">{a.settlement.basis != null ? `Brokers' share ${money(a.settlement.basis)} split ${a.settlement.proposerPercent}% / ${a.settlement.partnerPercent}%.` : `Split recorded ${a.settlement.proposerPercent}% / ${a.settlement.partnerPercent}%. ${a.settlement.basisNote}.`}</p>}
        {a.cancelReason && <p className="text-ink-600">Cancelled: <span data-no-translate>{a.cancelReason}</span></p>}

        {!closed && (
          <div className="flex gap-2">
            <input className="field-input flex-1" placeholder="Message the other broker (no phone numbers or emails)" value={msg} onChange={(e) => setMsg(e.target.value)} />
            <button className="btn-outline btn-sm" disabled={busy || msg.trim().length < 2} onClick={() => act(`/cobroke/${id}/message`, { body: { body: msg.trim() }, after: () => setMsg("") })}>Send</button>
          </div>
        )}
        {(a.status === "accepted" || (a.status === "deal_open" && staff)) && <div className="flex justify-end"><button className="btn-outline btn-sm" disabled={busy} onClick={() => { const reason = window.prompt("Reason for cancelling this agreement"); if (reason) act(`/cobroke/${id}/cancel`, { body: { reason }, msg: "Agreement cancelled." }); }}>Cancel agreement</button></div>}

        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">History (kept on record)</p>
          {a.timeline.map((t, i) => <p key={i} className="border-b border-line py-1.5 text-xs last:border-0"><span className="font-semibold">{EVENT[t.kind] || titleCase(t.kind)}</span>{t.split ? ` · ${t.split.proposer}% / ${t.split.partner}%` : ""} · {formatDate(t.at, true)}{t.by ? <> · <span data-no-translate>{t.by}</span></> : null}{t.note ? <><br /><span className="text-ink-700" data-no-translate>{t.note}</span></> : null}</p>)}
        </div>
      </div>
    </Modal>
  );
}

function Directory({ canPropose, onProposed }) {
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const { data, loading } = useApiQuery(`/cobroke/brokers${buildQuery({ city, q })}`);
  const [picked, setPicked] = useState(null);
  const rows = data || [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <input className="field-input h-9 w-56" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <input className="field-input h-9 min-w-[220px] flex-1" placeholder="Search broker or firm" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="text-xs text-ink-500">Brokers are shown by track record. Phone numbers and emails are never shown - work together through a co-broking proposal.</p>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="No brokers found" subtitle="Try another city or clear the search." /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((b) => (
            <div key={b.id} className="card flex flex-col p-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="font-semibold text-ink-900" data-no-translate>{b.name}</p><p className="text-xs text-ink-500" data-no-translate>{b.firmName || titleCase(b.role)}</p></div>
                <div className="text-right"><p className="font-display text-xl font-extrabold text-ink-900">{b.trustScore ?? "—"}</p><p className="text-[10px] uppercase tracking-wide text-ink-500">Trust</p></div>
              </div>
              <p className="mt-2 text-xs text-ink-600" data-no-translate>{b.cities.slice(0, 4).join(", ") || "—"}{b.areas.length ? ` · ${b.areas.slice(0, 3).join(", ")}` : ""}</p>
              <p className="mt-1 text-xs text-ink-600">{b.liveListings} live listings · {b.dealsClosed} deals closed · {b.cobrokesCompleted} co-broked</p>
              {b.badges.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{b.badges.slice(0, 3).map((k) => <span key={k} className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">{titleCase(k)}</span>)}</div>}
              <div className="mt-3 flex items-center justify-between gap-2 pt-1">
                <span className="text-xs text-ink-500">{b.workingTogether ? "Working together now" : b.vouchedByMe ? "You vouched for them" : ""}</span>
                {canPropose && <button className="btn-outline btn-sm" disabled={b.liveListings === 0} onClick={() => setPicked(b)}>{b.liveListings ? "Co-broke a listing" : "No live listings"}</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {picked && <ProposeModal broker={picked} onClose={() => setPicked(null)} onDone={(a) => { setPicked(null); onProposed(a.id); }} />}
    </div>
  );
}

function ProposeModal({ broker, onClose, onDone }) {
  const { data, loading } = useApiQuery(`/cobroke/brokers/${broker.id}/listings`);
  const mine = useApiQuery("/cobroke/mine");
  const { act, busy } = useAct();
  const [propertyId, setPropertyId] = useState("");
  const [share, setShare] = useState("");
  const [note, setNote] = useState("");
  const suggested = mine.data?.defaultSplit?.buyer_side ?? 50;
  const min = mine.data?.minSharePercent ?? 10;
  const rows = data || [];
  return (
    <Modal open onClose={onClose} title={`Co-broke with ${broker.name}`} description="You bring the buyer for one of their listings and share the brokers' share as agreed.">
      {loading && !data ? <Spinner /> : (
        <div className="space-y-3 text-sm">
          <div>
            <label className="field-label">Their listing</label>
            <select className="field-select" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">Choose a listing</option>
              {rows.map((p) => <option key={p.id} value={p.id} disabled={p.alreadyProposed}>{p.title} · {[p.locality, p.city].filter(Boolean).join(", ")} · {p.price}{p.alreadyProposed ? " (already proposed)" : ""}</option>)}
            </select>
          </div>
          <TextField label={`Your share (%) - suggested ${suggested}, each broker at least ${min}`} type="number" min={min} max={100 - min} placeholder={String(suggested)} value={share} onChange={(e) => setShare(e.target.value)} />
          <TextareaField label="Note to the broker (optional, no phone numbers or emails)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={busy || !propertyId} onClick={() => act("/cobroke", { body: { propertyId, myShare: share === "" ? null : Number(share), note: note.trim() || null }, msg: "Proposal sent.", after: onDone })}>Send proposal</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Table({ rows, onOpen, mineView }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-500"><tr><th className={th}>Agreement</th><th className={th}>Listing / requirement</th><th className={th}>Brokers and split</th><th className={th}>Status</th></tr></thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-muted" onClick={() => onOpen(a.id)}>
              <td className={th}><span className="font-semibold text-ink-900" data-no-translate>{a.agreementNumber}</span><br /><span className="text-xs text-ink-500">{formatDate(a.createdAt)}</span></td>
              <td className={th}><Subject a={a} /></td>
              <td className={th}><span data-no-translate>{a.proposer.name}</span> {a.proposer.sharePercent}% · <span data-no-translate>{a.partner.name}</span> {a.partner.sharePercent}%{mineView && a.mySharePercent != null && <><br /><span className="text-xs text-ink-500">Your share {a.mySharePercent}%</span></>}</td>
              <td className={th}><StatusBadge value={STATUS[a.status]} />{a.awaitingMe && <><br /><span className="text-xs font-semibold text-amber-700">Needs your answer</span></>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Mine({ openId, setOpenId }) {
  const { data, loading, reload } = useApiQuery("/cobroke/mine");
  const rows = data?.agreements || [];
  const s = data?.summary || {};
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["To answer", s.to_answer], ["Waiting on them", s.waiting], ["Active", s.active], ["Completed", s.completed], ["Partner brokers", s.partners]].map(([l, v]) => <div key={l} className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{l}</p><p className="mt-1 font-display text-2xl font-extrabold text-ink-900">{v ?? 0}</p></div>)}
      </div>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="No co-broking yet" subtitle="Find a partner broker and propose to work one of their listings together." /> : <Table rows={rows} onOpen={setOpenId} mineView />}
      {openId && <AgreementDetail id={openId} onClose={() => setOpenId(null)} onChanged={reload} />}
    </div>
  );
}

function All() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const { data, loading, reload } = useApiQuery(`/cobroke/all${buildQuery({ status, q })}`);
  const [open, setOpen] = useState(null);
  const rows = data?.agreements || [];
  const s = data?.stats || {};
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Negotiating", s.negotiating], ["Agreed, no deal yet", s.agreed], ["Deal open", s.deal_open], ["Completed", s.completed]].map(([l, v]) => <div key={l} className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{l}</p><p className="mt-1 font-display text-2xl font-extrabold text-ink-900">{v ?? 0}</p></div>)}
      </div>
      <div className="flex flex-wrap gap-3">
        <select className="field-select h-9 w-48" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input className="field-input h-9 min-w-[220px] flex-1" placeholder="Search agreement, broker or listing" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading && !data ? <Spinner /> : rows.length === 0 ? <EmptyState title="No co-broking agreements" /> : <Table rows={rows} onOpen={setOpen} />}
      {open && <AgreementDetail id={open} staff onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}

export default function BrokerNetworkPage() {
  const { role } = useAuth();
  const staff = STAFF.includes(role);
  const [tab, setTab] = useState(staff ? "all" : "mine");
  const [openId, setOpenId] = useState(null);
  const tabs = staff ? [["all", "All co-broking"], ["find", "Broker directory"]] : [["mine", "My co-broking"], ["find", "Find partner brokers"]];
  return (
    <div>
      <PageHeader eyebrow="Broker Network" title="Co-broking" subtitle="Work another broker's listing together: agree a split, the deal links to it, and the split is recorded when it closes." />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === key ? "bg-ink-900 text-white" : "bg-surface-muted text-ink-700 hover:bg-line"}`}>{label}</button>)}
      </div>
      {tab === "mine" && <Mine openId={openId} setOpenId={setOpenId} />}
      {tab === "all" && <All />}
      {tab === "find" && <Directory canPropose={!staff} onProposed={(id) => { setTab("mine"); setOpenId(id); }} />}
    </div>
  );
}
