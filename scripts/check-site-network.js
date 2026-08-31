const fs = require("fs");
const path = require("path");
const vm = require("vm");
const {
  AD_FREE_TOOL_SLUGS,
  generatedCategoryRecords,
  generatedToolRecords,
  loadToolCatalog
} = require("./build-tool-pages");

const ROOT = path.resolve(__dirname, "..");
const MAIN_URL = "https://solforge.cloud";
const ADSENSE_CLIENT = "ca-pub-1625988263075960";
const ADS_TXT_RECORD = `google.com, ${ADSENSE_CLIENT.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0`;
const RETIRED_AFFILIATE_PATTERN = new RegExp(["cou", "pang"].join(""), "i");
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
const MAIN_AD_FREE_FILES = new Set([
  "about.html",
  "contact.html",
  "features.html",
  "tools/grand-koleos-touch-keyboard.html",
  "tools/google-timeline.html",
  "privacy.html",
  "terms.html",
  "tools/all.html",
  ...[...AD_FREE_TOOL_SLUGS].map((slug) => `tools/${slug}.html`),
  ...GROUP_CONTAINER_FILES
]);
const GROUP_CONTAINER_ROUTES = new Set([...GROUP_CONTAINER_FILES].map((file) => file.replace(/\.html$/, "")));
const CATEGORY_IDS = [
  "developer", "text", "media", "vehicle", "pip", "boss", "gameplay", "game-calculator",
  "device", "display", "input", "performance", "finance", "life", "age",
  "date", "lunar", "calendar"
];
for (const category of CATEGORY_IDS) MAIN_AD_FREE_FILES.add(`tools/${category}.html`);
const sites = [
  { name: "crypto", host: "crypto.solforge.cloud", publicHost: "crypto.solforge.cloud", pagesProject: "solforge-crypto", pages: 8, markers: ["Bitcoin", "Ethereum", "공포탐욕"] },
  { name: "stocks", host: "stocks.solforge.cloud", publicHost: "stocks.solforge.cloud", pagesProject: "solforge-stocks", pages: 9, markers: ["KOSPI", "NASDAQ Composite", "재무"] },
  { name: "fortune", host: "fortune.solforge.cloud", publicHost: "fortune.solforge.cloud", pagesProject: "solforge-fortune", pages: 10, markers: ["12띠", "Constellations", "오락"] }
];

function fail(message) {
  throw new Error(message);
}

function htmlText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlFiles(dir) {
  return fs.readdirSync(dir).filter((file) => file.endsWith(".html"));
}

