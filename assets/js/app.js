(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const DAY_MS = 86400000;
  const WEEKDAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const ZODIAC = [
    { name: "쥐띠", branch: "자(子)" },
    { name: "소띠", branch: "축(丑)" },
    { name: "호랑이띠", branch: "인(寅)" },
    { name: "토끼띠", branch: "묘(卯)" },
    { name: "용띠", branch: "진(辰)" },
    { name: "뱀띠", branch: "사(巳)" },
    { name: "말띠", branch: "오(午)" },
    { name: "양띠", branch: "미(未)" },
    { name: "원숭이띠", branch: "신(申)" },
    { name: "닭띠", branch: "유(酉)" },
    { name: "개띠", branch: "술(戌)" },
    { name: "돼지띠", branch: "해(亥)" }
  ];
  const AGE_TERMS = new Map([
    [15, "지학(志學)"], [20, "약관(弱冠)"], [30, "이립(而立)"],
    [40, "불혹(不惑)"], [50, "지천명(知天命)"], [60, "이순(耳順)"],
    [61, "환갑(還甲)"], [70, "고희(古稀)"], [77, "희수(喜壽)"],
    [80, "산수(傘壽)"], [88, "미수(米壽)"], [90, "졸수(卒壽)"],
    [99, "백수(白壽)"], [100, "상수(上壽)"]
  ]);

  const SQL_SAMPLE = "WITH paid_orders AS (SELECT o.user_id, COUNT(*) AS order_count, SUM(o.total_amount) AS total_amount FROM app_db.orders o WHERE o.status IN ('paid', 'ready') AND o.deleted_at IS NULL GROUP BY o.user_id) SELECT u.id, u.name, IFNULL(p.order_count, 0) AS order_count FROM app_db.users u LEFT JOIN paid_orders p ON p.user_id = u.id WHERE u.status = 'active' ORDER BY order_count DESC LIMIT 20;";
  const EXPLAIN_SAMPLE = [
    "id\tselect_type\ttable\tpartitions\ttype\tpossible_keys\tkey\tkey_len\tref\trows\tfiltered\tExtra",
    "1\tSIMPLE\tu\tNULL\tref\tidx_status\tidx_status\t82\tconst\t240\t85.00\tUsing where",
    "1\tSIMPLE\to\tNULL\tref\tidx_user_status\tidx_user_status\t8\tapp_db.u.id\t14\t73.50\tUsing index condition",
    "1\tSIMPLE\tp\tNULL\tALL\tNULL\tNULL\tNULL\tNULL\t120000\t18.00\tUsing temporary; Using filesort"
  ].join("\n");

  const KEYWORDS = new Set([
    "ADD", "ALL", "ALTER", "ANALYZE", "AND", "AS", "ASC", "BETWEEN", "BY", "CASE",
    "CAST", "CHANGE", "COLUMN", "CONSTRAINT", "CREATE", "CROSS", "DATABASE", "DELETE",
    "DESC", "DISTINCT", "DROP", "ELSE", "END", "EXISTS", "EXPLAIN", "FALSE", "FOR",
    "FOREIGN", "FROM", "FULL", "GROUP", "HAVING", "IF", "IN", "INDEX", "INNER",
    "INSERT", "INTERVAL", "INTO", "IS", "JOIN", "KEY", "LEFT", "LIKE", "LIMIT",
    "LOCK", "NOT", "NULL", "OFFSET", "ON", "OR", "ORDER", "OUTER", "PRIMARY",
    "REFERENCES", "REGEXP", "RIGHT", "SCHEMA", "SELECT", "SET", "STRAIGHT_JOIN",
    "TABLE", "THEN", "TO", "TRUE", "UNION", "UNIQUE", "UPDATE", "USE", "USING",
    "VALUES", "WHEN", "WHERE", "WITH"
  ]);
  const SQL_CLAUSES = [
    ["LEFT", "OUTER", "JOIN"], ["RIGHT", "OUTER", "JOIN"], ["FULL", "OUTER", "JOIN"],
    ["UNION", "ALL"], ["INSERT", "INTO"], ["DELETE", "FROM"], ["GROUP", "BY"],
    ["ORDER", "BY"], ["LEFT", "JOIN"], ["RIGHT", "JOIN"], ["INNER", "JOIN"],
    ["CROSS", "JOIN"], ["FULL", "JOIN"], ["STRAIGHT_JOIN"], ["SELECT"], ["FROM"],
    ["WHERE"], ["HAVING"], ["LIMIT"], ["OFFSET"], ["VALUES"], ["SET"], ["UPDATE"],
    ["UNION"], ["WITH"], ["ON"]
  ];
  const UI_TEXT = {
    ko: {
      skinApply: "적용",
      skinApplied: "적용됨",
      skinLabel: "테마",
      menuOpen: "메뉴",
      menuClose: "메뉴 닫기",
      navPipTools: "pip 도구모음",
      navPipClock: "시계",
      navPipTimer: "타이머",
      navPipPomodoro: "뽀모도로 타이머",
      navPipColor: "색상 선택",
      navPipImage: "이미지 리사이즈",
      navPipMemo: "메모",
      navBossTimer: "보스타이머",
      navMaplelandBossTimer: "메이플랜드 보스타이머",
      navDeveloper: "개발 도구",
      navNpm: "npm 패키지 정보",
      navUtility: "확장 도구 모음",
      navFileMedia: "파일·미디어 도구",
      navAdvanced: "고급 도구",
      navGamingSection: "게임 · 장치 테스트",
      navGamingLab: "게임 테스트 랩",
      navGamingCalculators: "게임 계산기 랩",
      navDeviceDiagnostics: "장치 진단 랩",
      navDisplayDiagnostics: "화면 진단 랩",
      navInputTraining: "입력 연습 랩",
      navPerformanceLab: "성능 진단 랩",
      navLife: "생활 계산기",
      navAgeGroup: "나이 · 띠",
      navAgeCalculator: "나이·만나이 계산기",
      navAgeTable: "나이표·나이 용어",
      navZodiac: "띠·띠궁합·삼재",
      navDateGroup: "날짜",
      navDateInfo: "날짜 정보",
      navDateDiff: "디데이·날짜 차이",
      navDateRange: "기간 날짜 목록·평일",
      navDateMove: "날짜 더하기·빼기",
      navAnniversary: "기념일·아기 100일",
      navLunarGroup: "양력 · 음력",
      navLunarConverter: "양음력 변환",
      navLunarAnniversary: "음력 기념일 변환",
      navFinanceGroup: "주식 및 코인",
      navKoreaStocks: "국내 주식 조회",
      navGlobalStocks: "해외 주식 조회",
      navCrypto: "코인 공포탐욕 지표",
      navCalendarGroup: "달력 · 학교",
      navHolidays: "우리나라 공휴일",
      navWorldHolidays: "세계 공휴일 달력",
      navNoHandDays: "손없는 날",
      navSchool: "입학·졸업·학생 나이",
      navFunNames: "재미 이름짓기"
    },
    en: {
      skinApply: "Apply",
      skinApplied: "Applied",
      skinLabel: "Theme",
      menuOpen: "Menu",
      menuClose: "Close menu",
      navPipTools: "PIP Toolbox",
      navPipClock: "Clock",
      navPipTimer: "Timer",
      navPipPomodoro: "Pomodoro Timer",
      navPipColor: "Color Picker",
      navPipImage: "Image Resize",
      navPipMemo: "Memo",
      navBossTimer: "Boss Timers",
      navMaplelandBossTimer: "Mapleland Boss Timer",
      navDeveloper: "Developer Tools",
      navNpm: "npm Package Info",
      navUtility: "Utility Toolbox",
      navFileMedia: "File & Media Tools",
      navAdvanced: "Advanced Tools",
      navGamingSection: "Game & Device Tests",
      navGamingLab: "Game Test Lab",
      navGamingCalculators: "Game Calculator Lab",
      navDeviceDiagnostics: "Device Diagnostics Lab",
      navDisplayDiagnostics: "Display Diagnostics Lab",
      navInputTraining: "Input Training Lab",
      navPerformanceLab: "Performance Lab",
      navLife: "Life Calculators",
      navAgeGroup: "Age & Zodiac",
      navAgeCalculator: "Age Calculator",
      navAgeTable: "Age Table",
      navZodiac: "Zodiac Match & Samjae",
      navDateGroup: "Dates",
      navDateInfo: "Date Info",
      navDateDiff: "D-Day & Date Difference",
      navDateRange: "Date Range & Weekdays",
      navDateMove: "Add or Subtract Dates",
      navAnniversary: "Anniversary Calculator",
      navLunarGroup: "Solar & Lunar",
      navLunarConverter: "Solar/Lunar Converter",
      navLunarAnniversary: "Lunar Anniversary Converter",
      navFinanceGroup: "Stocks & Crypto",
      navKoreaStocks: "Korean Stocks",
      navGlobalStocks: "Global Stocks",
      navCrypto: "Crypto Fear & Greed",
      navCalendarGroup: "Calendar & School",
      navHolidays: "Korean Holidays",
      navWorldHolidays: "World Holiday Calendar",
      navNoHandDays: "No-Hand Days",
      navSchool: "School Year Calculator",
      navFunNames: "Fun Name Generator"
    }
  };
  function init() {
    const initializers = [
      initToolFinder,
      initLanguageToggle,
      initTheme,
      initNavigation,
      markActiveLinks,
      initFormatter,
      initExplain,
      initLegacyCalculators,
      initLifeCalculators
    ];

    initializers.forEach((initializer) => {
      try {
        initializer();
      } catch (error) {
        console.error(`[SolForge] ${initializer.name} failed`, error);
      }
    });
    window.addEventListener("hashchange", markActiveLinks);
  }

  function initLanguageToggle() {
    const toggle = $("#languageToggle");
    if (!toggle) return;
    const lang = document.documentElement.lang === "en" ? "en" : "ko";
    const nextLang = lang === "ko" ? "en" : "ko";
    const targetPath = switchLanguagePath(window.location.pathname, nextLang);
    toggle.href = `${targetPath}${window.location.search}${window.location.hash}`;
    toggle.textContent = nextLang === "en" ? "🇺🇸" : "🇰🇷";
    toggle.setAttribute("aria-label", nextLang === "en" ? "Switch to English" : "한국어로 변경");
  }

  function switchLanguagePath(pathname, nextLang) {
    const path = pathname || "/";
    if (/^\/(?:ko|en)(?:\/|$)/.test(path)) {
      return path.replace(/^\/(?:ko|en)(?=\/|$)/, `/${nextLang}`);
    }
    return `/${nextLang}${path === "/" ? "/" : path}`;
  }

  function initTheme() {
    const toggle = $("#themeToggle");
    const label  = $("#themeToggleLabel");
    const skinSel = $("#skinSelect");
    const skinApply = $("#skinApplyButton");
    enhanceSkinSelect();

    // ── dark/light ──────────────────────────────────────────
    const savedTheme  = readStorage("solforge-theme");
    const systemDark  = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(savedTheme || (systemDark ? "dark" : "light"));

    if (toggle) {
      toggle.addEventListener("click", () => {
        setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
      });
    }

    // ── skin (basic / saas / terminal) ───────────────────────
    const savedSkin = readStorage("solforge-skin") || "basic";
    setSkin(savedSkin);

    if (skinSel) {
      skinSel.value = savedSkin;
      skinSel.addEventListener("change", () => setSkin(skinSel.value || "basic"));
    }

    if (skinApply) {
      skinApply.remove();
    }

    function setTheme(theme) {
      document.documentElement.dataset.theme = theme;
      writeStorage("solforge-theme", theme);
      if (toggle) toggle.setAttribute("aria-pressed", String(theme === "dark"));
      if (label)  label.textContent = theme === "dark" ? "Light" : "Dark";
    }

    function setSkin(skin) {
      document.documentElement.dataset.skin = skin;
      writeStorage("solforge-skin", skin);
      if (skinSel) skinSel.value = skin;
    }

    function enhanceSkinSelect() {
      if (!skinSel || skinSel.closest(".skin-select-control")) return;
      const wrapper = document.createElement("label");
      wrapper.className = "skin-select-control";
      const labelText = document.createElement("span");
      labelText.className = "skin-select-label";
      labelText.textContent = text("skinLabel");
      skinSel.parentNode.insertBefore(wrapper, skinSel);
      wrapper.append(labelText, skinSel);
    }
  }

  function readStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_error) {
      // Theme still works for the current page when storage is unavailable.
    }
  }

  function initNavigation() {
    const nav = $("[data-solforge-nav]") || $(".side-nav");
    if (!nav) return;
    const nested = /\/(?:tools|calculators|guides)\//.test(window.location.pathname);
    const prefix = nested ? "../" : "";
    const life = `${prefix}calculators/all`;
    nav.innerHTML = [
      `<p class="nav-title">${text("navPipTools")}</p>`,
      navLink(`${prefix}tools/pip-toolbox#pip-clock`, "CLK", text("navPipClock")),
      navLink(`${prefix}tools/pip-toolbox#pip-timer`, "TMR", text("navPipTimer")),
      navLink(`${prefix}tools/pip-toolbox#pip-pomodoro`, "POM", text("navPipPomodoro")),
      navLink(`${prefix}tools/pip-toolbox#pip-color`, "HEX", text("navPipColor")),
      navLink(`${prefix}tools/pip-toolbox#pip-image`, "IMG", text("navPipImage")),
      navLink(`${prefix}tools/pip-toolbox#pip-memo`, "MEM", text("navPipMemo")),
      `<p class="nav-title">${text("navBossTimer")}</p>`,
      navLink(`${prefix}tools/mapleland-boss-timer`, "BOSS", text("navMaplelandBossTimer")),
      `<p class="nav-title">${text("navDeveloper")}</p>`,
      navLink(`${prefix}tools/mysql-query-prettier`, "Q", "Query Prettier"),
      navLink(`${prefix}tools/mysql-explain-visual`, "E", "EXPLAIN Visual"),
      navLink(`${prefix}tools/npm-package-info`, "npm", text("navNpm")),
      navLink(`${prefix}tools/utility-toolbox`, "19", text("navUtility")),
      navLink(`${prefix}tools/file-media-toolbox`, "12", text("navFileMedia")),
      navLink(`${prefix}tools/advanced-toolbox`, "10", text("navAdvanced")),
      `<p class="nav-title">${text("navGamingSection")}</p>`,
      navLink(`${prefix}tools/gaming-lab`, "12", text("navGamingLab")),
      navLink(`${prefix}tools/gaming-calculators`, "12", text("navGamingCalculators")),
      navLink(`${prefix}tools/device-diagnostics`, "12", text("navDeviceDiagnostics")),
      navLink(`${prefix}tools/display-diagnostics`, "12", text("navDisplayDiagnostics")),
      navLink(`${prefix}tools/input-training`, "16", text("navInputTraining")),
      navLink(`${prefix}tools/performance-lab`, "8", text("navPerformanceLab")),
      `<p class="nav-title">${text("navLife")}</p>`,
      navGroup(text("navAgeGroup"), [
        [`${life}#age-calculator`, text("navAgeCalculator")],
        [`${life}#age-table`, text("navAgeTable")],
        [`${life}#zodiac-tools`, text("navZodiac")]
      ]),
      navGroup(text("navDateGroup"), [
        [`${life}#date-info`, text("navDateInfo")],
        [`${life}#date-difference`, text("navDateDiff")],
        [`${life}#date-range-list`, text("navDateRange")],
        [`${life}#date-move`, text("navDateMove")],
        [`${life}#anniversary`, text("navAnniversary")]
      ]),
      navGroup(text("navLunarGroup"), [
        [`${life}#lunar-converter`, text("navLunarConverter")],
        [`${life}#lunar-anniversary`, text("navLunarAnniversary")]
      ]),
      navGroup(text("navFinanceGroup"), [
        [`${prefix}tools/korea-stocks`, text("navKoreaStocks")],
        [`${prefix}tools/global-stocks`, text("navGlobalStocks")],
        [`${prefix}tools/crypto-sentiment`, text("navCrypto")]
      ]),
      navGroup(text("navCalendarGroup"), [
        [`${life}#holidays`, text("navHolidays")],
        [`${prefix}tools/world-holidays`, text("navWorldHolidays")],
        [`${life}#no-hand-days`, text("navNoHandDays")],
        [`${life}#school-tools`, text("navSchool")],
        [`${life}#fun-names`, text("navFunNames")]
      ])
    ].join("");
    initMobileNavigation(nav);
  }

  function initMobileNavigation(nav) {
    const sidebar = nav.closest(".sidebar");
    const brand = sidebar && $(".brand", sidebar);
    if (!sidebar || !brand || $(".mobile-nav-toggle", sidebar)) return;

    if (!nav.id) nav.id = "siteNavigation";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "mobile-nav-toggle";
    toggle.setAttribute("aria-controls", nav.id);
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = `<span class="mobile-nav-icon" aria-hidden="true"></span><span>${text("menuOpen")}</span>`;
    brand.insertAdjacentElement("afterend", toggle);

    const scrim = document.createElement("button");
    scrim.type = "button";
    scrim.className = "mobile-nav-scrim";
    scrim.setAttribute("aria-label", text("menuClose"));
    document.body.appendChild(scrim);

    const setOpen = (open) => {
      sidebar.classList.toggle("mobile-nav-open", open);
      scrim.classList.toggle("is-visible", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.querySelector("span:last-child").textContent = open ? text("menuClose") : text("menuOpen");
    };

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      setOpen(!sidebar.classList.contains("mobile-nav-open"));
    });

    scrim.addEventListener("click", () => setOpen(false));

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) window.setTimeout(() => setOpen(false), 0);
    });

    document.addEventListener("pointerdown", (event) => {
      if (!sidebar.classList.contains("mobile-nav-open")) return;
      if (!sidebar.contains(event.target)) setOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 681px)").matches) setOpen(false);
    });
  }

  function text(key) {
    const lang = document.documentElement.lang === "en" ? "en" : "ko";
    const common = {};
    if (common[key]) return common[key];
    return (UI_TEXT[lang] && UI_TEXT[lang][key]) || UI_TEXT.ko[key] || key;
  }

  function navLink(href, icon, label) {
    return `<a href="${href}" class="nav-link" data-nav-link><span class="nav-icon">${icon}</span><span>${label}</span></a>`;
  }

  function navGroup(label, links) {
    const open = " open";
    return [
      `<details class="nav-group"${open}>`,
      `<summary>${label}</summary>`,
      '<div class="nav-submenu">',
      links.map(([href, text]) => `<a href="${href}" data-nav-link>${text}</a>`).join(""),
      "</div></details>"
    ].join("");
  }

  function markActiveLinks() {
    const currentPath = normalizePath(window.location.pathname);
    const currentHash = window.location.hash;
    $$("[data-nav-link], [data-top-link]").forEach((link) => {
      const url = new URL(link.getAttribute("href") || "", window.location.href);
      const samePath = normalizePath(url.pathname) === currentPath;
      const activeHash = !url.hash || url.hash === currentHash || (!currentHash && url.hash === "#age-calculator");
      const active = samePath && activeHash;
      link.classList.toggle("active", active);
    });
  }

  function normalizePath(path) {
    return path.replace(/\/public(?=\/|$)/, "").replace(/\/index\.html$/, "/");
  }

  function initToolFinder() {
    const input = $("#toolSearch");
    const form = $("#toolSearchForm");
    const cards = $$("[data-tool-card]");
    if (!input) return;
    if (!form || !cards.length) {
      document.addEventListener("keydown", (event) => {
        const tag = document.activeElement?.tagName;
        if (event.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
          event.preventDefault();
          input.focus();
        }
      });
      return;
    }

    const filterButtons = $$("[data-tool-filter]");
    const count = $("#visibleToolCount");
    const empty = $("#toolEmpty");
    const reset = $("#resetToolSearch");
    const suggestions = $("#toolSuggestions");
    let activeFilter = "all";

    const normalizeSearch = (value) => String(value || "")
      .toLocaleLowerCase("ko")
      .replace(/[·•._/\\-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const getMatches = () => {
      const query = normalizeSearch(input.value);
      const terms = query.split(" ").filter(Boolean);
      return cards.filter((card) => {
        const categoryMatch = activeFilter === "all" || card.dataset.category === activeFilter;
        const searchable = normalizeSearch(`${card.textContent} ${card.dataset.keywords || ""}`);
        const compact = searchable.replace(/\s/g, "");
        const searchMatch = !terms.length || terms.every((term) => (
          searchable.includes(term) || compact.includes(term.replace(/\s/g, ""))
        ));
        return categoryMatch && searchMatch;
      });
    };

    const applyFilters = () => {
      const matches = new Set(getMatches());
      const query = input.value.trim().toLocaleLowerCase("ko");
      let visible = 0;

      cards.forEach((card) => {
        const show = matches.has(card);
        card.hidden = !show;
        if (show) visible += 1;
      });

      if (count) count.textContent = String(visible);
      if (empty) empty.hidden = visible !== 0;
      return { matches: Array.from(matches), query };
    };

    const closeSuggestions = () => {
      if (!suggestions) return;
      suggestions.hidden = true;
      suggestions.innerHTML = "";
      input.setAttribute("aria-expanded", "false");
    };

    const renderSuggestions = () => {
      if (!suggestions) return;
      const query = input.value.trim();
      if (!query) {
        closeSuggestions();
        return;
      }

      const matches = getMatches().slice(0, 6);
      suggestions.innerHTML = matches.length
        ? matches.map((card) => {
          const title = $("strong", card)?.textContent?.trim() || "도구 열기";
          const meta = $(".catalog-meta", card)?.childNodes[0]?.textContent?.trim() || "도구";
          return `<a href="${card.getAttribute("href")}" role="option"><span>${escapeHtml(meta)}</span><strong>${escapeHtml(title)}</strong><b aria-hidden="true">→</b></a>`;
        }).join("")
        : '<p><strong>검색 결과가 없습니다.</strong><span>다른 검색어를 입력해 보세요.</span></p>';
      suggestions.hidden = false;
      input.setAttribute("aria-expanded", "true");
    };

    const selectFilter = (filter) => {
      activeFilter = filter;
      filterButtons.forEach((button) => {
        const active = button.dataset.toolFilter === filter;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      applyFilters();
    };

    input.addEventListener("input", () => {
      applyFilters();
      renderSuggestions();
    });
    input.addEventListener("focus", renderSuggestions);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const { matches, query } = applyFilters();
      closeSuggestions();
      if (query && matches.length === 1) {
        window.location.href = matches[0].getAttribute("href");
        return;
      }
      $("#all-tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        input.value = "";
        closeSuggestions();
        selectFilter(button.dataset.toolFilter || "all");
      });
    });

    $$("[data-search-term]").forEach((button) => {
      button.addEventListener("click", () => {
        input.value = button.dataset.searchTerm || "";
        selectFilter("all");
        applyFilters();
        closeSuggestions();
        $("#all-tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    if (reset) {
      reset.addEventListener("click", () => {
        input.value = "";
        selectFilter("all");
        closeSuggestions();
        input.focus();
      });
    }

    document.addEventListener("click", (event) => {
      if (!form.contains(event.target)) closeSuggestions();
    });

    document.addEventListener("keydown", (event) => {
      const tag = document.activeElement?.tagName;
      if (event.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        event.preventDefault();
        input.focus();
      }
      if (event.key === "Escape" && document.activeElement === input) {
        input.value = "";
        applyFilters();
        closeSuggestions();
        input.blur();
      }
    });

    const initialQuery = new URLSearchParams(window.location.search).get("q");
    if (initialQuery) input.value = initialQuery;
    selectFilter("all");
  }

  function initFormatter() {
    const input = $("#sqlInput");
    const output = $("#sqlOutput");
    if (!input || !output) return;
    let formatted = "";
    const render = () => {
      formatted = formatSql(input.value);
      output.innerHTML = formatted
        ? highlightSql(formatted)
        : '<span class="tok-comment">정렬된 쿼리가 여기에 표시됩니다.</span>';
    };
    input.addEventListener("input", render);
    const sample = $('[data-load-sample="sql"]');
    if (sample) sample.addEventListener("click", () => {
      input.value = SQL_SAMPLE;
      render();
    });
    const copy = $("#copySql");
    if (copy) copy.addEventListener("click", () => copyText(formatted));
    render();
  }

  function tokenizeSql(sql) {
    const pattern = /(--[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|''|[^'])*'|"(?:\\.|""|[^"])*"|`[^`]*`|@[A-Za-z0-9_$]+|:[A-Za-z0-9_$]+|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_$]*\b|<>|!=|<=|>=|:=|[(),.;+\-*/%=<>]|\s+|.)/g;
    return sql.match(pattern) || [];
  }

  function formatSql(sql) {
    const rawTokens = tokenizeSql(sql)
      .filter((token) => !/^\s+$/.test(token) && token !== "");
    if (!rawTokens.length) return "";

    const hasSemicolon = rawTokens[rawTokens.length - 1] === ";";
    const tokens = hasSemicolon ? rawTokens.slice(0, -1) : rawTokens;
    const lines = renderSqlClauses(splitSqlClauses(tokens));
    if (hasSemicolon && lines.length) lines[lines.length - 1] += ";";
    return lines.join("\n");
  }

  function splitSqlClauses(tokens) {
    const clauses = [];
    let current = null;
    let depth = 0;
    let index = 0;

    while (index < tokens.length) {
      const match = depth === 0 ? matchSqlClause(tokens, index) : null;
      if (match) {
        if (current) clauses.push(current);
        current = { name: match.name, body: [] };
        index += match.length;
        continue;
      }

      if (!current) current = { name: "", body: [] };
      const token = tokens[index];
      current.body.push(token);
      if (token === "(") depth += 1;
      if (token === ")") depth = Math.max(0, depth - 1);
      index += 1;
    }

    if (current) clauses.push(current);
    return clauses;
  }

  function matchSqlClause(tokens, start) {
    for (const parts of SQL_CLAUSES) {
      const matched = parts.every((part, offset) => {
        const token = tokens[start + offset];
        return token && token.toUpperCase() === part;
      });
      if (matched) return { name: parts.join(" "), length: parts.length };
    }
    return null;
  }

  function renderSqlClauses(clauses) {
    const lines = [];
    clauses.forEach((clause) => {
      const name = clause.name.toUpperCase();
      const body = clause.body;
      if (!name) {
        lines.push(renderSqlInline(body));
      } else if (name === "SELECT" || name === "ORDER BY" || name === "GROUP BY") {
        lines.push(name);
        splitTopLevel(body, ",").forEach((part, index, parts) => {
          const suffix = index < parts.length - 1 ? "," : "";
          lines.push(`  ${renderSqlInline(part)}${suffix}`);
        });
      } else if (name === "ON") {
        renderConditionLines(body, "  ON", "  ").forEach((line) => lines.push(line));
      } else if (name === "WHERE" || name === "HAVING") {
        renderConditionLines(body, name, "  ").forEach((line) => lines.push(line));
      } else if (/\bJOIN$/.test(name)) {
        lines.push(`${name}${body.length ? ` ${renderSqlInline(body)}` : ""}`);
      } else if (name === "SET" || name === "VALUES") {
        lines.push(name);
        splitTopLevel(body, ",").forEach((part, index, parts) => {
          const suffix = index < parts.length - 1 ? "," : "";
          lines.push(`  ${renderSqlInline(part)}${suffix}`);
        });
      } else {
        lines.push(`${name}${body.length ? ` ${renderSqlInline(body)}` : ""}`);
      }
    });
    return lines.filter(Boolean);
  }

  function renderConditionLines(tokens, firstPrefix, nextIndent) {
    return splitTopLevelConditions(tokens).map((part, index) => {
      const expression = renderSqlInline(part.tokens);
      if (index === 0) return `${firstPrefix} ${expression}`;
      return `${nextIndent}${part.connector} ${expression}`;
    });
  }

  function splitTopLevel(tokens, separator) {
    const parts = [];
    let current = [];
    let depth = 0;
    tokens.forEach((token) => {
      if (token === "(") depth += 1;
      if (token === ")") depth = Math.max(0, depth - 1);
      if (token === separator && depth === 0) {
        if (current.length) parts.push(current);
        current = [];
      } else {
        current.push(token);
      }
    });
    if (current.length) parts.push(current);
    return parts;
  }

  function splitTopLevelConditions(tokens) {
    const parts = [];
    let current = [];
    let connector = null;
    let depth = 0;
    tokens.forEach((token, index) => {
      const upper = token.toUpperCase();
      const previous = tokens[index - 1] ? tokens[index - 1].toUpperCase() : "";
      const isConnector = depth === 0 && (upper === "AND" || upper === "OR") && previous !== "BETWEEN";
      if (isConnector) {
        if (current.length) parts.push({ connector, tokens: current });
        current = [];
        connector = upper;
      } else {
        current.push(token);
      }
      if (token === "(") depth += 1;
      if (token === ")") depth = Math.max(0, depth - 1);
    });

    if (current.length) parts.push({ connector, tokens: current });
    return parts.filter((part) => part.tokens.length);
  }

  function renderSqlInline(tokens) {
    let output = "";
    let index = 0;
    while (index < tokens.length) {
      const token = tokens[index];
      const value = normalizeSqlToken(token);
      const previous = tokens[index - 1] ? normalizeSqlToken(tokens[index - 1]) : "";
      if (value === ".") {
        output = output.trimEnd() + ".";
      } else if (value === ",") {
        output = output.trimEnd() + ", ";
      } else if (value === ")") {
        output = output.trimEnd() + ")";
      } else if (value === "(") {
        const closeIndex = findMatchingParen(tokens, index);
        const innerTokens = closeIndex > index ? tokens.slice(index + 1, closeIndex) : [];
        if (isSubqueryTokens(innerTokens)) {
          const formattedInner = renderSqlClauses(splitSqlClauses(innerTokens))
            .map((line) => `  ${line}`)
            .join("\n");
          const needsSpace = /^(AS|IN|EXISTS|VALUES)$/i.test(previous);
          output = `${output.trimEnd()}${needsSpace ? " " : ""}(\n${formattedInner}\n)`;
          index = closeIndex;
        } else {
          const needsSpace = /^(AS|IN|EXISTS|VALUES)$/i.test(previous);
          output = output.trimEnd() + (needsSpace ? " (" : "(");
        }
      } else if (/^(<>|!=|<=|>=|:=|[+\-*/%=<>])$/.test(value)) {
        output = `${output.trimEnd()} ${value} `;
      } else {
        const needsSpace = output && !/[\s(.]$/.test(output) && previous !== ".";
        output += `${needsSpace ? " " : ""}${value}`;
      }
      index += 1;
    }
    return output.split("\n").map((line) => line.trimEnd()).join("\n").trim();
  }

  function findMatchingParen(tokens, openIndex) {
    let depth = 0;
    for (let index = openIndex; index < tokens.length; index += 1) {
      if (tokens[index] === "(") depth += 1;
      if (tokens[index] === ")") {
        depth -= 1;
        if (depth === 0) return index;
      }
    }
    return openIndex;
  }

  function isSubqueryTokens(tokens) {
    const first = tokens.find((token) => token && !/^\s+$/.test(token));
    return first ? /^(SELECT|WITH)$/i.test(first) : false;
  }

  function normalizeSqlToken(token) {
    if (/^[A-Za-z_][A-Za-z0-9_$]*$/.test(token) && KEYWORDS.has(token.toUpperCase())) {
      return token.toUpperCase();
    }
    return token;
  }

  function highlightSql(sql) {
    const tokens = tokenizeSql(sql);
    return tokens.map((token, index) => {
      if (/^\s+$/.test(token)) return token;
      if (/^--|^\/\*/.test(token)) return wrap("tok-comment", token);
      if (/^['"]/.test(token)) return wrap("tok-string", token);
      if (/^`/.test(token)) return wrap("tok-entity", token);
      if (/^[@:]/.test(token)) return wrap("tok-variable", token);
      if (/^\d/.test(token)) return wrap("tok-number", token);
      if (/^[A-Za-z_]/.test(token)) {
        const upper = token.toUpperCase();
        if (KEYWORDS.has(upper)) return wrap("tok-keyword", upper);
        const next = tokens.slice(index + 1).find((item) => !/^\s+$/.test(item));
        if (next === "(") return wrap("tok-function", token);
        return wrap("tok-entity", token);
      }
      if (/^[+\-*/%=<>!]+$/.test(token)) return wrap("tok-operator", token);
      return escapeHtml(token);
    }).join("");
  }

  function initExplain() {
    const input = $("#explainInput");
    if (!input) return;
    const render = () => renderExplain(parseExplain(input.value));
    input.addEventListener("input", render);
    const sample = $('[data-load-sample="explain"]');
    if (sample) sample.addEventListener("click", () => {
      input.value = EXPLAIN_SAMPLE;
      render();
    });
    render();
  }

  function parseExplain(raw) {
    const text = String(raw || "").trim();
    if (!text) return [];
    if (/^[{[]/.test(text)) {
      try {
        return parseExplainJson(JSON.parse(text));
      } catch (error) {
        return [];
      }
    }
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const pipe = lines[0].includes("|");
    const delimiter = lines[0].includes("\t") ? "\t" : pipe ? "|" : /\s{2,}/;
    const clean = (value) => String(value || "").trim().replace(/^"|"$/g, "");
    const split = (line) => line.split(delimiter).map(clean).filter((cell, index, array) => {
      return !(pipe && ((index === 0 && !cell) || (index === array.length - 1 && !cell)));
    });
    const headers = split(lines[0]).map(normalizeHeader);
    return lines.slice(1)
      .filter((line) => !/^\+[-+]+\+$/.test(line))
      .map((line, index) => normalizePlanRow(headers.reduce((row, header, cellIndex) => {
        row[header] = split(line)[cellIndex] || "";
        return row;
      }, {}), index));
  }

  function parseExplainJson(json) {
    const rows = [];
    function visit(node, label) {
      if (!node || typeof node !== "object") return;
      if (node.table) {
        const table = node.table;
        rows.push(normalizePlanRow({
          id: rows.length + 1,
          select_type: label || "JSON",
          table: table.table_name || "(derived)",
          type: table.access_type || "",
          possible_keys: Array.isArray(table.possible_keys) ? table.possible_keys.join(", ") : "",
          key: table.key || "",
          ref: table.ref || "",
          rows: table.rows_examined_per_scan || table.rows_produced_per_join || "",
          filtered: table.filtered || "",
          extra: [
            table.attached_condition ? "attached condition" : "",
            table.using_index ? "Using index" : "",
            table.using_temporary_table ? "Using temporary" : "",
            table.using_filesort ? "Using filesort" : ""
          ].filter(Boolean).join("; ")
        }, rows.length));
      }
      Object.keys(node).forEach((key) => {
        const value = node[key];
        if (value && typeof value === "object") {
          if (Array.isArray(value)) value.forEach((item) => visit(item, key.replace(/_/g, " ")));
          else visit(value, key.replace(/_/g, " "));
        }
      });
    }
    visit(Array.isArray(json) ? json[0] : json, "query block");
    return rows;
  }

  function normalizeHeader(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  }

  function normalizePlanRow(row, index) {
    const type = String(row.type || row.access_type || "unknown").toLowerCase();
    const key = row.key && row.key !== "NULL" ? row.key : "";
    const rows = numberValue(row.rows || row.rows_examined_per_scan);
    const filtered = numberValue(row.filtered) || 100;
    const extra = row.extra || "";
    const weight = ({ system: 0.2, const: 0.4, eq_ref: 0.7, ref: 1, range: 1.6, index: 2.4, all: 4.5 }[type] || 2);
    const cost = Math.max(1, Math.round((rows || 1) * weight * Math.max(0.05, filtered / 100) * (/filesort|temporary/i.test(extra) ? 1.8 : 1)));
    const danger = type === "all" || !key || /filesort|temporary/i.test(extra) || rows > 100000;
    const warning = !danger && (["index", "range"].includes(type) || rows > 10000);
    return {
      ...row,
      id: row.id || index + 1,
      select_type: row.select_type || "SIMPLE",
      table: row.table || row.table_name || `(step ${index + 1})`,
      type,
      key,
      rows: rows || row.rows || "?",
      filtered,
      extra,
      cost,
      risk: danger ? "danger" : warning ? "warn" : "good"
    };
  }

  function renderExplain(rows) {
    const summary = $("#explainSummary");
    const dashboard = $("#planDashboard");
    const visual = $("#planVisual");
    const insights = $("#planInsights");
    const table = $("#explainTable");
    if (!visual) return;
    if (!rows.length) {
      if (summary) summary.textContent = "Waiting for input";
      if (dashboard) dashboard.innerHTML = "";
      if (insights) insights.innerHTML = "";
      visual.innerHTML = '<div class="plan-empty">EXPLAIN 결과를 붙여넣으면 실행 순서와 인덱스 사용 여부를 표시합니다.</div>';
      if (table) {
        $("thead", table).innerHTML = "";
        $("tbody", table).innerHTML = "";
      }
      return;
    }
    const totalRows = rows.reduce((sum, row) => sum + numberValue(row.rows), 0);
    const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
    const scans = rows.filter((row) => row.type === "all" || !row.key).length;
    if (summary) summary.textContent = `${rows.length} steps · cost ${formatNumber(totalCost)}`;
    if (dashboard) dashboard.innerHTML = [
      statCard("Plan steps", rows.length),
      statCard("Estimated rows", formatNumber(totalRows)),
      statCard("Estimated cost", formatNumber(totalCost)),
      statCard("No-index scans", scans)
    ].join("");
    visual.innerHTML = `<div class="plan-flow">${rows.map((row, index) => {
      const maxCost = Math.max(...rows.map((item) => item.cost), 1);
      const width = Math.max(6, Math.round((row.cost / maxCost) * 100));
      return [
        index ? '<div class="plan-arrow" aria-hidden="true"></div>' : "",
        '<div class="plan-node">',
        '<div class="node-top"><div>',
        `<p class="node-title">${index + 1}. ${escapeHtml(row.table)}</p>`,
        `<p class="node-subtitle">${escapeHtml(row.select_type)} · ${index ? "join step" : "driving table"}</p>`,
        `</div><span class="tag ${row.risk}">${row.risk === "good" ? "Good" : row.risk === "warn" ? "Watch" : "Review"}</span></div>`,
        '<div class="node-tags">',
        `<span class="tag ${row.key ? "good" : "danger"}">${row.key ? `index: ${escapeHtml(row.key)}` : "no index"}</span>`,
        `<span class="tag ${row.type === "all" ? "danger" : "good"}">access: ${escapeHtml(row.type.toUpperCase())}</span>`,
        `<span class="tag">rows: ${escapeHtml(row.rows)}</span>`,
        "</div>",
        `<div class="cost-bar"><span style="--cost-width:${width}%"></span></div>`,
        `<div class="node-detail"><span><b>possible</b> ${escapeHtml(row.possible_keys || "none")}</span><span><b>ref</b> ${escapeHtml(row.ref || "none")}</span><span><b>cost</b> ${formatNumber(row.cost)}</span><span><b>extra</b> ${escapeHtml(row.extra || "none")}</span></div>`,
        "</div>"
      ].join("");
    }).join("")}</div>`;
    if (insights) {
      const risky = rows.filter((row) => row.risk !== "good");
      insights.innerHTML = [
        insightCard("실행 순서", rows.map((row, index) => `${index + 1}. ${row.table} (${row.type.toUpperCase()})`)),
        insightCard("인덱스", rows.map((row) => `${row.table}: ${row.key || "인덱스 미사용"}`)),
        insightCard("검토 지점", risky.length ? risky.map((row) => `${row.table}: ${row.extra || "접근 방식 확인 필요"}`) : ["뚜렷한 위험 신호가 없습니다."])
      ].join("");
    }
    renderExplainTable(rows, table);
  }

  function renderExplainTable(rows, table) {
    if (!table) return;
    const headers = ["id", "select_type", "table", "type", "possible_keys", "key", "ref", "rows", "filtered", "cost", "extra"];
    $("thead", table).innerHTML = `<tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>`;
    $("tbody", table).innerHTML = rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header] ?? "")}</td>`).join("")}</tr>`).join("");
  }

  function statCard(label, value) {
    return `<div class="stat-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function insightCard(title, items) {
    return `<article class="insight-card"><h3>${title}</h3><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></article>`;
  }

  function initLegacyCalculators() {
    initLegacyDate();
    initLegacyAge();
    initLegacyAnniversary();
    initLegacySchool();
  }

  function initLegacyDate() {
    const form = $("#dateCalcForm");
    if (!form) return;
    const today = todayInput();
    $("#dateStart").value ||= today;
    $("#dateEnd").value ||= today;
    $("#dateBase").value ||= today;
    const render = () => {
      const start = dateFromInput($("#dateStart").value);
      const end = dateFromInput($("#dateEnd").value);
      const included = $("#includeEnd").checked ? 1 : 0;
      const diff = Math.round((end - start) / DAY_MS) + included;
      const sign = $("#dateMode").value === "subtract" ? -1 : 1;
      const moved = addDateParts(dateFromInput($("#dateBase").value), {
        years: sign * numberValue($("#dateYears").value),
        months: sign * numberValue($("#dateMonths").value),
        days: sign * numberValue($("#dateDays").value)
      });
      $("#dateCalcResult").innerHTML = resultBlock(`${formatNumber(diff)}일`, "두 날짜 사이", [
        ["오늘 기준", ddayText(end)],
        ["더하기·빼기 결과", formatKoreanDate(moved)],
        ["종료일 포함", included ? "포함" : "미포함"]
      ]);
    };
    form.addEventListener("input", render);
    render();
  }

  function initLegacyAge() {
    const form = $("#ageCalcForm");
    if (!form) return;
    $("#birthDate").value ||= "1995-01-01";
    $("#ageTargetDate").value ||= todayInput();
    const render = () => {
      const birth = dateFromInput($("#birthDate").value);
      const target = dateFromInput($("#ageTargetDate").value);
      const age = calculateAge(birth, target);
      $("#ageCalcResult").innerHTML = resultBlock(`만 ${age.years}세`, "국제 기준 나이", [
        ["정확한 기간", `${age.years}년 ${age.months}개월 ${age.days}일`],
        ["세는 나이", `${target.getFullYear() - birth.getFullYear() + 1}세`],
        ["성년 여부", age.years >= 19 ? "만 19세 이상" : "만 19세 미만"]
      ]);
    };
    form.addEventListener("input", render);
    render();
  }

  function initLegacyAnniversary() {
    const form = $("#anniversaryCalcForm");
    if (!form) return;
    $("#anniversaryBase").value ||= todayInput();
    const render = () => {
      const count = Math.max(1, numberValue($("#anniversaryDays").value));
      const target = addDateParts(dateFromInput($("#anniversaryBase").value), { days: count - 1 });
      $("#anniversaryResult").innerHTML = resultBlock(formatKoreanDate(target), `${formatNumber(count)}일째`, [
        ["오늘 기준", ddayText(target)],
        ["계산 방식", "시작일을 1일째로 계산"]
      ]);
    };
    form.addEventListener("input", render);
    render();
  }

  function initLegacySchool() {
    const form = $("#schoolCalcForm");
    if (!form) return;
    $("#schoolBirthYear").value ||= String(new Date().getFullYear() - 7);
    const render = () => {
      const years = schoolYears(numberValue($("#schoolBirthYear").value));
      $("#schoolResult").innerHTML = resultBlock(`${years.elementaryIn}년 3월`, "초등학교 입학 예상", [
        ["초등학교 졸업", `${years.elementaryOut}년 2월`],
        ["중학교 입학·졸업", `${years.middleIn}년 3월 · ${years.middleOut}년 2월`],
        ["고등학교 입학·졸업", `${years.highIn}년 3월 · ${years.highOut}년 2월`]
      ]);
    };
    form.addEventListener("input", render);
    render();
  }

  function initLifeCalculators() {
    if (document.body.dataset.page !== "life-calculators") return;
    initLifeAge();
    initAgeTable();
    initZodiacTools();
    initDateInfo();
    initDateDifference();
    initDateRangeList();
    initDateMove();
    initLifeAnniversary();
    initLunarTools();
    initHolidayTools();
    initSchoolTools();
    initFunNames();
  }

  function initLifeAge() {
    const form = $("#lifeAgeForm");
    $("#lifeBirthDate").value = "1995-01-01";
    $("#lifeAgeTarget").value = todayInput();
    const render = () => {
      const birth = dateFromInput($("#lifeBirthDate").value);
      const target = dateFromInput($("#lifeAgeTarget").value);
      if (birth > target) {
        $("#lifeAgeResult").innerHTML = errorResult("생년월일은 기준일보다 늦을 수 없습니다.");
        return;
      }
      const age = calculateAge(birth, target);
      const koreanAge = target.getFullYear() - birth.getFullYear() + 1;
      const yearAge = target.getFullYear() - birth.getFullYear();
      const zodiac = zodiacForYear(birth.getFullYear());
      const livedDays = Math.floor((stripTime(target) - stripTime(birth)) / DAY_MS);
      let nextBirthday = new Date(target.getFullYear(), birth.getMonth(), birth.getDate());
      if (nextBirthday < stripTime(target)) nextBirthday = new Date(target.getFullYear() + 1, birth.getMonth(), birth.getDate());
      const birthdayDiff = Math.round((stripTime(nextBirthday) - stripTime(target)) / DAY_MS);
      $("#lifeAgeResult").innerHTML = resultBlock(`만 ${age.years}세`, `${age.years}년 ${age.months}개월 ${age.days}일`, [
        ["세는 나이", `${koreanAge}세`],
        ["연 나이", `${yearAge}세`],
        ["살아온 날", `${formatNumber(livedDays)}일`],
        ["태어난 요일", WEEKDAYS[birth.getDay()]],
        ["다음 생일", `${formatKoreanDate(nextBirthday)} · ${birthdayDiff === 0 ? "오늘" : `D-${formatNumber(birthdayDiff)}`}`],
        ["띠", `${zodiac.branch} ${zodiac.name}`],
        ["성년 여부", age.years >= 19 ? "성년(만 19세 이상)" : "미성년"],
        ["전통 나이 용어", AGE_TERMS.get(koreanAge) || "해당 용어 없음"]
      ]);
    };
    form.addEventListener("input", render);
    render();
  }

  function initAgeTable() {
    const form = $("#ageTableForm");
    const yearInput = $("#ageTableYear");
    yearInput.value = String(new Date().getFullYear());
    const render = () => {
      const year = clamp(numberValue(yearInput.value), 1000, 9999);
      const rows = [];
      for (let koreanAge = 1; koreanAge <= 100; koreanAge += 1) {
        const birthYear = year - koreanAge + 1;
        const zodiac = zodiacForYear(birthYear);
        rows.push(`<tr><td>${birthYear}년</td><td>${Math.max(0, koreanAge - 2)}~${Math.max(0, koreanAge - 1)}세</td><td>${koreanAge}세</td><td>${zodiac.name}</td><td>${AGE_TERMS.get(koreanAge) || ""}</td></tr>`);
      }
      $("#ageTableBody").innerHTML = rows.join("");
    };
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      render();
    });
    render();
  }

  function initZodiacTools() {
    const options = ZODIAC.map((sign, index) => `<option value="${index}">${sign.branch} ${sign.name}</option>`).join("");
    $("#zodiacA").innerHTML = options;
    $("#zodiacB").innerHTML = options;
    $("#samjaeSign").innerHTML = options;
    $("#zodiacA").value = "0";
    $("#zodiacB").value = "4";
    $("#samjaeSign").value = "6";
    $("#zodiacBirthYear").value = "1990";
    $("#samjaeYear").value = String(new Date().getFullYear());

    const renderYear = () => {
      const year = numberValue($("#zodiacBirthYear").value);
      const sign = zodiacForYear(year);
      const years = [];
      for (let value = year - 60; value <= year + 60; value += 12) {
        if (value >= 1000 && value <= 9999) years.push(value);
      }
      $("#zodiacYearResult").innerHTML = resultBlock(`${sign.branch} ${sign.name}`, `${year}년생`, [
        ["띠동갑 연도", years.join(", ")]
      ]);
    };

    const renderMatch = () => {
      const a = numberValue($("#zodiacA").value);
      const b = numberValue($("#zodiacB").value);
      const result = zodiacCompatibility(a, b);
      $("#zodiacMatchResult").innerHTML = resultBlock(`${result.score}점`, result.label, [
        ["조합", `${ZODIAC[a].name} · ${ZODIAC[b].name}`],
        ["풀이", result.description]
      ]);
    };

    const renderSamjae = () => {
      const year = numberValue($("#samjaeYear").value);
      const sign = numberValue($("#samjaeSign").value);
      const phase = samjaePhase(sign, zodiacIndex(year));
      const yearSign = zodiacForYear(year);
      $("#samjaeResult").innerHTML = resultBlock(phase ? phase : "삼재 아님", `${year}년 ${yearSign.name}`, [
        ["확인한 띠", ZODIAC[sign].name],
        ["안내", phase ? "민속적 분류에 따른 참고 정보입니다." : "해당 연도는 전통적인 삼재 해에 속하지 않습니다."]
      ]);
    };

    ["zodiacBirthYear"].forEach((id) => $(`#${id}`).addEventListener("input", renderYear));
    ["zodiacA", "zodiacB"].forEach((id) => $(`#${id}`).addEventListener("change", renderMatch));
    ["samjaeYear", "samjaeSign"].forEach((id) => $(`#${id}`).addEventListener("input", renderSamjae));
    renderYear();
    renderMatch();
    renderSamjae();
  }

  function zodiacCompatibility(a, b) {
    if (a === b) return { score: 82, label: "닮은 궁합", description: "기질과 생활 리듬이 비슷해 서로를 빠르게 이해하는 조합입니다." };
    const harmonies = [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11]];
    const pairs = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
    if (harmonies.some((group) => group.includes(a) && group.includes(b))) {
      return { score: 95, label: "삼합", description: "전통적으로 서로의 장점을 살려 주는 매우 조화로운 관계로 봅니다." };
    }
    if (pairs.some((pair) => pair.includes(a) && pair.includes(b))) {
      return { score: 90, label: "육합", description: "서로 다른 성향이 자연스럽게 맞물려 균형을 이루는 관계로 봅니다." };
    }
    if ((a + 6) % 12 === b) {
      return { score: 48, label: "상충", description: "관점 차이가 큰 조합입니다. 대화 방식과 생활 리듬을 의식적으로 맞추는 것이 좋습니다." };
    }
    return { score: 70, label: "보통 궁합", description: "띠만으로 좋고 나쁨을 단정하기 어렵고 서로의 태도와 환경이 더 중요합니다." };
  }

  function samjaePhase(personSign, yearSign) {
    const groups = [
      { people: [8, 0, 4], years: [2, 3, 4] },
      { people: [2, 6, 10], years: [8, 9, 10] },
      { people: [11, 3, 7], years: [5, 6, 7] },
      { people: [5, 9, 1], years: [11, 0, 1] }
    ];
    const group = groups.find((item) => item.people.includes(personSign));
    const index = group ? group.years.indexOf(yearSign) : -1;
    return ["들삼재(첫해)", "눌삼재(둘째 해)", "날삼재(셋째 해)"][index] || "";
  }

  function initDateInfo() {
    const input = $("#dateInfoValue");
    input.value = todayInput();
    const render = () => {
      const date = dateFromInput(input.value);
      const start = new Date(date.getFullYear(), 0, 1);
      const end = new Date(date.getFullYear() + 1, 0, 1);
      const ordinal = Math.floor((date - start) / DAY_MS) + 1;
      const remaining = Math.floor((end - date) / DAY_MS) - 1;
      const lunar = solarToLunar(date);
      const zodiac = zodiacForYear(date.getFullYear());
      $("#dateInfoResult").innerHTML = resultBlock(formatKoreanDate(date), WEEKDAYS[date.getDay()], [
        ["올해의 날짜", `${ordinal}번째 날`],
        ["연말까지", `${remaining}일 남음`],
        ["윤년", isLeapYear(date.getFullYear()) ? "윤년(366일)" : "평년(365일)"],
        ["음력", lunar ? `${lunar.year}년 ${lunar.month}월 ${lunar.day}일${lunar.intercalation ? " 윤달" : ""}` : "지원 범위 밖"],
        ["연도 띠", `${zodiac.branch} ${zodiac.name}`]
      ]);
    };
    input.addEventListener("input", render);
    render();
  }

  function initDateDifference() {
    const form = $("#lifeDateDiffForm");
    $("#lifeDiffStart").value = todayInput();
    $("#lifeDiffEnd").value = toInputDate(addDateParts(new Date(), { days: 100 }));
    const render = () => {
      const start = dateFromInput($("#lifeDiffStart").value);
      const end = dateFromInput($("#lifeDiffEnd").value);
      const raw = Math.round((end - start) / DAY_MS);
      const inclusive = $("#lifeDiffInclude").checked ? (raw >= 0 ? 1 : -1) : 0;
      const total = raw + inclusive;
      const absolute = Math.abs(total);
      const stats = countDayTypes(start, end, $("#lifeDiffInclude").checked);
      $("#lifeDiffResult").innerHTML = resultBlock(`${formatNumber(total)}일`, total === 0 ? "같은 날짜" : total > 0 ? "종료일이 더 늦습니다." : "종료일이 더 빠릅니다.", [
        ["주 단위", `${Math.floor(absolute / 7)}주 ${absolute % 7}일`],
        ["평일", `${formatNumber(stats.weekdays)}일`],
        ["주말", `${formatNumber(stats.weekends)}일`],
        ["시간 환산", `${formatNumber(absolute * 24)}시간`],
        ["오늘 기준 종료일", ddayText(end)],
        ["포함 방식", $("#lifeDiffInclude").checked ? "양 끝 날짜 포함" : "날짜 간격"]
      ]);
    };
    form.addEventListener("input", render);
    render();
  }

  function initDateRangeList() {
    const form = $("#dateRangeListForm");
    if (!form) return;
    $("#dateRangeStart").value = todayInput();
    $("#dateRangeEnd").value = toInputDate(addDateParts(new Date(), { days: 14 }));
    const render = () => {
      const start = dateFromInput($("#dateRangeStart").value);
      const end = dateFromInput($("#dateRangeEnd").value);
      if (end < start) {
        $("#dateRangeListResult").innerHTML = errorResult("종료일은 시작일보다 빠를 수 없습니다.");
        return;
      }
      const total = Math.round((end - start) / DAY_MS) + 1;
      if (total > 366) {
        $("#dateRangeListResult").innerHTML = errorResult("날짜 목록은 최대 366일까지 만들 수 있습니다.");
        return;
      }
      const weekdaysOnly = $("#dateRangeWeekdaysOnly").checked;
      const rows = [];
      let weekdays = 0;
      let weekends = 0;
      for (let offset = 0; offset < total; offset += 1) {
        const date = addDateParts(start, { days: offset });
        const weekend = date.getDay() === 0 || date.getDay() === 6;
        if (weekend) weekends += 1;
        else weekdays += 1;
        if (!weekdaysOnly || !weekend) rows.push([formatKoreanDate(date), WEEKDAYS[date.getDay()]]);
      }
      $("#dateRangeListResult").innerHTML = [
        resultBlock(`${formatNumber(total)}일`, `평일 ${formatNumber(weekdays)}일 · 주말 ${formatNumber(weekends)}일`, [
          ["목록 표시", weekdaysOnly ? `평일 ${formatNumber(rows.length)}개` : `전체 ${formatNumber(rows.length)}개`]
        ]),
        `<div class="table-wrap date-list-wrap"><table><thead><tr><th>날짜</th><th>요일</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${row[0]}</td><td>${row[1]}</td></tr>`).join("")}</tbody></table></div>`
      ].join("");
    };
    form.addEventListener("input", render);
    render();
  }

  function initDateMove() {
    const form = $("#lifeDateMoveForm");
    $("#lifeMoveDate").value = todayInput();
    const render = () => {
      const base = dateFromInput($("#lifeMoveDate").value);
      let amount = numberValue($("#lifeMoveAmount").value);
      if ($("#lifeMoveDirection").value === "subtract") amount *= -1;
      const unit = $("#lifeMoveUnit").value;
      const parts = {};
      parts[unit] = unit === "weeks" ? amount * 7 : amount;
      if (unit === "weeks") {
        parts.days = parts.weeks;
        delete parts.weeks;
      }
      const moved = addDateParts(base, parts);
      $("#lifeMoveResult").innerHTML = resultBlock(formatKoreanDate(moved), WEEKDAYS[moved.getDay()], [
        ["기준일", formatKoreanDate(base)],
        ["변화량", `${formatNumber(Math.abs(amount))}${unitLabel(unit)} ${amount >= 0 ? "더하기" : "빼기"}`],
        ["오늘 기준", ddayText(moved)]
      ]);
    };
    form.addEventListener("input", render);
    render();
  }

  function unitLabel(unit) {
    return ({ days: "일", weeks: "주", months: "개월", years: "년" }[unit] || "");
  }

  function initLifeAnniversary() {
    const form = $("#lifeAnniversaryForm");
    $("#lifeAnniversaryStart").value = todayInput();
    const render = () => {
      const start = dateFromInput($("#lifeAnniversaryStart").value);
      const custom = Math.max(1, numberValue($("#lifeAnniversaryCustom").value));
      const milestones = [100, 200, 300, 365, 500, 1000, custom]
        .filter((value, index, array) => array.indexOf(value) === index)
        .sort((a, b) => a - b);
      const rows = milestones.map((days) => {
        const target = addDateParts(start, { days: days - 1 });
        return [`${formatNumber(days)}일`, `${formatKoreanDate(target)} (${WEEKDAYS[target.getDay()]})`];
      });
      const firstBirthday = addDateParts(start, { years: 1 });
      rows.push(["첫돌", `${formatKoreanDate(firstBirthday)} (${WEEKDAYS[firstBirthday.getDay()]})`]);
      $("#lifeAnniversaryResult").innerHTML = resultBlock(formatKoreanDate(addDateParts(start, { days: 99 })), "100일째 되는 날", rows);
    };
    form.addEventListener("input", render);
    render();
  }

  function initLunarTools() {
    const solarInput = $("#solarDateInput");
    const now = new Date();
    const supportedToday = now.getFullYear() <= 2050 ? now : new Date(2050, 11, 31);
    solarInput.value = toInputDate(supportedToday);
    $("#lunarYearInput").value = String(Math.min(now.getFullYear(), 2050));
    $("#lunarMonthInput").value = "1";
    $("#lunarDayInput").value = "1";
    $("#lunarAnnualStart").value = String(Math.min(now.getFullYear(), 2041));

    const renderSolar = () => {
      const date = dateFromInput(solarInput.value);
      const lunar = solarToLunar(date);
      $("#solarToLunarResult").innerHTML = lunar
        ? resultBlock(`음력 ${lunar.year}년 ${lunar.month}월 ${lunar.day}일`, lunar.intercalation ? "윤달" : "평달", [
          ["간지", lunar.gapja],
          ["입력한 양력", formatKoreanDate(date)]
        ])
        : errorResult("지원 범위 안의 올바른 양력 날짜를 입력하세요.");
    };

    const renderLunar = () => {
      const result = lunarToSolar(
        numberValue($("#lunarYearInput").value),
        numberValue($("#lunarMonthInput").value),
        numberValue($("#lunarDayInput").value),
        $("#lunarLeapInput").checked
      );
      $("#lunarToSolarResult").innerHTML = result
        ? resultBlock(formatKoreanDate(result), WEEKDAYS[result.getDay()], [
          ["오늘 기준", ddayText(result)]
        ])
        : errorResult("존재하지 않거나 지원 범위를 벗어난 음력 날짜입니다.");
    };

    solarInput.addEventListener("input", renderSolar);
    ["lunarYearInput", "lunarMonthInput", "lunarDayInput", "lunarLeapInput"].forEach((id) => {
      $(`#${id}`).addEventListener("input", renderLunar);
    });

    $("#lunarAnnualForm").addEventListener("submit", (event) => {
      event.preventDefault();
      renderLunarAnnual();
    });

    renderSolar();
    renderLunar();
    renderLunarAnnual();
  }

  function renderLunarAnnual() {
    const month = numberValue($("#lunarAnnualMonth").value);
    const day = numberValue($("#lunarAnnualDay").value);
    const start = numberValue($("#lunarAnnualStart").value);
    const count = clamp(numberValue($("#lunarAnnualCount").value), 1, 30);
    const rows = [];
    for (let year = start; year < start + count && year <= 2050; year += 1) {
      const solar = lunarToSolar(year, month, day, false);
      rows.push([`${year}년 음력 ${month}월 ${day}일`, solar ? `${formatKoreanDate(solar)} (${WEEKDAYS[solar.getDay()]})` : "변환 불가"]);
    }
    $("#lunarAnnualResult").innerHTML = resultBlock(`음력 ${month}월 ${day}일`, `${start}년부터 ${rows.length}년`, rows);
  }

  function initHolidayTools() {
    const currentYear = Math.min(new Date().getFullYear(), 2050);
    $("#holidayYear").value = String(currentYear);
    $("#freeDayMonth").value = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    $("#holidayForm").addEventListener("submit", (event) => {
      event.preventDefault();
      renderHolidays();
    });
    $("#freeDayForm").addEventListener("submit", (event) => {
      event.preventDefault();
      renderFreeDays();
    });
    renderHolidays();
    renderFreeDays();
  }

  function renderHolidays() {
    const year = numberValue($("#holidayYear").value);
    if (year < 1000 || year > 2050) {
      $("#holidayResult").innerHTML = errorResult("1000년부터 2050년 사이를 입력하세요.");
      return;
    }
    const holidays = getKoreanHolidays(year);
    $("#holidayResult").innerHTML = resultBlock(`${year}년 공휴일`, `${holidays.length}개 날짜`, holidays.map((item) => [
      item.name,
      `${formatKoreanDate(item.date)} (${WEEKDAYS[item.date.getDay()]})`
    ]));
  }

  function getKoreanHolidays(year) {
    const items = [
      holiday(year, 1, 1, "신정"),
      holiday(year, 3, 1, "삼일절"),
      holiday(year, 5, 5, "어린이날"),
      holiday(year, 6, 6, "현충일"),
      holiday(year, 8, 15, "광복절"),
      holiday(year, 10, 3, "개천절"),
      holiday(year, 10, 9, "한글날"),
      holiday(year, 12, 25, "성탄절")
    ];
    const seollal = lunarToSolar(year, 1, 1, false);
    const buddha = lunarToSolar(year, 4, 8, false);
    const chuseok = lunarToSolar(year, 8, 15, false);
    if (seollal) {
      items.push(
        { date: addDateParts(seollal, { days: -1 }), name: "설날 연휴" },
        { date: seollal, name: "설날" },
        { date: addDateParts(seollal, { days: 1 }), name: "설날 연휴" }
      );
    }
    if (buddha) items.push({ date: buddha, name: "부처님오신날" });
    if (chuseok) {
      items.push(
        { date: addDateParts(chuseok, { days: -1 }), name: "추석 연휴" },
        { date: chuseok, name: "추석" },
        { date: addDateParts(chuseok, { days: 1 }), name: "추석 연휴" }
      );
    }
    if (year >= 2021) addSubstituteHolidays(items, year);
    return items.sort((a, b) => a.date - b.date);
  }

  function addSubstituteHolidays(items, year) {
    const eligible = new Set(["삼일절", "어린이날", "광복절", "개천절", "한글날", "설날", "설날 연휴", "추석", "추석 연휴"]);
    if (year >= 2023) {
      eligible.add("부처님오신날");
      eligible.add("성탄절");
    }
    const occupied = new Set(items.map((item) => toInputDate(item.date)));
    const candidates = items.filter((item) => eligible.has(item.name) && [0, 6].includes(item.date.getDay()));
    candidates.forEach((item) => {
      let substitute = addDateParts(item.date, { days: 1 });
      while ([0, 6].includes(substitute.getDay()) || occupied.has(toInputDate(substitute))) {
        substitute = addDateParts(substitute, { days: 1 });
      }
      occupied.add(toInputDate(substitute));
      items.push({ date: substitute, name: `${item.name} 대체공휴일` });
    });
  }

  function renderFreeDays() {
    const [year, month] = $("#freeDayMonth").value.split("-").map(Number);
    if (!year || !month || year > 2050) {
      $("#freeDayResult").innerHTML = errorResult("지원 범위 안의 연월을 입력하세요.");
      return;
    }
    const lastDay = new Date(year, month, 0).getDate();
    const rows = [];
    for (let day = 1; day <= lastDay; day += 1) {
      const solar = new Date(year, month - 1, day);
      const lunar = solarToLunar(solar);
      if (lunar && [9, 0].includes(lunar.day % 10)) {
        rows.push([
          `${month}월 ${day}일 ${WEEKDAYS[solar.getDay()]}`,
          `음력 ${lunar.month}월 ${lunar.day}일${lunar.intercalation ? " 윤달" : ""}`
        ]);
      }
    }
    $("#freeDayResult").innerHTML = resultBlock(`${year}년 ${month}월`, `손없는 날 ${rows.length}일`, rows);
  }

  function initSchoolTools() {
    const form = $("#lifeSchoolForm");
    const year = new Date().getFullYear();
    $("#lifeSchoolBirthYear").value = String(year - 7);
    $("#lifeSchoolReferenceYear").value = String(year);
    const render = () => {
      const birthYear = numberValue($("#lifeSchoolBirthYear").value);
      const referenceYear = numberValue($("#lifeSchoolReferenceYear").value);
      const years = schoolYears(birthYear);
      $("#lifeSchoolResult").innerHTML = resultBlock(`${years.elementaryIn}년 3월`, "초등학교 입학 예상", [
        ["초등학교 졸업", `${years.elementaryOut}년 2월`],
        ["중학교 입학", `${years.middleIn}년 3월`],
        ["중학교 졸업", `${years.middleOut}년 2월`],
        ["고등학교 입학", `${years.highIn}년 3월`],
        ["고등학교 졸업", `${years.highOut}년 2월`]
      ]);
      const grades = [];
      for (let grade = 1; grade <= 12; grade += 1) {
        const label = grade <= 6 ? `초등학교 ${grade}학년` : grade <= 9 ? `중학교 ${grade - 6}학년` : `고등학교 ${grade - 9}학년`;
        const studentBirth = referenceYear - grade - 6;
        grades.push(`<tr><td>${label}</td><td>${studentBirth}년생</td><td>${referenceYear - studentBirth + 1}세</td></tr>`);
      }
      $("#studentAgeBody").innerHTML = grades.join("");
      const exam = nextCsatDate();
      $("#examDayResult").innerHTML = `<strong>대학수학능력시험 참고 D-Day</strong><span>${formatKoreanDate(exam)} (${WEEKDAYS[exam.getDay()]}) · ${ddayText(exam)}</span>`;
    };
    form.addEventListener("input", render);
    render();
  }

  function nextCsatDate() {
    const today = stripTime(new Date());
    let year = today.getFullYear();
    let date = nthWeekdayOfMonth(year, 10, 4, 3);
    if (date < today) {
      year += 1;
      date = nthWeekdayOfMonth(year, 10, 4, 3);
    }
    return date;
  }

  function nthWeekdayOfMonth(year, monthIndex, weekday, ordinal) {
    const first = new Date(year, monthIndex, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    return new Date(year, monthIndex, 1 + offset + (ordinal - 1) * 7);
  }

  function initFunNames() {
    const form = $("#funNameForm");
    $("#funNameBirth").value = "1995-01-01";
    const indianA = ["고요한", "푸른", "빛나는", "용감한", "따뜻한", "자유로운", "깊은", "빠른", "은빛", "붉은", "새벽의", "별을 보는"];
    const indianB = ["바람", "강", "달", "산", "구름", "불꽃", "호수", "숲", "노을", "파도", "별", "하늘"];
    const indianC = ["의 노래", "의 발걸음", "을 지키는 이", "과 걷는 이", "의 친구", "을 깨우는 이", "의 숨결", "을 품은 이"];
    const chosunA = ["한양", "남산", "청계", "북촌", "서촌", "강릉", "담양", "전주", "경주", "제주", "해주", "평양"];
    const chosunB = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
    const chosunC = ["도령", "낭자", "선비", "대감", "별감", "참봉", "훈장", "객주", "화공", "의원"];
    const render = () => {
      const date = dateFromInput($("#funNameBirth").value);
      const seed = date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate();
      const indian = `${indianA[(date.getMonth()) % indianA.length]} ${indianB[(date.getDate() - 1) % indianB.length]}${indianC[seed % indianC.length]}`;
      const chosun = `${chosunA[date.getMonth() % chosunA.length]} ${chosunB[seed % chosunB.length]}${chosunC[(date.getDate() - 1) % chosunC.length]}`;
      const style = $("#funNameStyle").value;
      $("#funNameResult").innerHTML = resultBlock(style === "indian" ? indian : chosun, style === "indian" ? "인디언식 재미 이름" : "조선식 재미 이름", [
        ["생년월일", formatKoreanDate(date)],
        ["주의", "오락용 결과이며 실제 문화·역사적 작명법과 무관합니다."]
      ]);
    };
    form.addEventListener("input", render);
    render();
  }

  function solarToLunar(date) {
    if (typeof KoreanLunarCalendar === "undefined") return null;
    const calendar = new KoreanLunarCalendar();
    if (!calendar.setSolarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())) return null;
    const lunar = calendar.getLunarCalendar();
    const gapja = calendar.getKoreanGapja();
    return {
      ...lunar,
      gapja: `${gapja.year} ${gapja.month} ${gapja.day}${gapja.intercalation ? ` ${gapja.intercalation}` : ""}`
    };
  }

  function lunarToSolar(year, month, day, intercalation) {
    if (typeof KoreanLunarCalendar === "undefined") return null;
    const calendar = new KoreanLunarCalendar();
    if (!calendar.setLunarDate(year, month, day, Boolean(intercalation))) return null;
    const solar = calendar.getSolarCalendar();
    return new Date(solar.year, solar.month - 1, solar.day);
  }

  function holiday(year, month, day, name) {
    return { date: new Date(year, month - 1, day), name };
  }

  function zodiacIndex(year) {
    return ((year - 4) % 12 + 12) % 12;
  }

  function zodiacForYear(year) {
    return ZODIAC[zodiacIndex(year)];
  }

  function schoolYears(birthYear) {
    const elementaryIn = birthYear + 7;
    const elementaryOut = elementaryIn + 6;
    const middleIn = elementaryOut;
    const middleOut = middleIn + 3;
    const highIn = middleOut;
    const highOut = highIn + 3;
    return { elementaryIn, elementaryOut, middleIn, middleOut, highIn, highOut };
  }

  function calculateAge(birth, target) {
    let years = target.getFullYear() - birth.getFullYear();
    let months = target.getMonth() - birth.getMonth();
    let days = target.getDate() - birth.getDate();
    if (days < 0) {
      months -= 1;
      days += new Date(target.getFullYear(), target.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
  }

  function countDayTypes(start, end, inclusive) {
    const first = start <= end ? stripTime(start) : stripTime(end);
    const last = start <= end ? stripTime(end) : stripTime(start);
    const total = Math.max(0, Math.round((last - first) / DAY_MS) + (inclusive ? 1 : 0));
    let weekdays = 0;
    let weekends = 0;
    for (let offset = 0; offset < total; offset += 1) {
      const date = addDateParts(first, { days: offset });
      if (date.getDay() === 0 || date.getDay() === 6) weekends += 1;
      else weekdays += 1;
    }
    return { weekdays, weekends };
  }

  function addDateParts(date, parts) {
    let result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (parts.years) result = addMonthsClamped(result, parts.years * 12);
    if (parts.months) result = addMonthsClamped(result, parts.months);
    if (parts.days) result.setDate(result.getDate() + parts.days);
    return stripTime(result);
  }

  function addMonthsClamped(date, months) {
    const day = date.getDate();
    const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
    const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(day, last));
    return target;
  }

  function dateFromInput(value) {
    const [year, month, day] = String(value || todayInput()).split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function stripTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function todayInput() {
    return toInputDate(new Date());
  }

  function toInputDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function formatKoreanDate(date) {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  }

  function ddayText(date) {
    const diff = Math.round((stripTime(date) - stripTime(new Date())) / DAY_MS);
    return diff === 0 ? "D-Day" : diff > 0 ? `D-${formatNumber(diff)}` : `D+${formatNumber(Math.abs(diff))}`;
  }

  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  function numberValue(value) {
    const number = Number(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(number) ? number : 0;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(Number(value));
  }

  function resultBlock(main, subtitle, rows) {
    return [
      `<div class="result-main"><strong>${escapeHtml(main)}</strong><span>${escapeHtml(subtitle)}</span></div>`,
      `<ul class="result-list">${rows.map(([label, value]) => `<li><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></li>`).join("")}</ul>`
    ].join("");
  }

  function errorResult(message) {
    return `<div class="result-main error-result"><strong>입력을 확인해 주세요.</strong><span>${escapeHtml(message)}</span></div>`;
  }

  async function copyText(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    const toast = $("#copyToast");
    if (toast) {
      toast.classList.add("show");
      window.setTimeout(() => toast.classList.remove("show"), 1400);
    }
  }

  function wrap(className, value) {
    return `<span class="${className}">${escapeHtml(value)}</span>`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  document.addEventListener("DOMContentLoaded", init);
}());
