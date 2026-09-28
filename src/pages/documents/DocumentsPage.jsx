import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { LuUpload, LuEye, LuTrash2, LuFileText, LuCircleCheck, LuCircleX } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import Modal, { ConfirmDialog } from "../../components/common/Modal";
import { SelectField, TextField, TextareaField } from "../../components/common/FormField";
import { InlineSpinner } from "../../components/common/PageLoader";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { apiRequest } from "../../api/client";
import { formatDate, shortId } from "../../lib/format";

// Deal / customer documents (GET /documents). Files are uploaded to private
// storage (POST /documents/upload) or attached by link (POST /documents);
// `document_url` in list responses is a short-lived signed URL.

const TYPE_LABELS = { kyc: "KYC", agreement: "Agreement", payment_receipt: "Payment", noc: "NOC", other: "Other" };
const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));
const STATUS_LABELS = { pending: "Pending Review", approved: "Approved", rejected: "Rejected" };
const REVIEW_ROLES = ["admin", "agency_admin", "super_admin"];

const EMPTY_UPLOAD = { mode: "file", file: null, url: "", fileName: "", documentType: "kyc" };

export default function DocumentsPage() {
  const toast = useToast();
  const call = useApiCall();
  const token = useSelector((s) => s.auth.accessToken);
  const { permissions, role } = useAuth();
  const { data, loading, error, reload } = useApiQuery("/documents?limit=100");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [upload, setUpload] = useState(EMPTY_UPLOAD);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const rows = useMemo(
    () =>
      (data?.items || []).map((d) => ({
        id: d.id,
        name: d.file_name || `${TYPE_LABELS[d.document_type] || "Document"} ${shortId(d.id)}`,
        ref: shortId(d.id, "DOC-"),
        category: TYPE_LABELS[d.document_type] || "Other",
        linkedTo: [d.customer_name, d.property_title].filter(Boolean).join(" / ") || "—",
        status: STATUS_LABELS[d.status] || d.status,
        uploadedBy: d.uploaded_by_name || "—",
        date: formatDate(d.created_at),
        raw: d,
      })),
    [data]
  );

  const submitUpload = async () => {
    setSaving(true);
    try {
      if (upload.mode === "file") {
        if (!upload.file) throw new Error("Choose a file to upload");
        const form = new FormData();
        form.append("file", upload.file);
        form.append("documentType", upload.documentType);
        if (upload.fileName) form.append("fileName", upload.fileName);
        await apiRequest("/documents/upload", { method: "POST", body: form, isFormData: true, token });
      } else {
        if (!upload.url) throw new Error("Enter the document link");
        await call("/documents", {
          method: "POST",
          body: { documentUrl: upload.url, documentType: upload.documentType, fileName: upload.fileName || undefined },
        });
      }
      toast.push("Document added.", "success");
      setUploadOpen(false);
      setUpload(EMPTY_UPLOAD);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const doReview = async (status) => {
    try {
      await call(`/documents/${reviewing.id}/review`, { method: "PUT", body: { status, reviewNotes: reviewNotes || undefined } });
      toast.push(`Document ${status}.`, "success");
      setReviewing(null);
      setReviewNotes("");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const doDelete = async () => {
    try {
      await call(`/documents/${toDelete.id}`, { method: "DELETE" });
      toast.push("Document deleted.", "success");
      setToDelete(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const columns = [
    {
      key: "name",
      label: "Document",
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500"><LuFileText className="h-4 w-4" /></div>
          <div>
            <p className="font-semibold text-ink-900">{r.name}</p>
            <p className="text-xs text-ink-500">{r.ref} • {r.date}</p>
          </div>
        </div>
      ),
    },
    { key: "category", label: "Category" },
    { key: "linkedTo", label: "Linked To" },
    { key: "uploadedBy", label: "Uploaded By" },
    { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
  ];

  const canReview = REVIEW_ROLES.includes(role);
  const getActions = (row) => [
    { label: "Open", icon: LuEye, onClick: () => row.raw.document_url && window.open(row.raw.document_url, "_blank", "noopener") },
    { label: "Review", icon: LuCircleCheck, onClick: () => setReviewing(row.raw), hidden: !canReview || row.raw.status !== "pending" },
    { label: "Delete document", icon: LuTrash2, tone: "danger", onClick: () => setToDelete(row), hidden: !permissions.delete },
  ];

  const statsItems = [
    { label: "Total Documents", value: rows.length, meta: "uploaded files" },
    { label: "Approved", value: rows.filter((r) => r.raw.status === "approved").length, meta: "ready to use" },
    { label: "Pending Review", value: rows.filter((r) => r.raw.status === "pending").length, meta: "needs action" },
    { label: "Agreements", value: rows.filter((r) => r.raw.document_type === "agreement").length, meta: "contract records" },
  ];

  return (
    <div>
      <PageHeader eyebrow="Document Management" title="Documents" subtitle="Upload, categorise and track documents linked to customers and deals." />
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        statsItems={statsItems}
        toolbarActions={
          permissions.create ? (
            <button onClick={() => setUploadOpen(true)} className="btn-primary">
              <LuUpload className="h-4 w-4" /> Upload document
            </button>
          ) : undefined
        }
        searchKeys={["name", "linkedTo", "ref"]}
        filters={[
          { key: "category", label: "Category", options: Object.values(TYPE_LABELS) },
          { key: "status", label: "Status", options: Object.values(STATUS_LABELS) },
        ]}
        getActions={getActions}
        renderCard={(r) => (
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500"><LuFileText className="h-4 w-4" /></div>
              <div>
                <p className="font-semibold text-ink-900">{r.name}</p>
                <p className="text-xs text-ink-500">{r.ref} • {r.date}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-ink-700">{r.category}</span>
              <StatusBadge value={r.status} />
            </div>
            <p className="mt-3 text-xs text-ink-500">Linked to: {r.linkedTo}</p>
          </div>
        )}
        kanban={{ key: "category", columns: Object.values(TYPE_LABELS) }}
        emptyTitle="No documents uploaded"
        emptySubtitle="Documents linked to deals and customers will appear here."
      />

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Add document" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="flex gap-1 rounded-lg bg-surface-muted p-1">
            {[
              ["file", "Upload file"],
              ["link", "Attach link"],
            ].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setUpload((u) => ({ ...u, mode }))}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${upload.mode === mode ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {upload.mode === "file" ? (
            <div>
              <label className="field-label">File (PDF, Word, Excel or image - max 20MB)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                onChange={(e) => setUpload((u) => ({ ...u, file: e.target.files?.[0] || null }))}
                className="field-input py-2"
              />
            </div>
          ) : (
            <TextField label="Document link" placeholder="https://..." value={upload.url} onChange={(e) => setUpload((u) => ({ ...u, url: e.target.value }))} />
          )}
          <TextField label="Display name (optional)" value={upload.fileName} onChange={(e) => setUpload((u) => ({ ...u, fileName: e.target.value }))} />
          <SelectField label="Category" value={upload.documentType} onChange={(e) => setUpload((u) => ({ ...u, documentType: e.target.value }))} options={TYPE_OPTIONS} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setUploadOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={saving} onClick={submitUpload}>
              {saving ? <InlineSpinner /> : <LuUpload className="h-4 w-4" />} Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!reviewing} onClose={() => setReviewing(null)} title="Review document" description={reviewing?.file_name}>
        <div className="space-y-4">
          <TextareaField label="Review notes (optional)" rows={3} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline text-coral-600" onClick={() => doReview("rejected")}>
              <LuCircleX className="h-4 w-4" /> Reject
            </button>
            <button className="btn-primary" onClick={() => doReview("approved")}>
              <LuCircleCheck className="h-4 w-4" /> Approve
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={doDelete}
        title="Delete this document?"
        description={`${toDelete?.name} will be permanently removed.`}
      />
    </div>
  );
}
