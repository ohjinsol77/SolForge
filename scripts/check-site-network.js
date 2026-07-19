const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MAIN_URL = "https://solforge.cloud";
const ADSENSE_CLIENT = "ca-pub-1625988263075960";
const ADS_TXT_RECORD = `google.com, ${ADSENSE_CLIENT.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0`;
const RETIRED_AFFILIATE_PATTERN = new RegExp(["cou", "pang"].join(""), "i");
const sites = [
  { name: "crypto", host: "crypto.solforge.cloud", publicHost: "crypto.solforge.cloud", pages: 8, markers: ["Bitcoin", "Ethereum", "공포탐욕"] },
  { name: "stocks", host: "stocks.solforge.cloud", publicHost: "stocks.solforge.cloud", pages: 9, markers: ["KOSPI", "NASDAQ Composite", "재무"] },
  { name: "fortune", host: "fortune.solforge.cloud", publicHost: "fortune.solforge.cloud", pages: 10, markers: ["12띠", "Constellations", "오락"] }
];

function fail(message) {
  throw new Error(message);
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
  if (adsTxt !== ADS_TXT_RECORD) fail(`Invalid ads.txt record in ${site.name}`);
  for (const lang of ["ko", "en"]) {
    const dir = path.join(dist, lang);
    const files = htmlFiles(dir);
    if (files.length !== site.pages) fail(`${site.name}/${lang} page count: ${files.length}, expected ${site.pages}`);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const html = fs.readFileSync(fullPath, "utf8");
      if (!html.includes(`<html lang="${lang}">`)) fail(`Wrong lang in ${fullPath}`);
      if (!html.includes(`https://${site.host}/${lang}/`)) fail(`Missing localized canonical in ${fullPath}`);
      if (!html.includes(`pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`)) fail(`AdSense publisher code missing in specialist site: ${fullPath}`);
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
if (mainSitemapUrls.size !== mainHtmlFiles.length) fail(`Main sitemap URL count: ${mainSitemapUrls.size}, expected ${mainHtmlFiles.length}`);
const mainRedirects = fs.readFileSync(path.join(ROOT, "dist", "_redirects"), "utf8");
const mainHeaders = fs.readFileSync(path.join(ROOT, "dist", "_headers"), "utf8");
if (!mainRedirects.includes("/tools/all.html /ko/tools/all 301")) fail("Legacy HTML redirect missing");
if (!mainRedirects.includes("/ko/tools/all.html /ko/tools/all 301")) fail("Localized HTML redirect missing");
if (!mainRedirects.includes("/en/tools/all/ /en/tools/all 301")) fail("Localized trailing-slash redirect missing");
if (!mainHeaders.includes("https://solforge.pages.dev/*") || !mainHeaders.includes("https://:version.solforge.pages.dev/*")) fail("Pages preview noindex headers missing");

for (const lang of ["ko", "en"]) {
  for (const fullPath of nestedHtmlFiles(path.join(ROOT, "dist", lang))) {
    const html = fs.readFileSync(fullPath, "utf8");
    const relative = path.relative(path.join(ROOT, "dist"), fullPath).split(path.sep).join("/");
    const expectedCanonical = relative === `${lang}/index.html`
      ? `${MAIN_URL}/${lang}/`
      : `${MAIN_URL}/${relative.replace(/\.html$/, "")}`;
    const canonicals = [...html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"/g)].map((match) => match[1]);
    if (canonicals.length !== 1 || canonicals[0] !== expectedCanonical) fail(`Canonical mismatch in main site: ${fullPath}`);
    if (!mainSitemapUrls.has(expectedCanonical)) fail(`Main page missing from sitemap: ${expectedCanonical}`);
    if (!html.includes(`<link rel="alternate" hreflang="ko"`) || !html.includes(`<link rel="alternate" hreflang="en"`) || !html.includes(`<link rel="alternate" hreflang="x-default"`)) fail(`Hreflang links missing in main site: ${fullPath}`);
    if (!/<meta\s+name="robots"\s+content="[^"]*index/i.test(html)) fail(`Index robots meta missing in main site: ${fullPath}`);
    if (/\shref="[^"]*\.html(?:[?#][^"]*)?"/i.test(html)) fail(`Non-canonical HTML link in main site: ${fullPath}`);
    if (!html.includes(`pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`)) fail(`AdSense publisher code missing in main site: ${fullPath}`);
    if (RETIRED_AFFILIATE_PATTERN.test(html)) fail(`Retired affiliate reference found in main site: ${fullPath}`);
  }
}

for (const file of ["app.js", "tool-catalog.js"]) {
  const source = fs.readFileSync(path.join(ROOT, "dist", "assets", "js", file), "utf8");
  if (/(?:tools|calculators|guides)\/[a-z0-9-]+\.html(?:[?#"'`])/i.test(source)) fail(`Non-canonical runtime route in ${file}`);
  if (file === "tool-catalog.js" && /\.html(?:[?#"])/i.test(source)) fail(`Non-canonical catalog route in ${file}`);
}

for (const site of sites) {
  if (!mainKo.includes(`https://${site.publicHost}/ko/`)) fail(`Korean main missing working ${site.name} link`);
  if (!mainEn.includes(`https://${site.publicHost}/en/`)) fail(`English main missing working ${site.name} link`);
}

console.log("Checked SolForge network: 54 localized specialist pages, internal links, content boundaries and main hub links.");