function expectedFile(dist, href) {
  const clean = href.split(/[?#]/)[0];
  const parts = clean.replace(/^\//, "").split("/").filter(Boolean);
  if (!/^(?:ko|en)$/.test(parts[0] || "")) return null;
  if (parts.length === 1) return path.join(dist, parts[0], "index.html");
  return path.join(dist, parts[0], `${parts.slice(1).join("/")}.html`);
}

for (const site of sites) {
  const dist = path.join(ROOT, "sites", site.name, "dist");
  const adsTxt = fs.readFileSync(path.join(dist, "ads.txt"), "utf8").trim();
  const redirects = fs.readFileSync(path.join(dist, "_redirects"), "utf8");
  const headers = fs.readFileSync(path.join(dist, "_headers"), "utf8");
  const sitemap = fs.readFileSync(path.join(dist, "sitemap.xml"), "utf8");
  const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
  if (adsTxt !== ADS_TXT_RECORD) fail(`Invalid ads.txt record in ${site.name}`);
  if (!redirects.includes("/ /ko/ 301")) fail(`Permanent root redirect missing in ${site.name}`);
  if (!headers.includes(`https://${site.pagesProject}.pages.dev/*`) || !headers.includes(`https://:version.${site.pagesProject}.pages.dev/*`)) fail(`Pages preview noindex headers missing in ${site.name}`);
  if (sitemapUrls.size !== site.pages * 2) fail(`Sitemap URL count mismatch in ${site.name}`);
  for (const lang of ["ko", "en"]) {
    const dir = path.join(dist, lang);
    const files = htmlFiles(dir);
    if (files.length !== site.pages) fail(`${site.name}/${lang} page count: ${files.length}, expected ${site.pages}`);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const html = fs.readFileSync(fullPath, "utf8");
      const expectedCanonical = file === "index.html" ? `https://${site.host}/${lang}/` : `https://${site.host}/${lang}/${file.replace(/\.html$/, "")}`;
      const canonicals = [...html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/g)].map((match) => match[1]);
      if (!html.includes(`<html lang="${lang}">`)) fail(`Wrong lang in ${fullPath}`);
      if (canonicals.length !== 1 || canonicals[0] !== expectedCanonical) fail(`Canonical mismatch in ${fullPath}`);
      if (!sitemapUrls.has(expectedCanonical)) fail(`Canonical missing from sitemap in ${site.name}: ${expectedCanonical}`);
      if (/\bnoindex\b/i.test(html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i)?.[1] || "")) fail(`Unexpected noindex in ${fullPath}`);
      const hasAds = html.includes(`pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`);
      const shouldHaveAds = !["about.html", "privacy.html"].includes(file);
      if (shouldHaveAds && !hasAds) fail(`AdSense publisher code missing in specialist content: ${fullPath}`);
      if (!shouldHaveAds && hasAds) fail(`AdSense publisher code must be absent from specialist policy page: ${fullPath}`);
      if (RETIRED_AFFILIATE_PATTERN.test(html)) fail(`Retired affiliate reference found in specialist site: ${fullPath}`);
      const isPersonalFortune = site.name === "fortune" && file === "personal-fortune.html";
      if (/<(?:dialog|input|textarea|select)\b/i.test(html) && !isPersonalFortune) fail(`Unexpected input or dialog in reading site: ${fullPath}`);
      const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
      for (const href of hrefs) {
        const target = expectedFile(dist, href);
        if (target && !fs.existsSync(target)) fail(`Broken internal link ${href} in ${fullPath}`);
      }
    }
  }

  const combined = ["ko", "en"].flatMap((lang) => htmlFiles(path.join(dist, lang)).map((file) => fs.readFileSync(path.join(dist, lang, file), "utf8"))).join("\n");
  for (const marker of site.markers) if (!combined.includes(marker)) fail(`Expected ${site.name} marker not found: ${marker}`);
  if (/부동산|real estate/i.test(combined)) fail(`Real-estate content found in ${site.name}`);
}

const mainKo = fs.readFileSync(path.join(ROOT, "dist", "ko", "index.html"), "utf8");
const mainEn = fs.readFileSync(path.join(ROOT, "dist", "en", "index.html"), "utf8");
if (/specialized-sites|trust-strip|home-guide/.test(mainKo)) fail("Korean homepage still contains a removed promotional section");
if (/specialized-sites|trust-strip|home-guide/.test(mainEn)) fail("English homepage still contains a removed promotional section");
if (mainKo.includes("하나의 독립 페이지") || mainEn.includes("One focused page")) fail("Retired homepage headline is still present");
if (!mainKo.includes("필요한 도구를,") || !mainKo.includes("가장 빠른 경로로.")) fail("New Korean homepage headline is missing");
if (!mainEn.includes("The right tool,") || !mainEn.includes("right when you need it.")) fail("New English homepage headline is missing");
function nestedHtmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return nestedHtmlFiles(fullPath);
    return entry.name.endsWith(".html") ? [fullPath] : [];
  });
}

