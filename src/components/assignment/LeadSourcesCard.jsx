import { useApiQuery } from "../../hooks/useApi";
import { formatDate } from "../../lib/format";

// Every source this lead arrived from (lead_source_history - immutable;
// a duplicate from another portal adds a row instead of a second lead).
export default function LeadSourcesCard({ leadId }) {
  const { data } = useApiQuery(leadId ? `/leads/${leadId}/sources` : null);
  if (!data?.length) return null;
  return (
    <div className="card p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Came in from</p>
      <ul className="mt-2 space-y-1.5 text-xs">
        {data.map((s, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span className="font-semibold text-ink-800">
              {s.source_tag}
              {s.ingestion_mode && s.ingestion_mode !== "legacy" ? <span className="font-normal text-ink-500"> · {s.ingestion_mode}</span> : null}
            </span>
            <span className="shrink-0 text-ink-500">{formatDate(s.received_at, true)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
