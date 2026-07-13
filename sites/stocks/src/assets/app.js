(() => {
  const board = document.getElementById("market-board");
  if (!board) return;

  const translations = window.SF_SITE_TRANSLATIONS || {};
  const locale = window.SF_SITE_LOCALE === "en" ? "en-US" : "ko-KR";
  const indexes = [
    ["ks11", "^KS11"],
    ["kq11", "^KQ11"],
    ["gspc", "^GSPC"],
    ["ixic", "^IXIC"],
    ["dji", "^DJI"],
    ["n225", "^N225"]
  ];

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

  async function request(symbol) {
    const endpoint = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d&includePrePost=false`;
    const urls = [endpoint, `https://api.allorigins.win/raw?url=${encodeURIComponent(endpoint)}`];
    let lastError;
    for (const url of urls) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const result = payload?.chart?.result?.[0];
        if (!result) throw new Error("missing result");
        return result;
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError || new Error("request failed");
  }

  function render(id, result) {
    const meta = result.meta || {};
    const closes = (result.indicators?.quote?.[0]?.close || []).filter(Number.isFinite);
    const current = Number.isFinite(meta.regularMarketPrice) ? meta.regularMarketPrice : closes.at(-1);
    const previous = Number.isFinite(meta.chartPreviousClose) ? meta.chartPreviousClose : closes.at(-2);
    if (!Number.isFinite(current) || !Number.isFinite(previous)) throw new Error("missing price");
    const change = current - previous;
    const percent = previous ? (change / previous) * 100 : 0;
    setText(`market-${id}`, number(current));
    setText(`market-${id}-detail`, t("dynamic.change", {
      value: `${change >= 0 ? "+" : ""}${number(change)}`,
      percent: `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`
    }));
    const detail = document.getElementById(`market-${id}-detail`);
    if (detail) detail.dataset.direction = change >= 0 ? "up" : "down";
  }

  async function load() {
    const status = document.getElementById("market-status");
    const results = await Promise.allSettled(indexes.map(([, symbol]) => request(symbol)));
    let success = 0;
    results.forEach((result, index) => {
      if (result.status !== "fulfilled") return;
      try {
        render(indexes[index][0], result.value);
        success += 1;
      } catch (_error) {
        // Leave the value unavailable when the provider omits fields.
      }
    });
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