const mainSitemap = fs.readFileSync(path.join(ROOT, "dist", "sitemap.xml"), "utf8");
const mainSitemapUrls = new Set([...mainSitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
const mainHtmlFiles = ["ko", "en"].flatMap((lang) => nestedHtmlFiles(path.join(ROOT, "dist", lang)));
const mainIndexableFiles = mainHtmlFiles.filter((fullPath) => {
  const html = fs.readFileSync(fullPath, "utf8");
  const robots = html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i)?.[1] || "";
  return !/\bnoindex\b/i.test(robots);
});
if (mainSitemapUrls.size !== mainIndexableFiles.length) fail(`Main sitemap URL count: ${mainSitemapUrls.size}, expected ${mainIndexableFiles.length} indexable pages`);
const mainRedirects = fs.readFileSync(path.join(ROOT, "dist", "_redirects"), "utf8");
const mainHeaders = fs.readFileSync(path.join(ROOT, "dist", "_headers"), "utf8");
if (!mainRedirects.includes("/tools/all.html /ko/tools/all 301")) fail("Legacy HTML redirect missing");
if (!mainRedirects.includes("/public/tools/all.html /ko/tools/all 301")) fail("Historical public HTML redirect missing");
if (!mainRedirects.includes("/ko/tools/all.html /ko/tools/all 301")) fail("Localized HTML redirect missing");
if (!mainRedirects.includes("/en/tools/all/ /en/tools/all 301")) fail("Localized trailing-slash redirect missing");
if (!mainHeaders.includes("https://solforge.pages.dev/*") || !mainHeaders.includes("https://:version.solforge.pages.dev/*")) fail("Pages preview noindex headers missing");
if (!fs.existsSync(path.join(ROOT, "dist", "assets", "img", "favicon.svg"))) fail("Main favicon asset missing");
if (!fs.existsSync(path.join(ROOT, "dist", "favicon.ico"))) fail("Legacy favicon asset missing");
for (const file of GROUP_CONTAINER_FILES) {
  for (const lang of ["ko", "en"]) {
    if (fs.existsSync(path.join(ROOT, "dist", lang, file))) fail(`Retired grouped page must not be emitted: ${lang}/${file}`);
  }
}

const workerSource = fs.readFileSync(path.join(ROOT, "worker.js"), "utf8");
if (!workerSource.includes('url.hostname === `www.${CANONICAL_HOST}`') || !workerSource.includes('url.hostname.endsWith(".workers.dev")')) fail("Alternate host canonical redirect missing in worker");
const workerConfig = JSON.parse(fs.readFileSync(path.join(ROOT, "wrangler.jsonc"), "utf8"));
if (!Array.isArray(workerConfig.assets?.run_worker_first) || !workerConfig.assets.run_worker_first.includes("/*")) fail("HTML requests must run the Worker before static asset delivery");

for (const lang of ["ko", "en"]) {
  for (const fullPath of nestedHtmlFiles(path.join(ROOT, "dist", lang))) {
    const html = fs.readFileSync(fullPath, "utf8");
    const relative = path.relative(path.join(ROOT, "dist"), fullPath).split(path.sep).join("/");
    const expectedCanonical = relative === `${lang}/index.html`
      ? `${MAIN_URL}/${lang}/`
      : `${MAIN_URL}/${relative.replace(/\.html$/, "")}`;
    const canonicals = [...html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/g)].map((match) => match[1]);
    if (canonicals.length !== 1 || canonicals[0] !== expectedCanonical) fail(`Canonical mismatch in main site: ${fullPath}`);
    const robots = html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i)?.[1] || "";
    if (!robots) fail(`Robots meta missing in main site: ${fullPath}`);
    const isIndexable = !/\bnoindex\b/i.test(robots);
    if (!isIndexable) fail(`Unexpected noindex in main site: ${fullPath}`);
    if (isIndexable && !mainSitemapUrls.has(expectedCanonical)) fail(`Indexable main page missing from sitemap: ${expectedCanonical}`);
    if (!isIndexable && mainSitemapUrls.has(expectedCanonical)) fail(`Noindex main page must be absent from sitemap: ${expectedCanonical}`);
    if (!html.includes(`<link rel="alternate" hreflang="ko"`) || !html.includes(`<link rel="alternate" hreflang="en"`) || !html.includes(`<link rel="alternate" hreflang="x-default"`)) fail(`Hreflang links missing in main site: ${fullPath}`);
    if (!html.includes('<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">')) fail(`Favicon link missing in main site: ${fullPath}`);
    if (/\shref="[^"]*\.html(?:[?#][^"]*)?"/i.test(html)) fail(`Non-canonical HTML link in main site: ${fullPath}`);
    const pageFile = relative.replace(new RegExp(`^${lang}/`), "");
    const hasAds = html.includes(`pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`);
    const shouldHaveAds = !MAIN_AD_FREE_FILES.has(pageFile);
    if (shouldHaveAds && !hasAds) fail(`AdSense publisher code missing in main content page: ${fullPath}`);
    if (!shouldHaveAds && hasAds) fail(`AdSense publisher code must be absent from utility or policy page: ${fullPath}`);
    if (isIndexable) {
      const body = html.match(/<body\b[\s\S]*<\/body>/i)?.[0] || "";
      const hrefs = [...body.matchAll(/\shref="([^"]+)"/gi)].map((match) => match[1].split(/[?#]/)[0]);
      for (const href of hrefs) {
        const route = href.replace(new RegExp(`^/${lang}/`), "").replace(/\/$/, "");
        if (GROUP_CONTAINER_ROUTES.has(route)) fail(`Indexable page links to a grouped compatibility route: ${href} in ${fullPath}`);
      }
    }
    if (lang === "en") {
      const visibleText = html
        .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ");
      if (/[가-힣]/.test(visibleText)) fail(`Untranslated Korean visible on English page: ${fullPath}`);
    }
    if (RETIRED_AFFILIATE_PATTERN.test(html)) fail(`Retired affiliate reference found in main site: ${fullPath}`);
  }
}

const toolCatalog = loadToolCatalog();
const generatedTools = generatedToolRecords(toolCatalog);
const generatedCategories = generatedCategoryRecords(toolCatalog);
if (toolCatalog.length !== 150) fail(`Tool catalog count: ${toolCatalog.length}, expected 150`);
if (generatedTools.length !== 136) fail(`Generated focused tool count: ${generatedTools.length}, expected 136`);
if (generatedCategories.length !== CATEGORY_IDS.length) fail(`Generated category count: ${generatedCategories.length}, expected ${CATEGORY_IDS.length}`);
const toolTitles = new Set();
const toolDescriptions = new Set();
const englishCopySource = fs.readFileSync(path.join(ROOT, "dist", "assets", "js", "tool-copy-en.js"), "utf8");
const englishCopy = JSON.parse(englishCopySource.replace(/^\s*window\.SF_TOOL_COPY\s*=\s*/, "").replace(/;\s*$/, ""));
for (const lang of ["ko", "en"]) {
  const localizedTools = toolCatalog.map((tool) => lang === "en" && englishCopy[tool.href]
    ? { ...tool, ...englishCopy[tool.href] }
    : tool);
  for (const tool of localizedTools) {
    const relative = tool.href.startsWith("../") ? `${tool.href.slice(3)}.html` : `tools/${tool.href}.html`;
    const fullPath = path.join(ROOT, "dist", lang, ...relative.split("/"));
    if (!fs.existsSync(fullPath)) fail(`Catalog target missing: ${fullPath}`);
    const html = fs.readFileSync(fullPath, "utf8");
    const heading = htmlText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
    const documentTitle = htmlText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
    if (heading !== tool.title) fail(`Catalog/H1 title mismatch: ${tool.title} != ${heading} in ${fullPath}`);
    if (documentTitle !== `${tool.title} - SolForge`) fail(`Catalog/document title mismatch in ${fullPath}`);
  }
  for (const tool of generatedTools) {
    const fullPath = path.join(ROOT, "dist", lang, "tools", `${tool.slug}.html`);
    if (!fs.existsSync(fullPath)) fail(`Focused tool page missing: ${fullPath}`);
    const html = fs.readFileSync(fullPath, "utf8");
    if (!html.includes(`data-page-tool="${tool.slug}"`)) fail(`Focused tool marker missing: ${fullPath}`);
    if ((html.match(/<h1\b/g) || []).length !== 1) fail(`Focused tool page must have one H1: ${fullPath}`);
    if (!html.includes('"@type":"SoftwareApplication"') || !html.includes('"@type":"FAQPage"')) fail(`Focused tool structured data missing: ${fullPath}`);
    const visibleWordCount = html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .length;
    if (visibleWordCount < 300) fail(`Focused tool content is too short (${visibleWordCount} words): ${fullPath}`);
    if (lang === "en") {
      const title = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]+>/g, "").trim();
      const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1];
      if (!title || toolTitles.has(title)) fail(`Missing or duplicate focused English title: ${title || fullPath}`);
      if (!description || toolDescriptions.has(description)) fail(`Missing or duplicate focused English description: ${description || fullPath}`);
      toolTitles.add(title);
      toolDescriptions.add(description);
    }
  }
  for (const category of generatedCategories) {
    const fullPath = path.join(ROOT, "dist", lang, "tools", `${category.slug}.html`);
    if (!fs.existsSync(fullPath)) fail(`Category page missing: ${fullPath}`);
    const html = fs.readFileSync(fullPath, "utf8");
    if (!html.includes(`data-page-category="${category.id}"`)) fail(`Category marker missing: ${fullPath}`);
    if ((html.match(/<h1\b/g) || []).length !== 1) fail(`Category page must have one H1: ${fullPath}`);
    if (!html.includes('"@type":"CollectionPage"') || !html.includes('"@type":"ItemList"')) fail(`Category structured data missing: ${fullPath}`);
    if (!mainRedirects.includes(`/${lang}/tools/${category.slug}.html /${lang}/tools/${category.slug} 301`)) fail(`Category HTML redirect missing: ${category.slug}`);
  }
}

