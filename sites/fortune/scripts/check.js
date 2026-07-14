const fs = require("fs");
const path = require("path");
const { checkContentSite } = require("../../shared/build-content-site");
const { pages } = require("./content");
const { build, root } = require("./build");

checkContentSite({ root, pages, siteUrl: "https://fortune.solforge.cloud", build });

for (const lang of ["ko", "en"]) {
  const personalPage = fs.readFileSync(path.join(root, "dist", lang, "personal-fortune.html"), "utf8");
  if (!personalPage.includes('id="personal-fortune-form"')) throw new Error(`Missing personal fortune form: ${lang}`);
  if (/<(?:input|select)\b[^>]*\bname=/i.test(personalPage)) throw new Error(`Birth input could be serialized by the browser: ${lang}`);
}

const app = fs.readFileSync(path.join(root, "dist", "assets", "app.js"), "utf8");
if (/\b(?:fetch|localStorage|sessionStorage|indexedDB)\s*[.(]/.test(app) || /document\.cookie/.test(app)) {
  throw new Error("Personal fortune code contains a network or browser persistence API");
}
for (const asset of ["manseryeok.mjs", "manseryeok-LICENSE.txt"]) {
  if (!fs.existsSync(path.join(root, "dist", "assets", asset))) throw new Error(`Missing personal fortune asset: ${asset}`);
}
console.log("Checked browser-only birth input handling and Korean almanac assets.");
