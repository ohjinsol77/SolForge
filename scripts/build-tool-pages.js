const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { translate } = require("./generate-en-locale");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://solforge.cloud";
const ADSENSE_CLIENT = "ca-pub-1625988263075960";
const LANGS = ["ko", "en"];
const CATEGORY_ORDER = [
  "developer", "text", "media", "pip", "boss", "gameplay", "game-calculator",
  "device", "display", "input", "performance", "finance", "life", "age",
  "date", "lunar", "calendar"
];
const AD_FREE_TOOL_SLUGS = new Set([
  "pip-clock",
  "pip-timer",
  "pip-pomodoro",
  "pip-color",
  "pip-image",
  "pip-memo",
  "mapleland-boss-timer",
  "flashlight-tool"
]);

const categoryCopy = {
  ko: {
    pip: {
      label: "PIP 작업 도구",
      use: "반복 작업 중 작은 보조 창을 곁에 두고 현재 상태를 확인할 때 유용합니다.",
      limit: "Document Picture-in-Picture 지원 여부와 백그라운드 탭 절전 정책은 브라우저와 운영체제에 따라 다릅니다."
    },
    boss: {
      label: "게임 타이머",
      use: "반복되는 패턴과 재사용 시간을 직접 기록하며 플레이 흐름을 정리할 때 활용할 수 있습니다.",
      limit: "게임 패치, 서버 상태, 파티 구성과 실제 시작 시점에 따라 프리셋과 실제 시간이 달라질 수 있습니다."
    },
    developer: {
      label: "개발자 도구",
      use: "코드 리뷰, 디버깅, 데이터 확인처럼 결과를 빠르게 비교해야 하는 개발 작업에 적합합니다.",
      limit: "실제 운영 환경에 적용하기 전에는 입력 형식, 문자 인코딩, 실행 환경과 보안 요구사항을 다시 확인하세요."
    },
    text: {
      label: "텍스트 도구",
      use: "문서 작성, 데이터 정리, 게시 전 점검처럼 반복되는 텍스트 작업을 줄이는 데 유용합니다.",
      limit: "변환 전 원문을 별도로 보관하고, 줄바꿈·공백·문자 인코딩이 의도대로 유지되는지 확인하세요."
    },
    media: {
      label: "파일·미디어 도구",
      use: "별도 프로그램을 설치하지 않고 로컬 파일을 확인하거나 변환 결과를 빠르게 만들 때 사용할 수 있습니다.",
      limit: "브라우저가 지원하는 형식과 메모리 한계가 있으므로 원본 파일을 보관하고 결과 품질을 직접 확인하세요."
    },
    gameplay: {
      label: "게임 플레이 테스트",
      use: "클릭, 반응속도와 에임처럼 플레이에 직접 연결되는 입력을 같은 환경에서 반복 측정할 때 유용합니다.",
      limit: "브라우저 이벤트 주기, 장치 드라이버, 화면 주사율과 시스템 부하에 따라 측정값이 달라질 수 있습니다."
    },
    "game-calculator": {
      label: "게임 계산 도구",
      use: "감도, FOV, TTK와 화면·하드웨어 수치를 목적별로 계산하고 설정값을 비교할 때 유용합니다.",
      limit: "게임마다 적용하는 단위, 배율, 시야각 기준과 반올림 방식이 다를 수 있으므로 게임 내 설정과 함께 확인하세요."
    },
    device: {
      label: "장치 진단",
      use: "오디오, 카메라, 게임패드와 센서처럼 브라우저가 인식하는 장치 상태를 항목별로 점검할 때 유용합니다.",
      limit: "권한 설정, 운영체제, 드라이버와 브라우저의 장치 API 지원 범위에 따라 사용할 수 있는 측정 항목이 달라집니다."
    },
    display: {
      label: "화면 진단",
      use: "색상, 명암, 픽셀과 움직임을 서로 다른 테스트 패턴으로 나누어 화면 상태를 확인할 때 유용합니다.",
      limit: "패널 특성, 밝기 설정, 색상 프로필과 주변 조명에 따라 보이는 결과가 달라질 수 있습니다."
    },
    input: {
      label: "입력 장치 테스트",
      use: "키보드와 마우스의 속도, 지연, 고스팅과 이동 상태를 같은 조건에서 반복 확인할 때 유용합니다.",
      limit: "브라우저 이벤트 처리, 운영체제 설정, 연결 방식과 현재 시스템 부하가 측정값에 영향을 줄 수 있습니다."
    },
    performance: {
      label: "성능·네트워크 점검",
      use: "CPU, GPU, 메모리, 대역폭과 화면 환경을 목적별 점검 항목으로 나누어 비교할 때 유용합니다.",
      limit: "짧은 브라우저 측정은 전문 벤치마크를 대체하지 않으며 절전 모드, 백그라운드 작업과 발열 상태에 따라 달라질 수 있습니다."
    },
    finance: {
      label: "금융·시장 도구",
      use: "시장 수치와 통화 값을 빠르게 비교하고 추가 확인이 필요한 항목을 찾을 때 활용할 수 있습니다.",
      limit: "표시 데이터는 지연되거나 누락될 수 있으며 투자 조언이 아닙니다. 거래 전 공식 공시와 실시간 호가를 확인하세요."
    },
    life: {
      label: "생활 도구",
      use: "일상에서 자주 필요한 단위와 수치를 빠르게 환산하거나 참고값을 계산할 때 유용합니다.",
      limit: "반올림 방식과 적용 기준에 따라 실제 결과가 달라질 수 있으므로 중요한 결정에는 공식 기준을 함께 확인하세요."
    },
    age: {
      label: "나이·띠 도구",
      use: "생년월일과 기준 연도를 바탕으로 나이 관련 정보를 정리하고 비교할 때 활용할 수 있습니다.",
      limit: "법적 성년, 행정 자격과 서비스 이용 조건은 적용 법령과 기관별 기준을 우선해 확인하세요."
    },
    date: {
      label: "날짜 계산 도구",
      use: "일정 계획, 마감 확인과 기념일 관리처럼 기준일이 중요한 작업에 사용할 수 있습니다.",
      limit: "시작일·종료일 포함 여부, 시간대와 영업일 규칙에 따라 결과가 달라질 수 있습니다."
    },
    lunar: {
      label: "양력·음력 도구",
      use: "음력 생일과 기념일을 확인하거나 양력 일정으로 옮겨 적을 때 활용할 수 있습니다.",
      limit: "윤달과 지원 연도 범위를 확인하고, 중요한 일정은 공신력 있는 달력이나 기관 자료로 재확인하세요."
    },
    calendar: {
      label: "달력·학교 도구",
      use: "공휴일, 학교 일정과 연도별 생활 정보를 한눈에 정리할 때 활용할 수 있습니다.",
      limit: "임시공휴일, 선거일, 학교별 일정과 행정 예외는 자동 결과에 반영되지 않을 수 있습니다."
    }
  },
  en: {
    pip: {
      label: "PIP Workflow Tools",
      use: "Useful when you want a small companion window that stays visible while you work through a repeating task.",
      limit: "Document Picture-in-Picture support and background-tab behavior vary by browser and operating system."
    },
    boss: {
      label: "Game Timers",
      use: "Use it to record repeating patterns and cooldowns while keeping track of the current play sequence.",
      limit: "Presets may differ from actual timings after game updates or when server, party, and start conditions change."
    },
    developer: {
      label: "Developer Tools",
      use: "Designed for development tasks that benefit from quick inspection and comparison, including debugging and code review.",
      limit: "Before using the result in production, verify the input format, character encoding, runtime, and security requirements."
    },
    text: {
      label: "Text Tools",
      use: "Useful for reducing repetitive text work before publishing, documenting, or cleaning a data set.",
      limit: "Keep the original text and verify that line breaks, whitespace, and character encoding remain as intended."
    },
    media: {
      label: "File & Media Tools",
      use: "Use it to inspect a local file or create a converted result without installing a separate desktop application.",
      limit: "Browser format support and available memory vary. Keep the source file and inspect the exported result."
    },
    gameplay: {
      label: "Gameplay Tests",
      use: "Useful for repeating play-related input checks such as clicking, reaction time, and aim in the same environment.",
      limit: "Results may vary with browser event timing, device drivers, refresh rate, and current system load."
    },
    "game-calculator": {
      label: "Gaming Calculators",
      use: "Useful for comparing sensitivity, FOV, TTK, display, and hardware values one calculation at a time.",
      limit: "Games may use different units, multipliers, FOV definitions, and rounding rules. Confirm the result against the in-game settings."
    },
    device: {
      label: "Device Diagnostics",
      use: "Useful for checking browser-visible audio, camera, gamepad, and sensor behavior one device at a time.",
      limit: "Available readings depend on permissions, the operating system, device drivers, and browser API support."
    },
    display: {
      label: "Display Diagnostics",
      use: "Useful for inspecting color, contrast, pixels, and motion with a separate pattern for each display check.",
      limit: "Panel characteristics, brightness, color profiles, and ambient light can change what you see."
    },
    input: {
      label: "Input Device Tests",
      use: "Useful for repeating keyboard and mouse speed, latency, ghosting, and movement checks under consistent conditions.",
      limit: "Browser event handling, operating-system settings, connection type, and current system load can affect the readings."
    },
    performance: {
      label: "Performance & Network Checks",
      use: "Useful for reviewing CPU, GPU, memory, bandwidth, and display environment as separate checks.",
      limit: "Short browser checks do not replace dedicated benchmarks and can vary with power saving, background work, and thermal conditions."
    },
    finance: {
      label: "Finance & Market Tools",
      use: "Use it to compare market or currency values quickly and identify items that need further verification.",
      limit: "Displayed data may be delayed or incomplete and is not investment advice. Check official disclosures and live quotes before trading."
    },
    life: {
      label: "Everyday Tools",
      use: "Useful for quick unit conversions and reference calculations that come up in everyday tasks.",
      limit: "Rounding and reference standards can affect the result. Confirm critical values with an authoritative source."
    },
    age: {
      label: "Age & Zodiac Tools",
      use: "Use it to organize and compare age-related information from a birth date or reference year.",
      limit: "For legal adulthood, administrative eligibility, or age-gated services, follow the applicable law and provider rules."
    },
    date: {
      label: "Date Calculators",
      use: "Useful for schedules, deadlines, and anniversaries where the exact reference date matters.",
      limit: "Results can change depending on date inclusion, time zone, and business-day rules."
    },
    lunar: {
      label: "Solar & Lunar Tools",
      use: "Use it to check lunar birthdays and anniversaries or transfer them to a solar-calendar schedule.",
      limit: "Check leap-month handling and the supported year range, then verify important dates with an authoritative calendar."
    },
    calendar: {
      label: "Calendar & School Tools",
      use: "Useful for reviewing holidays, school timelines, and other year-based reference information.",
      limit: "Temporary holidays, elections, school-specific calendars, and administrative exceptions may not be included."
    }
  }
};

