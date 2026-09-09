import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  LuPlus,
  LuEye,
  LuPencil,
  LuTrash2,
  LuCircleCheck,
  LuCircleX,
  LuSearch,
  LuMapPin,
  LuBedDouble,
  LuBath,
  LuArrowRight,
  LuBuilding2,
  LuSlidersHorizontal,
  LuIndianRupee,
  LuShieldCheck,
} from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import ListStatsStrip from "../../components/common/ListStatsStrip";
import StatusBadge from "../../components/common/StatusBadge";
import ActionMenu from "../../components/common/ActionMenu";
import Select from "../../components/common/Select";
import { ConfirmDialog } from "../../components/common/Modal";
import QuickFormModal from "../../components/common/QuickFormModal";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";
import {
  fetchProperties, deleteProperty, bulkDeleteProperties, approveProperty, rejectProperty,
  updatePropertyAvailability, updatePropertyPrice, clearPropertiesError,
} from "../../redux/slices/propertiesSlice";

const PROPERTY_TYPES = ["apartment", "villa", "independent_house", "plot", "commercial", "farmhouse", "other"];
const TRANSACTION_TYPES = ["buy", "sell", "rent"];
const STATUS_LABELS = {
  draft: "Draft", pending_approval: "Pending Approval", approved: "Approved",
  rejected: "Rejected", inactive: "Inactive",
};

