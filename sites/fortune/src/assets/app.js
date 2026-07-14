(() => {
  const translations = window.SF_SITE_TRANSLATIONS || {};
  const lang = window.SF_SITE_LOCALE === "en" ? "en" : "ko";
  const locale = lang === "en" ? "en-US" : "ko-KR";
  const signs = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];
  const elements = ["목", "화", "토", "금", "수"];
  const elementIds = { 목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water" };
  const stemElements = { 갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수" };
  const branchElements = { 자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화", 오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수" };
  const stemYinYang = { 갑: "yang", 을: "yin", 병: "yang", 정: "yin", 무: "yang", 기: "yin", 경: "yang", 신: "yin", 임: "yang", 계: "yin" };
  const animalSigns = { 자: "rat", 축: "ox", 인: "tiger", 묘: "rabbit", 진: "dragon", 사: "snake", 오: "horse", 미: "goat", 신: "monkey", 유: "rooster", 술: "dog", 해: "pig" };
  const generates = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
  const controls = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };
  const romanization = {
    갑: "Gap", 을: "Eul", 병: "Byeong", 정: "Jeong", 무: "Mu", 기: "Gi", 경: "Gyeong", 신: "Sin", 임: "Im", 계: "Gye",
    자: "Ja", 축: "Chuk", 인: "In", 묘: "Myo", 진: "Jin", 사: "Sa", 오: "O", 미: "Mi", 유: "Yu", 술: "Sul", 해: "Hae"
  };
  let manseryeokPromise;

  function t(key, values = {}) {
    let output = translations[key] || key;
    for (const [name, value] of Object.entries(values)) output = output.split(`{${name}}`).join(String(value));
    return output;
  }

  function loadManseryeok() {
    if (!manseryeokPromise) manseryeokPromise = import("/assets/manseryeok.mjs?v=1.0.8");
    return manseryeokPromise;
  }

  function getKoreanDateParts() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
  }

  function formatKoreanDate(parts) {
    const dateAtNoonKst = new Date(`${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T12:00:00+09:00`);
    return new Intl.DateTimeFormat(locale, {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long"
    }).format(dateAtNoonKst);
  }

  function elementForPillarCharacter(character) {
    return stemElements[character] || branchElements[character];
  }

  function formatPillar(hangul, hanja) {
    if (lang === "ko") return `${hangul} (${hanja})`;
    return `${[...hangul].map((character) => romanization[character] || character).join("-")} (${hanja})`;
  }

  function getElementRelation(dayMaster, todayElement) {
    if (dayMaster === todayElement) return "same";
    if (generates[todayElement] === dayMaster) return "support";
    if (generates[dayMaster] === todayElement) return "express";
    if (controls[dayMaster] === todayElement) return "manage";
    return "pressure";
  }

  async function initDailyFortune() {
    const grid = document.getElementById("fortune-grid");
    if (!grid) return;
    const kstToday = getKoreanDateParts();
    const daySeed = Number(`${kstToday.year}${String(kstToday.month).padStart(2, "0")}${String(kstToday.day).padStart(2, "0")}`);
    let pillarSeed = 0;

    try {
      const { getGapja } = await loadManseryeok();
      const todayPillar = getGapja(kstToday.year, kstToday.month, kstToday.day).dayPillar;
      pillarSeed = [...todayPillar].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    } catch {
      pillarSeed = 0;
    }

    signs.forEach((sign, index) => {
      const themeIndex = (daySeed + pillarSeed + index * 5) % 12;
      const element = document.getElementById(`fortune-${sign}`);
      if (element) element.textContent = t(`dynamic.theme.${themeIndex}`);
    });

    const date = document.getElementById("daily-date");
    if (date) date.textContent = t("dynamic.date", { date: formatKoreanDate(kstToday) });
  }

  function parseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) throw new Error("invalid-date");
    const [, year, month, day] = match.map(Number);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) throw new Error("invalid-date");
    return { year, month, day };
  }

  function parseTime(value) {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) throw new Error("invalid-time");
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) throw new Error("invalid-time");
    return { hour, minute };
  }

  function renderElementBars(counts) {
    const container = document.getElementById("element-bars");
    container.replaceChildren();
    elements.forEach((element) => {
      const row = document.createElement("div");
      row.className = `element-row element-${elementIds[element]}`;
      const label = document.createElement("span");
      label.textContent = t(`dynamic.personal.element.${elementIds[element]}`);
      const track = document.createElement("span");
      track.className = "element-track";
      const fill = document.createElement("span");
      fill.className = "element-fill";
      fill.style.width = `${(counts[element] / 8) * 100}%`;
      track.append(fill);
      const value = document.createElement("strong");
      value.textContent = t("dynamic.personal.elementCount", { count: counts[element] });
      row.append(label, track, value);
      container.append(row);
    });
  }

  function clearResult(statusMessage = "") {
    const result = document.getElementById("personal-result");
    result.hidden = true;
    result.querySelectorAll("[data-result-value], .result-summary, .guidance-grid p").forEach((element) => { element.textContent = ""; });
    document.getElementById("element-bars").replaceChildren();
    document.getElementById("personal-status").textContent = statusMessage;
  }

  function renderPersonalResult(saju, todayGapja) {
    const pillars = [
      [saju.yearPillar, saju.yearPillarHanja],
      [saju.monthPillar, saju.monthPillarHanja],
      [saju.dayPillar, saju.dayPillarHanja],
      [saju.hourPillar, saju.hourPillarHanja]
    ];
    const counts = Object.fromEntries(elements.map((element) => [element, 0]));
    for (const [pillar] of pillars) {
      for (const character of pillar) counts[elementForPillarCharacter(character)] += 1;
    }

    const ranked = [...elements].sort((a, b) => counts[b] - counts[a] || elements.indexOf(a) - elements.indexOf(b));
    const dominant = ranked[0];
    const lighter = ranked[ranked.length - 1];
    const dayStem = saju.dayPillar.charAt(0);
    const dayMaster = stemElements[dayStem];
    const yinYang = stemYinYang[dayStem];
    const todayElement = stemElements[todayGapja.dayPillar.charAt(0)];
    const relation = getElementRelation(dayMaster, todayElement);
    const sign = animalSigns[saju.yearPillar.charAt(1)];
    const zodiac = t(`dynamic.sign.${sign}`);
    const localizedDayMaster = t("dynamic.personal.dayMaster", {
      yinYang: t(`dynamic.personal.yinYang.${yinYang}`),
      element: t(`dynamic.personal.element.${elementIds[dayMaster]}`)
    });
    const localizedDominant = t(`dynamic.personal.element.${elementIds[dominant]}`);
    const localizedLighter = t(`dynamic.personal.element.${elementIds[lighter]}`);

    ["year", "month", "day", "hour"].forEach((name, index) => {
      document.getElementById(`result-${name}-pillar`).textContent = formatPillar(...pillars[index]);
    });
    document.getElementById("result-zodiac").textContent = zodiac;
    document.getElementById("result-day-master").textContent = localizedDayMaster;
    document.getElementById("result-today").textContent = formatPillar(todayGapja.dayPillar, todayGapja.dayPillarHanja);
    document.getElementById("personal-result-summary").textContent = t("dynamic.personal.summary", {
      zodiac,
      dayMaster: localizedDayMaster,
      dominant: localizedDominant,
      todayPillar: formatPillar(todayGapja.dayPillar, todayGapja.dayPillarHanja)
    });
    document.getElementById("result-overall").textContent = t(`dynamic.personal.overall.${relation}`);
    document.getElementById("result-work").textContent = t(`dynamic.personal.work.${elementIds[dayMaster]}`);
    document.getElementById("result-money").textContent = t(`dynamic.personal.money.${relation}`);
    document.getElementById("result-relationship").textContent = t(`dynamic.personal.relationship.${yinYang}`);
    document.getElementById("result-balance").textContent = t(`dynamic.personal.balance.${elementIds[dominant]}`, { lighter: localizedLighter });
    renderElementBars(counts);

    const result = document.getElementById("personal-result");
    result.hidden = false;
    result.focus({ preventScroll: true });
    result.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  function initPersonalFortune() {
    const form = document.getElementById("personal-fortune-form");
    if (!form) return;
    const calendarInput = document.getElementById("birth-calendar");
    const dateInput = document.getElementById("birth-date");
    const timeInput = document.getElementById("birth-time");
    const leapInput = document.getElementById("birth-leap-month");
    const leapField = document.getElementById("leap-month-field");
    const status = document.getElementById("personal-status");
    const submitButton = form.querySelector('button[type="submit"]');
    let activeCalculation = 0;

    function syncCalendarFields() {
      const isLunar = calendarInput.value === "lunar";
      leapField.hidden = !isLunar;
      if (!isLunar) leapInput.checked = false;
    }

    calendarInput.addEventListener("change", syncCalendarFields);
    document.getElementById("clear-personal-result").addEventListener("click", () => {
      activeCalculation += 1;
      clearResult(t("dynamic.personal.status.resultCleared"));
      dateInput.focus();
    });
    window.addEventListener("pagehide", () => {
      activeCalculation += 1;
      form.reset();
      syncCalendarFields();
      clearResult();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      let rawDate = dateInput.value;
      let rawTime = timeInput.value;
      let calendar = calendarInput.value;
      let isLeapMonth = leapInput.checked;
      const calculationId = ++activeCalculation;
      form.reset();
      syncCalendarFields();
      clearResult();
      status.textContent = t("dynamic.personal.status.processing");
      submitButton.disabled = true;

      try {
        const enteredDate = parseDate(rawDate);
        const enteredTime = parseTime(rawTime);
        const library = await loadManseryeok();
        let solarDate = enteredDate;
        if (calendar === "lunar") {
          solarDate = library.lunarToSolar(enteredDate.year, enteredDate.month, enteredDate.day, isLeapMonth).solar;
        }
        const saju = library.calculateSaju(
          solarDate.year,
          solarDate.month,
          solarDate.day,
          enteredTime.hour,
          enteredTime.minute,
          { longitude: 127, applyTimeCorrection: true }
        );
        const kstToday = getKoreanDateParts();
        const todayGapja = library.getGapja(kstToday.year, kstToday.month, kstToday.day);
        if (calculationId !== activeCalculation) return;
        renderPersonalResult(saju, todayGapja);
        status.textContent = t("dynamic.personal.status.complete");
      } catch (error) {
        const message = error?.name === "OutOfRangeError"
          ? "range"
          : calendar === "lunar"
            ? "lunar"
            : error?.message?.startsWith("invalid-")
              ? "invalid"
              : "load";
        status.textContent = t(`dynamic.personal.error.${message}`);
      } finally {
        rawDate = null;
        rawTime = null;
        calendar = null;
        isLeapMonth = null;
        submitButton.disabled = false;
      }
    });

    syncCalendarFields();
    loadManseryeok().catch(() => {});
  }

  initDailyFortune();
  initPersonalFortune();
})();
