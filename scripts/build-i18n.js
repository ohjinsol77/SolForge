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
  normalizePagePath,
  parseAttributes,
  readJson,
  readText,
  removeAttribute,
  setAttribute,
  sourceFiles,
  writeText
} = require("./i18n-utils");
const { translate } = require("./generate-en-locale");
const {
  AD_FREE_TOOL_SLUGS,
  buildToolPages,
  generatedToolRecords,
  loadToolCatalog,
  writeEnglishToolCopyAsset
} = require("./build-tool-pages");

const DIST = path.join(ROOT, "dist");
const toolCatalog = loadToolCatalog();
const generatedTools = generatedToolRecords(toolCatalog);
const locales = Object.fromEntries(LANGS.map((lang) => [lang, readJson(`src/locales/${lang}.json`, {})]));
const koToEn = new Map();
for (const [key, value] of Object.entries(locales.ko || {})) {
  const english = locales.en?.[key];
  if (typeof english === "string" && english.trim() && !/[가-힣]/.test(english)) koToEn.set(value, english);
}
const GROUP_CONTAINER_FILES = new Set([
  "calculators/all.html",
  "tools/advanced-toolbox.html",
  "tools/device-diagnostics.html",
  "tools/display-diagnostics.html",
  "tools/file-media-toolbox.html",
  "tools/gaming-calculators.html",
  "tools/gaming-lab.html",
  "tools/input-training.html",
  "tools/performance-lab.html",
  "tools/pip-toolbox.html",
  "tools/utility-toolbox.html"
]);
const AD_FREE_FILES = new Set([
  "about.html",
  "contact.html",
  "features.html",
  "privacy.html",
  "terms.html",
  "tools/all.html",
  ...[...AD_FREE_TOOL_SLUGS].map((slug) => `tools/${slug}.html`),
  ...GROUP_CONTAINER_FILES
]);

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

