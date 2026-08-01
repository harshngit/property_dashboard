import { useState } from "react";
import { LuUpload, LuEye, LuDownload, LuTrash2, LuFileText } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import { ConfirmDialog } from "../../components/common/Modal";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";

const DOCS = [
  { id: "DOC-201", name: "PAN Card — Karan Mehta", category: "KYC", linkedTo: "Karan Mehta / DL-85", status: "Active", size: "1.2 MB" },
  { id: "DOC-200", name: "Booking Agreement — Palm Grove Villas", category: "Agreement", linkedTo: "Divya Prakash / DL-88", status: "Active", size: "3.4 MB" },
  { id: "DOC-199", name: "Sale Deed Draft — Riverstone Towers", category: "Legal", linkedTo: "Farhan Sheikh / DL-87", status: "Pending Review", size: "2.1 MB" },
  { id: "DOC-198", name: "Payment Receipt #4521", category: "Payment", linkedTo: "Suresh Iyer / DL-86", status: "Active", size: "0.4 MB" },
];

export default function DocumentsPage() {
  const toast = useToast();
  const { permissions } = useAuth();
  const [rows, setRows] = useState(DOCS);
  const [toDelete, setToDelete] = useState(null);

  const columns = [
    { key: "name", label: "Document", render: (r) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500"><LuFileText className="h-4 w-4" /></div>
        <div><p className="font-semibold text-ink-900">{r.name}</p><p className="text-xs text-ink-500">{r.id} • {r.size}</p></div>
      </div>
    ) },
    { key: "category", label: "Category" },
    { key: "linkedTo", label: "Linked To" },
    { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
  ];

  const getActions = (row) => [
    { label: "Preview", icon: LuEye, onClick: () => toast.push(`Previewing ${row.name}…`, "info") },
    { label: "Download", icon: LuDownload, onClick: () => toast.push(`Downloading ${row.name}…`, "info") },
    { label: "Delete document", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: !permissions.delete },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Document Management"
        title="Documents"
        subtitle="Upload, categorise and track documents linked to customers and deals."
        actions={permissions.create && <button onClick={() => toast.push("Upload dialog opened.", "info")} className="btn-primary"><LuUpload className="h-4 w-4" /> Upload document</button>}
      />
      <DataTable
        columns={columns}
        data={rows}
        searchKeys={["name", "linkedTo", "id"]}
        filters={[{ key: "category", label: "Category", options: ["KYC", "Agreement", "Legal", "Payment"] }]}
        getActions={getActions}
        emptyTitle="No documents uploaded"
        emptySubtitle="Documents linked to deals and customers will appear here."
      />
      <ConfirmDialog
        open={!!toDelete} onClose={() => setToDelete(null)}
        onConfirm={() => { setRows((r) => r.filter((x) => x.id !== toDelete.id)); toast.push("Document deleted.", "success"); setToDelete(null); }}
        title="Delete this document?" description={`${toDelete?.name} will be permanently removed.`}
      />
    </div>
  );
}
