const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const {
  DEFAULT_LANG,
  LANGS,
  ROOT,
  SITE_URL,
  attrEscape,
  htmlEscape,
  localizedPath,
  localizedUrl,
  parseAttributes,
  readJson,
  readText,
  removeAttribute,
  setAttribute,
  sourceFiles,
  writeText
} = require("./i18n-utils");
const { translate } = require("./generate-en-locale");

const DIST = path.join(ROOT, "dist");
const locales = Object.fromEntries(LANGS.map((lang) => [lang, readJson(`src/locales/${lang}.json`, {})]));
const koToEn = new Map(Object.entries(locales.ko || {}).map(([key, value]) => [value, locales.en?.[key] || value]));

function cleanDist() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}

function walkFiles(dir, predicate, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(file, predicate, files);
    else if (!predicate || predicate(file)) files.push(file);
  }
  return files;
}

function t(lang, key, fallback = "") {
  return locales[lang]?.[key] ?? locales[DEFAULT_LANG]?.[key] ?? fallback;
}

function translateLoose(lang, value) {
  if (lang !== "en" || !/[가-힣]/.test(value)) return value;
  if (koToEn.has(value)) return koToEn.get(value);
  const translatedQuery = value.replace(/([?&]q=)([^&#]*)/g, (match, prefix, raw) => {
    try {
      const decoded = decodeURIComponent(raw.replace(/\+/g, " "));
      return `${prefix}${encodeURIComponent(translateLoose(lang, decoded)).replace(/%20/g, "+")}`;
    } catch (_error) {
      return match;
    }
  });
  if (translatedQuery !== value) return translatedQuery;
  if (value.includes(",")) {
    return value.split(",").map((part) => translateLoose(lang, part.trim())).filter(Boolean).join(", ");
  }
  return value.replace(/[가-힣·]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function translateTaggedContent(html, lang) {
  return html.replace(/<([a-zA-Z0-9:-]+)\b([^>]*\bdata-i18n="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g, (match, tag, attrs, key, content) => {
    const value = t(lang, key, content);
    const translated = tag.toLowerCase() === "title" ? htmlEscape(value) : htmlEscape(value);
    return `<${tag}${attrs}>${translated}</${tag}>`;
  });
}

function translateAttributes(html, lang) {
  return html.replace(/<([a-zA-Z0-9:-]+)\b([^>]*\bdata-i18n-attrs="([^"]+)"[^>]*)>/g, (match, tag, attrs, mapping) => {
    let output = `<${tag}${attrs}>`;
    for (const pair of mapping.split(";")) {
      const [attr, key] = pair.split(":");
      if (!attr || !key) continue;
      output = setAttribute(output, attr.trim(), t(lang, key.trim(), parseAttributes(output)[attr.trim()] || ""));
    }
    return output;
  });
}

function pageFromHref(currentFile, href) {
  const hashIndex = href.indexOf("#");
  const queryIndex = href.indexOf("?");
  const splitAt = [hashIndex, queryIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? href.length;
  const pathname = href.slice(0, splitAt);
  const suffix = href.slice(splitAt);
  if (!pathname || pathname.startsWith("#")) return null;
  const dirname = path.posix.dirname(currentFile);
  const resolved = path.posix.normalize(path.posix.join(dirname === "." ? "" : dirname, pathname));
  if (!resolved.endsWith(".html")) return null;
  return { file: resolved, suffix };
}

function rewriteUrl(value, lang, currentFile) {
  if (!value || /^(?:https?:)?\/\//i.test(value) || /^(?:mailto|tel|javascript):/i.test(value) || value.startsWith("data:")) return value;
  if (value.startsWith("#")) return value;
  if (/^(?:\.\.\/)*assets\//.test(value) || value.startsWith("/assets/")) {
    return `/${value.replace(/^(?:\.\.\/)*/, "").replace(/^\//, "")}`;
  }
  if (value.startsWith("/ko/") || value.startsWith("/en/")) {
    return value.replace(/^\/(?:ko|en)\//, `/${lang}/`);
  }
  const page = pageFromHref(currentFile, value);
  if (page) {
    return `${localizedPath(lang, page.file)}${translateLoose(lang, page.suffix)}`;
  }
  return value;
}

function rewriteLinks(html, lang, currentFile) {
  return html.replace(/\s(href|src|action)="([^"]*)"/g, (match, attr, value) => {
    return ` ${attr}="${attrEscape(rewriteUrl(value, lang, currentFile))}"`;
  });
}

function removeExistingSeo(html) {
  return html
    .replace(/\n\s*<link rel="canonical"[^>]*>/i, "")
    .replace(/\n\s*<link rel="alternate" hreflang="[^"]+"[^>]*>/gi, "");
}

function injectSeo(html, lang, file) {
  const canonical = `<link rel="canonical" href="${localizedUrl(lang, file)}">`;
  const alternates = [
    `<link rel="alternate" hreflang="ko" href="${localizedUrl("ko", file)}">`,
    `<link rel="alternate" hreflang="en" href="${localizedUrl("en", file)}">`,
    `<link rel="alternate" hreflang="x-default" href="${localizedUrl(DEFAULT_LANG, file)}">`
  ].join("\n    ");
  return html.replace(/<\/head>/i, `    ${canonical}\n    ${alternates}\n  </head>`);
}

function updateLanguageToggle(html, lang, file) {
  const other = lang === "ko" ? "en" : "ko";
  const label = lang === "ko" ? "Switch to English" : "한국어로 변경";
  const flag = lang === "ko" ? "🇺🇸" : "🇰🇷";
  return html.replace(/<a\b([^>]*\bdata-language-toggle\b[^>]*)>[\s\S]*?<\/a>/g, (match, attrs) => {
    let open = `<a${attrs}>`;
    open = setAttribute(open, "href", localizedPath(other, file));
    open = setAttribute(open, "aria-label", label);
    return `${open}${flag}</a>`;
  });
}

function localizeLooseAttributes(html, lang) {
  if (lang !== "en") return html;
  return html
    .replace(/(<meta\b[^>]*\bname="keywords"[^>]*\bcontent=")([^"]*)(")/gi, (match, before, value, after) => `${before}${attrEscape(translateLoose(lang, value))}${after}`)
    .replace(/(\sdata-keywords=")([^"]*)(")/g, (match, before, value, after) => `${before}${attrEscape(translateLoose(lang, value))}${after}`);
}

function localizeJsonLd(html, lang) {
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi, (match, jsonText) => {
    try {
      const data = JSON.parse(jsonText.trim());
      data.url = `${SITE_URL}/${lang}/`;
      if (data.description) data.description = lang === "ko" ? data.description : "Developer tools and life calculators that run directly in your browser.";
      if (data.potentialAction?.target) data.potentialAction.target = `${SITE_URL}/${lang}/?q={search_term_string}`;
      return `<script type="application/ld+json">\n      ${JSON.stringify(data, null, 8).replace(/\n/g, "\n      ")}\n    </script>`;
    } catch (_error) {
      return match;
    }
  });
}

function injectLocaleScript(html, lang) {
  const payload = JSON.stringify({
    lang,
    switchTo: lang === "ko" ? "en" : "ko",
    switchLabel: lang === "ko" ? "Switch to English" : "한국어로 변경"
  }).replace(/</g, "\\u003c");
  return html.replace(/<\/head>/i, `    <script>window.SF_I18N=${payload};</script>\n  </head>`);
}

function injectDynamicI18nScript(html) {
  return html.replace(/<\/head>/i, `    <script src="/assets/js/i18n-dynamic.js"></script>\n  </head>`);
}

function parseJs(source) {
  const options = { ecmaVersion: "latest", allowHashBang: true };
  try {
    return acorn.parse(source, { ...options, sourceType: "module" });
  } catch (_moduleError) {
    return acorn.parse(source, { ...options, sourceType: "script" });
  }
}

function isStaticPropertyKey(node, parent) {
  return parent
    && (
      (parent.type === "Property" && parent.key === node && !parent.computed)
      || (parent.type === "PropertyDefinition" && parent.key === node && !parent.computed)
      || (parent.type === "MethodDefinition" && parent.key === node && !parent.computed)
    );
}

function walkAst(node, parent, visitor) {
  if (!node || typeof node.type !== "string") return;
  visitor(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (key === "parent") continue;
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child.type === "string") walkAst(child, node, visitor);
      }
    } else if (value && typeof value.type === "string") {
      walkAst(value, node, visitor);
    }
  }
}

