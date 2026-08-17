import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LuSave, LuX, LuUserPlus } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import { TextField, SelectField, TextareaField } from "../../components/common/FormField";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import { fetchCustomers, createCustomer, fetchCustomerPreferences, updateCustomerPreferences } from "../../redux/slices/customersSlice";
import { fetchProperties } from "../../redux/slices/propertiesSlice";
import { fetchUsers } from "../../redux/slices/usersSlice";
import { createLead, updateLead } from "../../redux/slices/leadsSlice";
import { ROLES } from "../../config/roles";

const LEAD_SOURCES = ["website", "whatsapp", "manual", "campaign"];
const REQUIREMENT_TYPES = [
  { value: "", label: "Any" },
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "independent_house", label: "Independent House" },
  { value: "plot", label: "Plot" },
  { value: "commercial", label: "Commercial" },
  { value: "farmhouse", label: "Farmhouse" },
  { value: "other", label: "Other" },
];
const REQUIREMENT_TXN_TYPES = [{ value: "", label: "Any" }, { value: "buy", label: "Buy" }, { value: "sell", label: "Sell" }, { value: "rent", label: "Rent" }];

const emptyRequirement = { budgetMin: "", budgetMax: "", propertyType: "", transactionType: "", bedrooms: "", notes: "" };

