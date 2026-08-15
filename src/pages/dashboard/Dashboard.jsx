import { useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts";
import {
  LuBox,
  LuChevronDown,
  LuCircleDollarSign,
  LuClock3,
  LuFilter,
  LuInfo,
  LuLayoutList,
  LuMapPin,
  LuPackageSearch,
  LuSearch,
  LuSettings2,
  LuTrendingDown,
  LuTrendingUp,
} from "react-icons/lu";
import { usePageTitle } from "../../context/PageTitleContext";
import useAuth from "../../hooks/useAuth";
import { DASHBOARD_STATS, LEAD_TREND, LEADS, PROPERTIES, DEALS } from "../../data/mockData";

const KPI_ICONS = [LuBox, LuLayoutList, LuTrendingUp, LuTrendingDown];
const STATUS_COLORS = ["#ff512f", "#dd2476", "#ff512f"];

function formatCurrencyCompact(value) {
  if (typeof value === "string") return value;
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${value.toLocaleString()}`;
}

function parseMetricValue(raw, fallback) {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    if (raw.includes("Cr")) return Number.parseFloat(raw) * 10000000;
    if (raw.includes("L")) return Number.parseFloat(raw) * 100000;
    const num = Number.parseFloat(raw.replace(/[^\d.]/g, ""));
    if (!Number.isNaN(num)) return num;
  }
  return fallback;
}

function StatCard({ icon: Icon, label, value, tone = "blue", index = 0 }) {
  const tones = {
    blue: {
      iconWrap: "bg-red-50 text-red-600",
      chip: "bg-red-50 text-red-600",
      graphic: "#ff512f",
      graphicSoft: "#ffd4cb",
    },
    violet: {
      iconWrap: "bg-coral-50 text-coral-600",
      chip: "bg-coral-50 text-coral-600",
      graphic: "#dd2476",
      graphicSoft: "#f6c3dd",
    },
    green: {
      iconWrap: "bg-ink-900/5 text-ink-700",
      chip: "bg-ink-900/5 text-ink-700",
      graphic: "#ff512f",
      graphicSoft: "#ffd4cb",
    },
    red: {
      iconWrap: "bg-green-50 text-green-600",
      chip: "bg-green-50 text-green-600",
      graphic: "#dd2476",
      graphicSoft: "#f6c3dd",
    },
  };
  const currentTone = tones[tone] || tones.blue;

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-line bg-white px-5 py-4 shadow-card">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff512f_0%,#dd2476_100%)]" />
      <div className="absolute right-4 top-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${currentTone.iconWrap}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p className="font-body text-[1.9rem] font-semibold tracking-[-0.05em] text-ink-950">{value}</p>
      <p className="mt-1 text-[12px] font-medium text-ink-700">{label}</p>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${currentTone.chip}`}>
            ↗ {["98%", "72%", "44.2%", "70%"][index] || "18%"}
          </span>
          <span className="text-[11px] text-ink-500">Last year</span>
        </div>

        <div className="h-[60px] w-[112px]">
          {index === 0 && (
            <svg viewBox="0 0 130 72" className="h-full w-full">
              <path d="M22 56C22 35 40 18 64 18C81 18 96 27 105 41" fill="none" stroke={currentTone.graphicSoft} strokeWidth="11" strokeLinecap="round" />
              <path d="M22 56C22 35 40 18 64 18C81 18 96 27 105 41" fill="none" stroke={currentTone.graphic} strokeWidth="11" strokeLinecap="round" strokeDasharray="86 140" />
            </svg>
          )}

          {index === 1 && (
            <div className="flex h-full items-end justify-end gap-1.5">
              {[22, 30, 26, 42, 34, 56].map((h, barIndex) => (
                <div
                  key={h}
                  className="w-2.5 rounded-full"
                  style={{
                    height: `${h}px`,
                    background: barIndex === 5 ? currentTone.graphic : currentTone.graphicSoft,
                  }}
                />
              ))}
            </div>
          )}

          {index === 2 && (
            <div className="flex h-full items-end justify-end gap-0.5">
              {[52, 34, 16].map((h, blockIndex) => (
                <div
                  key={h}
                  className="w-7 rounded-t-[7px]"
                  style={{
                    height: `${h}px`,
                    background: blockIndex === 0 ? currentTone.graphic : currentTone.graphicSoft,
                    opacity: blockIndex === 0 ? 1 : 0.9 - blockIndex * 0.16,
                  }}
                />
              ))}
            </div>
          )}

          {index === 3 && (
            <div className="flex h-full items-end justify-end gap-1.5">
              {[30, 44, 26, 50, 22, 36, 18].map((h, lineIndex) => (
                <div key={h} className="flex items-end gap-1">
                  <div
                    className="w-2 rounded-full"
                    style={{
                      height: `${h}px`,
                      background: currentTone.graphic,
                    }}
                  />
                  {lineIndex === 2 || lineIndex === 5 ? (
                    <div className="mb-2.5 h-2 w-2 rounded-full" style={{ background: currentTone.graphic }} />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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

export default function Dashboard() {
  const { role } = useAuth();
  const { setTitle } = usePageTitle();

  useEffect(() => {
    setTitle("Dashboard");
  }, [setTitle]);

  const stats = useMemo(() => {
    const raw = DASHBOARD_STATS[role] || [];
    return raw.slice(0, 4).map((item, index) => ({
      label: item.label,
      value: item.value,
      icon: KPI_ICONS[index] || LuBox,
      tone: ["blue", "violet", "green", "red"][index] || "blue",
    }));
  }, [role]);

  const statusData = useMemo(() => {
    const accepted = DEALS.length * 173;
    const rejected = Math.max(LEADS.length * 69 + 3, 486);
    const counter = Math.max(PROPERTIES.length * 33, 165);
    return [
      { name: "Accepted", value: accepted, fill: STATUS_COLORS[0] },
      { name: "Rejected", value: rejected, fill: STATUS_COLORS[1] },
      { name: "Counter Offer", value: counter, fill: STATUS_COLORS[2] },
    ];
  }, []);

  const revenueGenerationData = useMemo(
    () =>
      [
        { month: "Jan", deals: 320000, dealValue: 210000 },
        { month: "Feb", deals: 420000, dealValue: 290000 },
        { month: "Mar", deals: 240000, dealValue: 90000 },
        { month: "Apr", deals: 460000, dealValue: 360000 },
        { month: "May", deals: 340000, dealValue: 210000 },
        { month: "Jun", deals: 180000, dealValue: 45000 },
        { month: "Jul", deals: 290000, dealValue: 230000 },
        { month: "Aug", deals: 440000, dealValue: 310000 },
        { month: "Sep", deals: 610000, dealValue: 470000 },
        { month: "Oct", deals: 430000, dealValue: 300000 },
        { month: "Nov", deals: 210000, dealValue: 120000 },
        { month: "Dec", deals: 300000, dealValue: 250000 },
      ],
    []
  );

  const recentActivity = [
    {
      title: `Lead ${LEADS[0]?.id}`,
      subtitle: `${LEADS[0]?.name} • 14 Aug 26`,
      tag: "New Lead",
      icon: LuPackageSearch,
      tone: "bg-red-50 text-red-600",
    },
    {
      title: `Deal ${DEALS[0]?.id}`,
      subtitle: `${DEALS[0]?.customer} • 12 Aug 26`,
      tag: "Booking",
      icon: LuCircleDollarSign,
      tone: "bg-red-50 text-red-600",
    },
    {
      title: `Promo Push ${PROPERTIES[0]?.title}`,
      subtitle: `Applied 52 times • 8 Aug 26`,
      tag: "Campaign",
      icon: LuTrendingUp,
      tone: "bg-coral-50 text-coral-600",
    },
    {
      title: "System Update",
      subtitle: "Version 1.2.1 • 2 Aug 26",
      tag: "System",
      icon: LuClock3,
      tone: "bg-surface-muted text-ink-700",
    },
  ];

  const topRows = useMemo(() => {
    const defaults = [6200, 3200, 1800, 2400, 850];
    return PROPERTIES.slice(0, 5).map((property, index) => ({
      id: property.id,
      title: property.title,
      location: property.location,
      stocks: defaults[index] || 1000,
      sales: Math.max(800, defaults[index] - 1400),
      price: property.price,
      earnings: formatCurrencyCompact(parseMetricValue(property.price, 199000) * 3.2),
      chip: ["bg-red-100", "bg-red-50", "bg-coral-50", "bg-red-100", "bg-red-50"][index] || "bg-surface-muted",
    }));
  }, []);

  const propertyCards = useMemo(() => {
    const visuals = [
      "bg-[linear-gradient(135deg,#ff512f_0%,#dd2476_100%)]",
      "bg-[linear-gradient(135deg,#ff512f_0%,#dd2476_100%)]",
      "bg-[linear-gradient(135deg,#ff512f_0%,#dd2476_100%)]",
      "bg-[linear-gradient(135deg,#ff512f_0%,#dd2476_100%)]",
    ];

    return PROPERTIES.slice(0, 4).map((property, index) => ({
      ...property,
      visual: visuals[index] || visuals[0],
      beds: [3, 4, 2, 2][index] || 3,
      baths: [2, 3, 2, 1][index] || 2,
      area: [1400, 2000, 1400, 1200][index] || 1500,
      priceDisplay: property.price.includes("Cr") || property.price.includes("L") ? property.price : `₹${property.price}`,
    }));
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item, index) => (
          <StatCard key={item.label} icon={item.icon} label={item.label} value={item.value} tone={item.tone} index={index} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.8fr]">
        <Panel
          title="Status Analysis"
          icon={LuInfo}
          actions={
            <button type="button" className="btn-outline btn-sm rounded-2xl">
              Last year <LuChevronDown className="h-4 w-4" />
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.8fr] lg:items-center">
            <div className="relative mx-auto h-[290px] w-full max-w-[290px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="48%"
                  outerRadius="92%"
                  barSize={24}
                  data={statusData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar background={{ fill: "#EEF0F7" }} dataKey="value" cornerRadius={18} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center rounded-full border border-line bg-white p-6 shadow-card">
                  <div className="h-4 w-10 rounded-full bg-red-100" />
                  <div className="mt-2 h-1 w-8 rounded-full bg-red-600" />
                  <div className="mt-2 h-1 w-10 rounded-full bg-ink-500" />
                  <div className="mt-2 h-1 w-7 rounded-full bg-coral-500" />
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

        <Panel
          title="Revenue Generation"
          icon={LuInfo}
          actions={
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-5 text-sm">
                <span className="inline-flex items-center gap-2 text-ink-700">
                  <span className="h-4 w-8 rounded-full bg-red-200" />
                  Deals
                </span>
                <span className="inline-flex items-center gap-2 text-ink-700">
                  <span className="h-4 w-8 rounded-full bg-red-600" />
                  Deal value
                </span>
              </div>
              <button type="button" className="btn-outline btn-sm rounded-2xl">
                Last year <LuChevronDown className="h-4 w-4" />
              </button>
            </div>
          }
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueGenerationData} barGap={-18} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="#EEF0F7" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#5B6089" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: "#5B6089" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 18,
                    border: "1px solid #E6E8F0",
                    boxShadow: "0 16px 34px -24px rgba(17,20,43,0.18)",
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [formatCurrencyCompact(Number(value)), name === "deals" ? "Deals" : "Deal value"]}
                />
                <Bar dataKey="deals" fill="#FECACA" radius={[16, 16, 0, 0]} maxBarSize={40} />
                <Bar dataKey="dealValue" fill="#DC2626" radius={[16, 16, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel
        title="Explore Your Properties"
        icon={LuInfo}
        actions={
          <div className="flex items-center gap-3">
            <label className="flex min-w-[220px] items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm shadow-card">
              <LuSearch className="h-4 w-4 text-ink-500" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-transparent text-ink-900 outline-none placeholder:text-ink-500/60"
              />
            </label>
            <button type="button" className="btn-outline rounded-2xl">
              <LuFilter className="h-4 w-4" />
              Filter
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {propertyCards.map((property) => (
            <article
              key={property.id}
              className="rounded-[24px] border border-line bg-white p-4 shadow-card"
            >
              <div className={`relative h-[172px] overflow-hidden rounded-[20px] ${property.visual}`}>
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,81,47,0.10),rgba(221,36,118,0.26))]" />
                <button
                  type="button"
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/18 text-white backdrop-blur"
                >
                  <LuInfo className="h-4 w-4" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-[linear-gradient(180deg,transparent,rgba(221,36,118,0.40))]" />
                <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-red-600">
                  Premium
                </div>
              </div>

              <div className="mt-5 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-[15px] font-semibold text-ink-950">{property.title}</h4>
                  <p className="mt-1 inline-flex items-center gap-2 text-[13px] text-ink-500">
                    <LuMapPin className="h-4 w-4" />
                    {property.location}
                  </p>
                </div>
                <p className="font-body text-[1.25rem] font-semibold tracking-[-0.04em] text-red-600">
                  {property.priceDisplay}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-2 text-[12px] text-ink-700 shadow-card">
                  Bed {property.beds}
                </span>
                <span className="rounded-full bg-white px-3 py-2 text-[12px] text-ink-700 shadow-card">
                  Bath {property.baths}
                </span>
                <span className="rounded-full bg-white px-3 py-2 text-[12px] text-ink-700 shadow-card">
                  {property.area} sqft
                </span>
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.45fr]">
        <Panel
          title="Recent Activity"
          icon={LuClock3}
          actions={
            <button type="button" className="btn-outline btn-sm rounded-2xl">
              See All
            </button>
          }
        >
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.title} className="rounded-[22px] border border-line bg-white px-4 py-4 shadow-card">
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
        </Panel>

        <Panel
          title="Top Properties"
          icon={LuPackageSearch}
          actions={
            <div className="flex items-center gap-3">
              <button type="button" className="btn-outline btn-sm rounded-2xl">
                <LuSettings2 className="mr-2 inline h-4 w-4" />
                Sort
              </button>
              <button type="button" className="btn-outline btn-sm rounded-2xl">
                <LuFilter className="mr-2 inline h-4 w-4" />
                Filter
              </button>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-semibold text-ink-500">
                  <th className="pb-4">Property</th>
                  <th className="pb-4">Stocks</th>
                  <th className="pb-4">Price</th>
                  <th className="pb-4">Sales</th>
                  <th className="pb-4">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {topRows.map((row) => (
                  <tr key={row.id} className="border-b border-line/70">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${row.chip}`} />
                        <div>
                          <p className="text-sm font-medium text-ink-900">{row.title}</p>
                          <p className="text-xs text-ink-500">{row.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-sm text-ink-700">{row.stocks.toLocaleString()}</td>
                    <td className="py-4 text-sm text-ink-700">{row.price}</td>
                    <td className="py-4 text-sm text-ink-700">{row.sales.toLocaleString()}</td>
                    <td className="py-4 text-sm font-medium text-ink-950">{row.earnings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
