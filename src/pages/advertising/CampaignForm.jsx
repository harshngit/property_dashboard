import { useEffect, useMemo, useState } from "react";
import { TextField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall } from "../../hooks/useApi";

// Create or edit a campaign. Creating: pick a format and duration (priced
// from the rate card, GST shown), then the creative and the audience.
// Editing: creative and audience only - the booking itself is fixed.

export const inr = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const LISTING_PLACEMENTS = ["search_sponsored", "featured_listing", "institutional_featured"];
const AUDIENCE = [["buyer", "Buyers"], ["broker", "Brokers"], ["seller", "Sellers"], ["nri", "NRIs"], ["hni", "HNIs"]];
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const todayStr = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
const csv = (v) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean);

const blank = (c) => ({
  name: c?.name || "", formatKey: c?.formatKey || "", units: c?.units || "", startDate: c?.startDate?.slice(0, 10) || todayStr(),
  headline: c?.headline || "", body: c?.body || "", imageUrl: c?.imagePath || "", imagePreview: c?.imageUrl || "", ctaLabel: c?.ctaLabel || "", ctaUrl: c?.ctaUrl || "", reraNumber: c?.reraNumber || "",
  listing: c?.propertyId || "", bHeadline: c?.variantB?.headline || "", bBody: c?.variantB?.body || "",
  cities: (c?.targeting?.cities || []).join(", "), localities: (c?.targeting?.localities || []).join(", "), propertyTypes: (c?.targeting?.propertyTypes || []).join(", "),
  roles: c?.targeting?.roles || [], budgetMin: c?.targeting?.budgetMin ?? "", budgetMax: c?.targeting?.budgetMax ?? "", device: c?.targeting?.device || "all",
});

