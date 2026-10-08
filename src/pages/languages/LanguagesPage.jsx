import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { LuPlus, LuDownload, LuUpload, LuSparkles } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/common/Modal";
import { InlineSpinner } from "../../components/common/PageLoader";
import { TextField } from "../../components/common/FormField";
import { useToast } from "../../components/common/ToastProvider";
import useAuth from "../../hooks/useAuth";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { API_BASE_URL } from "../../config/api";

// Module 30 - interface languages.
// English is the source. To add a regional language: add / pick it, download
// the translation file, fill it in, upload it, switch the language on. Text
// with no translation shows in English, so a language can go live in parts.

const ADMIN = ["admin", "super_admin"];
const APP_LABEL = { website: "Website", crm: "CRM" };

function Strings({ language, admin, aiAvailable, onChanged }) {
  const call = useApiCall();
  const toast = useToast();
  const token = useSelector((s) => s.auth.accessToken);
  const [app, setApp] = useState("website");
  const [filter, setFilter] = useState("missing");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const { data, loading, reload } = useApiQuery(`/i18n/manage/strings${buildQuery({ language: language.code, app, filter, search, page })}`);
  const changed = () => { reload(); onChanged(); };
  const save = async (source, value) => {
    try {
      await call("/i18n/manage/strings", { method: "PUT", body: { language: language.code, app, entries: { [source]: value } } });
      changed();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const download = async (missing) => {
    try {
      const res = await fetch(`${API_BASE_URL}/i18n/manage/export${buildQuery({ language: language.code, app, missing: missing ? "true" : undefined })}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Could not download the file");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(await res.blob());
      a.download = `${app}.${language.code}${missing ? ".missing" : ""}.json`;
      a.click();
    } catch (err) {
      toast.push(err.message, "error");
    }
  };
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const json = JSON.parse(await file.text());
      // A catalogue from the extract script ({ app, strings: [...] }) or a translation file ({ "English": "translation" }).
      if (Array.isArray(json.strings)) {
        const r = await call("/i18n/manage/catalogue", { method: "POST", body: { app: json.app || app, strings: json.strings } });
        toast.push(`Catalogue updated: ${r.data.added} new strings to translate.`, "success");
      } else {
        const entries = Object.fromEntries(Object.entries(json).filter(([, v]) => typeof v === "string" && v.trim()));
        if (!Object.keys(entries).length) throw new Error("The file has no translations filled in");
        const r = await call("/i18n/manage/strings", { method: "PUT", body: { language: language.code, app, entries } });
        toast.push(`${r.data.saved} translations saved for ${language.name}.`, "success");
      }
      changed();
    } catch (err) {
      toast.push(err instanceof SyntaxError ? "That is not a valid JSON file" : err.message, "error");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const draft = async () => {
    setBusy(true);
    try {
      const r = await call("/i18n/manage/ai-draft", { method: "POST", body: { language: language.code, app } });
      toast.push(`${r.data.drafted} drafted, ${r.data.remaining} still missing. Drafts are marked for review.`, "success");
      changed();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const pages = data ? Math.max(Math.ceil(data.total / data.limit), 1) : 1;
  return (
    <div className="space-y-3" data-no-translate>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-surface-muted p-1">
          {Object.entries(APP_LABEL).map(([k, l]) => <button key={k} onClick={() => { setApp(k); setPage(1); }} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${app === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>)}
        </div>
        <select id="i18n-filter" className="field-select h-9 w-44" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
          <option value="missing">Not translated</option><option value="translated">Translated</option><option value="machine">AI drafts to review</option><option value="all">All text</option>
        </select>
        <input id="i18n-search" className="field-input h-9 w-56" placeholder="Search text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <div className="ml-auto flex flex-wrap gap-2">
          <button className="btn-outline btn-sm" onClick={() => download(false)}><LuDownload className="h-4 w-4" /> Download file</button>
          <button className="btn-outline btn-sm" onClick={() => download(true)}><LuDownload className="h-4 w-4" /> Only missing</button>
          {admin && <label className="btn-outline btn-sm cursor-pointer"><LuUpload className="h-4 w-4" /> {busy ? "Working…" : "Upload file"}<input ref={fileRef} type="file" accept="application/json,.json" className="hidden" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} /></label>}
          {admin && aiAvailable && <button className="btn-outline btn-sm" disabled={busy} onClick={draft}><LuSparkles className="h-4 w-4" /> AI draft next 80</button>}
        </div>
      </div>
      {loading && !data ? <div className="flex justify-center py-12 text-ink-500"><InlineSpinner className="h-6 w-6" /></div> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className="w-1/2 px-4 py-3">English</th><th className="px-4 py-3">{language.name} ({language.nativeName})</th></tr></thead>
            <tbody className="divide-y divide-line">
              {(data?.items || []).map((s) => (
                <tr key={s.hash}>
                  <td className="px-4 py-2 align-top text-ink-800">{s.source}</td>
                  <td className="px-4 py-2">
                    {admin ? <input className={`field-input h-9 ${s.isMachine ? "border-amber-300 bg-amber-50" : ""}`} defaultValue={s.value || ""} placeholder="Type the translation" onBlur={(e) => e.target.value.trim() !== (s.value || "") && save(s.source, e.target.value.trim())} /> : s.value || <span className="text-ink-400">—</span>}
                    {s.isMachine && <p className="mt-0.5 text-[11px] text-amber-700">AI draft - edit to confirm</p>}
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan={2} className="px-4 py-10 text-center text-ink-500">{filter === "missing" ? "Everything here is translated." : "Nothing matches."}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {data && data.total > data.limit && (
        <div className="flex items-center justify-between text-xs text-ink-600">
          <span>{data.total.toLocaleString("en-IN")} strings</span>
          <span className="flex items-center gap-2"><button className="btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>Page {page} of {pages}<button className="btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></span>
        </div>
      )}
      <p className="text-xs text-ink-500">Keep any {"{0}"}, {"{1}"} markers in the translation - they are replaced by a number or a name. Changes reach visitors within about five minutes. After a release that adds new screens, upload the i18n-catalogue.json produced by the extract script here to list the new text.</p>
    </div>
  );
}

export default function LanguagesPage() {
  const { role } = useAuth();
  const admin = ADMIN.includes(role);
  const call = useApiCall();
  const toast = useToast();
  const { data, loading, reload } = useApiQuery("/i18n/manage/overview");
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const saveLanguage = async (body, msg) => {
    setBusy(true);
    try {
      await call("/i18n/manage/languages", { method: "POST", body });
      toast.push(msg, "success");
      setForm(null);
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  if (loading && !data) return <div className="flex justify-center py-24 text-ink-500"><InlineSpinner className="h-6 w-6" /></div>;
  const current = open && data?.languages.find((l) => l.code === open);
  return (
    <div className="space-y-5">
      <PageHeader title="Languages" />
      <div className="flex items-center gap-3">
        <p className="text-sm text-ink-600">English is the source language. A language that is switched on appears in the language menu on the website and in the CRM; text that is not translated yet shows in English.</p>
        {admin && <button className="btn-primary btn-sm ml-auto shrink-0" onClick={() => setForm({ code: "", name: "", nativeName: "" })}><LuPlus className="h-4 w-4" /> Add language</button>}
      </div>
      <div className="card overflow-x-auto" data-no-translate>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500"><tr><th className="px-4 py-3">Language</th>{(data?.apps || []).map((a) => <th key={a.app} className="px-4 py-3">{APP_LABEL[a.app]} ({a.strings.toLocaleString("en-IN")} strings)</th>)}<th className="px-4 py-3">Live</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-line">
            {(data?.languages || []).map((l) => (
              <tr key={l.code} className={open === l.code ? "bg-red-50" : ""}>
                <td className="px-4 py-3"><p className="font-semibold text-ink-900">{l.name} <span className="font-normal text-ink-500">{l.nativeName}</span></p><p className="text-xs text-ink-500">{l.code}{l.isSource ? " · source language" : ""}</p></td>
                {l.coverage.map((c) => (
                  <td key={c.app} className="px-4 py-3">
                    <div className="flex items-center gap-2"><div className="h-2 w-28 rounded-full bg-surface-muted"><div className={`h-2 rounded-full ${c.percent >= 90 ? "bg-emerald-500" : c.percent >= 40 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${c.percent}%` }} /></div><span className="text-xs font-semibold">{c.percent}%</span></div>
                    {!l.isSource && <p className="mt-0.5 text-[11px] text-ink-500">{c.translated.toLocaleString("en-IN")} of {c.total.toLocaleString("en-IN")}{c.machine ? ` · ${c.machine} AI drafts` : ""}</p>}
                  </td>
                ))}
                <td className="px-4 py-3"><input type="checkbox" aria-label={`${l.name} live`} checked={l.isActive} disabled={!admin || l.isSource || busy} onChange={(e) => saveLanguage({ code: l.code, isActive: e.target.checked }, e.target.checked ? `${l.name} is now offered to visitors.` : `${l.name} is switched off.`)} /></td>
                <td className="px-4 py-3 text-right">{!l.isSource && <button className="text-xs font-semibold text-red-600 hover:underline" onClick={() => setOpen(open === l.code ? null : l.code)}>{open === l.code ? "Close" : "Translations"}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {current && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-ink-900" data-no-translate>Translations - {current.name}</h3>
          <Strings key={current.code} language={current} admin={admin} aiAvailable={data.aiAvailable} onChanged={reload} />
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title="Add language" description="Add it, upload its translations, then switch it on.">
        {form && (
          <div className="space-y-3">
            <TextField label="Language code (e.g. as for Assamese, ur for Urdu)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })} />
            <TextField label="Name in English" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Name in its own script (shown in the language menu)" value={form.nativeName} onChange={(e) => setForm({ ...form, nativeName: e.target.value })} />
            <p className="text-xs text-ink-500">Languages written left to right work straight away. A right-to-left script (such as Urdu) needs a one-time layout change by the developer.</p>
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" disabled={busy || form.code.length < 2 || !form.name.trim() || !form.nativeName.trim()} onClick={() => saveLanguage(form, "Language added - upload its translations, then switch it on.")}>Add</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