const ui = {
  ko: {
    skip: "본문으로 이동",
    brandTagline: "독립형 브라우저 도구",
    directory: "전체 도구",
    features: "기능소개",
    guides: "활용 가이드",
    about: "사이트소개",
    contact: "문의",
    privacy: "개인정보처리방침",
    language: "Switch to English",
    badge: "개별 기능 페이지",
    ready: "로그인 없이 바로 실행",
    local: "입력값 저장 안 함",
    source: "기능과 설명을 함께 제공",
    workspace: "도구 실행",
    guideEyebrow: "사용 안내",
    howTitle: (title) => `${title} 사용 방법`,
    howIntro: (title, description) => `${title}는 ${description} 이 페이지에서 다른 기능을 거치지 않고 해당 도구를 바로 실행하고 결과를 확인할 수 있습니다.`,
    firstStep: (labels) => labels.length
      ? `${labels.join("·")} 항목에 확인하려는 값을 입력하거나 옵션을 선택합니다.`
      : "화면에 표시된 시작 또는 실행 컨트롤을 눌러 측정을 시작합니다.",
    secondStep: (buttons) => buttons.length
      ? `${buttons.join("·")} 버튼으로 작업을 실행하거나 현재 결과를 갱신합니다.`
      : "입력과 동시에 갱신되는 값이 안정될 때까지 같은 조건을 유지합니다.",
    thirdStep: "결과의 단위와 기준을 확인한 뒤 필요한 값만 복사하거나 내려받습니다.",
    useTitle: "이 도구가 유용한 경우",
    limitTitle: "결과를 확인할 때 주의할 점",
    privacyTitle: "입력 데이터와 외부 통신",
    localPrivacy: "입력한 값과 선택한 로컬 파일은 현재 브라우저 안에서 처리되며 SolForge 서버에 저장되지 않습니다. 페이지를 닫기 전에 필요한 결과를 직접 복사하거나 내려받으세요.",
    externalPrivacy: "계산과 화면 처리는 브라우저에서 진행됩니다. 다만 최신 공개 데이터가 필요한 기능은 화면에 안내된 외부 API로 조회 값을 전송할 수 있습니다. 개인정보, 비밀키와 내부 주소는 입력하지 마세요.",
    reviewed: "기능 동작과 설명을 함께 검토했습니다.",
    updated: "최종 검토 2026년 7월 28일",
    faqEyebrow: "자주 묻는 질문",
    faqTitle: (title) => `${title} 이용 전 확인`,
    faqQ1: (title) => `${title} 결과가 매번 같나요?`,
    faqA1: "같은 입력과 같은 브라우저 조건에서는 동일한 계산 규칙을 사용합니다. 실시간 데이터, 장치 상태 또는 브라우저 성능을 사용하는 기능은 실행 시점에 따라 달라질 수 있습니다.",
    faqQ2: "입력한 내용이 SolForge 서버에 저장되나요?",
    related: "같이 사용할 수 있는 도구",
    allTools: "146개 독립 도구 모두 보기",
    footer: "각 기능을 독립 URL에서 실행하고 기준과 한계를 함께 확인할 수 있습니다.",
    category: "분류",
    direct: "직접 실행",
    browser: "브라우저 기반",
    author: "SolForge 편집팀",
    categoryBadge: "기능 카테고리",
    categoryList: (label) => `${label} 목록`,
    categoryLead: (label, count) => `${label} 카테고리의 ${count}개 기능을 한 화면에 묶어 실행하는 대신, 목적에 맞는 개별 도구 페이지로 나누어 제공합니다.`,
    chooseTool: "필요한 기능을 선택하세요",
    categoryCount: (count) => `${count}개 개별 도구`,
    categoryGuide: "카테고리를 먼저 고른 뒤 하위 메뉴에서 정확한 기능을 선택할 수 있습니다."
  },
  en: {
    skip: "Skip to main content",
    brandTagline: "Focused browser tools",
    directory: "All tools",
    features: "Features",
    guides: "Practical guides",
    about: "About",
    contact: "Contact",
    privacy: "Privacy Policy",
    language: "Switch to Korean",
    badge: "Dedicated tool page",
    ready: "Use immediately, no sign-in",
    local: "Inputs are not stored",
    source: "Tool and guidance together",
    workspace: "Use the tool",
    guideEyebrow: "Usage guide",
    howTitle: (title) => `How to use ${title}`,
    howIntro: (_title, description) => `${description} This focused page lets you run the tool and review its output without navigating through unrelated features.`,
    firstStep: (labels) => labels.length
      ? `Enter a value or choose an option for ${joinEnglish(labels)}.`
      : "Use the start or run control shown in the workspace to begin the check.",
    secondStep: (buttons) => buttons.length
      ? `Use ${joinEnglish(buttons)} to run the task or refresh the current result.`
      : "Keep the test conditions consistent until the live result settles.",
    thirdStep: "Check the result's units and reference conditions before copying or downloading what you need.",
    useTitle: "When this tool is useful",
    limitTitle: "What to check in the result",
    privacyTitle: "Input data and external requests",
    localPrivacy: "Values and local files are processed in your current browser and are not stored on a SolForge server. Copy or download any result you need before leaving the page.",
    externalPrivacy: "Calculations and display logic run in your browser. Features that need current public data may send the lookup value to the API named on the page. Do not enter personal data, secret keys, or internal addresses.",
    reviewed: "The feature behavior and supporting guidance were reviewed together.",
    updated: "Last reviewed July 28, 2026",
    faqEyebrow: "Frequently asked questions",
    faqTitle: (title) => `Before you use ${title}`,
    faqQ1: (title) => `Will ${title} always return the same result?`,
    faqA1: "The same input uses the same calculation rules under the same browser conditions. Tools that rely on live data, device state, or browser performance can vary between runs.",
    faqQ2: "Does SolForge store what I enter?",
    related: "Related tools",
    allTools: "Browse all 146 dedicated tools",
    footer: "Run each feature at its own URL and review the method and limitations alongside it.",
    category: "Category",
    direct: "Direct access",
    browser: "Browser based",
    author: "SolForge Editorial",
    categoryBadge: "Tool category",
    categoryList: (label) => `${label} Directory`,
    categoryLead: (label, count) => `The ${label} category provides ${count} focused tools on separate pages instead of combining every feature in one workspace.`,
    chooseTool: "Choose the exact tool you need",
    categoryCount: (count) => `${count} dedicated tools`,
    categoryGuide: "Choose a category first, then use its submenu to open the exact feature you need."
  }
};

