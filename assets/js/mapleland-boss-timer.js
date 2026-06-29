(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const STORAGE_KEY = "solforge:mapleland-boss-timer:v1";
  const SLOT_COUNT = 5;
  const TICK_MS = 250;
  const ASSET = "/assets/img/mapleland/";
  const ICONS = [
    ["horntail.png", "Horntail"],
    ["chaos_zakum.png", "Zakum"],
    ["resurrection.png", "Resurrection"],
    ["tomb.png", "Tomb"],
    ["horntail_dispel.png", "Dispel"],
    ["seduce.png", "Seduce"],
    ["attack_cancel.png", "Attack cancel"],
    ["attack_cancel_big.png", "Big cancel"],
    ["holy_symbol.png", "Holy Symbol"]
  ];
  const PRESETS = [
    { id: "ht-five", icon: "horntail_dispel.png", titleKo: "혼테일 5갈", titleEn: "Horntail 5-min dispel", seconds: 300, groupKo: "혼테일", groupEn: "Horntail" },
    { id: "ht-three", icon: "horntail_dispel.png", titleKo: "혼테일 3갈", titleEn: "Horntail 3-min dispel", seconds: 180, groupKo: "혼테일", groupEn: "Horntail" },
    { id: "ht-first-seduce", icon: "seduce.png", titleKo: "첫 개인유혹", titleEn: "First seduce", seconds: 120, groupKo: "혼테일", groupEn: "Horntail" },
    { id: "ht-seduce", icon: "seduce.png", titleKo: "개인유혹", titleEn: "Seduce", seconds: 180, groupKo: "혼테일", groupEn: "Horntail" },
    { id: "ht-wyvern", icon: "horntail.png", titleKo: "다크와이번", titleEn: "Dark Wyvern", seconds: 50, groupKo: "혼테일", groupEn: "Horntail" },
    { id: "ht-cancel", icon: "attack_cancel.png", titleKo: "혼테일 공무", titleEn: "Horntail weapon cancel", seconds: 45, groupKo: "혼테일", groupEn: "Horntail" },
    { id: "zakum-cancel", icon: "attack_cancel_big.png", titleKo: "자쿰 공무", titleEn: "Zakum weapon cancel", seconds: 30, groupKo: "자쿰", groupEn: "Zakum" },
    { id: "pianus-cancel", icon: "attack_cancel_big.png", titleKo: "피아누스 공무", titleEn: "Pianus weapon cancel", seconds: 38, groupKo: "피아누스", groupEn: "Pianus" },
    { id: "resurrection", icon: "resurrection.png", titleKo: "리저렉션 쿨", titleEn: "Resurrection cooldown", seconds: 1800, groupKo: "공통", groupEn: "Common" },
    { id: "death-dc", icon: "tomb.png", titleKo: "사망 팅", titleEn: "Death reconnect", seconds: 900, groupKo: "공통", groupEn: "Common" }
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
    icon: $("#mapleTimerIcon"),
    title: $("#mapleTimerTitle"),
    minutes: $("#mapleTimerMinutes"),
    seconds: $("#mapleTimerSeconds"),
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
    els.resetSlot.addEventListener("click", () => {
      if (!window.confirm(text.resetConfirm)) return;
      currentSlot().timers = [];
      saveState();
      renderAll();
    });
    $$("[data-adjust-ms]", root).forEach((button) => {
      button.addEventListener("click", () => adjustTime(Number(button.dataset.adjustMs)));
    });
    [els.icon, els.title, els.minutes, els.seconds, els.tts, els.beep].forEach((input) => {
      input.addEventListener("input", saveDraft);
      input.addEventListener("change", saveDraft);
    });
  }

  function renderPresetGrid() {
    els.presetGrid.innerHTML = PRESETS.map((preset) => `
      <button type="button" class="maple-preset-card" data-preset-id="${preset.id}">
        <img src="${ASSET}${preset.icon}" alt="" loading="lazy">
        <span>
          <strong>${escapeHtml(label(preset))}</strong>
          <small>${escapeHtml(groupLabel(preset))} · ${formatDuration(preset.seconds * 1000)}</small>
        </span>
      </button>
    `).join("");
    $$("[data-preset-id]", els.presetGrid).forEach((button) => {
      button.addEventListener("click", () => {
        const preset = PRESETS.find((item) => item.id === button.dataset.presetId);
        if (preset) applyPreset(preset, true);
      });
    });
  }

  function renderIconOptions() {
    els.icon.innerHTML = ICONS.map(([file, label]) => `<option value="${file}">${escapeHtml(label)}</option>`).join("");
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
          <div class="maple-timer-icon"><img src="${ASSET}${escapeHtml(timer.icon)}" alt=""></div>
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
    els.icon.value = preset.icon;
    els.title.value = label(preset);
    writeDuration(preset.seconds * 1000);
    if (notify) showToast(text.copied);
    saveDraft();
  }

  function restoreDraft() {
    const draft = state.draft;
    if (!draft) {
      applyPreset(PRESETS[0], false);
      return;
    }
    els.icon.value = ICONS.some(([file]) => file === draft.icon) ? draft.icon : PRESETS[0].icon;
    els.title.value = String(draft.title || label(PRESETS[0])).slice(0, 32);
    writeDuration(clamp(Number(draft.duration) || PRESETS[0].seconds * 1000, 0, 999 * 60000));
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
    return (minutes * 60 + seconds) * 1000;
  }

  function writeDuration(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    els.minutes.value = String(Math.floor(total / 60));
    els.seconds.value = String(total % 60);
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
      icon: ICONS.some(([file]) => file === timer.icon) ? timer.icon : "horntail.png",
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

  function groupLabel(preset) {
    return lang === "en" ? preset.groupEn : preset.groupKo;
  }

  function formatDuration(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    if (minutes && seconds) return `${minutes}m ${seconds}s`;
    if (minutes) return `${minutes}m`;
    return `${seconds}s`;
  }

  function formatClock(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
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
