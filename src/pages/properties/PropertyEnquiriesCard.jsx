import { Link } from "react-router-dom";
import StatusBadge from "../../components/common/StatusBadge";
import { useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";

// Everyone who has enquired on this listing (GET /properties/:id/inquiries)
// with lead status, owner, deal stage and visits.
export default function PropertyEnquiriesCard({ propertyId }) {
  const { data, loading } = useApiQuery(`/properties/${propertyId}/inquiries`);
  const rows = data || [];
  return (
    <div className="card p-5">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Enquiries ({rows.length})</h3>
      {loading && !data ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-500">No enquiries on this listing yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
              <tr><th className="py-2">Customer</th><th className="py-2">Source</th><th className="py-2">Owner</th><th className="py-2">Stage</th><th className="py-2">Received</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2">
                    <Link to={`/app/leads/${r.id}`} className="font-semibold text-ink-900 hover:text-red-600">{r.customer_name || "Unknown"}</Link>
                    <p className="text-xs text-ink-500">{r.customer_mobile || r.customer_email || "—"}</p>
                  </td>
                  <td className="py-2">{titleCase(r.source)}</td>
                  <td className="py-2">{r.assigned_to_name || "Unassigned"}</td>
                  <td className="py-2">
                    <StatusBadge value={titleCase(r.deal_stage || r.status)} />
                    {r.visits ? <span className="ml-1 text-xs text-ink-500">{r.visits} visit(s)</span> : null}
                  </td>
                  <td className="py-2 text-ink-500">{formatDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
