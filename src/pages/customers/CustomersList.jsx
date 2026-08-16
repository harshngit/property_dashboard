import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LuPlus, LuEye, LuPencil, LuFileText } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import Avatar from "../../components/common/Avatar";
import Modal from "../../components/common/Modal";
import QuickFormModal from "../../components/common/QuickFormModal";
import { InlineSpinner } from "../../components/common/PageLoader";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";
import {
  fetchCustomers, createCustomer, updateCustomer, fetchCustomerProfile,
  clearCustomerProfile, clearCustomersError, fetchCustomerDealStages,
} from "../../redux/slices/customersSlice";

const FIELDS = [
  { key: "fullName", label: "Customer name", placeholder: "e.g. Karan Mehta" },
  { key: "mobile", label: "Mobile", placeholder: "+91 98200 11223" },
  { key: "email", label: "Email", placeholder: "name@email.com" },
];

const formatMoney = (value) => (value == null || value === "" ? null : `₹${Number(value).toLocaleString("en-IN")}`);
const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

export default function CustomersList() {
  const toast = useToast();
  const dispatch = useDispatch();
  const { permissions } = useAuth();
  const { list: rows, status, profile, profileStatus, dealStageByCustomer } = useSelector((s) => s.customers);

  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [profileTarget, setProfileTarget] = useState(null);

  useEffect(() => {
    dispatch(fetchCustomers({ limit: 100 }));
    return () => dispatch(clearCustomersError());
  }, [dispatch]);

  useEffect(() => {
    if (status === "succeeded" && rows.length) {
      dispatch(fetchCustomerDealStages(rows.map((r) => r.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, dispatch]);

  const columns = [
    { key: "fullName", label: "Customer", render: (r) => (
      <div className="flex items-center gap-3">
        <Avatar name={r.fullName} size={32} color="#2B3A67" />
        <div><p className="font-semibold text-ink-900">{r.fullName}</p><p className="text-xs text-ink-500">{r.mobile || r.email || "—"}</p></div>
      </div>
    ) },
    { key: "tenantName", label: "Agency", render: (r) => r.tenantName || "—" },
    { key: "createdByName", label: "Added by", render: (r) => r.createdByName || "—" },
    { key: "createdAt", label: "Created", render: (r) => <span className="text-xs text-ink-500">{formatDate(r.createdAt)}</span> },
  ];

  const getActions = (row) => [
    { label: "View 360° profile", icon: LuEye, onClick: () => openProfile(row) },
    { label: "Edit customer", icon: LuPencil, onClick: () => { setEditing(row); setModalOpen(true); }, hidden: !permissions.edit },
  ];

  const openProfile = (row) => {
    setProfileTarget(row);
    dispatch(fetchCustomerProfile(row.id));
  };

  const closeProfile = () => {
    setProfileTarget(null);
    dispatch(clearCustomerProfile());
  };

  const handleSave = async (data) => {
    if (editing) {
      const res = await dispatch(updateCustomer({ id: editing.id, ...data }));
      if (updateCustomer.fulfilled.match(res)) toast.push(`${data.fullName} updated.`, "success");
      else toast.push(res.payload || "Failed to update customer.", "error");
    } else {
      const res = await dispatch(createCustomer(data));
      if (createCustomer.fulfilled.match(res)) toast.push(`${data.fullName} added.`, "success");
      else toast.push(res.payload || "Failed to add customer.", "error");
    }
    setModalOpen(false);
  };

  const customerStats = [
    { label: "Total Customers", value: rows.length, meta: "active profiles" },
    { label: "Inquiry", value: rows.filter((r) => dealStageByCustomer[r.id] === "Inquiry").length, meta: "new prospects" },
    { label: "Booking", value: rows.filter((r) => dealStageByCustomer[r.id] === "Booking").length, meta: "confirmed intent" },
    { label: "Closed", value: rows.filter((r) => dealStageByCustomer[r.id] === "Closed").length, meta: "completed journeys" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Customer 360°"
        title="Customers"
        subtitle="A single customer profile for requirements, conversations, documents and deal stage."
      />
      <DataTable
        columns={columns}
        data={rows}
        statsItems={customerStats}
        loading={status === "loading"}
        toolbarActions={permissions.create ? <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary"><LuPlus className="h-4 w-4" /> Add customer</button> : undefined}
        searchKeys={["fullName", "mobile", "email"]}
        getActions={getActions}
        renderCard={(r) => (
          <div>
            <div className="flex items-center gap-3">
              <Avatar name={r.fullName} size={36} color="#2B3A67" />
              <div>
                <p className="font-semibold text-ink-900">{r.fullName}</p>
                <p className="text-xs text-ink-500">{r.mobile || r.email || "—"}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-500">Agency: {r.tenantName || "—"}</p>
            <p className="mt-1 text-xs text-ink-500">Added {formatDate(r.createdAt)}</p>
          </div>
        )}
        emptyTitle="No customers yet"
        emptySubtitle="Customer profiles are created automatically from qualified leads."
      />
      <QuickFormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSave}
        title={editing ? "Edit customer" : "Add customer"}
        description="Keep contact details up to date for accurate matching."
        fields={FIELDS} initial={editing || {}}
        submitLabel={editing ? "Save changes" : "Add customer"}
      />

      <Modal open={!!profileTarget} onClose={closeProfile} title={profileTarget?.fullName} description="Preferences, linked deals and documents." maxWidth="max-w-xl">
        {profileStatus === "loading" ? (
          <div className="flex justify-center py-10"><InlineSpinner className="h-6 w-6 text-ink-400" /></div>
        ) : (
          <div className="space-y-5">
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Preferences</h4>
              {profile?.preferences ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-ink-500">Budget</span><p className="font-semibold text-ink-900">
                    {formatMoney(profile.preferences.budgetMin) && formatMoney(profile.preferences.budgetMax)
                      ? `${formatMoney(profile.preferences.budgetMin)} - ${formatMoney(profile.preferences.budgetMax)}`
                      : formatMoney(profile.preferences.budgetMin) || formatMoney(profile.preferences.budgetMax) || "—"}
                  </p></div>
                  <div><span className="text-ink-500">Property type</span><p className="font-semibold capitalize text-ink-900">{profile.preferences.propertyType || "—"}</p></div>
                  <div><span className="text-ink-500">Transaction</span><p className="font-semibold capitalize text-ink-900">{profile.preferences.transactionType || "—"}</p></div>
                  <div><span className="text-ink-500">Bedrooms</span><p className="font-semibold text-ink-900">{profile.preferences.bedrooms ?? "—"}</p></div>
                </div>
              ) : <p className="text-sm text-ink-500">No preferences captured yet.</p>}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Deals ({profile?.deals?.length || 0})</h4>
              {profile?.deals?.length ? (
                <div className="space-y-2">
                  {profile.deals.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                      <span className="font-medium text-ink-900">{d.stage}</span>
                      <span className="text-ink-500">{formatMoney(d.deal_value) || "—"}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-ink-500">No deals linked yet.</p>}
            </div>

            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-500"><LuFileText className="h-3.5 w-3.5" /> Documents ({profile?.documents?.length || 0})</h4>
              {profile?.documents?.length ? (
                <div className="space-y-2">
                  {profile.documents.map((doc) => (
                    <a key={doc.id} href={doc.document_url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-sunk">
                      <span className="font-medium text-ink-900">{doc.document_type || "Document"}</span>
                      <span className="text-xs text-ink-500 capitalize">{doc.status}</span>
                    </a>
                  ))}
                </div>
              ) : <p className="text-sm text-ink-500">No documents uploaded yet.</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
