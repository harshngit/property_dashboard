import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LuSave, LuX, LuUpload, LuTrash2, LuCrown, LuImageOff, LuPlus } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import { TextField, SelectField, TextareaField } from "../../components/common/FormField";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { ROLES } from "../../config/roles";
import {
  createProject, updateProject, uploadProjectMedia, deleteProjectMedia, setPrimaryProjectMedia,
} from "../../redux/slices/projectsSlice";
import { fetchUsers } from "../../redux/slices/usersSlice";

const emptyProject = { name: "", city: "", locality: "", address: "", description: "", builderId: "" };
const emptyConfig = { bhk: "", area: "", price: "" };

// `project` (edit mode only) is the normalized project from projectsSlice.
export default function ProjectForm({ mode = "create", project }) {
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch();
  const { user, role } = useAuth();
  const { list: users } = useSelector((s) => s.users);

  const isBuilder = role === ROLES.BUILDER;

  // Fetched here rather than relying on the caller page to have already
  // loaded it - a direct visit to /projects/new (no prior stop on the list
  // page) would otherwise show an empty Builder dropdown.
  useEffect(() => {
    if (!isBuilder) dispatch(fetchUsers({ role: ROLES.BUILDER, limit: 100 }));
  }, [dispatch, isBuilder]);

  const builderOptions = useMemo(
    () => users.filter((u) => u.role === ROLES.BUILDER).map((u) => ({ value: u.id, label: u.name })),
    [users]
  );

  const [form, setForm] = useState(
    mode === "edit" && project
      ? {
          name: project.name || "",
          city: project.city || "",
          locality: project.locality || "",
          address: project.address || "",
          description: project.description || "",
          builderId: project.builderId || "",
        }
      : emptyProject
  );
  const [amenityInput, setAmenityInput] = useState("");
  const [amenities, setAmenities] = useState(mode === "edit" && project?.amenities ? project.amenities : []);
  const [configurations, setConfigurations] = useState(
    mode === "edit" && project?.configurations?.length ? project.configurations : []
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [brokenPhotoIds, setBrokenPhotoIds] = useState(() => new Set());
  const fileInputRef = useRef(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const addAmenity = () => {
    const value = amenityInput.trim();
    if (!value || amenities.includes(value)) {
      setAmenityInput("");
      return;
    }
    setAmenities((a) => [...a, value]);
    setAmenityInput("");
  };
  const removeAmenity = (value) => setAmenities((a) => a.filter((x) => x !== value));
  const handleAmenityKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addAmenity();
    }
  };

  const addConfiguration = () => setConfigurations((c) => [...c, { ...emptyConfig }]);
  const removeConfiguration = (index) => setConfigurations((c) => c.filter((_, i) => i !== index));
  const updateConfiguration = (index, key) => (e) =>
    setConfigurations((c) => c.map((item, i) => (i === index ? { ...item, [key]: e.target.value } : item)));

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploadingPhoto(true);
    for (const file of files) {
      const res = await dispatch(uploadProjectMedia({ id: project.id, file }));
      if (!uploadProjectMedia.fulfilled.match(res)) {
        toast.push(res.payload || `Failed to upload ${file.name}.`, "error");
      }
    }
    setUploadingPhoto(false);
  };

  const handlePhotoDelete = async (mediaId) => {
    const res = await dispatch(deleteProjectMedia({ id: project.id, mediaId }));
    if (!deleteProjectMedia.fulfilled.match(res)) {
      toast.push(res.payload || "Failed to remove photo.", "error");
    }
  };

  const handleSetPrimary = async (mediaId) => {
    const res = await dispatch(setPrimaryProjectMedia({ id: project.id, mediaId }));
    if (!setPrimaryProjectMedia.fulfilled.match(res)) {
      toast.push(res.payload || "Failed to set cover photo.", "error");
    }
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Project name is required.";
    if (!form.city.trim()) e.city = "City is required.";
    if (!isBuilder && mode === "create" && !form.builderId) e.builderId = "Choose a builder.";
    const cleanConfigs = configurations.filter((c) => c.bhk.trim() || c.area !== "" || c.price !== "");
    const badConfig = cleanConfigs.find((c) => !c.bhk.trim() || c.price === "");
    if (badConfig) e.configurations = "Each configuration needs a BHK label and a price.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const cleanConfigs = configurations
      .filter((c) => c.bhk.trim() || c.area !== "" || c.price !== "")
      .map((c) => ({ bhk: c.bhk.trim(), area: c.area !== "" ? Number(c.area) : null, price: Number(c.price) }));

    const payload = {
      name: form.name,
      city: form.city,
      locality: form.locality || undefined,
      address: form.address || undefined,
      description: form.description || undefined,
      amenities,
      configurations: cleanConfigs,
    };

    const res = mode === "create"
      ? await dispatch(createProject({ ...payload, builderId: isBuilder ? user?.id : form.builderId }))
      : await dispatch(updateProject({ id: project.id, ...payload }));

    setSaving(false);

    const success = mode === "create" ? createProject.fulfilled.match(res) : updateProject.fulfilled.match(res);
    if (success) {
      if (mode === "create") {
        toast.push("Project created — now add some photos.", "success");
        navigate(`/app/projects/${res.payload.id}/edit`);
      } else {
        toast.push("Project updated successfully.", "success");
        navigate(`/app/projects/${project.id}`);
      }
    } else {
      toast.push(res.payload || "Something went wrong.", "error");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Builder Inventory"
        title={mode === "create" ? "Add a new project" : `Edit project — ${project?.name || ""}`}
        subtitle="Projects start in the Draft stage and can hold multiple units."
      />
      <form onSubmit={submit} className="card space-y-6 p-6">
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Project details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Project name" placeholder="e.g. Palm Grove Villas" value={form.name} onChange={set("name")} error={errors.name} className="sm:col-span-2" />
            {!isBuilder && (
              <SelectField
                label="Builder"
                value={form.builderId}
                onChange={set("builderId")}
                options={builderOptions}
                placeholder="Select…"
                disabled={mode === "edit"}
                error={errors.builderId}
              />
            )}
            <TextField label="City" placeholder="e.g. Pune" value={form.city} onChange={set("city")} error={errors.city} />
            <TextField label="Locality" placeholder="e.g. Baner" value={form.locality} onChange={set("locality")} />
            <TextField label="Address (optional)" placeholder="Full address" value={form.address} onChange={set("address")} className="sm:col-span-2" />
          </div>
          <TextareaField label="Description" placeholder="Highlights, connectivity, possession date…" value={form.description} onChange={set("description")} className="mt-4" />
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Amenities</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={amenityInput}
              onChange={(e) => setAmenityInput(e.target.value)}
              onKeyDown={handleAmenityKeyDown}
              placeholder="e.g. Clubhouse"
              className="field-input max-w-xs"
            />
            <button type="button" onClick={addAmenity} className="btn-outline btn-sm normal-case tracking-normal">
              <LuPlus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          {amenities.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {amenities.map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-700">
                  {a}
                  <button type="button" onClick={() => removeAmenity(a)} className="text-ink-400 hover:text-coral-600">
                    <LuX className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-ink-500">No amenities added yet.</p>
          )}
        </div>

        <div>
          <h3 className="mb-3 flex items-center justify-between text-sm font-bold uppercase tracking-wide text-ink-500">
            <span>Configurations (BHK / Area / Price)</span>
            <button type="button" onClick={addConfiguration} className="btn-outline btn-sm normal-case tracking-normal">
              <LuPlus className="h-3.5 w-3.5" /> Add configuration
            </button>
          </h3>
          {errors.configurations && <p className="mb-2 field-error">{errors.configurations}</p>}
          {configurations.length === 0 ? (
            <p className="rounded-xl bg-surface-sunk px-4 py-3 text-xs text-ink-500">No configurations added yet.</p>
          ) : (
            <div className="space-y-3">
              {configurations.map((cfg, index) => (
                <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-line p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <TextField label="BHK" placeholder="e.g. 2 BHK" value={cfg.bhk} onChange={updateConfiguration(index, "bhk")} />
                  <TextField label="Area (sq. ft.)" type="number" placeholder="e.g. 950" value={cfg.area} onChange={updateConfiguration(index, "area")} />
                  <TextField label="Price (₹)" type="number" placeholder="e.g. 4500000" value={cfg.price} onChange={updateConfiguration(index, "price")} />
                  <div className="flex items-end">
                    <button type="button" onClick={() => removeConfiguration(index)} className="flex h-10 w-10 items-center justify-center rounded-xl text-coral-600 hover:bg-coral-50">
                      <LuTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
            {project?.media?.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {project.media.map((m) => {
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

        <div className="flex justify-end gap-3 border-t border-line pt-5">
          <button type="button" onClick={() => navigate("/app/projects")} className="btn-outline">
            <LuX className="h-4 w-4" /> Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <InlineSpinner className="h-4 w-4" /> : <LuSave className="h-4 w-4" />}
            {saving ? "Saving…" : mode === "create" ? "Create project" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
