import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import {
  LuSave, LuCamera, LuLoader, LuShieldCheck, LuUser, LuLock, LuBell, LuBadgeCheck, LuTrash2, LuMail, LuPhone, LuUpload,
} from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import { TextField, SelectField, TextareaField } from "../../components/common/FormField";
import Select from "../../components/common/Select";
import Avatar from "../../components/common/Avatar";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../components/common/ToastProvider";
import { ROLE_LABELS } from "../../config/roles";
import { updateProfile, changePassword, uploadProfilePicture, deleteProfilePicture } from "../../redux/slices/authSlice";

const COUNTRY_CODES = [
  { value: "+91", label: "🇮🇳 +91" },
  { value: "+1", label: "🇺🇸 +1" },
  { value: "+44", label: "🇬🇧 +44" },
  { value: "+971", label: "🇦🇪 +971" },
];

const TAX_COUNTRIES = [
  { value: "", label: "Select country" },
  { value: "India", label: "India" },
  { value: "United States", label: "United States" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "United Arab Emirates", label: "United Arab Emirates" },
];

const TABS = [
  { key: "profile", label: "Profile Settings", icon: LuUser },
  { key: "password", label: "Password", icon: LuLock },
  { key: "notifications", label: "Notifications", icon: LuBell },
  { key: "verification", label: "Verification", icon: LuBadgeCheck },
];

const splitName = (fullName = "") => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
};

const splitMobile = (mobile = "") => {
  const match = mobile.trim().match(/^(\+\d{1,3})[\s-]?(.*)$/);
  return match ? { countryCode: match[1], number: match[2] } : { countryCode: "+91", number: mobile };
};

