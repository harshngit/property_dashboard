import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LuArrowLeft, LuPencil, LuMapPin, LuLayers, LuBuilding, LuCircleCheck, LuCircleX, LuIndianRupee } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import QuickFormModal from "../../components/common/QuickFormModal";
import { InlineSpinner } from "../../components/common/PageLoader";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";
import {
  fetchPropertyById, clearCurrentProperty, approveProperty, rejectProperty, updatePropertyPrice,
} from "../../redux/slices/propertiesSlice";
import { fetchLeads } from "../../redux/slices/leadsSlice";

const STATUS_LABELS = {
  draft: "Draft", pending_approval: "Pending Approval", approved: "Approved",
  rejected: "Rejected", inactive: "Inactive",
};
const typeLabel = (t) => t?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const formatPrice = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const { permissions } = useAuth();

  const { current: property, status } = useSelector((s) => s.properties);
  const { list: leads } = useSelector((s) => s.leads);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchPropertyById(id));
    dispatch(fetchLeads({ limit: 100 }));
    return () => dispatch(clearCurrentProperty());
  }, [dispatch, id]);

  const linkedLeads = useMemo(() => leads.filter((l) => l.propertyId === id), [leads, id]);

  if (!property || property.id !== id) {
    if (status === "failed") return <EmptyState title="Property not found" subtitle={`No property with id ${id}.`} />;
    return (
      <div className="flex items-center justify-center py-24 text-ink-500">
        <InlineSpinner className="h-6 w-6" />
      </div>
    );
  }

  const handleApprove = async () => {
    const res = await dispatch(approveProperty(property.id));
    if (approveProperty.fulfilled.match(res)) toast.push("Listing approved.", "success");
    else toast.push(res.payload || "Failed to approve listing.", "error");
  };

  const handleReject = async (data) => {
    const res = await dispatch(rejectProperty({ id: property.id, reason: data.reason }));
    if (rejectProperty.fulfilled.match(res)) toast.push("Listing rejected.", "success");
    else toast.push(res.payload || "Failed to reject listing.", "error");
    setRejectOpen(false);
  };

  const handlePriceSave = async (data) => {
    const res = await dispatch(updatePropertyPrice({ id: property.id, price: Number(data.price) }));
    if (updatePropertyPrice.fulfilled.match(res)) toast.push("Price updated.", "success");
    else toast.push(res.payload || "Failed to update price.", "error");
    setPriceOpen(false);
  };

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
        <LuArrowLeft className="h-4 w-4" /> Back to properties
      </button>
      <PageHeader
        eyebrow={property.id}
        title={property.title}
        subtitle={[property.locality, property.city].filter(Boolean).join(", ")}
        actions={
          <>
            {permissions.approve && property.status === "pending_approval" && (
              <>
                <button onClick={handleApprove} className="btn-outline"><LuCircleCheck className="h-4 w-4" /> Approve</button>
                <button onClick={() => setRejectOpen(true)} className="btn-outline text-coral-600"><LuCircleX className="h-4 w-4" /> Reject</button>
              </>
            )}
            {permissions.edit && (
              <button onClick={() => setPriceOpen(true)} className="btn-outline"><LuIndianRupee className="h-4 w-4" /> Update price</button>
            )}
            <button onClick={() => navigate(`/app/properties/${property.id}/edit`)} className="btn-primary">
              <LuPencil className="h-4 w-4" /> Edit listing
            </button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          {property.media?.[0]?.url ? (
            <img src={property.media[0].url} alt={property.title} className="mb-4 h-40 w-full rounded-xl object-cover" />
          ) : (
            <div className="mb-4 flex h-40 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ff512f_0%,#dd2476_100%)] text-white">
              <LuBuilding className="h-10 w-10 opacity-80" />
            </div>
          )}
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-ink-500">Status</span><StatusBadge value={STATUS_LABELS[property.status] || property.status} /></div>
            <div className="flex items-center justify-between"><span className="text-ink-500">Type</span><span className="font-semibold text-ink-900">{typeLabel(property.propertyType)}</span></div>
            <div className="flex items-center justify-between"><span className="text-ink-500">Transaction</span><span className="font-semibold text-ink-900">{typeLabel(property.transactionType)}</span></div>
            <div className="flex items-center justify-between"><span className="text-ink-500">Listed by</span><span className="font-semibold text-ink-900">{property.brokerName || property.builderName || property.createdByName || "—"}</span></div>
            {property.status === "rejected" && property.rejectionReason && (
              <div className="rounded-lg bg-coral-50 px-3 py-2 text-xs text-coral-700">Rejected: {property.rejectionReason}</div>
            )}
          </div>
          <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex items-center gap-2 text-ink-700"><LuMapPin className="h-4 w-4 text-indigo-500" /> {[property.locality, property.city].filter(Boolean).join(", ")}</div>
            <div className="flex items-center gap-2 text-ink-700"><LuLayers className="h-4 w-4 text-indigo-500" /> {property.areaSqft ? `${property.areaSqft} sqft • ` : ""}{formatPrice(property.price)}</div>
          </div>
          {property.description && (
            <p className="mt-4 border-t border-line pt-4 text-sm text-ink-700">{property.description}</p>
          )}
        </div>

        <div className="card p-6 lg:col-span-2">
          <h3 className="font-display text-base font-bold text-ink-950">Inquiries linked to this listing</h3>
          <p className="mb-4 text-xs text-ink-500">{linkedLeads.length} inquiries generated so far</p>
          {linkedLeads.length === 0 ? (
            <EmptyState title="No inquiries yet" subtitle="Leads generated from this listing will show up here." />
          ) : (
            <div className="space-y-3">
              {linkedLeads.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{l.customerName || "Unknown"}</p>
                    <p className="text-xs text-ink-500">{l.customerMobile || l.customerEmail || "—"}</p>
                  </div>
                  <StatusBadge value={l.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <QuickFormModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onSubmit={handleReject}
        title="Reject this listing?"
        description={`Explain why ${property.title} is being rejected.`}
        fields={[{ key: "reason", label: "Rejection reason", placeholder: "e.g. Photos don't match the address", full: true }]}
        initial={{}}
        submitLabel="Reject listing"
      />

      <QuickFormModal
        open={priceOpen}
        onClose={() => setPriceOpen(false)}
        onSubmit={handlePriceSave}
        title="Update price"
        description={`Set a new price for ${property.title}.`}
        fields={[{ key: "price", label: "Price", type: "number", full: true }]}
        initial={{ price: property.price }}
        submitLabel="Update price"
      />
    </div>
  );
}
