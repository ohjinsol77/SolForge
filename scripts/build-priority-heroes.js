const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const sourceCss = path.join(ROOT, "assets", "css", "styles.css");
const targetCss = path.join(DIST, "assets", "css", "styles.css");
const sourceImages = path.join(ROOT, "assets", "img", "priority-heroes");
const targetImages = path.join(DIST, "assets", "img", "priority-heroes");
const requiredPages = [
  "ko/index.html",
  "en/index.html",
  "ko/tools/mapleland-boss-timer.html",
  "ko/tools/zeus-boss-timer.html",
  "ko/tools/all.html",
  "en/tools/all.html"
];

if (!fs.existsSync(DIST) || requiredPages.some((file) => !fs.existsSync(path.join(DIST, file)))) {
  throw new Error("dist is missing or stale. Run npm run build once before using npm run build:heroes.");
}

fs.mkdirSync(path.dirname(targetCss), { recursive: true });
fs.copyFileSync(sourceCss, targetCss);
fs.mkdirSync(targetImages, { recursive: true });
for (const file of fs.readdirSync(sourceImages)) {
  fs.copyFileSync(path.join(sourceImages, file), path.join(targetImages, file));
}

console.log(`Updated priority hero CSS and ${fs.readdirSync(sourceImages).length} image assets without rebuilding page HTML.`);
