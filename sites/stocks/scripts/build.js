const path = require("path");
const { buildContentSite } = require("../../shared/build-content-site");
const { nav, pages } = require("./content");

const root = path.resolve(__dirname, "..");

function renderFeature({ lang, page, text, t, escapeHtml }) {
  if (page.feature !== "market-board") return "";
  const symbols = [
    ["ks11", "snapshot.kospi"],
    ["kq11", "snapshot.kosdaq"],
    ["gspc", "snapshot.sp500"],
    ["ixic", "snapshot.nasdaq"],
    ["dji", "snapshot.dow"],
    ["n225", "snapshot.nikkei"]
  ];
  return `
    <section class="feature-section market-board" aria-labelledby="market-board-title">
      <div class="section-heading">
        <div>${text(lang, "snapshot.eyebrow", "p", ' class="eyebrow"')}${text(lang, "snapshot.title", "h2", ' id="market-board-title"')}</div>
        ${text(lang, "snapshot.loading", "p", ' id="market-status" class="market-status" aria-live="polite"')}
      </div>
      <div class="market-card-grid" id="market-board">
        ${symbols.map(([id, key]) => `<article class="market-card"><span data-i18n="${escapeHtml(key)}">${escapeHtml(t(lang, key))}</span><strong id="market-${id}">—</strong><small id="market-${id}-detail">—</small></article>`).join("")}
      </div>
      ${text(lang, "snapshot.note", "p", ' class="source-note"')}
    </section>`;
}

function build() {
  buildContentSite({
    root,
    siteUrl: "https://stocks.solforge.cloud",
    siteName: "SolForge Stocks",
    brandMark: "ST",
    themeColor: "#f5f7fb",
    nav,
    pages,
    renderFeature,
    buildLabel: "SolForge Stocks"
  });
}

if (require.main === module) build();
module.exports = { build, root };
