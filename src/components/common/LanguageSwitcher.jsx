import { useEffect, useState } from "react";
import { useApiCall } from "../../hooks/useApi";
import { getLanguage, getLanguages, setLanguage, subscribe } from "../../lib/i18n";

// Module 30: interface language for the CRM. Hidden while only English is on.
// `account={false}` on the sign-in screens: nobody is signed in, so the choice
// is kept in this browser only.
export default function LanguageSwitcher({ account = true }) {
  const call = useApiCall();
  const [, tick] = useState(0);
  useEffect(() => subscribe(() => tick((n) => n + 1)), []);
  useEffect(() => {
    let hasLocal = false;
    try { hasLocal = !!localStorage.getItem("ps_lang"); } catch { hasLocal = true; }
    if (account && !hasLocal) call("/i18n/me").then((r) => r.data?.language && setLanguage(r.data.language)).catch(() => {});
  }, [call, account]);
  const languages = getLanguages();
  if (languages.length < 2) return null;
  const choose = async (code) => {
    const lang = await setLanguage(code);
    if (account) call("/i18n/me", { method: "PUT", body: { language: lang } }).catch(() => {});
  };
  return (
    <select data-no-translate aria-label="Language" value={getLanguage()} onChange={(e) => choose(e.target.value)} className="h-9 cursor-pointer rounded-lg border border-line bg-white px-2 text-sm font-semibold text-ink-800">
      {languages.map((l) => <option key={l.code} value={l.code}>{l.nativeName}</option>)}
    </select>
  );
}