function joinEnglish(values) {
  if (values.length < 2) return values[0] || "the available fields";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripTags(value) {
  return String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function loadToolCatalog(lang = "ko") {
  const source = fs.readFileSync(path.join(ROOT, "assets", "js", "tool-catalog.js"), "utf8");
  const context = {
    window: {},
    document: {
      documentElement: { lang },
      addEventListener() {}
    }
  };
  vm.runInNewContext(source, context, { filename: "tool-catalog.js" });
  const catalog = context.window.SF_TOOL_CATALOG;
  if (!Array.isArray(catalog) || !catalog.length) throw new Error("Could not load the tool catalog.");
  return catalog.map((item) => ({ ...item }));
}

function generatedToolRecords(catalog) {
  const records = catalog
    .filter((item) => item.sourceHref.includes("#"))
    .map((item) => ({
      ...item,
      slug: item.href,
      file: `tools/${item.href}.html`
    }));
  const slugs = new Set();
  for (const item of records) {
    if (slugs.has(item.slug)) throw new Error(`Duplicate generated tool slug: ${item.slug}`);
    slugs.add(item.slug);
  }
  return records;
}

function generatedCategoryRecords(catalog) {
  const available = new Set(catalog.map((item) => item.category));
  return CATEGORY_ORDER
    .filter((id) => available.has(id))
    .map((id) => ({ id, slug: id, file: `tools/${id}.html` }));
}

function sourceFileFor(item) {
  const base = item.sourceHref.split("#")[0];
  const resolved = path.posix.normalize(path.posix.join("tools", base));
  return `${resolved}.html`;
}

function sourceFragmentFor(item) {
  return item.sourceHref.split("#")[1] || "";
}

function findElementRange(html, tagName, startIndex) {
  const token = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  token.lastIndex = startIndex;
  let depth = 0;
  let match;
  while ((match = token.exec(html))) {
    const isClosing = /^<\//.test(match[0]);
    const isSelfClosing = /\/>$/.test(match[0]);
    if (!isClosing && !isSelfClosing) depth += 1;
    if (isClosing) depth -= 1;
    if (depth === 0) return { start: startIndex, end: token.lastIndex };
  }
  return null;
}

function extractElementById(html, id) {
  const open = new RegExp(`<([a-z][a-z0-9:-]*)\\b[^>]*\\bid="${escapeRegExp(id)}"[^>]*>`, "i");
  const match = open.exec(html);
  if (!match) throw new Error(`Missing element #${id}`);
  const tagName = match[1];
  const range = findElementRange(html, tagName, match.index);
  if (!range) throw new Error(`Unclosed <${tagName}>#${id}`);
  return html.slice(range.start, range.end);
}

function elementRangesByClass(html, tagName, className) {
  const open = new RegExp(`<${tagName}\\b[^>]*\\bclass="[^"]*\\b${escapeRegExp(className)}\\b[^"]*"[^>]*>`, "gi");
  const ranges = [];
  let match;
  while ((match = open.exec(html))) {
    const range = findElementRange(html, tagName, match.index);
    if (range) {
      ranges.push(range);
      open.lastIndex = range.end;
    }
  }
  return ranges;
}

function removeFirstElementByClass(html, tagName, className) {
  const range = elementRangesByClass(html, tagName, className)[0];
  return range ? `${html.slice(0, range.start)}${html.slice(range.end)}` : html;
}

function removeElementById(html, tagName, id) {
  const open = new RegExp(`<${tagName}\\b[^>]*\\bid="${escapeRegExp(id)}"[^>]*>`, "i");
  const match = open.exec(html);
  if (!match) return html;
  const range = findElementRange(html, tagName, match.index);
  return range ? `${html.slice(0, range.start)}${html.slice(range.end)}` : html;
}

function keepMiniCalculatorCards(html, indexes) {
  const ranges = elementRangesByClass(html, "article", "mini-calculator");
  return ranges
    .map((range, index) => ({ ...range, index }))
    .filter((range) => !indexes.includes(range.index))
    .sort((a, b) => b.start - a.start)
    .reduce((output, range) => `${output.slice(0, range.start)}${output.slice(range.end)}`, html);
}

function prepareToolMarkup(section, slug) {
  let output = removeFirstElementByClass(section, "div", "section-heading");
  if (slug === "zodiac-year-finder") output = keepMiniCalculatorCards(output, [0]);
  if (slug === "zodiac-compatibility-samjae") output = keepMiniCalculatorCards(output, [1, 2]);
  if (slug === "solar-to-lunar") output = keepMiniCalculatorCards(output, [0]);
  if (slug === "lunar-to-solar") output = keepMiniCalculatorCards(output, [1]);
  if (slug === "school-years") output = removeElementById(output, "div", "examDayResult");
  if (slug === "csat-dday") {
    output = removeFirstElementByClass(output, "div", "calc-grid");
    output = removeFirstElementByClass(output, "div", "table-wrap");
  }
  output = output
    .replace(/\shidden(?=\s|>)/gi, "")
    .replace(/\sid="[^"]+"/, ' id="tool-workspace"')
    .replace(/<h1\b/gi, "<h2")
    .replace(/<\/h1>/gi, "</h2>");
  return /^<section\b/i.test(output.trim())
    ? output
    : `<section class="tool-section generated-tool-section">${output}</section>`;
}

function extractScripts(html) {
  const scripts = [];
  for (const match of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/gi)) {
    let src = match[1];
    if (/assets\/js\//.test(src)) {
      src = `${src.replace(/\?v=.*$/, "")}?v=20260804-focused-tools`;
    }
    if (/pagead2\.googlesyndication\.com|i18n-dynamic\.js/.test(src)) continue;
    if (!scripts.includes(src)) scripts.push(src);
  }
  return scripts
    .map((src) => `<script${/\.mjs(?:\?|$)/.test(src) ? ' type="module"' : ""} src="${escapeHtml(src)}"></script>`)
    .join("\n    ");
}

function sourcePageId(html) {
  return html.match(/<body\b[^>]*\bdata-page="([^"]+)"/i)?.[1] || "";
}