export default function CampaignForm({ campaign, rateCard, advertisers, onSaved, onCancel }) {
  const call = useApiCall();
  const toast = useToast();
  const editing = !!campaign;
  const [f, setF] = useState(() => blank(campaign));
  const [advertiserId, setAdvertiserId] = useState("");
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const formats = useMemo(() => (rateCard?.items || []).filter((r) => !r.city && r.isActive), [rateCard]);
  const format = formats.find((r) => r.formatKey === f.formatKey);
  const placements = campaign?.placements || format?.placements || [];
  const listingOnly = placements.length > 0 && placements.every((p) => LISTING_PLACEMENTS.includes(p));
  const needsListing = placements.some((p) => LISTING_PLACEMENTS.includes(p));
  const oneCity = csv(f.cities).length === 1 ? csv(f.cities)[0] : "";

  useEffect(() => {
    if (editing || !f.formatKey) return undefined;
    let live = true;
    call("/ads/quote", { method: "POST", body: { formatKey: f.formatKey, units: f.units ? Number(f.units) : undefined, startDate: f.startDate, city: oneCity || undefined } })
      .then((r) => live && setQuote(r.data))
      .catch((err) => live && setQuote({ error: err.message }));
    return () => { live = false; };
  }, [call, editing, f.formatKey, f.units, f.startDate, oneCity]);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await call("/ads/creative", { method: "POST", body, isFormData: true });
      setF((s) => ({ ...s, imageUrl: res.data.path, imagePreview: res.data.url }));
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const propertyId = f.listing.match(UUID)?.[0];
    if (needsListing && !propertyId && listingOnly) return toast.push("Paste the listing's link or ID.", "error");
    const body = {
      name: f.name, headline: f.headline || undefined, body: f.body || undefined, imageUrl: f.imageUrl || undefined, ctaLabel: f.ctaLabel || undefined, ctaUrl: f.ctaUrl || undefined,
      reraNumber: f.reraNumber || undefined, propertyId: propertyId || undefined, variantB: f.bHeadline || f.bBody ? { headline: f.bHeadline, body: f.bBody } : editing ? null : undefined,
      targeting: { cities: csv(f.cities), localities: csv(f.localities), propertyTypes: csv(f.propertyTypes), roles: f.roles, budgetMin: f.budgetMin, budgetMax: f.budgetMax, device: f.device },
    };
    setBusy(true);
    try {
      if (editing) await call(`/ads/campaigns/${campaign.id}`, { method: "PATCH", body });
      else await call("/ads/campaigns", { method: "POST", body: { ...body, formatKey: f.formatKey, units: f.units ? Number(f.units) : undefined, startDate: f.startDate, advertiserId: advertiserId || undefined } });
      toast.push(editing ? "Campaign updated." : "Campaign created - the invoice is ready to pay.", "success");
      onSaved();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const unit = format?.pricingUnit || campaign?.pricingUnit;
  return (
    <div className="space-y-5">
      {!editing && (
        <section className="space-y-3">
          <h4 className="text-sm font-bold text-ink-900">1. Format and dates</h4>
          {advertisers && (
            <label className="block"><span className="field-label">Advertiser</span>
              <select id="ad-advertiser" className="field-select" value={advertiserId} onChange={(e) => setAdvertiserId(e.target.value)}>
                <option value="">Choose the advertiser</option>
                {advertisers.filter((a) => a.status === "active").map((a) => <option key={a.id} value={a.id}>{a.businessName} ({a.avCode})</option>)}
              </select>
            </label>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {formats.map((r) => (
              <button type="button" key={r.formatKey} onClick={() => setF((s) => ({ ...s, formatKey: r.formatKey, units: r.minUnits }))} className={`rounded-xl border p-3 text-left transition ${f.formatKey === r.formatKey ? "border-red-400 bg-red-50" : "border-line bg-white hover:border-red-200"}`}>
                <p className="text-sm font-bold text-ink-900">{r.label}</p>
                <p className="mt-0.5 text-xs text-ink-500">{r.description}</p>
                <p className="mt-1 text-xs font-semibold text-ink-800">{r.rate > 0 ? `${inr(r.rate)} per ${r.pricingUnit}` : "Rate on request"}{r.minUnits > 1 ? ` · min ${r.minUnits} ${r.pricingUnit}s` : ""}</p>
              </button>
            ))}
          </div>
          {format && (
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField label={`Number of ${unit}s`} type="number" min={format.minUnits} value={f.units} onChange={set("units")} />
              <TextField label="Start date" type="date" min={todayStr()} value={f.startDate} onChange={set("startDate")} />
              <div className="rounded-xl bg-surface-muted p-3 text-xs">
                {quote?.error ? <p className="text-red-600">{quote.error}</p> : quote ? (
                  <>
                    <p className="text-ink-500">{quote.startDate} to {quote.endDate}{quote.rateCity ? ` · ${quote.rateCity} rate` : ""}</p>
                    <p className="mt-1 text-ink-700">{inr(quote.amount)} + GST {quote.gstPercent}% {inr(quote.gstAmount)}</p>
                    <p className="font-display text-lg font-extrabold text-ink-950">{inr(quote.total)}</p>
                  </>
                ) : <p className="text-ink-500">Calculating…</p>}
              </div>
            </div>
          )}
        </section>
      )}

      {(editing || format) && (
        <>
          <section className="space-y-3">
            <h4 className="text-sm font-bold text-ink-900">{editing ? "Creative" : "2. Creative"}</h4>
            <TextField label="Campaign name (for your reference)" value={f.name} onChange={set("name")} />
            {needsListing && <TextField label={`Listing to promote${listingOnly ? "" : " (for the sponsored-listing placement)"}`} placeholder="Paste the listing link or ID" value={f.listing} onChange={set("listing")} />}
            {!listingOnly && (
              <>
                <TextField label="Headline" maxLength={120} value={f.headline} onChange={set("headline")} />
                <TextareaField label="Message" rows={2} maxLength={400} value={f.body} onChange={set("body")} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label="Click-through link (https://)" placeholder="https://" value={f.ctaUrl} onChange={set("ctaUrl")} />
                  <TextField label="Button text" placeholder="Learn more" maxLength={40} value={f.ctaLabel} onChange={set("ctaLabel")} />
                </div>
                <div className="flex items-center gap-3">
                  {f.imagePreview && <img src={f.imagePreview} alt="" className="h-16 w-28 rounded-lg border border-line object-cover" />}
                  <label className="btn-outline btn-sm cursor-pointer">{uploading ? "Uploading…" : f.imageUrl ? "Replace image" : "Upload image"}<input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} /></label>
                  <p className="text-xs text-ink-500">JPG / PNG / WebP, up to 5 MB. Wide images suit banners.</p>
                </div>
                <details className="rounded-xl border border-line p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-ink-700">A/B test - add a second version</summary>
                  <div className="mt-3 space-y-3">
                    <TextField label="Headline (version B)" maxLength={120} value={f.bHeadline} onChange={set("bHeadline")} />
                    <TextareaField label="Message (version B)" rows={2} maxLength={400} value={f.bBody} onChange={set("bBody")} />
                    <p className="text-xs text-ink-500">Half the viewers see each version; results are compared on the campaign.</p>
                  </div>
                </details>
              </>
            )}
            <TextField label="RERA number (required for builder / developer ads)" value={f.reraNumber} onChange={set("reraNumber")} />
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-bold text-ink-900">{editing ? "Audience" : "3. Audience"}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Cities (comma separated; blank = all)" placeholder="Delhi, Gurugram" value={f.cities} onChange={set("cities")} />
              <TextField label="Localities" placeholder="Dwarka, Sector 57" value={f.localities} onChange={set("localities")} />
              <TextField label="Property types" placeholder="apartment, villa, plot" value={f.propertyTypes} onChange={set("propertyTypes")} />
              <label className="block"><span className="field-label">Device</span>
                <select id="ad-device" className="field-select" value={f.device} onChange={set("device")}><option value="all">All devices</option><option value="mobile">Mobile only</option><option value="desktop">Desktop only</option></select>
              </label>
              <TextField label="Buyer budget from (₹)" type="number" value={f.budgetMin} onChange={set("budgetMin")} />
              <TextField label="Buyer budget up to (₹)" type="number" value={f.budgetMax} onChange={set("budgetMax")} />
            </div>
            <div>
              <span className="field-label">Who should see it (none ticked = everyone)</span>
              <div className="flex flex-wrap gap-2">
                {AUDIENCE.map(([k, l]) => (
                  <label key={k} className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold ${f.roles.includes(k) ? "border-red-400 bg-red-50 text-red-700" : "border-line text-ink-600"}`}>
                    <input type="checkbox" className="hidden" checked={f.roles.includes(k)} onChange={() => setF((s) => ({ ...s, roles: s.roles.includes(k) ? s.roles.filter((x) => x !== k) : [...s.roles, k] }))} />{l}
                  </label>
                ))}
              </div>
            </div>
          </section>
          {editing && ["approved", "paused", "rejected"].includes(campaign.status) && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Saving sends the campaign back to A R Buildwel for review before it runs again.</p>}
        </>
      )}

      <div className="flex justify-end gap-2">
        <button className="btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={busy || uploading || (!editing && (!format || !!quote?.error || (advertisers && !advertiserId))) || f.name.trim().length < 3} onClick={save}>{editing ? "Save changes" : "Create campaign"}</button>
      </div>
    </div>
  );
}
