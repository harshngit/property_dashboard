import { useState } from "react";
import { LuPlay, LuFlaskConical, LuSettings2, LuShieldCheck, LuRotateCcw, LuHistory } from "react-icons/lu";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import { InlineSpinner } from "../../components/common/PageLoader";
import { useToast } from "../../components/common/ToastProvider";
import { useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";

// Section 23 crawler health dashboard (admin): every crawler source from the
// contract, its legal approval, configuration, status, runs and dead-letter
// state. Parsed records land in the Intake queue.

const EXAMPLE_CONFIG = {
  html_list: {
    itemSelector: "table.auctions tbody tr",
    fields: {
      auction_reference_id: "td:nth-child(1)",
      title: "td:nth-child(2)",
      city: "td:nth-child(3)",
      reserve_price: "td:nth-child(4)",
      auction_date: "td:nth-child(5)",
      auction_portal_url: { selector: "a", attr: "href" },
    },
    nextPageSelector: "a.next",
    constants: { source_bank: "Bank name", source_type: "sarfaesi" },
  },
  json_api: { itemsPath: "data.items", fields: { title: "propertyName", reserve_price: "reservePrice", auction_date: "auctionDate", city: "city" }, pageParam: "page", constants: {} },
  rss: { constants: { source_bank: "Bank name" } },
  pdf_links: { linkSelector: "a[href$='.pdf']", maxPdfs: 10, constants: { source_bank: "Bank name" } },
};

// Reference-data modules (crawler_rera / crawler_nhb_rbi / crawler_portal_market):
// the mapping's field names are that table's columns.
const OUTPUT_LABEL = { opportunity: "Auction / deal listings", rera_projects: "RERA project registry", price_indices: "Price indices (NHB / RBI)", market_stats: "Market statistics" };
const REFERENCE_CONFIG = {
  rera_projects: {
    itemSelector: "table tbody tr",
    fields: { rera_number: "td:nth-child(1)", project_name: "td:nth-child(2)", promoter_name: "td:nth-child(3)", district: "td:nth-child(4)", project_status: "td:nth-child(5)", approved_units: "td:nth-child(6)", complaints_count: "td:nth-child(7)", proposed_completion_date: "td:nth-child(8)" },
    nextPageSelector: "a.next",
    constants: { state: "State name" },
  },
  price_indices: {
    itemSelector: "table tbody tr",
    fields: { city: "td:nth-child(1)", index_value: "td:nth-child(2)", yoy_change_percent: "td:nth-child(3)", qoq_change_percent: "td:nth-child(4)" },
    constants: { index_source: "nhb_residex", index_kind: "composite", period: "Q1 2025-26" },
  },
  market_stats: {
    itemSelector: "table tbody tr",
    fields: { locality: "td:nth-child(1)", avg_price_per_sqft: "td:nth-child(2)", price_change_percent: "td:nth-child(3)", supply_count: "td:nth-child(4)", rental_yield_percent: "td:nth-child(5)" },
    constants: { city: "City name", property_type: "apartment", transaction_type: "sell" },
  },
};
const REFERENCE_PDF_CONFIG = { linkSelector: "a[href$='.pdf']", maxPdfs: 5, rowPattern: "", constants: {} };
const REFERENCE_HELP = {
  rera_projects: "Fields: rera_number (required), project_name, promoter_name, district, city, project_status, approved_units, complaints_count, registration_date, proposed_completion_date. Put the state in constants. Public registry pages only.",
  price_indices: "Fields: city, index_value (required), yoy_change_percent, qoq_change_percent, period (e.g. \"Q1 2025-26\"), index_kind. For PDF reports (text or scanned - read by OCR) each line \"City index YoY QoQ\" is picked up; set rowPattern (a regular expression with named groups) for other layouts.",
  market_stats: "Aggregated market pages ONLY - never individual listings. Fields: city, locality, property_type, transaction_type, avg_price_per_sqft, min_price_per_sqft, max_price_per_sqft, price_change_percent, demand_index, supply_count, rental_yield_percent. Rows that look like a listing or carry contact details are rejected. Used for benchmarks only; the portal is never named publicly.",
};
const exampleFor = (source, adapter) => {
  if (source.output && source.output !== "opportunity") return adapter === "pdf_links" ? REFERENCE_PDF_CONFIG : REFERENCE_CONFIG[source.output];
  return EXAMPLE_CONFIG[adapter];
};

const STATUS_LABEL = { idle: "Idle", running: "Running", healthy: "Healthy", failing: "Failing", dead_letter: "Dead letter" };

function ConfigModal({ source, onClose, onSaved }) {
  const call = useApiCall();
  const toast = useToast();
  const [f, setF] = useState({
    listUrl: source.list_url || "",
    adapter: source.adapter,
    scheduleHours: source.schedule_hours,
    maxPages: source.max_pages,
    defaultListingCategory: source.default_listing_category,
    requiresLegalReview: source.requires_legal_review,
    useAiParser: source.use_ai_parser,
    // A seeded source only carries its constants - start from the example mapping, keeping them.
    config: JSON.stringify((source.config || {}).itemSelector || (source.config || {}).fields || (source.config || {}).linkSelector ? source.config : { ...exampleFor(source, source.adapter), ...(Object.keys(source.config?.constants || {}).length ? { constants: { ...(exampleFor(source, source.adapter).constants || {}), ...source.config.constants } } : {}) }, null, 2),
  });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const reference = source.output && source.output !== "opportunity";
  const save = async () => {
    let config;
    try {
      config = JSON.parse(f.config || "{}");
    } catch {
      return toast.push("Field mapping must be valid JSON.", "error");
    }
    try {
      await call(`/crawlers/sources/${source.id}`, {
        method: "PUT",
        body: { ...f, config, listUrl: f.listUrl || null, scheduleHours: Number(f.scheduleHours), maxPages: Number(f.maxPages) },
      });
      toast.push("Source saved - run a test to check the mapping.", "success");
      onSaved();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  return (
    <Modal open onClose={onClose} title={`Configure ${source.name}`} description={`${source.module} · ${source.base_url || ""}`} maxWidth="max-w-2xl">
      <div className="space-y-3 text-sm">
        <label className="block"><span className="field-label">Listing / API / feed URL</span><input className="field-input" value={f.listUrl} onChange={set("listUrl")} placeholder="https://…" /></label>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block"><span className="field-label">Adapter</span>
            <select className="field-select" value={f.adapter} onChange={(e) => setF((x) => ({ ...x, adapter: e.target.value, config: JSON.stringify(exampleFor(source, e.target.value), null, 2) }))}>
              <option value="html_list">HTML table / list</option><option value="json_api">JSON API</option><option value="rss">RSS / Atom</option><option value="pdf_links">PDF notices</option>
            </select>
          </label>
          <label className="block"><span className="field-label">Every (hours)</span><input type="number" min="1" max="720" className="field-input" value={f.scheduleHours} onChange={set("scheduleHours")} /></label>
          <label className="block"><span className="field-label">Max pages</span><input type="number" min="1" max="50" className="field-input" value={f.maxPages} onChange={set("maxPages")} /></label>
          {reference ? (
            <div className="block"><span className="field-label">Stores into</span><p className="pt-2 text-sm font-semibold text-ink-900">{OUTPUT_LABEL[source.output]}</p></div>
          ) : (
            <label className="block"><span className="field-label">Lists as</span>
              <select className="field-select" value={f.defaultListingCategory} onChange={set("defaultListingCategory")}><option value="auction">Bank auction</option><option value="special_situation">Special situation</option></select>
            </label>
          )}
        </div>
        {!reference && (
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.requiresLegalReview} onChange={set("requiresLegalReview")} /> Lawyer-panel review before publishing</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.useAiParser} onChange={set("useAiParser")} /> AI parser for fields the mapping misses</label>
          </div>
        )}
        <label className="block">
          <span className="field-label">Field mapping (JSON)</span>
          <textarea className="field-input h-64 py-2 font-mono text-xs" value={f.config} onChange={set("config")} />
          <span className="text-[11px] text-ink-400">{reference ? REFERENCE_HELP[source.output] : null}{reference ? "" : "CSS selectors (html_list) or JSON paths (json_api) for: title, city, locality, pincode, reserve_price, emd_amount, auction_date, emd_deadline, inspection_date, auction_reference_id, auction_portal_url, possession, area. \"constants\" are added to every record. Contact details are never stored. Scanned PDF notices are read by OCR."}</span>
        </label>
        <div className="flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </Modal>
  );
}

export default function CrawlersTab() {
  const call = useApiCall();
  const toast = useToast();
  const health = useApiQuery("/crawlers/health");
  const sources = useApiQuery("/crawlers/sources");
  const [configuring, setConfiguring] = useState(null);
  const [approving, setApproving] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [runsFor, setRunsFor] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [busy, setBusy] = useState(null);
  const runs = useApiQuery(runsFor ? `/crawlers/runs?sourceId=${runsFor.id}&limit=30` : null);
  const market = useApiQuery("/market/overview");
  const [marketTab, setMarketTab] = useState("stats");

  const reload = () => {
    health.reload();
    sources.reload();
  };

  const act = async (source, path, opts, message, onResult) => {
    setBusy(source.id);
    try {
      const res = await call(path, opts);
      if (message) toast.push(typeof message === "function" ? message(res.data) : message, "success");
      onResult?.(res.data);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
      reload();
    } finally {
      setBusy(null);
    }
  };

  const h = health.data || {};
  const rows = sources.data || [];

  return (
    <div className="space-y-5">
      {!h.schedulerEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Scheduled crawling is off. Turn on <b>crawler.enabled</b> in Admin Panel → Settings once sources are legally approved and configured (the API server also needs CRAWLER_SCHEDULER_ENABLED=true). Manual and test runs work either way.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {[
          ["Sources", h.total], ["Legally approved", h.approved], ["Enabled", h.enabled], ["Healthy", h.healthy],
          ["Failing", h.failing], ["Dead letter", h.dead_letter], ["Awaiting legal review", h.awaiting_legal_review],
        ].map(([l, v]) => (
          <div key={l} className="card p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{l}</p><p className="mt-1 text-xl font-bold text-ink-950">{v ?? "—"}</p></div>
        ))}
      </div>
      <p className="text-xs text-ink-500">Last 24 hours: {h.runs_24h ?? 0} runs · {h.items_24h ?? 0} records found · {h.failed_24h ?? 0} failed runs.</p>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Source</th><th className="px-4 py-3">Legal</th><th className="px-4 py-3">Enabled</th><th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last run</th><th className="px-4 py-3">Next run</th><th className="px-4 py-3">Records</th><th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((s) => (
              <tr key={s.id} className={s.status === "dead_letter" ? "bg-red-50/40" : ""}>
                <td className="px-4 py-2.5">
                  <p className="font-semibold text-ink-900">{s.name}</p>
                  <p className="text-xs text-ink-500">{titleCase(s.category)}{s.output && s.output !== "opportunity" ? ` → ${OUTPUT_LABEL[s.output]}` : ""} · {s.adapter} · every {s.schedule_hours}h{s.requires_legal_review ? " · legal review" : ""}{s.use_ai_parser ? " · AI" : ""}</p>
                </td>
                <td className="px-4 py-2.5">
                  <button className="text-left" onClick={() => { setApprovalNotes(s.legal_notes || ""); setApproving(s); }}>
                    <StatusBadge value={s.legal_approved ? "Approved" : "Pending"} />
                    {s.legal_approved_at && <p className="text-[10px] text-ink-400">{formatDate(s.legal_approved_at)}</p>}
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={s.is_enabled}
                    disabled={!s.legal_approved || busy === s.id}
                    title={s.legal_approved ? "" : "Needs legal approval first"}
                    onChange={(e) => act(s, `/crawlers/sources/${s.id}`, { method: "PUT", body: { isEnabled: e.target.checked } }, e.target.checked ? "Enabled." : "Disabled.")}
                  />
                  {s.feature_flag_enabled === false && <p className="text-[10px] text-red-600">flag off</p>}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge value={STATUS_LABEL[s.status] || s.status} />
                  {s.consecutive_failures > 0 && <p className="text-[10px] text-red-600">{s.consecutive_failures} failure(s)</p>}
                  {s.last_error && <p className="max-w-[200px] truncate text-[10px] text-ink-500" title={s.last_error}>{s.last_error}</p>}
                </td>
                <td className="px-4 py-2.5 text-xs text-ink-600">
                  {s.last_run ? <>{formatDate(s.last_run.started_at, true)}<br />{titleCase(s.last_run.status)} · {s.last_run.items_found ?? 0} found</> : "Never"}
                </td>
                <td className="px-4 py-2.5 text-xs text-ink-600">{s.is_enabled && s.next_run_at ? formatDate(s.next_run_at, true) : "—"}</td>
                <td className="px-4 py-2.5 text-xs">{s.items_total} total · {s.items_published} live</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  {busy === s.id ? (
                    <InlineSpinner />
                  ) : (
                    <span className="inline-flex gap-2 text-ink-500">
                      <button title="Configure" className="hover:text-ink-900" onClick={() => setConfiguring(s)}><LuSettings2 className="h-4 w-4" /></button>
                      <button title="Test run (parse only)" className="hover:text-indigo-600" onClick={() => act(s, `/crawlers/sources/${s.id}/run?mode=test`, { method: "POST" }, (d) => `Test: ${d.found} record(s) from ${d.pages} page(s).`, setTestResult)}><LuFlaskConical className="h-4 w-4" /></button>
                      <button title="Run now" disabled={!s.legal_approved} className="hover:text-green-700 disabled:opacity-30" onClick={() => act(s, `/crawlers/sources/${s.id}/run`, { method: "POST" }, (d) => (d.output && d.output !== "opportunity" ? `${OUTPUT_LABEL[d.output]}: ${d.summary?.stored ?? 0} new, ${d.summary?.updated ?? 0} updated, ${d.summary?.rejected ?? 0} rejected${d.ocrPages ? ` (${d.ocrPages} page(s) read by OCR)` : ""}.` : `Crawled ${d.found} record(s): ${d.summary?.needs_review ?? 0} to review, ${d.summary?.duplicate ?? 0} duplicates, ${d.summary?.skipped_existing ?? 0} already seen.`), market.reload)}><LuPlay className="h-4 w-4" /></button>
                      {["dead_letter", "failing"].includes(s.status) && <button title="Reset" className="hover:text-amber-700" onClick={() => act(s, `/crawlers/sources/${s.id}/reset`, { method: "POST" }, "Reset - it will run on the next cycle.")}><LuRotateCcw className="h-4 w-4" /></button>}
                      <button title="Run history" className="hover:text-ink-900" onClick={() => setRunsFor(s)}><LuHistory className="h-4 w-4" /></button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reference data held from the RERA / NHB-RBI / portal-market crawlers */}
      {market.data && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Market & registry data</h3>
            <div className="flex gap-1 rounded-lg bg-surface-muted p-1">
              {[["stats", `Market stats (${market.data.counts.market_stats})`], ["indices", `Price indices (${market.data.counts.price_indices})`], ["rera", `RERA (${market.data.counts.rera_projects})`]].map(([k, l]) => (
                <button key={k} onClick={() => setMarketTab(k)} className={`rounded-md px-3 py-1 text-xs font-semibold ${marketTab === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-xs text-ink-500">{market.data.disclaimer} Portal figures are for benchmarking only - never shown as listings, and the portal is not named on the website.</p>
          <div className="mt-3 max-h-[320px] overflow-auto">
            {marketTab === "stats" && (
              <table className="w-full min-w-[720px] text-xs">
                <thead className="text-left uppercase text-ink-500"><tr><th className="py-2">Area</th><th>Portal</th><th>Type</th><th>Avg ₹ / sq ft</th><th>Change</th><th>Supply</th><th>Yield</th><th>As of</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {market.data.marketStats.map((r, i) => (
                    <tr key={i}><td className="py-1.5 font-semibold text-ink-900">{[r.locality, r.city].filter(Boolean).join(", ")}</td><td>{r.portal_key.replace("portal_", "")}</td><td>{r.property_type} · {r.transaction_type}</td><td>{r.avg_price_per_sqft != null ? Number(r.avg_price_per_sqft).toLocaleString("en-IN") : "—"}</td><td>{r.price_change_percent != null ? `${r.price_change_percent}%` : "—"}</td><td>{r.supply_count ?? "—"}</td><td>{r.rental_yield_percent != null ? `${r.rental_yield_percent}%` : "—"}</td><td>{formatDate(r.captured_on)}</td></tr>
                  ))}
                  {market.data.marketStats.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-ink-500">No market statistics yet - configure and approve a portal market source.</td></tr>}
                </tbody>
              </table>
            )}
            {marketTab === "indices" && (
              <table className="w-full min-w-[560px] text-xs">
                <thead className="text-left uppercase text-ink-500"><tr><th className="py-2">City</th><th>Index</th><th>Period</th><th>Value</th><th>YoY</th><th>QoQ</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {market.data.priceIndices.map((r, i) => (
                    <tr key={i}><td className="py-1.5 font-semibold text-ink-900">{r.city}</td><td>{r.index_source === "nhb_residex" ? "NHB Residex" : r.index_source === "rbi_hpi" ? "RBI HPI" : r.index_source}</td><td>{r.period}</td><td>{Number(r.index_value)}</td><td>{r.yoy_change_percent != null ? `${r.yoy_change_percent}%` : "—"}</td><td>{r.qoq_change_percent != null ? `${r.qoq_change_percent}%` : "—"}</td></tr>
                  ))}
                  {market.data.priceIndices.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-ink-500">No price indices yet.</td></tr>}
                </tbody>
              </table>
            )}
            {marketTab === "rera" && (
              <>
                <p className="text-xs text-ink-600">{market.data.counts.rera_projects} projects in the registry · {market.data.counts.rera_flagged} delayed, lapsed or revoked. A listing's RERA number is checked against this in its due-diligence report.</p>
                <table className="mt-2 w-full min-w-[480px] text-xs">
                  <thead className="text-left uppercase text-ink-500"><tr><th className="py-2">Promoters to watch</th><th>Projects</th><th>Delayed</th><th>Complaints</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {market.data.promotersToWatch.map((r) => (
                      <tr key={r.promoter_name}><td className="py-1.5 font-semibold text-ink-900">{r.promoter_name}</td><td>{r.projects}</td><td className={r.delayed ? "font-semibold text-red-600" : ""}>{r.delayed}</td><td>{r.complaints}</td></tr>
                    ))}
                    {market.data.promotersToWatch.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-ink-500">Nothing flagged.</td></tr>}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {configuring && <ConfigModal source={configuring} onClose={() => setConfiguring(null)} onSaved={() => { setConfiguring(null); reload(); }} />}

      <Modal open={!!approving} onClose={() => setApproving(null)} title="Legal approval" description={approving?.name}>
        {approving && (
          <div className="space-y-3 text-sm">
            <p className="text-ink-600">Record counsel's confirmation that this portal's Terms of Service and robots.txt allow automated collection of public auction data. Without it the source cannot be enabled or run.</p>
            <textarea className="field-input h-24 py-2" placeholder="Notes (who reviewed, ToS version, restrictions)" value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} />
            <div className="flex justify-end gap-2">
              {approving.legal_approved && (
                <button className="btn-outline text-coral-600" onClick={() => { act(approving, `/crawlers/sources/${approving.id}/legal-approval`, { method: "PUT", body: { approved: false, notes: approvalNotes } }, "Approval withdrawn - source disabled."); setApproving(null); }}>Withdraw</button>
              )}
              <button className="btn-primary" onClick={() => { act(approving, `/crawlers/sources/${approving.id}/legal-approval`, { method: "PUT", body: { approved: true, notes: approvalNotes } }, "Legal approval recorded."); setApproving(null); }}>
                <LuShieldCheck className="h-4 w-4" /> Approve
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!testResult} onClose={() => setTestResult(null)} title="Test run result" description={testResult ? `${testResult.found} record(s) from ${testResult.pages} page(s) - nothing was saved` : ""} maxWidth="max-w-3xl">
        <pre className="max-h-[60vh] overflow-auto rounded-lg bg-surface-muted p-3 text-[11px]">{JSON.stringify(testResult?.sample || [], null, 2)}</pre>
      </Modal>

      <Modal open={!!runsFor} onClose={() => setRunsFor(null)} title={`Run history - ${runsFor?.name || ""}`} maxWidth="max-w-3xl">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="text-left uppercase text-ink-500"><tr><th className="py-2">Started</th><th>Trigger</th><th>Status</th><th>Pages</th><th>Found</th><th>Queued</th><th>Dup</th><th>Error / recovery</th></tr></thead>
            <tbody className="divide-y divide-line">
              {(runs.data || []).map((r) => (
                <tr key={r.id}>
                  <td className="py-1.5">{formatDate(r.started_at, true)}</td>
                  <td>{r.trigger}</td>
                  <td><StatusBadge value={titleCase(r.status)} /></td>
                  <td>{r.pages_fetched}</td><td>{r.items_found}</td><td>{r.items_ingested}</td><td>{r.items_duplicate}</td>
                  <td className="max-w-[260px] text-ink-600">{r.error_message ? `${r.error_message} → ${r.recovery_action || ""}` : r.recovery_action || "—"}</td>
                </tr>
              ))}
              {(runs.data || []).length === 0 && <tr><td colSpan={8} className="py-6 text-center text-ink-500">No runs yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