function extractControls(section) {
  const labels = [...section.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/gi)]
    .map((match) => stripTags(match[1]))
    .filter((value) => value && value.length <= 60);
  const buttons = [...section.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)]
    .map((match) => stripTags(match[1]))
    .filter((value) => value && value.length <= 40);
  return {
    labels: [...new Set(labels)].slice(0, 4),
    buttons: [...new Set(buttons)].slice(0, 3)
  };
}

const englishToolCopyOverrides = {
  "accelerometer-test": { title: "Accelerometer Test" },
  "age-calculator": {
    title: "International Age Calculator",
    description: "Calculate international age, Korean counting age, year age, and adult status for any reference date."
  },
  "age-table": {
    title: "Age Table by Birth Year",
    description: "Create a birth-year table with international age ranges, Korean counting age, zodiac animals, and traditional age terms."
  },
  "anniversary": {
    title: "Anniversary and Baby 100-Day Calculator",
    description: "Count the start date as day one and find the 100th day, 200th day, first birthday, or a custom anniversary."
  },
  "auditory-reaction": { title: "Auditory Reaction Test" },
  "base64-tool": { title: "Base64 Encoder and Decoder" },
  "baseball-tool": { description: "Play Bulls and Cows by guessing a sequence of non-repeating digits." },
  "bass-test": { title: "Bass Test" },
  "bmi-tool": { title: "BMI and WHR Calculator" },
  "burn-in-test": {
    description: "Cycle through strong full-screen colors briefly to inspect image retention. Do not leave the pattern running unattended."
  },
  "character-map": {
    title: "Special Characters and Emoji",
    description: "Search common symbols and emoji, then copy a character with one click."
  },
  "checksum-tool": { title: "File Checksum Calculator" },
  "chmod-tool": {
    title: "chmod Permission Calculator",
    description: "Convert numeric permissions such as 755 to rwxr-xr-x notation and back."
  },
  "code-table": {
    title: "ASCII and HTML Character Reference",
    description: "Search printable ASCII characters and their HTML numeric character references."
  },
  "code-tool": {
    title: "Code Formatter and Minifier",
    description: "Apply basic formatting or whitespace minification to JSON, CSS, JavaScript, HTML, and SQL."
  },
  "color-tool": {
    title: "Color Picker and Converter",
    description: "Pick a color and convert it between HEX, RGB, and HSL values."
  },
  "crypto-tool": {
    title: "Web Crypto Tools",
    description: "Run hashing, HMAC, PBKDF2, and AES-GCM encryption or decryption with the browser Web Crypto API."
  },
  "csat-dday": {
    title: "CSAT D-Day",
    description: "Check the remaining time until the next scheduled Korean College Scholastic Ability Test."
  },
  "date-info": { title: "Date Information" },
  "date-range-list": {
    title: "Date Range and Weekday Counter",
    description: "Count weekdays and weekends in a selected range and create a dated weekday list."
  },
  "double-click-test": {
    title: "Double-Click Test",
    description: "Detect clicks that arrive within a short interval to check for switch bounce or unintended double-clicks."
  },
  "dpi-tool": {
    title: "DPI and Sensitivity Calculator",
    description: "Calculate eDPI and physical 360-degree travel distance for game sensitivity settings."
  },
  "fov-calculator": { title: "FOV Calculator" },
  "frequency-test": { title: "Frequency Response Test" },
  "fun-names": { title: "Fun Name Generator" },
  "gamepad-test": { title: "Gamepad Test" },
  "gif-tool": {
    title: "Animated GIF Maker and Frame Extractor",
    description: "Create an animated GIF from multiple images or export frames from a local GIF as PNG files."
  },
  "gpu-test": {
    title: "GPU and Canvas Load Test",
    description: "Estimate Canvas rendering performance by measuring the frame rate of moving particles."
  },
  "gyroscope-test": { title: "Gyroscope Test" },
  "headphone-test": { title: "Headphone Channel Test" },
  "holidays": {
    title: "Korean Holiday Calendar",
    description: "Calculate fixed holidays, Lunar New Year, Buddha's Birthday, and Chuseok. Election days and temporary holidays are not included."
  },
  "image-tool": {
    title: "Image Compressor, Resizer, and Data URL Converter",
    description: "Resize JPG, PNG, or WebP files in Canvas and export a compressed image or Data URL."
  },
  "json-tool": { title: "JSON Formatter and Validator" },
  "key-event-tool": {
    title: "Keyboard Event Inspector",
    description: "Press a key to inspect its JavaScript key, code, and modifier state."
  },
  "keyboard-clicker": { title: "Keyboard Clicker Test" },
  "keyboard-converter": {
    title: "Korean/English Keyboard Converter",
    description: "Recover text typed with the wrong Korean or English setting using the standard Dubeolsik keyboard layout."
  },
  "keyboard-double": {
    title: "Keyboard Double-Input Test",
    description: "Check whether the same key is reported repeatedly within an unusually short interval."
  },
  "keyboard-ghosting": { title: "Keyboard Ghosting Test" },
  "keyboard-latency": { title: "Keyboard Latency Test" },
  "keyboard-polling": { title: "Keyboard Polling Estimate" },
  "lotto-tool": {
    title: "Lottery Number Generator",
    description: "Generate six unique numbers from 1 to 45 with the browser's cryptographically secure random source."
  },
  "lunar-anniversary": {
    title: "Lunar Anniversary Date Table",
    description: "Find the solar-calendar date for the same lunar month and day across multiple years."
  },
  "lunar-to-solar": {
    title: "Lunar-to-Solar Converter",
    description: "Convert a Korean lunar date, including an optional leap month, to its solar-calendar date."
  },
  "memory-test": { title: "Memory Sequence Test" },
  "microphone-test": { title: "Microphone Level Meter" },
  "minecraft-circle": {
    title: "Minecraft Circle Generator",
    description: "Create a top-down block grid for building a circle in Minecraft."
  },
  "mouse-accuracy": { title: "Mouse Accuracy Test" },
  "mouse-dpi-test": {
    description: "Estimate mouse DPI from the browser pixel distance recorded during a measured physical movement."
  },
  "mouse-drag": { title: "Mouse Drag Test" },
  "mouse-drift": { title: "Mouse Drift Test" },
  "mouse-latency": { title: "Mouse Latency Test" },
  "mouse-speed": { title: "Mouse Speed and Acceleration" },
  "mouse-spin": { title: "Mouse Spin Test" },
  "mouse-tester": { title: "Mouse Input Test" },
  "no-hand-days": {
    title: "Korean No-Hand Days Calendar",
    description: "List traditional no-hand days, whose lunar dates end in 9 or 0, for a selected month."
  },
  "number-format": { title: "Number Formatter" },
  "password-tool": {
    title: "Password Generator",
    description: "Create a copyable password with the browser's cryptographically secure random source and your selected rules."
  },
  "ppi-calculator": { title: "PPI Calculator" },
  "privacy-mask": { title: "Personal Data Masking" },
  "qr-barcode-tool": {
    title: "QR and Code 39 Barcode Generator",
    description: "Create a QR code or Code 39 barcode image from supported text."
  },
  "ram-latency": { title: "RAM Latency Calculator" },
  "ram-test": { title: "RAM Memory Test" },
  "right-cps-test": { title: "Right-Click CPS Test" },
  "scanner-tool": {
    title: "Barcode and QR Scanner",
    description: "Use BarcodeDetector in a supported browser to scan a code from an image or camera preview."
  },
  "school-years": {
    title: "Korean School Year Calculator",
    description: "Estimate typical Korean elementary, middle, and high school admission and graduation years from a birth year."
  },
  "solar-to-lunar": {
    title: "Solar-to-Lunar Converter",
    description: "Convert a solar-calendar date to its corresponding Korean lunar date."
  },
  "sound-test": { title: "Speaker Channel Test" },
  "stt-tool": { title: "Speech to Text" },
  "subtitle-tool": {
    title: "SMI to SRT Subtitle Converter",
    description: "Convert SMI SYNC timing to SRT timecodes and apply an optional synchronization offset."
  },
  "surround-test": { title: "Stereo Movement Test" },
  "text-cleaner": { title: "Text Cleaner" },
  "text-counter": {
    title: "Character and Word Counter",
    description: "Count characters with or without spaces, words, lines, and UTF-8 bytes in real time."
  },
  "text-diff": {
    title: "Text Difference Checker",
    description: "Compare two documents line by line and highlight added, removed, and unchanged lines."
  },
  "touchscreen-test": { title: "Touchscreen Test" },
  "traditional-weight": {
    title: "Geun, Gwan, and Don Converter",
    description: "Set the weight represented by one geun and convert traditional Korean weight units to grams or kilograms."
  },
  "ttk-calculator": {
    title: "TTK Calculator",
    description: "Estimate time to kill from target health, damage per shot, and rate of fire."
  },
  "tts-tool": { title: "Text to Speech" },
  "typing-practice": { title: "Typing Practice" },
  "unit-tool": { title: "Unit Converter" },
  "vibration-test": { title: "Vibration Test" },
  "webcam-test": { title: "Webcam Test" },
  "webrtc-test": { title: "WebRTC Candidate Check" },
  "zodiac-compatibility-samjae": {
    title: "Zodiac Compatibility and Samjae",
    description: "Compare two Korean zodiac animals and check the traditional three-year Samjae cycle for a selected year."
  },
  "zodiac-year-finder": {
    title: "Korean Zodiac Year Finder",
    description: "Find the Korean zodiac animal for a birth year and list other years with the same animal."
  },
  "pip-image": {
    title: "PIP Image Resizer",
    description: "Resize a local image and export it in your chosen dimensions and format, with a PIP preview in supported browsers."
  },
  "mapleland-boss-timer": {
    title: "MapleLand Boss Timer",
    description: "Track repeating MapleLand boss patterns by slot and keep the timers visible in a PIP window on supported browsers."
  },
  "mysql-query-prettier": {
    title: "MySQL Query Formatter",
    description: "Format complex MySQL queries with readable line breaks, indentation, and syntax highlighting."
  },
  "mysql-explain-visual": {
    title: "MySQL EXPLAIN Visualizer",
    description: "Visualize execution order, joins, index usage, and expensive operations from MySQL EXPLAIN output."
  },
  "../tempdb": {
    title: "SQL Test Data Generator",
    description: "Paste a SQL schema, review its constraints, and generate realistic test rows for MySQL, PostgreSQL, SQLite, or SQL Server."
  },
  "npm-package-info": {
    title: "npm Package Lookup",
    description: "Check npm install commands, package metadata, dependencies, versions, and CDN links from the public npm registry."
  },
  "date-move": {
    title: "Date Add and Subtract Calculator",
    description: "Add or subtract years, months, weeks, and days from a selected date."
  },
  "world-holidays": {
    title: "Worldwide Holiday Calendar",
    description: "Browse public holidays by country, year, or month, calculate business days, and review annual-leave bridge ideas."
  },
  "exchange-rates": {
    title: "Currency Converter",
    description: "Convert an amount at the latest available reference rates and compare 15 major currencies."
  },
  "korea-stocks": {
    title: "Korean Stock Lookup",
    description: "Search Korean stocks by company name or code and review current prices, recent changes, volume, and price history."
  },
  "global-stocks": {
    title: "Global Stock Lookup",
    description: "Look up major U.S. stock tickers and review current prices, percentage changes, volume, and recent charts."
  },
  "crypto-sentiment": {
    title: "Crypto Market Sentiment",
    description: "Review the Fear and Greed Index and prices for high-volume cryptocurrencies using public market data."
  },
  "text-cleaner": {
    title: "Text Cleaner",
    description: "Remove repeated spaces, trailing whitespace, excess blank lines, and common invisible characters."
  },
  "privacy-mask": {
    title: "Personal Data Masking Tool",
    description: "Mask common phone number, email, Korean resident number, and payment card patterns in pasted text."
  },
  "number-format": {
    title: "Number Formatter",
    description: "Add thousands separators and apply a consistent number of decimal places to multiple lines."
  },
  "money-korean": {
    title: "Korean Won Amount Converter",
    description: "Convert an integer to a written Korean won amount or parse a Korean amount back into digits."
  },
  "url-codec": {
    title: "URL Encoder and Decoder",
    description: "Encode or decode a complete URI or an individual query-string value."
  },
  "url-parser": {
    title: "GET URL Analyzer",
    description: "Separate a GET URL into its base address and query parameters, including duplicates, arrays, flags, and empty values."
  },
  "timestamp-tool": {
    title: "Unix Timestamp Converter",
    description: "Convert Unix timestamps in seconds or milliseconds to local dates and convert dates back to timestamps."
  },
  "server-timezone": {
    title: "Server Time Zone Estimator",
    description: "Estimate a server's likely time zone from country-code domains and regional keywords in its address."
  },
  "uuid-tool": {
    title: "UUID v4 Generator",
    description: "Generate UUID v4 values with the browser's cryptographically secure random source."
  },
  "html-editor": {
    title: "HTML Editor and Preview",
    description: "Write HTML and preview the result immediately in a sandboxed iframe."
  },
  "checksum-tool": {
    title: "File Checksum Calculator",
    description: "Calculate SHA checksums for a local file entirely in your browser."
  },
  "tts-tool": {
    title: "Text to Speech",
    description: "Read entered text aloud with a speech voice installed in your browser."
  },
  "eml-tool": {
    title: "EML Viewer",
    description: "Open a local EML file and inspect its main headers and plain-text message body."
  },
  "time-tool": {
    title: "Time Calculator",
    description: "Calculate date or time differences, add a duration, total working hours after breaks, and convert time units."
  },
  "ascii-art-tool": {
    title: "ASCII Art Generator",
    description: "Create a text banner or convert a local image into brightness-based text characters."
  },
  "magic-eye-tool": {
    title: "Magic Eye Generator",
    description: "Create a random-dot autostereogram from a text-based depth map."
  },
  "right-cps-test": {
    title: "Right-Click CPS Test",
    description: "Measure right-click speed without opening the browser's context menu inside the test area."
  },
  "polling-test": {
    title: "Mouse Polling Rate Test",
    description: "Estimate mouse polling frequency from pointer-movement event intervals."
  },
  "spacebar-test": {
    title: "Spacebar Speed Test",
    description: "Measure total spacebar presses and presses per second during a timed run."
  },
  "key-speed-test": {
    title: "Keystroke Speed Test",
    description: "Measure total keystrokes and keystrokes per minute during a timed run."
  },
  "reaction-test": {
    title: "Reaction Time Test",
    description: "Wait for the screen to turn green, then click as quickly as you can."
  },
  "crosshair-generator": {
    title: "Crosshair Generator",
    description: "Draw a simple crosshair on Canvas and save it as a PNG image."
  },
  "aspect-ratio": {
    title: "Aspect Ratio Calculator",
    description: "Calculate a new width or height while preserving the original aspect ratio."
  },
  "download-time": {
    title: "Download Time Calculator",
    description: "Estimate download time from file size and network speed."
  },
  "raid-calculator": {
    title: "RAID Capacity Calculator",
    description: "Estimate usable capacity for common RAID levels from disk count and capacity per disk."
  },
  "ram-latency": {
    title: "RAM Latency Calculator",
    description: "Estimate actual memory latency in nanoseconds from data rate and CAS latency."
  },
  "frequency-test": {
    title: "Frequency Response Test",
    description: "Check audible output with a fixed tone or a sweep from 100 Hz to 10 kHz."
  },
  "microphone-test": {
    title: "Microphone Level Meter",
    description: "Monitor the relative microphone input level in real time. The reading is not an absolute dB SPL measurement."
  },
  "webcam-test": {
    title: "Webcam Test",
    description: "Preview a connected camera after granting browser permission."
  },
  "gamepad-test": {
    title: "Gamepad Test",
    description: "Connect a controller and inspect its button, stick, and trigger state."
  },
  "touchscreen-test": {
    title: "Touchscreen Test",
    description: "Record touch or pointer locations on a Canvas test surface."
  },
  "gyroscope-test": {
    title: "Gyroscope Test",
    description: "Read alpha, beta, and gamma orientation values in supported browsers."
  },
  "fps-hz": {
    title: "FPS, Refresh Rate, and Resolution",
    description: "Estimate refresh rate from animation-frame intervals and display browser resolution details."
  },
  "auditory-reaction": {
    title: "Auditory Reaction Test",
    description: "Wait for the beep, then respond as quickly as you can."
  },
  "typing-practice": {
    title: "Typing Practice",
    description: "Type the displayed passage and review your speed and accuracy."
  },
  "wasd-trainer": {
    title: "WASD Trainer",
    description: "Press each displayed movement key as quickly and accurately as you can."
  },
  "keyboard-clicker": {
    title: "Keyboard Clicker Test",
    description: "Press any key repeatedly to measure total inputs and presses per second."
  },
  "keyboard-ghosting": {
    title: "Keyboard Ghosting Test",
    description: "Hold multiple keys at once and inspect which combinations the browser recognizes."
  },
  "keyboard-latency": {
    title: "Keyboard Latency Test",
    description: "Wait for the signal to turn green, then press any key as quickly as possible."
  },
  "keyboard-polling": {
    title: "Keyboard Polling Estimate",
    description: "Hold or repeat the same key to inspect the interval between keyboard events."
  },
  "mouse-accuracy": {
    title: "Mouse Accuracy Test",
    description: "Click small targets to measure hit rate and pointing accuracy."
  },
  "mouse-drag": {
    title: "Mouse Drag Test",
    description: "Hold the button and draw a path to look for unexpected breaks in drag input."
  },
  "mouse-drift": {
    title: "Mouse Drift Test",
    description: "Keep the mouse still and check for unintended micro-movement events."
  },
  "mouse-spin": {
    title: "Mouse Spin Test",
    description: "Trace circular movements to measure rotation direction and cumulative angle."
  },
  "ram-test": {
    title: "RAM Memory Test",
    description: "Allocate a selected amount of memory and run a simple write-and-verify check."
  },
  "bandwidth-calculator": {
    title: "Bandwidth Calculator",
    description: "Calculate file size, transfer time, or connection speed from the other two values."
  },
  "resolution-test": {
    title: "Resolution Test",
    description: "Display current viewport size, screen resolution, device pixel ratio, and color depth."
  },
  "webrtc-test": {
    title: "WebRTC Candidate Check",
    description: "Inspect local ICE candidates exposed by the browser without contacting an external STUN server."
  }
};

