import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import ListStatsStrip from "../../components/common/ListStatsStrip";
import StatusBadge from "../../components/common/StatusBadge";
import ActionMenu from "../../components/common/ActionMenu";
import { ConfirmDialog } from "../../components/common/Modal";
import { PROPERTIES } from "../../data/mockData";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";

const PROPERTY_MEDIA = {
  "PR-501": { image: "/loginbg.jpg", position: "50% 54%", beds: 3, baths: 2, area: "2,480 sqft" },
  "PR-498": { image: "/loginbg.jpg", position: "52% 28%", beds: 2, baths: 2, area: "1,420 sqft" },
  "PR-492": { image: "/loginbg.jpg", position: "50% 64%", beds: 4, baths: 3, area: "4,180 sqft" },
  "PR-487": { image: "/loginbg.jpg", position: "48% 40%", beds: 3, baths: 2, area: "2,950 sqft" },
  "PR-480": { image: "/loginbg.jpg", position: "58% 34%", beds: 0, baths: 2, area: "8,600 sqft" },
};

export default function PropertiesList() {
  const navigate = useNavigate();
  const toast = useToast();
  const { permissions } = useAuth();
  const [rows, setRows] = useState(PROPERTIES);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [txnFilter, setTxnFilter] = useState("All");
  const [toDelete, setToDelete] = useState(null);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !normalizedQuery || [row.title, row.location, row.id, row.listedBy]
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      const matchesType = typeFilter === "All" || row.type === typeFilter;
      const matchesStatus = statusFilter === "All" || row.status === statusFilter;
      const matchesTxn = txnFilter === "All" || row.txn === txnFilter;
      return matchesQuery && matchesType && matchesStatus && matchesTxn;
    });
  }, [rows, query, typeFilter, statusFilter, txnFilter]);

  const propertyStats = [
    { label: "Total Listings", value: rows.length, meta: "all properties" },
    { label: "Active", value: rows.filter((row) => row.status === "Active").length, meta: "live inventory" },
    { label: "Pending Approval", value: rows.filter((row) => row.status === "Pending Approval").length, meta: "awaiting review" },
    { label: "Total Units", value: rows.reduce((sum, row) => sum + Number(row.units || 0), 0), meta: "sellable stock" },
  ];

  const getActions = (row) => [
    { label: "View listing", icon: LuEye, onClick: () => navigate(`/app/properties/${row.id}`) },
    { label: "Edit property", icon: LuPencil, onClick: () => navigate(`/app/properties/${row.id}/edit`), hidden: !permissions.edit },
    { label: "Approve listing", icon: LuCircleCheck, onClick: () => toast.push(`${row.title} approved.`, "success"), hidden: !permissions.approve || row.status !== "Pending Approval" },
    { label: "Deactivate", icon: LuCircleX, onClick: () => toast.push(`${row.title} marked inactive.`, "info"), hidden: !permissions.edit || row.status === "Inactive" },
    { label: "Delete listing", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: !permissions.delete },
  ];

  const confirmDelete = () => {
    setRows((current) => current.filter((item) => item.id !== toDelete.id));
    toast.push(`${toDelete.title} deleted.`, "success");
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
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-transparent font-semibold text-ink-700 outline-none">
              <option>All</option>
              <option>Apartment</option>
              <option>Villa</option>
              <option>Commercial</option>
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-card">
            <StatusBadge value={statusFilter === "All" ? "Status" : statusFilter} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-transparent font-semibold text-ink-700 outline-none">
              <option>All</option>
              <option>Active</option>
              <option>Pending Approval</option>
              <option>Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm shadow-card">
            <LuBuilding2 className="h-4 w-4 text-ink-500/70" />
            <select value={txnFilter} onChange={(e) => setTxnFilter(e.target.value)} className="bg-transparent font-semibold text-ink-700 outline-none">
              <option>All</option>
              <option>Sale</option>
              <option>Rent</option>
              <option>Lease</option>
            </select>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filteredRows.map((row) => {
          const media = PROPERTY_MEDIA[row.id] || PROPERTY_MEDIA["PR-501"];
          return (
            <article key={row.id} className="flex h-full min-h-[368px] flex-col overflow-hidden rounded-[22px] border border-line bg-white shadow-card transition-transform duration-200 hover:-translate-y-0.5">
              <div className="relative  overflow-hidden px-3.5 pt-4">
                <img
                  src={media.image}
                  alt={row.title}
                  className="w-full h-[300px] rounded-[18px] object-cover"
                  style={{ objectPosition: media.position }}
                />
                <div className="absolute inset-x-3.5 bottom-0 h-8 rounded-b-[18px] bg-[linear-gradient(180deg,transparent,rgba(17,20,43,0.12))]" />
              </div>

              <div className="flex flex-1 flex-col px-4  pb-4 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h3 className="line-clamp-1 text-[16px] font-bold leading-tight text-ink-950">{row.title}</h3>
                    <p className="flex items-center gap-1.5 text-[12px] text-ink-500">
                      <LuMapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-1">{row.location}</span>
                    </p>
                  </div>
                  <ActionMenu items={getActions(row)} />
                </div>

                <div className="mt-3 flex min-h-[30px] flex-wrap gap-1.5">
                  <StatusBadge value={row.status} />
                  <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold text-ink-700">{row.type}</span>
                  <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-semibold text-ink-700">{row.txn}</span>
                </div>

                <div className="mt-4 mb-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px] text-ink-700">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <LuBedDouble className="h-3.5 w-3.5 shrink-0 text-[#dd2476]" />
                    <span>{media.beds ? `${media.beds} Bedrooms` : "Open layout"}</span>
                  </div>
                  <div className="flex items-center gap-1.5  whitespace-nowrap">
                    <LuBath className="h-3.5 w-3.5 shrink-0 text-[#dd2476]" />
                    <span>{media.baths} {media.baths === 1 ? "Bathroom" : "Bathrooms"}</span>
                  </div>
                 
                </div>

                <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">Price</p>
                    <p className="mt-1 text-[16px] font-extrabold leading-tight text-ink-950">{row.price}</p>
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
          );
        })}
      </div>

      {filteredRows.length === 0 && (
        <div className="mt-6 rounded-[24px] border border-dashed border-line bg-white px-6 py-12 text-center text-sm text-ink-500">
          No listings match the current filters.
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this listing?"
        description={`${toDelete?.title} will be removed and unlinked from any open leads.`}
      />
    </div>
  );
}
