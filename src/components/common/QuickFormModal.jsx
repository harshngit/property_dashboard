import { useEffect, useState } from "react";
import Modal from "./Modal";
import { TextField, SelectField } from "./FormField";
import { InlineSpinner } from "./PageLoader";
import { LuSave } from "react-icons/lu";

/**
 * fields: [{ key, label, type: 'text'|'select', options?, placeholder? }]
 */
export default function QuickFormModal({ open, onClose, onSubmit, title, description, fields, initial, submitLabel = "Save" }) {
  const [form, setForm] = useState(initial || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(initial || {});
  }, [open, initial]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onSubmit(form);
    }, 500);
  };

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) =>
            f.type === "select" ? (
              <SelectField key={f.key} label={f.label} options={f.options} value={form[f.key] ?? ""} onChange={set(f.key)} className={f.full ? "sm:col-span-2" : ""} />
            ) : (
              <TextField key={f.key} type={f.type || "text"} label={f.label} placeholder={f.placeholder} value={form[f.key] ?? ""} onChange={set(f.key)} className={f.full ? "sm:col-span-2" : ""} />
            )
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <InlineSpinner className="h-4 w-4" /> : <LuSave className="h-4 w-4" />}
            {saving ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