function sourceCopy(item, lang) {
  const sourcePath = path.join(ROOT, "dist", lang, sourceFileFor(item));
  const sourceHtml = fs.readFileSync(sourcePath, "utf8");
  const fragment = sourceFragmentFor(item);
  const content = fragment ? extractElementById(sourceHtml, fragment) : sourceHtml;
  const headings = [...content.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);
  const paragraphs = [...content.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)]
    .filter((match) => !/\beyebrow\b/.test(match[1]))
    .map((match) => stripTags(match[2]))
    .filter((value) => value.length >= 22 && !/^©/.test(value));
  let title = headings[0] || (lang === "ko" ? item.title : translate(item.title));
  let description = paragraphs[0] || (lang === "ko" ? item.description : translate(item.description));
  if (lang === "en" && item.category === "pip" && !/\bPIP\b/i.test(title)) title = `PIP ${title}`;
  if (lang === "en" && englishToolCopyOverrides[item.href]) {
    title = englishToolCopyOverrides[item.href].title || title;
    description = englishToolCopyOverrides[item.href].description || description;
  }
  const icon = lang === "en" && /[가-힣]/.test(item.icon)
    ? (title.match(/[A-Za-z0-9]+/g)?.[0] || "TOOL").slice(0, 4).toUpperCase()
    : item.icon;
  return { ...item, icon, title, description };
}

