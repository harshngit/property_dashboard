import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { LuSave, LuBell, LuGlobe, LuKeyRound, LuCamera, LuLoader, LuShieldCheck } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import { TextField, SelectField } from "../../components/common/FormField";
import Avatar from "../../components/common/Avatar";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";
import { ROLE_LABELS } from "../../config/roles";
import { updateProfile, changePassword, uploadProfilePicture } from "../../redux/slices/authSlice";

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <section className="card p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-ink-950">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { user, role } = useAuth();
  const dispatch = useDispatch();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    mobile: user?.mobile || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);

  const [notifs, setNotifs] = useState({ email: true, whatsapp: true, overdue: true });

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await dispatch(updateProfile(profile)).unwrap();
      toast.push("Profile updated.", "success");
    } catch (err) {
      toast.push(err || "Could not update profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePictureSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingPicture(true);
    try {
      await dispatch(uploadProfilePicture(file)).unwrap();
      toast.push("Profile picture updated.", "success");
    } catch (err) {
      toast.push(err || "Could not upload picture.", "error");
    } finally {
      setUploadingPicture(false);
    }
  };

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!pwForm.currentPassword) errors.currentPassword = "Enter your current password.";
    if (!pwForm.newPassword || pwForm.newPassword.length < 8) errors.newPassword = "New password must be at least 8 characters.";
    if (pwForm.newPassword !== pwForm.confirmPassword) errors.confirmPassword = "Passwords do not match.";
    setPwErrors(errors);
    if (Object.keys(errors).length) return;

    setChangingPassword(true);
    try {
      await dispatch(changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })).unwrap();
      toast.push("Password changed successfully.", "success");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.push(err || "Could not change password.", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Settings" title="Account & workspace" subtitle="Manage your profile, notifications and security preferences." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="group relative">
              <Avatar name={user?.name} color={user?.avatarColor} src={user?.profilePictureUrl} size={84} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPicture}
                title="Change profile picture"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-red-600 text-white shadow-card transition-transform duration-150 hover:scale-105 disabled:opacity-70"
              >
                {uploadingPicture ? <LuLoader className="h-3.5 w-3.5 animate-spin" /> : <LuCamera className="h-3.5 w-3.5" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePictureSelect} />
            </div>
            <p className="mt-3 font-display text-base font-bold text-ink-950">{user?.name}</p>
            <p className="text-xs text-ink-500">{user?.email}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-500">
              <LuShieldCheck className="h-3 w-3" /> {ROLE_LABELS[role] || role}
            </span>
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <form onSubmit={saveProfile}>
            <SectionCard icon={LuGlobe} title="Profile" description="Your personal details, visible to your team.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Full name"
                  value={profile.fullName}
                  onChange={(e) => setProfile((s) => ({ ...s, fullName: e.target.value }))}
                />
                <TextField
                  label="Email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile((s) => ({ ...s, email: e.target.value }))}
                />
                <TextField
                  label="Mobile"
                  value={profile.mobile}
                  onChange={(e) => setProfile((s) => ({ ...s, mobile: e.target.value }))}
                />
                <SelectField label="Role" value={role} disabled options={[{ value: role, label: ROLE_LABELS[role] || role }]} />
              </div>
              <div className="mt-5 flex justify-end border-t border-line pt-5">
                <button type="submit" className="btn-primary" disabled={savingProfile}>
                  {savingProfile ? <LuLoader className="h-4 w-4 animate-spin" /> : <LuSave className="h-4 w-4" />}
                  Save changes
                </button>
              </div>
            </SectionCard>
          </form>

          <form onSubmit={submitPasswordChange}>
            <SectionCard icon={LuKeyRound} title="Password" description="Choose a strong password you don't use elsewhere.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  label="Current password"
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((s) => ({ ...s, currentPassword: e.target.value }))}
                  error={pwErrors.currentPassword}
                  className="sm:col-span-2"
                />
                <TextField
                  label="New password"
                  type="password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((s) => ({ ...s, newPassword: e.target.value }))}
                  error={pwErrors.newPassword}
                />
                <TextField
                  label="Confirm new password"
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm((s) => ({ ...s, confirmPassword: e.target.value }))}
                  error={pwErrors.confirmPassword}
                />
              </div>
              <div className="mt-5 flex justify-end border-t border-line pt-5">
                <button type="submit" className="btn-primary" disabled={changingPassword}>
                  {changingPassword ? <LuLoader className="h-4 w-4 animate-spin" /> : <LuKeyRound className="h-4 w-4" />}
                  Change password
                </button>
              </div>
            </SectionCard>
          </form>

          <SectionCard icon={LuBell} title="Notifications" description="Choose what you want to be alerted about.">
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
          </SectionCard>

          <div className="rounded-xl bg-surface-sunk px-4 py-3 text-xs text-ink-500">
            Your account is scoped to <strong className="text-ink-700">{user?.agency}</strong>. Tenant data is isolated per role-based access rules.
          </div>
        </div>
      </div>
    </div>
  );
}
