(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const root = $("[data-zeus-boss-timer]");
  if (!root) return;

  const lang = document.documentElement.lang === "en" ? "en" : "ko";
  const STORAGE_KEY = "solforge:zeus-boss-timer:v1";
  const EVENTS = [
    { id: "argos", kind: "world", days: [1], hour: 21, minute: 0, title: { ko: "아르고스", en: "Argos" }, level: { ko: "Lv.65", en: "Lv.65" }, place: { ko: "자하브", en: "Zahab" }, detail: { ko: "자하브 월드보스", en: "Zahab world boss" }, schedule: { ko: "매주 월요일 21:00", en: "Every Monday 21:00" } },
    { id: "arachne", kind: "world", days: [3], hour: 21, minute: 0, title: { ko: "아라크네", en: "Arachne" }, level: { ko: "Lv.50", en: "Lv.50" }, place: { ko: "테살리아", en: "Thessalia" }, detail: { ko: "테살리아 월드보스", en: "Thessalia world boss" }, schedule: { ko: "매주 수요일 21:00", en: "Every Wednesday 21:00" } },
    { id: "medeia", kind: "world", days: [2], hour: 21, minute: 0, title: { ko: "메데이아", en: "Medea" }, level: { ko: "Lv.45", en: "Lv.45" }, place: { ko: "[인터] 타르타로스 2계 낙인", en: "[Inter] Tartarus 2nd Circle: Stigma" }, detail: { ko: "타르타로스 월드보스", en: "Tartarus world boss" }, schedule: { ko: "매주 화요일 21:00", en: "Every Tuesday 21:00" } },
    { id: "chimera", kind: "world", days: [6], hour: 21, minute: 0, title: { ko: "키메라", en: "Chimera" }, level: { ko: "Lv.60", en: "Lv.60" }, place: { ko: "[인터] 타르타로스 4계 업보", en: "[Inter] Tartarus 4th Circle: Karma" }, detail: { ko: "타르타로스 월드보스", en: "Tartarus world boss" }, schedule: { ko: "매주 토요일 21:00", en: "Every Saturday 21:00" } },
    { id: "kerberos", kind: "world", days: [5], hour: 21, minute: 0, title: { ko: "케르베로스", en: "Kerberos" }, level: { ko: "Lv.75", en: "Lv.75" }, place: { ko: "[인터] 타르타로스 5계 심판", en: "[Inter] Tartarus 5th Circle: Judgment" }, detail: { ko: "타르타로스 월드보스", en: "Tartarus world boss" }, schedule: { ko: "매주 금요일 21:00", en: "Every Friday 21:00" } },
    { id: "invasion-boss", kind: "invasion", days: [1, 4], hour: 21, minute: 0, title: { ko: "침공 보스", en: "Invasion Boss" }, level: { ko: "레벨 미표기", en: "Level not shown" }, place: { ko: "테살리아", en: "Thessalia" }, detail: { ko: "콘텐츠 현황판 표기", en: "As listed on the content board" }, schedule: { ko: "매주 월·목요일 21:00", en: "Every Monday and Thursday at 21:00" } },
    { id: "rift-noon", kind: "invasion", days: [0, 1, 2, 3, 4, 5, 6], hour: 12, minute: 0, title: { ko: "심연의 틈", en: "Rift of the Abyss" }, level: { ko: "침공 콘텐츠", en: "Invasion content" }, place: { ko: "발생 지역 포탈", en: "Portal in the affected region" }, detail: { ko: "정오 침공", en: "Noon invasion" }, schedule: { ko: "매일 12:00", en: "Daily at 12:00" } },
    { id: "rift-evening", kind: "invasion", days: [0, 1, 2, 3, 4, 5, 6], hour: 20, minute: 0, title: { ko: "심연의 틈", en: "Rift of the Abyss" }, level: { ko: "침공 콘텐츠", en: "Invasion content" }, place: { ko: "발생 지역 포탈", en: "Portal in the affected region" }, detail: { ko: "저녁 침공", en: "Evening invasion" }, schedule: { ko: "매일 20:00", en: "Daily at 20:00" } }
  ];
  const RESPAWN_BOSSES = [
    { id: "trason", title: { ko: "트라손", en: "Trason" }, level: "Lv.40", place: { ko: "테살리아 · 고대 신전 유적지", en: "Thessalia · Ancient Temple Ruins" }, detail: { ko: "마지막 처치 시각부터 8시간", en: "Eight hours after the last defeat" } },
    { id: "iocanthos", title: { ko: "이오칸토스", en: "Iocanthos" }, level: "Lv.45", place: { ko: "테살리아 · 아르브리아스 폐허", en: "Thessalia · Arborias Ruins" }, detail: { ko: "마지막 처치 시각부터 8시간", en: "Eight hours after the last defeat" } },
    { id: "kinyrauri", title: { ko: "키니라우리", en: "Kinyrauri" }, level: "Lv.45", place: { ko: "테살리아 · 금지된 숲", en: "Thessalia · Forbidden Forest" }, detail: { ko: "마지막 처치 시각부터 8시간", en: "Eight hours after the last defeat" } },
    { id: "alastor", title: { ko: "알라스토르", en: "Alastor" }, level: "Lv.55", place: { ko: "자하브 · 무법자의 길목", en: "Zahab · Outlaw's Path" }, detail: { ko: "마지막 처치 시각부터 8시간", en: "Eight hours after the last defeat" } },
    { id: "vedix", title: { ko: "베딕스", en: "Vedix" }, level: "Lv.60", place: { ko: "자하브 · 공허의 제단", en: "Zahab · Altar of the Void" }, detail: { ko: "마지막 처치 시각부터 8시간", en: "Eight hours after the last defeat" } },
    { id: "gortis", title: { ko: "고르티스", en: "Gortis" }, level: "Lv.60", place: { ko: "자하브 · 황금 리라 부락", en: "Zahab · Golden Lyra Village" }, detail: { ko: "마지막 처치 시각부터 8시간", en: "Eight hours after the last defeat" } },
    { id: "triphos", title: { ko: "트리포스", en: "Triphos" }, level: "Lv.65", place: { ko: "자하브 · 가시 덤불 지대", en: "Zahab · Thornbush Zone" }, detail: { ko: "마지막 처치 시각부터 8시간", en: "Eight hours after the last defeat" } },
    { id: "sealed-amorphos", title: { ko: "봉인된 아모르포스", en: "Sealed Amorphos" }, level: "Lv.40", place: { ko: "[인터] 타르타로스 1계 유폐 · 유폐의 둥지", en: "[Inter] Tartarus 1st Circle: Imprisonment · Imprisonment Nest" }, detail: { ko: "마지막 처치 시각부터 8시간", en: "Eight hours after the last defeat" } }
  ];
  const BOSS_DIRECTORY = [
    { id: "medeia", title: { ko: "메데이아", en: "Medeia" }, level: "Lv.45", place: { ko: "[인터] 타르타로스 2계 낙인 · 배신의 심연굴", en: "[Inter] Tartarus 2nd Circle: Stigma · Betrayer's Abyss" }, image: "medeia" },
    { id: "arachne", title: { ko: "아라크네", en: "Arachne" }, level: "Lv.50", place: { ko: "테살리아", en: "Thessalia" }, image: "arachne" },
    { id: "chimera", title: { ko: "키메라", en: "Chimera" }, level: "Lv.60", place: { ko: "[인터] 타르타로스 4계 업보", en: "[Inter] Tartarus 4th Circle: Karma" }, image: "chimera" },
    { id: "kerberos", title: { ko: "케르베로스", en: "Kerberos" }, level: "Lv.75", place: { ko: "[인터] 타르타로스 5계 심판", en: "[Inter] Tartarus 5th Circle: Judgment" }, image: "kerberos" },
    { id: "argos", title: { ko: "아르고스", en: "Argos" }, level: "Lv.65", place: { ko: "자하브", en: "Zahab" }, image: "argos" },
    { id: "invasion-boss", title: { ko: "침공 보스", en: "Invasion Boss" }, level: { ko: "레벨 미표기", en: "Level not shown" }, place: { ko: "테살리아 · 월요일·목요일 21:00", en: "Thessalia · Monday and Thursday at 21:00" }, image: "invasion-boss" },
    { id: "krisopagos", title: { ko: "크리소파고스", en: "Krisopagos" }, level: "Lv.35", place: { ko: "테살리아 · 테살리아 평원", en: "Thessalia · Thessalia Plains" }, image: "krisopagos" },
    { id: "amorphos", title: { ko: "아모르포스", en: "Amorphos" }, level: "Lv.35", place: { ko: "테살리아 · 침식된 경작지", en: "Thessalia · Corrupted Farmland" }, image: "amorphos" },
    { id: "trason", title: { ko: "트라손", en: "Trason" }, level: "Lv.40", place: { ko: "테살리아 · 고대 신전 유적지", en: "Thessalia · Ancient Temple Ruins" }, image: "trason" },
    { id: "iocanthos", title: { ko: "이오칸토스", en: "Iocanthos" }, level: "Lv.45", place: { ko: "테살리아 · 아르브리아스 폐허", en: "Thessalia · Arborias Ruins" }, image: "iocanthos" },
    { id: "kinyrauri", title: { ko: "키니라우리", en: "Kinyrauri" }, level: "Lv.45", place: { ko: "테살리아 · 금지된 숲", en: "Thessalia · Forbidden Forest" }, image: "kinyrauri" },
    { id: "alastor", title: { ko: "알라스토르", en: "Alastor" }, level: "Lv.55", place: { ko: "자하브 · 무법자의 길목", en: "Zahab · Outlaw's Path" }, image: "alastor" },
    { id: "vedix", title: { ko: "베딕스", en: "Vedix" }, level: "Lv.60", place: { ko: "자하브 · 공허의 제단", en: "Zahab · Altar of the Void" }, image: "vedix" },
    { id: "gortis", title: { ko: "고르티스", en: "Gortis" }, level: "Lv.60", place: { ko: "자하브 · 황금 리라 부락", en: "Zahab · Golden Lyra Village" }, image: "gortis" },
    { id: "triphos", title: { ko: "트리포스", en: "Triphos" }, level: "Lv.65", place: { ko: "자하브 · 가시 덤불 지대", en: "Zahab · Thornbush Zone" }, image: "triphos" },
    { id: "giants-third-hand", title: { ko: "거인의 세번째 손", en: "Giant's Third Hand" }, level: "Lv.70", place: { ko: "자하브 · 유적지 폐허", en: "Zahab · Ruined Site" }, image: "giants-third-hand" },
    { id: "sealed-amorphos", title: { ko: "봉인된 아모르포스", en: "Sealed Amorphos" }, level: "Lv.40", place: { ko: "[인터] 타르타로스 1계 유폐 · 유폐의 둥지", en: "[Inter] Tartarus 1st Circle: Imprisonment · Imprisonment Nest" }, image: "sealed-amorphos" },
    { id: "sealed-bdeles", title: { ko: "봉인된 브델레스", en: "Sealed Bdeles" }, level: "Lv.45", place: { ko: "타르타로스 2계 낙인 · 배신의 심연굴", en: "Tartarus 2nd Circle: Stigma · Betrayer's Abyss" }, image: "sealed-bdeles" }
  ];
  const text = {
    ko: {
      supported: "PIP 지원 브라우저입니다. PIP 띄우기를 누르면 출현 시간이 작은 창으로 열립니다.",
      unsupported: "이 브라우저는 Document PIP를 지원하지 않습니다. 기본 화면에서 카운트다운을 사용할 수 있습니다.",
      next: "다음 출현", now: "진행 중", starts: "출현까지", soon: "곧 출현", world: "월드보스", invasion: "침공", alarm: "출현 알림", pipOpen: "PIP 창을 열었습니다.", pipError: "PIP 창을 열 수 없습니다. 브라우저 지원 여부를 확인하세요.",
      respawn: "8시간 리스폰", lastDefeat: "마지막 처치 시각", setNow: "지금으로 설정", available: "출현 가능", enterLastDefeat: "마지막 처치 시각을 입력하세요.", respawnSaved: "리스폰 시각을 저장했습니다.", scheduleUnlisted: "고정 출현 시간 미표기 · 게임 내 현황판 확인",
      kst: "KST", live: "현재 시각", close: "PIP"
    },
    en: {
      supported: "This browser supports PIP. Open PIP to keep the spawn schedule in a small window.",
      unsupported: "This browser does not support Document PIP. You can still use the countdown on this page.",
      next: "Next spawn", now: "In progress", starts: "Starts in", soon: "Starting soon", world: "World boss", invasion: "Invasion", alarm: "Spawn alert", pipOpen: "PIP window opened.", pipError: "Could not open the PIP window. Check browser support.",
      respawn: "8-hour respawn", lastDefeat: "Last defeat time", setNow: "Set to now", available: "Available", enterLastDefeat: "Enter the last defeat time.", respawnSaved: "Respawn time saved.", scheduleUnlisted: "No fixed schedule shown · Check the in-game board",
      kst: "KST", live: "Current time", close: "PIP"
    }
  }[lang];
  const els = {
    list: $("#zeusScheduleList"), directory: $("#zeusBossDirectory"), bossCount: $("#zeusBossCount"), pip: $("#openZeusPip"), support: $("#zeusPipSupport"), clock: $("#zeusClock"), beep: $("#zeusBeepEnabled"), tts: $("#zeusTtsEnabled"), toast: $("#zeusTimerToast")
  };
  let pipWindow = null;
  let announced = new Set();
  let lastRenderKey = "";
  let lastDirectoryRenderKey = "";
  let audioContext = null;

  init();

  function init() {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (saved) {
      els.beep.checked = saved.beep !== false;
      els.tts.checked = saved.tts === true;
    }
    els.support.className = `maple-support-note ${"documentPictureInPicture" in window ? "is-supported" : "is-unsupported"}`;
    els.support.textContent = "documentPictureInPicture" in window ? text.supported : text.unsupported;
    els.pip.disabled = !("documentPictureInPicture" in window);
    [els.beep, els.tts].forEach((input) => input.addEventListener("change", saveSettings));
    els.pip.addEventListener("click", openPip);
    els.directory.addEventListener("change", handleRespawnInput);
    els.directory.addEventListener("click", handleRespawnClick);
    render();
    window.setInterval(render, 250);
    window.addEventListener("beforeunload", () => { if (pipWindow && !pipWindow.closed) pipWindow.close(); });
  }

  function saveSettings() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ beep: els.beep.checked, tts: els.tts.checked }));
  }

  function renderBossDirectory(events, states) {
    els.bossCount.textContent = `${BOSS_DIRECTORY.length}`;
    els.directory.innerHTML = BOSS_DIRECTORY.map((boss) => {
      const level = typeof boss.level === "string" ? boss.level : boss.level[lang];
      const event = events.find((item) => item.id === boss.id);
      const state = states.find((item) => item.boss.id === boss.id);
      const timer = event ? `<div class="zeus-tile-timer"><div><b data-zeus-status>${event.next.diff < 30000 ? text.soon : text.next}</b><span>${event.schedule[lang]}</span></div><strong data-zeus-countdown>${formatCountdown(event.next.diff)}</strong></div>` : state ? respawnTimer(state) : `<div class="zeus-tile-untracked">${text.scheduleUnlisted}</div>`;
      return `<article class="zeus-boss-tile${state ? " is-respawn" : ""}" role="listitem" data-zeus-boss-id="${boss.id}">
        <img src="../assets/img/zeus/bosses/${boss.image}.webp" alt="" aria-hidden="true" loading="lazy">
        <div class="zeus-boss-tile-shade" aria-hidden="true"></div>
        <div class="zeus-boss-tile-copy"><div><div class="zeus-boss-tile-heading"><strong>${boss.title[lang]}</strong><span>${level}</span></div><p>${boss.place[lang]}</p></div>${timer}</div>
      </article>`;
    }).join("");
  }

  function respawnTimer(state) {
    const boss = state.boss;
    const hasNext = Boolean(state.next);
    return `<div class="zeus-tile-respawn"><div class="zeus-tile-timer"><div><b data-zeus-respawn-status>${hasNext && state.diff <= 0 ? text.available : text.respawn}</b><span>${boss.detail[lang]}</span></div><strong data-zeus-respawn-countdown>${hasNext ? formatCountdown(state.diff) : text.enterLastDefeat}</strong></div><label>${text.lastDefeat}<input type="datetime-local" data-zeus-respawn-input="${boss.id}" value="${escapeHtml(state.inputValue)}" aria-label="${escapeHtml(`${boss.title[lang]} ${text.lastDefeat}`)}"></label><button type="button" class="secondary-link" data-zeus-respawn-now="${boss.id}">${text.setNow}</button></div>`;
  }

  function render() {
    const now = new Date();
    const events = EVENTS.map((event) => ({ ...event, next: nextKstOccurrence(event, now) }));
    const respawns = getRespawnStates(now);
    const bossEvents = events.filter((event) => event.kind === "world" || event.id === "invasion-boss");
    const riftEvents = events.filter((event) => event.id.startsWith("rift-"));
    els.clock.textContent = `${text.live}: ${formatTime(now)} ${text.kst}`;
    const directoryKey = respawns.map((state) => `${state.boss.id}:${state.inputValue}`).join("|");
    if (directoryKey !== lastDirectoryRenderKey) {
      renderBossDirectory(bossEvents, respawns);
      lastDirectoryRenderKey = directoryKey;
    } else {
      updateBossDirectory(bossEvents, respawns);
    }
    const renderKey = riftEvents.map((event) => `${event.id}:${Math.floor(event.next.diff / 1000)}`).join("|");
    if (renderKey !== lastRenderKey) {
      els.list.innerHTML = riftEvents.map(eventCard).join("");
      lastRenderKey = renderKey;
    } else {
      riftEvents.forEach((event) => {
        const card = $(`[data-zeus-event="${event.id}"]`, els.list);
        if (!card) return;
        $("[data-zeus-countdown]", card).textContent = formatCountdown(event.next.diff);
        $("[data-zeus-status]", card).textContent = event.next.diff < 30000 ? text.soon : text.next;
      });
    }
    events.forEach(checkAlarm);
    updatePip(events, respawns);
  }

  function updateBossDirectory(events, states) {
    events.forEach((event) => {
      const card = $(`[data-zeus-boss-id="${event.id}"]`, els.directory);
      if (!card) return;
      $("[data-zeus-countdown]", card).textContent = formatCountdown(event.next.diff);
      $("[data-zeus-status]", card).textContent = event.next.diff < 30000 ? text.soon : text.next;
    });
    states.forEach((state) => {
      const card = $(`[data-zeus-boss-id="${state.boss.id}"]`, els.directory);
      if (!card) return;
      const countdown = $("[data-zeus-respawn-countdown]", card);
      const status = $("[data-zeus-respawn-status]", card);
      if (countdown) countdown.textContent = state.next ? formatCountdown(state.diff) : text.enterLastDefeat;
      if (status) status.textContent = state.next && state.diff <= 0 ? text.available : text.respawn;
    });
  }

  function getRespawnStates(now) {
    const saved = readRespawns();
    return RESPAWN_BOSSES.map((boss) => {
      const inputValue = saved[boss.id] || "";
      const lastDefeat = inputValue ? parseKstInput(inputValue) : null;
      const next = lastDefeat && !Number.isNaN(lastDefeat.getTime()) ? new Date(lastDefeat.getTime() + 8 * 60 * 60 * 1000) : null;
      return { boss, inputValue, next, diff: next ? next.getTime() - now.getTime() : 0 };
    });
  }

  function readRespawns() {
    try { return JSON.parse(window.localStorage.getItem(`${STORAGE_KEY}:respawns`) || "{}"); } catch (_error) { return {}; }
  }

  function handleRespawnInput(event) {
    const input = event.target.closest("[data-zeus-respawn-input]");
    if (!input) return;
    const saved = readRespawns();
    if (input.value) saved[input.dataset.zeusRespawnInput] = input.value;
    else delete saved[input.dataset.zeusRespawnInput];
    window.localStorage.setItem(`${STORAGE_KEY}:respawns`, JSON.stringify(saved));
    lastDirectoryRenderKey = "";
    render();
    showToast(text.respawnSaved);
  }

  function handleRespawnClick(event) {
    const button = event.target.closest("[data-zeus-respawn-now]");
    if (!button) return;
    const input = $(`[data-zeus-respawn-input="${button.dataset.zeusRespawnNow}"]`, els.directory);
    if (!input) return;
    input.value = formatKstInput(new Date());
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function eventCard(event) {
    const title = event.title[lang];
    const detail = event.detail[lang];
    const category = event.kind === "world" ? text.world : text.invasion;
    return `<article class="maple-timer-card zeus-schedule-card" data-zeus-event="${event.id}">
      <div class="zeus-event-mark" aria-hidden="true">⚡</div>
      <div class="maple-timer-main"><div class="maple-timer-head"><strong>${title}</strong><span data-zeus-status>${event.next.diff < 30000 ? text.soon : text.next}</span></div><div class="zeus-event-detail"><b>${event.level[lang]} · ${event.place[lang]}</b><span>${category} · ${formatSchedule(event)} · ${detail}</span></div><div class="maple-time" data-zeus-countdown>${formatCountdown(event.next.diff)}</div><div class="maple-progress"><span style="width:${progress(event).toFixed(2)}%"></span></div></div>
      <div class="maple-timer-actions"><span class="zeus-card-label">${text.starts}</span><span class="zeus-card-kst">${text.kst}</span></div>
    </article>`;
  }

  function checkAlarm(event) {
    const key = `${event.id}:${event.next.target.getFullYear()}-${event.next.target.getMonth()}-${event.next.target.getDate()}`;
    if (event.next.diff > 0 || announced.has(key)) return;
    announced.add(key);
    if (els.beep.checked) playBeep();
    if (els.tts.checked && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`${event.title[lang]} ${text.alarm}`);
      utterance.lang = lang === "en" ? "en-US" : "ko-KR";
      window.speechSynthesis.speak(utterance);
    }
    showToast(text.alarm);
  }

  async function openPip() {
    if (!("documentPictureInPicture" in window)) return;
    try {
      if (pipWindow && !pipWindow.closed) { pipWindow.focus(); return; }
      pipWindow = await window.documentPictureInPicture.requestWindow({ width: 360, height: 380 });
      pipWindow.document.title = lang === "en" ? "Zeus Boss Timer" : "제우스 보스타이머";
      pipWindow.document.body.innerHTML = `<main class="pip-zeus-shell"><header><strong>${lang === "en" ? "Zeus Boss Timer" : "제우스 보스타이머"}</strong><span>⚡ PIP</span></header><p class="pip-caption">${lang === "en" ? "Weekly world boss schedule · KST" : "주간 월드보스 시간표 · KST"}</p><section id="pipZeusList" class="pip-zeus-list"></section></main>`;
      const style = pipWindow.document.createElement("style");
      style.textContent = pipStyles();
      pipWindow.document.head.appendChild(style);
      pipWindow.addEventListener("pagehide", () => { pipWindow = null; });
      updatePip(EVENTS.map((event) => ({ ...event, next: nextKstOccurrence(event, new Date()) })), getRespawnStates(new Date()));
      showToast(text.pipOpen);
    } catch (error) {
      console.warn("[SolForge] Zeus PIP failed", error);
      showToast(text.pipError);
    }
  }

  function updatePip(events, respawns = []) {
    if (!pipWindow || pipWindow.closed) return;
    const list = pipWindow.document.getElementById("pipZeusList");
    if (!list) return;
    const weekly = events.map((event) => `<article><div><strong>${event.title[lang]}</strong><small>${event.level[lang]} · ${event.place[lang]}<br>${formatSchedule(event)} · ${text.kst}</small></div><b>${formatCountdown(event.next.diff)}</b></article>`);
    const respawn = respawns.filter((state) => state.next).map((state) => `<article><div><strong>${state.boss.title[lang]}</strong><small>${state.boss.level} · ${state.boss.place[lang]}<br>${text.respawn}</small></div><b>${state.diff <= 0 ? text.available : formatCountdown(state.diff)}</b></article>`);
    list.innerHTML = weekly.concat(respawn).join("");
  }

  function nextKstOccurrence(event, now) {
    const kstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const startKst = new Date(kstNow);
    startKst.setHours(0, 0, 0, 0);
    let targetKst = null;
    for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
      const candidate = new Date(startKst);
      candidate.setDate(startKst.getDate() + dayOffset);
      candidate.setHours(event.hour, event.minute, 0, 0);
      if (event.days.includes(candidate.getDay()) && candidate > kstNow) {
        targetKst = candidate;
        break;
      }
    }
    if (!targetKst) targetKst = new Date(startKst.getTime() + 7 * 24 * 60 * 60 * 1000);
    const offset = kstNow.getTime() - now.getTime();
    const target = new Date(targetKst.getTime() - offset);
    return { target, diff: Math.max(0, target.getTime() - now.getTime()) };
  }

  function formatSchedule(event) { return event.schedule[lang]; }
  function parseKstInput(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
    if (!match) return null;
    const [, year, month, day, hour, minute] = match;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 9, Number(minute)));
  }
  function formatKstInput(date) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`;
  }
  function escapeHtml(value) { return String(value).replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character])); }
  function formatTime(date) { return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(date); }
  function formatCountdown(ms) { const total = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(total / 3600)).padStart(2, "0")}:${String(Math.floor((total % 3600) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; }
  function progress(event) { const period = event.days.length === 7 ? 24 : 7 * 24; return Math.max(0, Math.min(100, 100 - (event.next.diff / (period * 60 * 60 * 1000)) * 100)); }
  function playBeep() { try { audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)(); const now = audioContext.currentTime; [0, 0.18, 0.36].forEach((offset) => { const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); oscillator.frequency.value = 880; gain.gain.setValueAtTime(0.0001, now + offset); gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12); oscillator.connect(gain).connect(audioContext.destination); oscillator.start(now + offset); oscillator.stop(now + offset + 0.14); }); } catch (_error) {} }
  function showToast(message) { els.toast.textContent = message; els.toast.classList.add("show"); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 1800); }
  function pipStyles() { return `*{box-sizing:border-box}body{margin:0;background:#0f172a;color:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.pip-zeus-shell{min-height:100vh;padding:14px;background:linear-gradient(180deg,#172554,#020617)}header{display:flex;justify-content:space-between;gap:8px;padding-bottom:10px;border-bottom:1px solid #334155}header strong{font-size:15px}header span{color:#facc15;font-weight:900}.pip-caption{margin:12px 0;color:#cbd5e1;font-size:12px}.pip-zeus-list{display:grid;gap:10px}.pip-zeus-list article{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px;border:1px solid #334155;border-radius:11px;background:#111827}.pip-zeus-list strong,.pip-zeus-list small{display:block}.pip-zeus-list small{margin-top:4px;color:#94a3b8;font-size:11px}.pip-zeus-list b{font:900 24px/1.1 "SFMono-Regular",Consolas,monospace;color:#facc15;white-space:nowrap}`; }
}());
