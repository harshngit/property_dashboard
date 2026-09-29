import { useMemo, useState } from "react";
import { LuWaypoints, LuRefreshCw, LuX } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate } from "../../lib/format";

// Module 44 Reputation Graph. Brokers are nodes, real working relationships
// are edges (closed deals together weigh most, then co-listing, routing,
// vouches, shared requirements). A broker's network score is the weighted
// average trust of who they work with; it moves their trust score by at
// most +/- 5. Shared-IP / account-creator pairs and same-agency vouches are
// excluded; new accounts do not lend trust.

const STAFF = ["internal_sales", "admin", "super_admin"];
const ADMIN = ["admin", "super_admin"];
const BROKERS = ["broker", "agency_admin", "builder"];
const KIND = { closed_deal: "Closed deal", co_listing: "Co-listing", routing: "Routing", share: "Shared requirement", vouch: "Vouch" };
const REASON = { shared_ip: "Same network / IP", created_account: "One created the other's account", same_agency_vouch: "Same-agency vouch" };

// Small deterministic force layout (no dependency).
function layout(nodes, edges, center, W, H) {
  const pos = new Map();
  nodes.forEach((n, i) => {
    const a = (i / Math.max(1, nodes.length)) * Math.PI * 2;
    pos.set(n.id, n.id === center ? { x: W / 2, y: H / 2 } : { x: W / 2 + Math.cos(a) * W * 0.3, y: H / 2 + Math.sin(a) * H * 0.3 });
  });
  const k = Math.min(160, Math.sqrt((W * H) / Math.max(1, nodes.length)) * 0.6);
  const gravity = 0.8 * Math.min(1, nodes.length / 40);
  for (let it = 0; it < 250; it += 1) {
    const disp = new Map(nodes.map((n) => [n.id, { x: 0, y: 0 }]));
    for (const a of nodes) {
      const pa = pos.get(a.id);
      for (const b of nodes) {
        if (a.id === b.id) continue;
        const pb = pos.get(b.id);
        const dx = pa.x - pb.x || 0.01, dy = pa.y - pb.y || 0.01;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > k * 3) continue; // local repulsion only
        const f = (k * k) / d;
        disp.get(a.id).x += (dx / d) * f;
        disp.get(a.id).y += (dy / d) * f;
      }
      // Gravity keeps separate clusters on screen instead of on the border.
      disp.get(a.id).x += (W / 2 - pa.x) * gravity;
      disp.get(a.id).y += (H / 2 - pa.y) * gravity;
    }
    for (const e of edges) {
      const pa = pos.get(e.source), pb = pos.get(e.target);
      if (!pa || !pb) continue;
      const dx = pa.x - pb.x, dy = pa.y - pb.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = ((d * d) / k) * (0.5 + e.weight / 5);
      disp.get(e.source).x -= (dx / d) * f;
      disp.get(e.source).y -= (dy / d) * f;
      disp.get(e.target).x += (dx / d) * f;
      disp.get(e.target).y += (dy / d) * f;
    }
    const t = 12 * (1 - it / 250) + 0.5;
    for (const n of nodes) {
      if (n.id === center) continue;
      const p = pos.get(n.id), v = disp.get(n.id);
      const d = Math.sqrt(v.x * v.x + v.y * v.y) || 1;
      p.x = Math.min(W - 40, Math.max(40, p.x + (v.x / d) * Math.min(d, t)));
      p.y = Math.min(H - 30, Math.max(30, p.y + (v.y / d) * Math.min(d, t)));
    }
  }
  return pos;
}

function trustColor(t) {
  if (t == null) return "#9CA3AF";
  return t >= 85 ? "#059669" : t >= 60 ? "#D97706" : "#DC2626";
}

