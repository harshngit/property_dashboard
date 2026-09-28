import { useState } from "react";
import { Link } from "react-router-dom";
import { LuFileText, LuGlobe, LuRefreshCw, LuMessageCircle } from "react-icons/lu";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";

// Customer 360 additions: what the customer does on the website dashboard
// (roles, requirements, own listings, rentals, referral code), documents
// they uploaded there, matched properties and the WhatsApp history.

function Card({ title, icon: Icon, action, children }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-500">
          {Icon && <Icon className="h-3.5 w-3.5" />} {title}
        </h4>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function CustomerPortalPanels({ customerId }) {
  const toast = useToast();
  const call = useApiCall();
  const portal = useApiQuery(`/customers/${customerId}/portal`);
  const docs = useApiQuery(`/documents/customer/${customerId}`);
  const matches = useApiQuery(`/matching/properties/${customerId}`);
  const chat = useApiQuery(`/customers/${customerId}/conversations`);
  const [rerunning, setRerunning] = useState(false);

  const p = portal.data;
  const docList = Array.isArray(docs.data) ? docs.data : docs.data?.items || [];
  const matchList = (matches.data || []).filter((m) => Number(m.relevance_score) > 0).slice(0, 5);
  const messages = chat.data || [];

  const rerun = async () => {
    setRerunning(true);
    try {
      await call("/matching/rerun", { method: "POST", body: { customerId } });
      await matches.reload();
      toast.push("Matches refreshed.", "success");
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setRerunning(false);
    }
  };

  return (
    <>
      <Card title="Website account" icon={LuGlobe}>
        {!p ? (
          <p className="text-xs text-ink-500">{portal.error || "Loading…"}</p>
        ) : !p.hasAccount ? (
          <p className="text-xs text-ink-500">No website account yet - this customer came in through an enquiry.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-1.5">
              {(p.portalRoles.length ? p.portalRoles : ["not onboarded"]).map((r) => (
                <span key={r} className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold capitalize text-ink-700">{r}</span>
              ))}
            </div>
            <p className="text-xs text-ink-500">
              {p.referralCode ? <>Code <span className="font-mono font-semibold text-ink-800">{p.referralCode}</span> · {p.referredUsers} referred · </> : null}
              {p.favourites} saved · {p.saved_searches} saved searches
              {p.lastLoginAt ? ` · last login ${formatDate(p.lastLoginAt)}` : ""}
            </p>
            {p.requirements.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-ink-700">Requirements</p>
                {p.requirements.map((r) => (
                  <div key={r.id} className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">
                      {r.purpose === "rent" ? "Rent" : "Buy"} · {r.property_type ? titleCase(r.property_type) : "Any"} · {r.city}
                      {r.budget_max ? ` · up to ${formatINR(r.budget_max)}` : ""}
                    </span>
                    <span className="flex gap-1"><StatusBadge value={titleCase(r.temperature)} /><StatusBadge value={titleCase(r.status)} /></span>
                  </div>
                ))}
              </div>
            )}
            {p.listings.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-ink-700">Own listings</p>
                {p.listings.map((l) => (
                  <Link key={l.id} to={`/app/properties/${l.id}`} className="mb-1 flex items-center justify-between gap-2 text-xs hover:text-red-600">
                    <span className="truncate">{l.title} · {l.enquiry_count} enquiries{l.mandate_type === "exclusive" ? " · exclusive" : ""}</span>
                    <StatusBadge value={titleCase(l.status)} />
                  </Link>
                ))}
              </div>
            )}
            {p.leases.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-ink-700">Rentals</p>
                {p.leases.map((l) => (
                  <div key={l.id} className="mb-1 text-xs text-ink-700">
                    <span className="font-medium">{l.side === "owner" ? "Owner" : "Tenant"}</span> · {l.property_label} · {formatINR(l.monthly_rent)}/mo ·{" "}
                    {l.side === "owner" ? `tenant ${l.tenant_name}` : `owner ${l.owner_name}`}
                    {l.rent_due ? ` · ${l.rent_due} month(s) unpaid` : ""}
                    {l.open_maintenance ? ` · ${l.open_maintenance} open repair(s)` : ""}
                    {!l.tenant_confirmed_at ? " · unconfirmed" : ""}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card
        title="Matched properties"
        action={
          <button title="Re-run matching" disabled={rerunning} onClick={rerun} className="rounded-lg border border-line p-1.5 text-ink-600 hover:bg-surface-muted disabled:opacity-50">
            <LuRefreshCw className="h-3.5 w-3.5" />
          </button>
        }
      >
        {matchList.length === 0 ? (
          <p className="text-xs text-ink-500">No matches - set the customer's budget, location and type.</p>
        ) : (
          <ul className="divide-y divide-line">
            {matchList.map((m) => (
              <li key={m.id} className="py-2">
                <Link to={`/app/properties/${m.property_id}`} className="block truncate text-sm font-semibold text-ink-900 hover:text-red-600">{m.property?.title}</Link>
                <p className="text-xs text-ink-500">{Math.round(Number(m.relevance_score))}% · {m.property?.city}{m.property?.price_value ? ` · ${formatINR(m.property.price_value)}` : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`Uploaded documents (${docList.length})`} icon={LuFileText}>
        {docList.length === 0 ? (
          <p className="text-xs text-ink-500">Nothing uploaded from the website or deals yet.</p>
        ) : (
          <div className="space-y-2">
            {docList.map((d) => (
              <a key={d.id} href={d.document_url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-sunk">
                <span className="truncate">{d.file_name || titleCase(d.document_type)}</span>
                <StatusBadge value={titleCase(d.status)} />
              </a>
            ))}
            <Link to="/app/documents" className="block text-xs font-semibold text-red-600">Review in Documents →</Link>
          </div>
        )}
      </Card>

      <Card title={`WhatsApp (${messages.length})`} icon={LuMessageCircle}>
        {messages.length === 0 ? (
          <p className="text-xs text-ink-500">No WhatsApp messages yet.</p>
        ) : (
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {messages.slice(-15).map((m) => (
              <div key={m.id} className={`max-w-[90%] rounded-xl px-3 py-2 text-xs ${m.direction === "outbound" ? "ml-auto bg-green-50" : "bg-surface-muted"}`}>
                <p className="whitespace-pre-line">{m.message_body || (m.template_name ? `Template: ${m.template_name}` : "—")}</p>
                <p className="mt-1 text-[10px] text-ink-400">{formatDate(m.created_at, true)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
