(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const STORAGE_KEY = "solforge:mapleland-boss-timer:v1";
  const SLOT_COUNT = 5;
  const TICK_MS = 250;
  const ASSET = "/assets/img/mapleland/";
  const EXTERNAL_ICONS = {
    darkWyvern: "https://maplestory.io/api/GMS/62/mob/8810021/icon",
    papulatus: "https://maplestory.io/api/GMS/62/mob/8500002/icon",
    pianus: "https://maplestory.io/api/GMS/62/mob/8510000/icon",
    zakum: "https://maplestory.io/api/GMS/62/mob/8800002/icon",
    elNath: "https://maplestory.io/api/gms/62/map/211000000/icon",
    leafre: "https://maplestory.io/api/gms/62/map/240000000/icon",
    horntailNecklace: "https://maplestory.io/api/gms/200/item/1102154/icon",
    gloveAttack10: "https://maplestory.io/api/gms/200/item/2040804/icon",
    gloveAttack60: "https://maplestory.io/api/gms/200/item/2040805/icon",
    steely: "https://maplestory.io/api/gms/200/item/2070005/icon",
    ilbi: "https://maplestory.io/api/gms/200/item/2070006/icon",
    papulatusPiece: "https://maplestory.io/api/gms/62/item/4031179/icon",
    darkCrystal: "https://maplestory.io/api/gms/62/item/4001076/icon",
    oneHour: "https://maplestory.io/api/gms/200/item/4001126/icon",
    expCoupon: "https://maplestory.io/api/gms/200/item/2450046/icon",
    itemDrop: "https://maplestory.io/api/gms/62/item/4031138/icon",
    warriorPotion: "https://maplestory.io/api/gms/200/item/2002017/icon",
    cider: "https://maplestory.io/api/gms/200/item/2022002/icon",
    speedPill: "https://maplestory.io/api/gms/200/item/2002010/icon",
    petFood: "https://maplestory.io/api/gms/200/item/2120000/icon"
  };
  const ICONS = [
    ["holy_symbol.png", { ko: "홀리심볼", en: "Holy Symbol" }],
    ["magic_guard.png", { ko: "매직가드", en: "Magic Guard" }],
    ["invincible.png", { ko: "인빈서블", en: "Invincible" }],
    ["bahamute.png", { ko: "바하뮤트", en: "Bahamut" }],
    ["infinity.png", { ko: "인피니티", en: "Infinity" }],
    ["resurrection.png", { ko: "리저렉션", en: "Resurrection" }],
    ["roar.png", { ko: "드래곤로어", en: "Dragon Roar" }],
    ["hyper_body.png", { ko: "하이퍼바디", en: "Hyper Body" }],
    ["beholder.png", { ko: "비홀더", en: "Beholder" }],
    ["power_guard.png", { ko: "파워가드", en: "Power Guard" }],
    ["fury.png", { ko: "분노", en: "Rage" }],
    ["enrage.png", { ko: "인레이지", en: "Enrage" }],
    ["sanctuary.png", { ko: "생츄어리", en: "Sanctuary" }],
    ["silver_hawk.png", { ko: "실버호크", en: "Silver Hawk" }],
    ["sharp.png", { ko: "샤프아이즈", en: "Sharp Eyes" }],
    ["concentration.png", { ko: "집중", en: "Concentration" }],
    ["sniping.png", { ko: "스나이핑", en: "Sniping" }],
    ["hei.png", { ko: "헤이스트", en: "Haste" }],
    ["meso_up.png", { ko: "메소업", en: "Meso Up" }],
    ["shadow_partner.png", { ko: "쉐도우파트너", en: "Shadow Partner" }],
    ["spirit_javelin.png", { ko: "스피릿자벨린", en: "Spirit Javelin" }],
    ["meso_guard.png", { ko: "메소가드", en: "Meso Guard" }],
    ["smoke_shell.png", { ko: "연막탄", en: "Smoke Shell" }],
    ["assassination.png", { ko: "암살", en: "Assassination" }],
    ["booster.png", { ko: "부스터", en: "Booster" }],
    ["wind_booster.gif", { ko: "윈드부스터", en: "Wind Booster" }],
    ["time_leap.png", { ko: "타임리프", en: "Time Leap" }],
    ["maple_warrior.png", { ko: "메이플용사", en: "Maple Warrior" }],
    ["will.png", { ko: "용사의의지", en: "Hero's Will" }],
    ["trap.png", { ko: "두더지", en: "Trap" }],
    ["horntail.png", { ko: "혼테일", en: "Horntail" }],
    ["chaos_zakum.png", { ko: "자쿰", en: "Zakum" }],
    ["tomb.png", { ko: "사망", en: "Tomb" }],
    ["horntail_dispel.png", { ko: "혼테일 갈무리", en: "Horntail dispel" }],
    ["dispel.png", { ko: "버프해제", en: "Dispel" }],
    ["seduce.png", { ko: "유혹", en: "Seduce" }],
    ["attack_cancel.png", { ko: "공무", en: "Weapon cancel" }],
    ["attack_cancel_big.png", { ko: "보스 공무", en: "Boss weapon cancel" }],
    ["bung_cry.png", { ko: "알림", en: "Alert" }],
    [EXTERNAL_ICONS.papulatus, { ko: "파풀라투스", en: "Papulatus" }],
    [EXTERNAL_ICONS.pianus, { ko: "피아누스", en: "Pianus" }],
    [EXTERNAL_ICONS.zakum, { ko: "자쿰 본체", en: "Zakum body" }],
    [EXTERNAL_ICONS.horntailNecklace, { ko: "혼목", en: "Horntail necklace" }],
    [EXTERNAL_ICONS.gloveAttack10, { ko: "장공 10%", en: "Glove ATT 10%" }],
    [EXTERNAL_ICONS.gloveAttack60, { ko: "장공 60%", en: "Glove ATT 60%" }],
    [EXTERNAL_ICONS.steely, { ko: "토비 표창", en: "Steely" }],
    [EXTERNAL_ICONS.ilbi, { ko: "일비 표창", en: "Ilbi" }],
    [EXTERNAL_ICONS.papulatusPiece, { ko: "차원의 조각", en: "Dimension piece" }],
    [EXTERNAL_ICONS.darkCrystal, { ko: "어둠의 크리스탈", en: "Dark crystal" }]
  ];
  const PRESET_GROUPS = [
    { id: "magician", ko: "법사", en: "Magician" },
    { id: "warrior", ko: "전사", en: "Warrior" },
    { id: "bowman", ko: "궁수", en: "Bowman" },
    { id: "thief", ko: "도적", en: "Thief" },
    { id: "common", ko: "공통스킬", en: "Common Skills" },
    { id: "detail", ko: "미세조정", en: "Fine Tuning" },
    { id: "boss", ko: "보스", en: "Boss" },
    { id: "etc", ko: "기타", en: "Etc" }
  ];
  const PRESETS = [
    { id: "hs-100", group: "magician", icon: "holy_symbol.png", sampleKo: "홀리심볼 (1분40초)", titleKo: "홀리심볼", titleEn: "Holy Symbol", ms: 100000 },
    { id: "hs-105", group: "magician", icon: "holy_symbol.png", sampleKo: "홀리심볼 (1분45초)", titleKo: "홀리심볼", titleEn: "Holy Symbol", ms: 105000 },
    { id: "hs-110", group: "magician", icon: "holy_symbol.png", sampleKo: "홀리심볼 (1분50초)", titleKo: "홀리심볼", titleEn: "Holy Symbol", ms: 110000 },
    { id: "magic-guard", group: "magician", icon: "magic_guard.png", sampleKo: "매직가드", titleKo: "매직가드", titleEn: "Magic Guard", ms: 600000 },
    { id: "invincible", group: "magician", icon: "invincible.png", sampleKo: "인빈서블", titleKo: "인빈서블", titleEn: "Invincible", ms: 300000 },
    { id: "bahamute", group: "magician", icon: "bahamute.png", sampleKo: "바하뮤트", titleKo: "바하뮤트", titleEn: "Bahamut", ms: 160000 },
    { id: "infinity", group: "magician", icon: "infinity.png", sampleKo: "인피니티 쿨", titleKo: "인피니티", titleEn: "Infinity", ms: 600000 },
    { id: "resurrection-magician", group: "magician", icon: "resurrection.png", sampleKo: "리저렉션 쿨", titleKo: "리저렉션", titleEn: "Resurrection", ms: 1800000 },
    { id: "dragon-roar", group: "warrior", icon: "roar.png", sampleKo: "드래곤로어 (4분10초)", titleKo: "드래곤로어", titleEn: "Dragon Roar", ms: 250000 },
    { id: "hyper-body", group: "warrior", icon: "hyper_body.png", sampleKo: "하이퍼바디", titleKo: "하이퍼바디", titleEn: "Hyper Body", ms: 155000 },
    { id: "beholder", group: "warrior", icon: "beholder.png", sampleKo: "비홀더", titleKo: "비홀더", titleEn: "Beholder", ms: 1200000 },
    { id: "power-guard", group: "warrior", icon: "power_guard.png", sampleKo: "파워가드", titleKo: "파워가드", titleEn: "Power Guard", ms: 90000 },
    { id: "fury", group: "warrior", icon: "fury.png", sampleKo: "분노", titleKo: "분노", titleEn: "Rage", ms: 160000 },
    { id: "enrage", group: "warrior", icon: "enrage.png", sampleKo: "인레이지 쿨", titleKo: "인레이지", titleEn: "Enrage", ms: 360000 },
    { id: "sanctuary", group: "warrior", icon: "sanctuary.png", sampleKo: "생츄어리 쿨", titleKo: "생츄어리", titleEn: "Sanctuary", ms: 70000 },
    { id: "silver-hawk", group: "bowman", icon: "silver_hawk.png", sampleKo: "실버호크", titleKo: "실버호크", titleEn: "Silver Hawk", ms: 180000 },
    { id: "sharp-10", group: "bowman", icon: "sharp.png", sampleKo: "샤프아이즈 10", titleKo: "샤프아이즈", titleEn: "Sharp Eyes", ms: 100000 },
    { id: "sharp-20", group: "bowman", icon: "sharp.png", sampleKo: "샤프아이즈 20", titleKo: "샤프아이즈", titleEn: "Sharp Eyes", ms: 200000 },
    { id: "sharp-30", group: "bowman", icon: "sharp.png", sampleKo: "샤프아이즈 30", titleKo: "샤프아이즈", titleEn: "Sharp Eyes", ms: 300000 },
    { id: "concentration", group: "bowman", icon: "concentration.png", sampleKo: "집중 쿨", titleKo: "집중", titleEn: "Concentration", ms: 360000 },
    { id: "sniping", group: "bowman", icon: "sniping.png", sampleKo: "스나이핑 쿨", titleKo: "스나이핑", titleEn: "Sniping", ms: 10000 },
    { id: "haste", group: "thief", icon: "hei.png", sampleKo: "헤이스트", titleKo: "헤이스트", titleEn: "Haste", ms: 200000 },
    { id: "meso-up", group: "thief", icon: "meso_up.png", sampleKo: "메소업", titleKo: "메소업", titleEn: "Meso Up", ms: 120000 },
    { id: "shadow-partner", group: "thief", icon: "shadow_partner.png", sampleKo: "쉐도우파트너", titleKo: "쉐도우파트너", titleEn: "Shadow Partner", ms: 180000 },
    { id: "spirit-javelin-1", group: "thief", icon: "spirit_javelin.png", sampleKo: "스피릿자벨린 1", titleKo: "스피릿자벨린", titleEn: "Spirit Javelin", ms: 62000 },
    { id: "spirit-javelin-30", group: "thief", icon: "spirit_javelin.png", sampleKo: "스피릿자벨린 30", titleKo: "스피릿자벨린", titleEn: "Spirit Javelin", ms: 120000 },
    { id: "meso-guard", group: "thief", icon: "meso_guard.png", sampleKo: "메소가드", titleKo: "메소가드", titleEn: "Meso Guard", ms: 180000 },
    { id: "smoke-shell-cool", group: "thief", icon: "smoke_shell.png", sampleKo: "연막탄 쿨", titleKo: "연막탄 쿨", titleEn: "Smoke Shell cooldown", ms: 600000 },
    { id: "smoke-shell-duration", group: "thief", icon: "smoke_shell.png", sampleKo: "연막탄30 지속시간", titleKo: "연막탄 지속", titleEn: "Smoke Shell duration", ms: 60000 },
    { id: "assassination", group: "thief", icon: "assassination.png", sampleKo: "암살30 풀차징", titleKo: "암살 풀차징", titleEn: "Assassination full charge", ms: 12000 },
    { id: "booster", group: "common", icon: "booster.png", sampleKo: "부스터", titleKo: "부스터", titleEn: "Booster", ms: 200000 },
    { id: "wind-booster", group: "common", icon: "wind_booster.gif", sampleKo: "윈드부스터", titleKo: "윈드부스터", titleEn: "Wind Booster", ms: 300000 },
    { id: "maple-warrior-9", group: "common", icon: "maple_warrior.png", sampleKo: "메이플용사 9", titleKo: "메이플용사", titleEn: "Maple Warrior", ms: 270000 },
    { id: "maple-warrior-19", group: "common", icon: "maple_warrior.png", sampleKo: "메이플용사 19", titleKo: "메이플용사", titleEn: "Maple Warrior", ms: 570000 },
    { id: "will", group: "common", icon: "will.png", sampleKo: "용사의의지 1", titleKo: "용사의의지", titleEn: "Hero's Will", ms: 600000 },
    { id: "time-leap-1", group: "common", icon: "time_leap.png", sampleKo: "타임리프 1", titleKo: "타임리프", titleEn: "Time Leap", ms: 2700000 },
    { id: "time-leap-2", group: "common", icon: "time_leap.png", sampleKo: "타임리프 2", titleKo: "타임리프", titleEn: "Time Leap", ms: 2400000 },
    { id: "time-leap-3", group: "common", icon: "time_leap.png", sampleKo: "타임리프 3", titleKo: "타임리프", titleEn: "Time Leap", ms: 2100000 },
    { id: "time-leap-4", group: "common", icon: "time_leap.png", sampleKo: "타임리프 4", titleKo: "타임리프", titleEn: "Time Leap", ms: 1800000 },
    { id: "time-leap-5", group: "common", icon: "time_leap.png", sampleKo: "타임리프 5", titleKo: "타임리프", titleEn: "Time Leap", ms: 1500000 },
    { id: "mole-round", group: "detail", icon: "trap.png", sampleKo: "두더지 (원탁)", titleKo: "두더지", titleEn: "Mole", ms: 31230 },
    { id: "mole-leafre", group: "detail", icon: "trap.png", sampleKo: "두더지 (리프레)", titleKo: "두더지", titleEn: "Mole", ms: 31030 },
    { id: "elnath-spawn", group: "detail", icon: EXTERNAL_ICONS.elNath, sampleKo: "엘나스 젠 사이클", titleKo: "젠젠", titleEn: "El Nath spawn cycle", ms: 7000 },
    { id: "leafre-spawn", group: "detail", icon: EXTERNAL_ICONS.leafre, sampleKo: "리프레 젠 사이클", titleKo: "젠젠", titleEn: "Leafre spawn cycle", ms: 8000 },
    { id: "resurrection-boss", group: "boss", icon: "resurrection.png", sampleKo: "리저렉션 쿨", titleKo: "리저렉션", titleEn: "Resurrection", ms: 1800000 },
    { id: "death-dc", group: "boss", icon: "tomb.png", sampleKo: "사망 팅", titleKo: "사망 팅", titleEn: "Death reconnect", ms: 900000 },
    { id: "ht-five", group: "boss", icon: "horntail_dispel.png", sampleKo: "혼테일 - 5갈", titleKo: "혼테일 5갈", titleEn: "Horntail 5-min dispel", ms: 300000 },
    { id: "ht-three", group: "boss", icon: "horntail_dispel.png", sampleKo: "혼테일 - 3갈", titleKo: "혼테일 3갈", titleEn: "Horntail 3-min dispel", ms: 180000 },
    { id: "ht-buff-dispel", group: "boss", icon: "dispel.png", sampleKo: "혼테일 - 버프해제", titleKo: "혼테일 버프해제", titleEn: "Horntail buff dispel", ms: 180000 },
    { id: "ht-first-seduce", group: "boss", icon: "seduce.png", sampleKo: "혼테일 - 첫 개인유혹", titleKo: "첫 개인유혹", titleEn: "First seduce", ms: 120000 },
    { id: "ht-seduce", group: "boss", icon: "seduce.png", sampleKo: "혼테일 - 개인유혹", titleKo: "개인유혹", titleEn: "Seduce", ms: 180000 },
    { id: "ht-wyvern", group: "boss", icon: EXTERNAL_ICONS.darkWyvern, sampleKo: "혼테일 - 다크와이번", titleKo: "다크와이번", titleEn: "Dark Wyvern", ms: 50000 },
    { id: "ht-cancel", group: "boss", icon: "attack_cancel.png", sampleKo: "혼테일 - 공무", titleKo: "혼테일 공무", titleEn: "Horntail weapon cancel", ms: 45000 },
    { id: "zakum-cancel", group: "boss", icon: "attack_cancel_big.png", sampleKo: "자쿰 - 공무", titleKo: "자쿰 공무", titleEn: "Zakum weapon cancel", ms: 30000 },
    { id: "pianus-cancel", group: "boss", icon: "attack_cancel_big.png", sampleKo: "피아누스 - 공무", titleKo: "피아누스 공무", titleEn: "Pianus weapon cancel", ms: 38000 },
    { id: "one-hour", group: "etc", icon: EXTERNAL_ICONS.oneHour, sampleKo: "한타임", titleKo: "한타임", titleEn: "One hour", ms: 3600000 },
    { id: "exp-coupon-15", group: "etc", icon: EXTERNAL_ICONS.expCoupon, sampleKo: "경쿠 15분", titleKo: "경쿠 15분", titleEn: "EXP coupon 15 min", ms: 900000 },
    { id: "exp-coupon-30", group: "etc", icon: EXTERNAL_ICONS.expCoupon, sampleKo: "경쿠 30분", titleKo: "경쿠 30분", titleEn: "EXP coupon 30 min", ms: 1800000 },
    { id: "item-drop", group: "etc", icon: EXTERNAL_ICONS.itemDrop, sampleKo: "아이템 증발 (2분 50초)", titleKo: "아이템 증발", titleEn: "Item disappears", ms: 170000 },
    { id: "warrior-potion", group: "etc", icon: EXTERNAL_ICONS.warriorPotion, sampleKo: "전사의 비약", titleKo: "전사의 비약", titleEn: "Warrior potion", ms: 480000 },
    { id: "cider", group: "etc", icon: EXTERNAL_ICONS.cider, sampleKo: "사이다", titleKo: "사이다", titleEn: "Cider", ms: 300000 },
    { id: "speed-pill", group: "etc", icon: EXTERNAL_ICONS.speedPill, sampleKo: "속도 알약", titleKo: "속도 알약", titleEn: "Speed pill", ms: 600000 },
    { id: "warrior-potion-alchemy", group: "etc", icon: EXTERNAL_ICONS.warriorPotion, sampleKo: "전사의 비약 (+알케)", titleKo: "전사의 비약", titleEn: "Warrior potion (+Alchemy)", ms: 720000 },
    { id: "cider-alchemy", group: "etc", icon: EXTERNAL_ICONS.cider, sampleKo: "사이다 (+알케)", titleKo: "사이다", titleEn: "Cider (+Alchemy)", ms: 450000 },
    { id: "pet-food", group: "etc", icon: EXTERNAL_ICONS.petFood, sampleKo: "밥주세요", titleKo: "밥주세요", titleEn: "Pet food", ms: 1800000 }
  ];

  const root = $("[data-maple-boss-timer]");
  if (!root) return;

  const lang = document.documentElement.lang === "en" ? "en" : "ko";
  const text = {
    ko: {
      supported: "PIP 지원 브라우저입니다. PIP 띄우기를 누르면 작은 타이머 창이 열립니다.",
      unsupported: "이 브라우저는 Document PIP를 지원하지 않습니다. 기본 화면에서 타이머를 사용할 수 있습니다.",
      addFirst: "타이머를 추가해주세요.",
      start: "시작",
      pause: "정지",
      reset: "초기화",
      remove: "삭제",
      done: "완료",
      ready: "대기",
      running: "진행",
      emptyTitle: "타이머 이름을 입력하세요.",
      emptyTime: "1초 이상의 시간을 입력하세요.",
      slot: "슬롯",
      resetConfirm: "현재 슬롯의 타이머를 모두 삭제할까요?",
      pipOpen: "PIP 창을 열었습니다.",
      pipError: "PIP 창을 열 수 없습니다. 브라우저 지원 여부를 확인하세요.",
      copied: "프리셋을 불러왔습니다.",
      alarm: "타이머 종료"
    },
    en: {
      supported: "This browser supports PIP. Use Open PIP to launch a small timer window.",
      unsupported: "This browser does not support Document PIP. You can still use timers on this page.",
      addFirst: "Add a timer first.",
      start: "Start",
      pause: "Pause",
      reset: "Reset",
      remove: "Delete",
      done: "Done",
      ready: "Ready",
      running: "Running",
      emptyTitle: "Enter a timer name.",
      emptyTime: "Enter at least 1 second.",
      slot: "Slot",
      resetConfirm: "Delete every timer in the current slot?",
      pipOpen: "PIP window opened.",
      pipError: "Could not open the PIP window. Check browser support.",
      copied: "Preset loaded.",
      alarm: "Timer finished"
    }
  }[lang];

  const els = {
    presetGrid: $("#maplePresetGrid"),
    iconPicker: $("#mapleIconPicker"),
    iconTrigger: $("#mapleIconTrigger"),
    iconPreview: $("#mapleSelectedIconPreview"),
    iconName: $("#mapleSelectedIconName"),
    iconPopover: $("#mapleIconPopover"),
    iconClose: $("#closeMapleIconPicker"),
    icon: $("#mapleTimerIcon"),
    title: $("#mapleTimerTitle"),
    minutes: $("#mapleTimerMinutes"),
    seconds: $("#mapleTimerSeconds"),
    ms: $("#mapleTimerMs"),
    tts: $("#mapleTtsEnabled"),
    beep: $("#mapleBeepEnabled"),
    add: $("#addMapleTimer"),
    preview: $("#previewMapleAlarm"),
    pip: $("#openMaplePip"),
    pipSupport: $("#maplePipSupport"),
    slots: $("#mapleSlotTabs"),
    list: $("#mapleTimerList"),
    resetSlot: $("#resetMapleSlot"),
    toast: $("#mapleTimerToast")
  };

  const state = loadState();
  let tickHandle = null;
  let pipWindow = null;
  let audioContext = null;
  let activePresetGroup = PRESET_GROUPS[0].id;

  init();

  function init() {
    renderPresetGrid();
    renderIconOptions();
    restoreDraft();
    renderPipSupport();
    renderAll();
    bindEvents();
    tickHandle = window.setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("beforeunload", () => {
      if (pipWindow && !pipWindow.closed) pipWindow.close();
      window.clearInterval(tickHandle);
    });
  }

  function bindEvents() {
    els.add.addEventListener("click", addTimer);
    els.preview.addEventListener("click", () => playAlarm(els.title.value.trim() || text.alarm));
    els.pip.addEventListener("click", openPip);
    els.iconTrigger.addEventListener("click", openIconPicker);
    els.iconClose.addEventListener("click", closeIconPicker);
    els.iconPopover.addEventListener("mousedown", (event) => {
      if (event.target === els.iconPopover) closeIconPicker();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !els.iconPopover.hidden) closeIconPicker();
    });
    els.resetSlot.addEventListener("click", () => {
      if (!window.confirm(text.resetConfirm)) return;
      currentSlot().timers = [];
      saveState();
      renderAll();
    });
    $$("[data-adjust-ms]", root).forEach((button) => {
      button.addEventListener("click", () => adjustTime(Number(button.dataset.adjustMs)));
    });
    [els.icon, els.title, els.minutes, els.seconds, els.ms, els.tts, els.beep].forEach((input) => {
      input.addEventListener("input", saveDraft);
      input.addEventListener("change", saveDraft);
    });
  }

  function renderPresetGrid() {
    const groups = PRESET_GROUPS.map((group) => `
      <button type="button" class="${group.id === activePresetGroup ? "active" : ""}" data-preset-group="${group.id}">
        ${escapeHtml(groupLabel(group))}
      </button>
    `).join("");
    const presets = PRESETS.filter((preset) => preset.group === activePresetGroup);
    els.presetGrid.innerHTML = `
      <div class="maple-preset-tabs">${groups}</div>
      <div class="maple-preset-list">
        ${presets.map((preset) => `
      <button type="button" class="maple-preset-card" data-preset-id="${preset.id}">
        <img src="${escapeAttr(iconUrl(preset.icon))}" alt="" loading="lazy">
        <span>
          <strong>${escapeHtml(sampleLabel(preset))}</strong>
          <small>${escapeHtml(label(preset))} · ${formatDuration(preset.ms)}</small>
        </span>
      </button>
        `).join("")}
      </div>
    `;
    $$("[data-preset-group]", els.presetGrid).forEach((button) => {
      button.addEventListener("click", () => {
        activePresetGroup = button.dataset.presetGroup;
        renderPresetGrid();
      });
    });
    $$("[data-preset-id]", els.presetGrid).forEach((button) => {
      button.addEventListener("click", () => {
        const preset = PRESETS.find((item) => item.id === button.dataset.presetId);
        if (preset) applyPreset(preset, true);
      });
    });
  }

  function renderIconOptions() {
    const options = uniqueIconOptions();
    els.iconPicker.innerHTML = options.map(([file, label]) => `
      <button type="button" class="${file === els.icon.value ? "active" : ""}" data-icon-value="${escapeAttr(file)}" title="${escapeAttr(label)}" aria-label="${escapeAttr(label)}" aria-selected="${file === els.icon.value ? "true" : "false"}">
        <img src="${escapeAttr(iconUrl(file))}" alt="" loading="lazy">
      </button>
    `).join("");
    $$("[data-icon-value]", els.iconPicker).forEach((button) => {
      button.addEventListener("click", () => {
        setIcon(button.dataset.iconValue);
        saveDraft();
        closeIconPicker();
      });
    });
  }

  function openIconPicker() {
    els.iconPopover.hidden = false;
    els.iconTrigger.setAttribute("aria-expanded", "true");
    const active = $("[data-icon-value].active", els.iconPicker) || $("[data-icon-value]", els.iconPicker);
    if (active) active.focus();
  }

  function closeIconPicker() {
    els.iconPopover.hidden = true;
    els.iconTrigger.setAttribute("aria-expanded", "false");
    els.iconTrigger.focus();
  }

  function renderPipSupport() {
    const supported = "documentPictureInPicture" in window;
    els.pipSupport.className = `maple-support-note ${supported ? "is-supported" : "is-unsupported"}`;
    els.pipSupport.textContent = supported ? text.supported : text.unsupported;
    els.pip.disabled = !supported;
  }

  function renderAll() {
    renderSlots();
    renderTimerList(document, els.list, false);
    if (pipWindow && !pipWindow.closed) {
      const list = pipWindow.document.getElementById("pipTimerList");
      if (list) renderTimerList(pipWindow.document, list, true);
      const title = pipWindow.document.getElementById("pipSlotTitle");
      if (title) title.textContent = currentSlot().title;
    }
  }

  function renderSlots() {
    els.slots.innerHTML = state.slots.map((slot, index) => `
      <button type="button" role="tab" class="${index === state.activeSlot ? "active" : ""}" data-slot-index="${index}" aria-selected="${index === state.activeSlot}">
        ${escapeHtml(slot.title)}
      </button>
    `).join("");
    $$("[data-slot-index]", els.slots).forEach((button) => {
      button.addEventListener("click", () => {
        state.activeSlot = Number(button.dataset.slotIndex);
        saveState();
        renderAll();
      });
    });
  }

  function renderTimerList(doc, container, compact) {
    const timers = currentSlot().timers;
    if (!timers.length) {
      container.innerHTML = `<div class="maple-empty-state">${escapeHtml(text.addFirst)}</div>`;
      return;
    }
    container.innerHTML = timers.map((timer) => {
      const remaining = remainingMs(timer);
      const percent = timer.duration > 0 ? Math.max(0, Math.min(100, (remaining / timer.duration) * 100)) : 0;
      const status = remaining <= 0 ? text.done : timer.running ? text.running : text.ready;
      return `
        <article class="maple-timer-card ${remaining <= 0 ? "is-done" : ""}">
        <div class="maple-timer-icon"><img src="${escapeAttr(iconUrl(timer.icon))}" alt=""></div>
          <div class="maple-timer-main">
            <div class="maple-timer-head">
              <strong>${escapeHtml(timer.title)}</strong>
              <span>${escapeHtml(status)}</span>
            </div>
            <div class="maple-time">${formatClock(remaining)}</div>
            <div class="maple-progress"><span style="width:${percent.toFixed(2)}%"></span></div>
          </div>
          <div class="maple-timer-actions">
            <button type="button" data-action="toggle" data-id="${timer.id}">${timer.running ? text.pause : text.start}</button>
            <button type="button" data-action="reset" data-id="${timer.id}">${text.reset}</button>
            ${compact ? "" : `<button type="button" data-action="remove" data-id="${timer.id}">${text.remove}</button>`}
          </div>
        </article>
      `;
    }).join("");
    $$("[data-action]", container).forEach((button) => {
      button.addEventListener("click", () => handleTimerAction(button.dataset.id, button.dataset.action));
    });
  }

  async function openPip() {
    if (!("documentPictureInPicture" in window)) return;
    try {
      if (pipWindow && !pipWindow.closed) {
        pipWindow.focus();
        return;
      }
      pipWindow = await window.documentPictureInPicture.requestWindow({ width: 390, height: 620 });
      pipWindow.document.title = lang === "en" ? "Mapleland Boss Timer" : "메이플랜드 보스타이머";
      pipWindow.document.body.innerHTML = `
        <main class="pip-maple-shell">
          <header><strong id="pipSlotTitle">${escapeHtml(currentSlot().title)}</strong><span>PIP</span></header>
          <section id="pipTimerList" class="maple-timer-list pip-list"></section>
        </main>
      `;
      const style = pipWindow.document.createElement("style");
      style.textContent = pipStyles();
      pipWindow.document.head.appendChild(style);
      pipWindow.addEventListener("pagehide", () => {
        pipWindow = null;
      });
      renderAll();
      showToast(text.pipOpen);
    } catch (error) {
      console.warn("[SolForge] PIP failed", error);
      showToast(text.pipError);
    }
  }

  function addTimer() {
    const title = els.title.value.trim();
    const duration = readDuration();
    if (!title) {
      showToast(text.emptyTitle);
      els.title.focus();
      return;
    }
    if (duration < 1000) {
      showToast(text.emptyTime);
      els.seconds.focus();
      return;
    }
    currentSlot().timers.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      icon: els.icon.value,
      duration,
      remaining: duration,
      running: false,
      endsAt: null,
      tts: els.tts.checked,
      beep: els.beep.checked,
      alerted: false
    });
    saveState();
    renderAll();
  }

  function handleTimerAction(id, action) {
    const timer = currentSlot().timers.find((item) => item.id === id);
    if (!timer) return;
    if (action === "toggle") {
      const remaining = remainingMs(timer);
      if (remaining <= 0) {
        timer.remaining = timer.duration;
        timer.alerted = false;
      }
      timer.running = !timer.running;
      timer.endsAt = timer.running ? Date.now() + remainingMs(timer) : null;
      timer.remaining = remainingMs(timer);
    }
    if (action === "reset") {
      timer.running = false;
      timer.endsAt = null;
      timer.remaining = timer.duration;
      timer.alerted = false;
    }
    if (action === "remove") {
      currentSlot().timers = currentSlot().timers.filter((item) => item.id !== id);
    }
    saveState();
    renderAll();
  }

  function tick() {
    let changed = false;
    state.slots.flatMap((slot) => slot.timers).forEach((timer) => {
      if (!timer.running) return;
      const remaining = remainingMs(timer);
      timer.remaining = remaining;
      if (remaining <= 0) {
        timer.running = false;
        timer.endsAt = null;
        timer.remaining = 0;
        if (!timer.alerted) {
          timer.alerted = true;
          playAlarm(timer.title, timer);
        }
      }
      changed = true;
    });
    if (changed) {
      saveState();
      renderAll();
    }
  }

  function playAlarm(title, timer = {}) {
    const hasBeepSetting = Object.prototype.hasOwnProperty.call(timer, "beep");
    const hasTtsSetting = Object.prototype.hasOwnProperty.call(timer, "tts");
    const beepEnabled = hasBeepSetting ? timer.beep : els.beep.checked;
    const ttsEnabled = hasTtsSetting ? timer.tts : els.tts.checked;
    if (beepEnabled) playBeep();
    if (ttsEnabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`${title} ${text.alarm}`);
      utterance.lang = lang === "en" ? "en-US" : "ko-KR";
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  }

  function playBeep() {
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const now = audioContext.currentTime;
      [0, 0.18, 0.36].forEach((offset) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12);
        osc.connect(gain).connect(audioContext.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.14);
      });
    } catch (_error) {
      // Audio is optional; TTS or visual status still works.
    }
  }

  function applyPreset(preset, notify) {
    setIcon(preset.icon);
    els.title.value = label(preset);
    writeDuration(preset.ms);
    if (notify) showToast(text.copied);
    saveDraft();
  }

  function restoreDraft() {
    const draft = state.draft;
    if (!draft) {
      applyPreset(PRESETS[0], false);
      return;
    }
    setIcon(isAllowedIcon(draft.icon) ? draft.icon : PRESETS[0].icon);
    els.title.value = String(draft.title || label(PRESETS[0])).slice(0, 32);
    writeDuration(clamp(Number(draft.duration) || PRESETS[0].ms, 0, 999 * 60000 + 59000));
    els.tts.checked = draft.tts !== false;
    els.beep.checked = draft.beep !== false;
  }

  function adjustTime(delta) {
    writeDuration(Math.max(0, readDuration() + delta));
    saveDraft();
  }

  function readDuration() {
    const minutes = clamp(Number(els.minutes.value) || 0, 0, 999);
    const seconds = clamp(Number(els.seconds.value) || 0, 0, 59);
    const milliseconds = clamp(Number(els.ms.value) || 0, 0, 999);
    return (minutes * 60 + seconds) * 1000 + milliseconds;
  }

  function writeDuration(ms) {
    const total = Math.max(0, Math.floor(Number(ms) || 0));
    els.minutes.value = String(Math.floor(total / 60000));
    els.seconds.value = String(Math.floor((total % 60000) / 1000));
    els.ms.value = String(total % 1000);
  }

  function saveDraft() {
    state.draft = {
      icon: els.icon.value,
      title: els.title.value,
      duration: readDuration(),
      tts: els.tts.checked,
      beep: els.beep.checked
    };
    saveState();
  }

  function loadState() {
    const fallback = {
      activeSlot: 0,
      draft: null,
      slots: Array.from({ length: SLOT_COUNT }, (_item, index) => ({ title: `${text.slot} ${index + 1}`, timers: [] }))
    };
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || !Array.isArray(parsed.slots)) return fallback;
      const slots = fallback.slots.map((slot, index) => ({
        title: parsed.slots[index]?.title || slot.title,
        timers: Array.isArray(parsed.slots[index]?.timers) ? parsed.slots[index].timers.map(sanitizeTimer).filter(Boolean) : []
      }));
      return {
        activeSlot: clamp(Number(parsed.activeSlot) || 0, 0, SLOT_COUNT - 1),
        draft: parsed.draft || null,
        slots
      };
    } catch (_error) {
      return fallback;
    }
  }

  function sanitizeTimer(timer) {
    if (!timer || typeof timer !== "object") return null;
    const duration = clamp(Number(timer.duration) || 0, 1000, 999 * 60000);
    return {
      id: String(timer.id || `${Date.now()}-${Math.random()}`),
      title: String(timer.title || "Timer").slice(0, 32),
      icon: isAllowedIcon(timer.icon) ? timer.icon : PRESETS[0].icon,
      duration,
      remaining: clamp(Number(timer.remaining) || duration, 0, duration),
      running: Boolean(timer.running),
      endsAt: Number(timer.endsAt) || null,
      tts: timer.tts !== false,
      beep: timer.beep !== false,
      alerted: Boolean(timer.alerted)
    };
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_error) {
      // The timer remains usable for the current page session.
    }
  }

  function currentSlot() {
    return state.slots[state.activeSlot] || state.slots[0];
  }

  function remainingMs(timer) {
    if (timer.running && timer.endsAt) return Math.max(0, timer.endsAt - Date.now());
    return Math.max(0, timer.remaining || 0);
  }

  function label(preset) {
    return lang === "en" ? preset.titleEn : preset.titleKo;
  }

  function sampleLabel(preset) {
    if (lang === "en") return preset.sampleEn || preset.titleEn || preset.sampleKo || preset.titleKo;
    return preset.sampleKo || preset.titleKo;
  }

  function groupLabel(group) {
    return lang === "en" ? group.en : group.ko;
  }

  function uniqueIconOptions() {
    const options = new Map(ICONS);
    PRESETS.forEach((preset) => {
      if (!options.has(preset.icon)) options.set(preset.icon, sampleLabel(preset));
    });
    return Array.from(options.entries()).map(([file, label]) => [file, iconOptionLabel(label)]);
  }

  function isAllowedIcon(value) {
    return uniqueIconOptions().some(([file]) => file === value);
  }

  function setIcon(value) {
    els.icon.value = isAllowedIcon(value) ? value : PRESETS[0].icon;
    els.iconPreview.src = iconUrl(els.icon.value);
    els.iconName.textContent = iconLabel(els.icon.value);
    $$("[data-icon-value]", els.iconPicker).forEach((button) => {
      const active = button.dataset.iconValue === els.icon.value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function iconLabel(value) {
    const found = uniqueIconOptions().find(([file]) => file === value);
    return found ? found[1] : iconOptionLabel(ICONS[0][1]);
  }

  function iconOptionLabel(labelValue) {
    if (labelValue && typeof labelValue === "object") return lang === "en" ? labelValue.en : labelValue.ko;
    return String(labelValue || "");
  }

  function iconUrl(value) {
    const icon = String(value || "");
    if (/^https?:\/\//.test(icon)) return icon;
    if (icon.startsWith("/")) return icon;
    return `${ASSET}${icon}`;
  }

  function formatDuration(ms) {
    const total = Math.max(0, Math.floor(Number(ms) || 0));
    const minutes = Math.floor(total / 60000);
    const seconds = Math.floor((total % 60000) / 1000);
    const milliseconds = total % 1000;
    const secondText = milliseconds ? `${seconds}.${String(milliseconds).padStart(3, "0").replace(/0+$/, "")}s` : `${seconds}s`;
    if (minutes && (seconds || milliseconds)) return `${minutes}m ${secondText}`;
    if (minutes) return `${minutes}m`;
    return secondText;
  }

  function formatClock(ms) {
    const safe = Math.max(0, Number(ms) || 0);
    if (safe < 60000 && safe % 1000 !== 0) return `${(Math.ceil(safe / 100) / 10).toFixed(1)}s`;
    const total = Math.max(0, Math.ceil(safe / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 1800);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function pipStyles() {
    return `
      *{box-sizing:border-box}body{margin:0;background:#111827;color:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .pip-maple-shell{min-height:100vh;padding:12px;background:linear-gradient(180deg,#111827,#020617)}
      header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid rgba(148,163,184,.25)}
      header strong{font-size:15px}header span{font-size:11px;color:#93c5fd;font-weight:900}
      .maple-timer-list{display:grid;gap:10px}.maple-empty-state{padding:28px 12px;border:1px dashed rgba(148,163,184,.35);border-radius:10px;color:#94a3b8;text-align:center}
      .maple-timer-card{display:grid;grid-template-columns:34px minmax(0,1fr);gap:9px;padding:10px;border:1px solid rgba(148,163,184,.24);border-radius:12px;background:rgba(15,23,42,.88)}
      .maple-timer-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:8px;background:rgba(30,41,59,.9)}
      .maple-timer-icon img{max-width:26px;max-height:26px}.maple-timer-main{min-width:0}.maple-timer-head{display:flex;justify-content:space-between;gap:8px}
      .maple-timer-head strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.maple-timer-head span{color:#93c5fd;font-size:11px;font-weight:800}
      .maple-time{font-size:30px;font-weight:950;line-height:1.1;margin:4px 0}.maple-progress{height:6px;overflow:hidden;border-radius:999px;background:rgba(51,65,85,.8)}
      .maple-progress span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#22c55e,#38bdf8)}
      .maple-timer-actions{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:6px}.maple-timer-actions button{height:30px;border:1px solid rgba(148,163,184,.28);border-radius:8px;background:#1e293b;color:#e2e8f0;font-weight:800;cursor:pointer}
      .is-done{border-color:rgba(248,113,113,.45)}.is-done .maple-time{color:#fca5a5}
    `;
  }
})();
