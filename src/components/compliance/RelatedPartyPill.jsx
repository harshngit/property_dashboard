import { LuUsers } from "react-icons/lu";

// Sec. 33.12: shown on a listing, inquiry or deal in which an employee or
// their disclosed family is a party. It is never assigned to that employee.
export default function RelatedPartyPill({ show }) {
  if (!show) return null;
  return (
    <span title="An A R Buildwel employee or their disclosed family is a party. It is never assigned to them and is reviewed on the Compliance Dashboard." className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
      <LuUsers className="h-3 w-3" /> Related party
    </span>
  );
}