function writeFavicon() {
  const size = 32;
  const xorBytes = size * size * 4;
  const maskBytes = size * Math.ceil(size / 32) * 4;
  const bitmapBytes = 40 + xorBytes + maskBytes;
  const directory = Buffer.alloc(22);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(1, 4);
  directory[6] = size;
  directory[7] = size;
  directory.writeUInt16LE(1, 10);
  directory.writeUInt16LE(32, 12);
  directory.writeUInt32LE(bitmapBytes, 14);
  directory.writeUInt32LE(directory.length, 18);

  const bitmap = Buffer.alloc(bitmapBytes);
  bitmap.writeUInt32LE(40, 0);
  bitmap.writeInt32LE(size, 4);
  bitmap.writeInt32LE(size * 2, 8);
  bitmap.writeUInt16LE(1, 12);
  bitmap.writeUInt16LE(32, 14);
  bitmap.writeUInt32LE(xorBytes, 20);

  for (let row = 0; row < size; row += 1) {
    const y = size - 1 - row;
    for (let x = 0; x < size; x += 1) {
      const isMark = (x >= 8 && x <= 12 && y >= 6 && y <= 25)
        || (x >= 8 && x <= 24 && y >= 6 && y <= 10)
        || (x >= 8 && x <= 21 && y >= 14 && y <= 18);
      const offset = 40 + (row * size + x) * 4;
      bitmap[offset] = 255;
      bitmap[offset + 1] = isMark ? 255 : 119;
      bitmap[offset + 2] = isMark ? 255 : 22;
      bitmap[offset + 3] = 255;
    }
  }

  fs.writeFileSync(path.join(DIST, "favicon.ico"), Buffer.concat([directory, bitmap]));
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
    .replace(/\s*<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi, "")
    .replace(/\s*<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=["'][^"']+["'])[^>]*>/gi, "")
    .replace(/\s*<link\b(?=[^>]*\brel=["'](?:shortcut\s+)?icon["'])[^>]*>/gi, "");
}

function injectSeo(html, lang, file) {
  const favicon = '<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">';
  const canonical = `<link rel="canonical" href="${localizedUrl(lang, file)}">`;
  const alternates = [
    `<link rel="alternate" hreflang="ko" href="${localizedUrl("ko", file)}">`,
    `<link rel="alternate" hreflang="en" href="${localizedUrl("en", file)}">`,
    `<link rel="alternate" hreflang="x-default" href="${localizedUrl(DEFAULT_LANG, file)}">`
  ].join("\n    ");
  return html.replace(/<\/head>/i, `    ${favicon}\n    ${canonical}\n    ${alternates}\n  </head>`);
}

function updateLanguageToggle(html, lang, file) {
  const other = lang === "ko" ? "en" : "ko";
  const label = lang === "ko" ? "영어로 전환" : "Switch to Korean";
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

function localizeJsonLd(html, lang, file) {
  return html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi, (match, jsonText) => {
    try {
      const data = JSON.parse(jsonText.trim());
      data.url = localizedUrl(lang, file);
      if (data["@type"] === "WebSite" && data.name === "SolForge") {
        data.description = t(lang, "home.meta.description", data.description || "");
      } else if (data["@type"] === "WebApplication" && file === "tools/exchange-rates.html") {
        data.name = t(lang, "tools.exchange-rates.schema.name", data.name || "");
        data.description = t(lang, "tools.exchange-rates.schema.description", data.description || "");
        data.inLanguage = lang;
        if (data.offers) data.offers.priceCurrency = lang === "ko" ? "KRW" : "USD";
      } else if (data.description && lang === "en") {
        data.description = translateLoose(lang, data.description);
      }
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
    switchLabel: lang === "ko" ? "영어로 전환" : "Switch to Korean"
  }).replace(/</g, "\\u003c");
  return html.replace(/<\/head>/i, `    <script>window.SF_I18N=${payload};</script>\n  </head>`);
}

function removeAdSenseCode(html) {
  return html.replace(/\s*<script\b[^>]*\bsrc="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=[^"]+"[^>]*><\/script>/gi, "");
}

function setRobotsDirective(html, content) {
  if (/<meta\b[^>]*\bname="robots"[^>]*>/i.test(html)) {
    return html.replace(/<meta\b[^>]*\bname="robots"[^>]*>/i, `<meta name="robots" content="${content}">`);
  }
  return html.replace(/<\/head>/i, `    <meta name="robots" content="${content}">\n  </head>`);
}

function isIndexableSourceFile(file) {
  return !GROUP_CONTAINER_FILES.has(file);
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
          if (!Object.prototype.hasOwnProperty.call(map, value)) map[value] = translate(value);
        }
      }
    }
  }
  Object.assign(map, readJson("src/runtime-en.json", {}));
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
  const entries = Object.entries(dictionary)
    .filter(([ko]) => ko.length > 1)
    .sort((a, b) => b[0].length - a[0].length);
  const patterns = [
    [/^만 ([0-9]+)세$/, "$1 years old (international age)"],
    [/^([0-9]+)년 ([0-9]+)개월 ([0-9]+)일$/, "$1 years, $2 months, $3 days"],
    [/^([0-9]+)년생$/, "Born in $1"],
    [/^총 ([0-9]+)개$/, "$1 total"],
    [/^([0-9]+)개$/, "$1 items"],
    [/^([0-9]+)세$/, "$1 years old"],
    [/^([0-9]+)개월$/, "$1 months"],
    [/^([0-9]+)주$/, "$1 weeks"],
    [/^([0-9]+)일$/, "$1 days"],
    [/^([0-9]+)시간$/, "$1 hours"],
    [/^([0-9]+)분$/, "$1 minutes"],
    [/^([0-9]+)초$/, "$1 seconds"],
    [/^([0-9]+)번째 값$/, "Value $1"]
  ];
  window.sfT = function sfT(value) {
    if (config.lang !== "en" || value == null) return value;
    let output = String(value);
    if (dictionary[output]) return dictionary[output];
    for (const [pattern, replacement] of patterns) {
      if (pattern.test(output)) return output.replace(pattern, replacement);
    }
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
  if (AD_FREE_FILES.has(file)) html = removeAdSenseCode(html);
  html = html.replace(/<html\b[^>]*>/i, `<html lang="${lang}">`);
  html = removeExistingSeo(html);
  html = translateTaggedContent(html, lang);
  html = translateAttributes(html, lang);
  html = rewriteLinks(html, lang, file);
  html = updateLanguageToggle(html, lang, file);
  html = localizeLooseAttributes(html, lang);
  html = localizeJsonLd(html, lang, file);
  html = injectLocaleScript(html, lang);
  html = injectDynamicI18nScript(html);
  html = injectSeo(html, lang, file);
  if (GROUP_CONTAINER_FILES.has(file)) html = setRobotsDirective(html, "noindex, follow");
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
    <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
    <link rel="canonical" href="${SITE_URL}/ko/">
    <title>SolForge</title>
  </head>
  <body>
    <p><a href="/ko/">SolForge 한국어 사이트로 이동</a></p>
  </body>
</html>
`);
  const redirects = [
    "/ /ko/ 301",
    "/index /ko/ 301",
    "/index.html /ko/ 301",
    "/ko /ko/ 301",
    "/ko/index /ko/ 301",
    "/ko/index.html /ko/ 301",
    "/en /en/ 301",
    "/en/index /en/ 301",
    "/en/index.html /en/ 301",
    "/public /ko/ 301",
    "/public/ /ko/ 301",
    "/public/index /ko/ 301",
    "/public/index.html /ko/ 301"
  ];

  for (const file of sourceFiles()) {
    if (file === "index.html") continue;
    const legacyPath = `/${normalizePagePath(file)}`;
    const koPath = localizedPath("ko", file);

    redirects.push(`${legacyPath} ${koPath} 301`);
    redirects.push(`${legacyPath}/ ${koPath} 301`);
    redirects.push(`/${file} ${koPath} 301`);
    redirects.push(`/public${legacyPath} ${koPath} 301`);
    redirects.push(`/public${legacyPath}/ ${koPath} 301`);
    redirects.push(`/public/${file} ${koPath} 301`);

    for (const lang of LANGS) {
      const canonicalPath = localizedPath(lang, file);
      redirects.push(`${canonicalPath}/ ${canonicalPath} 301`);
      redirects.push(`/${lang}/${file} ${canonicalPath} 301`);
    }
  }

  for (const item of generatedTools) {
    for (const lang of LANGS) {
      const canonicalPath = localizedPath(lang, item.file);
      redirects.push(`${canonicalPath}/ ${canonicalPath} 301`);
      redirects.push(`/${lang}/${item.file} ${canonicalPath} 301`);
    }
  }

  const retiredCalculators = {
    age: "age-calculator",
    anniversary: "anniversary",
    date: "date-difference",
    school: "school-years"
  };
  for (const [legacy, replacement] of Object.entries(retiredCalculators)) {
    redirects.push(`/calculators/${legacy} /ko/tools/${replacement} 301`);
    redirects.push(`/calculators/${legacy}.html /ko/tools/${replacement} 301`);
    for (const lang of LANGS) {
      redirects.push(`/${lang}/calculators/${legacy} /${lang}/tools/${replacement} 301`);
      redirects.push(`/${lang}/calculators/${legacy}.html /${lang}/tools/${replacement} 301`);
    }
  }

  writeText("dist/_redirects", `${redirects.join("\n")}\n`);
}

function writeHeaders() {
  writeText("dist/_headers", `/ko/tempdb
  Cache-Control: no-cache, no-store, must-revalidate

/en/tempdb
  Cache-Control: no-cache, no-store, must-revalidate

https://solforge.pages.dev/*
  X-Robots-Tag: noindex

https://:version.solforge.pages.dev/*
  X-Robots-Tag: noindex
`);
}

function writeRobots() {
  const robots = `User-agent: Yeti
Allow: /

User-agent: *
Allow: /

User-agent: Mediapartners-Google
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  writeText("dist/robots.txt", robots);
  for (const lang of LANGS) {
    writeText(`dist/${lang}/robots.txt`, robots);
  }
}

function writeAdsTxt() {
  fs.copyFileSync(path.join(ROOT, "ads.txt"), path.join(DIST, "ads.txt"));
}

function writeSitemap() {
  const urls = [];
  const files = [
    ...sourceFiles().filter(isIndexableSourceFile),
    ...generatedTools.map((item) => item.file)
  ];
  for (const file of files) {
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
writeFavicon();
transformJsForRuntimeI18n(collectJsTranslations());
buildPages();
writeEnglishToolCopyAsset(toolCatalog);
buildToolPages(toolCatalog);
writeRootRedirect();
writeHeaders();
writeRobots();
writeAdsTxt();
writeSitemap();

console.log(`Built ${sourceFiles().length} source pages and ${generatedTools.length} focused tool pages for ${LANGS.join(", ")} into dist/`);
