import { Link } from "react-router-dom";
import { LuArrowLeft } from "react-icons/lu";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-6 text-center">
      <p className="font-display text-6xl font-extrabold text-indigo-500">404</p>
      <h1 className="mt-2 font-display text-xl font-bold text-ink-950">Page not found</h1>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500">The page you're looking for doesn't exist or may have moved.</p>
      <Link to="/" className="btn-primary mt-6"><LuArrowLeft className="h-4 w-4" /> Back to home</Link>
    </div>
  );
}
