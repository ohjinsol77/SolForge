(() => {
  const snapshot = document.querySelector(".snapshot");
  if (!snapshot) return;

  const translations = window.SFC_TRANSLATIONS || {};
  const locale = window.SFC_LOCALE === "en" ? "en-US" : "ko-KR";

  function t(key, values = {}) {
    let output = translations[key] || key;
    for (const [name, value] of Object.entries(values)) {
      output = output.replace(`{${name}}`, value);
    }
    return output;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function compactCurrency(value) {
    if (!Number.isFinite(value)) return "—";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2
    }).format(value);
  }

  function price(value) {
    if (!Number.isFinite(value)) return "—";
    const digits = value >= 1000 ? 0 : value >= 1 ? 2 : 5;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: digits
    }).format(value);
  }

  function percent(value) {
    if (!Number.isFinite(value)) return "—";
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  }

  async function request(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function renderGlobal(payload) {
    const data = payload?.data;
    if (!data) return false;
    setText("snapshot-marketCap", compactCurrency(Number(data.total_market_cap?.usd)));
    setText("snapshot-marketCap-detail", t("dynamic.marketChange", { value: percent(Number(data.market_cap_change_percentage_24h_usd)) }));
    setText("snapshot-volume", compactCurrency(Number(data.total_volume?.usd)));
    setText("snapshot-volume-detail", "USD");
    setText("snapshot-btcDominance", `${Number(data.market_cap_percentage?.btc).toFixed(1)}%`);
    setText("snapshot-btcDominance-detail", `ETH ${Number(data.market_cap_percentage?.eth).toFixed(1)}%`);
    return true;
  }

  function renderSentiment(payload) {
    const current = payload?.data?.[0];
    const previous = payload?.data?.[1];
    if (!current) return false;
    setText("snapshot-sentiment", current.value || "—");
    setText("snapshot-sentiment-detail", t("dynamic.fngLabel", {
      label: current.value_classification || "—",
      previous: previous?.value || "—"
    }));
    return true;
  }

  function renderAssets(assets) {
    const list = document.getElementById("snapshot-assets");
    if (!list) return false;
    if (!Array.isArray(assets) || !assets.length) {
      list.innerHTML = `<p class="empty-state">${t("dynamic.noAssets")}</p>`;
      return false;
    }
    list.innerHTML = assets.slice(0, 5).map((asset) => {
      const change = Number(asset.price_change_percentage_24h);
      const direction = Number.isFinite(change) && change >= 0 ? "up" : "down";
      return `<article class="asset-row">
        <span class="asset-rank">${asset.market_cap_rank || "—"}</span>
        <span class="asset-name"><strong>${escapeHtml(asset.name || "—")}</strong><small>${escapeHtml(String(asset.symbol || "").toUpperCase())}</small></span>
        <strong>${price(Number(asset.current_price))}</strong>
        <span class="change ${direction}">${percent(change)}</span>
      </article>`;
    }).join("");
    return true;
  }

  async function loadSnapshot() {
    const status = document.getElementById("snapshot-status");
    const results = await Promise.allSettled([
      request("https://api.coingecko.com/api/v3/global"),
      request("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1&sparkline=false&price_change_percentage=24h"),
      request("https://api.alternative.me/fng/?limit=2&format=json")
    ]);

    const succeeded = [
      results[0].status === "fulfilled" && renderGlobal(results[0].value),
      results[1].status === "fulfilled" && renderAssets(results[1].value),
      results[2].status === "fulfilled" && renderSentiment(results[2].value)
    ].filter(Boolean).length;

    if (!status) return;
    if (succeeded === 3) {
      status.textContent = t("dynamic.loaded", {
        time: new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date())
      });
      status.dataset.state = "ready";
    } else if (succeeded > 0) {
      status.textContent = t("dynamic.partial");
      status.dataset.state = "warning";
    } else {
      status.textContent = t("dynamic.unavailable");
      status.dataset.state = "warning";
      renderAssets([]);
    }
  }

  loadSnapshot();
})();
