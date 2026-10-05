const MAP = {
  hot: "badge-hot", warm: "badge-warm", cold: "badge-cold",
  won: "badge-won", lost: "badge-lost", booking: "badge-won",
  active: "badge-active", inactive: "badge-inactive",
  "pending approval": "badge-pending", new: "badge-cold",
  contacted: "badge-warm", "site visit": "badge-warm",
  negotiation: "badge-warm", documentation: "badge-cold",
  lead: "badge-cold", requirement: "badge-cold", match: "badge-warm", "legal coordination": "badge-warm",
  "loan referral": "badge-warm", "insurance referral": "badge-warm", "payment confirmation": "badge-pending",
  // payments / documents / reviews
  success: "badge-won", paid: "badge-won", approved: "badge-won", verified: "badge-won",
  published: "badge-won", completed: "badge-won", closure: "badge-won", converted: "badge-won",
  confirmed: "badge-won",
  initiated: "badge-pending", pending: "badge-pending", "needs review": "badge-pending",
  submitted: "badge-pending", "under review": "badge-pending", overridden: "badge-warm",
  failed: "badge-lost", rejected: "badge-lost", refunded: "badge-inactive", dropped: "badge-lost",
  cancelled: "badge-inactive", duplicate: "badge-inactive", closed: "badge-inactive",
  assigned: "badge-warm", "in progress": "badge-warm", acknowledged: "badge-warm",
  lead: "badge-cold", "deal interest": "badge-warm", "due diligence": "badge-warm",
};

export default function StatusBadge({ value }) {
  const key = String(value || "").toLowerCase().replace(/_/g, " ");
  const cls = MAP[key] || "badge bg-ink-900/5 text-ink-500";
  return <span className={cls}>{typeof value === "string" ? value.replace(/_/g, " ") : value}</span>;
}
