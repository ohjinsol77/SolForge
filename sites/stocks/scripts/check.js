const fs = require("fs");
const path = require("path");
const { checkContentSite } = require("../../shared/build-content-site");
const { pages } = require("./content");
const { build, root } = require("./build");

checkContentSite({ root, pages, siteUrl: "https://stocks.solforge.cloud", build });

const app = fs.readFileSync(path.join(root, "src", "assets", "app.js"), "utf8");
const marketFunction = fs.readFileSync(path.join(root, "functions", "api", "markets.js"), "utf8");
if (!app.includes('fetch("/api/markets"')) throw new Error("Stock board must use the same-origin market endpoint.");
if (/allorigins|query1\.finance\.yahoo/i.test(app)) throw new Error("Unreliable browser-side market relays must not be used.");
for (const marker of ["KOSPI", "KOSDAQ", ".INX", ".IXIC", ".DJI", ".N225", "stock/domestic/integration", "FX_USDKRW", "priceTop"]) {
  if (!marketFunction.includes(marker)) throw new Error(`Missing market source mapping: ${marker}`);
}
if (!app.includes("60000")) throw new Error("Korean market dashboard must retain its visible-page refresh interval.");

for (const lang of ["ko", "en"]) {
  const koreaMarket = fs.readFileSync(path.join(root, "dist", lang, "korea-market.html"), "utf8");
  for (const marker of ["korea-dashboard", "domestic-kospi-price", "domestic-kosdaq-price", "exchange-usd-price", "leaders-kospi", "leaders-kosdaq"]) {
    if (!koreaMarket.includes(marker)) throw new Error(`Missing ${lang} Korean market dashboard marker: ${marker}`);
  }
}
