const locales = {
  ko: require("../src/locales/ko.json"),
  en: require("../src/locales/en.json")
};

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Preserve both partner-issued sizes and keep the SDK isolated from tool controls.
function bannerDocument(width, height) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;width:${width}px;height:${height}px;overflow:hidden}</style></head><body><script src="https://ads-partners.coupang.com/g.js"></script><script>new PartnersCoupang.G({"id":1030868,"template":"carousel","trackingCode":"AF5479527","width":"${width}","height":"${height}","tsource":""});</script></body></html>`;
}

function renderCoupangAd(lang) {
  const copy = locales[lang] || locales.ko;
  return `<aside data-coupang-ad data-coupang-layout="responsive" data-coupang-placement="upper-content" style="margin:20px auto 28px;width:100%;max-width:970px;text-align:center;clear:both">
    <p data-i18n="ads.coupang.label" style="font-size:12px;margin:0 0 8px">${escapeHtml(copy["ads.coupang.label"])}</p>
    <div data-coupang-viewport style="margin:0 auto;max-width:100%;overflow:hidden"><iframe style="display:block;border:0;max-width:none;transform-origin:top left" loading="lazy" title="${escapeHtml(copy["ads.coupang.title"])}" data-i18n-attrs="title:ads.coupang.title" data-desktop-srcdoc="${escapeHtml(bannerDocument(970, 140))}" data-mobile-srcdoc="${escapeHtml(bannerDocument(300, 250))}"></iframe></div>
    <p data-i18n="ads.coupang.disclosure" style="font-size:12px;line-height:1.6;margin:8px auto 0;max-width:600px">${escapeHtml(copy["ads.coupang.disclosure"])}</p>
  </aside><script>(() => {
    const ad = document.currentScript.previousElementSibling;
    const viewport = ad.querySelector('[data-coupang-viewport]');
    const frame = viewport.querySelector('iframe');
    let currentMode;
    function resize() {
      const available = ad.getBoundingClientRect().width;
      if (!available) return;
      const mode = available >= 600 ? 'desktop' : 'mobile';
      const width = mode === 'desktop' ? 970 : 300;
      const height = mode === 'desktop' ? 140 : 250;
      const scale = Math.min(1, available / width);
      viewport.style.width = (width * scale) + 'px';
      viewport.style.height = (height * scale) + 'px';
      frame.style.width = width + 'px';
      frame.style.height = height + 'px';
      frame.style.transform = 'scale(' + scale + ')';
      if (mode !== currentMode) {
        currentMode = mode;
        frame.srcdoc = frame.dataset[mode + 'Srcdoc'];
      }
    }
    resize();
    new ResizeObserver(resize).observe(ad);
  })();</script>`;
}

function insertCoupangAd(html, lang) {
  const ad = renderCoupangAd(lang);
  const marker = "<!-- solforge:ad -->";
  if (html.includes(marker)) return html.replace(marker, ad);
  const hero = /<section\b[^>]*class="[^"]*hero[^"]*"[^>]*>/i.exec(html);
  if (!hero) throw new Error("An ad-enabled source page needs a hero or an explicit ad position");
  const sections = /<\/?section\b[^>]*>/gi;
  sections.lastIndex = hero.index;
  let depth = 0;
  let tag;
  while ((tag = sections.exec(html))) {
    depth += /^<\//.test(tag[0]) ? -1 : 1;
    if (depth === 0) return html.slice(0, sections.lastIndex) + ad + html.slice(sections.lastIndex);
  }
  throw new Error("Unclosed hero section on an ad-enabled source page");
}

module.exports = { renderCoupangAd, insertCoupangAd };
