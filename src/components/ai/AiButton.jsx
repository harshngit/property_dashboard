import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LuSparkles } from "react-icons/lu";
import { useApiCall } from "../../hooks/useApi";

// One button for every paid Serchi (AI) action: shows the credit price before
// it is pressed, is off when the balance cannot cover it (the rule-based
// result on the page still works), runs the action, and on "not enough
// credits" / "over your limit" points to the AI credits page.
//   <AiButton activity="review_screen" label="AI second opinion" run={() => call(...)} onDone={(data) => ...} />

let walletCache = { at: 0, promise: null };
export function invalidateAiWallet() {
  walletCache = { at: 0, promise: null };
}

function useWallet() {
  const call = useApiCall();
  const [w, setW] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!walletCache.promise || Date.now() - walletCache.at > 30000) {
      walletCache = { at: Date.now(), promise: call("/ai-credits/wallet").then((r) => r.data).catch(() => null) };
    }
    walletCache.promise.then((data) => alive && setW(data));
    return () => {
      alive = false;
    };
  }, [call]);
  return w;
}

export default function AiButton({ activity, label, run, onDone, className = "btn-outline btn-sm" }) {
  const w = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const price = w?.prices?.find((p) => p.key === activity)?.credits;
  const short = w && price != null && w.balance < price;
  const press = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await run();
      invalidateAiWallet();
      onDone?.(r?.data ?? r);
    } catch (err) {
      const credits = err.status === 402 || (err.details || []).some((d) => /insufficient_credits|cap_reached/.test(d.code || ""));
      setError({ message: err.message, credits });
    } finally {
      setBusy(false);
    }
  };
  if (w && price == null) return null; // this AI action is switched off
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" className={`${className} inline-flex items-center gap-1`} disabled={busy || short} onClick={press} title={short ? "Not enough AI credits" : undefined}>
        <LuSparkles className="h-3.5 w-3.5" />
        {busy ? "Working…" : label}
        {price != null && <span className="ml-1 rounded-full bg-amber-50 px-1.5 text-[10px] font-bold text-amber-700">{price} cr</span>}
      </button>
      {short && <Link to="/app/ai-credits" className="text-[11px] font-semibold text-red-600 underline">Buy AI credits</Link>}
      {error && (
        <span className="text-[11px] text-coral-700">
          {error.message} {error.credits && <Link to="/app/ai-credits" className="font-semibold underline">AI credits</Link>}
        </span>
      )}
    </span>
  );
}

// The disclaimer every AI output carries.
export function AiDisclaimer({ text }) {
  if (!text) return null;
  return <p className="mt-1 text-[11px] italic text-ink-500">{text}</p>;
}
