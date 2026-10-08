import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LuArrowRight, LuCircleCheck, LuCircle } from "react-icons/lu";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";

// What happens to an enquiry, and what to do next:
//   New -> Contacted -> Qualified -> Deal opened -> Closed (won / lost).
// Once it is qualified, "Open deal" creates the deal (stage: Lead) and the
// deal page takes over - site visit, negotiation, legal, loan, insurance,
// payment and closure, with invoices. Closing the deal closes the enquiry.
// Also shows what kind of enquiry it is and the answers from the form.

const DETAIL_LABEL = {
  loanAmount: "Loan amount", propertyValue: "Property value", employment: "Employment", coverType: "Cover wanted", serviceNeeded: "Service needed",
  propertyType: "Property type", city: "City / locality", areaSqft: "Area (sq ft)", expectedPrice: "Expected price", country: "Country of residence",
  ticketSize: "Ticket size", institutionType: "Institution type", budget: "Budget",
};
const MONEY = new Set(["loanAmount", "propertyValue", "expectedPrice", "ticketSize", "budget"]);

export default function LeadJourneyCard({ leadId, onChanged }) {
  const call = useApiCall();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: j, reload } = useApiQuery(`/enquiries/leads/${leadId}/journey`);
  const [busy, setBusy] = useState(false);
  if (!j) return null;

  const startDeal = async () => {
    setBusy(true);
    try {
      const res = await call(`/enquiries/leads/${leadId}/start-deal`, { method: "POST" });
      toast.push(res.data.created ? "Deal opened." : "Opening the existing deal.", "success");
      onChanged?.();
      navigate(`/app/deals/${res.data.dealId}`);
    } catch (err) {
      toast.push(err.message, "error");
      reload();
    } finally {
      setBusy(false);
    }
  };
  const details = Object.entries(j.enquiryDetails || {});

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Enquiry journey</h3>
        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-ink-700">{j.enquiryLabel}{j.enquiryTopic ? ` · ${j.enquiryTopic}` : ""}</span>
      </div>

      <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2">
        {j.steps.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${s.done ? "text-emerald-700" : "text-ink-400"}`}>
              {s.done ? <LuCircleCheck className="h-4 w-4" /> : <LuCircle className="h-4 w-4" />} {s.label}
            </span>
            {i < j.steps.length - 1 && <LuArrowRight className="h-3.5 w-3.5 text-ink-300" />}
          </li>
        ))}
      </ol>

      <div className="mt-4 rounded-xl bg-surface-muted p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Next step</p>
        <p className="mt-1 text-sm text-ink-800">{j.next.text}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {j.next.action === "start_deal" && <button className="btn-primary btn-sm" disabled={busy} onClick={startDeal}>Open deal</button>}
          {j.next.action === "qualify" && <button className="btn-outline btn-sm" disabled={busy} onClick={startDeal}>Qualify and open deal</button>}
          {j.next.action === "visit_request" && <Link to="/app/enquiries?tab=visits" className="btn-primary btn-sm">Go to site visit requests</Link>}
          {j.deal && <Link to={`/app/deals/${j.deal.id}`} className="btn-primary btn-sm">Open deal · {j.deal.stageLabel}</Link>}
        </div>
      </div>

      {j.deal && (
        <p className="mt-3 text-xs text-ink-500">
          Deal opened {formatDate(j.deal.created_at)}{j.deal.deal_value ? ` · value ${formatINR(j.deal.deal_value)}` : ""}.
        </p>
      )}
      {details.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 text-sm">
          {details.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-ink-500">{DETAIL_LABEL[k] || titleCase(k.replace(/([A-Z])/g, " $1"))}</dt>
              <dd className="font-semibold text-ink-900">{MONEY.has(k) && Number.isFinite(Number(v)) ? formatINR(Number(v)) : String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      {j.visitRequests.length > 0 && (
        <p className="mt-3 border-t border-line pt-3 text-xs text-ink-600">
          Site visit requested for {formatDate(j.visitRequests[0].preferred_at, true)} · {titleCase(j.visitRequests[0].status)}
        </p>
      )}
    </div>
  );
}
