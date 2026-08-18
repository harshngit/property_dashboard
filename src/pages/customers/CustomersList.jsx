import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LuPlus, LuEye, LuPencil } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import Avatar from "../../components/common/Avatar";
import QuickFormModal from "../../components/common/QuickFormModal";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";
import {
  fetchCustomers, createCustomer, updateCustomer,
  clearCustomersError, fetchCustomerDealStages,
} from "../../redux/slices/customersSlice";

const FIELDS = [
  { key: "fullName", label: "Customer name", placeholder: "e.g. Karan Mehta" },
  { key: "mobile", label: "Mobile", placeholder: "+91 98200 11223" },
  { key: "email", label: "Email", placeholder: "name@email.com" },
];

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

export default function CustomersList() {
  const toast = useToast();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const { list: rows, status, dealStageByCustomer } = useSelector((s) => s.customers);

  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

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
    { label: "View 360° profile", icon: LuEye, onClick: () => navigate(`/app/customers/${row.id}`) },
    { label: "Edit customer", icon: LuPencil, onClick: () => { setEditing(row); setModalOpen(true); }, hidden: !permissions.edit },
  ];

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
    </div>
  );
}
