import { useState } from "react";
import { LuSave, LuBell, LuGlobe, LuKeyRound } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import { TextField, SelectField } from "../../components/common/FormField";
import Avatar from "../../components/common/Avatar";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";
import { ROLE_LABELS } from "../../config/roles";

export default function SettingsPage() {
  const { user, role } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name || "");
  const [email] = useState(user?.email || "");
  const [notifs, setNotifs] = useState({ email: true, whatsapp: true, overdue: true });

  const save = (e) => {
    e.preventDefault();
    toast.push("Settings saved.", "success");
  };

  return (
    <div>
      <PageHeader eyebrow="Settings" title="Account & workspace" subtitle="Manage your profile, notifications and security preferences." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <Avatar name={user?.name} color={user?.avatarColor} size={72} />
            <p className="mt-3 font-display text-base font-bold text-ink-950">{user?.name}</p>
            <p className="text-xs text-ink-500">{user?.email}</p>
            <span className="mt-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-500">{ROLE_LABELS[role]}</span>
          </div>
        </div>

        <form onSubmit={save} className="card space-y-6 p-6 lg:col-span-2">
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Profile</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
              <TextField label="Email" value={email} disabled />
              <TextField label="Agency / Company" value={user?.agency || ""} disabled />
              <SelectField label="Role" value={role} disabled options={[{ value: role, label: ROLE_LABELS[role] }]} />
            </div>
          </div>

          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-500">
              <LuBell className="h-4 w-4" /> Notifications
            </h3>
            <div className="space-y-2.5">
              {[
                { key: "email", label: "Email alerts for new leads and follow-ups" },
                { key: "whatsapp", label: "WhatsApp notifications for assigned leads" },
                { key: "overdue", label: "Overdue follow-up reminders" },
              ].map((n) => (
                <label key={n.key} className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
                  {n.label}
                  <input
                    type="checkbox"
                    checked={notifs[n.key]}
                    onChange={(e) => setNotifs((s) => ({ ...s, [n.key]: e.target.checked }))}
                    className="h-4 w-4 rounded border-line text-red-500 focus:ring-red-500"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-500">
              <LuGlobe className="h-4 w-4" /> Tenant & data
            </h3>
            <p className="rounded-xl bg-surface-sunk px-4 py-3 text-xs text-ink-500">
              Your account is scoped to <strong className="text-ink-700">{user?.agency}</strong>. Tenant data is isolated per role-based access rules.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-line pt-5">
            <button type="button" onClick={() => toast.push("Password reset link sent.", "info")} className="btn-outline">
              <LuKeyRound className="h-4 w-4" /> Reset password
            </button>
            <button type="submit" className="btn-primary"><LuSave className="h-4 w-4" /> Save changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
