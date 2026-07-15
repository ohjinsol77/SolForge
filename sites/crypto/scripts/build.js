const fs = require("fs");
const path = require("path");
const { nav, pages } = require("./content");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const SITE_URL = "https://crypto.solforge.cloud";
const ADSENSE_PUBLISHER_ID = "ca-pub-1625988263075960";
const LANGS = ["ko", "en"];
const locales = Object.fromEntries(
  LANGS.map((lang) => [lang, JSON.parse(fs.readFileSync(path.join(ROOT, "src", "locales", `${lang}.json`), "utf8"))])
);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function t(lang, key) {
  const value = locales[lang]?.[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${lang} translation: ${key}`);
  return value;
}

function text(lang, key, tag = "span", attrs = "") {
  return `<${tag}${attrs} data-i18n="${escapeHtml(key)}">${escapeHtml(t(lang, key))}</${tag}>`;
}

function route(lang, slug) {
  return slug === "index" ? `/${lang}/` : `/${lang}/${slug}`;
}

function renderNav(lang, activeSlug) {
  const mainSiteLink = `<a class="network-home-link" href="https://solforge.cloud/${lang}/"><span aria-hidden="true">←</span>${text(lang, "nav.mainSite")}</a>`;
  const siteLinks = nav.map((item) => {
    const current = item.slug === activeSlug ? ' aria-current="page"' : "";
    return `<a href="${route(lang, item.slug)}"${current}>${text(lang, item.key)}</a>`;
  }).join("");
  return `${mainSiteLink}${siteLinks}`;
}

function renderSnapshot(lang) {
  const cards = [
    ["marketCap", "snapshot.marketCap"],
    ["volume", "snapshot.volume"],
    ["btcDominance", "snapshot.btcDominance"],
    ["sentiment", "snapshot.sentiment"]
  ];
  return `
    <section class="snapshot" aria-labelledby="snapshot-title">
      <div class="section-heading">
        <div>${text(lang, "snapshot.eyebrow", "p", ' class="eyebrow"')}${text(lang, "snapshot.title", "h2", ' id="snapshot-title"')}</div>
        ${text(lang, "snapshot.loading", "p", ' id="snapshot-status" class="status" aria-live="polite"')}
      </div>
      <div class="snapshot-grid">
        ${cards.map(([id, key]) => `<article class="metric"><span data-i18n="${key}">${escapeHtml(t(lang, key))}</span><strong id="snapshot-${id}">—</strong><small id="snapshot-${id}-detail"></small></article>`).join("")}
      </div>
      <div class="market-list-wrap">
        ${text(lang, "snapshot.topAssets", "h3")}
        <div class="market-list" id="snapshot-assets" aria-live="polite"></div>
      </div>
      ${text(lang, "snapshot.note", "p", ' class="source-note"')}
    </section>`;
}

function renderSections(lang, page) {
  return `
    <section class="reading-section" aria-labelledby="reading-title">
      <div class="section-heading">
        <div>${text(lang, `pages.${page.key}.reading.eyebrow`, "p", ' class="eyebrow"')}${text(lang, `pages.${page.key}.reading.title`, "h2", ' id="reading-title"')}</div>
        ${text(lang, `pages.${page.key}.reading.intro`, "p")}
      </div>
      <div class="article-grid">
        ${page.sections.map((section, index) => `
          <article class="article-card">
            <span class="article-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
            ${text(lang, `pages.${page.key}.sections.${section}.title`, "h3")}
            ${text(lang, `pages.${page.key}.sections.${section}.body`, "p")}
          </article>`).join("")}
      </div>
    </section>`;
}

function renderReadingPath(lang, page) {
  if (!page.links) return "";
  return `
    <section class="path-section" aria-labelledby="path-title">
      ${text(lang, "path.eyebrow", "p", ' class="eyebrow"')}
      ${text(lang, "path.title", "h2", ' id="path-title"')}
      <div class="path-grid">
        ${page.links.map((slug) => {
          const linked = pages.find((candidate) => candidate.slug === slug);
          return `<a class="path-card" href="${route(lang, slug)}">${text(lang, `pages.${linked.key}.hero.title`, "strong")}${text(lang, `pages.${linked.key}.meta.description`, "span")}<b aria-hidden="true">→</b></a>`;
        }).join("")}
      </div>
    </section>`;
}

function renderPage(lang, page) {
  const canonicalPath = route(lang, page.slug);
  const otherLang = lang === "ko" ? "en" : "ko";
  const flag = lang === "ko" ? "🇺🇸" : "🇰🇷";
  const languageLabelKey = lang === "ko" ? "language.toEnglish" : "language.toKorean";
  const dynamicTranslations = Object.fromEntries(
    Object.entries(locales[lang]).filter(([key]) => key.startsWith("dynamic."))
  );
  const schema = {
    "@context": "https://schema.org",
    "@type": page.slug === "index" ? "WebSite" : "Article",
    name: t(lang, `pages.${page.key}.meta.title`),
    description: t(lang, `pages.${page.key}.meta.description`),
    url: `${SITE_URL}${canonicalPath}`,
    inLanguage: lang,
    publisher: { "@type": "Organization", name: "SolForge" }
  };

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title data-i18n="pages.${page.key}.meta.title">${escapeHtml(t(lang, `pages.${page.key}.meta.title`))}</title>
    <meta name="description" content="${escapeHtml(t(lang, `pages.${page.key}.meta.description`))}" data-i18n-attrs="content:pages.${page.key}.meta.description">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${SITE_URL}${canonicalPath}">
    <link rel="alternate" hreflang="ko" href="${SITE_URL}${route("ko", page.slug)}">
    <link rel="alternate" hreflang="en" href="${SITE_URL}${route("en", page.slug)}">
    <link rel="alternate" hreflang="x-default" href="${SITE_URL}${route("ko", page.slug)}">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}" crossorigin="anonymous"></script>
    <meta property="og:type" content="${page.slug === "index" ? "website" : "article"}">
    <meta property="og:title" content="${escapeHtml(t(lang, `pages.${page.key}.meta.title`))}">
    <meta property="og:description" content="${escapeHtml(t(lang, `pages.${page.key}.meta.description`))}">
    <meta property="og:url" content="${SITE_URL}${canonicalPath}">
    <meta property="og:site_name" content="SolForge Crypto">
    <meta name="theme-color" content="#08111f">
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/assets/styles.css?v=20260713-2">
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
    <script>window.SFC_LOCALE=${JSON.stringify(lang)};window.SFC_TRANSLATIONS=${JSON.stringify(dynamicTranslations).replace(/</g, "\\u003c")};</script>
    <script src="/assets/app.js?v=20260713-1" defer></script>
  </head>
  <body data-page="${page.slug}">
    <a class="skip-link" href="#main">${text(lang, "accessibility.skip")}</a>
    <header class="site-header">
      <a class="brand" href="${route(lang, "index")}" aria-label="SolForge Crypto">
        <span class="brand-mark" aria-hidden="true">SF</span>
        <span>${text(lang, "brand.name", "strong")}${text(lang, "brand.tagline", "small")}</span>
      </a>
      <nav class="primary-nav" aria-label="${escapeHtml(t(lang, "nav.aria"))}" data-i18n-attrs="aria-label:nav.aria">${renderNav(lang, page.slug)}</nav>
      <a class="language-toggle" href="${route(otherLang, page.slug)}" aria-label="${escapeHtml(t(lang, languageLabelKey))}" data-i18n-attrs="aria-label:${languageLabelKey}">${flag}</a>
    </header>
    <main id="main">
      <section class="hero">
        <div>
          ${text(lang, `pages.${page.key}.hero.eyebrow`, "p", ' class="eyebrow"')}
          ${text(lang, `pages.${page.key}.hero.title`, "h1")}
          ${text(lang, `pages.${page.key}.hero.body`, "p", ' class="hero-copy"')}
        </div>
        <aside class="hero-note">
          ${text(lang, `pages.${page.key}.hero.noteTitle`, "strong")}
          ${text(lang, `pages.${page.key}.hero.noteBody`, "p")}
        </aside>
      </section>
      ${page.snapshot ? renderSnapshot(lang) : ""}
      ${renderSections(lang, page)}
      ${renderReadingPath(lang, page)}
    </main>
    <footer class="site-footer">
      <div>${text(lang, "footer.summary", "strong")}${text(lang, "footer.disclaimer", "p")}</div>
      <nav aria-label="${escapeHtml(t(lang, "footer.aria"))}" data-i18n-attrs="aria-label:footer.aria">
        <a href="${route(lang, "methodology")}">${text(lang, "footer.methodology")}</a>
        <a href="${route(lang, "about")}">${text(lang, "footer.about")}</a>
        <a href="${route(lang, "privacy")}">${text(lang, "footer.privacy")}</a>
        <a href="https://solforge.cloud/${lang}/contact">${text(lang, "footer.contact")}</a>
      </nav>
    </footer>
  </body>
</html>\n`;
}

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function build() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  copyDir(path.join(ROOT, "src", "assets"), path.join(DIST, "assets"));

  for (const lang of LANGS) {
    const target = path.join(DIST, lang);
    fs.mkdirSync(target, { recursive: true });
    for (const page of pages) {
      fs.writeFileSync(path.join(target, `${page.slug}.html`), renderPage(lang, page));
    }
  }

  fs.writeFileSync(path.join(DIST, "index.html"), '<!doctype html><html lang="ko"><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/ko/"><title>SolForge Crypto</title><a href="/ko/">한국어 사이트로 이동</a></html>\n');
  fs.writeFileSync(path.join(DIST, "_redirects"), "/ /ko/ 302\n");
  fs.writeFileSync(path.join(DIST, "_headers"), "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n");
  fs.writeFileSync(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  fs.writeFileSync(path.join(DIST, "ads.txt"), `google.com, ${ADSENSE_PUBLISHER_ID.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`);

  const sitemapUrls = pages.flatMap((page) => LANGS.map((lang) => `${SITE_URL}${route(lang, page.slug)}`));
  fs.writeFileSync(path.join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`);
  console.log(`Built SolForge Crypto: ${pages.length * LANGS.length} localized pages.`);
}

build();
