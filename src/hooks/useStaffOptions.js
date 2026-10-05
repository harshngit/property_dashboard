import { useEffect, useState } from "react";
import { useApiCall } from "./useApi";

// Active staff users (as { value, label } options) for "assign to" pickers.
// Only admins can list users; for everyone else this resolves to [].
export default function useStaffOptions(roles = ["internal_sales", "admin", "super_admin"]) {
  const call = useApiCall();
  const [options, setOptions] = useState([]);
  const key = roles.join(",");

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    Promise.all(
      key.split(",").map((role) =>
        call(`/users?role=${role}&status=active&limit=100`)
          .then((res) => res.data?.items || res.data || [])
          .catch(() => [])
      )
    ).then((lists) => {
      if (cancelled) return;
      const seen = new Set();
      const merged = [];
      lists.flat().forEach((u) => {
        if (!u?.id || seen.has(u.id)) return;
        seen.add(u.id);
        merged.push({ value: u.id, label: `${u.full_name || u.fullName} (${(u.role_name || u.role || "").replace(/_/g, " ")})` });
      });
      setOptions(merged);
    });
    return () => {
      cancelled = true;
    };
  }, [call, key]);

  return options;
}
