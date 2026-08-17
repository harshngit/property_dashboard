import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { LuSave, LuX, LuUpload, LuTrash2, LuCrown, LuImageOff } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import { TextField, SelectField, TextareaField } from "../../components/common/FormField";
import LocationAutocomplete from "../../components/common/LocationAutocomplete";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import {
  createProperty, updateProperty, uploadPropertyMedia, deletePropertyMedia, setPrimaryPropertyMedia,
} from "../../redux/slices/propertiesSlice";

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "independent_house", label: "Independent House" },
  { value: "plot", label: "Plot" },
  { value: "commercial", label: "Commercial" },
  { value: "farmhouse", label: "Farmhouse" },
  { value: "other", label: "Other" },
];
const TRANSACTION_TYPES = [
  { value: "sell", label: "Sale" },
  { value: "rent", label: "Rent" },
  { value: "buy", label: "Buy" },
];

const emptyProperty = {
  title: "", description: "", propertyType: "apartment", transactionType: "sell", price: "",
  city: "", locality: "", address: "", latitude: "", longitude: "", areaSqft: "", bedrooms: "", bathrooms: "", amenities: "",
};

// `property` (edit mode only) is the normalized property from propertiesSlice.
// PUT /properties/:id doesn't accept price - it has its own dedicated
// endpoint (see the "Update price" action on the list/detail pages), so
// price is create-only here and shown read-only in edit mode.
export default function PropertyForm({ mode = "create", property }) {
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch();

  const [form, setForm] = useState(
    mode === "edit" && property
      ? {
          title: property.title || "",
          description: property.description || "",
          propertyType: property.propertyType || "apartment",
          transactionType: property.transactionType || "sell",
          price: property.price ?? "",
          city: property.city || "",
          locality: property.locality || "",
          address: property.address || "",
          latitude: property.latitude ?? "",
          longitude: property.longitude ?? "",
          areaSqft: property.areaSqft ?? "",
          bedrooms: property.bedrooms ?? "",
          bathrooms: property.bathrooms ?? "",
          amenities: (property.amenities || []).join(", "),
        }
      : emptyProperty
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [brokenPhotoIds, setBrokenPhotoIds] = useState(() => new Set());
  const fileInputRef = useRef(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handlePlaceSelected = (place) => {
    setForm((f) => ({
      ...f,
      address: place.address || f.address,
      city: place.city || f.city,
      locality: place.locality || f.locality,
      latitude: place.latitude ?? f.latitude,
      longitude: place.longitude ?? f.longitude,
    }));
  };

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploadingPhoto(true);
    for (const file of files) {
      const res = await dispatch(uploadPropertyMedia({ id: property.id, file }));
      if (!uploadPropertyMedia.fulfilled.match(res)) {
        toast.push(res.payload || `Failed to upload ${file.name}.`, "error");
      }
    }
    setUploadingPhoto(false);
  };

  const handlePhotoDelete = async (mediaId) => {
    const res = await dispatch(deletePropertyMedia({ id: property.id, mediaId }));
    if (!deletePropertyMedia.fulfilled.match(res)) {
      toast.push(res.payload || "Failed to remove photo.", "error");
    }
  };

  const handleSetPrimary = async (mediaId) => {
    const res = await dispatch(setPrimaryPropertyMedia({ id: property.id, mediaId }));
    if (!setPrimaryPropertyMedia.fulfilled.match(res)) {
      toast.push(res.payload || "Failed to set cover photo.", "error");
    }
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Property title is required.";
    if (!form.city.trim()) e.city = "City is required.";
    if (mode === "create" && !String(form.price).trim()) e.price = "Add a price.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const amenities = form.amenities.split(",").map((a) => a.trim()).filter(Boolean);
    const payload = {
      title: form.title,
      description: form.description || undefined,
      propertyType: form.propertyType,
      transactionType: form.transactionType,
      city: form.city,
      locality: form.locality || undefined,
      address: form.address || undefined,
      latitude: form.latitude !== "" ? Number(form.latitude) : undefined,
      longitude: form.longitude !== "" ? Number(form.longitude) : undefined,
      areaSqft: form.areaSqft ? Number(form.areaSqft) : undefined,
      bedrooms: form.bedrooms !== "" ? Number(form.bedrooms) : undefined,
      bathrooms: form.bathrooms !== "" ? Number(form.bathrooms) : undefined,
      amenities,
    };

    const res = mode === "create"
      ? await dispatch(createProperty({ ...payload, price: Number(form.price) }))
      : await dispatch(updateProperty({ id: property.id, ...payload }));

    setSaving(false);

    const success = mode === "create" ? createProperty.fulfilled.match(res) : updateProperty.fulfilled.match(res);
    if (success) {
      if (mode === "create") {
        toast.push("Property submitted for approval — now add some photos.", "success");
        navigate(`/app/properties/${res.payload.id}/edit`);
      } else {
        toast.push("Property updated successfully.", "success");
        navigate("/app/properties");
      }
    } else {
      toast.push(res.payload || "Something went wrong.", "error");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Property Listings"
        title={mode === "create" ? "Add a new property" : `Edit property — ${property?.title || ""}`}
        subtitle="Complete listing details will appear on the customer-facing site once approved."
      />
      <form onSubmit={submit} className="card space-y-6 p-6">
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Listing details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Property / project title" placeholder="e.g. Orchid Heights" value={form.title} onChange={set("title")} error={errors.title} className="sm:col-span-2" />
            <SelectField label="Property type" value={form.propertyType} onChange={set("propertyType")} options={PROPERTY_TYPES} />
            <SelectField label="Transaction type" value={form.transactionType} onChange={set("transactionType")} options={TRANSACTION_TYPES} />
            <LocationAutocomplete
              label="Search location (Google)"
              onPlaceSelected={handlePlaceSelected}
              className="sm:col-span-2"
            />
            <TextField label="City" placeholder="e.g. Bengaluru" value={form.city} onChange={set("city")} error={errors.city} />
            <TextField label="Locality" placeholder="e.g. Whitefield" value={form.locality} onChange={set("locality")} />
            <TextField label="Address (optional)" placeholder="Full address" value={form.address} onChange={set("address")} className="sm:col-span-2" />
            {mode === "create" ? (
              <TextField label="Price" type="number" placeholder="e.g. 12000000" value={form.price} onChange={set("price")} error={errors.price} />
            ) : (
              <TextField label="Price" value={`₹${Number(property?.price || 0).toLocaleString("en-IN")}`} disabled className="opacity-70" />
            )}
            <TextField label="Area (sqft)" type="number" placeholder="e.g. 1450" value={form.areaSqft} onChange={set("areaSqft")} />
            <TextField label="Bedrooms" type="number" placeholder="e.g. 3" value={form.bedrooms} onChange={set("bedrooms")} />
            <TextField label="Bathrooms" type="number" placeholder="e.g. 2" value={form.bathrooms} onChange={set("bathrooms")} />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">More information</h3>
          <TextField label="Amenities (comma separated)" placeholder="Clubhouse, Gym, Swimming pool" value={form.amenities} onChange={set("amenities")} className="mb-4" />
          <TextareaField label="Description" placeholder="Highlights, connectivity, possession date…" value={form.description} onChange={set("description")} />
        </div>

        {mode === "edit" && (
          <div>
            <h3 className="mb-3 flex items-center justify-between text-sm font-bold uppercase tracking-wide text-ink-500">
              <span>Photos</span>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto} className="btn-outline btn-sm normal-case tracking-normal">
                {uploadingPhoto ? <InlineSpinner className="h-3.5 w-3.5" /> : <LuUpload className="h-3.5 w-3.5" />}
                Add photos
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
            </h3>
            {property?.media?.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {property.media.map((m) => {
                  const isBroken = !m.url || brokenPhotoIds.has(m.id);
                  return (
                    <div key={m.id} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-sunk">
                      {isBroken ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-ink-400">
                          <LuImageOff className="h-6 w-6" />
                          <span className="text-[10px] font-medium">Preview unavailable</span>
                        </div>
                      ) : (
                        <img
                          src={m.url}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={() => setBrokenPhotoIds((ids) => new Set(ids).add(m.id))}
                        />
                      )}
                      {m.isPrimary && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-[linear-gradient(135deg,#ff512f_0%,#dd2476_100%)] px-2 py-0.5 text-[10px] font-bold text-white">
                          Cover
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-ink-950/70 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                        {!m.isPrimary && (
                          <button type="button" onClick={() => handleSetPrimary(m.id)} title="Make main photo" className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-amber-600 hover:bg-white">
                            <LuCrown className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button type="button" onClick={() => handlePhotoDelete(m.id)} title="Remove photo" className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-coral-600 hover:bg-white">
                          <LuTrash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl bg-surface-sunk px-4 py-3 text-xs text-ink-500">No photos uploaded yet.</p>
            )}
          </div>
        )}

        {mode === "edit" && (
          <p className="rounded-xl bg-surface-sunk px-4 py-3 text-xs text-ink-500">
            Price changes, approvals and availability are managed from the property's action menu, not this form.
          </p>
        )}

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
