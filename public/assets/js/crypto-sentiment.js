(function () {
  "use strict";

  const FNG_API = "https://api.alternative.me/fng/?limit=31&format=json";
  const COINGECKO_MARKETS = "https://api.coingecko.com/api/v3/coins/markets";
  const CACHE_PREFIX = "sf-crypto-cache:";
  const MARKET_TTL = 5 * 60 * 1000;
  const FNG_TTL = 30 * 60 * 1000;
  const memoryCache = new Map();
  const inFlight = new Map();

  const state = {
    primaryCurrency: "krw",
    query: "",
    fng: [],
    coins: [],
    loading: false
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const krwFormatter = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
  const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 6 });
  const compactKrw = new Intl.NumberFormat("ko-KR", { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 });
  const compactUsd = new Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 });
  const percentFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

  if (document.body.matches('[data-page="crypto-sentiment"]')) {
    init();
  }

  function init() {
    cleanupCache();
    bindEvents();
    restoreSettings();
    loadAll();
  }

  function bindEvents() {
    $("#cryptoRefresh")?.addEventListener("click", () => loadAll({ force: true }));
    $("#cryptoReset")?.addEventListener("click", resetTool);
    $("#cryptoCopy")?.addEventListener("click", copySummary);
    $("#cryptoPrimaryCurrency")?.addEventListener("change", (event) => {
      state.primaryCurrency = event.target.value === "usd" ? "usd" : "krw";
      writeSetting("sf-crypto-primary", state.primaryCurrency);
      renderMarkets();
    });
    $("#cryptoSearch")?.addEventListener("input", (event) => {
      state.query = event.target.value.trim().toLocaleLowerCase("ko");
      renderMarkets();
    });
  }

  function restoreSettings() {
    const saved = readSetting("sf-crypto-primary");
    state.primaryCurrency = saved === "usd" ? "usd" : "krw";
    const select = $("#cryptoPrimaryCurrency");
    if (select) select.value = state.primaryCurrency;
  }

  async function loadAll(options = {}) {
    setLoading(true);
    setStatus("공포탐욕 지수와 거래량 상위 코인을 불러오는 중입니다.", "info");
    try {
      const [fngResult, marketResult] = await Promise.all([
        loadFearGreed(options),
        loadMarkets(options)
      ]);
      state.fng = fngResult;
      state.coins = marketResult;
      renderAll();
      setStatus("최신 시장 데이터를 표시합니다.", "success");
    } catch (error) {
      renderAll();
      setStatus(error.message || "시장 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadFearGreed(options = {}) {
    const result = await cachedFetch(FNG_API, "fng:31", FNG_TTL, options);
    return Array.isArray(result.data?.data) ? result.data.data.map(normalizeFng) : [];
  }

  async function loadMarkets(options = {}) {
    const common = "order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h,7d&locale=ko";
    const usdUrl = `${COINGECKO_MARKETS}?vs_currency=usd&${common}`;
    const usdResult = await cachedFetch(usdUrl, "markets:usd:major-volume", MARKET_TTL, options);
    const usdCoins = (Array.isArray(usdResult.data) ? usdResult.data : [])
      .filter((coin) => Number.isFinite(Number(coin.total_volume)))
      .sort((a, b) => Number(b.total_volume || 0) - Number(a.total_volume || 0))
      .slice(0, 20);
    if (!usdCoins.length) return [];
    const ids = usdCoins.map((coin) => coin.id).filter(Boolean).join(",");
    const krwUrl = `${COINGECKO_MARKETS}?vs_currency=krw&ids=${encodeURIComponent(ids)}&order=volume_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h,7d&locale=ko`;
    const krwResult = await cachedFetch(krwUrl, `markets:krw:${ids}`, MARKET_TTL, options);
    const krwMap = new Map((Array.isArray(krwResult.data) ? krwResult.data : []).map((coin) => [coin.id, coin]));
    return usdCoins.map((usdCoin, index) => normalizeCoin(usdCoin, krwMap.get(usdCoin.id), index + 1));
  }

  async function cachedFetch(url, key, ttl, options = {}) {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const now = Date.now();
    const memory = memoryCache.get(cacheKey);
    if (!options.force && memory && now - memory.savedAt < ttl) return { data: memory.data, fromCache: true };
    const local = readCache(cacheKey);
    if (!options.force && local && now - local.savedAt < ttl) {
      memoryCache.set(cacheKey, local);
      return { data: local.data, fromCache: true };
    }
    if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);
    const request = fetch(url, { headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`API 오류: HTTP ${response.status}`);
        const data = await response.json();
        writeCache(cacheKey, data);
        return { data, fromCache: false };
      })
      .catch((error) => {
        const stale = readCache(cacheKey);
        if (stale) {
          memoryCache.set(cacheKey, stale);
          setStatus("API 호출에 실패해 저장된 최근 데이터를 표시합니다.", "warn");
          return { data: stale.data, fromCache: true, stale: true };
        }
        throw error;
      })
      .finally(() => inFlight.delete(cacheKey));
    inFlight.set(cacheKey, request);
    return request;
  }

  function normalizeFng(item) {
    const value = Number(item.value);
    const timestamp = Number(item.timestamp) * 1000;
    return {
      value: Number.isFinite(value) ? value : 0,
      label: translateSentiment(item.value_classification || ""),
      rawLabel: item.value_classification || "",
      date: Number.isFinite(timestamp) ? new Date(timestamp) : null
    };
  }

  function normalizeCoin(usd, krw, rank) {
    return {
      id: usd.id,
      rank,
      image: usd.image,
      name: usd.name || usd.id,
      symbol: String(usd.symbol || "").toUpperCase(),
      priceUsd: numberOrNull(usd.current_price),
      priceKrw: numberOrNull(krw?.current_price),
      volumeUsd: numberOrNull(usd.total_volume),
      volumeKrw: numberOrNull(krw?.total_volume),
      marketCapUsd: numberOrNull(usd.market_cap),
      change24h: numberOrNull(usd.price_change_percentage_24h_in_currency ?? usd.price_change_percentage_24h),
      change7d: numberOrNull(usd.price_change_percentage_7d_in_currency),
      sparkline: Array.isArray(usd.sparkline_in_7d?.price) ? usd.sparkline_in_7d.price : []
    };
  }

  function renderAll() {
    renderFearGreed();
    renderMarkets();
  }

  function renderFearGreed() {
    const latest = state.fng[0];
    const yesterday = state.fng[1];
    const week = average(state.fng.slice(0, 7).map((item) => item.value));
    const month = average(state.fng.slice(0, 30).map((item) => item.value));
    const direction = latest && yesterday ? latest.value - yesterday.value : 0;
    const gaugeValue = latest?.value ?? 0;

    setText("#cryptoHeroScore", latest ? String(latest.value) : "-");
    setText("#cryptoFngValue", latest ? String(latest.value) : "-");
    setText("#cryptoFngLabel", latest ? latest.label : "-");
    setText("#cryptoFngUpdated", latest?.date ? `업데이트: ${formatDate(latest.date)}` : "공포탐욕 지수를 불러오지 못했습니다.");
    setText("#cryptoFngYesterday", yesterday ? `${yesterday.value} ${yesterday.label}` : "-");
    setText("#cryptoFngWeek", Number.isFinite(week) ? String(Math.round(week)) : "-");
    setText("#cryptoFngMonth", Number.isFinite(month) ? String(Math.round(month)) : "-");
    setText("#cryptoFngDirection", direction > 0 ? `+${direction}` : String(direction || "-"));
    $("#cryptoGaugeNeedle")?.style.setProperty("--score", String(Math.max(0, Math.min(100, gaugeValue))));

    const history = $("#cryptoFngHistory");
    if (history) {
      history.innerHTML = state.fng.slice(0, 14).map((item) => `
        <div class="mini-bar-row crypto-fng-row">
          <span><strong>${escapeHtml(formatShortDate(item.date))}</strong><small>${escapeHtml(item.label)}</small></span>
          <div class="mini-bar"><i style="width:${Math.max(4, item.value)}%"></i></div>
          <b>${item.value}</b>
        </div>
      `).join("") || emptyMessage("공포탐욕 기록이 없습니다.");
    }
  }

  function renderMarkets() {
    const filtered = filteredCoins();
    const top = state.coins[0];
    const gains = state.coins.filter((coin) => (coin.change24h || 0) > 0).length;
    const losses = state.coins.filter((coin) => (coin.change24h || 0) < 0).length;
    const totalKrw = sum(state.coins.map((coin) => coin.volumeKrw));
    const totalUsd = sum(state.coins.map((coin) => coin.volumeUsd));

    setText("#cryptoHeroTrend", top ? top.symbol : "-");
    setText("#cryptoCoinCount", String(state.coins.length || "-"));
    setText("#cryptoGainCount", String(gains || "-"));
    setText("#cryptoLossCount", String(losses || "-"));
    setText("#cryptoTotalVolume", totalKrw ? `${compactKrw.format(totalKrw)}원` : "-");
    setText("#cryptoTotalVolumeUsd", totalUsd ? `${compactUsd.format(totalUsd)}` : "");

    renderLeaders();
    renderTable(filtered);
  }

  function renderLeaders() {
    const leaders = $("#cryptoLeaders");
    if (!leaders) return;
    leaders.innerHTML = state.coins.slice(0, 4).map((coin) => {
      const primary = state.primaryCurrency === "usd" ? formatUsd(coin.priceUsd) : formatKrw(coin.priceKrw);
      const secondary = state.primaryCurrency === "usd" ? formatKrw(coin.priceKrw) : formatUsd(coin.priceUsd);
      return `
        <div class="crypto-leader-card">
          <span class="crypto-coin-icon">${coin.image ? `<img src="${escapeAttr(coin.image)}" alt="">` : escapeHtml(coin.symbol.slice(0, 2))}</span>
          <strong>${escapeHtml(coin.symbol)}</strong>
          <small>${escapeHtml(coin.name)}</small>
          <b>${escapeHtml(primary)}</b>
          <em>${escapeHtml(secondary)}</em>
          ${renderChange(coin.change24h)}
        </div>
      `;
    }).join("") || emptyMessage("시장 데이터를 불러오지 못했습니다.");
  }

  function renderTable(coins) {
    const body = $("#cryptoMarketBody");
    if (!body) return;
    body.innerHTML = coins.map((coin) => `
      <tr>
        <td><strong>#${coin.rank}</strong></td>
        <td>
          <span class="crypto-name-cell">
            <span class="crypto-coin-icon">${coin.image ? `<img src="${escapeAttr(coin.image)}" alt="">` : escapeHtml(coin.symbol.slice(0, 2))}</span>
            <span><strong>${escapeHtml(coin.name)}</strong><small>${escapeHtml(coin.symbol)}</small></span>
          </span>
        </td>
        <td data-priority="${state.primaryCurrency === "krw" ? "primary" : "secondary"}">${escapeHtml(formatKrw(coin.priceKrw))}</td>
        <td data-priority="${state.primaryCurrency === "usd" ? "primary" : "secondary"}">${escapeHtml(formatUsd(coin.priceUsd))}</td>
        <td>${renderChange(coin.change24h)}</td>
        <td>${renderChange(coin.change7d)}</td>
        <td>${escapeHtml(formatKrwCompact(coin.volumeKrw))}</td>
        <td>${escapeHtml(formatUsdCompact(coin.volumeUsd))}</td>
        <td>${sparkline(coin.sparkline)}</td>
      </tr>
    `).join("") || `<tr><td colspan="9">${escapeHtml(state.query ? "검색 결과가 없습니다." : "시장 데이터를 불러오는 중입니다.")}</td></tr>`;
  }

  function filteredCoins() {
    if (!state.query) return state.coins;
    return state.coins.filter((coin) => (
      coin.name.toLocaleLowerCase("ko").includes(state.query) ||
      coin.symbol.toLocaleLowerCase("ko").includes(state.query) ||
      coin.id.toLocaleLowerCase("ko").includes(state.query)
    ));
  }

  function renderChange(value) {
    if (!Number.isFinite(value)) return '<span class="crypto-change neutral">-</span>';
    const className = value > 0 ? "up" : value < 0 ? "down" : "neutral";
    const sign = value > 0 ? "+" : "";
    return `<span class="crypto-change ${className}">${sign}${percentFormatter.format(value)}%</span>`;
  }

  function sparkline(values) {
    if (!Array.isArray(values) || values.length < 2) return '<span class="sparkline-empty">-</span>';
    const sampled = values.filter((_, index) => index % Math.ceil(values.length / 36) === 0).slice(-36);
    const min = Math.min(...sampled);
    const max = Math.max(...sampled);
    const range = max - min || 1;
    const points = sampled.map((value, index) => {
      const x = sampled.length === 1 ? 0 : (index / (sampled.length - 1)) * 100;
      const y = 34 - ((value - min) / range) * 30;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const direction = sampled[sampled.length - 1] >= sampled[0] ? "up" : "down";
    return `<svg class="crypto-sparkline ${direction}" viewBox="0 0 100 36" role="img" aria-label="7일 가격 흐름"><polyline points="${points}"></polyline></svg>`;
  }

  function resetTool() {
    state.primaryCurrency = "krw";
    state.query = "";
    writeSetting("sf-crypto-primary", state.primaryCurrency);
    const select = $("#cryptoPrimaryCurrency");
    const search = $("#cryptoSearch");
    if (select) select.value = "krw";
    if (search) search.value = "";
    renderMarkets();
  }

  async function copySummary() {
    const latest = state.fng[0];
    const top = state.coins.slice(0, 5).map((coin) => `${coin.rank}. ${coin.symbol} ${formatKrw(coin.priceKrw)} / ${formatUsd(coin.priceUsd)} (${formatPercent(coin.change24h)})`).join("\n");
    const text = [
      "SolForge 코인 공포탐욕 지표",
      latest ? `공포탐욕: ${latest.value} ${latest.label}` : "공포탐욕: 데이터 없음",
      "거래량 상위 5개",
      top || "시장 데이터 없음",
      "주의: 이 내용은 투자 조언이 아닙니다."
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setStatus("요약을 클립보드에 복사했습니다.", "success");
    } catch (_error) {
      setStatus("클립보드 복사에 실패했습니다.", "error");
    }
  }

  function setLoading(loading) {
    state.loading = loading;
    ["cryptoRefresh", "cryptoReset", "cryptoCopy"].forEach((id) => {
      const button = document.getElementById(id);
      if (button) button.disabled = loading && id === "cryptoRefresh";
    });
  }

  function setStatus(message, type = "info") {
    const status = $("#cryptoStatus");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("valid", type === "success");
    status.classList.toggle("invalid", type === "error");
    status.dataset.status = type;
  }

  function readCache(key) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.savedAt) return null;
      return parsed;
    } catch (_error) {
      return null;
    }
  }

  function writeCache(key, data) {
    const entry = { savedAt: Date.now(), data };
    memoryCache.set(key, entry);
    try {
      window.localStorage.setItem(key, JSON.stringify(entry));
    } catch (_error) {
      cleanupCache(true);
    }
  }

  function cleanupCache(aggressive = false) {
    try {
      const now = Date.now();
      Object.keys(window.localStorage).forEach((key) => {
        if (!key.startsWith(CACHE_PREFIX)) return;
        const entry = JSON.parse(window.localStorage.getItem(key) || "{}");
        const ttl = key.includes("fng") ? FNG_TTL : MARKET_TTL;
        if (aggressive || !entry.savedAt || now - entry.savedAt > ttl * 12) window.localStorage.removeItem(key);
      });
    } catch (_error) {
      // Cache cleanup is best effort only.
    }
  }

  function readSetting(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function writeSetting(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_error) {
      // Settings are optional.
    }
  }

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = value;
  }

  function translateSentiment(label) {
    const normalized = String(label).toLowerCase();
    if (normalized.includes("extreme fear")) return "극단적 공포";
    if (normalized.includes("fear")) return "공포";
    if (normalized.includes("neutral")) return "중립";
    if (normalized.includes("extreme greed")) return "극단적 탐욕";
    if (normalized.includes("greed")) return "탐욕";
    return label || "-";
  }

  function numberOrNull(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function average(values) {
    const valid = values.filter(Number.isFinite);
    return valid.length ? valid.reduce((total, value) => total + value, 0) / valid.length : NaN;
  }

  function sum(values) {
    return values.filter(Number.isFinite).reduce((total, value) => total + value, 0);
  }

  function formatKrw(value) {
    return Number.isFinite(value) ? krwFormatter.format(value) : "-";
  }

  function formatUsd(value) {
    if (!Number.isFinite(value)) return "-";
    const digits = value >= 1 ? 2 : value >= 0.01 ? 4 : 6;
    return usdFormatter.format(value).replace(/\.\d+$/, (match) => {
      const trimmed = Number(match).toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
      return trimmed === "0" ? "" : trimmed.slice(1);
    });
  }

  function formatKrwCompact(value) {
    return Number.isFinite(value) ? `${compactKrw.format(value)}원` : "-";
  }

  function formatUsdCompact(value) {
    return Number.isFinite(value) ? compactUsd.format(value) : "-";
  }

  function formatPercent(value) {
    if (!Number.isFinite(value)) return "-";
    return `${value > 0 ? "+" : ""}${percentFormatter.format(value)}%`;
  }

  function formatDate(date) {
    return date ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(date) : "-";
  }

  function formatShortDate(date) {
    return date ? new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(date) : "-";
  }

  function emptyMessage(message) {
    return `<div class="list-item"><strong>${escapeHtml(message)}</strong></div>`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }
}());