function Graph({ graph, onPick, selected }) {
  const W = 760, H = 460;
  const pos = useMemo(() => layout(graph.nodes, graph.edges, graph.center, W, H), [graph]);
  if (!graph.nodes.length || (graph.nodes.length === 1 && !graph.edges.length)) {
    return <p className="py-16 text-center text-sm text-ink-500">No network yet - co-list, route, share requirements, close deals together or get vouched for.</p>;
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Broker reputation network">
      {graph.edges.map((e) => {
        const a = pos.get(e.source), b = pos.get(e.target);
        if (!a || !b) return null;
        const vouchOnly = Object.keys(e.kinds).every((k) => k === "vouch");
        return (
          <line key={`${e.source}-${e.target}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={vouchOnly ? "#A78BFA" : "#CBD5E1"} strokeWidth={1 + e.weight * 0.9} strokeDasharray={vouchOnly ? "5 4" : undefined}>
            <title>{Object.entries(e.kinds).map(([k, n]) => `${KIND[k] || k} ×${n}`).join(", ")} · weight {e.weight}</title>
          </line>
        );
      })}
      {graph.nodes.map((n) => {
        const p = pos.get(n.id);
        const dense = graph.nodes.length > 30;
        const r = n.id === graph.center ? 16 : (dense ? 5 : 10) + Math.min(dense ? 4 : 6, n.neighbours);
        return (
          <g key={n.id} transform={`translate(${p.x},${p.y})`} className="cursor-pointer" onClick={() => onPick(n)}>
            <circle r={r} fill={trustColor(n.trust)} stroke={selected === n.id ? "#111827" : "#fff"} strokeWidth={selected === n.id ? 3 : dense ? 1 : 2} />
            {(!dense || n.id === graph.center || selected === n.id) && (
              <text y={r + 13} textAnchor="middle" className="fill-ink-700" style={{ fontSize: 11, fontWeight: n.id === graph.center ? 700 : 500 }}>
                {(n.name || "").split(" ").slice(0, 2).join(" ")}
              </text>
            )}
            <title>{`${n.name} · trust ${n.trust ?? "—"} · network ${n.networkScore ?? "—"} · adj ${n.adjustment > 0 ? "+" : ""}${n.adjustment}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

function Summary({ s }) {
  if (!s) return null;
  const adj = s.adjustment;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {[
        ["Network score", s.networkScore ?? "—"],
        ["Trust adjustment", `${adj > 0 ? "+" : ""}${adj}`],
        ["Confidence", `${Math.round(s.confidence * 100)}%`],
        ["Connections", s.neighbours],
      ].map(([l, v]) => (
        <div key={l} className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{l}</p>
          <p className={`mt-1 font-display text-2xl font-extrabold ${l === "Trust adjustment" ? (adj > 0 ? "text-emerald-700" : adj < 0 ? "text-red-600" : "text-ink-950") : "text-ink-950"}`}>{v}</p>
        </div>
      ))}
    </div>
  );
}

export default function ReputationPage() {
  const { role, user } = useAuth();
  const toast = useToast();
  const call = useApiCall();
  const staff = STAFF.includes(role);
  const [scope, setScope] = useState(staff ? "global" : "ego");
  const [focus, setFocus] = useState(null); // staff: a broker's ego network
  const [picked, setPicked] = useState(null);
  const [vouchOpen, setVouchOpen] = useState(false);
  const [vf, setVf] = useState({ userId: "", note: "", q: "" });
  const [busy, setBusy] = useState(false);

  const me = useApiQuery(BROKERS.includes(role) ? "/reputation/me" : null);
  const graphPath = `/reputation/graph${buildQuery(staff ? (focus ? { userId: focus } : { scope }) : {})}`;
  const graph = useApiQuery(graphPath);
  const pickedSummary = useApiQuery(staff && picked ? `/reputation/users/${picked.id}` : null);
  const partners = useApiQuery(vouchOpen ? `/matching/partners${buildQuery({ q: vf.q })}` : null);

  const act = async (fn, msg) => {
    setBusy(true);
    try {
      const r = await fn();
      toast.push(typeof msg === "function" ? msg(r) : msg, "success");
      me.reload();
      graph.reload();
      return true;
    } catch (err) {
      toast.push(err.message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const summary = me.data;
  return (
    <div className="space-y-5">
      <PageHeader
        title="Reputation Graph"
        actions={
          <>
            {BROKERS.includes(role) && <button className="btn-primary btn-sm" onClick={() => setVouchOpen(true)}>Vouch for a broker</button>}
            {ADMIN.includes(role) && (
              <button className="btn-outline btn-sm" disabled={busy} onClick={() => act(() => call("/reputation/recompute", { method: "POST" }), (r) => `Recomputed: ${r.data.nodes} brokers, ${r.data.edges} links, ${r.data.trustUpdated} trust scores updated.`)}>
                <LuRefreshCw className="h-4 w-4" /> Recompute now
              </button>
            )}
          </>
        }
      />
      <p className="-mt-4 max-w-3xl text-sm text-ink-500">
        Who you work with counts. Closed deals together weigh most, then co-listing, routing, vouches and shared requirements. Your network can move your trust score by at most ±5 points. Recomputed nightly.
      </p>

      {summary && <Summary s={summary} />}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="card p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-500"><LuWaypoints className="h-4 w-4" /> {focus ? "Broker network" : scope === "global" ? "Platform network" : "Your network"}</h3>
            {staff && (
              <div className="flex items-center gap-2">
                {focus && <button className="btn-outline btn-sm" onClick={() => { setFocus(null); setScope("global"); }}><LuX className="h-4 w-4" /> Back to platform</button>}
              </div>
            )}
          </div>
          {graph.loading && !graph.data ? <div className="flex justify-center py-24 text-ink-500"><InlineSpinner className="h-6 w-6" /></div> : graph.data && <Graph graph={graph.data} selected={picked?.id} onPick={setPicked} />}
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-500">
            <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" />Trust 85+</span>
            <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-600" />60-84</span>
            <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-600" />Below 60</span>
            <span>Thicker line = stronger relationship · dashed = vouch only</span>
          </div>
        </div>

        <div className="space-y-4">
          {picked && (
            <div className="card p-4">
              <p className="font-semibold text-ink-950">{picked.name}</p>
              <p className="text-xs text-ink-500">{picked.role} · trust {picked.trust ?? "—"} · network {picked.networkScore ?? "—"} · adjustment {picked.adjustment > 0 ? "+" : ""}{picked.adjustment}</p>
              {staff && picked.id !== focus && <button className="btn-outline btn-sm mt-3" onClick={() => { setFocus(picked.id); setPicked(null); }}>Show their network</button>}
              {staff && pickedSummary.data?.excluded?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Excluded links (anti-gaming)</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-red-700">{pickedSummary.data.excluded.map((e) => <li key={`${e.with}-${e.reason}`}>{REASON[e.reason] || e.reason}</li>)}</ul>
                </div>
              )}
            </div>
          )}
          {summary && (
            <div className="card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Vouches received ({summary.received.length})</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {summary.received.length === 0 ? <li className="text-ink-500">None yet.</li> : summary.received.map((v) => <li key={v.id}><b>{v.voucher_name}</b>{v.note ? ` - ${v.note}` : ""}</li>)}
              </ul>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-500">Vouches given ({summary.given.length}/10)</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {summary.given.length === 0 ? (
                  <li className="text-ink-500">You need a trust score of 60+ to vouch.</li>
                ) : (
                  summary.given.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-2">
                      <span>{v.vouchee_name} <span className="text-xs text-ink-400">{formatDate(v.created_at)}</span></span>
                      <button className="text-xs font-semibold text-red-600 hover:underline" disabled={busy} onClick={() => act(() => call(`/reputation/vouch/${v.id}`, { method: "DELETE" }), "Vouch revoked.")}>Revoke</button>
                    </li>
                  ))
                )}
              </ul>
              {summary.excluded?.length > 0 && (
                <p className="mt-4 text-xs text-amber-700">{summary.excluded.length} of your links do not count (e.g. same network or same-agency vouch).</p>
              )}
            </div>
          )}
          {!summary && !picked && <div className="card p-4 text-sm text-ink-500">Click a broker in the graph for details{staff ? ", or open their own network" : ""}.</div>}
        </div>
      </div>

      <Modal open={vouchOpen} onClose={() => setVouchOpen(false)} title="Vouch for a broker" description="Only for brokers you have actually worked with. Vouches within your own agency do not count.">
        <div className="space-y-3">
          <input className="field-input" placeholder="Search brokers" value={vf.q} onChange={(e) => setVf((f) => ({ ...f, q: e.target.value }))} />
          <select className="field-input" size={6} value={vf.userId} onChange={(e) => setVf((f) => ({ ...f, userId: e.target.value }))}>
            {(partners.data || []).filter((p) => p.id !== user?.id).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
          <TextareaField label="How do you know them? (optional)" rows={2} value={vf.note} onChange={(e) => setVf((f) => ({ ...f, note: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <button className="btn-outline" onClick={() => setVouchOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={busy || !vf.userId}
              onClick={async () => {
                if (await act(() => call("/reputation/vouch", { method: "POST", body: { userId: vf.userId, note: vf.note || undefined } }), "Vouch recorded - it counts from the next recompute.")) {
                  setVouchOpen(false);
                  setVf({ userId: "", note: "", q: "" });
                }
              }}
            >
              Vouch
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
