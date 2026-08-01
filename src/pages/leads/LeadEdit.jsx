import { useParams } from "react-router-dom";
import LeadForm from "./LeadForm";
import { LEADS } from "../../data/mockData";
import EmptyState from "../../components/common/EmptyState";

export default function LeadEdit() {
  const { id } = useParams();
  const lead = LEADS.find((l) => l.id === id);

  if (!lead) return <EmptyState title="Lead not found" subtitle={`No lead with id ${id}.`} />;

  return (
    <LeadForm
      mode="edit"
      initial={{
        name: lead.name, phone: lead.phone, email: "", source: lead.source,
        property: lead.property, budget: lead.budget, score: lead.score,
        status: lead.status, owner: lead.owner, notes: "",
      }}
    />
  );
}
