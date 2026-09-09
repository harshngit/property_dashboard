import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import Modal, { ConfirmDialog } from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import QuickFormModal from "../../components/common/QuickFormModal";
import { useToast } from "../../components/common/ToastProvider";
import {
  fetchUnitsByProject, createUnit, updateUnitStatus, deleteUnit, bulkDeleteUnits,
} from "../../redux/slices/projectsSlice";

const UNIT_STATUSES = ["available", "held", "sold"];
const STATUS_LABEL = { available: "Available", held: "Held", sold: "Sold" };

const UNIT_FIELDS = [
  { key: "unitNumber", label: "Unit number", placeholder: "e.g. A-101" },
  { key: "floor", label: "Floor", type: "number", placeholder: "e.g. 1" },
  { key: "size", label: "Size (sq. ft.)", type: "number", placeholder: "e.g. 950" },
  { key: "price", label: "Price (₹)", type: "number", placeholder: "e.g. 4500000" },
];

const formatPrice = (value) => (value == null || value === "" ? "—" : `₹${Number(value).toLocaleString("en-IN")}`);

export default function UnitsModal({ project, open, onClose, canManage }) {
  const toast = useToast();
  const dispatch = useDispatch();
  const { unitsByProject } = useSelector((s) => s.projects);
  const units = useMemo(() => (project ? unitsByProject[project.id] || [] : []), [project, unitsByProject]);

  const [addOpen, setAddOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  useEffect(() => {
    if (project) dispatch(fetchUnitsByProject({ projectId: project.id }));
  }, [project, dispatch]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => units.some((u) => u.id === id)));
  }, [units]);

  const toggleSelection = (id) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((rowId) => rowId !== id) : [...current, id]));
  };

  const handleAdd = async (data) => {
    const res = await dispatch(createUnit({
      projectId: project.id,
      unitNumber: data.unitNumber,
      floor: data.floor !== "" ? Number(data.floor) : undefined,
      size: data.size !== "" ? Number(data.size) : undefined,
      price: Number(data.price),
    }));
    if (createUnit.fulfilled.match(res)) toast.push(`Unit ${data.unitNumber} added.`, "success");
    else toast.push(res.payload || "Failed to add unit.", "error");
    setAddOpen(false);
  };

  const handleStatusChange = async (unit, nextStatus) => {
    const res = await dispatch(updateUnitStatus({ id: unit.id, status: nextStatus }));
    if (updateUnitStatus.fulfilled.match(res)) toast.push(`Unit ${unit.unitNumber} marked ${STATUS_LABEL[nextStatus].toLowerCase()}.`, "success");
    else toast.push(res.payload || "Failed to update unit.", "error");
  };

  const confirmDelete = async () => {
    const res = await dispatch(deleteUnit(toDelete.id));
    if (deleteUnit.fulfilled.match(res)) toast.push(`Unit ${toDelete.unitNumber} deleted.`, "success");
    else toast.push(res.payload || "Failed to delete unit.", "error");
    setToDelete(null);
  };

  const confirmBulkDelete = async () => {
    const res = await dispatch(bulkDeleteUnits(selectedIds));
    if (bulkDeleteUnits.fulfilled.match(res)) {
      toast.push(`${res.payload.deletedCount} unit(s) deleted.`, "success");
      setSelectedIds([]);
    } else {
      toast.push(res.payload || "Failed to delete units.", "error");
    }
    setBulkConfirmOpen(false);
  };

  if (!project) return null;

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Units — ${project.name}`} description="Add and manage individual units within this project." maxWidth="max-w-2xl">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            {selectedIds.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink-500">{selectedIds.length} selected</span>
                <button type="button" onClick={() => setBulkConfirmOpen(true)} className="btn-outline btn-sm rounded-xl border-coral-200 text-coral-600 hover:bg-coral-50">
                  <LuTrash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            ) : <span className="text-sm text-ink-500">{units.length} unit(s)</span>}
            {canManage && (
              <button type="button" onClick={() => setAddOpen(true)} className="btn-primary btn-sm">
                <LuPlus className="h-4 w-4" /> Add unit
              </button>
            )}
          </div>

          <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-line">
            <table className="table-base min-w-full">
              <thead>
                <tr>
                  {canManage && <th className="w-10"></th>}
                  <th>Unit</th>
                  <th>Floor</th>
                  <th>Size</th>
                  <th>Price</th>
                  <th>Status</th>
                  {canManage && <th></th>}
                </tr>
              </thead>
              <tbody>
                {units.length === 0 ? (
                  <tr><td colSpan={canManage ? 7 : 5} className="py-8 text-center text-sm text-ink-500">No units added yet.</td></tr>
                ) : units.map((u) => (
                  <tr key={u.id}>
                    {canManage && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(u.id)}
                          onChange={() => toggleSelection(u.id)}
                          className="h-4 w-4 rounded border-line text-[#ff512f] focus:ring-[#dd2476]"
                        />
                      </td>
                    )}
                    <td className="font-semibold text-ink-900">{u.unitNumber}</td>
                    <td>{u.floor ?? "—"}</td>
                    <td>{u.size ? `${u.size} sq.ft.` : "—"}</td>
                    <td>{formatPrice(u.price)}</td>
                    <td>
                      {canManage ? (
                        <select
                          value={u.status}
                          onChange={(e) => handleStatusChange(u, e.target.value)}
                          className="rounded-lg border border-line bg-white px-2 py-1 text-xs"
                        >
                          {UNIT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                        </select>
                      ) : (
                        <StatusBadge value={STATUS_LABEL[u.status] || u.status} />
                      )}
                    </td>
                    {canManage && (
                      <td className="text-right">
                        <button type="button" onClick={() => setToDelete(u)} className="rounded-lg p-1.5 text-coral-600 hover:bg-coral-50">
                          <LuTrash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <QuickFormModal
        open={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleAdd}
        title="Add unit"
        description={`Add a new unit to ${project.name}.`}
        fields={UNIT_FIELDS}
        initial={{}}
        submitLabel="Add unit"
      />

      <ConfirmDialog
        open={!!toDelete} onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this unit?"
        description={`Unit ${toDelete?.unitNumber} will be permanently removed.`}
      />

      <ConfirmDialog
        open={bulkConfirmOpen} onClose={() => setBulkConfirmOpen(false)}
        onConfirm={confirmBulkDelete}
        title={`Delete ${selectedIds.length} units?`}
        description="These units will be permanently removed."
      />
    </>
  );
}
