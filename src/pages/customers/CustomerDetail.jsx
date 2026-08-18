import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  LuArrowLeft, LuPencil, LuPhone, LuMail, LuWallet, LuFileText, LuHandshake, LuBuilding2,
} from "react-icons/lu";
import { usePageTitle } from "../../context/PageTitleContext";
import Avatar from "../../components/common/Avatar";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import QuickFormModal from "../../components/common/QuickFormModal";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import {
  fetchCustomerById, fetchCustomerProfile, updateCustomer, updateCustomerPreferences,
  clearCurrentCustomer, clearCustomerProfile,
} from "../../redux/slices/customersSlice";
import { fetchLeads } from "../../redux/slices/leadsSlice";

const EDIT_FIELDS = [
  { key: "fullName", label: "Full name", placeholder: "e.g. Karan Mehta" },
  { key: "mobile", label: "Mobile", placeholder: "+91 98200 11223" },
  { key: "email", label: "Email", placeholder: "name@email.com" },
];

const REQUIREMENT_FIELDS = [
  { key: "budgetMin", label: "Budget min (₹)", type: "number", placeholder: "e.g. 8000000" },
  { key: "budgetMax", label: "Budget max (₹)", type: "number", placeholder: "e.g. 12000000" },
  { key: "bedrooms", label: "Bedrooms", type: "number", placeholder: "e.g. 3" },
  {
    key: "propertyType", label: "Property type", type: "select",
    options: [{ value: "", label: "Any" }, { value: "apartment", label: "Apartment" }, { value: "villa", label: "Villa" }, { value: "independent_house", label: "Independent House" }, { value: "plot", label: "Plot" }, { value: "commercial", label: "Commercial" }, { value: "farmhouse", label: "Farmhouse" }, { value: "other", label: "Other" }],
  },
  {
    key: "transactionType", label: "Transaction type", type: "select",
    options: [{ value: "", label: "Any" }, { value: "buy", label: "Buy" }, { value: "sell", label: "Sell" }, { value: "rent", label: "Rent" }],
  },
];

const formatMoney = (value) => (value == null || value === "" ? null : `₹${Number(value).toLocaleString("en-IN")}`);
const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

