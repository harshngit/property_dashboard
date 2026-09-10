import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  LuArrowLeft, LuPencil, LuMapPin, LuBuilding, LuChevronLeft, LuChevronRight, LuLayoutGrid,
  LuCheck, LuDumbbell, LuWaves, LuSquareParking, LuBaby, LuWifi, LuZap, LuTrees, LuArrowUpDown, LuCctv,
} from "react-icons/lu";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import Avatar from "../../components/common/Avatar";
import { InlineSpinner } from "../../components/common/PageLoader";
import { usePageTitle } from "../../context/PageTitleContext";
import useAuth from "../../hooks/useAuth";
import { ROLES } from "../../config/roles";
import { fetchProjectById, clearCurrentProject } from "../../redux/slices/projectsSlice";
import { fetchUsers } from "../../redux/slices/usersSlice";
import UnitsModal from "./UnitsModal";

const STATUS_LABEL = {
  draft: "Draft", upcoming: "Upcoming", ongoing: "Ongoing", completed: "Completed", on_hold: "On Hold",
};
const formatPrice = (value) => (value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`);

// Amenities are stored as plain strings (no icon field) - pick an icon by
// keyword match for display only, no schema change involved (mirrors the
// same lookup PropertyDetail.jsx uses).
const AMENITY_ICONS = [
  [/gym|fitness/i, LuDumbbell],
  [/pool|swim/i, LuWaves],
  [/park/i, LuSquareParking],
  [/security|guard|cctv|camera/i, LuCctv],
  [/kids|play/i, LuBaby],
  [/wifi|broadband|internet/i, LuWifi],
  [/power|backup|generator/i, LuZap],
  [/lawn|garden|park(?!ing)/i, LuTrees],
  [/lift|elevator/i, LuArrowUpDown],
];
const amenityIcon = (label) => AMENITY_ICONS.find(([re]) => re.test(label))?.[1] || LuCheck;

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { permissions, role } = useAuth();
  const { current: project, status } = useSelector((s) => s.projects);
  const { list: users } = useSelector((s) => s.users);
  const { setTitle } = usePageTitle();

  const [activeImage, setActiveImage] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);

  const canDelete = role === ROLES.BUILDER || role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;

  useEffect(() => {
    dispatch(fetchProjectById(id));
    dispatch(fetchUsers({ role: ROLES.BUILDER, limit: 100 }));
    return () => dispatch(clearCurrentProject());
  }, [dispatch, id]);

  useEffect(() => {
    setTitle(project?.id === id ? project.name || "Project" : "Project");
  }, [project, id, setTitle]);

  useEffect(() => {
    setActiveImage(0);
    setImageFailed(false);
  }, [id]);

  if (!project || project.id !== id) {
    if (status === "failed") return <EmptyState title="Project not found" subtitle={`No project with id ${id}.`} />;
    return (
      <div className="flex items-center justify-center py-24 text-ink-500">
        <InlineSpinner className="h-6 w-6" />
      </div>
    );
  }

  const builderName = users.find((u) => u.id === project.builderId)?.name || "—";
  const media = project.media || [];

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
        <LuArrowLeft className="h-4 w-4" /> Back to projects
      </button>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink-950">{project.name}</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            {[project.address, project.locality, project.city].filter(Boolean).join(", ") || "No address set"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={() => setUnitsOpen(true)} className="btn-outline">
            <LuLayoutGrid className="h-4 w-4" /> Manage units
          </button>
          {permissions.edit && (
            <button onClick={() => navigate(`/app/projects/${project.id}/edit`)} className="btn-primary">
              <LuPencil className="h-4 w-4" /> Edit project
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <StatusBadge value={STATUS_LABEL[project.status] || project.status} />
      </div>

      <div className="card mb-5 overflow-hidden p-1.5">
        <div className="relative aspect-[16/7] w-full overflow-hidden rounded-xl bg-[linear-gradient(135deg,#ff512f_0%,#dd2476_100%)]">
          {media[activeImage]?.url && !imageFailed ? (
            <img
              src={media[activeImage].url}
              alt={project.name}
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white">
              <LuBuilding className="h-12 w-12 opacity-80" />
            </div>
          )}
          {media.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => { setActiveImage((i) => (i === 0 ? media.length - 1 : i - 1)); setImageFailed(false); }}
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-card hover:bg-white"
              >
                <LuChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => { setActiveImage((i) => (i === media.length - 1 ? 0 : i + 1)); setImageFailed(false); }}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-card hover:bg-white"
              >
                <LuChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        {media.length > 1 && (
          <div className="mt-1.5 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setActiveImage(i); setImageFailed(false); }}
                className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${i === activeImage ? "border-[#dd2476]" : "border-transparent"}`}
              >
                {m.url ? <img src={m.url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-surface-sunk" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card mb-5 p-6">
        {project.description ? (
          <p className="text-sm leading-relaxed text-ink-700">{project.description}</p>
        ) : (
          <p className="text-sm text-ink-500">No description added yet.</p>
        )}
        {project.amenities?.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-line pt-4 sm:grid-cols-3">
            {project.amenities.map((a) => {
              const Icon = amenityIcon(a);
              return (
                <span key={a} className="flex items-center gap-2 text-sm text-ink-700">
                  <Icon className="h-4 w-4 shrink-0 text-red-500" /> {a}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {project.configurations?.length > 0 && (
        <div className="card mb-5 p-6">
          <h3 className="mb-4 font-display text-base font-bold text-ink-950">Configurations</h3>
          <div className="overflow-x-auto">
            <table className="table-base min-w-full">
              <thead>
                <tr>
                  <th>BHK</th>
                  <th>Area</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {project.configurations.map((cfg, i) => (
                  <tr key={i}>
                    <td className="font-semibold text-ink-900">{cfg.bhk}</td>
                    <td>{cfg.area ? `${cfg.area} sq.ft.` : "—"}</td>
                    <td>{formatPrice(cfg.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h4 className="text-xs font-bold uppercase tracking-wide text-ink-500">Builder</h4>
        <div className="mt-3 flex items-center gap-3">
          <Avatar name={builderName} size={40} color="#F59E0B" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink-900">{builderName}</p>
            <p className="flex items-center gap-1.5 text-xs text-ink-500"><LuMapPin className="h-3.5 w-3.5" /> {[project.locality, project.city].filter(Boolean).join(", ") || "—"}</p>
          </div>
        </div>
      </div>

      <UnitsModal project={unitsOpen ? project : null} open={unitsOpen} onClose={() => setUnitsOpen(false)} canManage={canDelete} />
    </div>
  );
}
