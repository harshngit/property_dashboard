import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuPlus, LuEye, LuPencil, LuTrash2, LuCircleCheck, LuCircleX } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import { ConfirmDialog } from "../../components/common/Modal";
import { PROPERTIES } from "../../data/mockData";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";

export default function PropertiesList() {
  const navigate = useNavigate();
  const toast = useToast();
  const { permissions } = useAuth();
  const [rows, setRows] = useState(PROPERTIES);
  const [toDelete, setToDelete] = useState(null);

  const columns = [
    {
      key: "title", label: "Property",
      render: (r) => (
        <div>
          <p className="font-semibold text-ink-900">{r.title}</p>
          <p className="text-xs text-ink-500">{r.id} • {r.location}</p>
        </div>
      ),
    },
    { key: "type", label: "Type" },
    { key: "txn", label: "Txn Type" },
    { key: "price", label: "Price" },
    { key: "units", label: "Units" },
    { key: "listedBy", label: "Listed By" },
    { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
  ];

  const getActions = (row) => [
    { label: "View listing", icon: LuEye, onClick: () => toast.push(`Opening ${row.title}…`, "info") },
    { label: "Edit property", icon: LuPencil, onClick: () => navigate(`/app/properties/${row.id}/edit`), hidden: !permissions.edit },
    { label: "Approve listing", icon: LuCircleCheck, onClick: () => toast.push(`${row.title} approved.`, "success"), hidden: !permissions.approve || row.status !== "Pending Approval" },
    { label: "Deactivate", icon: LuCircleX, onClick: () => toast.push(`${row.title} marked inactive.`, "info"), hidden: !permissions.edit || row.status === "Inactive" },
    { label: "Delete listing", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: !permissions.delete },
  ];

  const confirmDelete = () => {
    setRows((r) => r.filter((x) => x.id !== toDelete.id));
    toast.push(`${toDelete.title} deleted.`, "success");
    setToDelete(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Property Listings"
        title="Properties"
        subtitle="Buy, sell and rent listings across every agency and builder."
        actions={
          permissions.create && (
            <button onClick={() => navigate("/app/properties/new")} className="btn-primary">
              <LuPlus className="h-4 w-4" /> Add property
            </button>
          )
        }
      />
      <DataTable
        columns={columns}
        data={rows}
        searchKeys={["title", "location", "id"]}
        filters={[
          { key: "type", label: "Type", options: ["Apartment", "Villa", "Commercial"] },
          { key: "status", label: "Status", options: ["Active", "Pending Approval", "Inactive"] },
        ]}
        getActions={getActions}
        onExport={permissions.export ? () => toast.push("Exporting properties to CSV…", "info") : undefined}
        emptyTitle="No properties listed"
        emptySubtitle="Listings created by brokers, builders and admins will show up here."
      />
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
