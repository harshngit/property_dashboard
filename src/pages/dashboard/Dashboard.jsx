import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  LuBox,
  LuCalendarCheck,
  LuTrophy,
  LuPercent,
  LuClock3,
  LuInfo,
  LuMapPin,
  LuPackageSearch,
} from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../../context/PageTitleContext";
import { InlineSpinner } from "../../components/common/PageLoader";
import {
  fetchBrokerDashboard, fetchBrokerInventory, fetchBrokerFollowups, fetchBrokerPerformance,
} from "../../redux/slices/brokerSlice";

const STATUS_COLORS = ["#22c55e", "#dd2476", "#ff512f"];
const LEAD_STATUSES = ["new", "contacted", "qualified", "hot", "warm", "cold", "won", "lost"];

function formatCurrencyCompact(value) {
  const num = Number(value) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  return `₹${num.toLocaleString()}`;
}

function formatRelative(iso) {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function StatCard({ icon: Icon, label, value, tone = "blue", onClick }) {
  const tones = {
    blue: { iconWrap: "bg-red-50 text-red-600", chip: "bg-red-50 text-red-600" },
    violet: { iconWrap: "bg-coral-50 text-coral-600", chip: "bg-coral-50 text-coral-600" },
    green: { iconWrap: "bg-ink-900/5 text-ink-700", chip: "bg-ink-900/5 text-ink-700" },
    red: { iconWrap: "bg-green-50 text-green-600", chip: "bg-green-50 text-green-600" },
  };
  const currentTone = tones[tone] || tones.blue;

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
      className={`relative overflow-hidden rounded-[24px] border border-line bg-white px-5 py-4 shadow-card ${
        onClick ? "cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-pop" : ""
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff512f_0%,#dd2476_100%)]" />
      <div className="absolute right-4 top-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${currentTone.iconWrap}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="font-body text-[1.9rem] font-semibold tracking-[-0.05em] text-ink-950">{value}</p>
      <p className="mt-1 text-[12px] font-medium text-ink-700">{label}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, actions, children, className = "" }) {
  return (
    <section className={`rounded-[28px] border border-line bg-white p-6 shadow-card ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 text-[1rem] font-semibold text-ink-900">
          {Icon ? <Icon className="h-4.5 w-4.5 text-red-600" /> : null}
          {title}
        </h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

// Every widget on this page is driven by GET /broker/* - a self-scoped
// aggregation layer that works for any authenticated user (not just the
// `broker` role), so "my dashboard" is accurate for whoever is logged in.
export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { setTitle } = usePageTitle();

  const { dashboard, dashboardStatus, inventory, inventoryStatus, followups, performance } = useSelector((s) => s.broker);

  useEffect(() => {
    setTitle("Dashboard");
  }, [setTitle]);

  useEffect(() => {
    dispatch(fetchBrokerDashboard());
    dispatch(fetchBrokerInventory({ limit: 8 }));
    dispatch(fetchBrokerFollowups());
    dispatch(fetchBrokerPerformance());
  }, [dispatch]);

  const leadsByStatus = useMemo(() => dashboard?.leadsByStatus || {}, [dashboard]);
  const totalLeads = useMemo(() => Object.values(leadsByStatus).reduce((sum, n) => sum + n, 0), [leadsByStatus]);

  const stats = [
    { label: "My Leads", value: totalLeads, icon: LuBox, tone: "blue", to: "/app/leads" },
    { label: "Follow-ups Due Today", value: dashboard?.tasksDueToday ?? 0, icon: LuCalendarCheck, tone: "violet", to: "/app/tasks" },
    { label: "Leads Won (This Month)", value: dashboard?.leadsWonThisMonth ?? 0, icon: LuTrophy, tone: "green", to: "/app/leads" },
    { label: "Conversion Rate", value: `${performance?.conversionRate ?? 0}%`, icon: LuPercent, tone: "red", to: "/app/reports" },
  ];

  const statusData = useMemo(() => {
    const won = leadsByStatus.won || 0;
    const lost = leadsByStatus.lost || 0;
    const inProgress = Math.max(totalLeads - won - lost, 0);
    return [
      { name: "Won", value: won, fill: STATUS_COLORS[0] },
      { name: "Lost", value: lost, fill: STATUS_COLORS[1] },
      { name: "In Progress", value: inProgress, fill: STATUS_COLORS[2] },
    ];
  }, [leadsByStatus, totalLeads]);

  const pipelineData = useMemo(
    () => LEAD_STATUSES.map((status) => ({ status, count: leadsByStatus[status] || 0 })),
    [leadsByStatus]
  );

  const recentActivity = useMemo(() => {
    const fromFollowups = followups.slice(0, 3).map((t) => ({
      key: `task-${t.id}`,
      title: t.title,
      subtitle: `Due ${new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "2-digit" })}`,
      tag: t.status === "overdue" ? "Overdue" : "Follow-up",
      icon: LuCalendarCheck,
      tone: t.status === "overdue" ? "bg-coral-50 text-coral-600" : "bg-indigo-50 text-indigo-600",
      sortAt: t.dueDate,
    }));
    const fromInventory = inventory.slice(0, 2).map((p) => ({
      key: `prop-${p.id}`,
      title: p.title,
      subtitle: `${p.city} • ${formatRelative(p.createdAt)}`,
      tag: "Listing",
      icon: LuPackageSearch,
      tone: "bg-red-50 text-red-600",
      sortAt: p.createdAt,
    }));
    return [...fromFollowups, ...fromInventory]
      .sort((a, b) => new Date(b.sortAt || 0) - new Date(a.sortAt || 0))
      .slice(0, 4);
  }, [followups, inventory]);

  const isLoading = dashboardStatus === "loading" && !dashboard;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-ink-500">
        <InlineSpinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.label} icon={item.icon} label={item.label} value={item.value} tone={item.tone} onClick={() => navigate(item.to)} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.8fr]">
        <Panel title="Lead Status" icon={LuInfo}>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.8fr] lg:items-center">
            <div className="relative mx-auto h-[290px] w-full max-w-[290px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="48%" outerRadius="92%" barSize={24} data={statusData} startAngle={90} endAngle={-270}>
                  <RadialBar background={{ fill: "#EEF0F7" }} dataKey="value" cornerRadius={18} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center rounded-full border border-line bg-white p-6 shadow-card">
                  <p className="font-body text-2xl font-extrabold text-ink-950">{totalLeads}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Total leads</p>
                </div>
              </div>
            </div>
            <div className="space-y-5">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="h-4 w-4 rounded-full border-[4px] border-white shadow-[0_0_0_1px_rgba(17,20,43,0.08)]" style={{ backgroundColor: item.fill }} />
                    <span className="text-[15px] text-ink-700">{item.name}</span>
                  </div>
                  <span className="font-body text-[1.9rem] font-semibold tracking-[-0.04em] text-ink-950">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Lead Pipeline by Status" icon={LuInfo}>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#EEF0F7" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 12, fill: "#5B6089" }} axisLine={false} tickLine={false} tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
                <YAxis tick={{ fontSize: 12, fill: "#5B6089" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 18, border: "1px solid #E6E8F0", boxShadow: "0 16px 34px -24px rgba(17,20,43,0.18)", fontSize: 12 }} />
                <Bar dataKey="count" fill="#DC2626" radius={[16, 16, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Your Property Inventory" icon={LuInfo}>
        {inventoryStatus === "loading" && inventory.length === 0 ? (
          <div className="flex justify-center py-10"><InlineSpinner className="h-6 w-6 text-ink-400" /></div>
        ) : inventory.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-500">No properties listed yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {inventory.map((property) => (
              <article key={property.id} className="cursor-pointer rounded-[24px] border border-line bg-white p-4 shadow-card" onClick={() => navigate(`/app/properties/${property.id}`)}>
                <div className="relative flex h-[120px] items-center justify-center overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#ff512f_0%,#dd2476_100%)]">
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-red-600 capitalize">
                    {property.status?.replace(/_/g, " ")}
                  </div>
                </div>
                <div className="mt-5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate text-[15px] font-semibold text-ink-950">{property.title}</h4>
                    <p className="mt-1 inline-flex items-center gap-2 text-[13px] text-ink-500">
                      <LuMapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{[property.locality, property.city].filter(Boolean).join(", ")}</span>
                    </p>
                  </div>
                  <p className="whitespace-nowrap font-body text-[1.1rem] font-semibold tracking-[-0.04em] text-red-600">{formatCurrencyCompact(property.price)}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-2 text-[12px] text-ink-700 shadow-card">Bed {property.bedrooms || 0}</span>
                  <span className="rounded-full bg-white px-3 py-2 text-[12px] text-ink-700 shadow-card">Bath {property.bathrooms || 0}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.45fr]">
        <Panel title="Recent Activity" icon={LuClock3}>
          {recentActivity.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-500">Nothing recent yet.</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.key} className="rounded-[22px] border border-line bg-white px-4 py-4 shadow-card">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${activity.tone}`}>
                        <activity.icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink-900">{activity.title}</p>
                        <p className="mt-1 text-xs text-ink-500">{activity.subtitle}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${activity.tone}`}>{activity.tag}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Top Properties" icon={LuPackageSearch}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-semibold text-ink-500">
                  <th className="pb-4">Property</th>
                  <th className="pb-4">Type</th>
                  <th className="pb-4">Price</th>
                  <th className="pb-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.slice(0, 5).map((row) => (
                  <tr key={row.id} className="cursor-pointer border-b border-line/70" onClick={() => navigate(`/app/properties/${row.id}`)}>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-red-100" />
                        <div>
                          <p className="text-sm font-medium text-ink-900">{row.title}</p>
                          <p className="text-xs text-ink-500">{row.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-sm capitalize text-ink-700">{row.propertyType?.replace(/_/g, " ")}</td>
                    <td className="py-4 text-sm text-ink-700">{formatCurrencyCompact(row.price)}</td>
                    <td className="py-4 text-sm capitalize text-ink-700">{row.status?.replace(/_/g, " ")}</td>
                  </tr>
                ))}
                {inventory.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-sm text-ink-500">No properties yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
