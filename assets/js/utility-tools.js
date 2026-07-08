(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  function init() {
    if (!document.body.matches('[data-page="utility-toolbox"]')) return;
    initWorkbench();
    initCopyButtons();
    initClearButtons();
    initTextCounter();
    initTextCleaner();
    initKeyboardConverter();
    initPrivacyMask();
    initNumberFormat();
    initMoneyConverter();
    initJsonTool();
    initBase64Tool();
    initUrlCodec();
    initUrlParser();
    initTimestamp();
    initServerTimezone();
    initUuid();
    initChmod();
    initPassword();
    initUnits();
    initTraditionalWeight();
    initBmi();
    initLotto();
  }

  function initWorkbench() {
    const buttons = $$("[data-tool-target]");
    const panels = $$("[data-tool-panel]");
    const search = $("#utilitySearch");
    const filters = $$("[data-utility-filter]");
    let category = "all";

    const activate = (id, updateHash = true) => {
      const target = document.getElementById(id);
      if (!target || !target.matches("[data-tool-panel]")) return;
      buttons.forEach((button) => button.classList.toggle("active", button.dataset.toolTarget === id));
      panels.forEach((panel) => {
        const active = panel.id === id;
        panel.hidden = !active;
        panel.classList.toggle("active", active);
      });
      if (updateHash) history.replaceState(null, "", `#${id}`);
      target.focus({ preventScroll: true });
    };

    const applyFilter = () => {
      const query = normalize(search.value);
      let visible = 0;
      buttons.forEach((button) => {
        const matchesCategory = category === "all" || button.dataset.category === category;
        const haystack = normalize(`${button.textContent} ${button.dataset.keywords || ""}`);
        const matchesQuery = !query || query.split(" ").every((term) => haystack.includes(term));
        button.hidden = !(matchesCategory && matchesQuery);
        if (!button.hidden) visible += 1;
      });
      $("#utilityEmpty").hidden = visible > 0;
    };

    buttons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.toolTarget)));
    filters.forEach((button) => button.addEventListener("click", () => {
      category = button.dataset.utilityFilter || "all";
      filters.forEach((item) => item.classList.toggle("active", item === button));
      applyFilter();
    }));
    search.addEventListener("input", applyFilter);

    const initial = location.hash.slice(1);
    activate(document.getElementById(initial)?.matches("[data-tool-panel]") ? initial : "text-counter", false);
    window.addEventListener("hashchange", () => activate(location.hash.slice(1), false));
  }

  function initCopyButtons() {
    $$("[data-copy-from]").forEach((button) => button.addEventListener("click", async () => {
      const source = document.getElementById(button.dataset.copyFrom);
      const text = source?.value ?? source?.textContent ?? "";
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        showToast("복사했습니다.");
      } catch (_error) {
        showToast("복사하지 못했습니다.");
      }
    }));
  }

  function initClearButtons() {
    $$("[data-clear-target]").forEach((button) => button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.clearTarget);
      if (!target) return;
      target.value = "";
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.focus();
    }));
  }

  function initTextCounter() {
    const input = $("#textCounterInput");
    const output = $("#textCounterStats");
    const render = () => {
      const text = input.value;
      const withoutSpaces = text.replace(/\s/g, "");
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const lines = text ? text.split(/\r\n|\r|\n/).length : 0;
      output.innerHTML = [
        stat("공백 포함", text.length),
        stat("공백 제외", withoutSpaces.length),
        stat("단어", words),
        stat("줄", lines),
        stat("UTF-8 바이트", encoder.encode(text).length)
      ].join("");
    };
    input.addEventListener("input", render);
    render();
  }

  function initTextCleaner() {
    const input = $("#textCleanerInput");
    const output = $("#textCleanerOutput");
    const merge = $("#cleanMergeLines");
    const single = $("#cleanSingleLine");
    const render = () => {
      let text = input.value
        .replace(/\r\n?/g, "\n")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .split("\n")
        .map((line) => line.replace(/[ \t]+$/g, "").replace(/[ \t]{2,}/g, " "))
        .join("\n")
        .trim();
      if (merge.checked) text = text.split(/\n{2,}/).map((paragraph) => paragraph.replace(/\n+/g, " ")).join("\n\n");
      else text = text.replace(/\n{3,}/g, "\n\n");
      if (single.checked) text = text.replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ");
      output.value = text;
    };
    [input, merge, single].forEach((element) => element.addEventListener("input", render));
    render();
  }

  function initKeyboardConverter() {
    const input = $("#keyboardInput");
    const output = $("#keyboardOutput");
    const modeButtons = $$("[data-keyboard-mode]");
    let mode = "auto";
    const render = () => {
      const selected = mode === "auto"
        ? (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(input.value) ? "kor-to-eng" : "eng-to-kor")
        : mode;
      output.value = selected === "eng-to-kor" ? englishToKorean(input.value) : koreanToEnglish(input.value);
    };
    modeButtons.forEach((button) => button.addEventListener("click", () => {
      mode = button.dataset.keyboardMode;
      modeButtons.forEach((item) => item.classList.toggle("active", item === button));
      render();
    }));
    input.addEventListener("input", render);
    render();
  }

  function initPrivacyMask() {
    const input = $("#privacyInput");
    const output = $("#privacyOutput");
    const render = () => {
      output.value = input.value
        .replace(/\b([A-Z0-9._%+-]{2})[A-Z0-9._%+-]*(@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi, "$1***$2")
        .replace(/\b(\d{6})[- ]?([1-4])\d{6}\b/g, "$1-$2******")
        .replace(/\b(\d{4})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{4})\b/g, "$1 **** **** $4")
        .replace(/\b(01[016789])[- ]?(\d{3,4})[- ]?(\d{4})\b/g, "$1-****-$3");
    };
    input.addEventListener("input", render);
    render();
  }

  function initNumberFormat() {
    const input = $("#numberFormatInput");
    const output = $("#numberFormatOutput");
    const decimals = $("#numberDecimals");
    const parentheses = $("#numberParentheses");
    const render = () => {
      const digits = clamp(Number(decimals.value) || 0, 0, 12);
      output.value = input.value.split(/\r?\n/).map((line) => {
        const cleaned = line.trim().replace(/[,\s]/g, "");
        if (!cleaned || !Number.isFinite(Number(cleaned))) return line;
        const value = Number(cleaned);
        const formatted = Math.abs(value).toLocaleString("ko-KR", {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
        });
        if (value < 0 && parentheses.checked) return `(${formatted})`;
        return value < 0 ? `-${formatted}` : formatted;
      }).join("\n");
    };
    [input, decimals, parentheses].forEach((element) => element.addEventListener("input", render));
    render();
  }

  function initMoneyConverter() {
    const numberInput = $("#moneyNumberInput");
    const koreanInput = $("#moneyKoreanInput");
    const output = $("#moneyResult");
    const render = () => {
      const numeric = parseInteger(numberInput.value);
      let parsed = null;
      let parseError = "";
      try {
        parsed = koreanMoneyToNumber(koreanInput.value);
      } catch (error) {
        parseError = error.message;
      }
      output.innerHTML = resultBlock(
        numeric === null ? "숫자 금액을 확인하세요." : `${numberToKoreanMoney(numeric)}원`,
        numeric === null ? "" : `${numeric.toLocaleString("ko-KR")}원`,
        [
          ["한글 → 숫자", parseError || `${parsed.toLocaleString("ko-KR")}원`],
          ["지원 범위", "±9,007,199,254,740,991원"]
        ]
      );
    };
    [numberInput, koreanInput].forEach((element) => element.addEventListener("input", render));
    render();
  }

  function initJsonTool() {
    const input = $("#jsonInput");
    const output = $("#jsonOutput");
    const status = $("#jsonStatus");
    const transform = (space) => {
      try {
        output.value = JSON.stringify(JSON.parse(input.value), null, space);
        status.textContent = "유효한 JSON입니다.";
        status.className = "validation-message valid";
      } catch (error) {
        output.value = "";
        status.textContent = `JSON 오류: ${error.message}`;
        status.className = "validation-message invalid";
      }
    };
    $("#jsonPretty").addEventListener("click", () => transform(2));
    $("#jsonMinify").addEventListener("click", () => transform(0));
    input.addEventListener("input", () => transform(2));
    transform(2);
  }

  function initBase64Tool() {
    const input = $("#base64Input");
    const output = $("#base64Output");
    const fileStatus = $("#base64FileStatus");
    const download = $("#base64FileDownload");
    let downloadUrl = "";
    $("#base64Encode").addEventListener("click", () => {
      output.value = bytesToBase64(encoder.encode(input.value));
    });
    $("#base64Decode").addEventListener("click", () => {
      try {
        output.value = decoder.decode(base64ToBytes(input.value.trim()));
      } catch (_error) {
        output.value = "유효한 Base64 문자열이 아닙니다.";
      }
    });
    $("#base64EncodeFile").addEventListener("click", async () => {
      const file = $("#base64File").files?.[0];
      if (!file) {
        fileStatus.textContent = "인코딩할 파일을 선택하세요.";
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        fileStatus.textContent = "브라우저 메모리를 위해 10MB 이하 파일을 사용하세요.";
        return;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      output.value = bytesToBase64(bytes);
      $("#base64FileName").value = file.name;
      $("#base64Mime").value = file.type || "application/octet-stream";
      fileStatus.textContent = `${file.name} · ${formatBytes(file.size)} 인코딩 완료`;
    });
    $("#base64DecodeFile").addEventListener("click", () => {
      try {
        const raw = (output.value || input.value).trim().replace(/^data:[^,]*,/, "");
        if (!raw) throw new Error("empty");
        const bytes = base64ToBytes(raw);
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        const blob = new Blob([bytes], { type: $("#base64Mime").value.trim() || "application/octet-stream" });
        downloadUrl = URL.createObjectURL(blob);
        download.href = downloadUrl;
        download.download = $("#base64FileName").value.trim() || "decoded-file.bin";
        download.hidden = false;
        fileStatus.textContent = `${download.download} · ${formatBytes(blob.size)} 복원 준비 완료`;
      } catch (_error) {
        download.hidden = true;
        fileStatus.textContent = "유효한 Base64 문자열이 아닙니다.";
      }
    });
  }

  function initUrlCodec() {
    const input = $("#urlCodecInput");
    const output = $("#urlCodecOutput");
    const mode = $("#urlCodecMode");
    $("#urlEncode").addEventListener("click", () => {
      output.value = mode.value === "uri" ? encodeURI(input.value) : encodeURIComponent(input.value);
    });
    $("#urlDecode").addEventListener("click", () => {
      try {
        output.value = mode.value === "uri" ? decodeURI(input.value) : decodeURIComponent(input.value.replace(/\+/g, " "));
      } catch (_error) {
        output.value = "올바르게 인코딩된 URL 문자열이 아닙니다.";
      }
    });
  }

  function initUrlParser() {
    const input = $("#urlParserInput");
    const output = $("#urlParserResult");
    const render = () => {
      try {
        const url = new URL(input.value);
        const params = Array.from(url.searchParams.entries());
        output.innerHTML = resultBlock(
          url.hostname,
          url.href,
          [
            ["프로토콜", url.protocol],
            ["호스트", url.host],
            ["경로", url.pathname || "/"],
            ["해시", url.hash || "없음"],
            ["쿼리", params.length ? params.map(([key, value]) => `${key} = ${value}`).join(" · ") : "없음"]
          ]
        );
      } catch (_error) {
        output.innerHTML = errorBlock("http:// 또는 https://로 시작하는 URL을 입력하세요.");
      }
    };
    $("#parseUrl").addEventListener("click", render);
    input.addEventListener("change", render);
    render();
  }

  function initTimestamp() {
    const timestamp = $("#timestampInput");
    const dateInput = $("#timestampDateInput");
    const output = $("#timestampResult");
    const setNow = () => {
      const now = new Date();
      timestamp.value = String(now.getTime());
      dateInput.value = toLocalDateTimeValue(now);
      render();
    };
    const render = (source) => {
      let date;
      if (source === "date" && dateInput.value) {
        date = new Date(dateInput.value);
        timestamp.value = String(date.getTime());
      } else {
        const raw = Number(timestamp.value);
        if (!Number.isFinite(raw)) {
          output.innerHTML = errorBlock("유효한 Timestamp를 입력하세요.");
          return;
        }
        date = new Date(Math.abs(raw) < 1e11 ? raw * 1000 : raw);
        if (!Number.isNaN(date.getTime())) dateInput.value = toLocalDateTimeValue(date);
      }
      if (!date || Number.isNaN(date.getTime())) {
        output.innerHTML = errorBlock("변환할 수 없는 날짜입니다.");
        return;
      }
      output.innerHTML = resultBlock(
        date.toLocaleString("ko-KR"),
        date.toISOString(),
        [
          ["초", Math.floor(date.getTime() / 1000).toLocaleString("en-US")],
          ["밀리초", date.getTime().toLocaleString("en-US")],
          ["UTC", date.toUTCString()]
        ]
      );
    };
    $("#timestampNow").addEventListener("click", setNow);
    timestamp.addEventListener("input", () => render("timestamp"));
    dateInput.addEventListener("input", () => render("date"));
    setNow();
  }

  function initServerTimezone() {
    const input = $("#serverAddressInput");
    const select = $("#serverTimezoneSelect");
    const search = $("#serverTimezoneSearch");
    const options = $("#serverTimezoneOptions");
    const output = $("#serverTimezoneResult");
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const timeZones = getSupportedTimeZones(browserZone);
    let parsedHost = "";
    let guess = { zone: browserZone, confidence: "낮음", source: "브라우저 시간대" };
    let timer = 0;

    select.innerHTML = timeZones.map((zone) => `<option value="${escapeHtml(zone)}">${escapeHtml(zone)}</option>`).join("");
    options.innerHTML = timeZones.map((zone) => `<option value="${escapeHtml(zone)}"></option>`).join("");

    const setZone = (zone) => {
      const target = isValidTimeZone(zone) ? zone : browserZone;
      select.value = target;
      search.value = target;
    };

    const render = () => {
      const zone = isValidTimeZone(search.value.trim()) ? search.value.trim() : select.value || guess.zone;
      setZone(zone);
      const now = new Date();
      output.innerHTML = resultBlock(
        formatDateTimeInZone(now, zone),
        `${zone} · ${formatOffsetInZone(now, zone)}`,
        [
          ["호스트", parsedHost || "분석 전"],
          ["추정 근거", `${guess.source} · 신뢰도 ${guess.confidence}`],
          ["브라우저 시간", formatDateTimeInZone(now, browserZone)],
          ["UTC", now.toISOString()]
        ]
      );
    };

    const analyze = () => {
      const parsed = parseServerAddress(input.value);
      if (!parsed) {
        output.innerHTML = errorBlock("URL, 호스트명 또는 IP 주소를 입력하세요.");
        return;
      }
      parsedHost = parsed.hostname;
      guess = guessTimeZoneFromHost(parsedHost, browserZone);
      setZone(guess.zone);
      render();
    };

    $("#detectServerTimezone").addEventListener("click", analyze);
    $("#serverClockNow").addEventListener("click", render);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") analyze();
    });
    select.addEventListener("change", () => {
      search.value = select.value;
      render();
    });
    search.addEventListener("change", render);
    analyze();
    timer = window.setInterval(render, 1000);
    window.addEventListener("pagehide", () => window.clearInterval(timer));
  }

  function initUuid() {
    const form = $("#uuidForm");
    const output = $("#uuidOutput");
    const render = () => {
      const count = clamp(Number($("#uuidCount").value) || 1, 1, 100);
      const upper = $("#uuidUppercase").checked;
      output.value = Array.from({ length: count }, () => {
        const value = crypto.randomUUID ? crypto.randomUUID() : fallbackUuid();
        return upper ? value.toUpperCase() : value;
      }).join("\n");
    };
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      render();
    });
    render();
  }

  function initChmod() {
    const numeric = $("#chmodInput");
    const symbolic = $("#chmodSymbolic");
    const grid = $("#chmodGrid");
    const output = $("#chmodResult");
    const roles = ["소유자", "그룹", "기타"];
    const permissions = [["r", "읽기"], ["w", "쓰기"], ["x", "실행"]];
    grid.innerHTML = roles.map((role, roleIndex) => [
      `<fieldset><legend>${role}</legend>`,
      permissions.map(([code, label], permissionIndex) => `<label><input type="checkbox" data-chmod-bit="${roleIndex}-${permissionIndex}"> ${code} ${label}</label>`).join(""),
      "</fieldset>"
    ].join("")).join("");
    const checks = $$("[data-chmod-bit]", grid);

    const fromNumeric = () => {
      const cleaned = numeric.value.replace(/\D/g, "").slice(-3);
      if (!/^[0-7]{3}$/.test(cleaned)) return;
      checks.forEach((check) => {
        const [roleIndex, permissionIndex] = check.dataset.chmodBit.split("-").map(Number);
        const bit = [4, 2, 1][permissionIndex];
        check.checked = (Number(cleaned[roleIndex]) & bit) === bit;
      });
      updateFromChecks();
    };
    const fromSymbolic = () => {
      const value = symbolic.value.replace(/^[d-l]/, "").slice(0, 9);
      if (!/^[r-][w-][x-][r-][w-][x-][r-][w-][x-]$/.test(value)) return;
      checks.forEach((check, index) => {
        check.checked = value[index] !== "-";
      });
      updateFromChecks();
    };
    const updateFromChecks = () => {
      const digits = [0, 1, 2].map((roleIndex) => checks
        .filter((check) => Number(check.dataset.chmodBit.split("-")[0]) === roleIndex)
        .reduce((sum, check, permissionIndex) => sum + (check.checked ? [4, 2, 1][permissionIndex] : 0), 0));
      const chars = checks.map((check, index) => check.checked ? ["r", "w", "x"][index % 3] : "-").join("");
      numeric.value = digits.join("");
      symbolic.value = chars;
      output.innerHTML = resultBlock(
        `chmod ${digits.join("")}`,
        chars,
        [["기호식", `u=${chars.slice(0, 3).replace(/-/g, "")},g=${chars.slice(3, 6).replace(/-/g, "")},o=${chars.slice(6).replace(/-/g, "")}`]]
      );
    };
    numeric.addEventListener("input", fromNumeric);
    symbolic.addEventListener("input", fromSymbolic);
    checks.forEach((check) => check.addEventListener("change", updateFromChecks));
    fromNumeric();
  }

  function initPassword() {
    const length = $("#passwordLength");
    const output = $("#passwordOutput");
    const meter = $("#passwordMeter");
    const options = ["passwordLower", "passwordUpper", "passwordNumber", "passwordSymbol", "passwordAmbiguous"].map((id) => document.getElementById(id));
    const generate = () => {
      $("#passwordLengthValue").textContent = length.value;
      let groups = [];
      if ($("#passwordLower").checked) groups.push("abcdefghijklmnopqrstuvwxyz");
      if ($("#passwordUpper").checked) groups.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
      if ($("#passwordNumber").checked) groups.push("0123456789");
      if ($("#passwordSymbol").checked) groups.push("!@#$%^&*()-_=+[]{}");
      if (!groups.length) groups = ["abcdefghijklmnopqrstuvwxyz"];
      if ($("#passwordAmbiguous").checked) groups = groups.map((group) => group.replace(/[0O1lI|]/g, ""));
      const required = groups.map((group) => randomCharacter(group));
      const pool = groups.join("");
      while (required.length < Number(length.value)) required.push(randomCharacter(pool));
      shuffle(required);
      output.textContent = required.join("");
      const score = Math.min(100, Number(length.value) * 3 + groups.length * 10);
      meter.style.width = `${score}%`;
      meter.className = score >= 75 ? "strong" : score >= 50 ? "medium" : "weak";
    };
    $("#generatePassword").addEventListener("click", generate);
    length.addEventListener("input", generate);
    options.forEach((option) => option.addEventListener("change", generate));
    generate();
  }

  function initUnits() {
    const category = $("#unitCategory");
    const value = $("#unitValue");
    const from = $("#unitFrom");
    const to = $("#unitTo");
    const output = $("#unitResult");
    const units = {
      length: {
        mm: ["밀리미터", 0.001], cm: ["센티미터", 0.01], m: ["미터", 1],
        km: ["킬로미터", 1000], inch: ["인치", 0.0254], ft: ["피트", 0.3048], yd: ["야드", 0.9144], mile: ["마일", 1609.344]
      },
      weight: {
        mg: ["밀리그램", 0.000001], g: ["그램", 0.001], kg: ["킬로그램", 1],
        ton: ["톤", 1000], oz: ["온스", 0.028349523125], lb: ["파운드", 0.45359237]
      },
      area: {
        sqm: ["제곱미터", 1], pyeong: ["평", 3.305785], sqft: ["제곱피트", 0.09290304],
        acre: ["에이커", 4046.8564224], hectare: ["헥타르", 10000]
      },
      speed: {
        ms: ["m/s", 1], kmh: ["km/h", 0.2777777778], mph: ["mph", 0.44704], knot: ["노트", 0.514444]
      },
      temperature: {
        c: ["섭씨", "c"], f: ["화씨", "f"], k: ["켈빈", "k"]
      }
    };
    const renderOptions = () => {
      const entries = Object.entries(units[category.value]);
      const previousFrom = from.value;
      const previousTo = to.value;
      const html = entries.map(([key, [label]]) => `<option value="${key}">${label}</option>`).join("");
      from.innerHTML = html;
      to.innerHTML = html;
      if (entries.some(([key]) => key === previousFrom)) from.value = previousFrom;
      if (entries.some(([key]) => key === previousTo)) to.value = previousTo;
      else to.value = entries[Math.min(1, entries.length - 1)][0];
      render();
    };
    const render = () => {
      const amount = Number(value.value);
      if (!Number.isFinite(amount)) return;
      let converted;
      if (category.value === "temperature") {
        const celsius = from.value === "c" ? amount : from.value === "f" ? (amount - 32) * 5 / 9 : amount - 273.15;
        converted = to.value === "c" ? celsius : to.value === "f" ? celsius * 9 / 5 + 32 : celsius + 273.15;
      } else {
        converted = amount * units[category.value][from.value][1] / units[category.value][to.value][1];
      }
      output.innerHTML = resultBlock(
        `${formatDecimal(converted)} ${units[category.value][to.value][0]}`,
        `${formatDecimal(amount)} ${units[category.value][from.value][0]}`,
        []
      );
    };
    category.addEventListener("change", renderOptions);
    [value, from, to].forEach((element) => element.addEventListener("input", render));
    renderOptions();
  }

  function initTraditionalWeight() {
    const value = $("#traditionalValue");
    const unit = $("#traditionalUnit");
    const standard = $("#geunGram");
    const output = $("#traditionalResult");
    const render = () => {
      const amount = Number(value.value) || 0;
      const geun = Math.max(1, Number(standard.value) || 600);
      const gramByUnit = { geun, gwan: 3750, don: 3.75, g: 1, kg: 1000 };
      const grams = amount * gramByUnit[unit.value];
      output.innerHTML = resultBlock(
        `${formatDecimal(grams)} g`,
        `${formatDecimal(grams / 1000)} kg`,
        [
          ["근", formatDecimal(grams / geun)],
          ["관", formatDecimal(grams / 3750)],
          ["돈", formatDecimal(grams / 3.75)]
        ]
      );
    };
    [value, unit, standard].forEach((element) => element.addEventListener("input", render));
    $$("[data-geun-preset]").forEach((button) => button.addEventListener("click", () => {
      standard.value = button.dataset.geunPreset;
      render();
    }));
    render();
  }

  function initBmi() {
    const fields = ["bmiHeight", "bmiWeight", "bmiWaist", "bmiHip"].map((id) => document.getElementById(id));
    const output = $("#bmiResult");
    const render = () => {
      const height = Number($("#bmiHeight").value) / 100;
      const weight = Number($("#bmiWeight").value);
      if (!(height > 0) || !(weight > 0)) {
        output.innerHTML = errorBlock("키와 체중을 입력하세요.");
        return;
      }
      const bmi = weight / (height * height);
      const bmiLabel = bmi < 18.5 ? "저체중" : bmi < 23 ? "정상" : bmi < 25 ? "과체중" : bmi < 30 ? "비만" : "고도비만";
      const waist = Number($("#bmiWaist").value);
      const hip = Number($("#bmiHip").value);
      const whr = waist > 0 && hip > 0 ? waist / hip : null;
      output.innerHTML = resultBlock(
        `BMI ${bmi.toFixed(1)}`,
        bmiLabel,
        [
          ["정상 BMI 체중 범위", `${(18.5 * height * height).toFixed(1)} ~ ${(22.9 * height * height).toFixed(1)} kg`],
          ["WHR", whr ? whr.toFixed(2) : "허리·엉덩이 둘레를 입력하면 계산"]
        ]
      );
    };
    fields.forEach((field) => field.addEventListener("input", render));
    render();
  }

  function initLotto() {
    const output = $("#lottoNumbers");
    const history = $("#lottoHistory");
    const draw = () => {
      const pool = Array.from({ length: 45 }, (_, index) => index + 1);
      const values = [];
      while (values.length < 6) {
        const index = secureRandomIndex(pool.length);
        values.push(pool.splice(index, 1)[0]);
      }
      values.sort((a, b) => a - b);
      output.innerHTML = values.map((number) => `<span class="lotto-ball lotto-${Math.ceil(number / 10)}">${number}</span>`).join("");
      const item = document.createElement("li");
      item.textContent = values.join(", ");
      history.prepend(item);
      while (history.children.length > 8) history.lastElementChild.remove();
    };
    $("#generateLotto").addEventListener("click", draw);
    $("#clearLottoHistory").addEventListener("click", () => {
      history.innerHTML = "";
    });
    draw();
  }

  function englishToKorean(text) {
    const consonants = {
      r: 0, R: 1, s: 2, e: 3, E: 4, f: 5, a: 6, q: 7, Q: 8, t: 9, T: 10,
      d: 11, w: 12, W: 13, c: 14, z: 15, x: 16, v: 17, g: 18
    };
    const vowels = { k: 0, o: 1, i: 2, O: 3, j: 4, p: 5, u: 6, P: 7, h: 8, y: 12, n: 13, b: 17, m: 18, l: 20 };
    const vowelCombine = {
      "8,0": 9, "8,1": 10, "8,20": 11,
      "13,4": 14, "13,5": 15, "13,20": 16,
      "18,20": 19
    };
    const finalMap = { r: 1, R: 2, rt: 3, s: 4, sw: 5, sg: 6, e: 7, f: 8, fr: 9, fa: 10, fq: 11, ft: 12, fx: 13, fv: 14, fg: 15, a: 16, q: 17, qt: 18, t: 19, T: 20, d: 21, w: 22, c: 23, z: 24, x: 25, v: 26, g: 27 };
    const compatibility = {
      r: "ㄱ", R: "ㄲ", s: "ㄴ", e: "ㄷ", E: "ㄸ", f: "ㄹ", a: "ㅁ", q: "ㅂ", Q: "ㅃ",
      t: "ㅅ", T: "ㅆ", d: "ㅇ", w: "ㅈ", W: "ㅉ", c: "ㅊ", z: "ㅋ", x: "ㅌ", v: "ㅍ", g: "ㅎ",
      k: "ㅏ", o: "ㅐ", i: "ㅑ", O: "ㅒ", j: "ㅓ", p: "ㅔ", u: "ㅕ", P: "ㅖ", h: "ㅗ",
      y: "ㅛ", n: "ㅜ", b: "ㅠ", m: "ㅡ", l: "ㅣ"
    };
    const chars = Array.from(text);
    let result = "";
    let index = 0;
    while (index < chars.length) {
      const first = chars[index];
      if (consonants[first] === undefined || vowels[chars[index + 1]] === undefined) {
        result += compatibility[first] || first;
        index += 1;
        continue;
      }
      const initial = consonants[first];
      let medial = vowels[chars[index + 1]];
      index += 2;
      const combinedVowel = vowelCombine[`${medial},${vowels[chars[index]]}`];
      if (combinedVowel !== undefined) {
        medial = combinedVowel;
        index += 1;
      }
      let final = 0;
      if (consonants[chars[index]] !== undefined && vowels[chars[index + 1]] === undefined) {
        const pair = `${chars[index]}${chars[index + 1] || ""}`;
        if (finalMap[pair] && vowels[chars[index + 2]] === undefined) {
          final = finalMap[pair];
          index += 2;
        } else if (finalMap[chars[index]]) {
          final = finalMap[chars[index]];
          index += 1;
        }
      }
      result += String.fromCharCode(0xAC00 + (initial * 21 + medial) * 28 + final);
    }
    return result;
  }

  function koreanToEnglish(text) {
    const initials = ["r", "R", "s", "e", "E", "f", "a", "q", "Q", "t", "T", "d", "w", "W", "c", "z", "x", "v", "g"];
    const medials = ["k", "o", "i", "O", "j", "p", "u", "P", "h", "hk", "ho", "hl", "y", "n", "nj", "np", "nl", "b", "m", "ml", "l"];
    const finals = ["", "r", "R", "rt", "s", "sw", "sg", "e", "f", "fr", "fa", "fq", "ft", "fx", "fv", "fg", "a", "q", "qt", "t", "T", "d", "w", "c", "z", "x", "v", "g"];
    const compatibility = {
      "ㄱ": "r", "ㄲ": "R", "ㄴ": "s", "ㄷ": "e", "ㄸ": "E", "ㄹ": "f", "ㅁ": "a", "ㅂ": "q", "ㅃ": "Q",
      "ㅅ": "t", "ㅆ": "T", "ㅇ": "d", "ㅈ": "w", "ㅉ": "W", "ㅊ": "c", "ㅋ": "z", "ㅌ": "x", "ㅍ": "v", "ㅎ": "g",
      "ㅏ": "k", "ㅐ": "o", "ㅑ": "i", "ㅒ": "O", "ㅓ": "j", "ㅔ": "p", "ㅕ": "u", "ㅖ": "P", "ㅗ": "h",
      "ㅘ": "hk", "ㅙ": "ho", "ㅚ": "hl", "ㅛ": "y", "ㅜ": "n", "ㅝ": "nj", "ㅞ": "np", "ㅟ": "nl",
      "ㅠ": "b", "ㅡ": "m", "ㅢ": "ml", "ㅣ": "l"
    };
    return Array.from(text).map((character) => {
      const code = character.charCodeAt(0);
      if (code >= 0xAC00 && code <= 0xD7A3) {
        const offset = code - 0xAC00;
        const initial = Math.floor(offset / 588);
        const medial = Math.floor((offset % 588) / 28);
        const final = offset % 28;
        return initials[initial] + medials[medial] + finals[final];
      }
      return compatibility[character] || character;
    }).join("");
  }

  function numberToKoreanMoney(value) {
    if (!Number.isSafeInteger(value)) return "지원 범위 초과";
    if (value === 0) return "영";
    const digits = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
    const smallUnits = ["", "십", "백", "천"];
    const bigUnits = ["", "만", "억", "조", "경"];
    const negative = value < 0;
    let remaining = Math.abs(value);
    const groups = [];
    while (remaining > 0) {
      groups.push(remaining % 10000);
      remaining = Math.floor(remaining / 10000);
    }
    const output = groups.map((group, groupIndex) => {
      if (!group) return "";
      const chunk = String(group).padStart(4, "0").split("").map((digit, index) => {
        const number = Number(digit);
        if (!number) return "";
        const unit = smallUnits[3 - index];
        return `${number === 1 && unit ? "" : digits[number]}${unit}`;
      }).join("");
      return `${chunk}${bigUnits[groupIndex] || ""}`;
    }).reverse().join("");
    return `${negative ? "마이너스 " : ""}${output}`;
  }

  function koreanMoneyToNumber(text) {
    const normalized = text.replace(/[,\s원]/g, "").replace(/^마이너스/, "-");
    if (!normalized) return 0;
    if (/^-?\d+$/.test(normalized)) return Number(normalized);
    const digitMap = { 영: 0, 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9 };
    const smallMap = { 십: 10, 백: 100, 천: 1000 };
    const bigMap = { 만: 10000, 억: 100000000, 조: 1000000000000 };
    let total = 0;
    let section = 0;
    let number = 0;
    let negative = false;
    for (const character of normalized) {
      if (character === "-") {
        negative = true;
      } else if (digitMap[character] !== undefined) {
        number = digitMap[character];
      } else if (smallMap[character]) {
        section += (number || 1) * smallMap[character];
        number = 0;
      } else if (bigMap[character]) {
        total += (section + number || 1) * bigMap[character];
        section = 0;
        number = 0;
      } else {
        throw new Error(`지원하지 않는 문자: ${character}`);
      }
    }
    const result = total + section + number;
    if (!Number.isSafeInteger(result)) throw new Error("지원 범위를 초과했습니다.");
    return negative ? -result : result;
  }

  function parseServerAddress(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      return new URL(candidate);
    } catch (_error) {
      return null;
    }
  }

  function guessTimeZoneFromHost(hostname, fallbackZone) {
    const host = hostname.toLowerCase().replace(/\.$/, "");
    const keywordZones = [
      [/(\b|[-.])(seoul|kr|korea)(\b|[-.])/, "Asia/Seoul", "호스트명 지역 키워드"],
      [/(\b|[-.])(tokyo|jp|japan)(\b|[-.])/, "Asia/Tokyo", "호스트명 지역 키워드"],
      [/(\b|[-.])(singapore|sg|sin)(\b|[-.])/, "Asia/Singapore", "호스트명 지역 키워드"],
      [/(\b|[-.])(utc|gmt)(\b|[-.])/, "UTC", "호스트명 시간대 키워드"],
      [/(\b|[-.])(london|uk|gb)(\b|[-.])/, "Europe/London", "호스트명 지역 키워드"],
      [/(\b|[-.])(frankfurt|de|germany)(\b|[-.])/, "Europe/Berlin", "호스트명 지역 키워드"],
      [/(\b|[-.])(newyork|nyc|useast|us-east)(\b|[-.])/, "America/New_York", "호스트명 리전 키워드"],
      [/(\b|[-.])(la|losangeles|uswest|us-west|california)(\b|[-.])/, "America/Los_Angeles", "호스트명 리전 키워드"],
      [/(\b|[-.])(sydney|au|australia)(\b|[-.])/, "Australia/Sydney", "호스트명 지역 키워드"]
    ];
    const keyword = keywordZones.find(([pattern]) => pattern.test(`.${host}.`));
    if (keyword) return { zone: keyword[1], confidence: "중간", source: keyword[2] };
    if (host === "localhost" || host.endsWith(".local") || isPrivateIp(host)) {
      return { zone: fallbackZone, confidence: "낮음", source: "로컬·사설 주소" };
    }
    const tld = host.split(".").pop();
    const tldZones = {
      kr: "Asia/Seoul",
      jp: "Asia/Tokyo",
      cn: "Asia/Shanghai",
      sg: "Asia/Singapore",
      hk: "Asia/Hong_Kong",
      tw: "Asia/Taipei",
      in: "Asia/Kolkata",
      au: "Australia/Sydney",
      nz: "Pacific/Auckland",
      us: "America/New_York",
      ca: "America/Toronto",
      gb: "Europe/London",
      uk: "Europe/London",
      de: "Europe/Berlin",
      fr: "Europe/Paris",
      es: "Europe/Madrid",
      it: "Europe/Rome",
      br: "America/Sao_Paulo"
    };
    if (tldZones[tld]) return { zone: tldZones[tld], confidence: "중간", source: `국가 코드 도메인 .${tld}` };
    return { zone: fallbackZone, confidence: "낮음", source: "시간대 단서 없음" };
  }

  function getSupportedTimeZones(fallbackZone) {
    const common = [
      "UTC",
      "Asia/Seoul",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Asia/Singapore",
      "Asia/Kolkata",
      "Europe/London",
      "Europe/Berlin",
      "Europe/Paris",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Sao_Paulo",
      "Australia/Sydney",
      "Pacific/Auckland"
    ];
    const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    return Array.from(new Set([fallbackZone, ...common, ...supported])).filter(isValidTimeZone).sort();
  }

  function isValidTimeZone(zone) {
    try {
      Intl.DateTimeFormat("en-US", { timeZone: zone }).format(new Date());
      return true;
    } catch (_error) {
      return false;
    }
  }

  function formatDateTimeInZone(date, timeZone) {
    return new Intl.DateTimeFormat(document.documentElement.lang === "en" ? "en-US" : "ko-KR", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(date);
  }

  function formatOffsetInZone(date, timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit"
    }).formatToParts(date);
    return parts.find((part) => part.type === "timeZoneName")?.value || "GMT";
  }

  function isPrivateIp(value) {
    const parts = value.split(".").map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    return parts[0] === 10
      || parts[0] === 127
      || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      || (parts[0] === 192 && parts[1] === 168);
  }

  function stat(label, value) {
    return `<div class="stat-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function resultBlock(main, subtitle, rows) {
    return [
      '<div class="result-main">',
      `<strong>${escapeHtml(main)}</strong>`,
      subtitle ? `<span>${escapeHtml(subtitle)}</span>` : "",
      "</div>",
      rows.length ? `<dl class="result-list">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : ""
    ].join("");
  }

  function errorBlock(message) {
    return `<div class="result-main error-result"><strong>${escapeHtml(message)}</strong></div>`;
  }

  function showToast(message) {
    const toast = $("#copyToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1500);
  }

  function bytesToBase64(bytes) {
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  function fallbackUuid() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function randomCharacter(pool) {
    return pool[secureRandomIndex(pool.length)];
  }

  function secureRandomIndex(max) {
    if (max <= 1) return 0;
    const limit = Math.floor(0x100000000 / max) * max;
    const buffer = new Uint32Array(1);
    do {
      crypto.getRandomValues(buffer);
    } while (buffer[0] >= limit);
    return buffer[0] % max;
  }

  function shuffle(values) {
    for (let index = values.length - 1; index > 0; index -= 1) {
      const target = secureRandomIndex(index + 1);
      [values[index], values[target]] = [values[target], values[index]];
    }
  }

  function toLocalDateTimeValue(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function parseInteger(value) {
    const cleaned = String(value).replace(/[,\s원]/g, "");
    if (!/^-?\d+$/.test(cleaned)) return null;
    const number = Number(cleaned);
    return Number.isSafeInteger(number) ? number : null;
  }

  function formatDecimal(value) {
    return Number(value.toPrecision(12)).toLocaleString("ko-KR", { maximumFractionDigits: 10 });
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  }

  function normalize(value) {
    return String(value || "").toLocaleLowerCase("ko").replace(/[·•._/\\-]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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