const formatPrice = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const typeLabel = (t) => t?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function PropertiesList() {
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch();
  const { permissions } = useAuth();
  const { list: rows, status } = useSelector((s) => s.properties);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [txnFilter, setTxnFilter] = useState("All");
  const [badgeFilter, setBadgeFilter] = useState("All");
  const [toDelete, setToDelete] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [priceTarget, setPriceTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchProperties({ limit: 100 }));
    return () => dispatch(clearPropertiesError());
  }, [dispatch]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => rows.some((row) => row.id === id)));
  }, [rows]);

  const toggleSelection = (id) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((rowId) => rowId !== id) : [...current, id]));
  };

  const confirmBulkDelete = async () => {
    const res = await dispatch(bulkDeleteProperties(selectedIds));
    if (bulkDeleteProperties.fulfilled.match(res)) {
      toast.push(`${res.payload.deletedCount} listing(s) deleted.`, "success");
      setSelectedIds([]);
    } else {
      toast.push(res.payload || "Failed to delete listings.", "error");
    }
    setBulkConfirmOpen(false);
  };

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !normalizedQuery || [row.title, row.city, row.locality, row.brokerName]
        .some((value) => String(value || "").toLowerCase().includes(normalizedQuery));
      const matchesType = typeFilter === "All" || row.propertyType === typeFilter;
      const matchesStatus = statusFilter === "All" || row.status === statusFilter;
      const matchesTxn = txnFilter === "All" || row.transactionType === txnFilter;
      const matchesBadge = badgeFilter === "All" || (badgeFilter === "VERIFIED" ? row.verified : row.badge === badgeFilter);
      return matchesQuery && matchesType && matchesStatus && matchesTxn && matchesBadge;
    });
  }, [rows, query, typeFilter, statusFilter, txnFilter, badgeFilter]);

  const propertyStats = [
    { label: "Total Listings", value: rows.length, meta: "all properties" },
    { label: "Approved", value: rows.filter((row) => row.status === "approved").length, meta: "live inventory" },
    { label: "Pending Approval", value: rows.filter((row) => row.status === "pending_approval").length, meta: "awaiting review" },
    { label: "Rejected", value: rows.filter((row) => row.status === "rejected").length, meta: "needs rework" },
  ];

  const getActions = (row) => [
    { label: "View listing", icon: LuEye, onClick: () => navigate(`/app/properties/${row.id}`) },
    { label: "Edit property", icon: LuPencil, onClick: () => navigate(`/app/properties/${row.id}/edit`), hidden: !permissions.edit },
    { label: "Update price", icon: LuIndianRupee, onClick: () => setPriceTarget(row), hidden: !permissions.edit },
    { label: "Approve listing", icon: LuCircleCheck, onClick: () => handleApprove(row), hidden: !permissions.approve || row.status !== "pending_approval" },
    { label: "Reject listing", icon: LuCircleX, tone: "danger", onClick: () => setRejectTarget(row), hidden: !permissions.approve || row.status !== "pending_approval" },
    { label: row.status === "approved" ? "Mark inactive" : "Mark available", icon: LuCircleX, onClick: () => handleAvailability(row), hidden: !permissions.edit || !["approved", "inactive"].includes(row.status) },
    { label: "Delete listing", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: !permissions.delete },
  ];

  const handleApprove = async (row) => {
    const res = await dispatch(approveProperty(row.id));
    if (approveProperty.fulfilled.match(res)) {
      toast.push(`${row.title} approved.`, "success");
    } else {
      toast.push(res.payload || "Failed to approve listing.", "error");
    }
  };

  const handleReject = async (data) => {
    const res = await dispatch(rejectProperty({ id: rejectTarget.id, reason: data.reason }));
    if (rejectProperty.fulfilled.match(res)) {
      toast.push(`${rejectTarget.title} rejected.`, "success");
    } else {
      toast.push(res.payload || "Failed to reject listing.", "error");
    }
    setRejectTarget(null);
  };

  const handleAvailability = async (row) => {
    const res = await dispatch(updatePropertyAvailability({ id: row.id, isAvailable: row.status !== "approved" }));
    if (updatePropertyAvailability.fulfilled.match(res)) {
      toast.push(`${row.title} marked ${row.status === "approved" ? "inactive" : "available"}.`, "success");
    } else {
      toast.push(res.payload || "Failed to update availability.", "error");
    }
  };

  const handlePriceSave = async (data) => {
    const res = await dispatch(updatePropertyPrice({ id: priceTarget.id, price: Number(data.price) }));
    if (updatePropertyPrice.fulfilled.match(res)) {
      toast.push(`${priceTarget.title}'s price updated.`, "success");
    } else {
      toast.push(res.payload || "Failed to update price.", "error");
    }
    setPriceTarget(null);
  };

  const confirmDelete = async () => {
    const res = await dispatch(deleteProperty(toDelete.id));
    if (deleteProperty.fulfilled.match(res)) {
      toast.push(`${toDelete.title} deleted.`, "success");
    } else {
      toast.push(res.payload || "Failed to delete listing.", "error");
    }
    setToDelete(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Property Listings"
        title="Properties"
        subtitle="Buy, sell and rent listings across every agency and builder."
      />

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-card">
            <LuSlidersHorizontal className="h-4 w-4 text-ink-500/70" />
            <Select
              variant="ghost"
              className="min-w-[8rem]"
              value={typeFilter}
              onChange={setTypeFilter}
              options={["All", ...PROPERTY_TYPES.map((t) => ({ value: t, label: typeLabel(t) }))]}
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-card">
            <StatusBadge value={statusFilter === "All" ? "Status" : STATUS_LABELS[statusFilter]} />
            <Select
              variant="ghost"
              className="min-w-[9.5rem]"
              value={statusFilter}
              onChange={setStatusFilter}
              options={["All", ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]}
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-card">
            <LuBuilding2 className="h-4 w-4 text-ink-500/70" />
            <Select
              variant="ghost"
              className="min-w-[7rem]"
              value={txnFilter}
              onChange={setTxnFilter}
              options={["All", ...TRANSACTION_TYPES.map((t) => ({ value: t, label: typeLabel(t) }))]}
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-card">
            <LuShieldCheck className="h-4 w-4 text-ink-500/70" />
            <Select
              variant="ghost"
              className="min-w-[8.5rem]"
              value={badgeFilter}
              onChange={setBadgeFilter}
              options={["All", "FEATURED", "VERIFIED", "NEW LISTING"]}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {permissions.create && (
            <button onClick={() => navigate("/app/properties/new")} className="btn-primary">
              <LuPlus className="h-4 w-4" /> Add property
            </button>
          )}
          <div className="relative w-full sm:w-80">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search listings..."
              className="field-input bg-white pl-9"
            />
          </div>
        </div>
      </div>

      <ListStatsStrip items={propertyStats} />

      {permissions.delete && selectedIds.length > 0 && (
        <div className="mb-4 flex justify-center">
          <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-[#E9EBF1] bg-white px-4 py-3 shadow-[0_18px_34px_-24px_rgba(17,20,43,0.25)]">
            <span className="pr-2 text-sm font-semibold text-ink-500">{selectedIds.length} Selected</span>
            <button
              type="button"
              onClick={() => setBulkConfirmOpen(true)}
              className="btn-outline btn-sm rounded-xl border-coral-200 text-coral-600 hover:bg-coral-50"
            >
              <LuTrash2 className="h-4 w-4" /> Delete
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ECEEF4] text-ink-500 hover:bg-surface-sunk"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {status === "loading" && rows.length === 0 ? (
        <div className="rounded-[24px] border border-line bg-white px-6 py-16 text-center text-sm text-ink-500">
          Loading properties…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {filteredRows.map((row) => (
            <article key={row.id} className="flex h-full min-h-[368px] flex-col overflow-hidden rounded-[22px] border border-line bg-white shadow-card transition-transform duration-200 hover:-translate-y-0.5">
              <div className="relative overflow-hidden px-3.5 pt-4">
                <img
                  src={row.media?.[0]?.url || "/loginbg.jpg"}
                  alt={row.title}
                  className="h-[300px] w-full rounded-[18px] object-cover"
                />
                <div className="absolute inset-x-3.5 bottom-0 h-8 rounded-b-[18px] bg-[linear-gradient(180deg,transparent,rgba(17,20,43,0.12))]" />
                {permissions.delete && (
                  <label className="absolute left-6 top-6 flex h-6 w-6 items-center justify-center rounded-md bg-white/90 shadow-card">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggleSelection(row.id)}
                      className="h-4 w-4 rounded border-line text-[#ff512f] focus:ring-[#dd2476]"
                    />
                  </label>
                )}
              </div>

              <div className="flex flex-1 flex-col px-4 pb-4 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h3 className="line-clamp-1 text-[16px] font-bold leading-tight text-ink-950">{row.title}</h3>
                    <p className="flex items-center gap-1.5 text-[12px] text-ink-500">
                      <LuMapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-1">{[row.locality, row.city].filter(Boolean).join(", ")}</span>
                    </p>
                  </div>
                  <ActionMenu items={getActions(row)} />
                </div>

                <div className="mt-3 flex min-h-[30px] flex-wrap gap-1.5">
                  <StatusBadge value={STATUS_LABELS[row.status] || row.status} />
                  {row.badge && (
                    <span className="rounded-full bg-[linear-gradient(135deg,#ff512f_0%,#dd2476_100%)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      {row.badge}
                    </span>
                  )}
                  {row.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-ink-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      <LuShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  )}
                  <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold text-ink-700">{typeLabel(row.propertyType)}</span>
                  <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold text-ink-700">{typeLabel(row.transactionType)}</span>
                </div>

                <div className="mt-4 mb-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px] text-ink-700">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <LuBedDouble className="h-3.5 w-3.5 shrink-0 text-[#dd2476]" />
                    <span>{row.bedrooms ? `${row.bedrooms} Bedrooms` : "Open layout"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <LuBath className="h-3.5 w-3.5 shrink-0 text-[#dd2476]" />
                    <span>{row.bathrooms ? `${row.bathrooms} ${row.bathrooms === 1 ? "Bathroom" : "Bathrooms"}` : "—"}</span>
                  </div>
                </div>

                <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">Price</p>
                    <p className="mt-1 text-[16px] font-extrabold leading-tight text-ink-950">{formatPrice(row.price)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/app/properties/${row.id}`)}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-[#dd2476]"
                  >
                    Read more <LuArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {status !== "loading" && filteredRows.length === 0 && (
        <div className="mt-6 rounded-[24px] border border-dashed border-line bg-white px-6 py-12 text-center text-sm text-ink-500">
          No listings match the current filters.
        </div>
      )}

      <QuickFormModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onSubmit={handleReject}
        title="Reject this listing?"
        description={rejectTarget ? `Explain why ${rejectTarget.title} is being rejected.` : ""}
        fields={[{ key: "reason", label: "Rejection reason", placeholder: "e.g. Photos don't match the address", full: true }]}
        initial={{}}
        submitLabel="Reject listing"
      />

      <QuickFormModal
        open={!!priceTarget}
        onClose={() => setPriceTarget(null)}
        onSubmit={handlePriceSave}
        title="Update price"
        description={priceTarget ? `Set a new price for ${priceTarget.title}.` : ""}
        fields={[{ key: "price", label: "Price", type: "number", full: true }]}
        initial={{ price: priceTarget?.price }}
        submitLabel="Update price"
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this listing?"
        description={`${toDelete?.title} will be removed and unlinked from any open leads.`}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        onConfirm={confirmBulkDelete}
        title={`Delete ${selectedIds.length} listings?`}
        description="These listings will be removed and unlinked from any open leads."
      />
    </div>
  );
}
