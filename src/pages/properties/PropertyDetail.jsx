import { useNavigate, useParams } from "react-router-dom";
import { LuArrowLeft, LuPencil, LuMapPin, LuLayers, LuBuilding } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import { PROPERTIES, LEADS } from "../../data/mockData";

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const property = PROPERTIES.find((p) => p.id === id);
  const linkedLeads = LEADS.filter((l) => l.property.startsWith(property?.title || "___"));

  if (!property) return <EmptyState title="Property not found" subtitle={`No property with id ${id}.`} />;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
        <LuArrowLeft className="h-4 w-4" /> Back to properties
      </button>
      <PageHeader
        eyebrow={property.id}
        title={property.title}
        subtitle={property.location}
        actions={
          <button onClick={() => navigate(`/app/properties/${property.id}/edit`)} className="btn-primary">
            <LuPencil className="h-4 w-4" /> Edit listing
          </button>
        }
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <div className="mb-4 flex h-40 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-red-500 text-white">
            <LuBuilding className="h-10 w-10 opacity-80" />
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-ink-500">Status</span><StatusBadge value={property.status} /></div>
            <div className="flex items-center justify-between"><span className="text-ink-500">Type</span><span className="font-semibold text-ink-900">{property.type}</span></div>
            <div className="flex items-center justify-between"><span className="text-ink-500">Transaction</span><span className="font-semibold text-ink-900">{property.txn}</span></div>
            <div className="flex items-center justify-between"><span className="text-ink-500">Listed by</span><span className="font-semibold text-ink-900">{property.listedBy}</span></div>
          </div>
          <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex items-center gap-2 text-ink-700"><LuMapPin className="h-4 w-4 text-indigo-500" /> {property.location}</div>
            <div className="flex items-center gap-2 text-ink-700"><LuLayers className="h-4 w-4 text-indigo-500" /> {property.units} units • {property.price}</div>
          </div>
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
                    <p className="text-sm font-semibold text-ink-900">{l.name}</p>
                    <p className="text-xs text-ink-500">{l.phone} • {l.budget}</p>
                  </div>
                  <StatusBadge value={l.score} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
