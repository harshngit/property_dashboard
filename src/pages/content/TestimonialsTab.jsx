import { useState } from "react";
import { LuPencil, LuPlus, LuStar, LuTrash2 } from "react-icons/lu";
import Modal, { ConfirmDialog } from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import { TextField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate } from "../../lib/format";

// Testimonials for the website home and city pages. Only published ones are
// shown, lowest "order" first; a testimonial with a city is shown first on
// that city's page. Phone numbers, emails and links are not allowed.

const EMPTY = { personName: "", personRole: "", city: "", quote: "", rating: 5, photoUrl: "", sortOrder: 0, isPublished: true };

export default function TestimonialsTab() {
  const call = useApiCall();
  const toast = useToast();
  const { data, reload } = useApiQuery("/content/manage/testimonials");
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const rows = data || [];
  const set = (k) => (e) => setEditing((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const run = async (fn, message) => {
    setBusy(true);
    try {
      await fn();
      toast.push(message, "success");
      setEditing(null);
      setToDelete(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const save = () => {
    const body = {
      personName: editing.personName.trim(),
      personRole: editing.personRole?.trim() || null,
      city: editing.city?.trim() || null,
      quote: editing.quote.trim(),
      rating: Number(editing.rating) || 5,
      photoUrl: editing.photoUrl?.trim() || null,
      sortOrder: Number(editing.sortOrder) || 0,
      isPublished: !!editing.isPublished,
    };
    return run(
      () => (editing.id ? call(`/content/manage/testimonials/${editing.id}`, { method: "PUT", body }) : call("/content/manage/testimonials", { method: "POST", body })),
      editing.id ? "Testimonial saved." : "Testimonial added."
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <p className="text-xs text-ink-500">{rows.filter((r) => r.isPublished).length} published · shown on the website home page and city pages.</p>
        <button className="btn-primary btn-sm ml-auto" onClick={() => setEditing({ ...EMPTY })}><LuPlus className="h-4 w-4" /> New testimonial</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
            <tr><th className="px-4 py-3">Person</th><th className="px-4 py-3">Quote</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2.5"><p className="font-semibold text-ink-900">{r.personName}</p><p className="text-xs text-ink-500">{[r.personRole, r.city].filter(Boolean).join(" · ") || "—"}</p></td>
                <td className="max-w-[360px] px-4 py-2.5 text-ink-600">{r.quote}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-amber-500">{Array.from({ length: r.rating }).map((_, i) => <LuStar key={i} className="inline h-3.5 w-3.5" fill="currentColor" />)}</td>
                <td className="px-4 py-2.5 text-ink-600">{r.sortOrder}</td>
                <td className="px-4 py-2.5">
                  <button title={r.isPublished ? "Unpublish" : "Publish"} disabled={busy} onClick={() => run(() => call(`/content/manage/testimonials/${r.id}`, { method: "PUT", body: { isPublished: !r.isPublished } }), r.isPublished ? "Taken off the website." : "Published.")}>
                    <StatusBadge value={r.isPublished ? "Published" : "Draft"} />
                  </button>
                </td>
                <td className="px-4 py-2.5 text-ink-500">{formatDate(r.updatedAt)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  <button className="mr-3 text-ink-500 hover:text-ink-900" title="Edit" onClick={() => setEditing({ ...EMPTY, ...r, personRole: r.personRole || "", city: r.city || "", photoUrl: r.photoUrl || "" })}><LuPencil className="h-4 w-4" /></button>
                  <button className="text-red-500 hover:text-red-700" title="Delete" onClick={() => setToDelete(r)}><LuTrash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-500">No testimonials yet. Until one is published the website hides the testimonials section.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit testimonial" : "New testimonial"} description="Use the person's own words, with their permission. No phone numbers, emails or links.">
        {editing && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Name" value={editing.personName} onChange={set("personName")} />
              <TextField label="Who they are" placeholder="e.g. Home buyer, NRI owner" value={editing.personRole} onChange={set("personRole")} />
              <TextField label="City (optional)" value={editing.city} onChange={set("city")} />
              <label className="block"><span className="field-label">Rating</span>
                <select className="field-select" value={editing.rating} onChange={set("rating")}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>)}</select>
              </label>
            </div>
            <TextareaField label="Quote" rows={4} value={editing.quote} onChange={set("quote")} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Photo link (optional, https)" value={editing.photoUrl} onChange={set("photoUrl")} />
              <TextField label="Order (lowest first)" type="number" value={editing.sortOrder} onChange={set("sortOrder")} />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-700"><input type="checkbox" checked={!!editing.isPublished} onChange={set("isPublished")} className="h-4 w-4 accent-red-600" /> Show on the website</label>
            <div className="flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy || editing.personName.trim().length < 2 || editing.quote.trim().length < 10} onClick={save}>Save</button>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={() => run(() => call(`/content/manage/testimonials/${toDelete.id}`, { method: "DELETE" }), "Testimonial deleted.")} title="Delete testimonial?" description={toDelete?.personName} />
    </div>
  );
}
