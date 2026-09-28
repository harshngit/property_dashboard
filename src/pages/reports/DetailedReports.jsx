import { useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { buildQuery, useApiQuery } from "../../hooks/useApi";
import useStaffOptions from "../../hooks/useStaffOptions";
import { formatINR, titleCase } from "../../lib/format";

// Screen 11 analytics: conversion funnel (lead -> visit -> negotiation ->
// closure with drop-off), leads by status / source, broker performance,
// listings, and revenue / collections - for a chosen date range.

function Breakdown({ title, data }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + Number(v), 0) || 1;
  return (
    <div className="card p-5">
      <h4 className="mb-3 text-sm font-bold text-ink-950">{title}</h4>
      {entries.length === 0 ? (
        <p className="text-xs text-ink-500">No data in this range.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-xs text-ink-700"><span>{titleCase(k.replace(/_/g, " "))}</span><span className="font-semibold">{v}</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${(Number(v) / total) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DetailedReports() {
  const [range, setRange] = useState({ from: "", to: "" });
  const qs = buildQuery(range);
  const leads = useApiQuery(`/reports/leads${qs}`);
  const properties = useApiQuery(`/reports/properties${qs}`);
  const brokers = useApiQuery(`/reports/brokers${qs}`);
  const conversion = useApiQuery(`/reports/conversion${qs}`);
  const payments = useApiQuery(`/reports/payments${qs}`);
  const revenue = useApiQuery(`/reports/revenue${qs}`);
  const staff = useStaffOptions(["broker", "internal_sales", "agency_admin", "admin", "super_admin"]);
  const nameOf = useMemo(() => {
    const map = new Map(staff.map((s) => [s.value, s.label.replace(/ \(.*\)$/, "")]));
    return (id) => (id === "unassigned" ? "Unassigned" : map.get(id) || `${String(id).slice(0, 8)}…`);
  }, [staff]);

  const funnel = (conversion.data?.funnel || []).map((f) => ({ ...f, label: titleCase(f.stage.replace(/_/g, " ")) }));
  const byUser = Object.fromEntries(Object.entries(leads.data?.byAssignedUser || {}).map(([id, n]) => [nameOf(id), n]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-ink-950">Detailed analytics</h3>
          <p className="text-xs text-ink-500">Leave dates blank for all time.</p>
        </div>
        <div className="flex gap-2">
          <input type="date" className="field-input h-9 w-40" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
          <input type="date" className="field-input h-9 w-40" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Closed-won deal value", formatINR(revenue.data?.totalDealValueClosedWon) || "₹0"],
          ["Commission earned", formatINR(revenue.data?.totalCommission) || "₹0"],
          ["Collected (milestones)", formatINR(payments.data?.totalCollected) || "₹0"],
          ["Pending / overdue", `${formatINR(payments.data?.totalPending) || "₹0"} / ${formatINR(payments.data?.totalOverdue) || "₹0"}`],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-ink-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h4 className="mb-3 text-sm font-bold text-ink-950">Conversion funnel</h4>
        {funnel.length === 0 ? (
          <p className="text-xs text-ink-500">No data.</p>
        ) : (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#E51C23" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-600">
              {funnel.filter((f) => f.dropOffPercent != null).map((f) => (
                <span key={f.stage} className="rounded-full bg-surface-muted px-2.5 py-1">{f.label}: {f.dropOffPercent}% drop-off</span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Breakdown title="Leads by status" data={leads.data?.byStatus} />
        <Breakdown title="Leads by source" data={leads.data?.bySource} />
        <Breakdown title="Leads by owner" data={byUser} />
        <Breakdown title="Listings by status" data={properties.data?.byStatus} />
        <Breakdown title="Listings by type" data={properties.data?.byType} />
        <Breakdown title="Listings by deal type" data={properties.data?.byTransactionType} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
            <tr><th className="px-5 py-3">Team member</th><th className="px-5 py-3">Leads assigned</th><th className="px-5 py-3">Converted</th><th className="px-5 py-3">Conversion</th><th className="px-5 py-3">Tasks done</th><th className="px-5 py-3">Overdue</th><th className="px-5 py-3">Deal value</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(brokers.data || []).map((b) => (
              <tr key={b.brokerId}>
                <td className="px-5 py-3 font-semibold text-ink-900">{nameOf(b.brokerId)}</td>
                <td className="px-5 py-3">{b.leadsAssigned}</td>
                <td className="px-5 py-3">{b.leadsConverted}</td>
                <td className="px-5 py-3">{b.leadsAssigned ? `${Math.round((b.leadsConverted / b.leadsAssigned) * 100)}%` : "—"}</td>
                <td className="px-5 py-3">{b.tasksCompleted}</td>
                <td className={`px-5 py-3 ${b.tasksOverdue ? "font-semibold text-coral-600" : ""}`}>{b.tasksOverdue}</td>
                <td className="px-5 py-3">{formatINR(revenue.data?.dealValueByBroker?.[b.brokerId]) || "—"}</td>
              </tr>
            ))}
            {(brokers.data || []).length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-ink-500">No team activity in this range.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
