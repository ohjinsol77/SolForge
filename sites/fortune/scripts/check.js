const fs = require("fs");
const path = require("path");
const { calculateSaju, calculateSajuSimple, lunarToSolar } = require("@fullstackfamily/manseryeok");
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

function exactPillarsFor(year, month, day, hour = 14, minute = 30) {
  const result = calculateSaju(year, month, day, hour, minute, { longitude: 127, applyTimeCorrection: true });
  return [result.yearPillar, result.monthPillar, result.dayPillar, result.hourPillar].join("/");
}

const dateCases = [
  [[1990, 5, 15], "경오/신사/경진/계미"],
  [[1990, 5, 16], "경오/신사/신사/을미"],
  [[1990, 6, 15], "경오/임오/신해/을미"],
  [[1991, 5, 15], "신미/계사/을유/계미"]
];
for (const [[year, month, day], expected] of dateCases) {
  const actual = exactPillarsFor(year, month, day);
  if (actual !== expected) throw new Error(`Birth-date result mismatch for ${year}-${month}-${day}: ${actual}, expected ${expected}`);
}

const lunarCases = [
  [[1990, 4, 21, false], "경오/신사/경진/계미"],
  [[1990, 5, 15, false], "경오/임오/계묘/기미"],
  [[2017, 5, 1, false], "정유/을사/계축/기미"],
  [[2017, 5, 1, true], "정유/병오/임오/정미"]
];
for (const [[year, month, day, isLeapMonth], expected] of lunarCases) {
  const converted = lunarToSolar(year, month, day, isLeapMonth).solar;
  const actual = exactPillarsFor(converted.year, converted.month, converted.day);
  if (actual !== expected) throw new Error(`Lunar result mismatch for ${year}-${month}-${day} leap=${isLeapMonth}: ${actual}, expected ${expected}`);
}

const beforeBoundary = calculateSaju(1990, 5, 15, 1, 30, { longitude: 127, applyTimeCorrection: true }).hourPillar;
const afterBoundary = calculateSaju(1990, 5, 15, 1, 40, { longitude: 127, applyTimeCorrection: true }).hourPillar;
if (beforeBoundary !== "병자" || afterBoundary !== "정축") throw new Error(`Corrected exact-time boundary mismatch: ${beforeBoundary}/${afterBoundary}`);

console.log(`Checked browser-only input, calendar/date matrix, unknown time and 12 distinct hour pillars: ${periodPillars.join(", ")}.`);
