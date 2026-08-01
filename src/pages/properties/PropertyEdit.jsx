import { useParams } from "react-router-dom";
import PropertyForm from "./PropertyForm";
import { PROPERTIES } from "../../data/mockData";
import EmptyState from "../../components/common/EmptyState";

export default function PropertyEdit() {
  const { id } = useParams();
  const property = PROPERTIES.find((p) => p.id === id);

  if (!property) return <EmptyState title="Property not found" subtitle={`No property with id ${id}.`} />;

  return (
    <PropertyForm
      mode="edit"
      initial={{
        title: property.title, type: property.type, txn: property.txn,
        location: property.location, price: property.price, units: String(property.units),
        status: property.status, amenities: "", description: "",
      }}
    />
  );
}
