const fs = require("fs");
const path = require("path");
const { checkContentSite } = require("../../shared/build-content-site");
const { pages } = require("./content");
const { build, root } = require("./build");

checkContentSite({ root, pages, siteUrl: "https://stocks.solforge.cloud", build });

const app = fs.readFileSync(path.join(root, "src", "assets", "app.js"), "utf8");
const marketFunction = fs.readFileSync(path.join(root, "functions", "api", "markets.js"), "utf8");
new Function(marketFunction.replace("export async function onRequestGet", "async function onRequestGet"));
if (!app.includes('fetch("/api/markets"')) throw new Error("Stock board must use the same-origin market endpoint.");
if (/allorigins|query1\.finance\.yahoo/i.test(app)) throw new Error("Unreliable browser-side market relays must not be used.");
for (const marker of ["KOSPI", "KOSDAQ", ".INX", ".IXIC", ".DJI", ".N225", ".VIX", ".DXY", "US10YT=RR", "stock/domestic/integration", "worldstock/exchange/stock/list", "FX_USDKRW", "priceTop"]) {
  if (!marketFunction.includes(marker)) throw new Error(`Missing market source mapping: ${marker}`);
}
for (const marker of ["globalDashboard", "globalIndexes", "globalContext", "globalLeaders", "60000"]) {
  if (!app.includes(marker)) throw new Error(`Missing global dashboard client marker: ${marker}`);
}

for (const lang of ["ko", "en"]) {
  const koreaMarket = fs.readFileSync(path.join(root, "dist", lang, "korea-market.html"), "utf8");
  for (const marker of ["korea-dashboard", "domestic-kospi-price", "domestic-kosdaq-price", "exchange-usd-price", "leaders-kospi", "leaders-kosdaq"]) {
    if (!koreaMarket.includes(marker)) throw new Error(`Missing ${lang} Korean market dashboard marker: ${marker}`);
  }
  const globalMarket = fs.readFileSync(path.join(root, "dist", lang, "global-market.html"), "utf8");
  for (const marker of ["global-dashboard", "global-gspc-price", "global-ixic-price", "global-dji-price", "global-n225-price", "context-us10y-price", "context-dxy-price", "context-vix-price", "global-leaders-nasdaq", "global-leaders-nyse"]) {
    if (!globalMarket.includes(marker)) throw new Error(`Missing ${lang} global market dashboard marker: ${marker}`);
  }
  if (!globalMarket.includes('"globalDashboard.loaded"')) throw new Error(`Missing ${lang} global dashboard client translations.`);
}