export default function SettingsPage() {
  const { user, role } = useAuth();
  const dispatch = useDispatch();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("profile");

  const { firstName: initFirst, lastName: initLast } = splitName(user?.name);
  const { countryCode: initCode, number: initNumber } = splitMobile(user?.mobile);

  const [profile, setProfile] = useState({
    firstName: initFirst,
    lastName: initLast,
    email: user?.email || "",
    countryCode: initCode,
    mobile: initNumber,
    gender: user?.gender || "",
    taxId: user?.taxId || "",
    taxCountry: user?.taxCountry || "",
    address: user?.address || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [deletingPicture, setDeletingPicture] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);

  const [notifs, setNotifs] = useState({ email: true, whatsapp: true, overdue: true });

  const setP = (key) => (e) => setProfile((s) => ({ ...s, [key]: e.target.value }));

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await dispatch(updateProfile({
        fullName: `${profile.firstName} ${profile.lastName}`.trim(),
        email: profile.email,
        mobile: `${profile.countryCode} ${profile.mobile}`.trim(),
        gender: profile.gender || undefined,
        address: profile.address || undefined,
        taxId: profile.taxId || undefined,
        taxCountry: profile.taxCountry || undefined,
      })).unwrap();
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

  const handleDeletePicture = async () => {
    if (!user?.profilePictureUrl) return;
    setDeletingPicture(true);
    try {
      await dispatch(deleteProfilePicture()).unwrap();
      toast.push("Profile picture removed.", "success");
    } catch (err) {
      toast.push(err || "Could not remove picture.", "error");
    } finally {
      setDeletingPicture(false);
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
      <PageHeader eyebrow="Settings" title="Account settings" subtitle="Manage your profile, notifications and security preferences." />

      <div className="flex flex-col gap-5 lg:flex-row">
        <aside className="card h-fit shrink-0 p-3 lg:w-64">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                  activeTab === tab.key ? "bg-indigo-50 text-indigo-600" : "text-ink-600 hover:bg-surface-sunk"
                }`}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 space-y-5">
          {activeTab === "profile" && (
            <form onSubmit={saveProfile} className="card space-y-6 p-6">
              <div className="flex flex-wrap items-center gap-5">
                <div className="relative shrink-0">
                  <Avatar name={user?.name} color={user?.avatarColor} src={user?.profilePictureUrl} size={96} />
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
                <div className="flex flex-wrap items-center gap-2.5">
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPicture} className="btn-primary btn-sm">
                    {uploadingPicture ? <LuLoader className="h-4 w-4 animate-spin" /> : <LuUpload className="h-4 w-4" />}
                    Upload New
                  </button>
                  <button
                    type="button"
                    onClick={handleDeletePicture}
                    disabled={deletingPicture || !user?.profilePictureUrl}
                    className="btn-outline btn-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingPicture ? <LuLoader className="h-4 w-4 animate-spin" /> : <LuTrash2 className="h-4 w-4" />}
                    Delete avatar
                  </button>
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-500">
                    <LuShieldCheck className="h-3 w-3" /> {ROLE_LABELS[role] || role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="First Name *" placeholder="First name" value={profile.firstName} onChange={setP("firstName")} required />
                <TextField label="Last Name *" placeholder="Last name" value={profile.lastName} onChange={setP("lastName")} required />
                <TextField label="Email" type="email" placeholder="example@gmail.com" value={profile.email} onChange={setP("email")} />

                <div>
                  <label className="field-label">Mobile Number *</label>
                  <div className="flex gap-2">
                    <Select
                      className="w-28 shrink-0"
                      value={profile.countryCode}
                      onChange={(v) => setProfile((s) => ({ ...s, countryCode: v }))}
                      options={COUNTRY_CODES}
                    />
                    <input
                      className="field-input flex-1"
                      placeholder="98200 11223"
                      value={profile.mobile}
                      onChange={(e) => setProfile((s) => ({ ...s, mobile: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">Gender</label>
                  <div className="flex gap-3">
                    {["Male", "Female"].map((g) => (
                      <label
                        key={g}
                        className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                          profile.gender === g ? "border-red-500 bg-red-50 text-red-600" : "border-line text-ink-700 hover:bg-surface-sunk"
                        }`}
                      >
                        <input
                          type="radio"
                          name="gender"
                          value={g}
                          checked={profile.gender === g}
                          onChange={setP("gender")}
                          className="h-3.5 w-3.5 text-red-500 focus:ring-red-500"
                        />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>
                <TextField label="ID" value={user?.id || ""} disabled className="opacity-70" />

                <TextField label="Tax Identification Number" placeholder="e.g. AAAAA0000A" value={profile.taxId} onChange={setP("taxId")} />
                <SelectField label="Tax Identification Country" value={profile.taxCountry} onChange={setP("taxCountry")} options={TAX_COUNTRIES} />
              </div>

              <TextareaField
                label="Residential Address"
                placeholder="Flat / street / area / city"
                value={profile.address}
                onChange={setP("address")}
              />

              <div className="flex justify-end border-t border-line pt-5">
                <button type="submit" className="btn-primary" disabled={savingProfile}>
                  {savingProfile ? <LuLoader className="h-4 w-4 animate-spin" /> : <LuSave className="h-4 w-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === "password" && (
            <form onSubmit={submitPasswordChange} className="card space-y-6 p-6">
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
              <div className="flex justify-end border-t border-line pt-5">
                <button type="submit" className="btn-primary" disabled={changingPassword}>
                  {changingPassword ? <LuLoader className="h-4 w-4 animate-spin" /> : <LuLock className="h-4 w-4" />}
                  Change password
                </button>
              </div>
            </form>
          )}

          {activeTab === "notifications" && (
            <div className="card space-y-2.5 p-6">
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
          )}

          {activeTab === "verification" && (
            <div className="card space-y-3 p-6">
              <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                <div className="flex items-center gap-2.5 text-sm font-medium text-ink-800">
                  <LuMail className="h-4 w-4 text-ink-500" /> Email
                </div>
                <span className={`badge ${user?.emailVerified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                  {user?.emailVerified ? "Verified" : "Not verified"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                <div className="flex items-center gap-2.5 text-sm font-medium text-ink-800">
                  <LuPhone className="h-4 w-4 text-ink-500" /> Mobile
                </div>
                <span className={`badge ${user?.mobileVerified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                  {user?.mobileVerified ? "Verified" : "Not verified"}
                </span>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-surface-sunk px-4 py-3 text-xs text-ink-500">
            Your account is scoped to <strong className="text-ink-700">{user?.agency}</strong>. Tenant data is isolated per role-based access rules.
          </div>
        </div>
      </div>
    </div>
  );
}
