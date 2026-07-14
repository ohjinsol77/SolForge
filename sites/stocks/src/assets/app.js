(() => {
  const marketBoard = document.getElementById("market-board");
  const koreaDashboard = document.getElementById("korea-dashboard");
  if (!marketBoard && !koreaDashboard) return;

  const translations = window.SF_SITE_TRANSLATIONS || {};
  const locale = window.SF_SITE_LOCALE === "en" ? "en-US" : "ko-KR";
  const indexes = ["ks11", "kq11", "gspc", "ixic", "dji", "n225"];
  let loading = false;

  function t(key, values = {}) {
    let output = translations[key] || key;
    for (const [name, value] of Object.entries(values)) output = output.split(`{${name}}`).join(value);
    return output;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function number(value, maximumFractionDigits = 2) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
  }

  function compact(value) {
    return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }

  function won(value) {
    return new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", notation: "compact", maximumFractionDigits: 1 }).format(value);
  }

  function signed(value, maximumFractionDigits = 2) {
    return `${value > 0 ? "+" : ""}${number(value, maximumFractionDigits)}`;
  }

  function setDirection(element, value) {
    if (element) element.dataset.direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  }

  function formatChange(change, percent) {
    return t("dynamic.change", {
      value: signed(change),
      percent: `${signed(percent)}%`
    });
  }

  function marketStatus(value) {
    const status = String(value || "").toUpperCase();
    if (status === "OPEN") return t("koreaDashboard.marketOpen");
    if (status === "CLOSE") return t("koreaDashboard.marketClosed");
    if (status === "PREOPEN") return t("koreaDashboard.marketPreopen");
    return t("koreaDashboard.marketUnknown");
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
      if (!payload || typeof payload !== "object") throw new Error("missing market payload");
      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }

  function renderMarketIndex(id, market) {
    const { price, change, percent } = market || {};
    if (![price, change, percent].every(Number.isFinite)) throw new Error("missing market value");
    setText(`market-${id}`, number(price));
    setText(`market-${id}-detail`, formatChange(change, percent));
    setDirection(document.getElementById(`market-${id}-detail`), change);
  }

  function renderBreadth(id, breadth) {
    const values = [breadth?.upper, breadth?.rising, breadth?.steady, breadth?.falling, breadth?.lower];
    if (!values.every(Number.isFinite)) throw new Error("missing breadth value");
    const rising = breadth.upper + breadth.rising;
    const falling = breadth.falling + breadth.lower;
    const total = rising + breadth.steady + falling;
    if (!total) throw new Error("empty breadth value");
    setText(`domestic-${id}-rising`, number(rising, 0));
    setText(`domestic-${id}-steady`, number(breadth.steady, 0));
    setText(`domestic-${id}-falling`, number(falling, 0));
    const segments = document.querySelectorAll(`#domestic-${id}-breadth-bar span`);
    const widths = [rising, breadth.steady, falling];
    segments.forEach((segment, index) => {
      segment.style.width = `${Math.max((widths[index] / total) * 100, widths[index] ? 1.5 : 0)}%`;
    });
  }

  function renderFlows(id, flows) {
    for (const key of ["personal", "foreign", "institutional"]) {
      const value = flows?.[key];
      if (!Number.isFinite(value)) continue;
      const element = document.getElementById(`domestic-${id}-${key}`);
      if (element) {
        element.textContent = signed(value, 0);
        setDirection(element, value);
      }
    }
  }

  function renderDomesticIndex(id, market) {
    const required = [market?.price, market?.change, market?.percent, market?.open, market?.high, market?.low, market?.volume, market?.tradingValue];
    if (!required.every(Number.isFinite)) throw new Error("missing domestic value");
    setText(`domestic-${id}-price`, number(market.price));
    setText(`domestic-${id}-status`, marketStatus(market.marketStatus));
    setText(`domestic-${id}-change`, formatChange(market.change, market.percent));
    setDirection(document.getElementById(`domestic-${id}-change`), market.change);
    setText(`domestic-${id}-open`, number(market.open));
    setText(`domestic-${id}-range`, `${number(market.low)} – ${number(market.high)}`);
    setText(`domestic-${id}-volume`, compact(market.volume));
    setText(`domestic-${id}-value`, won(market.tradingValue));
    if ([market.low52, market.high52].every(Number.isFinite)) {
      setText(`domestic-${id}-year-range`, `${number(market.low52)} – ${number(market.high52)}`);
    }
    renderBreadth(id, market.breadth);
    renderFlows(id, market.flows);
  }

  function renderExchange(id, exchange) {
    const { price, change, percent } = exchange || {};
    if (![price, change, percent].every(Number.isFinite)) throw new Error("missing exchange value");
    setText(`exchange-${id}-price`, number(price));
    setText(`exchange-${id}-change`, formatChange(change, percent));
    setDirection(document.getElementById(`exchange-${id}-change`), change);
  }

  function leaderRow(item, rank) {
    const row = document.createElement("div");
    row.className = "leader-row";

    const rankElement = document.createElement("span");
    rankElement.className = "leader-rank";
    rankElement.textContent = String(rank);

    const identity = document.createElement("div");
    identity.className = "leader-identity";
    const name = document.createElement("strong");
    name.textContent = item.name;
    const code = document.createElement("small");
    code.textContent = item.code;
    identity.append(name, code);

    const quote = document.createElement("div");
    quote.className = "leader-quote";
    const price = document.createElement("strong");
    price.textContent = number(item.price, 0);
    const change = document.createElement("small");
    change.textContent = `${signed(item.percent)}%`;
    setDirection(change, item.change);
    quote.append(price, change);

    const value = document.createElement("span");
    value.className = "leader-value";
    value.textContent = won(item.tradingValue);
    row.append(rankElement, identity, quote, value);
    return row;
  }

  function renderLeaders(id, items) {
    const list = document.getElementById(`leaders-${id}`);
    if (!list || !Array.isArray(items) || !items.length) throw new Error("missing leader list");
    list.replaceChildren(...items.slice(0, 5).map(leaderRow));
  }

  function markLeadersUnavailable(id) {
    const list = document.getElementById(`leaders-${id}`);
    if (!list) return;
    const message = document.createElement("p");
    message.className = "data-placeholder";
    message.textContent = t("koreaDashboard.rankUnavailable");
    list.replaceChildren(message);
  }

  function statusTime() {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
  }

  function updateStatus(id, success, expected, loadedKey = "dynamic.loaded") {
    const status = document.getElementById(id);
    if (!status) return;
    if (success === expected) {
      status.textContent = t(loadedKey, { time: statusTime() });
      status.dataset.state = "ready";
    } else if (success) {
      status.textContent = t("dynamic.partial");
      status.dataset.state = "warning";
    } else {
      status.textContent = t("dynamic.unavailable");
      status.dataset.state = "warning";
    }
  }

  async function load() {
    if (loading) return;
    loading = true;
    let marketSuccess = 0;
    let dashboardSuccess = 0;
    try {
      const payload = await request();
      if (marketBoard) {
        for (const id of indexes) {
          try {
            renderMarketIndex(id, payload.indexes?.[id]);
            marketSuccess += 1;
          } catch (_error) {
            // Keep an unavailable marker when an upstream field is missing.
          }
        }
      }
      if (koreaDashboard) {
        for (const id of ["kospi", "kosdaq"]) {
          try {
            renderDomesticIndex(id, payload.domestic?.[id]);
            dashboardSuccess += 1;
          } catch (_error) {
            // Other dashboard sections can still render independently.
          }
        }
        for (const id of ["usd", "jpy", "eur"]) {
          try {
            renderExchange(id, payload.exchangeRates?.[id]);
            dashboardSuccess += 1;
          } catch (_error) {
            // Leave only the unavailable exchange rate blank.
          }
        }
        for (const id of ["kospi", "kosdaq"]) {
          try {
            renderLeaders(id, payload.leaders?.[id]);
            dashboardSuccess += 1;
          } catch (_error) {
            markLeadersUnavailable(id);
          }
        }
      }
    } catch (_error) {
      // Status messages below communicate same-origin endpoint failures.
    } finally {
      loading = false;
    }
    updateStatus("market-status", marketSuccess, indexes.length);
    updateStatus("korea-dashboard-status", dashboardSuccess, 7, "koreaDashboard.loaded");
  }

  load();
  if (koreaDashboard) {
    window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") load();
    });
  }
})();
