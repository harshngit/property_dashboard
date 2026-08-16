import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import PropertyForm from "./PropertyForm";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { fetchPropertyById, clearCurrentProperty } from "../../redux/slices/propertiesSlice";

export default function PropertyEdit() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current: property, status } = useSelector((s) => s.properties);

  useEffect(() => {
    dispatch(fetchPropertyById(id));
    return () => dispatch(clearCurrentProperty());
  }, [dispatch, id]);

  if (!property || property.id !== id) {
    return status === "failed"
      ? <EmptyState title="Property not found" subtitle={`No property with id ${id}.`} />
      : (
        <div className="flex items-center justify-center py-24 text-ink-500">
          <InlineSpinner className="h-6 w-6" />
        </div>
      );
  }

  return <PropertyForm mode="edit" property={property} />;
}
