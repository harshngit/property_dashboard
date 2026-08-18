import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LuPlus, LuEye, LuPencil, LuFileCheck2, LuFileX2 } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import QuickFormModal from "../../components/common/QuickFormModal";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";
import {
  fetchDeals, createDeal, updateDeal, updateDealStage, closeDeal, clearDealsError,
  STAGE_LABELS, STAGE_VALUES, STAGE_TRANSITIONS,
} from "../../redux/slices/dealsSlice";
import { fetchLeads } from "../../redux/slices/leadsSlice";

const STAGES = Object.values(STAGE_LABELS);
const formatValue = (value) => (value == null || value === "" ? "—" : `₹${Number(value).toLocaleString("en-IN")}`);

export default function DealsList() {
  const toast = useToast();
  const dispatch = useDispatch();
  const { permissions } = useAuth();
  const { list: rows, status } = useSelector((s) => s.deals);
  const { list: leads } = useSelector((s) => s.leads);

  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchDeals({ limit: 100 }));
    dispatch(fetchLeads({ limit: 100 }));
    return () => dispatch(clearDealsError());
  }, [dispatch]);

  const dealStats = [
    { label: "Total Deals", value: rows.length, meta: "current pipeline" },
    { label: "Booking", value: rows.filter((row) => row.stage === "Booking").length, meta: "ready to close" },
    { label: "Closed Won", value: rows.filter((row) => row.stage === "Closed Won").length, meta: "won this cycle" },
    { label: "Closed Lost", value: rows.filter((row) => row.stage === "Closed Lost").length, meta: "dropped opportunities" },
  ];

  const columns = [
    { key: "customerName", label: "Customer", render: (r) => (
      <div><p className="font-semibold text-ink-900">{r.customerName || "—"}</p><p className="text-xs text-ink-500">{r.id.slice(0, 8)}</p></div>
    ) },
    { key: "propertyTitle", label: "Property", render: (r) => r.propertyTitle || "—" },
    { key: "dealValue", label: "Deal Value", render: (r) => formatValue(r.dealValue) },
    { key: "stage", label: "Stage", render: (r) => <StatusBadge value={r.stage} /> },
    { key: "brokerName", label: "Broker", render: (r) => r.brokerName || "—" },
  ];

  // Only leads without an obviously-closed status are offered - a deal is
  // usually created once a lead is qualified (createDeal auto-resolves
  // customer/property/broker from the lead when leadId is passed).
  const leadOptions = useMemo(
    () => leads.map((l) => ({
      value: l.id,
      label: `${l.customerName || "Unknown"} — ${l.propertyTitle || "No property"}`,
    })),
    [leads]
  );

  const createFields = [
    { key: "leadId", label: "From lead", type: "select", options: leadOptions, full: true },
    { key: "dealValue", label: "Deal value (₹)", type: "number", placeholder: "e.g. 8500000" },
    { key: "commissionAmount", label: "Commission (₹)", type: "number", placeholder: "e.g. 170000" },
    { key: "commissionPercent", label: "Commission (%)", type: "number", placeholder: "e.g. 2" },
  ];

  const editFields = [
    { key: "dealValue", label: "Deal value (₹)", type: "number" },
    { key: "commissionAmount", label: "Commission (₹)", type: "number" },
    { key: "commissionPercent", label: "Commission (%)", type: "number" },
  ];

  const getActions = (row) => [
    { label: "View deal", icon: LuEye, onClick: () => toast.push(`${row.customerName || "This deal"} is at "${row.stage}".`, "info") },
    { label: "Edit deal", icon: LuPencil, onClick: () => { setEditing(row); setModalOpen(true); }, hidden: !permissions.edit },
    { label: "Mark as won", icon: LuFileCheck2, onClick: () => handleClose(row, "won"), hidden: !permissions.edit || ["Closed Won", "Closed Lost"].includes(row.stage) },
    { label: "Mark as lost", icon: LuFileX2, onClick: () => handleClose(row, "lost"), hidden: !permissions.edit || ["Closed Won", "Closed Lost"].includes(row.stage) },
  ];

  const handleSave = async (data) => {
    if (editing) {
      const payload = {};
      if (data.dealValue !== "") payload.dealValue = Number(data.dealValue);
      if (data.commissionAmount !== "") payload.commissionAmount = Number(data.commissionAmount);
      if (data.commissionPercent !== "") payload.commissionPercent = Number(data.commissionPercent);
      const res = await dispatch(updateDeal({ id: editing.id, ...payload }));
      if (updateDeal.fulfilled.match(res)) toast.push("Deal updated.", "success");
      else toast.push(res.payload || "Failed to update deal.", "error");
    } else {
      if (!data.leadId) {
        toast.push("Choose a lead to create the deal from.", "error");
        return;
      }
      const payload = { leadId: data.leadId };
      if (data.dealValue !== "" && data.dealValue != null) payload.dealValue = Number(data.dealValue);
      if (data.commissionAmount !== "" && data.commissionAmount != null) payload.commissionAmount = Number(data.commissionAmount);
      if (data.commissionPercent !== "" && data.commissionPercent != null) payload.commissionPercent = Number(data.commissionPercent);
      const res = await dispatch(createDeal(payload));
      if (createDeal.fulfilled.match(res)) toast.push("Deal created.", "success");
      else toast.push(res.payload || "Failed to create deal.", "error");
    }
    setModalOpen(false);
  };

  const handleClose = async (row, outcome) => {
    const toStage = outcome === "won" ? "closed_won" : "closed_lost";
    const fromStage = STAGE_VALUES[row.stage];
    if (fromStage !== toStage && !(STAGE_TRANSITIONS[fromStage] || []).includes(toStage)) {
      toast.push(`Can't close from "${row.stage}" directly - move it through the pipeline first.`, "error");
      return;
    }
    const res = await dispatch(closeDeal({ id: row.id, outcome }));
    if (closeDeal.fulfilled.match(res)) toast.push(`${row.customerName || "Deal"} marked ${outcome}.`, "success");
    else toast.push(res.payload || "Failed to close deal.", "error");
  };

  // DataTable groups purely by the row's current stage value, so an invalid
  // drop (rejected below, no dispatch) simply snaps back to its real column
  // on the next render - no separate revert logic needed.
  const handleKanbanDrop = async (row, stageLabel) => {
    const fromStage = STAGE_VALUES[row.stage];
    const toStage = STAGE_VALUES[stageLabel];
    const allowed = STAGE_TRANSITIONS[fromStage] || [];
    if (!allowed.includes(toStage)) {
      toast.push(`Can't move a deal from "${row.stage}" to "${stageLabel}". Allowed: ${allowed.map((s) => STAGE_LABELS[s]).join(", ") || "none (terminal stage)"}.`, "error");
      return;
    }
    const res = await dispatch(updateDealStage({ id: row.id, stage: toStage }));
    if (updateDealStage.fulfilled.match(res)) toast.push(`${row.customerName || "Deal"} moved to ${stageLabel}.`, "success");
    else toast.push(res.payload || "Failed to move deal.", "error");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Deal Pipeline"
        title="Deals"
        subtitle="Track every deal from inquiry through documentation to close."
      />

      <DataTable
        columns={columns}
        data={rows}
        loading={status === "loading"}
        statsItems={dealStats}
        toolbarActions={permissions.create ? <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary"><LuPlus className="h-4 w-4" /> Add deal</button> : undefined}
        searchKeys={["customerName", "propertyTitle", "brokerName"]}
        filters={[{ key: "stage", label: "Stage", options: STAGES }]}
        getActions={getActions}
        renderCard={(r) => (
          <div>
            <p className="font-semibold text-ink-900">{r.customerName || "—"}</p>
            <p className="mt-1 text-xs text-ink-500">{r.propertyTitle || "No property"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge value={r.stage} />
            </div>
            <div className="mt-3 text-xs text-ink-500">
              <p>Value: {formatValue(r.dealValue)}</p>
              <p>Broker: {r.brokerName || "—"}</p>
            </div>
          </div>
        )}
        kanban={{ key: "stage", columns: STAGES }}
        onKanbanDrop={permissions.edit ? handleKanbanDrop : undefined}
        onExport={permissions.export ? () => toast.push("Exporting deals to CSV…", "info") : undefined}
        emptyTitle="No deals yet"
        emptySubtitle="Deals move here once a lead progresses past first contact."
      />
      <QuickFormModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSave}
        title={editing ? "Edit deal" : "Add deal"}
        description={editing ? "Update this deal's value and commission." : "New deals are created from a lead, which carries over its customer, property and assigned broker."}
        fields={editing ? editFields : createFields}
        initial={editing ? { dealValue: editing.dealValue ?? "", commissionAmount: editing.commissionAmount ?? "", commissionPercent: editing.commissionPercent ?? "" } : {}}
        submitLabel={editing ? "Save changes" : "Create deal"}
      />
    </div>
  );
}
