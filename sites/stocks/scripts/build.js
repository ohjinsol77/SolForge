const path = require("path");
const { buildContentSite } = require("../../shared/build-content-site");
const { nav, pages } = require("./content");

const root = path.resolve(__dirname, "..");

function renderFeature({ lang, page, text, t, escapeHtml }) {
  if (page.feature === "market-board") {
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

  if (page.feature === "global-dashboard") {
    const indexCard = (id, nameKey) => `
      <article class="global-index-card" id="global-${id}">
        <div class="index-card-heading">
          <div><div class="market-name-row"><span class="market-label" data-i18n="${escapeHtml(nameKey)}">${escapeHtml(t(lang, nameKey))}</span><span class="session-badge" id="global-${id}-status">—</span></div><strong id="global-${id}-price">—</strong></div>
          <small id="global-${id}-change">—</small>
        </div>
        <dl class="market-metrics">
          <div><dt data-i18n="globalDashboard.previousClose">${escapeHtml(t(lang, "globalDashboard.previousClose"))}</dt><dd id="global-${id}-previous">—</dd></div>
          <div><dt data-i18n="globalDashboard.open">${escapeHtml(t(lang, "globalDashboard.open"))}</dt><dd id="global-${id}-open">—</dd></div>
          <div><dt data-i18n="globalDashboard.dayRange">${escapeHtml(t(lang, "globalDashboard.dayRange"))}</dt><dd id="global-${id}-range">—</dd></div>
          <div><dt data-i18n="globalDashboard.volume">${escapeHtml(t(lang, "globalDashboard.volume"))}</dt><dd id="global-${id}-volume">—</dd></div>
          <div><dt data-i18n="globalDashboard.yearRange">${escapeHtml(t(lang, "globalDashboard.yearRange"))}</dt><dd id="global-${id}-year-range">—</dd></div>
        </dl>
      </article>`;

    const contextCard = (id, key) => `<article class="exchange-card global-context-card"><span data-i18n="${escapeHtml(key)}">${escapeHtml(t(lang, key))}</span><strong id="context-${id}-price">—</strong><small id="context-${id}-change">—</small></article>`;
    const leaderPanel = (id, key) => `
      <article class="leader-panel">
        <div class="leader-heading"><h3 data-i18n="${escapeHtml(key)}">${escapeHtml(t(lang, key))}</h3><span data-i18n="globalDashboard.rankValue">${escapeHtml(t(lang, "globalDashboard.rankValue"))}</span></div>
        <div class="leader-list" id="global-leaders-${id}"><p class="data-placeholder" data-i18n="globalDashboard.loading">${escapeHtml(t(lang, "globalDashboard.loading"))}</p></div>
      </article>`;

    return `
      <section class="feature-section global-dashboard" id="global-dashboard" aria-labelledby="global-dashboard-title">
        <div class="section-heading dashboard-heading">
          <div>${text(lang, "globalDashboard.eyebrow", "p", ' class="eyebrow"')}${text(lang, "globalDashboard.title", "h2", ' id="global-dashboard-title"')}${text(lang, "globalDashboard.intro", "p", ' class="section-intro"')}</div>
          ${text(lang, "globalDashboard.loading", "p", ' id="global-dashboard-status" class="market-status" aria-live="polite"')}
        </div>
        <div class="global-index-grid">
          ${indexCard("gspc", "snapshot.sp500")}
          ${indexCard("ixic", "snapshot.nasdaq")}
          ${indexCard("dji", "snapshot.dow")}
          ${indexCard("n225", "snapshot.nikkei")}
        </div>
        <div class="dashboard-subheading"><div><p class="eyebrow" data-i18n="globalDashboard.contextEyebrow">${escapeHtml(t(lang, "globalDashboard.contextEyebrow"))}</p><h3 data-i18n="globalDashboard.contextTitle">${escapeHtml(t(lang, "globalDashboard.contextTitle"))}</h3></div><p data-i18n="globalDashboard.contextIntro">${escapeHtml(t(lang, "globalDashboard.contextIntro"))}</p></div>
        <div class="global-context-grid">
          ${contextCard("usd", "globalDashboard.usd")}
          ${contextCard("us10y", "globalDashboard.us10y")}
          ${contextCard("dxy", "globalDashboard.dxy")}
          ${contextCard("vix", "globalDashboard.vix")}
        </div>
        <div class="dashboard-subheading"><div><p class="eyebrow" data-i18n="globalDashboard.rankEyebrow">${escapeHtml(t(lang, "globalDashboard.rankEyebrow"))}</p><h3 data-i18n="globalDashboard.rankTitle">${escapeHtml(t(lang, "globalDashboard.rankTitle"))}</h3></div><p data-i18n="globalDashboard.rankIntro">${escapeHtml(t(lang, "globalDashboard.rankIntro"))}</p></div>
        <div class="leader-grid">
          ${leaderPanel("nasdaq", "globalDashboard.nasdaqLeaders")}
          ${leaderPanel("nyse", "globalDashboard.nyseLeaders")}
        </div>
        ${text(lang, "globalDashboard.note", "p", ' class="source-note dashboard-note"')}
      </section>`;
  }

  if (page.feature !== "korea-dashboard") return "";
  const indexCard = (id, nameKey) => `
    <article class="domestic-index-card" id="domestic-${id}">
      <div class="index-card-heading">
        <div><div class="market-name-row"><span class="market-label" data-i18n="${escapeHtml(nameKey)}">${escapeHtml(t(lang, nameKey))}</span><span class="session-badge" id="domestic-${id}-status">—</span></div><strong id="domestic-${id}-price">—</strong></div>
        <small id="domestic-${id}-change">—</small>
      </div>
      <dl class="market-metrics">
        <div><dt data-i18n="koreaDashboard.open">${escapeHtml(t(lang, "koreaDashboard.open"))}</dt><dd id="domestic-${id}-open">—</dd></div>
        <div><dt data-i18n="koreaDashboard.dayRange">${escapeHtml(t(lang, "koreaDashboard.dayRange"))}</dt><dd id="domestic-${id}-range">—</dd></div>
        <div><dt data-i18n="koreaDashboard.volume">${escapeHtml(t(lang, "koreaDashboard.volume"))}</dt><dd id="domestic-${id}-volume">—</dd></div>
        <div><dt data-i18n="koreaDashboard.tradingValue">${escapeHtml(t(lang, "koreaDashboard.tradingValue"))}</dt><dd id="domestic-${id}-value">—</dd></div>
        <div><dt data-i18n="koreaDashboard.yearRange">${escapeHtml(t(lang, "koreaDashboard.yearRange"))}</dt><dd id="domestic-${id}-year-range">—</dd></div>
      </dl>
      <div class="breadth-block">
        <strong data-i18n="koreaDashboard.breadth">${escapeHtml(t(lang, "koreaDashboard.breadth"))}</strong>
        <div class="breadth-bar" id="domestic-${id}-breadth-bar" aria-hidden="true"><span data-direction="up"></span><span data-direction="flat"></span><span data-direction="down"></span></div>
        <div class="breadth-counts">
          <span><i data-direction="up"></i><span data-i18n="koreaDashboard.rising">${escapeHtml(t(lang, "koreaDashboard.rising"))}</span> <b id="domestic-${id}-rising">—</b></span>
          <span><i data-direction="flat"></i><span data-i18n="koreaDashboard.steady">${escapeHtml(t(lang, "koreaDashboard.steady"))}</span> <b id="domestic-${id}-steady">—</b></span>
          <span><i data-direction="down"></i><span data-i18n="koreaDashboard.falling">${escapeHtml(t(lang, "koreaDashboard.falling"))}</span> <b id="domestic-${id}-falling">—</b></span>
        </div>
      </div>
      <div class="flow-block">
        <strong data-i18n="koreaDashboard.flows">${escapeHtml(t(lang, "koreaDashboard.flows"))}</strong>
        <small data-i18n="koreaDashboard.flowUnit">${escapeHtml(t(lang, "koreaDashboard.flowUnit"))}</small>
        <dl class="flow-grid">
          <div><dt data-i18n="koreaDashboard.personal">${escapeHtml(t(lang, "koreaDashboard.personal"))}</dt><dd id="domestic-${id}-personal">—</dd></div>
          <div><dt data-i18n="koreaDashboard.foreign">${escapeHtml(t(lang, "koreaDashboard.foreign"))}</dt><dd id="domestic-${id}-foreign">—</dd></div>
          <div><dt data-i18n="koreaDashboard.institutional">${escapeHtml(t(lang, "koreaDashboard.institutional"))}</dt><dd id="domestic-${id}-institutional">—</dd></div>
        </dl>
      </div>
    </article>`;

  const exchangeCard = (id, key) => `<article class="exchange-card"><span data-i18n="${escapeHtml(key)}">${escapeHtml(t(lang, key))}</span><strong id="exchange-${id}-price">—</strong><small id="exchange-${id}-change">—</small></article>`;
  const leaderPanel = (id, nameKey) => `
    <article class="leader-panel">
      <div class="leader-heading"><h3 data-i18n="${escapeHtml(nameKey)}">${escapeHtml(t(lang, nameKey))}</h3><span data-i18n="koreaDashboard.rankValue">${escapeHtml(t(lang, "koreaDashboard.rankValue"))}</span></div>
      <div class="leader-list" id="leaders-${id}"><p class="data-placeholder" data-i18n="koreaDashboard.loading">${escapeHtml(t(lang, "koreaDashboard.loading"))}</p></div>
    </article>`;

  return `
    <section class="feature-section korea-dashboard" id="korea-dashboard" aria-labelledby="korea-dashboard-title">
      <div class="section-heading dashboard-heading">
        <div>${text(lang, "koreaDashboard.eyebrow", "p", ' class="eyebrow"')}${text(lang, "koreaDashboard.title", "h2", ' id="korea-dashboard-title"')}${text(lang, "koreaDashboard.intro", "p", ' class="section-intro"')}</div>
        ${text(lang, "koreaDashboard.loading", "p", ' id="korea-dashboard-status" class="market-status" aria-live="polite"')}
      </div>
      <div class="domestic-index-grid">
        ${indexCard("kospi", "snapshot.kospi")}
        ${indexCard("kosdaq", "snapshot.kosdaq")}
      </div>
      <div class="dashboard-subheading"><div><p class="eyebrow" data-i18n="koreaDashboard.currencyEyebrow">${escapeHtml(t(lang, "koreaDashboard.currencyEyebrow"))}</p><h3 data-i18n="koreaDashboard.currencyTitle">${escapeHtml(t(lang, "koreaDashboard.currencyTitle"))}</h3></div><p data-i18n="koreaDashboard.currencyIntro">${escapeHtml(t(lang, "koreaDashboard.currencyIntro"))}</p></div>
      <div class="exchange-grid">
        ${exchangeCard("usd", "koreaDashboard.usd")}
        ${exchangeCard("jpy", "koreaDashboard.jpy")}
        ${exchangeCard("eur", "koreaDashboard.eur")}
      </div>
      <div class="dashboard-subheading"><div><p class="eyebrow" data-i18n="koreaDashboard.rankEyebrow">${escapeHtml(t(lang, "koreaDashboard.rankEyebrow"))}</p><h3 data-i18n="koreaDashboard.rankTitle">${escapeHtml(t(lang, "koreaDashboard.rankTitle"))}</h3></div><p data-i18n="koreaDashboard.rankIntro">${escapeHtml(t(lang, "koreaDashboard.rankIntro"))}</p></div>
      <div class="leader-grid">
        ${leaderPanel("kospi", "koreaDashboard.kospiLeaders")}
        ${leaderPanel("kosdaq", "koreaDashboard.kosdaqLeaders")}
      </div>
      ${text(lang, "koreaDashboard.note", "p", ' class="source-note dashboard-note"')}
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
    clientTranslationPrefixes: ["dynamic.", "koreaDashboard.", "globalDashboard."],
    assetVersion: "20260715-1",
    adsensePublisherId: "ca-pub-1625988263075960",
    buildLabel: "SolForge Stocks"
  });
}

if (require.main === module) build();
module.exports = { build, root };
