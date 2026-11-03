import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LuCoins } from "react-icons/lu";
import { useApiCall } from "../../hooks/useApi";

// AI credit balance in the top bar, for every role with an AI credits page.
// Amber when it is at or below the user's low-balance alert. Refreshes every
// minute and whenever an AI action, purchase or top-up changes it.
export default function CreditBalanceChip() {
  const call = useApiCall();
  const [b, setB] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => call("/ai-credits/balance").then((r) => alive && setB(r.data)).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    window.addEventListener("ai-credits-changed", load);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("ai-credits-changed", load);
    };
  }, [call]);
  if (!b) return null;
  return (
    <Link
      to="/app/ai-credits"
      title={b.low ? "AI credits running low - buy more" : "AI credits"}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${b.low ? "border-amber-200 bg-amber-50 text-amber-700" : "border-line bg-white text-ink-800 hover:bg-surface-sunk"}`}
    >
      <LuCoins className="h-4 w-4" />
      <span>{Number(b.balance).toLocaleString("en-IN")}</span>
      <span className="hidden font-semibold text-ink-500 sm:inline">credits</span>
    </Link>
  );
}
