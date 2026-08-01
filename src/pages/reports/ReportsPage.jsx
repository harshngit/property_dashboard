import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { LuDownload, LuUsers, LuBuilding2, LuHandshake, LuWallet, LuMessageCircle, LuSparkles } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import { LEAD_TREND } from "../../data/mockData";
import { useToast } from "../../components/common/ToastProvider";

const REPORTS = [
  { icon: LuHandshake, title: "Lead Source & Status", desc: "New, contacted, qualified, won and lost leads." },
  { icon: LuUsers, title: "Broker Performance", desc: "Leads handled, conversion and commission by broker." },
  { icon: LuBuilding2, title: "Property Conversion", desc: "Inquiry-to-visit and visit-to-booking rates." },
  { icon: LuWallet, title: "Revenue & Commission", desc: "Collections, milestones and commission payouts." },
  { icon: LuMessageCircle, title: "WhatsApp Activity", desc: "Template sends, delivery and response rates." },
  { icon: LuSparkles, title: "AI Qualification Review", desc: "Scoring accuracy and manual override trends." },
];

export default function ReportsPage() {
  const toast = useToast();
  return (
    <div>
      <PageHeader
        eyebrow="Analytics & Reports"
        title="Reports"
        subtitle="Lead, property, broker, conversion and revenue reports in one place."
      />

      <div className="card mb-6 p-5">
        <h3 className="font-display text-base font-bold text-ink-950">Lead volume trend</h3>
        <p className="mb-4 text-xs text-ink-500">Last 7 days, all sources</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={LEAD_TREND}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E6E8F0" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#5B6089" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#5B6089" }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E6E8F0", fontSize: 12 }} />
            <Line type="monotone" dataKey="leads" stroke="#2B3A67" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="deals" stroke="#DC2626" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
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
            <button onClick={() => toast.push(`Exporting "${r.title}"…`, "info")} className="btn-outline btn-sm mt-4 w-fit">
              <LuDownload className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
