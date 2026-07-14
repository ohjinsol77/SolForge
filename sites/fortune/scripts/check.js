const fs = require("fs");
const path = require("path");
const { calculateSaju, calculateSajuSimple } = require("@fullstackfamily/manseryeok");
const { checkContentSite } = require("../../shared/build-content-site");
const { pages } = require("./content");
const { build, root } = require("./build");

checkContentSite({ root, pages, siteUrl: "https://fortune.solforge.cloud", build });

for (const lang of ["ko", "en"]) {
  const personalPage = fs.readFileSync(path.join(root, "dist", lang, "personal-fortune.html"), "utf8");
  if (!personalPage.includes('id="personal-fortune-form"')) throw new Error(`Missing personal fortune form: ${lang}`);
  if (!personalPage.includes('id="birth-time-mode"') || (personalPage.match(/value="branch-\d+"/g) || []).length !== 12) {
    throw new Error(`Missing one or more traditional birth-time periods: ${lang}`);
  }
  if (/<(?:input|select)\b[^>]*\bname=/i.test(personalPage)) throw new Error(`Birth input could be serialized by the browser: ${lang}`);
}

const app = fs.readFileSync(path.join(root, "dist", "assets", "app.js"), "utf8");
if (/\b(?:fetch|localStorage|sessionStorage|indexedDB)\s*[.(]/.test(app) || /document\.cookie/.test(app)) {
  throw new Error("Personal fortune code contains a network or browser persistence API");
}
for (const asset of ["manseryeok.mjs", "manseryeok-LICENSE.txt"]) {
  if (!fs.existsSync(path.join(root, "dist", "assets", asset))) throw new Error(`Missing personal fortune asset: ${asset}`);
}

const representativeHours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
const expectedBranches = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const periodPillars = representativeHours.map((hour) => calculateSajuSimple(1990, 5, 15, hour).hourPillar);
const exactPillars = representativeHours.map((hour) => calculateSaju(1990, 5, 15, hour, 30, { longitude: 127, applyTimeCorrection: true }).hourPillar);
for (const [index, branch] of expectedBranches.entries()) {
  if (!periodPillars[index].endsWith(branch)) throw new Error(`Wrong preset hour branch: ${periodPillars[index]}, expected ${branch}`);
  if (!exactPillars[index].endsWith(branch)) throw new Error(`Wrong exact-time hour branch: ${exactPillars[index]}, expected ${branch}`);
}
if (new Set(periodPillars).size !== 12 || new Set(exactPillars).size !== 12) throw new Error("Birth-time cases did not produce 12 distinct hour pillars");
if (calculateSaju(1990, 5, 15, undefined).hourPillar !== null) throw new Error("Unknown birth time should omit the hour pillar");
console.log(`Checked browser-only input, unknown time and 12 distinct hour pillars: ${periodPillars.join(", ")}.`);
