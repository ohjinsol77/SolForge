const fs = require("fs");
const path = require("path");

function buildContentSite(config) {
  const {
    root,
    siteUrl,
    siteName,
    pages,
    nav,
    renderFeature = () => "",
    buildLabel = siteName
  } = config;
  const dist = path.join(root, "dist");
  const langs = ["ko", "en"];
  const locales = Object.fromEntries(
    langs.map((lang) => [lang, JSON.parse(fs.readFileSync(path.join(root, "src", "locales", `${lang}.json`), "utf8"))])
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
    return nav.map((item) => {
      const current = item.slug === activeSlug ? ' aria-current="page"' : "";
      return `<a href="${route(lang, item.slug)}"${current}>${text(lang, item.key)}</a>`;
    }).join("");
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

  function renderPath(lang, page) {
    if (!page.links?.length) return "";
    return `
      <section class="path-section" aria-labelledby="path-title">
        ${text(lang, "path.eyebrow", "p", ' class="eyebrow"')}
        ${text(lang, "path.title", "h2", ' id="path-title"')}
        <div class="path-grid">
          ${page.links.map((slug) => {
            const linked = pages.find((candidate) => candidate.slug === slug);
            if (!linked) throw new Error(`Unknown linked page: ${slug}`);
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
    const dynamicTranslations = Object.fromEntries(Object.entries(locales[lang]).filter(([key]) => key.startsWith("dynamic.")));
    const schema = {
      "@context": "https://schema.org",
      "@type": page.slug === "index" ? "WebSite" : "Article",
      name: t(lang, `pages.${page.key}.meta.title`),
      description: t(lang, `pages.${page.key}.meta.description`),
      url: `${siteUrl}${canonicalPath}`,
      inLanguage: lang,
      publisher: { "@type": "Organization", name: "SolForge" }
    };
    const feature = renderFeature({ lang, page, text, t, escapeHtml, route });

    return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title data-i18n="pages.${page.key}.meta.title">${escapeHtml(t(lang, `pages.${page.key}.meta.title`))}</title>
    <meta name="description" content="${escapeHtml(t(lang, `pages.${page.key}.meta.description`))}" data-i18n-attrs="content:pages.${page.key}.meta.description">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${siteUrl}${canonicalPath}">
    <link rel="alternate" hreflang="ko" href="${siteUrl}${route("ko", page.slug)}">
    <link rel="alternate" hreflang="en" href="${siteUrl}${route("en", page.slug)}">
    <link rel="alternate" hreflang="x-default" href="${siteUrl}${route("ko", page.slug)}">
    <meta property="og:type" content="${page.slug === "index" ? "website" : "article"}">
    <meta property="og:title" content="${escapeHtml(t(lang, `pages.${page.key}.meta.title`))}">
    <meta property="og:description" content="${escapeHtml(t(lang, `pages.${page.key}.meta.description`))}">
    <meta property="og:url" content="${siteUrl}${canonicalPath}">
    <meta property="og:site_name" content="${escapeHtml(siteName)}">
    <meta name="theme-color" content="${escapeHtml(config.themeColor)}">
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/assets/base.css?v=20260713-1">
    <link rel="stylesheet" href="/assets/site.css?v=20260713-1">
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
    <script>window.SF_SITE_LOCALE=${JSON.stringify(lang)};window.SF_SITE_TRANSLATIONS=${JSON.stringify(dynamicTranslations).replace(/</g, "\\u003c")};</script>
    <script src="/assets/app.js?v=20260713-1" defer></script>
  </head>
  <body data-page="${page.slug}">
    <a class="skip-link" href="#main">${text(lang, "accessibility.skip")}</a>
    <header class="site-header">
      <a class="brand" href="${route(lang, "index")}" aria-label="${escapeHtml(siteName)}">
        <span class="brand-mark" aria-hidden="true">${escapeHtml(config.brandMark)}</span>
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
        <aside class="hero-note">${text(lang, `pages.${page.key}.hero.noteTitle`, "strong")}${text(lang, `pages.${page.key}.hero.noteBody`, "p")}</aside>
      </section>
      ${feature}
      ${renderSections(lang, page)}
      ${renderPath(lang, page)}
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
    if (!fs.existsSync(source)) return;
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      const from = path.join(source, entry.name);
      const to = path.join(target, entry.name);
      if (entry.isDirectory()) copyDir(from, to);
      else fs.copyFileSync(from, to);
    }
  }

  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(path.join(dist, "assets"), { recursive: true });
  fs.copyFileSync(path.join(__dirname, "assets", "base.css"), path.join(dist, "assets", "base.css"));
  copyDir(path.join(root, "src", "assets"), path.join(dist, "assets"));

  for (const lang of langs) {
    const target = path.join(dist, lang);
    fs.mkdirSync(target, { recursive: true });
    for (const page of pages) fs.writeFileSync(path.join(target, `${page.slug}.html`), renderPage(lang, page));
  }

  fs.writeFileSync(path.join(dist, "index.html"), `<!doctype html><html lang="ko"><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/ko/"><title>${escapeHtml(siteName)}</title><a href="/ko/">한국어 사이트로 이동</a></html>\n`);
  fs.writeFileSync(path.join(dist, "_redirects"), "/ /ko/ 302\n");
  fs.writeFileSync(path.join(dist, "_headers"), "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n");
  fs.writeFileSync(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
  const sitemapUrls = pages.flatMap((page) => langs.map((lang) => `${siteUrl}${route(lang, page.slug)}`));
  fs.writeFileSync(path.join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`);
  console.log(`Built ${buildLabel}: ${pages.length * langs.length} localized pages.`);
}

function checkContentSite({ root, pages, siteUrl, build }) {
  const locales = ["ko", "en"].map((lang) => JSON.parse(fs.readFileSync(path.join(root, "src", "locales", `${lang}.json`), "utf8")));
  const keySets = locales.map((locale) => new Set(Object.keys(locale)));
  const missingKo = [...keySets[1]].filter((key) => !keySets[0].has(key));
  const missingEn = [...keySets[0]].filter((key) => !keySets[1].has(key));
  if (missingKo.length || missingEn.length) throw new Error(`Locale key mismatch. Missing ko: ${missingKo.join(", ")} Missing en: ${missingEn.join(", ")}`);
  build();
  for (const lang of ["ko", "en"]) {
    for (const page of pages) {
      const file = path.join(root, "dist", lang, `${page.slug}.html`);
      const html = fs.readFileSync(file, "utf8");
      if (!html.includes(`<html lang="${lang}">`)) throw new Error(`Wrong language marker: ${file}`);
      if (!html.includes(`${siteUrl}/${lang}/`)) throw new Error(`Missing localized canonical: ${file}`);
      if (lang === "en" && /[가-힣]/.test(html)) throw new Error(`Korean text remains in English output: ${file}`);
    }
  }
  console.log(`Checked ${pages.length * 2} localized pages and matching locale keys.`);
}

module.exports = { buildContentSite, checkContentSite };