// `lead` (edit mode only) is the normalized lead from leadsSlice - the backend's
// PUT /leads/:id only accepts source/propertyId, so that's all this form edits
// once a lead already exists. Everything else (assignee, status) has its own
// dedicated action elsewhere (reassign dialog, status dropdown on detail page).
export default function LeadForm({ mode = "create", lead }) {
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch();

  const { list: customers, preferencesByCustomer } = useSelector((s) => s.customers);
  const { list: properties } = useSelector((s) => s.properties);
  const { list: users } = useSelector((s) => s.users);

  const [source, setSource] = useState(lead?.source || "website");
  const [propertyId, setPropertyId] = useState(lead?.propertyId || "");
  const [assignedTo, setAssignedTo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ fullName: "", email: "", mobile: "" });
  const [requirement, setRequirement] = useState(emptyRequirement);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const activeCustomerId = mode === "create" ? customerId : lead?.customerId;

  useEffect(() => {
    dispatch(fetchProperties({ limit: 100 }));
    if (mode === "create") {
      dispatch(fetchUsers({ limit: 100 }));
      dispatch(fetchCustomers({ limit: 20 }));
    }
  }, [dispatch, mode]);

  useEffect(() => {
    if (mode !== "create") return undefined;
    const timer = setTimeout(() => {
      dispatch(fetchCustomers({ search: customerSearch, limit: 20 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [customerSearch, dispatch, mode]);

  // Load the linked customer's existing budget/requirement so it's editable
  // here instead of only visible read-only on the Customer 360 profile.
  useEffect(() => {
    if (activeCustomerId) dispatch(fetchCustomerPreferences(activeCustomerId));
    else setRequirement(emptyRequirement);
  }, [activeCustomerId, dispatch]);

  useEffect(() => {
    const prefs = activeCustomerId ? preferencesByCustomer[activeCustomerId] : null;
    if (prefs) {
      setRequirement({
        budgetMin: prefs.budgetMin ?? "",
        budgetMax: prefs.budgetMax ?? "",
        propertyType: prefs.propertyType || "",
        transactionType: prefs.transactionType || "",
        bedrooms: prefs.bedrooms ?? "",
        notes: prefs.notes || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCustomerId, preferencesByCustomer[activeCustomerId]]);

  const setReq = (key) => (e) => setRequirement((r) => ({ ...r, [key]: e.target.value }));

  const assigneeOptions = [
    { value: "", label: "Unassigned" },
    ...users.filter((u) => u.role !== ROLES.CUSTOMER).map((u) => ({ value: u.id, label: u.name })),
  ];
  const propertyOptions = [
    { value: "", label: "None" },
    ...properties.map((p) => ({ value: p.id, label: p.title })),
  ];
  const customerOptions = [
    { value: "", label: customers.length ? "Select a customer…" : "No matches — try another search" },
    ...customers.map((c) => ({ value: c.id, label: `${c.fullName} — ${c.mobile || c.email || "no contact"}` })),
  ];

  const handleCreateCustomer = async () => {
    if (!newCustomer.fullName.trim()) {
      toast.push("Customer name is required.", "error");
      return;
    }
    if (!newCustomer.email.trim() && !newCustomer.mobile.trim()) {
      toast.push("Provide an email or mobile number for the customer.", "error");
      return;
    }
    const res = await dispatch(createCustomer(newCustomer));
    if (createCustomer.fulfilled.match(res)) {
      setCustomerId(res.payload.id);
      setShowNewCustomer(false);
      setNewCustomer({ fullName: "", email: "", mobile: "" });
      toast.push(`${res.payload.fullName} added as a customer.`, "success");
    } else {
      toast.push(res.payload || "Failed to create customer.", "error");
    }
  };

  const validate = () => {
    const e = {};
    if (mode === "create" && !customerId) e.customerId = "Select or create a customer for this lead.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const hasRequirementInput = Object.values(requirement).some((v) => v !== "" && v != null);

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const res = mode === "create"
      ? await dispatch(createLead({ customerId, source, propertyId: propertyId || undefined, assignedTo: assignedTo || undefined }))
      : await dispatch(updateLead({ id: lead.id, source, propertyId: propertyId || null }));

    const success = mode === "create" ? createLead.fulfilled.match(res) : updateLead.fulfilled.match(res);

    if (success) {
      const targetCustomerId = mode === "create" ? res.payload.customerId : lead.customerId;
      if (targetCustomerId && hasRequirementInput) {
        const prefRes = await dispatch(updateCustomerPreferences({
          id: targetCustomerId,
          budgetMin: requirement.budgetMin !== "" ? Number(requirement.budgetMin) : undefined,
          budgetMax: requirement.budgetMax !== "" ? Number(requirement.budgetMax) : undefined,
          propertyType: requirement.propertyType || undefined,
          transactionType: requirement.transactionType || undefined,
          bedrooms: requirement.bedrooms !== "" ? Number(requirement.bedrooms) : undefined,
          notes: requirement.notes || undefined,
          preferredLocations: preferencesByCustomer[targetCustomerId]?.preferredLocations,
        }));
        if (!updateCustomerPreferences.fulfilled.match(prefRes)) {
          toast.push("Lead saved, but the budget/requirement couldn't be updated.", "error");
        }
      }
      toast.push(mode === "create" ? "Lead created successfully." : "Lead updated successfully.", "success");
      navigate("/app/leads");
    } else {
      toast.push(res.payload || "Something went wrong.", "error");
    }
    setSaving(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Lead Management"
        title={mode === "create" ? "Add a new lead" : `Edit lead — ${lead?.customerName || ""}`}
        subtitle={mode === "create"
          ? "Link an inquiry to a customer so AI qualification and matching can kick in."
          : "Only the source and interested property can be changed here — use Reassign or the status dropdown for those."}
      />
      <form onSubmit={submit} className="card space-y-6 p-6">
        {mode === "create" && (
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Customer</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Search customer"
                placeholder="Search by name, email or mobile"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              <SelectField
                label="Customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                options={customerOptions}
                error={errors.customerId}
              />
            </div>
            {!showNewCustomer ? (
              <button
                type="button"
                onClick={() => setShowNewCustomer(true)}
                className="btn-outline mt-3 btn-sm"
              >
                <LuUserPlus className="h-4 w-4" /> Can't find them? Add a new customer
              </button>
            ) : (
              <div className="mt-3 rounded-xl border border-line bg-surface-sunk/40 p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <TextField label="Full name" placeholder="e.g. Karan Mehta" value={newCustomer.fullName} onChange={(e) => setNewCustomer((c) => ({ ...c, fullName: e.target.value }))} />
                  <TextField label="Email" type="email" placeholder="name@email.com" value={newCustomer.email} onChange={(e) => setNewCustomer((c) => ({ ...c, email: e.target.value }))} />
                  <TextField label="Mobile" placeholder="+91 98200 11223" value={newCustomer.mobile} onChange={(e) => setNewCustomer((c) => ({ ...c, mobile: e.target.value }))} />
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowNewCustomer(false)} className="btn-outline btn-sm">Cancel</button>
                  <button type="button" onClick={handleCreateCustomer} className="btn-primary btn-sm">Create customer</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Requirement</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField label="Interested property (optional)" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} options={propertyOptions} />
            <SelectField label="Source" value={source} onChange={(e) => setSource(e.target.value)} options={LEAD_SOURCES} />
            {mode === "create" && (
              <SelectField label="Assign to (optional)" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} options={assigneeOptions} />
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Budget & requirement</h3>
          {activeCustomerId ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <TextField label="Budget min (₹)" type="number" placeholder="e.g. 8000000" value={requirement.budgetMin} onChange={setReq("budgetMin")} />
                <TextField label="Budget max (₹)" type="number" placeholder="e.g. 12000000" value={requirement.budgetMax} onChange={setReq("budgetMax")} />
                <TextField label="Bedrooms" type="number" placeholder="e.g. 3" value={requirement.bedrooms} onChange={setReq("bedrooms")} />
                <SelectField label="Property type" value={requirement.propertyType} onChange={setReq("propertyType")} options={REQUIREMENT_TYPES} />
                <SelectField label="Transaction type" value={requirement.transactionType} onChange={setReq("transactionType")} options={REQUIREMENT_TXN_TYPES} />
              </div>
              <TextareaField label="Notes" placeholder="Preferred locations, must-haves, timeline…" value={requirement.notes} onChange={setReq("notes")} className="mt-4" />
            </>
          ) : (
            <p className="rounded-xl bg-surface-sunk px-4 py-3 text-xs text-ink-500">
              Select or create a customer above to capture their budget and requirements.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-line pt-5">
          <button type="button" onClick={() => navigate("/app/leads")} className="btn-outline">
            <LuX className="h-4 w-4" /> Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <InlineSpinner className="h-4 w-4" /> : <LuSave className="h-4 w-4" />}
            {saving ? "Saving…" : mode === "create" ? "Create lead" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
