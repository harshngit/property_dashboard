import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuSave, LuX } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import { TextField, SelectField, TextareaField } from "../../components/common/FormField";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";

const emptyLead = {
  name: "", phone: "", email: "", source: "Website", property: "",
  budget: "", score: "warm", status: "New", owner: "Unassigned", notes: "",
};

export default function LeadForm({ initial, mode = "create" }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(initial || emptyLead);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Lead name is required.";
    if (!/^[+0-9 ]{7,15}$/.test(form.phone.trim())) e.phone = "Enter a valid phone number.";
    if (!form.property.trim()) e.property = "Link this lead to a property or project.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.push(mode === "create" ? "Lead created successfully." : "Lead updated successfully.", "success");
      navigate("/app/leads");
    }, 700);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Lead Management"
        title={mode === "create" ? "Add a new lead" : `Edit lead — ${form.name}`}
        subtitle="Capture inquiry details so AI qualification and matching can kick in."
      />
      <form onSubmit={submit} className="card space-y-6 p-6">
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Contact details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Full name" placeholder="e.g. Karan Mehta" value={form.name} onChange={set("name")} error={errors.name} />
            <TextField label="Phone number" placeholder="+91 98200 11223" value={form.phone} onChange={set("phone")} error={errors.phone} />
            <TextField label="Email (optional)" type="email" placeholder="name@email.com" value={form.email} onChange={set("email")} />
            <SelectField label="Source" value={form.source} onChange={set("source")} options={["Website", "WhatsApp", "Campaign", "Referral", "Walk-in"]} />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Requirement</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Interested property / project" placeholder="e.g. Orchid Heights, 3BHK" value={form.property} onChange={set("property")} error={errors.property} className="sm:col-span-2" />
            <TextField label="Budget" placeholder="e.g. 1.4 Cr" value={form.budget} onChange={set("budget")} />
            <SelectField label="Lead score" value={form.score} onChange={set("score")} options={["hot", "warm", "cold"]} />
            <SelectField label="Status" value={form.status} onChange={set("status")} options={["New", "Contacted", "Site Visit", "Negotiation", "Booking", "Lost"]} />
            <TextField label="Assigned owner" placeholder="Broker or sales user" value={form.owner} onChange={set("owner")} />
          </div>
        </div>

        <TextareaField label="Notes" placeholder="Conversation summary, preferences, timeline…" value={form.notes} onChange={set("notes")} />

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
