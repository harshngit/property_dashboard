import TestimonialsTab from "./TestimonialsTab";
import { useState } from "react";
import { LuPlus, LuPencil, LuTrash2, LuExternalLink, LuX } from "react-icons/lu";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import Modal, { ConfirmDialog } from "../../components/common/Modal";
import { useToast } from "../../components/common/ToastProvider";
import { buildQuery, useApiCall, useApiQuery } from "../../hooks/useApi";
import { formatDate, titleCase } from "../../lib/format";

// Website CMS (Module 16): blog / guide articles and SEO city landing pages
// (/buy-property-in-<city> etc.). Published content shows on the website
// immediately; a new city page is pre-filled from the admin's templates.

const WEBSITE_URL = "https://propertyserch.com";
const STATUSES = ["draft", "published", "archived"];
const PAGE_TYPES = ["buy", "sell", "rent", "school_for_sale", "acquire_college", "university_campus_for_sale"];

function FaqEditor({ faqs, onChange }) {
  const update = (i, key, value) => onChange(faqs.map((f, idx) => (idx === i ? { ...f, [key]: value } : f)));
  return (
    <div className="space-y-2">
      <span className="field-label">FAQs</span>
      {faqs.map((f, i) => (
        <div key={i} className="grid gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1fr_1.4fr_auto]">
          <input className="field-input" placeholder="Question" value={f.question} onChange={(e) => update(i, "question", e.target.value)} />
          <input className="field-input" placeholder="Answer" value={f.answer} onChange={(e) => update(i, "answer", e.target.value)} />
          <button className="text-ink-400 hover:text-red-600" onClick={() => onChange(faqs.filter((_, idx) => idx !== i))} title="Remove">
            <LuX className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button className="btn-outline btn-sm" onClick={() => onChange([...faqs, { question: "", answer: "" }])}>
        <LuPlus className="h-3.5 w-3.5" /> Add FAQ
      </button>
    </div>
  );
}

function ArticleForm({ article, onSaved, onCancel }) {
  const call = useApiCall();
  const toast = useToast();
  const [f, setF] = useState({
    title: article?.title || "",
    slug: article?.slug || "",
    excerpt: article?.excerpt || "",
    category: article?.category || "",
    tags: (article?.tags || []).join(", "),
    authorName: article?.author_name || "",
    readingMinutes: article?.reading_minutes || "",
    coverImageUrl: article?.cover_image_url || "",
    contentHtml: article?.content_html || "",
    seoTitle: article?.seo_title || "",
    seoDescription: article?.seo_description || "",
    isFeatured: !!article?.is_featured,
    status: article?.status || "draft",
    faqs: article?.faqs || [],
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        ...f,
        slug: f.slug || undefined,
        tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
        readingMinutes: f.readingMinutes ? Number(f.readingMinutes) : undefined,
        faqs: f.faqs.filter((q) => q.question && q.answer),
      };
      await call(article ? `/content/manage/articles/${article.id}` : "/content/manage/articles", { method: article ? "PUT" : "POST", body });
      toast.push(article ? "Article saved." : "Article created.", "success");
      onSaved();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="field-label">Title *</span><input className="field-input" value={f.title} onChange={set("title")} /></label>
        <label><span className="field-label">Slug (auto if blank)</span><input className="field-input" value={f.slug} onChange={set("slug")} /></label>
        <label><span className="field-label">Category</span><input className="field-input" placeholder="e.g. Legal & Tax" value={f.category} onChange={set("category")} /></label>
        <label><span className="field-label">Author</span><input className="field-input" value={f.authorName} onChange={set("authorName")} /></label>
        <label><span className="field-label">Reading time (min)</span><input className="field-input" type="number" min="1" value={f.readingMinutes} onChange={set("readingMinutes")} /></label>
        <label className="sm:col-span-2"><span className="field-label">Cover image URL</span><input className="field-input" value={f.coverImageUrl} onChange={set("coverImageUrl")} /></label>
        <label className="sm:col-span-2"><span className="field-label">Excerpt</span><textarea className="field-input h-16 py-2" value={f.excerpt} onChange={set("excerpt")} /></label>
        <label className="sm:col-span-2"><span className="field-label">Content (HTML)</span><textarea className="field-input h-48 py-2 font-mono text-xs" value={f.contentHtml} onChange={set("contentHtml")} /></label>
        <label><span className="field-label">Tags (comma separated)</span><input className="field-input" value={f.tags} onChange={set("tags")} /></label>
        <label><span className="field-label">Status</span>
          <select className="field-select" value={f.status} onChange={set("status")}>{STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select>
        </label>
        <label><span className="field-label">SEO title</span><input className="field-input" value={f.seoTitle} onChange={set("seoTitle")} /></label>
        <label><span className="field-label">SEO description</span><input className="field-input" value={f.seoDescription} onChange={set("seoDescription")} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isFeatured} onChange={set("isFeatured")} /> Featured on the blog page</label>
      </div>
      <FaqEditor faqs={f.faqs} onChange={(faqs) => setF((x) => ({ ...x, faqs }))} />
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={saving || !f.title} onClick={save}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}

function CityPageForm({ page, onSaved, onCancel }) {
  const call = useApiCall();
  const toast = useToast();
  const [f, setF] = useState({
    city: "",
    pageType: page?.page_type || "buy",
    title: page?.title || "",
    heroHeading: page?.hero_heading || "",
    heroSubheading: page?.hero_subheading || "",
    contentHtml: page?.content_html || "",
    seoTitle: page?.seo_title || "",
    seoDescription: page?.seo_description || "",
    status: page?.status || "draft",
    faqs: page?.faqs || [],
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      if (page) {
        const { city, pageType, ...rest } = f;
        await call(`/content/manage/city-pages/${page.id}`, { method: "PUT", body: { ...rest, faqs: f.faqs.filter((q) => q.question && q.answer) } });
      } else {
        await call("/content/manage/city-pages", { method: "POST", body: { city: f.city, pageType: f.pageType, status: f.status } });
      }
      toast.push(page ? "City page saved." : "City page created from the template - edit it to refine.", "success");
      onSaved();
    } catch (err) {
      toast.push(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (!page) {
    return (
      <div className="space-y-3">
        <label><span className="field-label">City (as in master data)</span><input className="field-input" placeholder="e.g. Gurugram" value={f.city} onChange={set("city")} /></label>
        <label><span className="field-label">Page type</span>
          <select className="field-select" value={f.pageType} onChange={set("pageType")}>{PAGE_TYPES.map((t) => <option key={t} value={t}>{titleCase(t.replace(/_/g, " "))}</option>)}</select>
        </label>
        <label><span className="field-label">Status</span>
          <select className="field-select" value={f.status} onChange={set("status")}>{STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select>
        </label>
        <p className="text-xs text-ink-500">Title, headings, content and FAQs are filled from the page-type template (Admin → Settings → content.city_page_templates).</p>
        <div className="flex justify-end gap-2">
          <button className="btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" disabled={saving || !f.city} onClick={save}>{saving ? "Creating…" : "Create"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="field-label">Title</span><input className="field-input" value={f.title} onChange={set("title")} /></label>
        <label><span className="field-label">Hero heading</span><input className="field-input" value={f.heroHeading} onChange={set("heroHeading")} /></label>
        <label><span className="field-label">Hero subheading</span><input className="field-input" value={f.heroSubheading} onChange={set("heroSubheading")} /></label>
        <label className="sm:col-span-2"><span className="field-label">Content (HTML)</span><textarea className="field-input h-40 py-2 font-mono text-xs" value={f.contentHtml} onChange={set("contentHtml")} /></label>
        <label><span className="field-label">SEO title</span><input className="field-input" value={f.seoTitle} onChange={set("seoTitle")} /></label>
        <label><span className="field-label">SEO description</span><input className="field-input" value={f.seoDescription} onChange={set("seoDescription")} /></label>
        <label><span className="field-label">Status</span>
          <select className="field-select" value={f.status} onChange={set("status")}>{STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select>
        </label>
      </div>
      <FaqEditor faqs={f.faqs} onChange={(faqs) => setF((x) => ({ ...x, faqs }))} />
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-outline" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}

export default function ContentPage() {
  const call = useApiCall();
  const toast = useToast();
  const [tab, setTab] = useState("articles");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const articles = useApiQuery(tab === "articles" ? `/content/manage/articles${buildQuery({ status, search, limit: 100 })}` : null);
  const cityPages = useApiQuery(tab === "city" ? `/content/manage/city-pages${buildQuery({ status })}` : null);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const list = (d) => (Array.isArray(d) ? d : d?.items || []);
  const rows = tab === "articles" ? list(articles.data) : list(cityPages.data);
  const reload = tab === "articles" ? articles.reload : cityPages.reload;

  const openEdit = async (row) => {
    try {
      const res = await call(tab === "articles" ? `/content/manage/articles/${row.id}` : `/content/manage/city-pages/${row.id}`);
      setEditing(res.data);
    } catch (err) {
      toast.push(err.message, "error");
    }
  };

  const remove = async () => {
    try {
      await call(tab === "articles" ? `/content/manage/articles/${toDelete.id}` : `/content/manage/city-pages/${toDelete.id}`, { method: "DELETE" });
      toast.push("Deleted.", "success");
      reload();
    } catch (err) {
      toast.push(err.message, "error");
    }
    setToDelete(null);
  };

  const publicUrl = (row) => (tab === "articles" ? `${WEBSITE_URL}/news-guide/article/${row.slug}` : `${WEBSITE_URL}/${row.slug}`);

  return (
    <div>
      <PageHeader eyebrow="Website" title="Content" subtitle="Blog & guide articles and SEO city pages shown on the website." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-surface-muted p-1">
          {[["articles", "Articles"], ["city", "City pages"], ["testimonials", "Testimonials"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-md px-4 py-1.5 text-xs font-semibold ${tab === k ? "bg-white text-ink-950 shadow-sm" : "text-ink-500"}`}>{l}</button>
          ))}
        </div>
        {tab !== "testimonials" && (
          <>
            <select className="field-select h-9 w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
            </select>
            {tab === "articles" && <input className="field-input h-9 w-56" placeholder="Search title" value={search} onChange={(e) => setSearch(e.target.value)} />}
            <button className="btn-primary btn-sm ml-auto" onClick={() => setEditing({})}>
              <LuPlus className="h-4 w-4" /> {tab === "articles" ? "New article" : "New city page"}
            </button>
          </>
        )}
      </div>

      {tab === "testimonials" && <TestimonialsTab />}
      <div className={`card overflow-x-auto ${tab === "testimonials" ? "hidden" : ""}`}>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">{tab === "articles" ? "Category" : "Type"}</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2.5">
                  <p className="font-semibold text-ink-900">{r.title}{r.is_featured ? " ★" : ""}</p>
                  <p className="text-xs text-ink-400">/{r.slug}</p>
                </td>
                <td className="px-4 py-2.5 text-ink-600">{tab === "articles" ? r.category || "—" : titleCase((r.page_type || "").replace(/_/g, " "))}</td>
                <td className="px-4 py-2.5"><StatusBadge value={titleCase(r.status)} /></td>
                <td className="px-4 py-2.5 text-ink-500">{formatDate(r.updated_at || r.created_at)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  {r.status === "published" && (
                    <a href={publicUrl(r)} target="_blank" rel="noreferrer" className="mr-3 inline-block text-ink-500 hover:text-ink-900" title="View on website">
                      <LuExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button className="mr-3 text-ink-500 hover:text-ink-900" title="Edit" onClick={() => openEdit(r)}><LuPencil className="h-4 w-4" /></button>
                  <button className="text-red-500 hover:text-red-700" title="Delete" onClick={() => setToDelete(r)}><LuTrash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-500">Nothing here yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${tab === "articles" ? "article" : "city page"}` : tab === "articles" ? "New article" : "New city page"}
        maxWidth="max-w-3xl"
      >
        {editing && tab === "articles" && (
          <ArticleForm article={editing.id ? editing : null} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
        )}
        {editing && tab === "city" && (
          <CityPageForm page={editing.id ? editing : null} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
        )}
      </Modal>
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} title="Delete?" description={toDelete?.title} />
    </div>
  );
}
