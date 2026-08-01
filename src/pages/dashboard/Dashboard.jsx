import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { LuArrowRight, LuPhoneCall, LuCalendarClock } from "react-icons/lu";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/common/StatusBadge";
import Avatar from "../../components/common/Avatar";
import useAuth from "../../hooks/useAuth";
import { DASHBOARD_STATS, LEAD_TREND, PIPELINE_CHART, LEADS } from "../../data/mockData";
import { ROLE_LABELS } from "../../config/roles";

export default function Dashboard() {
  const { user, role } = useAuth();
  const stats = DASHBOARD_STATS[role] || [];
  const recentLeads = LEADS.slice(0, 5);

  return (
    <div>
      <PageHeader
        eyebrow={ROLE_LABELS[role]}
        title={`Good to see you, ${user?.name?.split(" ")[0]}`}
        subtitle="Here's what's moving across your pipeline today."
        actions={
          <Link to="/app/leads" className="btn-primary">
            View all leads <LuArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => <StatCard key={s.label} {...s} index={i} />)}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="card p-5 xl:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-ink-950">Leads & deals — last 7 days</h3>
              <p className="text-xs text-ink-500">New leads vs deals closed</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={LEAD_TREND}>
              <defs>
                <linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5C6BB8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#5C6BB8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dealFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DC2626" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6E8F0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#5B6089" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#5B6089" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E6E8F0", fontSize: 12 }} />
              <Area type="monotone" dataKey="leads" stroke="#5C6BB8" strokeWidth={2.5} fill="url(#leadFill)" />
              <Area type="monotone" dataKey="deals" stroke="#DC2626" strokeWidth={2.5} fill="url(#dealFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5 xl:col-span-2">
          <h3 className="font-display text-base font-bold text-ink-950">Pipeline funnel</h3>
          <p className="mb-4 text-xs text-ink-500">Leads by deal stage</p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={PIPELINE_CHART} layout="vertical" margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6E8F0" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 11, fill: "#5B6089" }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E6E8F0", fontSize: 12 }} cursor={{ fill: "#F6F7FB" }} />
              <Bar dataKey="value" fill="#2B3A67" radius={[0, 6, 6, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="card xl:col-span-3">
          <div className="flex items-center justify-between border-b border-line p-5">
            <h3 className="font-display text-base font-bold text-ink-950">Recent leads</h3>
            <Link to="/app/leads" className="text-xs font-semibold text-red-600 hover:text-red-700">View all</Link>
          </div>
          <div className="divide-y divide-line">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={lead.name} size={34} color="#5C6BB8" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">{lead.name}</p>
                    <p className="truncate text-xs text-ink-500">{lead.property}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge value={lead.score} />
                  <span className="hidden text-xs text-ink-500 sm:inline">{lead.updated}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 xl:col-span-2">
          <h3 className="font-display text-base font-bold text-ink-950">Today's follow-ups</h3>
          <p className="mb-4 text-xs text-ink-500">Stay on top of what's due</p>
          <div className="space-y-3">
            {[
              { icon: LuPhoneCall, title: "Call Karan Mehta", time: "11:30 AM", tag: "Hot lead" },
              { icon: LuCalendarClock, title: "Site visit — Palm Grove Villas", time: "3:00 PM", tag: "Booking" },
              { icon: LuPhoneCall, title: "Follow up Neha Bansal", time: "5:30 PM", tag: "New" },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-surface-muted px-3.5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <t.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{t.title}</p>
                  <p className="text-xs text-ink-500">{t.time}</p>
                </div>
                <StatusBadge value={t.tag} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
