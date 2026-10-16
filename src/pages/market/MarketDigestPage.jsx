import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";

// Daily market update (sec. 20.4): the areas a broker follows, today's digest
// (new properties, buyer requirements, urgent deals, market alerts) and, for
// admins, what went out and a "send now".

const ADMIN = ["admin", "super_admin"];
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
const areaLabel = (a) => (a.locality ? `${a.locality}, ${a.city}` : `All of ${a.city}`);

function Part({ title, empty, children, count }) {
  return (
    <div className="card p-5">
      <p className="mb-2 text-sm font-bold text-ink-900">{title}{count ? ` (${count})` : ""}</p>
      {count ? <div className="divide-y divide-line">{children}</div> : <p className="text-sm text-ink-500">{empty}</p>}
    </div>
  );
}

// The four parts of a digest, the same for today's preview and a sent one.
export function DigestBody({ d }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Part title="New properties" count={d.newProperties.length} empty="No new listings in your areas.">
        {d.newProperties.map((p) => (
          <Link key={p.id} to={`/app/properties/${p.id}`} className="block py-2 text-sm hover:text-red-600" data-no-translate>
            <span className="font-semibold text-ink-900">{p.title}</span>
            <span className="block text-xs text-ink-500">{[p.where, p.price, p.bedrooms ? `${p.bedrooms} BHK` : null].filter(Boolean).join(" · ")}</span>
          </Link>
        ))}
      </Part>
      <Part title="New buyer requirements" count={d.newRequirements.length} empty="No new buyer requirements in your areas.">
        {d.newRequirements.map((r) => (
          <div key={r.id} className="py-2 text-sm">
            <span className="font-semibold text-ink-900">{[r.bedrooms ? `${r.bedrooms} BHK` : null, titleCase(r.propertyType || "property"), "to", r.purpose].filter(Boolean).join(" ")}</span>
            {r.hot && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">Hot</span>}
            {r.immediate && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">Immediate</span>}
            <span className="block text-xs text-ink-500" data-no-translate>{[r.where, r.budgetMax ? `up to ${formatINR(r.budgetMax)}` : null].filter(Boolean).join(" · ")}</span>
          </div>
        ))}
      </Part>
      <Part title="Urgent deals" count={d.urgentDeals.length} empty="No auctions or urgent deals in your areas.">
        {d.urgentDeals.map((x) => (
          <Link key={x.id} to={`/app/properties/${x.id}`} className="block py-2 text-sm hover:text-red-600" data-no-translate>
            <span className="font-semibold text-ink-900">{x.title}</span>
            <span className="block text-xs text-ink-500">{[x.where, x.price, x.auctionDate ? `auction ${formatDate(x.auctionDate)}` : null, x.discountPercent ? `${x.discountPercent}% below market` : null].filter(Boolean).join(" · ")}</span>
          </Link>
        ))}
      </Part>
      <Part title="Market alerts" count={d.marketAlerts.length} empty="No notable price movement in your areas.">
        {d.marketAlerts.map((m) => (
          <div key={m.where} className="flex items-center justify-between py-2 text-sm">
            <span data-no-translate><span className="font-semibold text-ink-900">{m.where}</span><span className="block text-xs text-ink-500">₹{m.ratePerSqft.toLocaleString("en-IN")} per sq ft</span></span>
            <b className={m.changePercent > 0 ? "text-emerald-600" : "text-red-600"}>{m.changePercent > 0 ? "+" : ""}{m.changePercent}%</b>
          </div>
        ))}
      </Part>
      {d.sponsored && <p className="text-xs text-ink-500 lg:col-span-2" data-no-translate>{d.sponsored}</p>}
    </div>
  );
}

function Areas({ me, onSaved }) {
  const call = useApiCall();
  const toast = useToast();
  const cities = useApiQuery("/market-digest/areas");
  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");
  const options = useApiQuery(city ? `/market-digest/areas?city=${encodeURIComponent(city)}` : null);
  const [busy, setBusy] = useState(false);
  const chosen = me.areasFrom === "chosen" ? me.areas : [];
  const save = async (body, msg) => {
    setBusy(true);
    try {
      await call("/market-digest/me", { method: "PUT", body });
      toast.push(msg, "success");
      onSaved();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const add = () => save({ areas: [...chosen, locality ? { city, locality } : { city }] }, "Area added.").then(() => setLocality(""));
  return (
    <div className="card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink-900">Areas I follow</p>
          <p className="text-xs text-ink-500">
            {me.areasFrom === "chosen" ? "Your digest covers these areas." : me.areasFrom === "listings" ? "You have not chosen areas yet, so the digest covers where your own listings are." : "Choose the cities or localities you work in to start receiving the digest."}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-800">
          Send me the daily digest
          <input id="md-enabled" type="checkbox" className="h-4 w-4 accent-red-600" checked={me.enabled} disabled={busy} onChange={(e) => save({ enabled: e.target.checked }, e.target.checked ? "Digest switched on." : "Digest switched off.")} />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {me.areas.map((a, i) => (
          <span key={`${a.city}-${a.locality || ""}`} className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-800" data-no-translate>
            {areaLabel(a)}
            {me.areasFrom === "chosen" && <button className="text-red-600" title="Remove" disabled={busy} onClick={() => save({ areas: chosen.filter((_, j) => j !== i) }, "Area removed.")}>×</button>}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="field-label">City
          <input id="md-city" list="md-cities" className="field-input mt-1 w-56" value={city} onChange={(e) => { setCity(e.target.value); setLocality(""); }} placeholder="Type or choose" />
          <datalist id="md-cities">{(cities.data?.cities || []).map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label className="field-label">Locality (empty = whole city)
          <input id="md-locality" list="md-localities" className="field-input mt-1 w-56" value={locality} onChange={(e) => setLocality(e.target.value)} disabled={!city} />
          <datalist id="md-localities">{(options.data?.localities || []).map((l) => <option key={l} value={l} />)}</datalist>
        </label>
        <button className="btn-primary btn-sm" disabled={busy || city.trim().length < 2 || chosen.length >= 25} onClick={add}>Add area</button>
      </div>
    </div>
  );
}

function AdminPanel() {
  const call = useApiCall();
  const toast = useToast();
  const ov = useApiQuery("/market-digest/manage/overview");
  const [busy, setBusy] = useState(false);
  if (!ov.data) return <Spinner />;
  const d = ov.data;
  const run = async (step, label) => {
    if (!window.confirm(`${label} now, outside the usual time?`)) return;
    setBusy(true);
    try {
      const r = await call("/market-digest/manage/run", { method: "POST", body: { step, force: true } });
      toast.push(`Compiled ${r.data.aggregate?.compiled ?? r.data.compiled ?? 0}, sent ${r.data.dispatch?.sent ?? r.data.sent ?? 0}.`, "success");
      ov.reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const win = (w) => (w.configured ? `${w.start} - ${w.end}` : "not set");
  return (
    <div className="card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink-900">All brokers</p>
        <div className="flex gap-2">
          <button className="btn-outline btn-sm" disabled={busy} onClick={() => run("aggregate", "Compile today's digest")}>Compile now</button>
          <button className="btn-primary btn-sm" disabled={busy} onClick={() => run("both", "Compile and send today's digest")}>Compile and send now</button>
        </div>
      </div>
      <p className="text-sm text-ink-700">{d.eligible} people receive it ({d.settings.roles.map((r) => titleCase(r.replace(/_/g, " "))).join(", ")}) · {d.choseAreas} have chosen their areas · {d.switchedOff} switched it off</p>
      <p className="text-sm text-ink-700">Compiled {win(d.compileWindow)} · sent {win(d.sendWindow)} (India time). Change the times in Notification Intelligence → Posting windows.{!d.settings.enabled && <b className="text-red-600"> The digest is switched off in configuration.</b>}</p>
      {d.days.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className="py-1.5">Day</th><th>Compiled</th><th>Sent</th><th>Items</th></tr></thead>
          <tbody className="divide-y divide-line">{d.days.map((x) => <tr key={x.date}><td className="py-1.5">{formatDate(x.date)}</td><td>{x.compiled}</td><td>{x.sent}</td><td>{x.items}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}

export default function MarketDigestPage() {
  const { role } = useAuth();
  const me = useApiQuery("/market-digest/me");
  const preview = useApiQuery("/market-digest/preview");
  if (!me.data) return <Spinner />;
  const d = me.data;
  const reload = () => { me.reload(); preview.reload(); };
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Market"
        title="Daily market update"
        subtitle={d.sendWindow ? `Every morning between ${d.sendWindow.start} and ${d.sendWindow.end}: what is new in the areas you follow, on WhatsApp and here.` : "What is new in the areas you follow."}
      />
      {ADMIN.includes(role) && <AdminPanel />}
      <Areas me={d} onSaved={reload} />
      {!d.receives && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Your role is not sent the morning message, but you can see what it would say below.</p>}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Right now, since yesterday</p>
        {!preview.data ? <Spinner /> : !d.areas.length ? <div className="card"><EmptyState title="No areas yet" subtitle="Add a city or locality above to see what is new there." /></div>
          : preview.data.itemCount === 0 ? <div className="card"><EmptyState title="Nothing new since yesterday" subtitle="No message is sent on a day with nothing new in your areas." /></div>
            : <DigestBody d={preview.data} />}
      </div>
      {d.latest && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Last digest · {formatDate(d.latest.date)}{d.latest.sentAt ? " · sent" : " · waiting for the send window"}</p>
          <p className="mb-3 rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink-800" data-no-translate>{d.latest.title}</p>
          <DigestBody d={d.latest} />
        </div>
      )}
    </div>
  );
}
