const path = require("path");
const { buildContentSite } = require("../../shared/build-content-site");
const { nav, pages } = require("./content");

const root = path.resolve(__dirname, "..");
const signs = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];

function renderFeature({ lang, page, text, t, escapeHtml }) {
  if (page.feature !== "daily-zodiac") return "";
  return `
    <section class="feature-section daily-fortune" aria-labelledby="daily-title">
      <div class="section-heading">
        <div>${text(lang, "daily.eyebrow", "p", ' class="eyebrow"')}${text(lang, "daily.title", "h2", ' id="daily-title"')}</div>
        <p class="daily-date" id="daily-date" aria-live="polite">${escapeHtml(t(lang, "daily.loading"))}</p>
      </div>
      <div class="fortune-grid" id="fortune-grid">
        ${signs.map((sign, index) => `<article class="fortune-card"><span class="fortune-symbol" aria-hidden="true">${["🐭","🐮","🐯","🐰","🐲","🐍","🐴","🐑","🐵","🐔","🐶","🐷"][index]}</span><strong data-i18n="dynamic.sign.${sign}">${escapeHtml(t(lang, `dynamic.sign.${sign}`))}</strong><p id="fortune-${sign}">${escapeHtml(t(lang, "daily.loadingCard"))}</p></article>`).join("")}
      </div>
      ${text(lang, "daily.note", "p", ' class="source-note"')}
    </section>`;
}

function build() {
  buildContentSite({
    root,
    siteUrl: "https://fortune.solforge.cloud",
    siteName: "SolForge Fortune",
    brandMark: "福",
    themeColor: "#fbf7f0",
    nav,
    pages,
    renderFeature,
    buildLabel: "SolForge Fortune"
  });
}

if (require.main === module) build();
module.exports = { build, root };