function collectStringNodes(source) {
  const ast = parseJs(source);
  const nodes = [];
  walkAst(ast, null, (node, parent) => {
    if (node.type === "Literal" && typeof node.value === "string") {
      if (isStaticPropertyKey(node, parent)) return;
      if (!/[가-힣]/.test(node.value)) return;
      nodes.push({
        start: node.start,
        end: node.end,
        literal: source.slice(node.start, node.end),
        values: [node.value]
      });
      return;
    }
    if (node.type === "TemplateLiteral") {
      if (isStaticPropertyKey(node, parent)) return;
      const values = node.quasis.map((quasi) => quasi.value.cooked || quasi.value.raw || "");
      if (!values.some((value) => /[가-힣]/.test(value))) return;
      nodes.push({
        start: node.start,
        end: node.end,
        literal: source.slice(node.start, node.end),
        values
      });
    }
  });
  return nodes
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .filter((node, index, sorted) => {
      const previous = sorted[index - 1];
      return !previous || node.start >= previous.end;
    });
}

function collectJsTranslations() {
  const jsDir = path.join(DIST, "assets", "js");
  const map = Object.fromEntries(koToEn.entries());
  for (const phrase of [
    "검색 결과가 없습니다.",
    "다른 검색어를 입력해 보세요.",
    "표시할 의존성이 없습니다.",
    "비교할 패키지를 추가하세요.",
    "최근 조회가 없습니다.",
    "즐겨찾기가 없습니다."
  ]) {
    map[phrase] = translate(phrase);
  }
  for (const file of walkFiles(jsDir, (candidate) => /\.(?:m?js)$/.test(candidate))) {
    const source = fs.readFileSync(file, "utf8");
    for (const { literal, values } of collectStringNodes(source)) {
      if (!/[가-힣]/.test(literal)) continue;
      for (const value of values) {
        if (typeof value === "string" && /[가-힣]/.test(value)) {
          map[value] = translate(value);
        }
      }
    }
  }
  return map;
}

