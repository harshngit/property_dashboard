import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LuEye, LuShieldCheck, LuUserCheck, LuRefreshCw, LuMessageSquarePlus } from "react-icons/lu";
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
import { formatDate, formatINR, titleCase } from "../../lib/format";

// NRI / HNI investors (Engine 3): verify profiles (verified investors unlock
// full auction / special-situation deals), assign relationship managers, see
// behaviour, and work NRI service requests.

const ADMIN_ROLES = ["admin", "super_admin"];
const REQUEST_STATUSES = ["acknowledged", "in_progress", "awaiting_customer", "completed", "cancelled"].map((v) => ({
  value: v,
  label: titleCase(v),
}));

function typeLabel(p) {
  return [p.is_nri && "NRI", p.is_hni && "HNI"].filter(Boolean).join(" + ");
}

function ticket(p) {
  if (p.ticket_size_min == null && p.ticket_size_max == null) return "—";
  return `${formatINR(p.ticket_size_min)} - ${formatINR(p.ticket_size_max)}`;
}

const TIER_LABELS = { new: "New", engaged: "Engaged", repeat: "Repeat investor", vip: "VIP" };

// Module 38 IRM: relationship tier, stated vs engaged ticket size, deal
// history and the AI's best-matched live deals for this investor.
function IrmPanel({ profileId }) {
  const { data: irm, loading, error } = useApiQuery(profileId ? `/investors/${profileId}/irm` : null);
  if (loading) return <InlineSpinner />;
  if (error) return <p className="text-xs text-red-600">{error}</p>;
  if (!irm) return null;
  const t = irm.ticket || {};
  const stage = (s) => titleCase(s === "deal_interest" ? "interest" : s);
  return (
    <div className="space-y-4 rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-ink-500">Relationship</h4>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${irm.repeatInvestor ? "bg-emerald-50 text-emerald-700" : "bg-surface-muted text-ink-700"}`}>
          {TIER_LABELS[irm.tier] || irm.tier}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
        <div><dt className="text-ink-500">Stated ticket</dt><dd className="font-semibold text-ink-900">{t.statedMin == null && t.statedMax == null ? "—" : `${formatINR(t.statedMin) || "any"} - ${formatINR(t.statedMax) || "any"}`}</dd></div>
        <div><dt className="text-ink-500">Engaged ticket (typical)</dt><dd className="font-semibold text-ink-900">{t.engagedMedian != null ? `${formatINR(t.engagedP25)} - ${formatINR(t.engagedP75)}` : "—"}</dd></div>
        <div><dt className="text-ink-500">Closed deals</dt><dd className="font-semibold text-ink-900">{irm.deals?.closures || 0}{irm.deals?.closures ? ` · ${t.closedTotalDisplay}` : ""}</dd></div>
        <div><dt className="text-ink-500">Active / dropped</dt><dd className="font-semibold text-ink-900">{irm.deals?.active || 0} / {irm.deals?.dropped || 0}</dd></div>
        <div><dt className="text-ink-500">Engagement (180d)</dt><dd className="font-semibold text-ink-900">{irm.engagement?.positive180d || 0} actions · {irm.engagement?.dismissed180d || 0} dismissed</dd></div>
        <div><dt className="text-ink-500">Deal rooms / alerts</dt><dd className="font-semibold text-ink-900">{irm.dealRooms?.approved || 0} approved · {irm.alerts?.sent || 0} alerts sent</dd></div>
      </dl>
      {irm.deals?.interests?.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-ink-700">Deal history</p>
          <ul className="divide-y divide-line rounded-lg border border-line text-xs">
            {irm.deals.interests.slice(0, 8).map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate text-ink-900">{i.title} <span className="text-ink-500">· {i.city} · {formatINR(i.ticket)}</span></span>
                <StatusBadge value={stage(i.stage)} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <p className="mb-1 text-xs font-semibold text-ink-700">AI-matched live deals</p>
        {(irm.aiMatches || []).length === 0 ? (
          <p className="text-xs text-ink-500">No live deals match yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line text-xs">
            {irm.aiMatches.map((m) => (
              <li key={m.deal.id} className="px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <Link to={`/app/deal-room/${m.deal.id}`} className="min-w-0 truncate font-semibold text-ink-900 hover:underline">{m.deal.title}</Link>
                  <span className="shrink-0 font-bold text-red-600">{m.score}%</span>
                </div>
                <p className="text-ink-500">{titleCase(m.deal.listing_category)} · {m.deal.city}{m.reasons?.length ? ` · ${m.reasons.join(" · ")}` : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Segments() {
  const { data, loading, error } = useApiQuery("/investors/irm/segments");
  if (loading) return <InlineSpinner />;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  if (!data) return null;
  const block = (title, obj, fmt = titleCase) => (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">{title}</p>
      {Object.keys(obj || {}).length === 0 ? (
        <p className="text-xs text-ink-500">—</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <li key={k} className="flex items-center justify-between gap-3">
              <span className="text-ink-700">{fmt(k)}</span>
              <span className="font-semibold text-ink-900">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["Investors", data.total], ["Verified", data.verified], ["NRI", data.nri], ["HNI", data.hni], ["Institutional interest", data.institutional]].map(([l, v]) => (
          <div key={l} className="rounded-xl border border-line bg-white p-4">
            <p className="text-xs text-ink-500">{l}</p>
            <p className="mt-1 text-xl font-bold text-ink-950">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {block("By relationship tier", data.byTier, (k) => TIER_LABELS[k] || k)}
        {block("By asset class", data.byAssetClass)}
        {block("By investor category", data.byCategory)}
      </div>
    </div>
  );
}

function InvestorDetail({ profile }) {
  const { data: behaviour, loading } = useApiQuery(profile ? `/investors/${profile.id}/behaviour?days=90` : null);
  // NRI portfolio (properties under management, rent, repatriation) and the
  // HNI portfolio summary for this investor.
  const { data: nriProps } = useApiQuery(profile?.is_nri ? `/nri/properties?investorId=${profile.id}` : null);
  const { data: repat } = useApiQuery(profile?.is_nri ? `/nri/repatriation?investorId=${profile.id}` : null);
  const { data: hni } = useApiQuery(profile?.is_hni ? `/hni/portfolio/summary?investorId=${profile.id}` : null);
  if (!profile) return null;
  return (
    <div className="space-y-5 text-sm">
      <IrmPanel profileId={profile.id} />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {[
          ["Type", typeLabel(profile)],
          ["Verification", titleCase(profile.verification_status)],
          ["Residency", titleCase(profile.residency_status)],
          ["Country", profile.country_of_residence],
          ["Investor category", titleCase(profile.investor_category)],
          ["Ticket size", ticket(profile)],
          ["Preferred cities", (profile.preferred_cities || []).join(", ")],
          ["Interested in", (profile.asset_class_preferences || []).map(titleCase).join(", ")],
          ["Needs help with", (profile.property_interest_types || []).map(titleCase).join(", ")],
          ["Time zone", profile.time_zone],
          ["Risk appetite", titleCase(profile.risk_appetite)],
          ["Manager", profile.manager_name || "Unassigned"],
          ["Email", profile.email],
          ["Mobile", profile.mobile],
        ]
          .filter(([, v]) => v && v !== "—")
          .map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-ink-500">{label}</dt>
              <dd className="font-medium text-ink-900">{value}</dd>
            </div>
          ))}
      </dl>
      <div>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Deal activity (90 days)</h4>
        {loading ? (
          <InlineSpinner />
        ) : behaviour ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {Object.entries(behaviour.byAction || {}).map(([action, count]) => (
                <span key={action} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink-700">
                  {titleCase(action)}: {count}
                </span>
              ))}
              {Object.keys(behaviour.byAction || {}).length === 0 && <span className="text-xs text-ink-500">No activity yet.</span>}
            </div>
            {behaviour.topCities?.length > 0 && (
              <p className="text-xs text-ink-500">Top cities: {behaviour.topCities.map((c) => `${c.city} (${c.count})`).join(", ")}</p>
            )}
            {behaviour.ticketSize?.median != null && <p className="text-xs text-ink-500">Median ticket viewed: {formatINR(behaviour.ticketSize.median)}</p>}
          </div>
        ) : null}
      </div>
      {profile.is_nri && (
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">NRI properties ({(nriProps || []).length})</h4>
          {(nriProps || []).length === 0 ? (
            <p className="text-xs text-ink-500">No properties added yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {nriProps.map((p) => (
                <li key={p.id} className="px-3 py-2">
                  <p className="font-semibold text-ink-900">{p.title} <span className="font-normal text-ink-500">· {p.city}</span></p>
                  <p className="text-xs text-ink-500">
                    {titleCase(p.occupancy_status)} · {titleCase(p.management_status)}
                    {p.monthly_rent_expected ? ` · rent ${formatINR(p.monthly_rent_expected)}/mo` : ""}
                    {Number(p.rent_outstanding) > 0 ? ` · ${formatINR(p.rent_outstanding)} outstanding` : ""}
                    {p.tenant_name ? ` · tenant ${p.tenant_name} (${p.tenant_phone_masked || "no phone"})` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {repat?.summary && (
            <p className="mt-2 text-xs text-ink-500">
              Repatriation FY {repat.summary.financialYear}: US$ {Number(repat.summary.completedUsd || 0).toLocaleString("en-IN")} of US$ {Number(repat.summary.annualLimitUsd).toLocaleString("en-IN")} used
              ({repat.summary.utilisationPercent}%) · {(repat.items || []).length} record(s)
            </p>
          )}
        </div>
      )}
      {profile.is_hni && hni && (
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">HNI portfolio</h4>
          <p className="text-xs text-ink-700">
            {hni.positions?.active || 0} active · {hni.positions?.exitPlanned || 0} exit planned · {hni.positions?.exited || 0} exited
          </p>
          <p className="text-xs text-ink-700">
            Invested {hni.totals?.investedDisplay} · now {hni.totals?.currentValueDisplay}
            {hni.totals?.unrealisedGainPercent != null ? ` (${hni.totals.unrealisedGainPercent}%)` : ""}
            {hni.totals?.netYieldPercent != null ? ` · net yield ${hni.totals.netYieldPercent}%` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

function ServiceRequests() {
  const toast = useToast();
  const call = useApiCall();
  const managers = useStaffOptions();
  const [assigning, setAssigning] = useState(null);
  const [assignee, setAssignee] = useState("");
  const { data, loading, reload } = useApiQuery("/nri/service-requests?limit=100");
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ status: "acknowledged", message: "", internal: "" });
  const [detail, setDetail] = useState(null);

  const openRequest = async (row) => {
    setActive(row.raw);
    setForm({ status: row.raw.status === "submitted" ? "acknowledged" : row.raw.status, message: "", internal: "" });
    setDetail(null);
    try {
      const res = await call(`/nri/service-requests/${row.raw.id}`);
      setDetail(res.data);
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const save = async () => {
    try {
      if (form.internal) {
        await call(`/nri/service-requests/${active.id}/updates`, { method: "POST", body: { message: form.internal, isInternal: true } });
      }
      if (form.status !== active.status) {
        await call(`/nri/service-requests/${active.id}/status`, { method: "PUT", body: { status: form.status, message: form.message || undefined } });
      } else if (form.message) {
        await call(`/nri/service-requests/${active.id}/updates`, { method: "POST", body: { message: form.message } });
      }
      toast.push("Request updated.", "success");
      setActive(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const rows = (data?.items || []).map((r) => ({
    id: r.id,
    title: r.title,
    investor: r.investor_name,
    type: titleCase(r.request_type),
    priority: titleCase(r.priority),
    status: titleCase(r.status),
    manager: r.assigned_manager_name || "Unassigned",
    sla: r.sla_breached ? "Breached" : formatDate(r.sla_due_at, true),
    raw: r,
  }));

  return (
    <>
      <DataTable
        columns={[
          { key: "title", label: "Request" },
          { key: "investor", label: "Investor" },
          { key: "type", label: "Type" },
          { key: "priority", label: "Priority" },
          { key: "manager", label: "Manager" },
          { key: "sla", label: "First response due", render: (r) => <span className={r.raw.sla_breached ? "font-semibold text-coral-600" : ""}>{r.sla}</span> },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
        ]}
        data={rows}
        loading={loading}
        searchKeys={["title", "investor", "type"]}
        filters={[
          { key: "status", label: "Status", options: ["Submitted", ...REQUEST_STATUSES.map((s) => s.label)] },
          { key: "priority", label: "Priority", options: ["Urgent", "High", "Medium", "Low"] },
        ]}
        getActions={(row) => [
          { label: "Open & update", icon: LuMessageSquarePlus, onClick: () => openRequest(row) },
          {
            label: "Assign manager",
            icon: LuUserCheck,
            onClick: () => {
              setAssignee(row.raw.assigned_manager_id || "");
              setAssigning(row.raw);
            },
          },
        ]}
        emptyTitle="No NRI service requests"
        emptySubtitle="Requests raised by NRI investors appear here."
      />
      <Modal open={!!assigning} onClose={() => setAssigning(null)} title="Assign request" description={assigning?.title}>
        <div className="space-y-4">
          <SelectField label="Relationship manager" value={assignee} onChange={(e) => setAssignee(e.target.value)} options={managers} placeholder="Select a team member" />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setAssigning(null)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!assignee}
              onClick={async () => {
                try {
                  await call(`/nri/service-requests/${assigning.id}/assign`, { method: "PUT", body: { managerId: assignee } });
                  toast.push("Request assigned.", "success");
                  setAssigning(null);
                  reload();
                } catch (err) {
                  toast.push(err.message, "error");
                }
              }}
            >
              Assign
            </button>
          </div>
        </div>
      </Modal>
      <Modal open={!!active} onClose={() => setActive(null)} title={active?.title} description={`${active?.investor_name} • ${titleCase(active?.request_type)}`} maxWidth="max-w-xl">
        {active && (
          <div className="space-y-4">
            {active.description && <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-ink-700">{active.description}</p>}
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {!detail ? (
                <InlineSpinner />
              ) : (
                detail.timeline.map((t) => (
                  <div key={t.id} className={`rounded-lg px-3 py-2 text-xs ${t.is_internal ? "bg-amber-50 text-amber-900" : "bg-surface-muted text-ink-700"}`}>
                    <span className="font-semibold">{t.author_name || "System"}</span> • {formatDate(t.created_at, true)}
                    {t.to_status && <span> • {titleCase(t.from_status || "")} → {titleCase(t.to_status)}</span>}
                    {t.is_internal && <span> • internal</span>}
                    {t.message && <p className="mt-1 whitespace-pre-line">{t.message}</p>}
                  </div>
                ))
              )}
            </div>
            <SelectField label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} options={REQUEST_STATUSES} />
            <TextareaField label="Update for the investor (optional)" rows={2} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
            <TextareaField label="Internal note - never shown to the investor (optional)" rows={2} value={form.internal} onChange={(e) => setForm((f) => ({ ...f, internal: e.target.value }))} />
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setActive(null)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export default function InvestorsPage() {
  const toast = useToast();
  const call = useApiCall();
  const { role } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(role);
  const [tab, setTab] = useState("investors");
  const { data, loading, error, reload } = useApiQuery("/investors?limit=100");
  const { data: segments } = useApiQuery("/investors/irm/segments");
  const managers = useStaffOptions();
  const [viewing, setViewing] = useState(null);
  const [verifying, setVerifying] = useState(null);
  const [verifyForm, setVerifyForm] = useState({ status: "verified", notes: "" });
  const [assigning, setAssigning] = useState(null);
  const [managerId, setManagerId] = useState("");

  const rows = useMemo(
    () =>
      (data?.items || []).map((p) => ({
        id: p.id,
        name: p.full_name,
        type: typeLabel(p),
        country: p.country_of_residence || "—",
        ticket: ticket(p),
        manager: p.manager_name || "Unassigned",
        verification: titleCase(p.verification_status),
        joined: formatDate(p.created_at),
        tier: TIER_LABELS[(segments?.tiers || []).find((t) => t.profileId === p.id)?.tier] || "—",
        raw: p,
      })),
    [data, segments]
  );

  const verify = async () => {
    try {
      await call(`/investors/${verifying.id}/verify`, { method: "PUT", body: { status: verifyForm.status, notes: verifyForm.notes || undefined } });
      toast.push(`Investor ${verifyForm.status}.`, "success");
      setVerifying(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const assign = async () => {
    try {
      await call(`/investors/${assigning.id}/assign-manager`, { method: "PUT", body: { managerId } });
      toast.push("Relationship manager assigned.", "success");
      setAssigning(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const items = data?.items || [];
  const statsItems = [
    { label: "Investors", value: items.length, meta: "NRI and HNI profiles" },
    { label: "Pending verification", value: items.filter((p) => p.verification_status === "pending").length, meta: "needs review" },
    { label: "NRI", value: items.filter((p) => p.is_nri).length, meta: "non-resident investors" },
    { label: "Unassigned", value: items.filter((p) => !p.assigned_manager_id).length, meta: "no relationship manager" },
  ];

  return (
    <div>
      <PageHeader eyebrow="NRI & HNI" title="Investors" subtitle="Verify investor profiles, assign relationship managers and handle NRI service requests." />

      <div className="mb-4 flex gap-1 rounded-lg bg-surface-muted p-1 sm:w-fit">
        {[
          ["investors", "Investors"],
          ["segments", "Segments"],
          ["requests", "NRI service requests"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold ${tab === key ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {tab === "requests" ? (
        <ServiceRequests />
      ) : tab === "segments" ? (
        <Segments />
      ) : (
        <DataTable
          columns={[
            { key: "name", label: "Investor" },
            { key: "type", label: "Type" },
            { key: "country", label: "Country" },
            { key: "ticket", label: "Ticket size" },
            { key: "manager", label: "Manager" },
            { key: "tier", label: "Tier" },
            { key: "verification", label: "Verification", render: (r) => <StatusBadge value={r.verification} /> },
            { key: "joined", label: "Joined" },
          ]}
          data={rows}
          loading={loading}
          statsItems={statsItems}
          searchKeys={["name", "country", "manager"]}
          filters={[
            { key: "verification", label: "Verification", options: ["Pending", "Verified", "Rejected"] },
            { key: "type", label: "Type", options: ["NRI", "HNI", "NRI + HNI"] },
            { key: "tier", label: "Tier", options: Object.values(TIER_LABELS) },
          ]}
          getActions={(row) => [
            { label: "View profile", icon: LuEye, onClick: () => setViewing(row.raw) },
            {
              label: "Verify / reject",
              icon: LuShieldCheck,
              onClick: () => {
                setVerifyForm({ status: row.raw.verification_status === "verified" ? "rejected" : "verified", notes: "" });
                setVerifying(row.raw);
              },
            },
            {
              label: "Assign manager",
              icon: LuUserCheck,
              hidden: !isAdmin,
              onClick: () => {
                setManagerId(row.raw.assigned_manager_id || "");
                setAssigning(row.raw);
              },
            },
          ]}
          renderCard={(r) => (
            <div>
              <p className="font-semibold text-ink-900">{r.name}</p>
              <p className="mt-1 text-xs text-ink-500">{r.type} • {r.country}</p>
              <div className="mt-3"><StatusBadge value={r.verification} /></div>
              <p className="mt-3 text-xs text-ink-500">{r.ticket} • {r.manager}</p>
            </div>
          )}
          emptyTitle="No investor profiles yet"
          emptySubtitle="Investors create their NRI / HNI profile from the website."
        />
      )}

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.full_name} description="Investor profile" maxWidth="max-w-2xl">
        <InvestorDetail profile={viewing} />
      </Modal>

      <Modal open={!!verifying} onClose={() => setVerifying(null)} title="Investor verification" description={verifying?.full_name}>
        <div className="space-y-4">
          <SelectField
            label="Decision"
            value={verifyForm.status}
            onChange={(e) => setVerifyForm((f) => ({ ...f, status: e.target.value }))}
            options={[
              { value: "verified", label: "Verified - unlock full deal access" },
              { value: "rejected", label: "Rejected" },
              { value: "pending", label: "Back to pending" },
            ]}
          />
          <TextareaField label="Notes (shown to the investor when rejecting)" rows={3} value={verifyForm.notes} onChange={(e) => setVerifyForm((f) => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setVerifying(null)}>Cancel</button>
            <button className="btn-primary" onClick={verify}>Save</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!assigning} onClose={() => setAssigning(null)} title="Assign relationship manager" description={assigning?.full_name}>
        <div className="space-y-4">
          <SelectField label="Manager" value={managerId} onChange={(e) => setManagerId(e.target.value)} options={managers} placeholder="Select a team member" />
          <p className="text-xs text-ink-500">Open NRI service requests move to the new manager.</p>
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setAssigning(null)}>Cancel</button>
            <button className="btn-primary" disabled={!managerId} onClick={assign}>
              <LuRefreshCw className="h-4 w-4" /> Assign
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
