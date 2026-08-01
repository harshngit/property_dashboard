const MAP = {
  hot: "badge-hot", warm: "badge-warm", cold: "badge-cold",
  won: "badge-won", lost: "badge-lost", booking: "badge-won",
  active: "badge-active", inactive: "badge-inactive",
  "pending approval": "badge-pending", new: "badge-cold",
  contacted: "badge-warm", "site visit": "badge-warm",
  negotiation: "badge-warm", documentation: "badge-cold",
};

export default function StatusBadge({ value }) {
  const key = String(value || "").toLowerCase();
  const cls = MAP[key] || "badge bg-ink-900/5 text-ink-500";
  return <span className={cls}>{value}</span>;
}
