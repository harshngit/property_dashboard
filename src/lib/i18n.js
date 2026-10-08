// Module 30 - interface languages.
//
// English is the source language. A language bundle from /api/i18n maps
// English interface text to its translation; this file swaps that text in
// the page (text and placeholder / title / aria-label / alt attributes) and
// keeps doing so as the page changes. Anything not in the bundle - listing
// titles, names, whatever a user typed - is left exactly as it is, and a
// missing translation simply shows in English.
//
// The same file is used by the website and the CRM (the app name differs).

const ATTRS = ["placeholder", "title", "aria-label", "alt"];
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "SVG"]);
const STORE_KEY = "ps_lang";

const state = { app: "website", api: "", lang: "en", strings: new Map(), patterns: [], languages: [{ code: "en", name: "English", nativeName: "English" }], observer: null, listeners: new Set() };
// What we last wrote into a node and what was there before, so a change made
// by the app (new text) can be told apart from our own.
const original = new WeakMap();
const applied = new WeakMap();
const attrOriginal = new WeakMap();

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

function translate(text) {
  if (!text || !state.strings.size) return null;
  const core = text.replace(/\s+/g, " ").trim();
  if (core.length < 2 || !/[A-Za-z]/.test(core)) return null;
  let hit = state.strings.get(core);
  // "Showing {0} of {1}" style entries: the values stay, the words around them change.
  if (!hit && state.patterns.length && core.length <= 300) {
    for (const p of state.patterns) {
      const m = p.re.exec(core);
      if (m) {
        hit = p.value.replace(/\{(\d)\}/g, (_, i) => m[Number(i) + 1] ?? "");
        break;
      }
    }
  }
  if (!hit) return null;
  return text.match(/^\s*/)[0] + hit + text.match(/\s*$/)[0];
}

function patternsOf(strings) {
  const out = [];
  for (const [source, value] of strings) {
    if (!/\{\d\}/.test(source)) continue;
    const order = [...source.matchAll(/\{(\d)\}/g)].map((m) => Number(m[1]));
    const body = source.split(/\{\d\}/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("(.+?)");
    // Capture groups come in the order the placeholders appear; map them back to their numbers.
    const remap = value.replace(/\{(\d)\}/g, (_, i) => `{${order.indexOf(Number(i))}}`);
    out.push({ re: new RegExp(`^${body}$`), value: remap });
  }
  return out;
}

function skipped(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (SKIP.has(n.nodeName.toUpperCase()) || n.isContentEditable || n.hasAttribute?.("data-no-translate")) return true;
  }
  return false;
}

function applyText(node) {
  const now = node.nodeValue;
  // The app wrote new text: that is the new English source.
  const source = applied.get(node) === now && original.has(node) ? original.get(node) : now;
  original.set(node, source);
  const next = (state.lang !== "en" && node.parentElement && !skipped(node.parentElement) && translate(source)) || source;
  applied.set(node, next);
  if (next !== now) node.nodeValue = next;
}

function applyAttrs(el) {
  if (skipped(el)) return;
  let saved = attrOriginal.get(el);
  for (const attr of ATTRS) {
    if (!el.hasAttribute(attr)) continue;
    const now = el.getAttribute(attr);
    if (!saved) attrOriginal.set(el, (saved = {}));
    const rec = saved[attr];
    const source = rec && rec.applied === now ? rec.source : now;
    const next = (state.lang !== "en" && translate(source)) || source;
    saved[attr] = { source, applied: next };
    if (next !== now) el.setAttribute(attr, next);
  }
}

function walk(root) {
  if (!root) return;
  if (root.nodeType === 3) return applyText(root);
  if (root.nodeType !== 1 || SKIP.has(root.nodeName.toUpperCase())) return;
  applyAttrs(root);
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = it.nextNode(); n; n = it.nextNode()) (n.nodeType === 3 ? applyText : applyAttrs)(n);
}

function observe() {
  if (state.observer || typeof MutationObserver === "undefined") return;
  state.observer = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "characterData") applyText(m.target);
      else if (m.type === "attributes") applyAttrs(m.target);
      else m.addedNodes.forEach(walk);
    }
  });
  state.observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

async function loadBundle(code) {
  if (code === "en") return new Map();
  const cacheKey = `ps_i18n_${state.app}_${code}`;
  let cached = null;
  try { cached = JSON.parse(read(cacheKey) || "null"); } catch { cached = null; }
  const fresh = fetch(`${state.api}/i18n/bundle/${code}?app=${state.app}`)
    .then((r) => r.json())
    .then((j) => {
      const strings = j?.data?.strings || {};
      write(cacheKey, JSON.stringify(strings));
      return strings;
    });
  // Show the last known bundle at once and refresh it in the background.
  if (cached) {
    fresh.then((strings) => {
      if (state.lang === code && JSON.stringify(strings) !== JSON.stringify(cached)) {
        state.strings = new Map(Object.entries(strings));
        state.patterns = patternsOf(state.strings);
        walk(document.body);
      }
    }).catch(() => {});
    return new Map(Object.entries(cached));
  }
  return new Map(Object.entries(await fresh));
}

export const getLanguage = () => state.lang;
export const getLanguages = () => state.languages;
export const subscribe = (fn) => { state.listeners.add(fn); return () => state.listeners.delete(fn); };
const notify = () => state.listeners.forEach((fn) => fn(state.lang));

export async function setLanguage(code, { remember = true } = {}) {
  const lang = state.languages.some((l) => l.code === code) ? code : "en";
  let strings;
  try {
    strings = await loadBundle(lang);
  } catch {
    return state.lang; // offline with nothing cached: stay as we are
  }
  state.lang = lang;
  state.strings = strings;
  state.patterns = patternsOf(strings);
  if (remember) write(STORE_KEY, lang);
  document.documentElement.lang = lang;
  walk(document.body);
  observe();
  notify();
  return lang;
}

// Start: ?lang= in the address, else the saved choice, else English. The browser's
// own language is not used - a visitor gets another language only by choosing it.
export async function initI18n({ app, apiBase }) {
  state.app = app;
  state.api = apiBase;
  const fromUrl = new URLSearchParams(window.location.search).get("lang");
  const saved = fromUrl || read(STORE_KEY);
  // Apply a saved language straight from its cached bundle, before the network.
  if (saved && saved !== "en" && read(`ps_i18n_${app}_${saved}`)) {
    state.languages = [...state.languages, { code: saved, name: saved, nativeName: saved }];
    setLanguage(saved, { remember: false });
  }
  try {
    const res = await fetch(`${apiBase}/i18n/languages`).then((r) => r.json());
    if (Array.isArray(res?.data) && res.data.length) state.languages = res.data;
  } catch {
    /* keep English only */
  }
  const want = saved || "en";
  await setLanguage(want, { remember: !!fromUrl });
  notify();
}
