import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import EmptyState from "../../components/common/EmptyState";
import { InlineSpinner } from "../../components/common/PageLoader";
import { SelectField, TextField } from "../../components/common/FormField";
import Select from "../../components/common/Select";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { useApiCall, useApiQuery } from "../../hooks/useApi";

// Sec. 34 Universal Inquiry Assignment Cascade - who takes inquiries:
// designation (RM / DM / TL / TC), the public platform number shown to
// buyers and sellers, coverage (states / cities / localities - all
// admin-editable, nothing hardcoded), team leader, accepting assignments;
// plus the broker -> RM mapping (one click). Attended / missed counts feed
// the incentive score on each EM code.

const ADMIN = ["admin", "super_admin"];
const DESIGNATIONS = [
  { value: "rm", label: "RM - Relationship Manager" },
  { value: "dm", label: "DM - Deal Manager" },
  { value: "tl", label: "TL - Team Leader" },
  { value: "tc", label: "TC - Telecaller" },
];
const toList = (text) => String(text || "").split(",").map((x) => x.trim()).filter(Boolean);

export default function RepresentativesPage() {
  const { role } = useAuth();
  const admin = ADMIN.includes(role);
  const [tab, setTab] = useState("reps");
  return (
    <div>
      <PageHeader title="Representatives & Assignment" />
      <div className="mb-4 flex gap-1 rounded-lg bg-surface-muted p-1 sm:w-fit">
        {[["reps", "Representatives"], ["brokers", "Broker → RM mapping"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-xs font-semibold ${tab === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === "reps" ? <Reps admin={admin} /> : <Brokers admin={admin} />}
    </div>
  );
}

function Reps({ admin }) {
  const toast = useToast();
  const call = useApiCall();
  const { data, loading, reload } = useApiQuery("/representatives");
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const rows = data || [];
  const leaders = rows.filter((r) => r.is_rep && r.designation === "tl").map((r) => ({ value: r.user_id, label: r.full_name }));

  const save = async () => {
    setBusy(true);
    try {
      await call(`/representatives/${editing.user_id}`, {
        method: "PUT",
        body: {
          designation: editing.designation || "rm",
          platformNumber: editing.platform_number || null,
          assignedStates: toList(editing.statesText),
          assignedCities: toList(editing.citiesText),
          coverageLocalities: toList(editing.localitiesText),
          teamLeaderId: editing.team_leader_id || null,
          acceptsAssignments: editing.accepts_assignments !== false,
        },
      });
      toast.push("Representative saved.", "success");
      setEditing(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const runSweep = async () => {
    try {
      const res = await call("/representatives/sweep", { method: "POST" });
      const d = res.data;
      toast.push(`Cascade run: ${d.assigned} assigned, ${d.transferred} transferred, ${d.reinjected} re-routed, ${d.slaAlerts} SLA alerts.`, "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  if (loading && !data) return <div className="flex justify-center py-16"><InlineSpinner className="h-6 w-6" /></div>;
  if (!rows.length) return <EmptyState title="No A R staff yet" subtitle="Create internal sales users first, then configure them here." />;
  return (
    <>
      {admin && (
        <div className="mb-3 flex justify-end">
          <button className="btn-outline btn-sm" onClick={runSweep}>Run cascade now</button>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Designation</th>
              <th className="px-4 py-3">Platform number</th>
              <th className="px-4 py-3">Coverage</th>
              <th className="px-4 py-3">Team leader</th>
              <th className="px-4 py-3 text-right">Open</th>
              <th className="px-4 py-3 text-right">Attended</th>
              <th className="px-4 py-3 text-right">Missed</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.user_id} className={r.status !== "active" ? "opacity-50" : ""}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink-900">{r.full_name}</p>
                  <p className="text-xs text-ink-500">{r.email}{r.status !== "active" ? ` · ${r.status}` : ""}</p>
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.is_rep ? (
                    <>
                      <span className="font-bold uppercase">{r.designation}</span>
                      {!r.accepts_assignments && <span className="ml-1 rounded bg-amber-50 px-1.5 text-amber-700">paused</span>}
                    </>
                  ) : (
                    <span className="text-ink-400">Not a representative</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{r.platform_number || (r.is_rep ? <span className="text-amber-700">Not set</span> : "–")}</td>
                <td className="px-4 py-3 text-xs">
                  {r.is_rep ? (
                    [...(r.assigned_states || []), ...(r.assigned_cities || []), ...(r.coverage_localities || [])].join(", ") || <span className="text-ink-500">Platform-wide fallback only</span>
                  ) : "–"}
                </td>
                <td className="px-4 py-3 text-xs">{r.team_leader_name || "–"}</td>
                <td className="px-4 py-3 text-right">{r.open_load}</td>
                <td className="px-4 py-3 text-right text-emerald-700">{r.attended}</td>
                <td className={`px-4 py-3 text-right ${r.missed ? "font-semibold text-red-600" : ""}`}>{r.missed}</td>
                <td className="px-4 py-3 text-right">
                  {admin && (
                    <button
                      className="btn-outline btn-sm"
                      onClick={() =>
                        setEditing({
                          ...r,
                          designation: r.designation || "rm",
                          statesText: (r.assigned_states || []).join(", "),
                          citiesText: (r.assigned_cities || []).join(", "),
                          localitiesText: (r.coverage_localities || []).join(", "),
                          accepts_assignments: r.is_rep ? r.accepts_assignments : true,
                        })
                      }
                    >
                      {r.is_rep ? "Edit" : "Make representative"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Representative - ${editing.full_name}` : ""} description="Coverage decides who is 'in the region'. Leave all three empty for platform-wide fallback only." maxWidth="max-w-lg">
        {editing && (
          <div className="space-y-3">
            <SelectField label="Designation" value={editing.designation} onChange={(e) => setEditing((x) => ({ ...x, designation: e.target.value }))} options={DESIGNATIONS} />
            <TextField label="Platform number (shown to buyers and sellers)" value={editing.platform_number || ""} onChange={(e) => setEditing((x) => ({ ...x, platform_number: e.target.value }))} placeholder="+91 80000 12345" />
            <TextField label="States (codes, comma separated)" value={editing.statesText} onChange={(e) => setEditing((x) => ({ ...x, statesText: e.target.value }))} placeholder="DL, HR" />
            <TextField label="Cities (comma separated)" value={editing.citiesText} onChange={(e) => setEditing((x) => ({ ...x, citiesText: e.target.value }))} placeholder="New Delhi, Gurugram" />
            <TextField label="Localities (comma separated)" value={editing.localitiesText} onChange={(e) => setEditing((x) => ({ ...x, localitiesText: e.target.value }))} placeholder="Rajouri Garden, Sector 56" />
            <SelectField
              label="Team leader"
              value={editing.team_leader_id || ""}
              onChange={(e) => setEditing((x) => ({ ...x, team_leader_id: e.target.value }))}
              options={[{ value: "", label: "None" }, ...leaders.filter((l) => l.value !== editing.user_id)]}
            />
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={editing.accepts_assignments !== false} onChange={(e) => setEditing((x) => ({ ...x, accepts_assignments: e.target.checked }))} />
              Accepting new inquiries
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy} onClick={save}>Save</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Brokers({ admin }) {
  const toast = useToast();
  const call = useApiCall();
  const { data, loading, reload } = useApiQuery("/representatives/broker-mappings");
  const { data: reps } = useApiQuery("/representatives");
  const rmOptions = [{ value: "", label: "Not mapped" }, ...(reps || []).filter((r) => r.is_rep && r.status === "active").map((r) => ({ value: r.user_id, label: `${r.full_name} (${String(r.designation).toUpperCase()})` }))];
  const rows = data || [];
  const unmapped = rows.filter((r) => !r.rm_id).length;

  const map = async (brokerId, rmId) => {
    try {
      await call(`/representatives/broker-mappings/${brokerId}`, { method: "PUT", body: { rmId: rmId || null } });
      toast.push(rmId ? "Broker mapped." : "Mapping removed.", "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  if (loading && !data) return <div className="flex justify-center py-16"><InlineSpinner className="h-6 w-6" /></div>;
  if (!rows.length) return <EmptyState title="No active brokers" />;
  return (
    <>
      {unmapped > 0 && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {unmapped} broker{unmapped === 1 ? "" : "s"} without an RM - their inquiries go to the least-busy RM in the region and admins are alerted each time.
        </p>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Broker</th>
              <th className="px-4 py-3">Agency</th>
              <th className="px-4 py-3">Mapped RM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((b) => (
              <tr key={b.broker_id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink-900">{b.broker_name}</p>
                  <p className="text-xs text-ink-500">{b.broker_email}</p>
                </td>
                <td className="px-4 py-3 text-xs">{b.agency || "–"}</td>
                <td className="px-4 py-3">
                  {admin ? (
                    <Select value={b.rm_id || ""} onChange={(v) => map(b.broker_id, v)} options={rmOptions} className="max-w-xs" />
                  ) : (
                    <span className={b.rm_name ? "" : "text-amber-700"}>{b.rm_name || "Not mapped"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
