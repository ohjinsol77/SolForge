const {
  decodeEntities,
  parseAttributes,
  readJson,
  readText,
  setAttribute,
  sourceFiles,
  toPageKey,
  writeJson,
  writeText
} = require("./i18n-utils");

const ko = readJson("src/locales/ko.json", {});

function shouldTranslate(value) {
  const text = decodeEntities(value).replace(/\s+/g, " ").trim();
  if (!text) return false;
  if (!/[가-힣]/.test(text)) return false;
  return true;
}

function record(key, value) {
  ko[key] = decodeEntities(value).replace(/\s+/g, " ").trim();
}

function nextIndex(pageKey) {
  let max = 0;
  for (const key of Object.keys(ko)) {
    if (!key.startsWith(`${pageKey}.`)) continue;
    const match = key.match(/\.(\d{4})$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

let changed = 0;
for (const file of sourceFiles()) {
  const pageKey = toPageKey(file);
  let index = nextIndex(pageKey);
  let html = readText(file);
  const original = html;

  html = html.replace(/<option\b(?![^>]*\bdata-i18n=)([^>]*)>([\s\S]*?)<\/option>/gi, (match, attrs, text) => {
    if (!shouldTranslate(text)) return match;
    const key = `${pageKey}.text.${String(index++).padStart(4, "0")}`;
    record(key, text);
    return `${setAttribute(`<option${attrs}>`, "data-i18n", key)}${text}</option>`;
  });

  html = html.replace(/<textarea\b(?![^>]*\bdata-i18n=)([^>]*)>([\s\S]*?)<\/textarea>/gi, (match, attrs, text) => {
    if (!shouldTranslate(text)) return match;
    const key = `${pageKey}.text.${String(index++).padStart(4, "0")}`;
    record(key, text);
    return `${setAttribute(`<textarea${attrs}>`, "data-i18n", key)}${text}</textarea>`;
  });

  html = html.replace(/<([a-zA-Z0-9:-]+)\b([^>]*\bvalue=(?:"[^"]*"|'[^']*')[^>]*)>/g, (match, tag, attrs) => {
    if (/\bdata-i18n-attrs=/.test(match)) return match;
    const parsed = parseAttributes(attrs);
    if (!shouldTranslate(parsed.value || "")) return match;
    const key = `${pageKey}.attr.value.${String(index++).padStart(4, "0")}`;
    record(key, parsed.value);
    return setAttribute(match, "data-i18n-attrs", `value:${key}`);
  });

  if (html !== original) {
    writeText(file, html);
    changed += 1;
  }
}

writeJson("src/locales/ko.json", Object.fromEntries(Object.entries(ko).sort(([a], [b]) => a.localeCompare(b))));
console.log(`Filled i18n gaps in ${changed} files`);
