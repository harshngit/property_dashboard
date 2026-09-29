import { useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { LuArrowRight, LuBan, LuUserCheck, LuRefreshCw, LuBellRing, LuEye, LuCircleCheck, LuCircleX, LuUpload, LuLockKeyhole } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import { SelectField, TextareaField } from "../../components/common/FormField";
import { InlineSpinner } from "../../components/common/PageLoader";
import useAuth from "../../hooks/useAuth";
import useStaffOptions from "../../hooks/useStaffOptions";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { apiRequest } from "../../api/client";
import { formatDate, formatINR, titleCase } from "../../lib/format";
import { AccessRequests } from "../deal-room/DealRoomPage";
import CrawlersTab from "./CrawlersTab";
import AlertsTab from "./AlertsTab";

// Engine 4 - bank auction & special situation deals for staff:
//   Pipeline  - investor interests, Lead -> Deal Interest -> Due Diligence ->
//               Negotiation -> Closure, one stage at a time (or Dropped)
//   Live deals - approved opportunities with score / discount; rescore and
//               re-send investor alerts
//   Intake    - crawler / CSV records awaiting review; publish or reject

const STAGES = ["lead", "deal_interest", "due_diligence", "negotiation", "closure"];
const ADMIN_ROLES = ["admin", "super_admin"];

function nextStage(stage) {
  const i = STAGES.indexOf(stage);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

function Pipeline({ isAdmin }) {
  const toast = useToast();
  const call = useApiCall();
  const staff = useStaffOptions();
  const { data, loading, reload } = useApiQuery("/opportunities/interests?limit=100");
  const [dropping, setDropping] = useState(null);
  const [dropReason, setDropReason] = useState("");
  const [assigning, setAssigning] = useState(null);
  const [assignee, setAssignee] = useState("");

  const move = async (row, stage, notes) => {
    try {
      await call(`/opportunities/interests/${row.id}/stage`, { method: "PUT", body: { stage, notes } });
      toast.push(`Moved to ${titleCase(stage)}.`, "success");
      setDropping(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const assign = async () => {
    try {
      await call(`/opportunities/interests/${assigning.id}/assign`, { method: "PUT", body: { assignedTo: assignee } });
      toast.push("Interest assigned.", "success");
      setAssigning(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const rows = (data?.items || []).map((i) => ({
    id: i.id,
    investor: i.investor_name,
    deal: i.property_title,
    category: titleCase(i.listing_category),
    city: i.city,
    bid: formatINR(i.intended_bid_amount),
    financing: i.financing_needed ? "Yes" : "No",
    stage: titleCase(i.stage),
    assignedTo: i.assigned_to_name || "Unassigned",
    updated: formatDate(i.updated_at),
    raw: i,
  }));

  return (
    <>
      <DataTable
        columns={[
          { key: "investor", label: "Investor" },
          { key: "deal", label: "Deal" },
          { key: "category", label: "Category" },
          { key: "bid", label: "Intended bid" },
          { key: "financing", label: "Loan" },
          { key: "assignedTo", label: "Representative" },
          { key: "stage", label: "Stage", render: (r) => <StatusBadge value={r.stage} /> },
          { key: "updated", label: "Updated" },
        ]}
        data={rows}
        loading={loading}
        searchKeys={["investor", "deal", "city"]}
        filters={[{ key: "stage", label: "Stage", options: [...STAGES, "dropped"].map(titleCase) }]}
        getActions={(row) => {
          const next = nextStage(row.raw.stage);
          const closed = ["closure", "dropped"].includes(row.raw.stage);
          return [
            { label: next ? `Move to ${titleCase(next)}` : "Final stage", icon: LuArrowRight, hidden: !next, onClick: () => move(row.raw, next) },
            { label: "Drop", icon: LuBan, tone: "danger", hidden: closed, onClick: () => { setDropReason(""); setDropping(row.raw); } },
            { label: "Assign", icon: LuUserCheck, hidden: !isAdmin, onClick: () => { setAssignee(row.raw.assigned_to || ""); setAssigning(row.raw); } },
            { label: "Open lead", icon: LuEye, hidden: !row.raw.lead_id, onClick: () => window.location.assign(`/app/leads/${row.raw.lead_id}`) },
          ];
        }}
        renderCard={(r) => (
          <div>
            <p className="font-semibold text-ink-900">{r.investor}</p>
            <p className="mt-1 text-xs text-ink-500">{r.deal}</p>
            <div className="mt-3"><StatusBadge value={r.stage} /></div>
            <p className="mt-3 text-xs text-ink-500">{r.bid} • {r.assignedTo}</p>
          </div>
        )}
        kanban={{ key: "stage", columns: [...STAGES, "dropped"].map(titleCase) }}
        emptyTitle="No investor interest yet"
        emptySubtitle="Interest registered by verified investors on the website appears here."
      />
      <Modal open={!!dropping} onClose={() => setDropping(null)} title="Drop this interest" description={dropping?.property_title}>
        <div className="space-y-4">
          <TextareaField label="Reason (required)" rows={3} value={dropReason} onChange={(e) => setDropReason(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setDropping(null)}>Cancel</button>
            <button className="btn-primary" disabled={!dropReason.trim()} onClick={() => move(dropping, "dropped", dropReason.trim())}>Drop</button>
          </div>
        </div>
      </Modal>
      <Modal open={!!assigning} onClose={() => setAssigning(null)} title="Assign representative" description={assigning?.investor_name}>
        <div className="space-y-4">
          <SelectField label="Representative" value={assignee} onChange={(e) => setAssignee(e.target.value)} options={staff} placeholder="Select a team member" />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setAssigning(null)}>Cancel</button>
            <button className="btn-primary" disabled={!assignee} onClick={assign}>Assign</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function LiveDeals({ isAdmin }) {
  const toast = useToast();
  const call = useApiCall();
  const navigate = useNavigate();
  const { data, loading, reload } = useApiQuery("/opportunities?limit=100&includePast=true&sort=newest");

  const act = async (path, label) => {
    try {
      const res = await call(path, { method: "POST" });
      toast.push(res.message || label, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const rows = (data?.items || []).map((d) => ({
    id: d.id,
    title: d.title,
    category: titleCase(d.listing_category),
    city: [d.locality, d.city].filter(Boolean).join(", "),
    price: formatINR(d.reserve_price ?? d.price_value),
    discount: d.discount_percent != null ? `${Number(d.discount_percent)}%` : "—",
    score: d.investment_score ?? "—",
    liquidity: titleCase(d.liquidity_band) || "—",
    auction: d.auction_date ? formatDate(d.auction_date, true) : "—",
    source: d.source_bank || d.source_label || "—",
    raw: d,
  }));

  return (
    <>
    {isAdmin && (
      <div className="mb-3 flex items-center justify-end gap-3">
        <p className="text-xs text-ink-500">Scores learn from conversion history and refresh daily.</p>
        <button className="btn-outline" onClick={() => act("/opportunities/rescore-all", "All deals rescored.")}>
          <LuRefreshCw className="h-4 w-4" /> Re-score all deals
        </button>
      </div>
    )}
    <DataTable
      columns={[
        { key: "title", label: "Deal", render: (r) => <Link to={`/app/properties/${r.id}`} className="font-semibold text-ink-900 hover:text-red-600">{r.title}</Link> },
        { key: "category", label: "Category" },
        { key: "city", label: "Location" },
        { key: "price", label: "Reserve / Ask" },
        { key: "discount", label: "Discount" },
        { key: "score", label: "Score" },
        { key: "liquidity", label: "Liquidity" },
        { key: "auction", label: "Auction" },
        { key: "source", label: "Source" },
      ]}
      data={rows}
      loading={loading}
      searchKeys={["title", "city", "source"]}
      filters={[{ key: "category", label: "Category", options: ["Auction", "Special Situation", "Institutional"] }]}
      getActions={(row) => [
        { label: "Edit listing", icon: LuEye, onClick: () => navigate(`/app/properties/${row.id}/edit`) },
        { label: "Deal room", icon: LuLockKeyhole, onClick: () => navigate(`/app/deal-room/${row.id}`) },
        { label: "Recalculate score", icon: LuRefreshCw, onClick: () => act(`/opportunities/${row.id}/rescore`, "Rescored.") },
        { label: "Send investor alerts", icon: LuBellRing, hidden: !isAdmin, onClick: () => act(`/opportunities/${row.id}/send-alerts`, "Alerts sent.") },
      ]}
      emptyTitle="No live opportunities"
      emptySubtitle="Approve an auction or special situation listing, or publish from the intake queue."
    />
    </>
  );
}

const EDITABLE_INTAKE_FIELDS = [
  ["title", "Title", "text"], ["property_type", "Property type", "select"], ["city", "City", "text"], ["locality", "Locality", "text"],
  ["reserve_price", "Reserve price (₹)", "number"], ["emd_amount", "EMD (₹)", "number"], ["auction_date", "Auction date", "date"], ["source_bank", "Bank / institution", "text"],
];
const PROPERTY_TYPE_OPTIONS = ["apartment", "villa", "independent_house", "plot", "commercial", "farmhouse", "other"];

function IntakeQueue() {
  const toast = useToast();
  const call = useApiCall();
  const navigate = useNavigate();
  const [edits, setEdits] = useState({});
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [notice, setNotice] = useState({ sourceName: "", listingCategory: "auction", legalReview: false });
  const noticeRef = useRef(null);
  const token = useSelector((s) => s.auth.accessToken);
  const fileRef = useRef(null);
  const [status, setStatus] = useState("needs_review");
  const [uploading, setUploading] = useState(false);
  const { data, loading, reload } = useApiQuery(`/opportunities/ingest/queue?limit=100&status=${status}`);
  const [reviewing, setReviewing] = useState(null);
  const [notes, setNotes] = useState("");

  const uploadCsv = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiRequest("/opportunities/ingest/csv", { method: "POST", body: form, isFormData: true, token });
      const s = res.data;
      toast.push(`${s.received} rows: ${s.needs_review} to review, ${s.duplicate} duplicates, ${s.published} published.`, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openReview = (item) => {
    setNotes("");
    const n = item.normalised || {};
    setEdits(Object.fromEntries(EDITABLE_INTAKE_FIELDS.map(([k]) => [k, n[k] == null ? "" : k === "auction_date" ? String(n[k]).slice(0, 10) : n[k]])));
    setReviewing(item);
  };

  const uploadNotice = async () => {
    const file = noticeRef.current?.files?.[0];
    if (!file) return toast.push("Choose a PDF or text file.", "error");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      Object.entries(notice).forEach(([k, v]) => v !== "" && form.append(k, String(v)));
      const res = await apiRequest("/crawlers/parse-notice", { method: "POST", body: form, isFormData: true, token });
      const p = res.data.parsed || {};
      toast.push(`Parsed${p.parsed_by_ai ? " (with AI)" : ""}: ${p.reserve_price ? formatINR(p.reserve_price) : "no reserve price"}, auction ${p.auction_date || "date not found"} - queued for review.`, "success");
      setNoticeOpen(false);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const legalReview = async () => {
    try {
      const res = await call(`/opportunities/ingest/${reviewing.id}/legal-review`, { method: "POST", body: { notes: notes || undefined } });
      toast.push("Legal review recorded - you can publish now.", "success");
      setReviewing(res.data);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const decide = async (action) => {
    try {
      if (action === "publish") {
        const n = reviewing.normalised || {};
        const changed = Object.fromEntries(
          Object.entries(edits)
            .filter(([k, v]) => String(v ?? "") !== String(n[k] == null ? "" : k === "auction_date" ? String(n[k]).slice(0, 10) : n[k]))
            .map(([k, v]) => [k, ["reserve_price", "emd_amount"].includes(k) ? (v === "" ? null : Number(v)) : v === "" ? null : v]),
        );
        await call(`/opportunities/ingest/${reviewing.id}/publish`, {
          method: "POST",
          body: { notes: notes || undefined, forceDespiteDuplicate: reviewing.status === "duplicate" || undefined, normalised: Object.keys(changed).length ? changed : undefined },
        });
        toast.push("Published - matched investors are being alerted.", "success");
      } else {
        await call(`/opportunities/ingest/${reviewing.id}/reject`, { method: "POST", body: { notes: notes || undefined } });
        toast.push("Rejected.", "success");
      }
      setReviewing(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const counts = data?.countsByStatus || {};
  const rows = (data?.items || []).map((i) => {
    const n = i.normalised || {};
    return {
      id: i.id,
      title: n.title || "(untitled)",
      source: i.source_name,
      city: [n.locality, n.city].filter(Boolean).join(", ") || "—",
      reserve: formatINR(n.reserve_price),
      auction: n.auction_date ? formatDate(n.auction_date, true) : "—",
      confidence: `${Math.round(Number(i.confidence))}%`,
      issues: (i.issues || []).length,
      status: titleCase(i.status),
      raw: i,
    };
  });

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-surface-muted p-1">
          {["needs_review", "duplicate", "published", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${status === s ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}
            >
              {titleCase(s)} ({counts[s] || 0})
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn-outline btn-sm" onClick={() => setNoticeOpen(true)}>
            <LuUpload className="h-3.5 w-3.5" /> Upload notice (PDF)
          </button>
          <label className="btn-outline btn-sm cursor-pointer">
            {uploading ? <InlineSpinner /> : <LuUpload className="h-3.5 w-3.5" />} Upload auction CSV
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => uploadCsv(e.target.files?.[0])} />
          </label>
        </div>
      </div>
      <DataTable
        columns={[
          { key: "title", label: "Record" },
          { key: "source", label: "Source" },
          { key: "city", label: "Location" },
          { key: "reserve", label: "Reserve" },
          { key: "auction", label: "Auction" },
          { key: "confidence", label: "Confidence" },
          { key: "issues", label: "Issues" },
          {
            key: "status",
            label: "Status",
            render: (r) => (
              <div className="flex flex-wrap gap-1">
                <StatusBadge value={r.status} />
                {r.raw.requires_legal_review && <StatusBadge value={r.raw.legal_reviewed_at ? "Legal OK" : "Legal review"} />}
              </div>
            ),
          },
        ]}
        data={rows}
        loading={loading}
        searchKeys={["title", "source", "city"]}
        getActions={(row) => [
          {
            label: "Review",
            icon: LuEye,
            hidden: !["needs_review", "duplicate"].includes(row.raw.status),
            onClick: () => openReview(row.raw),
          },
          { label: "Open listing", icon: LuEye, hidden: !row.raw.property_id, onClick: () => navigate(`/app/properties/${row.raw.property_id}`) },
        ]}
        emptyTitle="Nothing in this queue"
        emptySubtitle="Crawler and CSV auction records land here for review before publishing."
      />
      <Modal open={!!reviewing} onClose={() => setReviewing(null)} title="Review intake record" description={reviewing?.source_name} maxWidth="max-w-2xl">
        {reviewing && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {Object.entries(reviewing.normalised || {})
                .filter(([k, v]) => v !== null && v !== "" && !["data_source"].includes(k) && typeof v !== "object")
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-ink-500">{titleCase(k)}</dt>
                    <dd className="break-words font-medium text-ink-900">
                      {["reserve_price", "emd_amount", "estimated_market_value"].includes(k) ? formatINR(v) : k.endsWith("_date") || k === "emd_deadline" ? formatDate(v, true) : String(v)}
                    </dd>
                  </div>
                ))}
            </dl>
            {(reviewing.issues || []).length > 0 && (
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {reviewing.issues.map((i) => `${titleCase(i.field)}: ${i.issue}`).join(" • ")}
              </div>
            )}
            <div className="rounded-lg border border-line p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Correct before publishing</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {EDITABLE_INTAKE_FIELDS.map(([k, label, type]) => (
                  <label key={k} className="block text-xs">
                    <span className="text-ink-500">{label}</span>
                    {type === "select" ? (
                      <select className="field-select h-8" value={edits[k] || ""} onChange={(e) => setEdits((x) => ({ ...x, [k]: e.target.value }))}>
                        <option value="">—</option>
                        {PROPERTY_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{titleCase(o)}</option>)}
                      </select>
                    ) : (
                      <input className="field-input h-8" type={type} value={edits[k] ?? ""} onChange={(e) => setEdits((x) => ({ ...x, [k]: e.target.value }))} />
                    )}
                  </label>
                ))}
              </div>
            </div>
            {reviewing.requires_legal_review && (
              <p className={`rounded-lg px-3 py-2 text-xs ${reviewing.legal_reviewed_at ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>
                {reviewing.legal_reviewed_at
                  ? `Legal review recorded ${formatDate(reviewing.legal_reviewed_at, true)}${reviewing.legal_review_notes ? ` - ${reviewing.legal_review_notes}` : ""}.`
                  : "From a legal / newspaper notice - the lawyer panel must review it before it can go live."}
              </p>
            )}
            {reviewing.status === "duplicate" && (
              <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-700">
                Looks like a duplicate of an existing listing. Publishing will create a second listing.
              </p>
            )}
            <TextareaField label="Review notes (optional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button className="btn-outline text-coral-600" onClick={() => decide("reject")}>
                <LuCircleX className="h-4 w-4" /> Reject
              </button>
              {reviewing.requires_legal_review && !reviewing.legal_reviewed_at ? (
                <button className="btn-primary" onClick={legalReview}>
                  <LuCircleCheck className="h-4 w-4" /> Record legal review
                </button>
              ) : (
                <button className="btn-primary" onClick={() => decide("publish")}>
                  <LuCircleCheck className="h-4 w-4" /> Publish
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
      <Modal open={noticeOpen} onClose={() => setNoticeOpen(false)} title="Upload an auction / sale notice" description="PDF or text - read by the same parser as the crawlers (regex, plus AI when configured) and queued for review.">
        <div className="space-y-3 text-sm">
          <label className="block"><span className="field-label">Source</span><input className="field-input" placeholder="e.g. Hindustan Times - public notice, 12 Oct" value={notice.sourceName} onChange={(e) => setNotice((x) => ({ ...x, sourceName: e.target.value }))} /></label>
          <label className="block"><span className="field-label">Category</span>
            <select className="field-select" value={notice.listingCategory} onChange={(e) => setNotice((x) => ({ ...x, listingCategory: e.target.value }))}>
              <option value="auction">Bank auction</option>
              <option value="special_situation">Special situation</option>
            </select>
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={notice.legalReview} onChange={(e) => setNotice((x) => ({ ...x, legalReview: e.target.checked }))} /> Needs lawyer-panel review (newspaper / legal notice)</label>
          <input ref={noticeRef} type="file" accept=".pdf,.txt,application/pdf,text/plain" className="block w-full" />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setNoticeOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={uploading} onClick={uploadNotice}>{uploading ? "Parsing…" : "Parse & queue"}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// Every deal with a deal room, and NDA-signed access requests across deals.
function DealRooms() {
  const rooms = useApiQuery("/deal-room/manage/rooms");
  const [status, setStatus] = useState("pending_approval");
  const requests = useApiQuery(`/deal-room/manage/requests${status ? `?status=${status}` : ""}`);
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Access requests</h3>
          <select className="field-select h-9 w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending_approval">Pending approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="revoked">Revoked</option>
            <option value="">All</option>
          </select>
        </div>
        <AccessRequests rows={requests.data || []} showDeal onChanged={() => { requests.reload(); rooms.reload(); }} />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-500">Deal rooms</h3>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
              <tr><th className="px-4 py-3">Deal</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Documents</th><th className="px-4 py-3">Pending</th><th className="px-4 py-3">Approved investors</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(rooms.data || []).map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5"><Link to={`/app/deal-room/${r.id}`} className="font-semibold text-ink-900 hover:text-red-600">{r.title}</Link><p className="text-xs text-ink-500">{r.city}</p></td>
                  <td className="px-4 py-2.5">{titleCase(r.listing_category)}</td>
                  <td className="px-4 py-2.5">{r.documents}</td>
                  <td className={`px-4 py-2.5 ${r.pending_requests ? "font-semibold text-coral-600" : ""}`}>{r.pending_requests}</td>
                  <td className="px-4 py-2.5">{r.approved_users}</td>
                </tr>
              ))}
              {(rooms.data || []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">No deal rooms yet - open a live deal and choose “Deal room” to add documents.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function OpportunitiesPage() {
  const { role } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(role);
  const [tab, setTab] = useState("pipeline");
  const { data: summary } = useApiQuery("/opportunities/summary");

  const stats = useMemo(() => {
    const byCat = Object.fromEntries((summary?.liveByCategory || []).map((c) => [c.listing_category, c]));
    const pipeline = summary?.pipelineByStage || {};
    const open = STAGES.filter((s) => s !== "closure").reduce((a, s) => a + (pipeline[s] || 0), 0);
    return [
      { label: "Live auctions", value: byCat.auction?.count || 0, meta: byCat.auction?.avg_score != null ? `avg score ${byCat.auction.avg_score}` : "" },
      { label: "Special situation", value: byCat.special_situation?.count || 0, meta: byCat.special_situation?.avg_discount != null ? `avg discount ${byCat.special_situation.avg_discount}%` : "" },
      { label: "Open interests", value: open, meta: `${pipeline.closure || 0} closed` },
      { label: "Awaiting review", value: summary?.ingestionQueue?.needs_review || 0, meta: "intake queue" },
    ];
  }, [summary]);

  const tabs = [["pipeline", "Pipeline"], ["live", "Live deals"], ["rooms", "Deal rooms"], ["alerts", "Investor alerts"], ...(isAdmin ? [["intake", "Intake queue"], ["crawlers", "Crawlers"]] : [])];

  return (
    <div>
      <PageHeader eyebrow="Engine 4" title="Opportunity Deals" subtitle="Bank auction and special situation deals, investor interest pipeline and intake review." />
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs font-semibold text-ink-500">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-ink-950">{s.value}</p>
            <p className="text-[11px] text-ink-400">{s.meta}</p>
          </div>
        ))}
      </div>
      {summary?.upcomingAuctions?.length > 0 && (
        <div className="card mb-5 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Auctions in the next 14 days</p>
          <div className="flex flex-wrap gap-2">
            {summary.upcomingAuctions.map((a) => (
              <Link key={a.id} to={`/app/properties/${a.id}`} className="rounded-lg border border-line px-3 py-2 text-xs hover:border-red-200">
                <span className="font-semibold text-ink-900">{a.title}</span>
                <span className="text-ink-500"> • {a.city} • {formatDate(a.auction_date, true)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="mb-4 flex gap-1 rounded-lg bg-surface-muted p-1 sm:w-fit">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold ${tab === key ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "pipeline" && <Pipeline isAdmin={isAdmin} />}
      {tab === "live" && <LiveDeals isAdmin={isAdmin} />}
      {tab === "intake" && <IntakeQueue />}
      {tab === "rooms" && <DealRooms />}
      {tab === "crawlers" && <CrawlersTab />}
      {tab === "alerts" && <AlertsTab />}
    </div>
  );
}