for (const route of GROUP_CONTAINER_ROUTES) {
  for (const lang of ["ko", "en"]) {
    if (!mainRedirects.includes(`/${lang}/${route} /${lang}/`)) fail(`Grouped route replacement missing: /${lang}/${route}`);
  }
}

for (const file of ["app.js", "tool-catalog.js"]) {
  const source = fs.readFileSync(path.join(ROOT, "dist", "assets", "js", file), "utf8");
  if (/(?:tools|calculators|guides)\/[a-z0-9-]+\.html(?:[?#"'`])/i.test(source)) fail(`Non-canonical runtime route in ${file}`);
  if (file === "tool-catalog.js" && /\.html(?:[?#"])/i.test(source)) fail(`Non-canonical catalog route in ${file}`);
}

const runtimeOverrides = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "runtime-en.json"), "utf8"));
for (const [korean, english] of Object.entries(runtimeOverrides)) {
  if (!english.trim() || /[가-힣]/.test(english)) fail(`Invalid curated runtime translation for: ${korean}`);
}
const runtimeContext = { window: { SF_I18N: { lang: "en" } } };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "dist", "assets", "js", "i18n-dynamic.js"), "utf8"), runtimeContext);
const runtimeTranslationCases = new Map([
  ["만 20세", "20 years old (international age)"],
  ["20년 3개월 2일", "20 years, 3 months, 2 days"],
  ["1990년생", "Born in 1990"],
  ["총 3개", "3 total"],
  ["메이플랜드 보스타이머", "MapleLand Boss Timer"],
  ["타이머를 추가해주세요.", "Add a timer to get started."],
  ["영업일", "Business days"],
  ["메서드", "Method"]
]);
for (const [input, expected] of runtimeTranslationCases) {
  const actual = runtimeContext.window.sfT(input);
  if (actual !== expected) fail(`Runtime English mismatch for "${input}": "${actual}", expected "${expected}"`);
}

for (const site of sites) {
  if (!mainKo.includes(`https://${site.publicHost}/ko/`)) fail(`Korean main missing working ${site.name} link`);
  if (!mainEn.includes(`https://${site.publicHost}/en/`)) fail(`English main missing working ${site.name} link`);
}

console.log("Checked SolForge network: 150 tools, focused pages, ad scope, sitemaps, internal links and 54 localized specialist pages.");
