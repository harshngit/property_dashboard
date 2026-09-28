// Shared display formatters for API values (numbers arrive as strings from
// Postgres NUMERIC columns).

export function formatINR(value, { compact = true } = {}) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (compact && n >= 1e7) return `₹${Number((n / 1e7).toFixed(2))} Cr`;
  if (compact && n >= 1e5) return `₹${Number((n / 1e5).toFixed(2))} L`;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function formatDate(value, withTime = false) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return withTime ? `${date}, ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : date;
}

export function titleCase(value) {
  if (!value) return "—";
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function shortId(id, prefix = "") {
  return id ? `${prefix}${String(id).slice(0, 8).toUpperCase()}` : "—";
}
