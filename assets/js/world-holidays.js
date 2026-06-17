(function () {
  "use strict";

  const API_BASE = "https://date.nager.at/api/v3";
  const CACHE_PREFIX = "sf-holiday-cache:";
  const RECENT_KEY = "sf-holiday-recent";
  const COUNTRIES_TTL = 7 * 24 * 60 * 60 * 1000;
  const HOLIDAYS_TTL = 24 * 60 * 60 * 1000;
  const QUICK_COUNTRIES = ["KR", "US", "JP", "DE", "GB", "FR", "CA", "AU"];
  const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
  const memoryCache = new Map();
  const inFlight = new Map();

  const state = {
    countries: [],
    country: "KR",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    holidays: [],
    fromCache: false,
    selectedDate: "",
    loading: false
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function init() {
    if (!document.body.matches('[data-page="world-holidays"]')) return;
    cleanupCache();
    applyQueryParams();
    bindEvents();
    setFormValues();
    renderRecent();
    loadCountries().then(() => loadHolidays()).catch((error) => {
      setStatus(error.message || "국가 목록을 불러오지 못했습니다.", "error");
      state.countries = QUICK_COUNTRIES.map((code) => ({ countryCode: code, name: code }));
      populateCountryControls();
      return loadHolidays();
    });
  }

  function bindEvents() {
    $("#holidayLoad")?.addEventListener("click", () => readControlsAndLoad());
    $("#holidayRefresh")?.addEventListener("click", () => readControlsAndLoad({ force: true }));
    $("#holidayReset")?.addEventListener("click", resetTool);
    $("#holidayPrevMonth")?.addEventListener("click", () => moveMonth(-1));
    $("#holidayNextMonth")?.addEventListener("click", () => moveMonth(1));
    $("#holidayToday")?.addEventListener("click", goToday);
    $("#holidayCountrySearch")?.addEventListener("input", populateCountryControls);
    $("#holidayCountry")?.addEventListener("change", () => {
      state.country = $("#holidayCountry").value;
      syncCountrySelects();
    });
    $("#holidayYear")?.addEventListener("change", () => {
      state.year = clampYear(Number($("#holidayYear").value));
      $("#holidayYear").value = String(state.year);
    });
    $("#holidayMonth")?.addEventListener("change", () => {
      state.month = clampMonth(Number($("#holidayMonth").value));
    });
    $("#holidayCopy")?.addEventListener("click", copyMonthList);
    $("#holidayCsv")?.addEventListener("click", downloadCsv);
    $("#holidayIcs")?.addEventListener("click", downloadIcs);
    $("#holidayCompareRun")?.addEventListener("click", runCompare);
    $("#holidayCompareCopy")?.addEventListener("click", copyCompare);
    $("#businessRun")?.addEventListener("click", runBusinessDays);
    $$("[data-quick-country]").forEach((button) => {
      button.addEventListener("click", () => {
        state.country = button.dataset.quickCountry;
        syncCountrySelects();
        setFormValues();
        loadHolidays();
      });
    });
  }

  function applyQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const country = params.get("country");
    const year = Number(params.get("year"));
    const month = Number(params.get("month"));
    if (country) state.country = country.toUpperCase();
    if (Number.isFinite(year)) state.year = clampYear(year);
    if (Number.isFinite(month)) state.month = clampMonth(month);
  }

  function setFormValues() {
    const year = $("#holidayYear");
    const month = $("#holidayMonth");
    if (year) year.value = String(state.year);
    if (month) month.value = String(state.month);
    syncCountrySelects();
  }

  async function loadCountries(options = {}) {
    setLoading(true);
    try {
      const result = await cachedFetch(`${API_BASE}/AvailableCountries`, "countries", COUNTRIES_TTL, options);
      state.countries = result.data
        .map((country) => ({ countryCode: country.countryCode, name: country.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      populateCountryControls();
      if (result.fromCache) setStatus(result.stale ? "국가 목록 API 실패로 캐시된 데이터를 표시합니다." : "국가 목록 캐시를 사용했습니다.", "info");
    } finally {
      setLoading(false);
    }
  }

  async function loadHolidays(options = {}) {
    setLoading(true);
    setStatus("공휴일 데이터를 불러오는 중입니다.", "info");
    try {
      const country = encodeURIComponent(state.country);
      const url = `${API_BASE}/PublicHolidays/${state.year}/${country}`;
      const result = await cachedFetch(url, `holidays:${state.country}:${state.year}`, HOLIDAYS_TTL, options);
      state.holidays = result.data.map(normalizeHoliday).sort((a, b) => a.date.localeCompare(b.date));
      state.fromCache = result.fromCache;
      state.selectedDate = state.selectedDate || todayString();
      updateUrl();
      addRecent();
      renderAll();
      setStatus(result.stale ? "API 호출에 실패해 캐시된 데이터를 표시합니다." : (result.fromCache ? "캐시된 데이터를 표시합니다." : "최신 공휴일 데이터를 표시합니다."), result.stale ? "warn" : "success");
    } catch (error) {
      state.holidays = [];
      renderAll();
      setStatus(error.message || "공휴일 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.", "error");
    } finally {
      setLoading(false);
    }
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
    const request = fetch(url, { headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`API 오류: HTTP ${response.status}`);
        const data = await response.json();
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

  function readCache(key) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.data) || !parsed.savedAt) return null;
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
        const maxAge = key.includes(":countries") ? COUNTRIES_TTL : HOLIDAYS_TTL;
        if (aggressive || !entry.savedAt || now - entry.savedAt > maxAge * 3) window.localStorage.removeItem(key);
      });
    } catch (_error) {
      // Cache cleanup is best effort only.
    }
  }

  function populateCountryControls() {
    const query = ($("#holidayCountrySearch")?.value || "").trim().toLocaleLowerCase("ko");
    const countries = state.countries.filter((country) => (
      country.countryCode.toLowerCase().includes(query) || country.name.toLocaleLowerCase("ko").includes(query)
    ));
    const options = countries.map((country) => `<option value="${escapeHtml(country.countryCode)}">${escapeHtml(country.name)} (${escapeHtml(country.countryCode)})</option>`).join("");
    ["holidayCountry", "holidayCompareA", "holidayCompareB", "businessCountry"].forEach((id) => {
      const select = $(`#${id}`);
      if (!select) return;
      const previous = select.value || (id === "holidayCompareB" ? "US" : state.country);
      select.innerHTML = options;
      select.value = countries.some((country) => country.countryCode === previous) ? previous : (countries[0]?.countryCode || state.country);
    });
    syncCountrySelects();
  }

  function syncCountrySelects() {
    ["holidayCountry", "businessCountry", "holidayCompareA"].forEach((id) => {
      const select = $(`#${id}`);
      if (select && Array.from(select.options).some((option) => option.value === state.country)) select.value = state.country;
    });
    const compareB = $("#holidayCompareB");
    if (compareB && !compareB.value) compareB.value = state.country === "US" ? "KR" : "US";
    $$("[data-quick-country]").forEach((button) => button.classList.toggle("active", button.dataset.quickCountry === state.country));
  }

  function readControlsAndLoad(options = {}) {
    const country = $("#holidayCountry")?.value || state.country;
    const year = Number($("#holidayYear")?.value);
    const month = Number($("#holidayMonth")?.value);
    state.country = country;
    state.year = clampYear(year);
    state.month = clampMonth(month);
    state.selectedDate = "";
    setFormValues();
    loadHolidays(options);
  }

  function moveMonth(delta) {
    const next = new Date(state.year, state.month - 1 + delta, 1);
    state.year = next.getFullYear();
    state.month = next.getMonth() + 1;
    state.selectedDate = "";
    setFormValues();
    loadHolidays();
  }

  function goToday() {
    const today = new Date();
    state.year = today.getFullYear();
    state.month = today.getMonth() + 1;
    state.selectedDate = formatDate(today);
    setFormValues();
    loadHolidays();
  }

  function resetTool() {
    state.country = "KR";
    state.year = new Date().getFullYear();
    state.month = new Date().getMonth() + 1;
    state.selectedDate = "";
    $("#holidayCountrySearch").value = "";
    setFormValues();
    loadHolidays();
  }

  function renderAll() {
    renderSummary();
    renderCalendar();
    renderLists();
    renderMonthlySummary();
    renderBridge();
    renderRecent();
    renderDetail(state.selectedDate);
  }

  function renderSummary() {
    const monthItems = state.holidays.filter((item) => getParts(item.date).month === state.month);
    const today = startOfDay(new Date());
    const remaining = state.holidays.filter((item) => parseLocalDate(item.date) >= today);
    const next = remaining[0];
    const weekdayCount = monthItems.filter((item) => !isWeekend(parseLocalDate(item.date))).length;
    setText("#holidayRemainingCount", remaining.length);
    setText("#holidayNextDday", next ? `D-${diffDays(today, parseLocalDate(next.date))}` : "-");
    setText("#holidayMonthTotal", monthItems.length);
    setText("#holidayMonthWeekday", weekdayCount);
    setText("#holidayMonthWeekend", monthItems.length - weekdayCount);
    setText("#holidayNextName", next ? next.localName : "남은 공휴일 없음");
    setText("#holidayNextDate", next ? `${next.date} · D-${diffDays(today, parseLocalDate(next.date))}` : "");
  }

  function renderCalendar() {
    const title = $("#holidayCalendarTitle");
    if (title) title.textContent = `${state.year}년 ${state.month}월 달력`;
    const root = $("#holidayCalendar");
    if (!root) return;
    const byDate = groupByDate(state.holidays);
    const first = new Date(state.year, state.month - 1, 1);
    const start = new Date(state.year, state.month - 1, 1 - first.getDay());
    const today = todayString();
    const cells = WEEKDAYS.map((day) => `<div class="calendar-weekday">${day}</div>`);
    for (let i = 0; i < 42; i += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const value = formatDate(date);
      const items = byDate.get(value) || [];
      const muted = date.getMonth() + 1 !== state.month;
      const classes = ["calendar-day", muted ? "is-muted" : "", isWeekend(date) ? "is-weekend" : "", items.length ? "is-holiday" : "", value === today ? "is-today" : ""].filter(Boolean).join(" ");
      const badges = items.slice(0, 2).map((item) => `<span class="holiday-badge">${escapeHtml(item.localName)}</span>`).join("");
      const more = items.length > 2 ? `<span class="holiday-badge secondary">+${items.length - 2}</span>` : "";
      cells.push(`<button type="button" class="${classes}" data-holiday-date="${value}"><span class="calendar-date"><span>${date.getDate()}</span>${items.length ? `<small>${items.length}</small>` : ""}</span>${badges}${more}</button>`);
    }
    root.innerHTML = cells.join("");
    $$("[data-holiday-date]", root).forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedDate = button.dataset.holidayDate;
        renderDetail(state.selectedDate);
      });
    });
  }

  function renderLists() {
    const monthList = $("#holidayMonthList");
    const yearList = $("#holidayYearList");
    const monthItems = state.holidays.filter((item) => getParts(item.date).month === state.month);
    if (monthList) monthList.innerHTML = renderHolidayButtons(monthItems, "선택한 월에 공휴일이 없습니다.");
    if (yearList) yearList.innerHTML = renderHolidayButtons(state.holidays, "선택한 연도에 공휴일이 없습니다.");
    $$("#holidayMonthList [data-holiday-date], #holidayYearList [data-holiday-date]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedDate = button.dataset.holidayDate;
        renderDetail(state.selectedDate);
      });
    });
  }

  function renderHolidayButtons(items, emptyText) {
    if (!items.length) return `<div class="list-item"><strong>${emptyText}</strong></div>`;
    return items.map((item) => {
      const date = parseLocalDate(item.date);
      const region = isRegional(item) ? '<span class="region-badge">지역 공휴일</span>' : "";
      return `<button type="button" data-holiday-date="${escapeHtml(item.date)}"><strong>${escapeHtml(item.date)} · ${escapeHtml(item.localName)}${region}</strong><small>${escapeHtml(item.name)} · ${WEEKDAYS[date.getDay()]}요일 · ${escapeHtml((item.types || []).join(", ") || "-")}</small></button>`;
    }).join("");
  }

  function renderMonthlySummary() {
    const root = $("#holidayMonthlySummary");
    if (!root) return;
    const counts = Array.from({ length: 12 }, (_, index) => state.holidays.filter((item) => getParts(item.date).month === index + 1).length);
    const max = Math.max(1, ...counts);
    root.innerHTML = counts.map((count, index) => `<div class="mini-bar-row"><strong>${index + 1}월</strong><span class="mini-bar-track"><span class="mini-bar-fill" style="--bar-width:${(count / max) * 100}%"></span></span><b>${count}개</b></div>`).join("");
  }

  function renderBridge() {
    const root = $("#holidayBridgeList");
    if (!root) return;
    const recommendations = state.holidays.map((holiday) => {
      const date = parseLocalDate(holiday.date);
      const day = date.getDay();
      if (day !== 2 && day !== 4) return null;
      const leaveDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + (day === 2 ? -1 : 1));
      const offStart = day === 2 ? new Date(date.getFullYear(), date.getMonth(), date.getDate() - 3) : date;
      const offEnd = day === 2 ? date : new Date(date.getFullYear(), date.getMonth(), date.getDate() + 3);
      return { holiday, leaveDate: formatDate(leaveDate), totalDays: diffDays(offStart, offEnd) + 1 };
    }).filter(Boolean);
    root.innerHTML = recommendations.length ? recommendations.map((item) => `<div class="list-item"><strong>${escapeHtml(item.leaveDate)} 연차 추천</strong><small>${escapeHtml(item.holiday.date)} ${escapeHtml(item.holiday.localName)}와 연결 · 총 ${item.totalDays}일 휴무</small></div>`).join("") : '<div class="list-item"><strong>추천 가능한 브릿지 연차가 없습니다.</strong><small>화요일 또는 목요일 공휴일이 있을 때 표시됩니다.</small></div>';
  }

  function renderDetail(date) {
    const root = $("#holidayDetail");
    if (!root) return;
    const items = date ? state.holidays.filter((item) => item.date === date) : [];
    if (!items.length) {
      root.innerHTML = "<p>선택한 날짜의 공휴일이 없습니다.</p>";
      return;
    }
    root.innerHTML = items.map((item) => `<div class="holiday-detail-item"><h3>${escapeHtml(item.localName)}${isRegional(item) ? '<span class="region-badge">지역 공휴일</span>' : ""}</h3><dl>${detailRow("date", item.date)}${detailRow("localName", item.localName)}${detailRow("name", item.name)}${detailRow("countryCode", item.countryCode)}${detailRow("global", String(item.global))}${detailRow("counties", (item.counties || []).join(", ") || "-")}${detailRow("types", (item.types || []).join(", ") || "-")}${detailRow("launchYear", item.launchYear || "-")}</dl></div>`).join("");
  }

  function detailRow(label, value) {
    return `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`;
  }

  async function runCompare() {
    const a = $("#holidayCompareA")?.value;
    const b = $("#holidayCompareB")?.value;
    if (!a || !b) return;
    setLoading(true);
    try {
      const [holidaysA, holidaysB] = await Promise.all([getHolidayList(a, state.year), getHolidayList(b, state.year)]);
      const grouped = new Map();
      holidaysA.forEach((item) => addCompare(grouped, item.date, "a", item));
      holidaysB.forEach((item) => addCompare(grouped, item.date, "b", item));
      $("#holidayCompareHeadA").textContent = a;
      $("#holidayCompareHeadB").textContent = b;
      $("#holidayCompareBody").innerHTML = Array.from(grouped.entries()).sort((x, y) => x[0].localeCompare(y[0])).map(([date, value]) => `<tr><td>${escapeHtml(date)}</td><td>${escapeHtml(value.a.map((item) => item.localName).join(", ") || "-")}</td><td>${escapeHtml(value.b.map((item) => item.localName).join(", ") || "-")}</td></tr>`).join("");
    } catch (error) {
      setStatus(error.message || "국가 비교 데이터를 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  }

  function addCompare(grouped, date, side, item) {
    if (!grouped.has(date)) grouped.set(date, { a: [], b: [] });
    grouped.get(date)[side].push(item);
  }

  async function getHolidayList(country, year) {
    const result = await cachedFetch(`${API_BASE}/PublicHolidays/${year}/${encodeURIComponent(country)}`, `holidays:${country}:${year}`, HOLIDAYS_TTL);
    return result.data.map(normalizeHoliday).sort((a, b) => a.date.localeCompare(b.date));
  }

  async function runBusinessDays() {
    const startValue = $("#businessStart")?.value;
    const endValue = $("#businessEnd")?.value;
    const country = $("#businessCountry")?.value || state.country;
    const resultRoot = $("#businessResult");
    if (!startValue || !endValue) {
      if (resultRoot) resultRoot.innerHTML = "<p>시작일과 종료일을 입력하세요.</p>";
      return;
    }
    setLoading(true);
    try {
      let start = parseLocalDate(startValue);
      let end = parseLocalDate(endValue);
      if (start > end) [start, end] = [end, start];
      const includeStart = $("#businessIncludeStart")?.checked;
      const includeEnd = $("#businessIncludeEnd")?.checked;
      const excludeWeekends = $("#businessExcludeWeekends")?.checked;
      const excludeHolidays = $("#businessExcludeHolidays")?.checked;
      const years = range(start.getFullYear(), end.getFullYear());
      const holidayLists = excludeHolidays ? await Promise.all(years.map((year) => getHolidayList(country, year))) : [];
      const holidaySet = new Set(holidayLists.flat().filter((item) => item.global || !item.counties?.length).map((item) => item.date));
      let total = 0;
      let excludedWeekend = 0;
      let excludedHoliday = 0;
      for (let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate()); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const value = formatDate(cursor);
        if (!includeStart && value === startValue) continue;
        if (!includeEnd && value === endValue) continue;
        if (excludeWeekends && isWeekend(cursor)) {
          excludedWeekend += 1;
          continue;
        }
        if (excludeHolidays && holidaySet.has(value)) {
          excludedHoliday += 1;
          continue;
        }
        total += 1;
      }
      if (resultRoot) resultRoot.innerHTML = `<div class="stat-grid"><div class="result-card"><span>영업일</span><strong>${total}</strong></div><div class="result-card"><span>제외 주말</span><strong>${excludedWeekend}</strong></div><div class="result-card"><span>제외 공휴일</span><strong>${excludedHoliday}</strong></div></div>`;
    } catch (error) {
      if (resultRoot) resultRoot.innerHTML = `<p>${escapeHtml(error.message || "영업일 계산 중 오류가 발생했습니다.")}</p>`;
    } finally {
      setLoading(false);
    }
  }

  function copyMonthList() {
    const lines = state.holidays
      .filter((item) => getParts(item.date).month === state.month)
      .map((item) => `${item.date}\t${item.localName}\t${item.name}\t${item.countryCode}`);
    copyText(lines.join("\n") || "선택한 월에 공휴일이 없습니다.", "#holidayCopy");
  }

  function copyCompare() {
    const rows = $$("#holidayCompareBody tr").map((row) => Array.from(row.cells).map((cell) => cell.textContent.trim()).join("\t"));
    copyText(["날짜\tA\tB", ...rows].join("\n"), "#holidayCompareCopy");
  }

  function downloadCsv() {
    const header = ["date", "localName", "name", "countryCode", "global", "counties", "types", "launchYear"];
    const rows = state.holidays.map((item) => header.map((field) => csvCell(Array.isArray(item[field]) ? item[field].join("|") : item[field] ?? "")).join(","));
    downloadBlob([header.join(","), ...rows].join("\n"), `holidays-${state.country}-${state.year}.csv`, "text/csv;charset=utf-8");
  }

  function downloadIcs() {
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SolForge//World Holidays//KO"];
    state.holidays.forEach((item) => {
      const stamp = item.date.replace(/-/g, "");
      lines.push("BEGIN:VEVENT", `UID:${stamp}-${item.countryCode}-${slug(item.localName)}@solforge`, `DTSTAMP:${stamp}T000000Z`, `DTSTART;VALUE=DATE:${stamp}`, `SUMMARY:${escapeIcs(item.localName)}`, `DESCRIPTION:${escapeIcs(item.name)}`, "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    downloadBlob(lines.join("\r\n"), `holidays-${state.country}-${state.year}.ics`, "text/calendar;charset=utf-8");
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function addRecent() {
    const recent = getRecent().filter((item) => !(item.country === state.country && item.year === state.year && item.month === state.month));
    recent.unshift({ country: state.country, year: state.year, month: state.month, label: `${state.country} ${state.year}.${state.month}` });
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 10)));
    } catch (_error) {
      // Recent lookup is optional.
    }
    renderRecent();
  }

  function getRecent() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
    } catch (_error) {
      return [];
    }
  }

  function renderRecent() {
    const root = $("#holidayRecent");
    if (!root) return;
    const recent = getRecent();
    root.innerHTML = recent.length ? recent.map((item) => `<button type="button" data-recent-country="${escapeHtml(item.country)}" data-recent-year="${item.year}" data-recent-month="${item.month}">${escapeHtml(item.label)}</button>`).join("") : "<span>최근 조회가 없습니다.</span>";
    $$("[data-recent-country]", root).forEach((button) => {
      button.addEventListener("click", () => {
        state.country = button.dataset.recentCountry;
        state.year = clampYear(Number(button.dataset.recentYear));
        state.month = clampMonth(Number(button.dataset.recentMonth));
        setFormValues();
        loadHolidays();
      });
    });
  }

  function normalizeHoliday(item) {
    return {
      date: item.date,
      localName: item.localName || item.name || "",
      name: item.name || item.localName || "",
      countryCode: item.countryCode || state.country,
      fixed: Boolean(item.fixed),
      global: Boolean(item.global),
      counties: Array.isArray(item.counties) ? item.counties : [],
      launchYear: item.launchYear || "",
      types: Array.isArray(item.types) ? item.types : []
    };
  }

  function groupByDate(items) {
    const map = new Map();
    items.forEach((item) => {
      if (!map.has(item.date)) map.set(item.date, []);
      map.get(item.date).push(item);
    });
    return map;
  }

  function isRegional(item) {
    return item.global === false || Boolean(item.counties && item.counties.length);
  }

  function parseLocalDate(value) {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function getParts(value) {
    const [year, month, day] = String(value).split("-").map(Number);
    return { year, month, day };
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function todayString() {
    return formatDate(new Date());
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function diffDays(a, b) {
    return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
  }

  function isWeekend(date) {
    return date.getDay() === 0 || date.getDay() === 6;
  }

  function range(start, end) {
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  function clampYear(year) {
    if (!Number.isFinite(year)) return new Date().getFullYear();
    return Math.min(2100, Math.max(1970, Math.trunc(year)));
  }

  function clampMonth(month) {
    if (!Number.isFinite(month)) return new Date().getMonth() + 1;
    return Math.min(12, Math.max(1, Math.trunc(month)));
  }

  function updateUrl() {
    const params = new URLSearchParams(window.location.search);
    params.set("country", state.country);
    params.set("year", String(state.year));
    params.set("month", String(state.month));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  function setLoading(loading) {
    state.loading = loading;
    ["holidayLoad", "holidayRefresh", "holidayCompareRun", "businessRun"].forEach((id) => {
      const button = $(`#${id}`);
      if (button) button.disabled = loading;
    });
  }

  function setStatus(message, type = "info") {
    const status = $("#holidayStatus");
    if (!status) return;
    status.textContent = message;
    status.dataset.status = type;
  }

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = String(value);
  }

  function csvCell(value) {
    return `"${String(value).replace(/"/g, '""')}"`;
  }

  function escapeIcs(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
  }

  function slug(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9가-힣]+/gi, "-").replace(/^-|-$/g, "") || "holiday";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function copyText(text, buttonSelector) {
    try {
      await navigator.clipboard.writeText(text);
      flashButton(buttonSelector, "복사됨");
    } catch (_error) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.append(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      textarea.remove();
      flashButton(buttonSelector, ok ? "복사됨" : "복사 실패");
    }
  }

  function flashButton(selector, label) {
    const button = $(selector);
    if (!button) return;
    const original = button.textContent;
    button.textContent = label;
    window.setTimeout(() => {
      button.textContent = original;
    }, 1200);
  }

  document.addEventListener("DOMContentLoaded", init);
}());
