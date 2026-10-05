import { Link } from "react-router-dom";
import { useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR } from "../../lib/format";
import { MandateStatus } from "../../pages/mandates/MandatesPage";

// Module 46 Mandate Status Panel - fixed at the top of Deal Detail, for the
// assigned A R representative and admins. The price range shows figures only
// for the assigned representative / Super Admin (logged); everyone else
// sees "Confidential".

const INST_TONE = { paid: "text-emerald-700", overdue: "text-red-600", invoiced: "text-amber-700" };

function Instalment({ n, i }) {
  if (!i || i.status === "not_triggered") return <p>Instalment {n}: <span className="text-ink-500">not triggered</span></p>;
  return (
    <p>
      Instalment {n}: <b>{formatINR(i.amount, { compact: false })}</b> · <span className={`font-semibold capitalize ${INST_TONE[i.status] || ""}`}>{i.status}</span>
      {i.dueDate && ` · due ${formatDate(i.dueDate)}`}
      {i.daysOverdue > 0 && <span className="font-semibold text-red-600"> ({i.daysOverdue} days overdue)</span>}
    </p>
  );
}

export default function MandateDealPanel({ dealId }) {
  const { data } = useApiQuery(dealId ? `/mandates/deal/${dealId}` : null);
  const mandates = data?.mandates || [];
  if (!mandates.length) return null;
  return (
    <div className="card mb-4 border-l-4 border-l-red-600 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-500">Mandate status</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {mandates.map((m) => (
          <div key={m.id} className="space-y-1 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/app/mandates?id=${m.id}`} className="font-semibold text-red-600 hover:underline">{m.mandateNumber}</Link>
              <span className="capitalize text-ink-700">{m.party} · {m.mandateType}</span>
              <MandateStatus status={m.status} />
            </div>
            <p className="text-xs text-ink-500">
              {m.startDate ? `${formatDate(m.startDate)} – ${m.endDate ? formatDate(m.endDate) : "open"}` : "Starts on acknowledgement"}
              {m.renewalCount > 0 && ` · renewed ${m.renewalCount}×`}
            </p>
            <p>
              {m.party === "seller" ? "Seller price range" : "Buyer budget range"}:{" "}
              {m.priceRange === "confidential" ? (
                <span className="font-semibold text-ink-500">Confidential</span>
              ) : m.party === "seller" ? (
                <b>{m.priceRange.minAcceptablePrice ? `${formatINR(m.priceRange.minAcceptablePrice)} – ${formatINR(m.priceRange.maxListedPrice)}` : "not on file"}</b>
              ) : (
                <b>{m.priceRange.minBudget ? `${formatINR(m.priceRange.minBudget)} – ${formatINR(m.priceRange.maxBudget)}` : "not on file"}</b>
              )}
            </p>
            <p>Professional fee: <b>{m.professionalFeeRate}</b> ({m.gstType})</p>
            {m.professionalFeeIndicative && (
              <p className="text-xs text-ink-500">
                Indicative: fee {formatINR(m.professionalFeeIndicative.fee, { compact: false })} + tax {formatINR(m.professionalFeeIndicative.tax, { compact: false })} = {formatINR(m.professionalFeeIndicative.total, { compact: false })}
              </p>
            )}
            <div className="text-xs">
              <Instalment n={1} i={m.instalment1} />
              <Instalment n={2} i={m.instalment2} />
            </div>
            {m.mandateType === "Exclusive" && (
              <p className="text-xs capitalize text-ink-500">
                {m.party === "seller" && `Valuation: ${String(m.benefits.valuation).replace(/_/g, " ")} · `}
                DD: {String(m.benefits.dueDiligence).replace(/_/g, " ")} · Deed writer: {String(m.benefits.deedWriterWaiver).replace(/_/g, " ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
