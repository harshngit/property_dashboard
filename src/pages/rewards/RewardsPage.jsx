import { useState } from "react";
import { LuTrophy, LuFlame, LuMedal } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextField, TextareaField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate } from "../../lib/format";

// Module 29 - Gamification.
//   Brokers / builders   their points, tier and streak, how to earn more, and
//                        the platform-wide and area-wise leaderboards.
//   A R staff            the leaderboards for both audiences; admins also
//                        set the points per action, tier thresholds and
//                        record bonuses / corrections.

const STAFF = ["internal_sales", "admin", "super_admin"];
const ADMIN = ["admin", "super_admin"];
const TIER_STYLE = { bronze: "bg-amber-100 text-amber-800", silver: "bg-slate-200 text-slate-700", gold: "bg-yellow-100 text-yellow-800", platinum: "bg-cyan-100 text-cyan-800", elite: "bg-ink-900 text-white" };
const Spinner = () => <div className="flex justify-center py-16 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
export const TierBadge = ({ tier }) => (tier ? <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${TIER_STYLE[tier.key] || TIER_STYLE.bronze}`}><LuMedal className="h-3.5 w-3.5" />{tier.label}</span> : null);
const n = (v) => Number(v || 0).toLocaleString("en-IN");

function MyPoints({ me }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Your points</p>
              <p className="font-display text-4xl font-extrabold text-ink-950">{n(me.totalPoints)}</p>
            </div>
            <TierBadge tier={me.tier} />
            <div className="ml-auto text-right text-xs text-ink-600">
              <p><b className="text-ink-900">{n(me.pointsThisMonth)}</b> this month</p>
              {me.rankThisMonth && <p>Rank <b className="text-ink-900">#{me.rankThisMonth}</b> this month</p>}
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2.5 rounded-full bg-surface-muted"><div className="h-2.5 rounded-full bg-red-500" style={{ width: `${me.progressPercent}%` }} /></div>
            <p className="mt-1.5 text-xs text-ink-600">{me.nextTier ? <><b>{n(me.pointsToNext)}</b> more points to reach <b>{me.nextTier.label}</b></> : "You are at the top tier."}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {me.tiers.map((t) => <span key={t.key} className={`rounded-lg border px-2.5 py-1 text-[11px] ${t.key === me.tier.key ? "border-red-300 bg-red-50 font-bold text-red-700" : "border-line text-ink-500"}`}>{t.label} · {n(t.min)}+</span>)}
          </div>
        </div>
        <div className="card p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-ink-900"><LuFlame className="h-4 w-4 text-red-600" /> Weekly streak</p>
          <p className="mt-2 font-display text-3xl font-extrabold text-ink-950">{me.streakWeeks} <span className="text-sm font-semibold text-ink-500">week{me.streakWeeks === 1 ? "" : "s"}</span></p>
          <p className="text-xs text-ink-500">Best so far: {me.bestStreakWeeks}. Stay active every week to keep it going.</p>
          {me.cities.length > 0 && <p className="mt-3 text-xs text-ink-600">Earned in: {me.cities.map((c) => `${c.city} (${n(c.points)})`).join(", ")}</p>}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <p className="mb-3 text-sm font-bold text-ink-900">How to earn points</p>
          {me.howToEarn.map((r) => (
            <div key={r.action_key} className="flex items-start justify-between gap-3 border-b border-line py-2 last:border-0">
              <div><p className="text-sm font-semibold text-ink-900">{r.label}</p><p className="text-xs text-ink-500">{r.description}</p></div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">+{r.points}</span>
            </div>
          ))}
        </div>
        <div className="card p-5">
          <p className="mb-3 text-sm font-bold text-ink-900">Recent points</p>
          {me.recent.length === 0 ? <p className="text-sm text-ink-500">No points yet - they appear as your listings, leads and deals progress.</p> : me.recent.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-3 border-b border-line py-2 last:border-0">
              <div><p className="text-sm text-ink-900">{p.label}</p><p className="text-xs text-ink-500">{formatDate(p.earned_at)}{p.city ? ` · ${p.city}` : ""}{p.note ? ` · ${p.note}` : ""}</p></div>
              <span className={`shrink-0 text-sm font-bold ${p.points < 0 ? "text-red-600" : "text-emerald-700"}`}>{p.points > 0 ? "+" : ""}{p.points}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Board({ staff, admin }) {
  const call = useApiCall();
  const toast = useToast();
  const [scope, setScope] = useState("platform");
  const [city, setCity] = useState("");
  const [period, setPeriod] = useState("month");
  const [audience, setAudience] = useState("professional");
  const cities = useApiQuery("/gamification/cities");
  const ready = scope === "platform" || city;
  const { data, loading, reload } = useApiQuery(ready ? `/gamification/leaderboard${buildQuery({ scope, city: scope === "area" ? city : undefined, period, audience: staff ? audience : undefined })}` : null);
  const [adjust, setAdjust] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await call("/gamification/manage/adjust", { method: "POST", body: { userId: adjust.userId, points: Number(adjust.points), reason: adjust.reason } });
      toast.push("Points recorded.", "success");
      setAdjust(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const rows = data?.items || [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-surface-muted p-1">
          {[["platform", "Platform-wide"], ["area", "By city"]].map(([k, l]) => <button key={k} onClick={() => setScope(k)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${scope === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>)}
        </div>
        {scope === "area" && (
          <select id="board-city" data-no-translate className="field-select h-9 w-52" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Choose a city</option>
            {(cities.data || []).map((c) => <option key={c.city} value={c.city}>{c.city} ({c.players})</option>)}
          </select>
        )}
        <select id="board-period" className="field-select h-9 w-40" value={period} onChange={(e) => setPeriod(e.target.value)}><option value="month">This month</option><option value="quarter">This quarter</option><option value="all">All time</option></select>
        {staff && <select id="board-audience" className="field-select h-9 w-48" value={audience} onChange={(e) => setAudience(e.target.value)}><option value="professional">Brokers and builders</option><option value="customer">Customers</option></select>}
      </div>
      {!ready ? <p className="card p-5 text-sm text-ink-500">Choose a city to see its leaderboard.</p> : loading && !data ? <Spinner /> : rows.length === 0 ? (
        <EmptyState title="No one on this board yet" subtitle="Points are earned from approved listings, fast lead responses, site visits and closed deals." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className="px-4 py-3">Rank</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Tier</th><th className="px-4 py-3 text-right">Points</th>{admin && <th className="px-4 py-3" />}</tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((r, i) => (
                <tr key={`${r.rank}-${i}`} className={r.isMe ? "bg-red-50" : ""}>
                  <td className="px-4 py-2.5 font-display text-base font-extrabold text-ink-950">{r.rank <= 3 ? <span className="inline-flex items-center gap-1"><LuTrophy className={`h-4 w-4 ${["text-yellow-500", "text-slate-400", "text-amber-700"][r.rank - 1]}`} />{r.rank}</span> : r.rank}</td>
                  <td className="px-4 py-2.5" data-no-translate><span className="font-semibold text-ink-900">{r.name}</span>{r.isMe && <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">You</span>}</td>
                  <td className="px-4 py-2.5"><TierBadge tier={r.tier} /></td>
                  <td className="px-4 py-2.5 text-right font-semibold">{n(r.points)}</td>
                  {admin && <td className="px-4 py-2.5 text-right"><button className="text-xs font-semibold text-red-600 hover:underline" onClick={() => setAdjust({ userId: r.userId, name: r.name, points: "", reason: "" })}>Adjust</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
          {data.me && !rows.some((r) => r.isMe) && <p className="border-t border-line bg-red-50 px-4 py-2.5 text-sm text-ink-800">Your rank: <b>#{data.me.rank}</b> with <b>{n(data.me.points)}</b> points</p>}
        </div>
      )}
      <Modal open={!!adjust} onClose={() => setAdjust(null)} title="Bonus or correction" description={adjust?.name}>
        {adjust && (
          <div className="space-y-3">
            <TextField label="Points (use a minus sign to deduct)" type="number" value={adjust.points} onChange={(e) => setAdjust({ ...adjust, points: e.target.value })} />
            <TextareaField label="Reason (the person sees this)" rows={2} value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} />
            <p className="text-xs text-ink-500">This adds a new entry to the points history; earlier entries are never changed.</p>
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setAdjust(null)}>Cancel</button><button className="btn-primary" disabled={busy || !Number(adjust.points) || adjust.reason.trim().length < 5} onClick={save}>Record</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Rules({ admin }) {
  const call = useApiCall();
  const toast = useToast();
  const { data, loading, reload } = useApiQuery("/gamification/manage/settings");
  const [tiers, setTiers] = useState(null);
  const [busy, setBusy] = useState(false);
  if (loading && !data) return <Spinner />;
  if (!data) return null;
  const run = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      toast.push(msg, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const saveRule = (r, patch) => run(() => call(`/gamification/manage/rules/${r.actionKey}`, { method: "PUT", body: patch }), "Rule saved.");
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">People with points</p><p className="mt-1 font-display text-2xl font-extrabold">{n(data.totals.players)}</p></div>
        <div className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Points this month</p><p className="mt-1 font-display text-2xl font-extrabold">{n(data.totals.points_month)}</p></div>
        <div className="card p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Points awarded in all</p><p className="mt-1 font-display text-2xl font-extrabold">{n(data.totals.points)}</p></div>
      </div>
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-3">
          <p className="text-sm font-bold text-ink-900">Tiers (lifetime points needed)</p>
          {admin && !tiers && <button className="btn-outline btn-sm ml-auto" onClick={() => setTiers(data.tiers.map((t) => ({ ...t })))}>Edit thresholds</button>}
        </div>
        <div className="grid gap-3 sm:grid-cols-5">
          {(tiers || data.tiers).map((t, i) => (
            <div key={t.key} className="rounded-xl border border-line p-3">
              <TierBadge tier={t} />
              {tiers ? <input type="number" min="0" disabled={i === 0} className="field-input mt-2 h-9" value={t.min} onChange={(e) => setTiers(tiers.map((x) => (x.key === t.key ? { ...x, min: e.target.value } : x)))} /> : <p className="mt-2 font-display text-xl font-extrabold text-ink-950">{n(t.min)}+</p>}
              <p className="text-[11px] text-ink-500">{t.members} member{t.members === 1 ? "" : "s"}</p>
            </div>
          ))}
        </div>
        {tiers && <div className="mt-3 flex justify-end gap-2"><button className="btn-outline" onClick={() => setTiers(null)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={() => run(() => call("/gamification/manage/tiers", { method: "PUT", body: { tiers: tiers.map((t) => ({ key: t.key, min: Number(t.min) })) } }).then(() => setTiers(null)), "Tiers saved - everyone's tier follows the new thresholds.")}>Save tiers</button></div>}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className="px-4 py-3">Action</th><th className="px-4 py-3">Who earns it</th><th className="px-4 py-3">Points</th><th className="px-4 py-3">On</th></tr></thead>
          <tbody className="divide-y divide-line">
            {data.rules.filter((r) => r.actionKey !== "manual_adjustment").map((r) => (
              <tr key={r.actionKey} className={r.isActive ? "" : "opacity-60"}>
                <td className="px-4 py-2.5"><p className="font-semibold text-ink-900">{r.label}</p><p className="text-xs text-ink-500">{r.description}</p></td>
                <td className="px-4 py-2.5 text-xs">{{ professional: "Brokers and builders", customer: "Customers", all: "Everyone" }[r.audience]}</td>
                <td className="px-4 py-2.5">{admin ? <input type="number" min="0" className="field-input h-9 w-24" defaultValue={r.points} onBlur={(e) => Number(e.target.value) !== r.points && e.target.value !== "" && saveRule(r, { points: Number(e.target.value) })} /> : <b>{r.points}</b>}</td>
                <td className="px-4 py-2.5"><input type="checkbox" disabled={!admin || busy} checked={r.isActive} onChange={(e) => saveRule(r, { isActive: e.target.checked })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-500">Points are awarded automatically from recorded activity and are checked every hour. A change to the points applies to what is earned from now on; points already awarded stay as they are.</p>
    </div>
  );
}

export default function RewardsPage() {
  const { role } = useAuth();
  const staff = STAFF.includes(role);
  const admin = ADMIN.includes(role);
  const me = useApiQuery(staff ? null : "/gamification/me");
  const [tab, setTab] = useState(staff ? "board" : "me");
  const tabs = staff ? [["board", "Leaderboards"], ["rules", "Points and tiers"]] : [["me", "My points"], ["board", "Leaderboards"]];
  if (!staff && me.data && me.data.enabled === false) return <div className="space-y-5"><PageHeader title="Rewards & Leaderboard" /><p className="card p-5 text-sm text-ink-600">Rewards are switched off at the moment.</p></div>;
  return (
    <div className="space-y-5">
      <PageHeader title="Rewards & Leaderboard" />
      <div className="flex gap-1 rounded-lg bg-surface-muted p-1 sm:w-fit">
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-xs font-semibold ${tab === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>)}
      </div>
      {tab === "me" && (me.data ? <MyPoints me={me.data} /> : me.error ? <p className="card p-5 text-sm text-red-700">{me.error}</p> : <Spinner />)}
      {tab === "board" && <Board staff={staff} admin={admin} />}
      {tab === "rules" && staff && <Rules admin={admin} />}
    </div>
  );
}
