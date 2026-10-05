import { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { LuDownload, LuUsers, LuBuilding2, LuHandshake, LuWallet, LuMessageCircle, LuSparkles } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import { API_BASE_URL } from "../../config/api";
import { useApiQuery } from "../../hooks/useApi";
import DetailedReports from "./DetailedReports";

// `report` is the backend export type (GET /reports/export?report=...);
// cards without one link elsewhere or aren't available yet.
const REPORTS = [
  { icon: LuHandshake, title: "Lead Source & Status", desc: "New, contacted, qualified, won and lost leads.", report: "leads" },
  { icon: LuUsers, title: "Broker Performance", desc: "Leads handled, conversion and commission by broker.", report: "brokers" },
  { icon: LuBuilding2, title: "Property Conversion", desc: "Lead-to-visit and visit-to-legal rates.", report: "conversion" },
  { icon: LuWallet, title: "Revenue & Commission", desc: "Collections, milestones and commission payouts.", report: "revenue" },
  { icon: LuMessageCircle, title: "WhatsApp Activity", desc: "Template sends, delivery and response rates.", note: "Available once the WhatsApp integration is live." },
  { icon: LuSparkles, title: "AI Qualification Review", desc: "Scoring accuracy and manual override trends.", link: "/app/ai" },
];

const RANGES = [7, 30, 90];

export default function ReportsPage() {
  const toast = useToast();
  const token = useSelector((s) => s.auth.accessToken);
  const [days, setDays] = useState(7);
  const [exporting, setExporting] = useState(null);
  const { data: trend, loading } = useApiQuery(`/reports/trend?days=${days}`);

  const exportReport = async (report, title) => {
    setExporting(report);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/export?report=${report}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report}-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.push(`"${title}" exported.`, "success");
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setExporting(null);
    }
  };

  const series = (trend?.series || []).map((d) => ({ ...d, label: days <= 7 ? d.day : d.date.slice(5) }));

  return (
    <div>
      <PageHeader eyebrow="Analytics & Reports" title="Reports" subtitle="Lead, property, broker, conversion and revenue reports in one place." />

      <div className="card mb-6 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-ink-950">Lead & deal trend</h3>
            <p className="text-xs text-ink-500">New leads, new deals and deals won per day - last {days} days</p>
          </div>
          <div className="flex gap-1 rounded-lg bg-surface-muted p-1">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDays(r)}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${days === r ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="flex h-[220px] items-center justify-center"><InlineSpinner /></div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6E8F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5B6089" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#5B6089" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E6E8F0", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" name="Leads" dataKey="leads" stroke="#2B3A67" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" name="Deals" dataKey="deals" stroke="#DC2626" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" name="Won" dataKey="won" stroke="#16A34A" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r) => (
          <div key={r.title} className="card flex flex-col justify-between p-5">
            <div>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
                <r.icon className="h-5 w-5" />
              </div>
              <h4 className="font-display text-sm font-bold text-ink-950">{r.title}</h4>
              <p className="mt-1 text-xs text-ink-500">{r.desc}</p>
            </div>
            {r.report ? (
              <button onClick={() => exportReport(r.report, r.title)} disabled={exporting === r.report} className="btn-outline btn-sm mt-4 w-fit">
                {exporting === r.report ? <InlineSpinner /> : <LuDownload className="h-3.5 w-3.5" />} Export CSV
              </button>
            ) : r.link ? (
              <Link to={r.link} className="btn-outline btn-sm mt-4 w-fit">Open</Link>
            ) : (
              <p className="mt-4 text-xs text-ink-400">{r.note}</p>
            )}
          </div>
        ))}
      </div>

      <DetailedReports />
    </div>
  );
}
