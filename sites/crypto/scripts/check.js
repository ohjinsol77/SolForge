const fs = require("fs");
const path = require("path");
const { pages } = require("./content");

const ROOT = path.resolve(__dirname, "..");
const locales = ["ko", "en"].map((lang) => JSON.parse(fs.readFileSync(path.join(ROOT, "src", "locales", `${lang}.json`), "utf8")));
const keySets = locales.map((locale) => new Set(Object.keys(locale)));
const missingKo = [...keySets[1]].filter((key) => !keySets[0].has(key));
const missingEn = [...keySets[0]].filter((key) => !keySets[1].has(key));
if (missingKo.length || missingEn.length) {
  throw new Error(`Locale key mismatch. Missing ko: ${missingKo.join(", ")} Missing en: ${missingEn.join(", ")}`);
}

require("./build");

for (const lang of ["ko", "en"]) {
  for (const page of pages) {
    const file = path.join(ROOT, "dist", lang, `${page.slug}.html`);
    const html = fs.readFileSync(file, "utf8");
    if (!html.includes(`<html lang="${lang}">`)) throw new Error(`Wrong language marker: ${file}`);
    if (!html.includes(`https://crypto.solforge.cloud/${lang}/`)) throw new Error(`Missing canonical URL: ${file}`);
    if (lang === "en" && /[가-힣]/.test(html)) throw new Error(`Korean text remains in English output: ${file}`);
  }
}

console.log(`Checked SolForge Crypto: ${pages.length * 2} localized pages and matching locale keys.`);