function localizedCatalog(catalog, lang) {
  return catalog.map((item) => sourceCopy(item, lang));
}

function writeEnglishToolCopyAsset(catalog) {
  const copy = Object.fromEntries(localizedCatalog(catalog, "en").map((item) => [
    item.href,
    {
      icon: item.icon,
      title: item.title,
      description: item.description
    }
  ]));
  const target = path.join(ROOT, "dist", "assets", "js", "tool-copy-en.js");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `window.SF_TOOL_COPY = ${JSON.stringify(copy, null, 2)};\n`);
}

function localizedToolHref(item, lang) {
  if (item.href.startsWith("../")) return `/${lang}/${item.href.slice(3)}`;
  return `/${lang}/tools/${item.href}`;
}

function relatedTools(item, catalog, lang) {
  return catalog
    .filter((candidate) => candidate.category === item.category && candidate.href !== item.href)
    .slice(0, 4)
    .map((candidate) => {
      return `<a class="related-tool-card" href="${localizedToolHref(candidate, lang)}"><span>${escapeHtml(candidate.icon)}</span><strong>${escapeHtml(candidate.title)}</strong><small>${escapeHtml(candidate.description)}</small><b aria-hidden="true">→</b></a>`;
    })
    .join("");
}

function isExternalTool(item) {
  return item.category === "finance"
    || /npm-package-info|world-holidays|server-timezone/.test(item.sourceHref);
}

function metaDescription(title, description, lang) {
  const suffix = lang === "ko"
    ? "사용 방법과 결과 확인 기준을 함께 제공하는 무료 브라우저 도구입니다."
    : "A free browser tool with focused usage guidance and result checks.";
  const value = `${title}: ${description} ${suffix}`.replace(/\s+/g, " ").trim();
  return value.length > 165 ? `${value.slice(0, 162).replace(/\s+\S*$/, "")}…` : value;
}

