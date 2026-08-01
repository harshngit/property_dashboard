import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function useRouteLoading(duration = 420) {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), duration);
    return () => clearTimeout(t);
  }, [location.pathname, duration]);

  return loading;
}
