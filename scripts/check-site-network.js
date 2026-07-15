const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ADSENSE_CLIENT = "ca-pub-1625988263075960";
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

for (const lang of ["ko", "en"]) {
  for (const fullPath of nestedHtmlFiles(path.join(ROOT, "dist", lang))) {
    const html = fs.readFileSync(fullPath, "utf8");
    if (!html.includes(`pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`)) fail(`AdSense publisher code missing in main site: ${fullPath}`);
    if (RETIRED_AFFILIATE_PATTERN.test(html)) fail(`Retired affiliate reference found in main site: ${fullPath}`);
  }
}

for (const site of sites) {
  if (!mainKo.includes(`https://${site.publicHost}/ko/`)) fail(`Korean main missing working ${site.name} link`);
  if (!mainEn.includes(`https://${site.publicHost}/en/`)) fail(`English main missing working ${site.name} link`);
}

console.log("Checked SolForge network: 54 localized specialist pages, internal links, content boundaries and main hub links.");