function renderToolPage({ rawItem, catalog, lang, sourceHtml, section }) {
  const text = ui[lang];
  const item = rawItem;
  const category = categoryCopy[lang][item.category] || categoryCopy[lang].developer;
  const canonical = `${SITE_URL}/${lang}/tools/${item.slug}`;
  const otherLang = lang === "ko" ? "en" : "ko";
  const controls = extractControls(section);
  const markup = prepareToolMarkup(section, item.slug);
  const scripts = extractScripts(sourceHtml);
  const sourcePage = sourcePageId(sourceHtml);
  const privacyAnswer = isExternalTool(item) ? text.externalPrivacy : text.localPrivacy;
  const description = metaDescription(item.title, item.description, lang);
  const adScript = AD_FREE_TOOL_SLUGS.has(item.slug)
    ? ""
    : `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>`;
  const faq = [
    { q: text.faqQ1(item.title), a: text.faqA1 },
    { q: text.faqQ2, a: privacyAnswer }
  ];
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: item.title,
    description,
    url: canonical,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any modern web browser",
    inLanguage: lang,
    isAccessibleForFree: true,
    author: { "@type": "Organization", name: "SolForge" },
    dateModified: "2026-07-28",
    offers: { "@type": "Offer", price: "0", priceCurrency: lang === "ko" ? "KRW" : "USD" }
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a }
    }))
  };

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(item.title)} - SolForge</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="author" content="SolForge">
    <meta name="theme-color" content="#f5f8fc">
    <link rel="canonical" href="${canonical}">
    <link rel="alternate" hreflang="ko" href="${SITE_URL}/ko/tools/${escapeHtml(item.slug)}">
    <link rel="alternate" hreflang="en" href="${SITE_URL}/en/tools/${escapeHtml(item.slug)}">
    <link rel="alternate" hreflang="x-default" href="${SITE_URL}/ko/tools/${escapeHtml(item.slug)}">
    <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
    ${adScript}
    <link rel="stylesheet" href="/assets/css/styles.css?v=20260728-independent-tools">
    <link rel="stylesheet" href="/assets/css/theme-saas.css?v=20260624-2">
    <link rel="stylesheet" href="/assets/css/theme-terminal.css?v=20260624-2">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="SolForge">
    <meta property="og:title" content="${escapeHtml(item.title)} - SolForge">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${canonical}">
    <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>
    <script type="application/ld+json">${JSON.stringify(faqSchema).replace(/</g, "\\u003c")}</script>
    <script>window.SF_I18N=${JSON.stringify({ lang, switchTo: otherLang, switchLabel: text.language }).replace(/</g, "\\u003c")};</script>
    <script src="/assets/js/i18n-dynamic.js"></script>
  </head>
  <body${sourcePage ? ` data-page="${escapeHtml(sourcePage)}"` : ""} data-page-tool="${escapeHtml(item.slug)}"${sourcePage === "pip-toolbox" ? " data-pip-toolbox" : ""}>
    <a class="skip-link" href="#main">${escapeHtml(text.skip)}</a>
    <div class="site-shell">
      <aside class="sidebar">
        <a class="brand" href="/${lang}/" aria-label="SolForge">
          <span class="brand-mark">SF</span>
          <span><strong>SolForge</strong><small>${escapeHtml(text.brandTagline)}</small></span>
        </a>
        <nav class="side-nav" aria-label="${escapeHtml(text.directory)}" data-solforge-nav>
          <a class="nav-link active" href="/${lang}/tools/all"><span class="nav-icon">ALL</span><span>${escapeHtml(text.directory)}</span></a>
        </nav>
        <div class="side-card"><strong>${escapeHtml(category.label)}</strong><span>${escapeHtml(item.description)}</span></div>
      </aside>
      <main class="content" id="main">
        <header class="topbar">
          <nav class="top-links" aria-label="${escapeHtml(text.about)}">
            <a href="/${lang}/tools/all">${escapeHtml(text.directory)}</a>
            <a href="/${lang}/features">${escapeHtml(text.features)}</a>
            <a href="/${lang}/about">${escapeHtml(text.about)}</a>
            <a href="/${lang}/contact">${escapeHtml(text.contact)}</a>
          </nav>
          <div class="topbar-controls">
            <a class="language-toggle" id="languageToggle" data-language-toggle href="/${otherLang}/tools/${escapeHtml(item.slug)}" aria-label="${escapeHtml(text.language)}">${lang === "ko" ? "🇺🇸" : "🇰🇷"}</a>
            <button class="theme-toggle" type="button" id="themeToggle" aria-pressed="false"><span class="theme-toggle-icon" aria-hidden="true"></span><span id="themeToggleLabel">Dark</span></button>
          </div>
        </header>

        <nav class="tool-breadcrumb" aria-label="Breadcrumb">
          <a href="/${lang}/">${lang === "ko" ? "홈" : "Home"}</a><span aria-hidden="true">/</span>
          <a href="/${lang}/tools/all">${escapeHtml(text.directory)}</a><span aria-hidden="true">/</span>
          <a href="/${lang}/tools/${escapeHtml(item.category)}">${escapeHtml(category.label)}</a><span aria-hidden="true">/</span>
          <span aria-current="page">${escapeHtml(item.title)}</span>
        </nav>

        <section class="independent-tool-hero">
          <div>
            <p class="eyebrow">${escapeHtml(category.label)}</p>
            <span class="hero-badge">${escapeHtml(text.badge)}</span>
            <h1>${escapeHtml(item.title)}</h1>
            <p class="hero-description">${escapeHtml(item.description)}</p>
          </div>
          <div class="independent-tool-facts" aria-label="${escapeHtml(text.source)}">
            <div><strong>01</strong><span>${escapeHtml(text.ready)}</span></div>
            <div><strong>02</strong><span>${escapeHtml(text.local)}</span></div>
            <div><strong>03</strong><span>${escapeHtml(text.source)}</span></div>
          </div>
        </section>

        <section class="independent-workspace" aria-labelledby="workspace-title">
          <div class="workspace-heading"><p class="eyebrow">${escapeHtml(text.direct)}</p><h2 id="workspace-title">${escapeHtml(text.workspace)}</h2></div>
          ${markup}
        </section>

        <section class="independent-guide" aria-labelledby="guide-title">
          <div class="section-heading">
            <div><p class="eyebrow">${escapeHtml(text.guideEyebrow)}</p><h2 id="guide-title">${escapeHtml(text.howTitle(item.title))}</h2><p>${escapeHtml(text.howIntro(item.title, item.description))}</p></div>
          </div>
          <div class="guide-step-grid">
            <article><span>1</span><p>${escapeHtml(text.firstStep(controls.labels))}</p></article>
            <article><span>2</span><p>${escapeHtml(text.secondStep(controls.buttons))}</p></article>
            <article><span>3</span><p>${escapeHtml(text.thirdStep)}</p></article>
          </div>
          <div class="policy-list independent-policy-list">
            <article class="article-card"><h3>${escapeHtml(text.useTitle)}</h3><p>${escapeHtml(category.use)} ${escapeHtml(item.description)}</p></article>
            <article class="article-card"><h3>${escapeHtml(text.limitTitle)}</h3><p>${escapeHtml(category.limit)}</p></article>
            <article class="article-card"><h3>${escapeHtml(text.privacyTitle)}</h3><p>${escapeHtml(privacyAnswer)}</p></article>
          </div>
          <div class="editorial-note"><span>${escapeHtml(text.author)}</span><p>${escapeHtml(text.reviewed)} <time datetime="2026-07-28">${escapeHtml(text.updated)}</time></p></div>
        </section>

        <section class="independent-faq" aria-labelledby="faq-title">
          <p class="eyebrow">${escapeHtml(text.faqEyebrow)}</p>
          <h2 id="faq-title">${escapeHtml(text.faqTitle(item.title))}</h2>
          <div class="faq-list">
            ${faq.map(({ q, a }) => `<details><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`).join("")}
          </div>
        </section>

        <section class="related-tools" aria-labelledby="related-title">
          <div class="directory-heading"><div><p class="eyebrow">${escapeHtml(text.category)}</p><h2 id="related-title">${escapeHtml(text.related)}</h2></div><a class="secondary-link" href="/${lang}/tools/all">${escapeHtml(text.allTools)}</a></div>
          <div class="related-tool-grid">${relatedTools(rawItem, catalog, lang)}</div>
        </section>

        <footer class="footer">
          <p>${escapeHtml(text.footer)}</p>
          <div><a href="/${lang}/about">${escapeHtml(text.about)}</a><a href="/${lang}/privacy">${escapeHtml(text.privacy)}</a><a href="/${lang}/contact">${escapeHtml(text.contact)}</a></div>
        </footer>
      </main>
    </div>
    <script src="/assets/js/tool-copy-en.js?v=20260803-categories"></script>
    <script src="/assets/js/tool-catalog.js?v=20260803-categories"></script>
    ${scripts}
  </body>
