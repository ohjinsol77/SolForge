const {
  attrEscape,
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

const ATTRS = ["placeholder", "alt", "aria-label", "title", "content"];
const SKIP_TEXT_PARENTS = new Set(["script", "style", "svg", "title", "option", "textarea"]);
const SELF_CLOSING = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const existingKo = readJson("src/locales/ko.json", {});
const ko = { ...existingKo };

function shouldTranslateText(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return false;
  if (/^[→←↑↓•·|/\\()[\]{}:;,.!?+\-*=#%&$@~^_]+$/.test(clean)) return false;
  if (/^[0-9.,:%+\-\/ ]+$/.test(clean)) return false;
  return /[가-힣A-Za-z0-9]/.test(clean);
}

function record(key, value) {
  const text = decodeEntities(value).replace(/\s+/g, " ").trim();
  if (!text) return;
  ko[key] = text;
}

function annotateHead(html, pageKey, nextKey) {
  html = html.replace(/<title(?![^>]*data-i18n)([^>]*)>([\s\S]*?)<\/title>/i, (match, attrs, value) => {
    const key = `${pageKey}.meta.title`;
    record(key, value);
    return `<title data-i18n="${key}"${attrs}>${value}</title>`;
  });

  html = html.replace(/<meta\b([^>]*\bname=["']description["'][^>]*)>/i, (tag, attrs) => {
    if (/\bdata-i18n-attrs=/.test(tag)) return tag;
    const parsed = parseAttributes(attrs);
    if (!parsed.content) return tag;
    const key = `${pageKey}.meta.description`;
    record(key, parsed.content);
    return setAttribute(tag, "data-i18n-attrs", `content:${key}`);
  });

  return { html, nextKey };
}

function annotateTag(tag, pageKey, nextKey) {
  if (/^<\//.test(tag) || /^<!/.test(tag)) return { tag, nextKey };
  const nameMatch = tag.match(/^<\s*([a-zA-Z0-9:-]+)/);
  if (!nameMatch) return { tag, nextKey };
  const tagName = nameMatch[1].toLowerCase();
  const attrs = parseAttributes(tag);
  let output = tag;

  if (tagName === "option" && !attrs["data-i18n"]) {
    const optionMatch = output.match(/^(<option\b[^>]*>)([\s\S]*?)(<\/option>)$/i);
    if (optionMatch && shouldTranslateText(optionMatch[2])) {
      const key = `${pageKey}.text.${String(nextKey++).padStart(4, "0")}`;
      record(key, optionMatch[2]);
      output = setAttribute(optionMatch[1], "data-i18n", key) + optionMatch[2] + optionMatch[3];
    }
  }

  const attrPairs = [];
  for (const attr of ATTRS) {
    if (!(attr in attrs)) continue;
    if (attr === "content" && tagName !== "meta") continue;
    if (attr === "title" && tagName === "title") continue;
    const value = attrs[attr];
    if (!shouldTranslateText(value)) continue;
    if (tagName === "meta" && attrs.name !== "description" && attrs.property !== "og:title" && attrs.property !== "og:description") continue;
    const key = attr === "content" && attrs.name === "description"
      ? `${pageKey}.meta.description`
      : `${pageKey}.attr.${attr.replace(/[^a-z0-9]+/gi, "-")}.${String(nextKey++).padStart(4, "0")}`;
    record(key, value);
    attrPairs.push(`${attr}:${key}`);
  }

  if (attrPairs.length && !/\bdata-i18n-attrs=/.test(output)) {
    output = setAttribute(output, "data-i18n-attrs", attrPairs.join(";"));
  }

  return { tag: output, nextKey };
}

function annotateBodyText(html, pageKey, nextKey) {
  let output = "";
  const stack = [];
  const tokens = html.split(/(<!--[\s\S]*?-->|<!doctype[\s\S]*?>|<[^>]+>)/gi);

  for (const token of tokens) {
    if (!token) continue;
    if (token.startsWith("<")) {
      const close = token.match(/^<\/\s*([a-zA-Z0-9:-]+)/);
      if (close) {
        const name = close[1].toLowerCase();
        while (stack.length && stack[stack.length - 1] !== name) stack.pop();
        if (stack[stack.length - 1] === name) stack.pop();
        output += token;
        continue;
      }

      const annotated = annotateTag(token, pageKey, nextKey);
      output += annotated.tag;
      nextKey = annotated.nextKey;

      const open = token.match(/^<\s*([a-zA-Z0-9:-]+)/);
      if (open) {
        const name = open[1].toLowerCase();
        if (!SELF_CLOSING.has(name) && !/\/\s*>$/.test(token) && !/^<!/.test(token)) stack.push(name);
      }
      continue;
    }

    const parent = stack[stack.length - 1] || "";
    if (SKIP_TEXT_PARENTS.has(parent) || !shouldTranslateText(token)) {
      output += token;
      continue;
    }

    const match = token.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const key = `${pageKey}.text.${String(nextKey++).padStart(4, "0")}`;
    record(key, match[2]);
    output += `${match[1]}<span data-i18n="${key}">${match[2]}</span>${match[3]}`;
  }

  return { html: output, nextKey };
}

let fileCount = 0;
for (const file of sourceFiles()) {
  let html = readText(file);
  if (/\bdata-i18n=|\bdata-i18n-attrs=/.test(html)) {
    // Keep the script idempotent. Existing keys are handled by the build script.
    continue;
  }

  const pageKey = toPageKey(file);
  let nextKey = 1;
  const head = annotateHead(html, pageKey, nextKey);
  html = head.html;
  nextKey = head.nextKey;
  const body = annotateBodyText(html, pageKey, nextKey);
  html = body.html;

  writeText(file, html);
  fileCount += 1;
}

writeJson("src/locales/ko.json", Object.fromEntries(Object.entries(ko).sort(([a], [b]) => a.localeCompare(b))));
console.log(`Annotated ${fileCount} HTML files and wrote src/locales/ko.json`);
