import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import Avatar from "../../components/common/Avatar";
import { LuMessageCircle, LuSend, LuCheckCheck } from "react-icons/lu";

const CONVERSATIONS = [
  { name: "Karan Mehta", last: "Sure, I'll be there for the site visit at 4 PM.", time: "2m", unread: false, avatar: "#5C6BB8" },
  { name: "Neha Bansal", last: "Can you share more photos of the 2BHK?", time: "18m", unread: true, avatar: "#FF7A59" },
  { name: "Suresh Iyer", last: "Acknowledgement sent — thank you for your inquiry.", time: "1h", unread: false, avatar: "#DC2626" },
  { name: "Ananya Rao", last: "Property brochure shared via WhatsApp.", time: "3h", unread: false, avatar: "#2B3A67" },
];

const TEMPLATES = [
  { name: "Lead Acknowledgement", status: "Approved" },
  { name: "Property Shared", status: "Approved" },
  { name: "Site Visit Reminder", status: "Approved" },
  { name: "Follow-up Nudge", status: "Pending Approval" },
];

export default function WhatsAppPage() {
  return (
    <div>
      <PageHeader
        eyebrow="WhatsApp Integration"
        title="WhatsApp"
        subtitle="Lead acknowledgement, property sharing and reminders — all in one timeline."
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <div className="border-b border-line p-5">
            <h3 className="font-display text-base font-bold text-ink-950">Recent conversations</h3>
          </div>
          <div className="divide-y divide-line">
            {CONVERSATIONS.map((c) => (
              <div key={c.name} className="flex items-center gap-3 px-5 py-3.5">
                <Avatar name={c.name} color={c.avatar} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink-900">{c.name}</p>
                    <span className="text-xs text-ink-500">{c.time}</span>
                  </div>
                  <p className="flex items-center gap-1 truncate text-xs text-ink-500">
                    <LuCheckCheck className="h-3.5 w-3.5 text-green-500" /> {c.last}
                  </p>
                </div>
                {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-coral-500" />}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-line p-4">
            <LuMessageCircle className="h-4 w-4 text-ink-500" />
            <input placeholder="Message references are read-only in this demo" disabled className="field-input flex-1 bg-surface-muted" />
            <button className="btn-primary btn-sm" disabled><LuSend className="h-3.5 w-3.5" /> Send</button>
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="font-display text-base font-bold text-ink-950">Approved templates</h3>
          <p className="mb-4 text-xs text-ink-500">Only WhatsApp-approved templates can be triggered automatically.</p>
          <div className="space-y-3">
            {TEMPLATES.map((t) => (
              <div key={t.name} className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                <span className="text-sm font-medium text-ink-900">{t.name}</span>
                <StatusBadge value={t.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