</html>
`;
}

function renderCategoryPage({ catalog, lang, categoryId }) {
  const text = ui[lang];
  const category = categoryCopy[lang][categoryId];
  const items = catalog.filter((item) => item.category === categoryId);
  const otherLang = lang === "ko" ? "en" : "ko";
  const canonical = `${SITE_URL}/${lang}/tools/${categoryId}`;
  const title = text.categoryList(category.label);
  const description = lang === "ko"
    ? `${category.label}의 ${items.length}개 기능을 카테고리와 하위 메뉴에서 고른 뒤 각각의 독립 페이지에서 실행하세요.`
    : `Choose from ${items.length} focused ${category.label.toLowerCase()} and open each feature on its own page.`;
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.title,
      url: `${SITE_URL}${localizedToolHref(item, lang)}`
    }))
  };
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: canonical,
    inLanguage: lang,
    isPartOf: { "@type": "WebSite", name: "SolForge", url: SITE_URL }
  };
  const cards = items.map((item) => (
    `<a class="catalog-card" href="${localizedToolHref(item, lang)}">`
      + `<span class="catalog-icon icon-${escapeHtml(categoryId)}">${escapeHtml(item.icon)}</span>`
      + '<span class="catalog-copy">'
      + `<span class="catalog-meta">${escapeHtml(category.label)}</span>`
      + `<strong>${escapeHtml(item.title)}</strong>`
      + `<small>${escapeHtml(item.description)}</small>`
      + '</span><span class="catalog-arrow" aria-hidden="true">→</span></a>'
  )).join("");

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} - SolForge</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="author" content="SolForge">
    <meta name="theme-color" content="#f5f8fc">
    <link rel="canonical" href="${canonical}">
    <link rel="alternate" hreflang="ko" href="${SITE_URL}/ko/tools/${categoryId}">
    <link rel="alternate" hreflang="en" href="${SITE_URL}/en/tools/${categoryId}">
    <link rel="alternate" hreflang="x-default" href="${SITE_URL}/ko/tools/${categoryId}">
    <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/assets/css/styles.css?v=20260803-categories">
    <link rel="stylesheet" href="/assets/css/theme-saas.css?v=20260624-2">
    <link rel="stylesheet" href="/assets/css/theme-terminal.css?v=20260624-2">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="SolForge">
    <meta property="og:title" content="${escapeHtml(title)} - SolForge">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${canonical}">
    <script type="application/ld+json">${JSON.stringify(collectionSchema).replace(/</g, "\\u003c")}</script>
    <script type="application/ld+json">${JSON.stringify(itemList).replace(/</g, "\\u003c")}</script>
    <script>window.SF_I18N=${JSON.stringify({ lang, switchTo: otherLang, switchLabel: text.language }).replace(/</g, "\\u003c")};</script>
    <script src="/assets/js/i18n-dynamic.js"></script>
  </head>
  <body data-page-category="${escapeHtml(categoryId)}">
    <a class="skip-link" href="#main">${escapeHtml(text.skip)}</a>
    <div class="site-shell">
      <aside class="sidebar">
        <a class="brand" href="/${lang}/" aria-label="SolForge">
          <span class="brand-mark">SF</span>
          <span><strong>SolForge</strong><small>${escapeHtml(text.brandTagline)}</small></span>
        </a>
        <nav class="side-nav" aria-label="${escapeHtml(text.directory)}" data-solforge-nav>
          <a class="nav-link active" href="/${lang}/tools/all"><span class="nav-icon">ALL</span><span>${escapeHtml(text.directory)}</span></a>
        </nav>
        <div class="side-card"><strong>${escapeHtml(category.label)}</strong><span>${escapeHtml(text.categoryGuide)}</span></div>
      </aside>
      <main class="content" id="main">
        <header class="topbar">
          <nav class="top-links" aria-label="${escapeHtml(text.about)}">
            <a href="/${lang}/tools/all">${escapeHtml(text.directory)}</a>
            <a href="/${lang}/features">${escapeHtml(text.features)}</a>
            <a href="/${lang}/about">${escapeHtml(text.about)}</a>
            <a href="/${lang}/contact">${escapeHtml(text.contact)}</a>
          </nav>
          <div class="topbar-controls">
            <a class="language-toggle" id="languageToggle" data-language-toggle href="/${otherLang}/tools/${categoryId}" aria-label="${escapeHtml(text.language)}">${lang === "ko" ? "🇺🇸" : "🇰🇷"}</a>
            <button class="theme-toggle" type="button" id="themeToggle" aria-pressed="false"><span class="theme-toggle-icon" aria-hidden="true"></span><span id="themeToggleLabel">Dark</span></button>
          </div>
        </header>

        <nav class="tool-breadcrumb" aria-label="Breadcrumb">
          <a href="/${lang}/">${lang === "ko" ? "홈" : "Home"}</a><span aria-hidden="true">/</span>
          <a href="/${lang}/tools/all">${escapeHtml(text.directory)}</a><span aria-hidden="true">/</span>
          <span aria-current="page">${escapeHtml(category.label)}</span>
        </nav>

        <section class="independent-tool-hero category-directory-hero">
          <div>
            <p class="eyebrow">${escapeHtml(text.categoryBadge)}</p>
            <span class="hero-badge">${escapeHtml(text.categoryCount(items.length))}</span>
            <h1>${escapeHtml(title)}</h1>
            <p class="hero-description">${escapeHtml(text.categoryLead(category.label, items.length))}</p>
          </div>
          <div class="independent-tool-facts" aria-label="${escapeHtml(text.categoryGuide)}">
            <div><strong>01</strong><span>${escapeHtml(text.categoryGuide)}</span></div>
            <div><strong>02</strong><span>${escapeHtml(text.ready)}</span></div>
            <div><strong>03</strong><span>${escapeHtml(text.local)}</span></div>
          </div>
        </section>

        <section class="directory-page category-directory" aria-labelledby="category-tools-title">
          <div class="directory-heading">
            <div><p class="eyebrow">${escapeHtml(category.label)}</p><h2 id="category-tools-title">${escapeHtml(text.chooseTool)}</h2><p>${escapeHtml(category.use)}</p></div>
            <strong class="tool-result-count">${escapeHtml(text.categoryCount(items.length))}</strong>
          </div>
          <div class="tool-catalog category-tool-grid">${cards}</div>
        </section>

        <section class="info-section category-directory-note">
          <div class="policy-list">
            <article class="article-card"><h2>${escapeHtml(text.limitTitle)}</h2><p>${escapeHtml(category.limit)}</p></article>
            <article class="article-card"><h2>${escapeHtml(text.privacyTitle)}</h2><p>${escapeHtml(text.localPrivacy)}</p></article>
          </div>
        </section>

        <footer class="footer">
          <p>${escapeHtml(text.footer)}</p>
          <div><a href="/${lang}/about">${escapeHtml(text.about)}</a><a href="/${lang}/privacy">${escapeHtml(text.privacy)}</a><a href="/${lang}/contact">${escapeHtml(text.contact)}</a></div>
        </footer>
      </main>
    </div>
    <script src="/assets/js/tool-copy-en.js?v=20260803-categories"></script>
    <script src="/assets/js/tool-catalog.js?v=20260803-categories"></script>
    <script src="/assets/js/app.js?v=20260803-categories"></script>
  </body>
</html>
`;
}

function buildToolPages(catalog) {
  const records = generatedToolRecords(catalog);
  for (const lang of LANGS) {
    const localized = localizedCatalog(catalog, lang);
    const localizedByHref = new Map(localized.map((item) => [item.href, item]));
    for (const record of records) {
      const rawItem = { ...localizedByHref.get(record.href), slug: record.slug, file: record.file };
      const sourceFile = sourceFileFor(rawItem);
      const fragment = sourceFragmentFor(rawItem);
      const sourcePath = path.join(ROOT, "dist", lang, sourceFile);
      if (!fs.existsSync(sourcePath)) throw new Error(`Missing tool source page: ${sourcePath}`);
      const sourceHtml = fs.readFileSync(sourcePath, "utf8");
      const section = extractElementById(sourceHtml, fragment);
      const output = renderToolPage({ rawItem, catalog: localized, lang, sourceHtml, section });
      const target = path.join(ROOT, "dist", lang, "tools", `${rawItem.slug}.html`);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, output);
    }
    for (const categoryRecord of generatedCategoryRecords(catalog)) {
      const output = renderCategoryPage({ catalog: localized, lang, categoryId: categoryRecord.id });
      const target = path.join(ROOT, "dist", lang, categoryRecord.file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, output);
    }
  }
  console.log(`Built ${records.length} focused tool pages and ${generatedCategoryRecords(catalog).length} category pages for ${LANGS.join(", ")}.`);
  return records;
}

module.exports = {
  AD_FREE_TOOL_SLUGS,
  buildToolPages,
  generatedCategoryRecords,
  generatedToolRecords,
  loadToolCatalog,
  writeEnglishToolCopyAsset
};
