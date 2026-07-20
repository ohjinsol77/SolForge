(function () {
  "use strict";

  const API_URL = "https://api.frankfurter.dev/v1/latest";
  const CACHE_KEY = "sf-exchange-rates:v1";
  const CACHE_TTL = 60 * 60 * 1000;
  const AUTO_REFRESH_MS = 60 * 60 * 1000;
  const CURRENCIES = [
    ["KRW", "🇰🇷"], ["USD", "🇺🇸"], ["JPY", "🇯🇵"], ["CNY", "🇨🇳"],
    ["EUR", "🇪🇺"], ["GBP", "🇬🇧"], ["CAD", "🇨🇦"], ["AUD", "🇦🇺"],
    ["HKD", "🇭🇰"], ["SGD", "🇸🇬"], ["THB", "🇹🇭"], ["PHP", "🇵🇭"],
    ["IDR", "🇮🇩"], ["MYR", "🇲🇾"], ["CHF", "🇨🇭"], ["NZD", "🇳🇿"]
  ];
  const TEXT = {
    ko: {
      loading: "환율 정보를 불러오는 중입니다.",
      live: "최근 기준환율을 표시합니다.",
      cached: "최근 확인한 환율을 표시합니다.",
      stale: "API 연결에 실패해 마지막으로 저장된 환율을 표시합니다.",
      error: "환율 정보를 불러오지 못했습니다. 잠시 후 다시 시도하세요.",
      invalid: "0 이상의 금액을 입력하세요.",
      copied: "환산 결과를 복사했습니다.",
      copyFailed: "복사하지 못했습니다.",
      oneUnit: "1 {base} = {rate} {target}",
      sourceLine: "{amount} {base}",
      cardLabel: "{currency} 환산 금액",
      unavailable: "정보 없음"
    },
    en: {
      loading: "Loading exchange rates.",
      live: "Showing the latest available reference rates.",
      cached: "Showing recently checked exchange rates.",
      stale: "The API is unavailable, so the last saved rates are shown.",
      error: "Exchange rates could not be loaded. Please try again shortly.",
      invalid: "Enter an amount of zero or more.",
      copied: "Conversion copied.",
      copyFailed: "Could not copy the result.",
      oneUnit: "1 {base} = {rate} {target}",
      sourceLine: "{amount} {base}",
      cardLabel: "Converted amount in {currency}",
      unavailable: "Unavailable"
    }
  };

  const state = {
    lang: document.documentElement.lang === "en" ? "en" : "ko",
    rates: null,
    rateDate: "",
    fetchedAt: 0,
    loading: false
  };

  const $ = (selector) => document.querySelector(selector);

  function init() {
    if (!document.body.matches('[data-page="exchange-rates"]')) return;
    populateCurrencySelects();
    applyInitialState();
    bindEvents();
    render();
    loadRates();
    window.setInterval(() => loadRates({ force: true, quiet: true }), AUTO_REFRESH_MS);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && Date.now() - state.fetchedAt >= CACHE_TTL) loadRates({ force: true, quiet: true });
    });
  }

  function populateCurrencySelects() {
    const displayNames = typeof Intl.DisplayNames === "function"
      ? new Intl.DisplayNames([state.lang], { type: "currency" })
      : null;
    const options = CURRENCIES.map(([code, flag]) => {
      const name = displayNames?.of(code) || code;
      return `<option value="${code}">${flag} ${escapeHtml(name)} (${code})</option>`;
    }).join("");
    $("#exchangeBase").innerHTML = options;
    $("#exchangeTarget").innerHTML = options;
  }

  function applyInitialState() {
    const params = new URLSearchParams(window.location.search);
    const defaultBase = state.lang === "ko" ? "KRW" : "USD";
    const defaultTarget = state.lang === "ko" ? "USD" : "KRW";
    const base = normalizeCurrency(params.get("base")) || defaultBase;
    const target = normalizeCurrency(params.get("target")) || defaultTarget;
    const amountParam = params.get("amount");
    const amount = amountParam === null ? NaN : Number(amountParam);
    $("#exchangeBase").value = base;
    $("#exchangeTarget").value = target === base ? defaultTarget : target;
    $("#exchangeAmount").value = Number.isFinite(amount) && amount >= 0
      ? String(amount)
      : (state.lang === "ko" ? "10000" : "100");
  }

  function bindEvents() {
    $("#exchangeAmount").addEventListener("input", handleInput);
    $("#exchangeBase").addEventListener("change", handleInput);
    $("#exchangeTarget").addEventListener("change", handleInput);
    $("#exchangeSwap").addEventListener("click", () => {
      const base = $("#exchangeBase").value;
      $("#exchangeBase").value = $("#exchangeTarget").value;
      $("#exchangeTarget").value = base;
      handleInput();
    });
    $("#exchangeRefresh").addEventListener("click", () => loadRates({ force: true }));
    $("#exchangeCopy").addEventListener("click", copyResult);
    $("#exchangeReset").addEventListener("click", () => {
      $("#exchangeBase").value = state.lang === "ko" ? "KRW" : "USD";
      $("#exchangeTarget").value = state.lang === "ko" ? "USD" : "KRW";
      $("#exchangeAmount").value = state.lang === "ko" ? "10000" : "100";
      handleInput();
    });
  }

  function handleInput() {
    render();
    updateUrl();
  }

  async function loadRates(options = {}) {
    if (state.loading) return;
    const cached = readCache();
    if (!options.force && cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      applyRates(cached);
      setStatus(t("cached"), "valid");
      return;
    }

    state.loading = true;
    setLoading(true);
    if (!options.quiet) setStatus(t("loading"));
    try {
      const response = await fetch(`${API_URL}?base=EUR`, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload || !payload.rates || !payload.date) throw new Error("Invalid exchange-rate response");
      const entry = {
        rateDate: payload.date,
        fetchedAt: Date.now(),
        rates: { ...payload.rates, EUR: 1 }
      };
      writeCache(entry);
      applyRates(entry);
      setStatus(t("live"), "valid");
    } catch (_error) {
      if (cached) {
        applyRates(cached);
        setStatus(t("stale"), "invalid");
      } else {
        setStatus(t("error"), "invalid");
      }
    } finally {
      state.loading = false;
      setLoading(false);
    }
  }

  function applyRates(entry) {
    state.rates = entry.rates;
    state.rateDate = entry.rateDate;
    state.fetchedAt = entry.fetchedAt;
    render();
  }

  function render() {
    const amount = Number($("#exchangeAmount").value);
    const base = $("#exchangeBase").value;
    const target = $("#exchangeTarget").value;
    const valid = Number.isFinite(amount) && amount >= 0;
    const converted = valid ? convert(amount, base, target) : null;

    $("#exchangeHeroBase").textContent = base;
    $("#exchangeHeroDate").textContent = state.rateDate || "-";
    $("#exchangeRateDate").textContent = state.rateDate || "-";
    $("#exchangeFetchedAt").textContent = state.fetchedAt ? formatDateTime(state.fetchedAt) : "-";
    $("#exchangeSourceAmount").textContent = valid ? interpolate(t("sourceLine"), {
      amount: formatPlain(amount, base),
      base
    }) : t("invalid");
    $("#exchangeConvertedAmount").textContent = converted == null ? "-" : formatMoney(converted, target);
    $("#exchangeRateLine").textContent = state.rates
      ? interpolate(t("oneUnit"), { base, rate: formatRate(convert(1, base, target)), target })
      : "-";

    renderRateGrid(valid ? amount : null, base, target);
    if (!valid) setStatus(t("invalid"), "invalid");
  }

  function renderRateGrid(amount, base, target) {
    const grid = $("#exchangeRateGrid");
    grid.innerHTML = CURRENCIES.filter(([code]) => code !== base).map(([code, flag]) => {
      const value = amount == null ? null : convert(amount, base, code);
      const selected = code === target;
      return [
        `<button type="button" class="exchange-rate-card${selected ? " active" : ""}" data-currency="${code}" aria-pressed="${selected}" aria-label="${escapeHtml(interpolate(t("cardLabel"), { currency: code }))}">`,
        `<span class="exchange-card-head"><span class="exchange-flag" aria-hidden="true">${flag}</span><strong>${code}</strong></span>`,
        `<b>${value == null ? t("unavailable") : escapeHtml(formatMoney(value, code))}</b>`,
        amount == null || value == null ? "" : `<small>${escapeHtml(interpolate(t("oneUnit"), { base, rate: formatRate(convert(1, base, code)), target: code }))}</small>`,
        "</button>"
      ].join("");
    }).join("");
    grid.querySelectorAll("[data-currency]").forEach((button) => {
      button.addEventListener("click", () => {
        $("#exchangeTarget").value = button.dataset.currency;
        handleInput();
        $(".exchange-primary-result")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  }

  function convert(amount, base, target) {
    if (!state.rates) return null;
    if (base === target) return amount;
    const baseRate = state.rates[base];
    const targetRate = state.rates[target];
    if (!Number.isFinite(baseRate) || !Number.isFinite(targetRate)) return null;
    return (amount / baseRate) * targetRate;
  }

  function formatMoney(value, currency) {
    const maximumFractionDigits = ["KRW", "JPY", "IDR"].includes(currency)
      ? 0
      : (Math.abs(value) < 1 ? 4 : 2);
    return `${new Intl.NumberFormat(state.lang, { maximumFractionDigits }).format(value)} ${currency}`;
  }

  function formatPlain(value, currency) {
    const maximumFractionDigits = ["KRW", "JPY", "IDR"].includes(currency) ? 0 : 4;
    return new Intl.NumberFormat(state.lang, { maximumFractionDigits }).format(value);
  }

  function formatRate(value) {
    if (!Number.isFinite(value)) return "-";
    const maximumFractionDigits = value < 0.01 ? 8 : (value < 1 ? 6 : 4);
    return new Intl.NumberFormat(state.lang, { maximumFractionDigits }).format(value);
  }

  function formatDateTime(timestamp) {
    return new Intl.DateTimeFormat(state.lang, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(timestamp));
  }

  function setLoading(loading) {
    $("#exchangeRefresh").disabled = loading;
    $("#exchangeRefresh").setAttribute("aria-busy", String(loading));
  }

  function setStatus(message, type = "") {
    const status = $("#exchangeStatus");
    status.textContent = message;
    status.className = `validation-message${type ? ` ${type}` : ""}`;
  }

  async function copyResult() {
    const amount = Number($("#exchangeAmount").value);
    const base = $("#exchangeBase").value;
    const target = $("#exchangeTarget").value;
    const converted = convert(amount, base, target);
    if (!Number.isFinite(converted)) {
      setStatus(t("copyFailed"), "invalid");
      return;
    }
    const value = `${formatPlain(amount, base)} ${base} = ${formatMoney(converted, target)} (${state.rateDate})`;
    try {
      await navigator.clipboard.writeText(value);
      setStatus(t("copied"), "valid");
    } catch (_error) {
      setStatus(t("copyFailed"), "invalid");
    }
  }

  function updateUrl() {
    const params = new URLSearchParams(window.location.search);
    params.set("amount", $("#exchangeAmount").value || "0");
    params.set("base", $("#exchangeBase").value);
    params.set("target", $("#exchangeTarget").value);
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    const languageToggle = $("#languageToggle");
    if (languageToggle) {
      const target = new URL(languageToggle.href, window.location.href);
      target.search = query;
      target.hash = window.location.hash;
      languageToggle.href = `${target.pathname}${target.search}${target.hash}`;
    }
  }

  function readCache() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(CACHE_KEY) || "null");
      return parsed && parsed.rates && parsed.rateDate && parsed.fetchedAt ? parsed : null;
    } catch (_error) {
      return null;
    }
  }

  function writeCache(entry) {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch (_error) {
      // The live response remains usable when storage is unavailable.
    }
  }

  function normalizeCurrency(value) {
    const code = String(value || "").toUpperCase();
    return CURRENCIES.some(([currency]) => currency === code) ? code : "";
  }

  function t(key) {
    return TEXT[state.lang][key] || TEXT.ko[key] || key;
  }

  function interpolate(template, values) {
    return String(template).replace(/\{(\w+)\}/g, (_match, key) => values[key] ?? "");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  document.addEventListener("DOMContentLoaded", init);
}());
