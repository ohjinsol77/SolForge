(function () {
  "use strict";

  const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
  const CACHE_PREFIX = "sf-stock-cache:";
  const SETTINGS_PREFIX = "sf-stock-setting:";
  const QUOTE_TTL = 5 * 60 * 1000;
  const memoryCache = new Map();
  const inFlight = new Map();

  const PAGE_CONFIG = {
    "korea-stocks": {
      mode: "kr",
      title: "국내 주식",
      defaultSymbol: "005930.KS",
      defaultRange: "3mo",
      currency: "KRW",
      storageKey: "korea",
      examples: "예: 005930, 000660, 035720",
      quick: [
        ["005930.KS", "삼성전자"],
        ["000660.KS", "SK하이닉스"],
        ["373220.KS", "LG에너지솔루션"],
        ["005380.KS", "현대차"],
        ["035420.KS", "NAVER"],
        ["035720.KS", "카카오"],
        ["068270.KS", "셀트리온"],
        ["105560.KS", "KB금융"],
        ["005490.KS", "POSCO홀딩스"],
        ["207940.KS", "삼성바이오로직스"]
      ],
      aliases: {
        "삼성전자": "005930.KS",
        "삼성": "005930.KS",
        "sk하이닉스": "000660.KS",
        "하이닉스": "000660.KS",
        "현대차": "005380.KS",
        "네이버": "035420.KS",
        "naver": "035420.KS",
        "카카오": "035720.KS",
        "셀트리온": "068270.KS"
      }
    },
    "global-stocks": {
      mode: "global",
      title: "해외 주식",
      defaultSymbol: "AAPL",
      defaultRange: "3mo",
      currency: "USD",
      storageKey: "global",
      examples: "예: AAPL, MSFT, NVDA, TSLA",
      quick: [
        ["AAPL", "Apple"],
        ["MSFT", "Microsoft"],
        ["NVDA", "NVIDIA"],
        ["TSLA", "Tesla"],
        ["GOOGL", "Alphabet"],
        ["AMZN", "Amazon"],
        ["META", "Meta"],
        ["AVGO", "Broadcom"],
        ["AMD", "AMD"],
        ["NFLX", "Netflix"]
      ],
      aliases: {
        "애플": "AAPL",
        "apple": "AAPL",
        "마이크로소프트": "MSFT",
        "ms": "MSFT",
        "엔비디아": "NVDA",
        "nvidia": "NVDA",
        "테슬라": "TSLA",
        "tesla": "TSLA",
        "구글": "GOOGL",
        "아마존": "AMZN"
      }
    }
  };

  const RANGE_LABELS = {
    "1mo": "1개월",
    "3mo": "3개월",
    "6mo": "6개월",
    "1y": "1년"
  };

  const state = {
    config: null,
    symbol: "",
    range: "3mo",
    data: null,
    recent: [],
    favorite: [],
    loading: false
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  if (PAGE_CONFIG[document.body.dataset.page]) init(PAGE_CONFIG[document.body.dataset.page]);

  function init(config) {
    state.config = config;
    cleanupCache();
    restoreState();
    bindEvents();
    renderQuickButtons();
    renderRecent();
    renderFavorites();
    setInitialForm();
    loadSymbol(state.symbol || config.defaultSymbol, { range: state.range });
  }

  function restoreState() {
    state.symbol = readSetting("symbol") || state.config.defaultSymbol;
    state.range = readSetting("range") || state.config.defaultRange;
    state.recent = readJsonSetting("recent", []);
    state.favorite = readJsonSetting("favorite", []);
  }

  function setInitialForm() {
    const input = $("#stockSymbolInput");
    const range = $("#stockRange");
    const market = $("#koreaMarketSuffix");
    if (input) input.value = displayInputSymbol(state.symbol);
    if (range) range.value = state.range;
    if (market && state.symbol.endsWith(".KQ")) market.value = "KQ";
  }

  function bindEvents() {
    $("#stockLookup")?.addEventListener("click", () => readFormAndLoad());
    $("#stockRefresh")?.addEventListener("click", () => readFormAndLoad({ force: true }));
    $("#stockReset")?.addEventListener("click", resetTool);
    $("#stockFavorite")?.addEventListener("click", toggleFavorite);
    $("#stockCopy")?.addEventListener("click", copySummary);
    $("#stockSymbolInput")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        readFormAndLoad();
      }
    });
    $("#stockRange")?.addEventListener("change", () => {
      state.range = $("#stockRange").value;
      writeSetting("range", state.range);
      if (state.symbol) loadSymbol(state.symbol, { range: state.range });
    });
  }

  function readFormAndLoad(options = {}) {
    const input = $("#stockSymbolInput")?.value || "";
    const symbol = normalizeSymbol(input);
    if (!symbol) {
      setStatus("종목코드나 티커를 입력하세요.", "error");
      return;
    }
    const range = $("#stockRange")?.value || state.config.defaultRange;
    state.range = range;
    writeSetting("range", range);
    loadSymbol(symbol, { range, ...options });
  }

  async function loadSymbol(symbol, options = {}) {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return;
    state.symbol = normalized;
    writeSetting("symbol", normalized);
    const input = $("#stockSymbolInput");
    if (input) input.value = displayInputSymbol(normalized);
    setLoading(true);
    setStatus(`${normalized} 데이터를 불러오는 중입니다.`, "info");
    try {
      const result = await fetchChart(normalized, options.range || state.range, options);
      state.data = normalizeChart(result, normalized);
      if (!state.data.points.length) throw new Error("표시할 가격 데이터가 없습니다.");
      addRecent(normalized, state.data.name);
      renderAll();
      setStatus(result.stale ? "API 호출 실패로 저장된 최근 데이터를 표시합니다." : "최신 주식 데이터를 표시합니다.", result.stale ? "warn" : "success");
    } catch (error) {
      state.data = null;
      renderAll();
      setStatus(error.message || "주식 데이터를 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchChart(symbol, range, options = {}) {
    const interval = range === "1mo" ? "1d" : "1d";
    const url = `${YAHOO_CHART}/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${interval}&includePrePost=false&events=div%2Csplits`;
    return cachedFetch(url, `${state.config.storageKey}:${symbol}:${range}`, QUOTE_TTL, options);
  }

  async function cachedFetch(url, key, ttl, options = {}) {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const now = Date.now();
    const memory = memoryCache.get(cacheKey);
    if (!options.force && memory && now - memory.savedAt < ttl) return { data: memory.data, fromCache: true, stale: false };
    const local = readCache(cacheKey);
    if (!options.force && local && now - local.savedAt < ttl) {
      memoryCache.set(cacheKey, local);
      return { data: local.data, fromCache: true, stale: false };
    }
    if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);
    const request = fetchJson(url)
      .then(async (response) => {
        const data = response;
        const error = data?.chart?.error;
        if (error) throw new Error(error.description || "종목 데이터를 찾을 수 없습니다.");
        writeCache(cacheKey, data);
        return { data, fromCache: false, stale: false };
      })
      .catch((error) => {
        const stale = readCache(cacheKey);
        if (stale) {
          memoryCache.set(cacheKey, stale);
          return { data: stale.data, fromCache: true, stale: true };
        }
        throw error;
      })
      .finally(() => inFlight.delete(cacheKey));
    inFlight.set(cacheKey, request);
    return request;
  }

  async function fetchJson(url) {
    const urls = [
      url,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`
    ];
    let lastError = null;
    for (const target of urls) {
      try {
        const response = await fetch(target, { headers: { accept: "application/json" } });
        if (!response.ok) throw new Error(`API 오류: HTTP ${response.status}`);
        return await response.json();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("주식 데이터를 불러오지 못했습니다.");
  }

  function normalizeChart(result, symbol) {
    const item = result.data?.chart?.result?.[0];
    if (!item) throw new Error("종목 데이터를 찾을 수 없습니다.");
    const meta = item.meta || {};
    const quote = item.indicators?.quote?.[0] || {};
    const timestamps = Array.isArray(item.timestamp) ? item.timestamp : [];
    const closes = Array.isArray(quote.close) ? quote.close : [];
    const opens = Array.isArray(quote.open) ? quote.open : [];
    const highs = Array.isArray(quote.high) ? quote.high : [];
    const lows = Array.isArray(quote.low) ? quote.low : [];
    const volumes = Array.isArray(quote.volume) ? quote.volume : [];
    const points = timestamps.map((timestamp, index) => ({
      date: new Date(timestamp * 1000),
      open: numberOrNull(opens[index]),
      high: numberOrNull(highs[index]),
      low: numberOrNull(lows[index]),
      close: numberOrNull(closes[index]),
      volume: numberOrNull(volumes[index])
    })).filter((point) => Number.isFinite(point.close));
    const latest = points[points.length - 1] || null;
    const previous = points.length > 1 ? points[points.length - 2] : null;
    const regularPrice = numberOrNull(meta.regularMarketPrice);
    const previousClose = numberOrNull(meta.previousClose ?? meta.chartPreviousClose);
    const current = Number.isFinite(regularPrice) ? regularPrice : latest?.close;
    const base = Number.isFinite(previousClose) ? previousClose : previous?.close;
    const change = Number.isFinite(current) && Number.isFinite(base) ? current - base : null;
    const changePercent = Number.isFinite(change) && base ? (change / base) * 100 : null;
    return {
      symbol: meta.symbol || symbol,
      name: meta.shortName || meta.longName || meta.symbol || symbol,
      currency: meta.currency || state.config.currency,
      exchange: meta.fullExchangeName || meta.exchangeName || "-",
      timezone: meta.exchangeTimezoneName || "",
      current,
      previousClose: base,
      change,
      changePercent,
      dayHigh: numberOrNull(meta.regularMarketDayHigh) ?? latest?.high,
      dayLow: numberOrNull(meta.regularMarketDayLow) ?? latest?.low,
      volume: numberOrNull(meta.regularMarketVolume) ?? latest?.volume,
      firstClose: points[0]?.close,
      latestDate: latest?.date || null,
      points
    };
  }

  function renderAll() {
    renderSummary();
    renderChart();
    renderHistory();
    renderFavorites();
  }

  function renderSummary() {
    const data = state.data;
    setText("#stockHeroSymbol", data ? data.symbol : "-");
    setText("#stockHeroPrice", data ? formatMoney(data.current, data.currency) : "-");
    setText("#stockName", data ? data.name : "종목을 조회하세요");
    setText("#stockMeta", data ? `${data.symbol} · ${data.exchange}${data.timezone ? ` · ${data.timezone}` : ""}` : state.config.examples);
    setText("#stockPrice", data ? formatMoney(data.current, data.currency) : "-");
    setText("#stockChange", data ? formatChange(data.change, data.changePercent) : "-");
    setText("#stockPrevious", data ? formatMoney(data.previousClose, data.currency) : "-");
    setText("#stockVolume", data ? formatCompact(data.volume) : "-");
    setText("#stockDayRange", data ? `${formatMoney(data.dayLow, data.currency)} ~ ${formatMoney(data.dayHigh, data.currency)}` : "-");
    setText("#stockLatestDate", data?.latestDate ? formatDate(data.latestDate) : "-");
    const changeEl = $("#stockChange");
    if (changeEl) {
      changeEl.classList.toggle("up", (data?.change || 0) > 0);
      changeEl.classList.toggle("down", (data?.change || 0) < 0);
    }
    const favoriteButton = $("#stockFavorite");
    if (favoriteButton) favoriteButton.textContent = isFavorite(state.symbol) ? "관심 해제" : "관심 추가";
  }

  function renderChart() {
    const chart = $("#stockChart");
    const caption = $("#stockChartCaption");
    if (!chart) return;
    const points = state.data?.points || [];
    chart.innerHTML = lineChart(points);
    if (caption) {
      const first = points[0]?.date;
      const last = points[points.length - 1]?.date;
      caption.textContent = first && last ? `${formatDate(first)} ~ ${formatDate(last)} · ${RANGE_LABELS[state.range] || state.range}` : "차트 데이터가 없습니다.";
    }
  }

  function renderHistory() {
    const body = $("#stockHistoryBody");
    if (!body) return;
    const points = (state.data?.points || []).slice(-20).reverse();
    body.innerHTML = points.map((point) => `
      <tr>
        <td>${escapeHtml(formatDate(point.date))}</td>
        <td>${escapeHtml(formatMoney(point.close, state.data.currency))}</td>
        <td>${escapeHtml(formatMoney(point.open, state.data.currency))}</td>
        <td>${escapeHtml(formatMoney(point.high, state.data.currency))}</td>
        <td>${escapeHtml(formatMoney(point.low, state.data.currency))}</td>
        <td>${escapeHtml(formatCompact(point.volume))}</td>
      </tr>
    `).join("") || '<tr><td colspan="6">조회된 가격 데이터가 없습니다.</td></tr>';
  }

  function renderQuickButtons() {
    const list = $("#stockQuickList");
    if (!list) return;
    list.innerHTML = state.config.quick.map(([symbol, label]) => `<button type="button" data-stock-symbol="${escapeAttr(symbol)}">${escapeHtml(label)}<small>${escapeHtml(symbol)}</small></button>`).join("");
    $$("[data-stock-symbol]", list).forEach((button) => {
      button.addEventListener("click", () => loadSymbol(button.dataset.stockSymbol, { range: state.range }));
    });
  }

  function renderRecent() {
    const list = $("#stockRecentList");
    if (!list) return;
    list.innerHTML = state.recent.map((item) => `<button type="button" data-stock-recent="${escapeAttr(item.symbol)}">${escapeHtml(item.label || item.symbol)}</button>`).join("") || '<span class="empty-chip">최근 조회 없음</span>';
    $$("[data-stock-recent]", list).forEach((button) => {
      button.addEventListener("click", () => loadSymbol(button.dataset.stockRecent, { range: state.range }));
    });
  }

  function renderFavorites() {
    const list = $("#stockFavoriteList");
    if (!list) return;
    list.innerHTML = state.favorite.map((item) => `<button type="button" data-stock-favorite="${escapeAttr(item.symbol)}">${escapeHtml(item.label || item.symbol)}</button>`).join("") || '<span class="empty-chip">관심종목 없음</span>';
    $$("[data-stock-favorite]", list).forEach((button) => {
      button.addEventListener("click", () => loadSymbol(button.dataset.stockFavorite, { range: state.range }));
    });
  }

  function lineChart(points) {
    const values = points.map((point) => point.close).filter(Number.isFinite);
    if (values.length < 2) return '<div class="stock-chart-empty">차트 데이터가 없습니다.</div>';
    const width = 720;
    const height = 260;
    const pad = 18;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const sampled = points.filter((point) => Number.isFinite(point.close));
    const path = sampled.map((point, index) => {
      const x = pad + (index / Math.max(1, sampled.length - 1)) * (width - pad * 2);
      const y = height - pad - ((point.close - min) / range) * (height - pad * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
    const last = sampled[sampled.length - 1]?.close;
    const first = sampled[0]?.close;
    const direction = last >= first ? "up" : "down";
    return `
      <svg class="stock-chart-svg ${direction}" viewBox="0 0 ${width} ${height}" role="img" aria-label="가격 차트">
        <path class="stock-chart-grid" d="M${pad} ${pad}H${width - pad}M${pad} ${height / 2}H${width - pad}M${pad} ${height - pad}H${width - pad}"></path>
        <path class="stock-chart-line" d="${path}"></path>
      </svg>
    `;
  }

  function toggleFavorite() {
    if (!state.data) return;
    const index = state.favorite.findIndex((item) => item.symbol === state.symbol);
    if (index >= 0) {
      state.favorite.splice(index, 1);
      setStatus("관심종목에서 제거했습니다.", "success");
    } else {
      state.favorite.unshift({ symbol: state.symbol, label: state.data.name });
      state.favorite = state.favorite.slice(0, 12);
      setStatus("관심종목에 추가했습니다.", "success");
    }
    writeJsonSetting("favorite", state.favorite);
    renderFavorites();
    renderSummary();
  }

  function addRecent(symbol, label) {
    state.recent = [{ symbol, label }, ...state.recent.filter((item) => item.symbol !== symbol)].slice(0, 10);
    writeJsonSetting("recent", state.recent);
    renderRecent();
  }

  async function copySummary() {
    if (!state.data) {
      setStatus("복사할 조회 결과가 없습니다.", "error");
      return;
    }
    const data = state.data;
    const text = [
      `${state.config.title} 조회 요약`,
      `${data.name} (${data.symbol})`,
      `현재가: ${formatMoney(data.current, data.currency)}`,
      `등락: ${formatChange(data.change, data.changePercent)}`,
      `거래량: ${formatCompact(data.volume)}`,
      `기준일: ${data.latestDate ? formatDate(data.latestDate) : "-"}`,
      "주의: 지연 데이터일 수 있으며 투자 조언이 아닙니다."
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setStatus("요약을 클립보드에 복사했습니다.", "success");
    } catch (_error) {
      setStatus("클립보드 복사에 실패했습니다.", "error");
    }
  }

  function resetTool() {
    state.symbol = state.config.defaultSymbol;
    state.range = state.config.defaultRange;
    writeSetting("symbol", state.symbol);
    writeSetting("range", state.range);
    setInitialForm();
    loadSymbol(state.symbol, { range: state.range, force: true });
  }

  function normalizeSymbol(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const alias = state.config.aliases[raw.toLocaleLowerCase("ko")] || state.config.aliases[raw];
    if (alias) return alias;
    if (state.config.mode === "kr") {
      const compact = raw.replace(/\s+/g, "").toUpperCase();
      if (/^\d{6}\.(KS|KQ)$/.test(compact)) return compact;
      if (/^\d{6}$/.test(compact)) {
        const suffix = $("#koreaMarketSuffix")?.value === "KQ" ? "KQ" : "KS";
        return `${compact}.${suffix}`;
      }
      return compact.includes(".") ? compact : `${compact}.KS`;
    }
    return raw.replace(/\s+/g, "").toUpperCase();
  }

  function displayInputSymbol(symbol) {
    if (state.config.mode === "kr") return String(symbol).replace(/\.(KS|KQ)$/i, "");
    return symbol;
  }

  function isFavorite(symbol) {
    return state.favorite.some((item) => item.symbol === symbol);
  }

  function setLoading(loading) {
    state.loading = loading;
    ["stockLookup", "stockRefresh"].forEach((id) => {
      const button = document.getElementById(id);
      if (button) button.disabled = loading;
    });
  }

  function setStatus(message, type = "info") {
    const status = $("#stockStatus");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("valid", type === "success");
    status.classList.toggle("invalid", type === "error");
    status.dataset.status = type;
  }

  function formatMoney(value, currency) {
    if (!Number.isFinite(value)) return "-";
    const maximumFractionDigits = currency === "KRW" ? 0 : value >= 10 ? 2 : 4;
    try {
      return new Intl.NumberFormat(currency === "KRW" ? "ko-KR" : "en-US", {
        style: "currency",
        currency,
        maximumFractionDigits
      }).format(value);
    } catch (_error) {
      return `${value.toLocaleString("ko-KR")} ${currency}`;
    }
  }

  function formatChange(change, percent) {
    if (!Number.isFinite(change) || !Number.isFinite(percent)) return "-";
    const sign = change > 0 ? "+" : "";
    return `${sign}${formatMoney(change, state.data?.currency || state.config.currency)} (${sign}${percent.toFixed(2)}%)`;
  }

  function formatCompact(value) {
    if (!Number.isFinite(value)) return "-";
    return new Intl.NumberFormat("ko-KR", { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(value);
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(date);
  }

  function numberOrNull(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
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
        if (aggressive || !entry.savedAt || now - entry.savedAt > QUOTE_TTL * 24) window.localStorage.removeItem(key);
      });
    } catch (_error) {
      // Best effort.
    }
  }

  function settingKey(name) {
    return `${SETTINGS_PREFIX}${state.config.storageKey}:${name}`;
  }

  function readSetting(name) {
    try {
      return window.localStorage.getItem(settingKey(name));
    } catch (_error) {
      return null;
    }
  }

  function writeSetting(name, value) {
    try {
      window.localStorage.setItem(settingKey(name), value);
    } catch (_error) {
      // Optional.
    }
  }

  function readJsonSetting(name, fallback) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(settingKey(name)) || "null");
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function writeJsonSetting(name, value) {
    try {
      window.localStorage.setItem(settingKey(name), JSON.stringify(value));
    } catch (_error) {
      // Optional.
    }
  }

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = value;
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
