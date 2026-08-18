import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  LuArrowLeft, LuPencil, LuMapPin, LuLayers, LuBuilding, LuCircleCheck, LuCircleX, LuIndianRupee,
  LuBedDouble, LuBath, LuChevronLeft, LuChevronRight, LuPhone, LuNavigation, LuClock3, LuTrendingUp,
  LuShieldCheck, LuLayoutGrid, LuStamp, LuStar, LuBriefcase, LuSofa, LuCar, LuLock, LuChevronDown, LuCalendarCheck,
  LuDumbbell, LuWaves, LuSquareParking, LuBaby, LuWifi, LuZap, LuTrees, LuArrowUpDown, LuCctv, LuCheck,
} from "react-icons/lu";
import { usePageTitle } from "../../context/PageTitleContext";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import Avatar from "../../components/common/Avatar";
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

const formatRelative = (iso) => {
  if (!iso) return "—";
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
};

function Fact({ icon: Icon, value, label }) {
  if (value == null || value === "") return null;
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="h-4 w-4 text-red-500" />
      {value}{label ? ` ${label}` : ""}
    </span>
  );
}

function StatInline({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-ink-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 text-sm font-bold text-ink-950">{value}</p>
    </div>
  );
}

// Amenities are stored as plain strings (no icon field) - pick an icon by
// keyword match for display only, no schema change involved.
const AMENITY_ICONS = [
  [/gym|fitness/i, LuDumbbell],
  [/pool|swim/i, LuWaves],
  [/park/i, LuSquareParking],
  [/security|guard|cctv|camera/i, LuCctv],
  [/kids|play/i, LuBaby],
  [/wifi|broadband|internet/i, LuWifi],
  [/power|backup|generator/i, LuZap],
  [/lawn|garden|park(?!ing)/i, LuTrees],
  [/lift|elevator/i, LuArrowUpDown],
];
const amenityIcon = (label) => AMENITY_ICONS.find(([re]) => re.test(label))?.[1] || LuCheck;

function AccordionItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-ink-900"
      >
        {question}
        <LuChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="px-4 pb-3 text-sm text-ink-700">{answer}</p>}
    </div>
  );
}

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const { permissions } = useAuth();

  const { current: property, status } = useSelector((s) => s.properties);
  const { list: leads } = useSelector((s) => s.leads);
  const { setTitle } = usePageTitle();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    dispatch(fetchPropertyById(id));
    dispatch(fetchLeads({ limit: 100 }));
    return () => dispatch(clearCurrentProperty());
  }, [dispatch, id]);

  useEffect(() => {
    setTitle(property?.id === id ? property.title || "Property" : "Property");
  }, [property, id, setTitle]);

  useEffect(() => {
    setActiveImage(0);
  }, [id]);

  useEffect(() => {
    setImageFailed(false);
  }, [activeImage, id]);

  const linkedLeads = useMemo(() => leads.filter((l) => l.propertyId === id), [leads, id]);
  const sortedMedia = useMemo(
    () => [...(property?.media || [])].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0) || (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [property?.media]
  );

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

  const hasLocation = property.latitude != null && property.longitude != null;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
        <LuArrowLeft className="h-4 w-4" /> Back to properties
      </button>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-950">{property.title}</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            {[property.address, property.locality, property.city].filter(Boolean).join(", ") || "No address set"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
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
        </div>
      </div>

      <p className="mb-1 text-sm font-semibold text-green-600">{formatPrice(property.price)}</p>
      <div className="mb-2 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm font-semibold text-ink-700">
        <Fact icon={LuBedDouble} value={property.bedrooms} label="Beds" />
        <Fact icon={LuBath} value={property.bathrooms} label="Baths" />
        <Fact icon={LuLayers} value={property.areaSqft} label="sqft" />
        <Fact icon={LuBuilding} value={typeLabel(property.propertyType)} />
      </div>

      {(property.tags?.length > 0 || property.reraNumber) && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {property.tags?.map((t) => (
            <span key={t} className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-700">{t}</span>
          ))}
          {property.reraNumber && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600">
              <LuStamp className="h-3 w-3" /> RERA Approved — {property.reraNumber}
            </span>
          )}
        </div>
      )}

      <div className="card mb-5 overflow-hidden p-1.5">
        <div className="grid grid-cols-1 gap-1.5 lg:grid-cols-[1.6fr_1fr]">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[linear-gradient(135deg,#ff512f_0%,#dd2476_100%)] lg:aspect-auto">
            {sortedMedia[activeImage]?.url && !imageFailed ? (
              <img
                src={sortedMedia[activeImage].url}
                alt={property.title}
                className="h-full w-full object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-white">
                <LuBuilding className="h-12 w-12 opacity-80" />
              </div>
            )}

            {(property.badge || property.verified) && (
              <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                {property.badge && (
                  <span className="rounded-full bg-[linear-gradient(135deg,#ff512f_0%,#dd2476_100%)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-card">
                    {property.badge}
                  </span>
                )}
                {property.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-ink-950/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-card">
                    <LuShieldCheck className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
            )}

            {sortedMedia.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImage((i) => (i === 0 ? sortedMedia.length - 1 : i - 1))}
                  className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-card hover:bg-white"
                >
                  <LuChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImage((i) => (i === sortedMedia.length - 1 ? 0 : i + 1))}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-card hover:bg-white"
                >
                  <LuChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {(() => {
            const otherMedia = sortedMedia
              .map((m, i) => ({ ...m, index: i }))
              .filter((m) => m.index !== activeImage);
            const visibleThumbs = otherMedia.slice(0, 3);
            const remaining = otherMedia.length - visibleThumbs.length;
            if (!visibleThumbs.length) return null;
            return (
              <div className="grid grid-cols-2 grid-rows-2 gap-1.5">
                {visibleThumbs.map((m, i) => {
                  const isLast = i === visibleThumbs.length - 1 && remaining > 0;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveImage(m.index)}
                      className={`relative overflow-hidden rounded-xl bg-surface-sunk ${i === 0 ? "col-span-2 row-span-1" : "row-span-1"}`}
                    >
                      {m.url ? <img src={m.url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full" />}
                      {isLast && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-ink-950/60 text-white">
                          <LuLayoutGrid className="h-4 w-4" />
                          <span className="text-xs font-bold">+{remaining} More</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="card mb-5 p-6">
        {property.description ? (
          <p className={`text-sm leading-relaxed text-ink-700 ${descExpanded ? "" : "line-clamp-4"}`}>
            {property.description}{" "}
            <button type="button" onClick={() => setDescExpanded((v) => !v)} className="font-semibold text-green-600 hover:underline">
              {descExpanded ? "Show less" : "Read more"}
            </button>
            {descExpanded && property.aboutExtended && (
              <span className="mt-2 block text-ink-700">{property.aboutExtended}</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-ink-500">No description added yet.</p>
        )}
        {property.amenities?.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-line pt-4 sm:grid-cols-3">
            {property.amenities.map((a) => {
              const Icon = amenityIcon(a);
              return (
                <span key={a} className="flex items-center gap-2 text-sm text-ink-700">
                  <Icon className="h-4 w-4 shrink-0 text-red-500" /> {a}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="card mb-5 p-6">
        <h3 className="mb-4 font-display text-base font-bold text-ink-950">Listing snapshot</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
          <StatInline icon={LuIndianRupee} label="Price" value={formatPrice(property.price)} />
          <StatInline icon={LuTrendingUp} label="Price / sqft" value={property.areaSqft ? formatPrice(Math.round(property.price / property.areaSqft)) : "—"} />
          <StatInline icon={LuLayers} label="Super built-up" value={property.areaSqft ? `${property.areaSqft} sqft` : "—"} />
          {property.carpetAreaSqft != null && <StatInline icon={LuLayers} label="Carpet area" value={`${property.carpetAreaSqft} sqft`} />}
          <StatInline icon={LuBedDouble} label="Bedrooms" value={property.bedrooms ?? "—"} />
          <StatInline icon={LuBath} label="Bathrooms" value={property.bathrooms ?? "—"} />
          {property.facing && <StatInline icon={LuNavigation} label="Facing" value={property.facing} />}
          <StatInline icon={LuClock3} label="Listed" value={formatRelative(property.createdAt)} />
        </div>
      </div>

      {(property.possessionStatus || property.floorNumber || property.furnishing || property.parkingSpots != null || property.ageOfProperty || property.gatedCommunity) && (
        <div className="card mb-5 p-6">
          <h3 className="mb-4 font-display text-base font-bold text-ink-950">Property details</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            {property.possessionStatus && <StatInline icon={LuCalendarCheck} label="Possession" value={property.possessionStatus} />}
            {property.floorNumber && <StatInline icon={LuBuilding} label="Floor" value={property.totalFloors ? `${property.floorNumber} of ${property.totalFloors} Floors` : `Floor ${property.floorNumber}`} />}
            {property.furnishing && <StatInline icon={LuSofa} label="Furnishing" value={property.furnishing} />}
            {property.parkingSpots != null && <StatInline icon={LuCar} label="Parking" value={`${property.parkingSpots} ${property.parkingType || ""}`.trim()} />}
            {property.ageOfProperty && <StatInline icon={LuClock3} label="Age" value={property.ageOfProperty} />}
            {property.gatedCommunity && <StatInline icon={LuLock} label="Gated community" value="Yes" />}
          </div>
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <div className="card p-5">
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-500">Listed by</h4>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={property.brokerName || property.builderName || property.createdByName || "—"} size={40} color="#2B3A67" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink-900">{property.brokerName || property.builderName || property.createdByName || "—"}</p>
                <p className="text-xs text-ink-500">{property.brokerName ? "Broker" : property.builderName ? "Builder" : "Team member"}</p>
              </div>
            </div>
            {property.builderName && (property.builderRating != null || property.builderExperienceYears != null || property.builderProjectsCount != null) && (
              <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-xs text-ink-600">
                {property.builderRating != null && (
                  <span className="flex items-center gap-1"><LuStar className="h-3.5 w-3.5 text-amber-500" /> {property.builderRating}</span>
                )}
                {property.builderExperienceYears != null && (
                  <span className="flex items-center gap-1"><LuBriefcase className="h-3.5 w-3.5 text-ink-400" /> {property.builderExperienceYears} yrs</span>
                )}
                {property.builderProjectsCount != null && (
                  <span className="flex items-center gap-1"><LuBuilding className="h-3.5 w-3.5 text-ink-400" /> {property.builderProjectsCount} projects</span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => toast.push("Dialing the listing owner…", "info")}
              className="btn-outline btn-sm mt-4 w-full justify-center"
            >
              <LuPhone className="h-3.5 w-3.5" /> Contact
            </button>
          </div>

          <div className="card space-y-3 p-5 text-sm">
            <div className="flex items-center justify-between"><span className="text-ink-500">Status</span><StatusBadge value={STATUS_LABELS[property.status] || property.status} /></div>
            <div className="flex items-center justify-between"><span className="text-ink-500">Transaction</span><span className="font-semibold text-ink-900">{typeLabel(property.transactionType)}</span></div>
            <div className="flex items-start gap-2 text-ink-700"><LuMapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /> {[property.address, property.locality, property.city].filter(Boolean).join(", ") || "—"}</div>
            {property.status === "rejected" && property.rejectionReason && (
              <div className="rounded-lg bg-coral-50 px-3 py-2 text-xs text-coral-700">Rejected: {property.rejectionReason}</div>
            )}
          </div>
        </div>

        <div className="card relative h-72 overflow-hidden p-0 lg:col-span-2">
          {hasLocation ? (
            <>
              <iframe
                title="Property location"
                src={`https://maps.google.com/maps?q=${property.latitude},${property.longitude}&z=15&output=embed`}
                className="h-full w-full border-0"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
                <a
                  href={`https://www.google.com/maps?layer=c&cbll=${property.latitude},${property.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink-700 shadow-pop hover:bg-surface-sunk"
                >
                  <LuMapPin className="h-3.5 w-3.5 text-red-500" /> Street view
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink-700 shadow-pop hover:bg-surface-sunk"
                >
                  <LuNavigation className="h-3.5 w-3.5 text-red-500" /> Directions
                </a>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <LuMapPin className="h-8 w-8 text-ink-300" />
              <p className="max-w-xs text-xs text-ink-500">No coordinates set for this listing — add one from the edit form's location search.</p>
            </div>
          )}
        </div>
      </div>

      <div className="card mb-5 p-6">
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

      {property.faqs?.length > 0 && (
        <div className="card p-6">
          <h3 className="mb-4 font-display text-base font-bold text-ink-950">Frequently asked questions</h3>
          <div className="space-y-2.5">
            {property.faqs.map((faq, i) => (
              <AccordionItem key={i} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      )}

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
