import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import ProjectForm from "./ProjectForm";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { fetchProjectById, clearCurrentProject } from "../../redux/slices/projectsSlice";

export default function ProjectEdit() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current: project, status } = useSelector((s) => s.projects);

  useEffect(() => {
    dispatch(fetchProjectById(id));
    return () => dispatch(clearCurrentProject());
  }, [dispatch, id]);

  if (!project || project.id !== id) {
    return status === "failed"
      ? <EmptyState title="Project not found" subtitle={`No project with id ${id}.`} />
      : (
        <div className="flex items-center justify-center py-24 text-ink-500">
          <InlineSpinner className="h-6 w-6" />
        </div>
      );
  }

  return <ProjectForm mode="edit" project={project} />;
}
