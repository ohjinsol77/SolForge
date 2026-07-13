const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://solforge.cloud";
const LANGS = ["ko", "en"];
const DEFAULT_LANG = "ko";
const SOURCE_HTML_FILES = [
  "index.html",
  "features.html",
  "about.html",
  "terms.html",
  "privacy.html",
  "contact.html",
  "guides/hardware-checks.html",
  "guides/local-file-processing.html",
  "guides/korean-life-calculations.html",
  "guides/pip-mapleland.html",
  "tools/advanced-toolbox.html",
  "tools/all.html",
  "tools/crypto-sentiment.html",
  "tools/device-diagnostics.html",
  "tools/display-diagnostics.html",
  "tools/file-media-toolbox.html",
  "tools/gaming-calculators.html",
  "tools/gaming-lab.html",
  "tools/global-stocks.html",
  "tools/input-training.html",
  "tools/korea-stocks.html",
  "tools/mapleland-boss-timer.html",
  "tools/mysql-explain-visual.html",
  "tools/mysql-query-prettier.html",
  "tools/npm-package-info.html",
  "tools/performance-lab.html",
  "tools/pip-toolbox.html",
  "tools/utility-toolbox.html",
  "tools/world-holidays.html",
  "calculators/age.html",
  "calculators/all.html",
  "calculators/anniversary.html",
  "calculators/date.html",
  "calculators/school.html"
];

function readText(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function writeText(file, content) {
  const target = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function readJson(file, fallback = {}) {
  const target = path.join(ROOT, file);
  if (!fs.existsSync(target)) return fallback;
  return JSON.parse(fs.readFileSync(target, "utf8"));
}

function writeJson(file, value) {
  writeText(file, `${JSON.stringify(value, null, 2)}\n`);
}

function toPageKey(file) {
  if (file === "index.html") return "home";
  return file
    .replace(/\.html$/, "")
    .replace(/\//g, ".")
    .replace(/[^a-z0-9.]+/gi, "-")
    .toLowerCase();
}

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function attrEscape(value) {
  return htmlEscape(value).replace(/"/g, "&quot;");
}

function decodeEntities(value) {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)));
}

function parseAttributes(raw) {
  const attrs = {};
  raw.replace(/([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g, (_m, name, d, s, bare) => {
    attrs[name] = d ?? s ?? bare ?? "";
    return "";
  });
  return attrs;
}

function setAttribute(tag, name, value) {
  const escaped = attrEscape(value);
  const attrPattern = new RegExp(`\\s${name}=(?:"[^"]*"|'[^']*'|[^\\s>]+)`);
  if (attrPattern.test(tag)) return tag.replace(attrPattern, ` ${name}="${escaped}"`);
  return tag.replace(/\/?>$/, (end) => ` ${name}="${escaped}"${end}`);
}

function removeAttribute(tag, name) {
  const attrPattern = new RegExp(`\\s${name}=(?:"[^"]*"|'[^']*'|[^\\s>]+)`, "g");
  return tag.replace(attrPattern, "");
}

function normalizePagePath(file) {
  return file === "index.html" ? "" : file.replace(/\.html$/, "");
}

function localizedPath(lang, file) {
  const normalized = normalizePagePath(file);
  return `/${lang}/${normalized}`.replace(/\/$/, "/");
}

function localizedUrl(lang, file) {
  return `${SITE_URL}${localizedPath(lang, file)}`;
}

function sourceFiles() {
  return SOURCE_HTML_FILES.filter((file) => fs.existsSync(path.join(ROOT, file)));
}

module.exports = {
  ROOT,
  SITE_URL,
  LANGS,
  DEFAULT_LANG,
  SOURCE_HTML_FILES,
  attrEscape,
  decodeEntities,
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
  toPageKey,
  writeJson,
  writeText
};
