import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuSave, LuX, LuUpload } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import { TextField, SelectField, TextareaField } from "../../components/common/FormField";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";

const emptyProperty = {
  title: "", type: "Apartment", txn: "Sale", location: "", price: "",
  units: "", status: "Pending Approval", amenities: "", description: "",
};

export default function PropertyForm({ initial, mode = "create" }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(initial || emptyProperty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Property title is required.";
    if (!form.location.trim()) e.location = "Location is required.";
    if (!form.price.trim()) e.price = "Add a price or price range.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.push(mode === "create" ? "Property submitted for approval." : "Property updated successfully.", "success");
      navigate("/app/properties");
    }, 700);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Property Listings"
        title={mode === "create" ? "Add a new property" : `Edit property — ${form.title}`}
        subtitle="Complete listing details will appear on the customer-facing site once approved."
      />
      <form onSubmit={submit} className="card space-y-6 p-6">
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Listing details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Property / project title" placeholder="e.g. Orchid Heights" value={form.title} onChange={set("title")} error={errors.title} className="sm:col-span-2" />
            <SelectField label="Property type" value={form.type} onChange={set("type")} options={["Apartment", "Villa", "Commercial", "Plot"]} />
            <SelectField label="Transaction type" value={form.txn} onChange={set("txn")} options={["Sale", "Rent", "Lease"]} />
            <TextField label="Location" placeholder="Locality, City" value={form.location} onChange={set("location")} error={errors.location} />
            <TextField label="Price" placeholder="e.g. 1.2 - 1.6 Cr" value={form.price} onChange={set("price")} error={errors.price} />
            <TextField label="Total units / inventory" placeholder="e.g. 48" value={form.units} onChange={set("units")} />
            <SelectField label="Status" value={form.status} onChange={set("status")} options={["Active", "Pending Approval", "Inactive"]} />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">More information</h3>
          <TextField label="Amenities (comma separated)" placeholder="Clubhouse, Gym, Swimming pool" value={form.amenities} onChange={set("amenities")} className="mb-4" />
          <TextareaField label="Description" placeholder="Highlights, connectivity, possession date…" value={form.description} onChange={set("description")} />
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Media</h3>
          <div className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-surface-muted px-6 py-8 text-center transition-colors hover:border-red-400 hover:bg-red-50/40">
            <LuUpload className="mb-2 h-6 w-6 text-ink-500" />
            <p className="text-sm font-semibold text-ink-700">Drag & drop images, or click to browse</p>
            <p className="mt-1 text-xs text-ink-500">PNG or JPG up to 10MB each</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-line pt-5">
          <button type="button" onClick={() => navigate("/app/properties")} className="btn-outline">
            <LuX className="h-4 w-4" /> Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <InlineSpinner className="h-4 w-4" /> : <LuSave className="h-4 w-4" />}
            {saving ? "Saving…" : mode === "create" ? "Submit listing" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