function transformJsForRuntimeI18n(map) {
  const jsDir = path.join(DIST, "assets", "js");
  for (const file of walkFiles(jsDir, (candidate) => /\.(?:m?js)$/.test(candidate) && !candidate.endsWith("i18n-dynamic.js"))) {
    const source = fs.readFileSync(file, "utf8");
    let transformed = "";
    let cursor = 0;
    for (const { start, end, literal } of collectStringNodes(source)) {
      transformed += source.slice(cursor, start);
      const before = source.slice(Math.max(0, start - 16), start);
      if (!/[가-힣]/.test(literal) || /sfT\(\s*$/.test(before)) {
        transformed += literal;
      } else {
        transformed += `window.sfT(${literal})`;
      }
      cursor = end;
    }
    transformed += source.slice(cursor);
    fs.writeFileSync(file, transformed);
  }

  const payload = JSON.stringify(map).replace(/</g, "\\u003c");
  const helper = `(function () {
  "use strict";
  const config = window.SF_I18N || {};
  const dictionary = ${payload};
  const entries = Object.entries(dictionary).sort((a, b) => b[0].length - a[0].length);
  window.sfT = function sfT(value) {
    if (config.lang !== "en" || value == null) return value;
    let output = String(value);
    if (dictionary[output]) return dictionary[output];
    for (const [ko, en] of entries) {
      if (ko && output.includes(ko)) output = output.split(ko).join(en);
    }
    return /[가-힣]/.test(output) ? output.replace(/[가-힣]+/g, "").replace(/\\s{2,}/g, " ").trim() : output;
  };
})();\n`;
  fs.writeFileSync(path.join(jsDir, "i18n-dynamic.js"), helper);
}

function renderFile(file, lang) {
  let html = readText(file);
  html = html.replace(/<html\b[^>]*>/i, `<html lang="${lang}">`);
  html = removeExistingSeo(html);
  html = translateTaggedContent(html, lang);
  html = translateAttributes(html, lang);
  html = rewriteLinks(html, lang, file);
  html = updateLanguageToggle(html, lang, file);
  html = localizeLooseAttributes(html, lang);
  html = localizeJsonLd(html, lang);
  html = injectLocaleScript(html, lang);
  html = injectDynamicI18nScript(html);
  html = injectSeo(html, lang, file);
  html = html.replace(/\sdata-i18n="[^"]*"/g, "");
  html = html.replace(/\sdata-i18n-attrs="[^"]*"/g, "");
  return html;
}

function buildPages() {
  for (const file of sourceFiles()) {
    for (const lang of LANGS) {
      const outputFile = path.join(DIST, lang, file);
      writeText(path.relative(ROOT, outputFile), renderFile(file, lang));
    }
  }
}

function writeRootRedirect() {
  writeText("dist/index.html", `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="0; url=/ko/">
    <link rel="canonical" href="${SITE_URL}/ko/">
    <title>SolForge</title>
  </head>
  <body>
    <p><a href="/ko/">SolForge 한국어 사이트로 이동</a></p>
  </body>
</html>
`);
  writeText("dist/_redirects", "/ /ko/ 302\n");
}

function writeRobots() {
  writeText("dist/robots.txt", `User-agent: *
Allow: /

User-agent: Mediapartners-Google
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`);
}

function writeSitemap() {
  const urls = [];
  for (const file of sourceFiles()) {
    for (const lang of LANGS) {
      urls.push(`  <url>
    <loc>${localizedUrl(lang, file)}</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="${localizedUrl("ko", file)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${localizedUrl("en", file)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${localizedUrl(DEFAULT_LANG, file)}" />
  </url>`);
    }
  }
  writeText("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`);
}

cleanDist();
copyDir(path.join(ROOT, "assets"), path.join(DIST, "assets"));
transformJsForRuntimeI18n(collectJsTranslations());
buildPages();
writeRootRedirect();
writeRobots();
writeSitemap();

console.log(`Built ${sourceFiles().length} source pages for ${LANGS.join(", ")} into dist/`);
