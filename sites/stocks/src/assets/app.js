(() => {
  const board = document.getElementById("market-board");
  if (!board) return;

  const translations = window.SF_SITE_TRANSLATIONS || {};
  const locale = window.SF_SITE_LOCALE === "en" ? "en-US" : "ko-KR";
  const indexes = ["ks11", "kq11", "gspc", "ixic", "dji", "n225"];

  function t(key, values = {}) {
    let output = translations[key] || key;
    for (const [name, value] of Object.entries(values)) output = output.replace(`{${name}}`, value);
    return output;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function number(value) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
  }

  async function request() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch("/api/markets", {
        signal: controller.signal,
        headers: { accept: "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload?.indexes || typeof payload.indexes !== "object") throw new Error("missing indexes");
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  function render(id, market) {
    const { price, change, percent } = market || {};
    if (![price, change, percent].every(Number.isFinite)) throw new Error("missing market value");
    setText(`market-${id}`, number(price));
    setText(`market-${id}-detail`, t("dynamic.change", {
      value: `${change >= 0 ? "+" : ""}${number(change)}`,
      percent: `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`
    }));
    const detail = document.getElementById(`market-${id}-detail`);
    if (detail) detail.dataset.direction = change >= 0 ? "up" : "down";
  }

  async function load() {
    const status = document.getElementById("market-status");
    let success = 0;
    try {
      const payload = await request();
      for (const id of indexes) {
        try {
          render(id, payload.indexes[id]);
          success += 1;
        } catch (_error) {
          // Leave the value unavailable when the provider omits fields.
        }
      }
    } catch (_error) {
      // The status message below communicates the same-origin endpoint failure.
    }
    if (!status) return;
    if (success === indexes.length) {
      status.textContent = t("dynamic.loaded", { time: new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date()) });
      status.dataset.state = "ready";
    } else if (success) {
      status.textContent = t("dynamic.partial");
      status.dataset.state = "warning";
    } else {
      status.textContent = t("dynamic.unavailable");
      status.dataset.state = "warning";
    }
  }

  load();
})();