function IconAction({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="shrink-0 text-ink-500">{label}</span>
      <span className="min-w-0 truncate text-right font-semibold text-ink-900">{children}</span>
    </div>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const { permissions } = useAuth();

  const { current: customer, status, profile, profileStatus } = useSelector((s) => s.customers);
  const { list: leads } = useSelector((s) => s.leads);
  const { setTitle } = usePageTitle();

  const [editOpen, setEditOpen] = useState(false);
  const [requirementOpen, setRequirementOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchCustomerById(id));
    dispatch(fetchCustomerProfile(id));
    dispatch(fetchLeads({ limit: 100 }));
    return () => {
      dispatch(clearCurrentCustomer());
      dispatch(clearCustomerProfile());
    };
  }, [dispatch, id]);

  useEffect(() => {
    setTitle(customer?.id === id ? customer.fullName || "Customer" : "Customer");
  }, [customer, id, setTitle]);

  const linkedLeads = useMemo(() => leads.filter((l) => l.customerId === id), [leads, id]);

  if (!customer || customer.id !== id) {
    if (status === "failed") return <EmptyState title="Customer not found" subtitle={`No customer with id ${id}.`} />;
    return (
      <div className="flex items-center justify-center py-24 text-ink-500">
        <InlineSpinner className="h-6 w-6" />
      </div>
    );
  }

  const prefs = profile?.preferences;
  const budgetLabel = formatMoney(prefs?.budgetMin) && formatMoney(prefs?.budgetMax)
    ? `${formatMoney(prefs.budgetMin)} - ${formatMoney(prefs.budgetMax)}`
    : formatMoney(prefs?.budgetMin) || formatMoney(prefs?.budgetMax) || "Not captured";

  const handleEditSave = async (data) => {
    const res = await dispatch(updateCustomer({ id: customer.id, ...data }));
    if (updateCustomer.fulfilled.match(res)) toast.push(`${data.fullName || customer.fullName} updated.`, "success");
    else toast.push(res.payload || "Failed to update customer.", "error");
    setEditOpen(false);
  };

  const handleRequirementSave = async (data) => {
    const res = await dispatch(updateCustomerPreferences({
      id: customer.id,
      budgetMin: data.budgetMin !== "" ? Number(data.budgetMin) : undefined,
      budgetMax: data.budgetMax !== "" ? Number(data.budgetMax) : undefined,
      bedrooms: data.bedrooms !== "" ? Number(data.bedrooms) : undefined,
      propertyType: data.propertyType || undefined,
      transactionType: data.transactionType || undefined,
      preferredLocations: prefs?.preferredLocations,
      notes: prefs?.notes,
    }));
    if (updateCustomerPreferences.fulfilled.match(res)) toast.push("Requirement updated.", "success");
    else toast.push(res.payload || "Failed to update requirement.", "error");
    setRequirementOpen(false);
  };

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
        <LuArrowLeft className="h-4 w-4" /> Back to customers
      </button>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left — profile & requirement */}
        <div className="card p-6 lg:col-span-3">
          <div className="flex flex-col items-center text-center">
            <Avatar name={customer.fullName || "Unknown"} size={72} color="#2B3A67" />
            <p className="mt-3 font-display text-lg font-bold text-ink-950">{customer.fullName || "Unknown"}</p>
            {customer.tenantName && (
              <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
                <LuBuilding2 className="h-3.5 w-3.5" /> {customer.tenantName}
              </span>
            )}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2">
            <IconAction icon={LuPhone} label="Call" onClick={() => toast.push(`Dialing ${customer.mobile || "—"}…`, "info")} />
            <IconAction icon={LuMail} label="Email" onClick={() => customer.email && window.open(`mailto:${customer.email}`, "_blank")} />
          </div>

          {permissions.edit && (
            <button onClick={() => setEditOpen(true)} className="btn-primary mt-4 w-full justify-center">
              <LuPencil className="h-4 w-4" /> Edit customer
            </button>
          )}

          <div className="mt-6 space-y-3 border-t border-line pt-5">
            <InfoRow label="Email">{customer.email || "—"}</InfoRow>
            <InfoRow label="Mobile">{customer.mobile || "—"}</InfoRow>
            <InfoRow label="Agency">{customer.tenantName || "—"}</InfoRow>
            <InfoRow label="Added by">{customer.createdByName || "—"}</InfoRow>
            <InfoRow label="Created">{formatDate(customer.createdAt)}</InfoRow>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wide text-ink-500">Requirement</h4>
              {permissions.edit && (
                <button onClick={() => setRequirementOpen(true)} className="text-xs font-semibold text-red-600 hover:underline">
                  Edit
                </button>
              )}
            </div>
            {profileStatus === "loading" ? (
              <div className="flex justify-center py-4"><InlineSpinner className="h-4 w-4 text-ink-400" /></div>
            ) : (
              <div className="space-y-3">
                <InfoRow label="Budget">{budgetLabel}</InfoRow>
                <InfoRow label="Property type">{prefs?.propertyType ? prefs.propertyType.replace(/_/g, " ") : "—"}</InfoRow>
                <InfoRow label="Transaction">{prefs?.transactionType || "—"}</InfoRow>
                <InfoRow label="Bedrooms">{prefs?.bedrooms ?? "—"}</InfoRow>
              </div>
            )}
          </div>
        </div>

        {/* Middle — deals */}
        <div className="card p-6 lg:col-span-6">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-950">
              <LuHandshake className="h-4.5 w-4.5 text-red-600" /> Deals
            </h3>
            <span className="text-xs text-ink-500">{profile?.deals?.length || 0} linked</span>
          </div>

          <div className="mt-4 space-y-3">
            {profileStatus === "loading" ? (
              <div className="flex justify-center py-8"><InlineSpinner className="h-5 w-5 text-ink-400" /></div>
            ) : profile?.deals?.length ? (
              profile.deals.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600">
                      <LuWallet className="h-4 w-4" />
                    </div>
                    <StatusBadge value={d.stage} />
                  </div>
                  <span className="text-sm font-bold text-ink-900">{formatMoney(d.deal_value) || "—"}</span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-ink-500">No deals linked yet.</p>
            )}
          </div>
        </div>

        {/* Right — leads & documents */}
        <div className="space-y-5 lg:col-span-3">
          <div className="card p-5">
            <h4 className="text-xs font-bold uppercase tracking-wide text-ink-500">Leads ({linkedLeads.length})</h4>
            {linkedLeads.length ? (
              <div className="mt-3 space-y-2">
                {linkedLeads.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => navigate(`/app/leads/${l.id}`)}
                    className="flex w-full items-center justify-between rounded-lg border border-line px-3 py-2 text-left text-sm hover:bg-surface-sunk"
                  >
                    <span className="truncate font-medium text-ink-900">{l.propertyTitle || l.source || l.id}</span>
                    <StatusBadge value={l.status} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-500">No leads linked yet.</p>
            )}
          </div>

          <div className="card p-5">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-500">
              <LuFileText className="h-3.5 w-3.5" /> Documents ({profile?.documents?.length || 0})
            </h4>
            {profile?.documents?.length ? (
              <div className="mt-3 space-y-2">
                {profile.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-sunk"
                  >
                    <span className="truncate font-medium text-ink-900">{doc.document_type || "Document"}</span>
                    <span className="shrink-0 text-xs capitalize text-ink-500">{doc.status}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-500">No documents uploaded yet.</p>
            )}
          </div>
        </div>
      </div>

      <QuickFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSave}
        title="Edit customer"
        description="Keep contact details up to date for accurate matching."
        fields={EDIT_FIELDS}
        initial={{ fullName: customer.fullName, mobile: customer.mobile, email: customer.email }}
        submitLabel="Save changes"
      />

      <QuickFormModal
        open={requirementOpen}
        onClose={() => setRequirementOpen(false)}
        onSubmit={handleRequirementSave}
        title="Edit requirement"
        description={`Update ${customer.fullName || "this customer"}'s budget and property preferences.`}
        fields={REQUIREMENT_FIELDS}
        initial={{
          budgetMin: prefs?.budgetMin ?? "",
          budgetMax: prefs?.budgetMax ?? "",
          bedrooms: prefs?.bedrooms ?? "",
          propertyType: prefs?.propertyType || "",
          transactionType: prefs?.transactionType || "",
        }}
        submitLabel="Save requirement"
      />
    </div>
  );
}
