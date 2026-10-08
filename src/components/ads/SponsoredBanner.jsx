import { useApiCall, useApiQuery } from "../../hooks/useApi";

// Module 17: the CRM dashboard banner slot (brokers / builders only - the
// API returns nothing for other roles or when no campaign is booked).
export default function SponsoredBanner() {
  const call = useApiCall();
  const { data } = useApiQuery("/ads/serve?placement=crm_dashboard");
  const ad = data?.ads?.[0];
  if (!ad) return null;
  const open = () => {
    call(`/ads/click/${ad.campaignId}`, { method: "POST", body: { placement: "crm_dashboard", variant: ad.variant } }).catch(() => {});
    if (ad.ctaUrl) window.open(ad.ctaUrl, "_blank", "noopener");
  };
  return (
    <div className="card flex flex-wrap items-center gap-4 p-4">
      {ad.imageUrl && <img src={ad.imageUrl} alt="" className="h-16 w-28 rounded-lg object-cover" />}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Sponsored · {ad.advertiser}</p>
        <p className="font-semibold text-ink-900">{ad.headline}</p>
        {ad.body && <p className="text-sm text-ink-600">{ad.body}</p>}
        {ad.reraNumber && <p className="text-[11px] text-ink-400">RERA: {ad.reraNumber}</p>}
      </div>
      {ad.ctaUrl && <button className="btn-outline btn-sm shrink-0" onClick={open}>{ad.ctaLabel}</button>}
    </div>
  );
}
