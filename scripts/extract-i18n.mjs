// Module 30: list the interface text of this app, for translation.
//
//   node scripts/extract-i18n.mjs            -> writes i18n-catalogue.json
//
// Upload the file in CRM -> Admin Panel -> Languages -> "Import catalogue"
// after a release that added or changed on-screen text. It reads the source
// without a parser (no dependencies): JSX text and quoted strings that look
// like something a person reads. A stray non-text string in the list is
// harmless - it just never appears on screen.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";

const APP = process.argv[2] || "crm";
const SRC = new URL("../src/", import.meta.url).pathname;
const KEYWORDS = new Set(["else", "catch", "finally", "return", "const", "let", "var", "of", "do", "try", "export", "default", "import", "from", "async", "await", "function", "new", "typeof", "null", "true", "false", "undefined"]);
const out = new Set();

const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : [".jsx", ".js"].includes(extname(p)) ? [p] : [];
});

const clean = (s) => s.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&rarr;/g, "→").replace(/&middot;/g, "·").replace(/&apos;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

// Does this look like words for a person rather than code, a class list or a path?
function human(raw, { fragment = false } = {}) {
  const s = clean(raw);
  if (s.length < 2 || s.length > 400 || !/[A-Za-z]{2}/.test(s)) return null;
  if (/[=;\[\]`|\\<>{}]|&&|\w\(|\)\s*[.)]|^\W*$/.test(s)) return null;
  if (/\?\s*\($|\($|^(catch|if|for|while|switch)\s*\(|\$$|^noopener/.test(s)) return null;
  if (/^(https?:|\/|\.\/|\.\.\/|#|@|data:|mailto:|tel:)/.test(s) || /\.(png|jpe?g|svg|webp|json|js|jsx|css|pdf|ico|woff2?)$/i.test(s)) return null;
  const words = s.split(" ");
  // Class lists, keys and identifiers: tokens with - _ : / digits glued to letters, or camelCase.
  const codey = words.filter((w) => /[a-z0-9][-_:/][a-z0-9[]|^[a-z]+[A-Z]|^[a-z-]+\d|^\w+\.\w+$/.test(w)).length;
  if (codey / words.length > 0.34) return null;
  if (words.length === 1) {
    if (KEYWORDS.has(s.toLowerCase())) return null;
    // One word: a label ("Search", "Budget") - capitalised; lone lowercase words only inside JSX.
    if (!/^[A-Z][a-z]+[.:!?…]?$|^[A-Z]{2,5}$/.test(s) && !(fragment && /^[a-z]{2,12}[.,:]?$/.test(s))) return null;
  } else if (!/^[A-Z0-9"'(₹+-]/.test(s) && !fragment) {
    // A phrase in quotes that does not start like a sentence: only plain lowercase words.
    if (!words.every((w) => /^[a-z']+[.,:!?]?$/.test(w))) return null;
  }
  if (words.every((w) => KEYWORDS.has(w.toLowerCase()))) return null;
  return s;
}

// `Showing ${n} of ${total}` -> "Showing {0} of {1}" (matched as a pattern at run time).
function template(body) {
  let i = 0;
  let depth = 0;
  let text = "";
  let n = 0;
  while (i < body.length) {
    if (depth === 0 && body[i] === "$" && body[i + 1] === "{") {
      text += `{${n++}}`;
      depth = 1;
      i += 2;
    } else if (depth > 0) {
      if (body[i] === "{") depth += 1;
      if (body[i] === "}") depth -= 1;
      i += 1;
    } else text += body[i++];
  }
  return n ? text : body;
}

for (const file of files(SRC)) {
  const src = readFileSync(file, "utf8").replace(/(^|[\s{;(,])\/\*[\s\S]*?\*\//g, "$1").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
  const add = (s, opt) => {
    const h = human(s, opt);
    if (h) out.add(h);
  };
  // Text between tags / expressions.
  for (const m of src.matchAll(/[>}]([^<>{}`]*[A-Za-z][^<>{}`]*)(?=[<{])/g)) if (!/["']\s*[,:)]|^\s*[,;)]/.test(m[1]) && !/\n\s*\n/.test(m[1])) add(m[1], { fragment: true });
  // Quoted strings.
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'/g)) add((m[1] ?? m[2]).replace(/\\(["'])/g, "$1"));
  for (const m of src.matchAll(/`((?:[^`\\]|\\.)*)`/g)) {
    const t = template(m[1]);
    if (!t.includes("\n")) add(t.replace(/\{(\d)\}/g, "\u0001$1\u0002"));
  }
}

const strings = [...out].map((s) => s.replace(/\u0001(\d)\u0002/g, "{$1}")).filter((s) => /[A-Za-z]{2}/.test(s.replace(/\{\d\}/g, ""))).sort((a, b) => a.localeCompare(b));
writeFileSync(new URL("../i18n-catalogue.json", import.meta.url), JSON.stringify({ app: APP, strings }, null, 1));
console.log(`${APP}: ${strings.length} strings -> i18n-catalogue.json`);
