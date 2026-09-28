import { useState } from "react";
import { Link } from "react-router-dom";
import { LuSparkles, LuRefreshCw, LuSend, LuMessageCircle } from "react-icons/lu";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, formatINR, titleCase } from "../../lib/format";

// Lead side panels: AI qualification (summary, Hot/Warm/Cold, extracted
// requirement), properties the matching engine recommends for this lead
// (shareable on WhatsApp through the platform number) and the WhatsApp
// conversation log.

const INTEL_ROLES = ["broker", "agency_admin", "internal_sales", "admin", "super_admin"];

function Card({ title, action, children }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-ink-500">{title}</h4>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function LeadInsightPanels({ lead, role }) {
  const toast = useToast();
  const call = useApiCall();
  const allowed = INTEL_ROLES.includes(role);
  const analysis = useApiQuery(allowed ? `/ai/lead/${lead.id}/analysis` : null);
  const matches = useApiQuery(allowed ? `/matching/recommendations/${lead.id}` : null);
  const chat = useApiQuery(`/whatsapp/conversations/${lead.id}`);
  const [busy, setBusy] = useState(null);

  if (!allowed) return null;

  const run = async (key, fn, message, reload) => {
    setBusy(key);
    try {
      await fn();
      toast.push(message, "success");
      await reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(null);
    }
  };

  const insight = analysis.data;
  const recommended = (matches.data || []).filter((m) => Number(m.relevance_score) > 0).slice(0, 5);
  const messages = chat.data || [];

  return (
    <>
      <Card
        title="AI qualification"
        action={
          <div className="flex gap-1">
            <button
              title="Generate summary"
              disabled={busy === "summary"}
              className="rounded-lg border border-line p-1.5 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
              onClick={() => run("summary", () => call("/ai/lead-summary", { method: "POST", body: { leadId: lead.id } }), "AI summary updated.", analysis.reload)}
            >
              <LuSparkles className="h-4 w-4" />
            </button>
            <button
              title="Re-score lead"
              disabled={busy === "score"}
              className="rounded-lg border border-line p-1.5 text-ink-600 hover:bg-surface-muted disabled:opacity-50"
              onClick={() => run("score", () => call("/ai/lead-score", { method: "POST", body: { leadId: lead.id } }), "Lead re-scored.", analysis.reload)}
            >
              <LuRefreshCw className="h-4 w-4" />
            </button>
          </div>
        }
      >
        {insight ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <StatusBadge value={titleCase(insight.score)} />
              {insight.confidence != null && <span className="text-xs text-ink-500">{Math.round(insight.confidence * 100)}% confidence</span>}
            </div>
            <p className="text-ink-700">{insight.summary}</p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {[
                ["Intent", insight.extracted_intent],
                ["Location", insight.extracted_location],
                ["Type", insight.extracted_property_type],
                ["Timeline", insight.extracted_timeline],
                [
                  "Budget",
                  insight.extracted_budget_min || insight.extracted_budget_max
                    ? `${formatINR(insight.extracted_budget_min) || "?"} - ${formatINR(insight.extracted_budget_max) || "?"}`
                    : null,
                ],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-ink-500">{k}</dt>
                    <dd className="font-medium text-ink-800">{titleCase(String(v))}</dd>
                  </div>
                ))}
            </dl>
            <p className="text-xs text-ink-400">Updated {formatDate(insight.created_at, true)}</p>
          </div>
        ) : (
          <p className="text-xs text-ink-500">No AI analysis yet - click ✦ to summarise and score this lead.</p>
        )}
      </Card>

      <Card title="Recommended properties" action={<span className="text-xs text-ink-400">matching engine</span>}>
        {matches.loading ? (
          <p className="text-xs text-ink-500">Finding matches…</p>
        ) : recommended.length === 0 ? (
          <p className="text-xs text-ink-500">No matches yet - add the customer's budget, location and type on the lead.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recommended.map((m) => (
              <li key={m.id || m.property_id} className="flex items-start justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <Link to={`/app/properties/${m.property_id}`} className="block truncate text-sm font-semibold text-ink-900 hover:text-red-600">
                    {m.property?.title || "Property"}
                  </Link>
                  <p className="text-xs text-ink-500">
                    {Math.round(Number(m.relevance_score))}% match · {m.property?.city || ""}
                    {m.property?.price_value ? ` · ${formatINR(m.property.price_value)}` : ""}
                  </p>
                </div>
                <button
                  title="Share on WhatsApp"
                  disabled={busy === m.property_id || !lead.customerMobile}
                  className="shrink-0 rounded-lg border border-line p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-40"
                  onClick={() =>
                    run(
                      m.property_id,
                      () => call("/whatsapp/share-property", { method: "POST", body: { leadId: lead.id, propertyId: m.property_id, phoneNumber: lead.customerMobile } }),
                      "Shared on WhatsApp.",
                      chat.reload
                    )
                  }
                >
                  <LuSend className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`WhatsApp (${messages.length})`} action={<LuMessageCircle className="h-4 w-4 text-green-600" />}>
        {messages.length === 0 ? (
          <p className="text-xs text-ink-500">No WhatsApp messages with this lead yet.</p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {messages.slice(-20).map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-xs ${
                  msg.direction === "outbound" ? "ml-auto bg-green-50 text-ink-800" : "bg-surface-muted text-ink-800"
                }`}
              >
                <p className="whitespace-pre-line">{msg.message_body || (msg.template_name ? `Template: ${msg.template_name}` : "—")}</p>
                <p className="mt-1 text-[10px] text-ink-400">
                  {formatDate(msg.created_at, true)} · {msg.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
