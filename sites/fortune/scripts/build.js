const fs = require("fs");
const path = require("path");
const { buildContentSite } = require("../../shared/build-content-site");
const { nav, pages } = require("./content");

const root = path.resolve(__dirname, "..");
const signs = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];
const timeBranches = ["ja", "chuk", "in", "myo", "jin", "sa", "o", "mi", "sin", "yu", "sul", "hae"];

function renderFeature({ lang, page, text, t, escapeHtml }) {
  if (page.feature === "daily-zodiac") return `
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

  if (page.feature === "personal-fortune") return `
    <section class="feature-section personal-fortune" aria-labelledby="personal-tool-title">
      <div class="section-heading">
        <div>${text(lang, "personal.eyebrow", "p", ' class="eyebrow"')}${text(lang, "personal.title", "h2", ' id="personal-tool-title"')}</div>
        ${text(lang, "personal.intro", "p")}
      </div>
      <div class="privacy-banner" id="privacy-notice">
        <span class="privacy-icon" aria-hidden="true">🔒</span>
        <div>${text(lang, "personal.privacy.title", "strong")}${text(lang, "personal.privacy.body", "p")}</div>
      </div>
      <form class="birth-form" id="personal-fortune-form" autocomplete="off" aria-describedby="privacy-notice personal-form-note">
        <fieldset>
          <legend>${text(lang, "personal.form.legend")}</legend>
          <div class="birth-fields">
            <label>
              ${text(lang, "personal.form.calendar")}
              <select id="birth-calendar" autocomplete="off">
                ${text(lang, "personal.form.solar", "option", ' value="solar"')}
                ${text(lang, "personal.form.lunar", "option", ' value="lunar"')}
              </select>
            </label>
            <label>
              ${text(lang, "personal.form.date")}
              <input id="birth-date" type="date" min="1900-01-01" max="2050-12-31" required autocomplete="off">
            </label>
            <label>
              ${text(lang, "personal.form.timeChoice")}
              <select id="birth-time-mode" autocomplete="off">
                ${text(lang, "personal.form.timeOption.unknown", "option", ' value="unknown"')}
                ${text(lang, "personal.form.timeOption.exact", "option", ' value="exact"')}
                ${timeBranches.map((branch, index) => text(lang, `personal.form.timeOption.${branch}`, "option", ` value="branch-${index}"`)).join("")}
              </select>
              ${text(lang, "personal.form.timeHelp", "small")}
            </label>
            <label class="exact-time-field" id="exact-time-field" hidden>
              ${text(lang, "personal.form.exactTime")}
              <input id="birth-time" type="time" autocomplete="off">
            </label>
            <label class="leap-month-field" id="leap-month-field" hidden>
              <input id="birth-leap-month" type="checkbox" autocomplete="off">
              <span>${text(lang, "personal.form.leapMonth")}</span>
            </label>
          </div>
          <div class="form-actions">
            <button class="primary-button" type="submit">${text(lang, "personal.form.submit")}</button>
            ${text(lang, "personal.form.note", "p", ' id="personal-form-note"')}
          </div>
          <p class="form-status" id="personal-status" role="status" aria-live="polite"></p>
        </fieldset>
      </form>
      <section class="personal-result" id="personal-result" aria-labelledby="personal-result-title" tabindex="-1" hidden>
        <div class="result-heading">
          <div>${text(lang, "personal.result.eyebrow", "p", ' class="eyebrow"')}${text(lang, "personal.result.title", "h3", ' id="personal-result-title"')}</div>
          <button class="secondary-button" id="clear-personal-result" type="button">${text(lang, "personal.result.clear")}</button>
        </div>
        <p class="result-summary" id="personal-result-summary"></p>
        <div class="pillar-grid" aria-label="${escapeHtml(t(lang, "personal.result.pillarsAria"))}" data-i18n-attrs="aria-label:personal.result.pillarsAria">
          ${["year", "month", "day", "hour"].map((pillar) => `<article><span>${text(lang, `personal.result.${pillar}Pillar`)}</span><strong id="result-${pillar}-pillar" data-result-value></strong></article>`).join("")}
        </div>
        <div class="result-facts">
          <p><span>${text(lang, "personal.result.zodiac")}</span><strong id="result-zodiac" data-result-value></strong></p>
          <p><span>${text(lang, "personal.result.dayMaster")}</span><strong id="result-day-master" data-result-value></strong></p>
          <p><span>${text(lang, "personal.result.today")}</span><strong id="result-today" data-result-value></strong></p>
          <p><span>${text(lang, "personal.result.timeBasis")}</span><strong id="result-time-basis" data-result-value></strong></p>
        </div>
        <div class="element-panel">
          <div>${text(lang, "personal.result.elementsTitle", "h4")}${text(lang, "personal.result.elementsIntro", "p")}</div>
          <div class="element-bars" id="element-bars"></div>
        </div>
        <div class="guidance-grid">
          ${["overall", "work", "money", "relationship", "balance"].map((topic) => `<article><span class="guidance-icon" aria-hidden="true">${{overall:"◉",work:"▦",money:"₩",relationship:"◇",balance:"◐"}[topic]}</span>${text(lang, `personal.result.${topic}.title`, "h4")}<p id="result-${topic}"></p></article>`).join("")}
        </div>
        ${text(lang, "personal.result.disclaimer", "p", ' class="result-disclaimer"')}
      </section>
    </section>`;

  return "";
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
    adsensePublisherId: "ca-pub-1625988263075960",
    buildLabel: "SolForge Fortune"
  });
  const packageRoot = path.resolve(path.dirname(require.resolve("@fullstackfamily/manseryeok")), "..");
  fs.copyFileSync(path.join(packageRoot, "dist", "index.mjs"), path.join(root, "dist", "assets", "manseryeok.mjs"));
  fs.copyFileSync(path.join(packageRoot, "LICENSE"), path.join(root, "dist", "assets", "manseryeok-LICENSE.txt"));
}

if (require.main === module) build();
module.exports = { build, root };
