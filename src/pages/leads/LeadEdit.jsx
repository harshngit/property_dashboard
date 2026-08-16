import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import LeadForm from "./LeadForm";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { fetchLeadById, clearCurrentLead } from "../../redux/slices/leadsSlice";

export default function LeadEdit() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current: lead, status } = useSelector((s) => s.leads);

  useEffect(() => {
    dispatch(fetchLeadById(id));
    return () => dispatch(clearCurrentLead());
  }, [dispatch, id]);

  if (!lead || lead.id !== id) {
    return status === "failed"
      ? <EmptyState title="Lead not found" subtitle={`No lead with id ${id}.`} />
      : (
        <div className="flex items-center justify-center py-24 text-ink-500">
          <InlineSpinner className="h-6 w-6" />
        </div>
      );
  }

  return <LeadForm mode="edit" lead={lead} />;
}
