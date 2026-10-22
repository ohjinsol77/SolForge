(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const root = $("[data-zeus-boss-timer]");
  if (!root) return;
  const lang = document.documentElement.lang === "en" ? "en" : "ko";
  const STORAGE_KEY = "solforge:zeus-boss-timer:v1";
  const supportsPip = typeof window.documentPictureInPicture?.requestWindow === "function";
  const text = (key) => $(`[data-zeus-copy="${key}"]`).textContent;
  const choose = (value) => typeof value === "string" ? value : value[lang];
  const BOSSES = [
    { id: "medeia", title: { ko: "메데이아", en: "Medeia" }, level: "Lv.45", place: { ko: "[인터] 타르타로스 2계 낙인 · 배신의 심연굴", en: "[Inter] Tartarus 2nd Circle: Stigma · Betrayer's Abyss" }, days: [2] },
    { id: "arachne", title: { ko: "아라크네", en: "Arachne" }, level: "Lv.50", place: { ko: "테살리아", en: "Thessalia" }, days: [3] },
    { id: "chimera", title: { ko: "키메라", en: "Chimera" }, level: "Lv.60", place: { ko: "[인터] 타르타로스 4계 업보", en: "[Inter] Tartarus 4th Circle: Karma" }, days: [6] },
    { id: "kerberos", title: { ko: "케르베로스", en: "Kerberos" }, level: "Lv.75", place: { ko: "[인터] 타르타로스 5계 심판", en: "[Inter] Tartarus 5th Circle: Judgment" }, days: [5] },
    { id: "argos", title: { ko: "아르고스", en: "Argos" }, level: "Lv.65", place: { ko: "자하브", en: "Zahab" }, days: [1] },
    { id: "invasion-boss", title: { ko: "침공 보스", en: "Invasion Boss" }, level: { ko: "레벨 미표기", en: "Level not shown" }, place: { ko: "테살리아", en: "Thessalia" }, days: [1, 4] },
    { id: "krisopagos", title: { ko: "크리소파고스", en: "Krisopagos" }, level: "Lv.35", place: { ko: "테살리아 · 테살리아 평원", en: "Thessalia · Thessalia Plains" } },
    { id: "amorphos", title: { ko: "아모르포스", en: "Amorphos" }, level: "Lv.35", place: { ko: "테살리아 · 침식된 경작지", en: "Thessalia · Corrupted Farmland" } },
    { id: "trason", title: { ko: "트라손", en: "Trason" }, level: "Lv.40", place: { ko: "테살리아 · 고대 신전 유적지", en: "Thessalia · Ancient Temple Ruins" } },
    { id: "iocanthos", title: { ko: "이오칸토스", en: "Iocanthos" }, level: "Lv.45", place: { ko: "테살리아 · 아르브리아스 폐허", en: "Thessalia · Arborias Ruins" } },
    { id: "kinyrauri", title: { ko: "키니라우리", en: "Kinyrauri" }, level: "Lv.45", place: { ko: "테살리아 · 금지된 숲", en: "Thessalia · Forbidden Forest" } },
    { id: "alastor", title: { ko: "알라스토르", en: "Alastor" }, level: "Lv.55", place: { ko: "자하브 · 무법자의 길목", en: "Zahab · Outlaw's Path" } },
    { id: "vedix", title: { ko: "베딕스", en: "Vedix" }, level: "Lv.60", place: { ko: "자하브 · 공허의 제단", en: "Zahab · Altar of the Void" } },
    { id: "gortis", title: { ko: "고르티스", en: "Gortis" }, level: "Lv.60", place: { ko: "자하브 · 황금 리라 부락", en: "Zahab · Golden Lyra Village" } },
    { id: "triphos", title: { ko: "트리포스", en: "Triphos" }, level: "Lv.65", place: { ko: "자하브 · 가시 덤불 지대", en: "Zahab · Thornbush Zone" } },
    { id: "giants-third-hand", title: { ko: "거인의 세번째 손", en: "Giant's Third Hand" }, level: "Lv.70", place: { ko: "자하브 · 유적지 폐허", en: "Zahab · Ruined Site" } },
    { id: "sealed-amorphos", title: { ko: "봉인된 아모르포스", en: "Sealed Amorphos" }, level: "Lv.40", place: { ko: "[인터] 타르타로스 1계 유폐 · 유폐의 둥지", en: "[Inter] Tartarus 1st Circle: Imprisonment · Imprisonment Nest" } },
    { id: "sealed-bdeles", title: { ko: "봉인된 브델레스", en: "Sealed Bdeles" }, level: "Lv.45", place: { ko: "타르타로스 2계 낙인 · 배신의 심연굴", en: "Tartarus 2nd Circle: Stigma · Betrayer's Abyss" } }
  ];
  const RIFTS = [12, 20].map((hour) => ({ id: `rift-${hour}`, title: { ko: "심연의 틈", en: "Rift of the Abyss" }, hour, days: [0, 1, 2, 3, 4, 5, 6], place: { ko: "발생 지역 포탈", en: "Portal in the affected region" } }));
  const els = {
    directory: $("#zeusBossDirectory"), list: $("#zeusScheduleList"), count: $("#zeusBossCount"),
    pip: $("#openZeusPip"), support: $("#zeusPipSupport"), selection: $("#zeusPipSelection"),
    clock: $("#zeusClock"), beep: $("#zeusBeepEnabled"), tts: $("#zeusTtsEnabled"), rifts: $("#zeusIncludeRifts"), toast: $("#zeusTimerToast")
  };
  const settings = readStorage(STORAGE_KEY);
  const selected = new Set(Array.isArray(settings.pipIds) ? settings.pipIds.filter((id) => BOSSES.some((boss) => boss.id === id)) : BOSSES.map((boss) => boss.id));
  const timers = readStorage(`${STORAGE_KEY}:timers`);
  let pipWindow = null;
  let pipKey = "";
  let audioContext = null;
  let previousTargets = new Map();
  let lastTick = Date.now();

  els.beep.checked = settings.beep !== false;
  els.tts.checked = settings.tts === true;
  els.rifts.checked = settings.rifts !== false;
  els.support.textContent = text(supportsPip ? "pipSupported" : "pipFallback");
  if (!supportsPip) els.pip.textContent = text("openPopup");
  els.count.textContent = String(BOSSES.length);
  els.directory.innerHTML = BOSSES.map(bossCard).join("");
  els.list.innerHTML = RIFTS.map((boss) => `<article class="zeus-rift-card" data-zeus-event="${boss.id}"><strong>${choose(boss.title)}</strong><span>${schedule(boss)}</span><span data-next-time></span><b data-countdown></b></article>`).join("");
  root.addEventListener("change", handleChange);
  root.addEventListener("click", handleClick);
  root.addEventListener("submit", saveTimer);
  els.pip.addEventListener("click", openPip);
  window.addEventListener("beforeunload", () => { if (pipWindow && !pipWindow.closed) pipWindow.close(); });
  render();
  window.setInterval(render, 1000);

  function readStorage(key) {
    try { const value = JSON.parse(window.localStorage.getItem(key) || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; } catch (_error) { return {}; }
  }

  function persistSettings() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ beep: els.beep.checked, tts: els.tts.checked, rifts: els.rifts.checked, pipIds: [...selected] })); }
    catch (_error) { showToast(text("storageError")); }
  }

  function imageUrl(boss) { return new URL(`/assets/img/zeus/bosses/${boss.id}.webp`, window.location.href).href; }
  function schedule(boss) {
    if (!boss.days) return text("respawnSchedule");
    const weekday = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "ko-KR", { weekday: "short", timeZone: "UTC" });
    const days = boss.days.map((day) => weekday.format(new Date(Date.UTC(2026, 0, 4 + day)))).join(" · ");
    return `${boss.days.length === 7 ? text("daily") : days} ${String(boss.hour ?? 21).padStart(2, "0")}:00 KST`;
  }

  function bossCard(boss) {
    const stored = timers[boss.id];
    const mode = stored?.mode === "datetime" ? "datetime" : stored ? "remaining" : boss.days ? "schedule" : "remaining";
    return `<article class="zeus-boss-tile" role="listitem" data-zeus-boss-id="${boss.id}">
      <div class="zeus-boss-portrait"><img src="${imageUrl(boss)}" alt="${escapeHtml(choose(boss.title))}" loading="eager"><div class="zeus-boss-tile-shade"></div><div class="zeus-boss-tile-heading"><span>${choose(boss.level)}</span><h3>${choose(boss.title)}</h3><p>${choose(boss.place)}</p></div></div>
      <div class="zeus-boss-tile-copy"><dl class="zeus-boss-facts"><div><dt>${text("scheduleLabel")}</dt><dd data-schedule>${schedule(boss)}</dd></div><div><dt>${text("nextSpawn")}</dt><dd data-next-time></dd></div></dl>
        <div class="zeus-tile-timer"><span data-status></span><strong data-countdown></strong></div>
        <div class="zeus-boss-actions"><label><input type="checkbox" data-pip-boss="${boss.id}"${selected.has(boss.id) ? " checked" : ""}>${text("showInPip")}</label></div>
        <details class="zeus-timer-editor"><summary>${text("editTimer")}</summary><form data-timer-form="${boss.id}">
          <label>${text("timerMode")}<select name="mode">${boss.days ? `<option value="schedule"${mode === "schedule" ? " selected" : ""}>${text("autoSchedule")}</option>` : ""}<option value="remaining"${mode === "remaining" ? " selected" : ""}>${text("remainingMode")}</option><option value="datetime"${mode === "datetime" ? " selected" : ""}>${text("datetimeMode")}</option></select></label>
          <div data-mode="remaining"${mode !== "remaining" ? " hidden" : ""} class="zeus-remaining-fields"><label>${text("hours")}<input name="hours" type="number" min="0" max="999" step="1" inputmode="numeric" placeholder="0"></label><label>${text("minutes")}<input name="minutes" type="number" min="0" max="59" step="1" inputmode="numeric" placeholder="0"></label></div>
          <label data-mode="datetime"${mode !== "datetime" ? " hidden" : ""}>${text("nextSpawn")} (KST)<input name="target" type="datetime-local" value="${stored?.target ? formatKstInput(new Date(stored.target)) : ""}"></label>
          <div class="zeus-editor-actions"><button type="submit">${text("save")}</button><button type="button" data-reset-timer="${boss.id}">${text("reset")}</button></div><p data-form-status role="status"></p>
        </form></details>
      </div></article>`;
  }

  function getState(boss, now) {
    const stored = timers[boss.id];
    const manualTarget = stored?.target ? Date.parse(stored.target) : NaN;
    const target = Number.isFinite(manualTarget) ? manualTarget : boss.days ? nextOccurrence(boss, now) : null;
    return { boss, target, diff: target === null ? null : target - now, manual: Number.isFinite(manualTarget) };
  }

  function render() {
    const now = Date.now();
    const states = BOSSES.concat(RIFTS).map((boss) => getState(boss, now));
    for (const state of states) {
      const card = state.boss.hour === undefined ? $(`[data-zeus-boss-id="${state.boss.id}"]`, els.directory) : $(`[data-zeus-event="${state.boss.id}"]`, els.list);
      $("[data-next-time]", card).textContent = state.target === null ? text("enterTime") : formatDate(new Date(state.target));
      $("[data-countdown]", card).textContent = countdown(state.diff);
      const status = $("[data-status]", card);
      if (status) status.textContent = state.target === null ? text("unset") : state.diff <= 0 ? text("timeReached") : state.manual ? text("customTimer") : text("automatic");
      const row = $("[data-schedule]", card);
      if (row) row.textContent = state.manual ? text("customSchedule") : schedule(state.boss);
    }
    els.clock.textContent = `${formatDate(new Date(now))} KST`;
    const picked = states.filter((state) => state.boss.hour === undefined ? selected.has(state.boss.id) : els.rifts.checked);
    els.selection.textContent = `${text("selected")} ${picked.length} · ${text("ready")} ${picked.filter((state) => state.target !== null).length}`;
    els.pip.disabled = picked.length === 0;
    checkAlarms(picked, now);
    updatePip(picked);
    lastTick = now;
  }

  function handleChange(event) {
    const input = event.target;
    if (input.matches("[data-pip-boss]")) input.checked ? selected.add(input.dataset.pipBoss) : selected.delete(input.dataset.pipBoss);
    else if (input.matches("select[name=mode]")) {
      const form = input.closest("form");
      form.querySelectorAll("[data-mode]").forEach((field) => { field.hidden = field.dataset.mode !== input.value; });
      return;
    } else if (![els.beep, els.tts, els.rifts].includes(input)) return;
    persistSettings();
    if (els.beep.checked) primeAudio();
    render();
  }

  function handleClick(event) {
    const selectionButton = event.target.closest("[data-pip-select]");
    if (selectionButton) {
      const all = selectionButton.dataset.pipSelect === "all";
      selected.clear();
      if (all) BOSSES.forEach((boss) => selected.add(boss.id));
      els.directory.querySelectorAll("[data-pip-boss]").forEach((input) => { input.checked = all; });
      els.rifts.checked = all;
      persistSettings();
      render();
    }
    const reset = event.target.closest("[data-reset-timer]");
    if (reset) {
      const id = reset.dataset.resetTimer;
      const form = reset.closest("form");
      const boss = BOSSES.find((entry) => entry.id === id);
      delete timers[id];
      form.reset();
      form.elements.mode.value = boss.days ? "schedule" : "remaining";
      form.elements.target.value = "";
      form.elements.mode.dispatchEvent(new Event("change", { bubbles: true }));
      persistTimers(form);
    }
  }

  function saveTimer(event) {
    const form = event.target.closest("[data-timer-form]");
    if (!form) return;
    event.preventDefault();
    const id = form.dataset.timerForm;
    const mode = form.elements.mode.value;
    if (mode === "schedule") delete timers[id];
    else {
      const hours = Number(form.elements.hours.value);
      const minutes = Number(form.elements.minutes.value);
      const target = mode === "datetime" ? Date.parse(`${form.elements.target.value}:00+09:00`) : Date.now() + (hours * 60 + minutes) * 60000;
      if (!Number.isFinite(target) || target <= Date.now() || (mode === "remaining" && (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || minutes < 0 || minutes > 59))) {
        $("[data-form-status]", form).textContent = text("invalidTime");
        return;
      }
      timers[id] = { mode, target: new Date(target).toISOString() };
      form.elements.target.value = formatKstInput(new Date(target));
    }
    persistTimers(form);
  }

  function persistTimers(form) {
    try {
      window.localStorage.setItem(`${STORAGE_KEY}:timers`, JSON.stringify(timers));
      previousTargets.delete(form.dataset.timerForm);
      $("[data-form-status]", form).textContent = text("saved");
      render();
    } catch (_error) { $("[data-form-status]", form).textContent = text("storageError"); }
  }

  async function openPip() {
    primeAudio();
    if (pipWindow && !pipWindow.closed) { pipWindow.focus(); return; }
    try {
      pipWindow = supportsPip ? await window.documentPictureInPicture.requestWindow({ width: 440, height: 600 }) : window.open("", "solforge-zeus-timer", "popup,width=440,height=600");
      if (!pipWindow) throw new Error("Popup blocked");
      pipKey = "";
      pipWindow.document.title = text("title");
      pipWindow.document.body.innerHTML = `<main class="pip-zeus-shell"><header><strong>${text("title")}</strong><span>KST</span></header><p>${text("pipHint")}</p><section id="pipZeusList"></section></main>`;
      const style = pipWindow.document.createElement("style");
      style.textContent = pipStyles();
      pipWindow.document.head.appendChild(style);
      pipWindow.document.documentElement.lang = lang;
      const opened = pipWindow;
      pipWindow.addEventListener("pagehide", () => { if (pipWindow === opened) { pipWindow = null; pipKey = ""; } });
      render();
    } catch (_error) { showToast(text("pipError")); }
  }

  function updatePip(states) {
    if (!pipWindow || pipWindow.closed) return;
    const list = pipWindow.document.getElementById("pipZeusList");
    if (!list) return;
    const key = states.map((state) => state.boss.id).join("|");
    if (pipKey !== key) {
      list.innerHTML = states.length ? states.map(({ boss }) => `<article data-pip-id="${boss.id}">${boss.hour === undefined ? `<img src="${imageUrl(boss)}" alt="">` : '<span class="pip-rift" aria-hidden="true">⚡</span>'}<div><strong>${choose(boss.title)}</strong><small>${boss.level ? `${choose(boss.level)} · ` : ""}${choose(boss.place)}</small><small data-pip-schedule></small><small data-pip-time></small><b data-pip-countdown></b></div></article>`).join("") : `<p>${text("selectHint")}</p>`;
      pipKey = key;
    }
    for (const state of states) {
      const card = list.querySelector(`[data-pip-id="${state.boss.id}"]`);
      $("[data-pip-schedule]", card).textContent = state.manual ? text("customSchedule") : schedule(state.boss);
      $("[data-pip-time]", card).textContent = state.target === null ? text("enterTime") : formatDate(new Date(state.target));
      $("[data-pip-countdown]", card).textContent = state.target === null ? text("unset") : state.diff <= 0 ? text("timeReached") : countdown(state.diff);
    }
  }

  function nextOccurrence(boss, now) {
    const shifted = new Date(now + 9 * 3600000);
    const start = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), boss.hour ?? 21) - 9 * 3600000;
    for (let offset = 0; offset <= 7; offset += 1) {
      const target = start + offset * 86400000;
      if (target > now && boss.days.includes(new Date(target + 9 * 3600000).getUTCDay())) return target;
    }
    return start + 7 * 86400000;
  }

  function checkAlarms(states, now) {
    const reached = states.filter((state) => { const target = previousTargets.get(state.boss.id); return Number.isFinite(target) && target > lastTick && target <= now; });
    previousTargets = new Map(states.map((state) => [state.boss.id, state.target]));
    if (!reached.length) return;
    const message = `${reached.map((state) => choose(state.boss.title)).join(", ")} · ${text("timeReached")}`;
    if (els.beep.checked) playBeep();
    if (els.tts.checked && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = lang === "en" ? "en-US" : "ko-KR";
      window.speechSynthesis.speak(utterance);
    }
    showToast(message);
  }

  function formatDate(date) { return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date); }
  function formatKstInput(date) { return new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 16); }
  function countdown(ms) { if (ms === null) return "--:--:--"; const total = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(total / 3600)).padStart(2, "0")}:${String(Math.floor(total % 3600 / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character])); }
  function primeAudio() { try { audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)(); if (audioContext.state === "suspended") audioContext.resume().catch(() => {}); } catch (_error) {} }
  function playBeep() { try { primeAudio(); const now = audioContext.currentTime; [0, 0.18, 0.36].forEach((offset) => { const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); oscillator.frequency.value = 880; gain.gain.setValueAtTime(0.0001, now + offset); gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12); oscillator.connect(gain).connect(audioContext.destination); oscillator.start(now + offset); oscillator.stop(now + offset + 0.14); }); } catch (_error) {} }
  function showToast(message) { els.toast.textContent = message; els.toast.classList.add("show"); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 2500); }
  function pipStyles() { return `*{box-sizing:border-box}body{margin:0;background:#11151b;color:#f2f0e9;font:14px system-ui,sans-serif}.pip-zeus-shell{padding:12px}header{display:flex;justify-content:space-between;border-bottom:1px solid #5a513b;padding-bottom:10px}header span,b{color:#f2d47f}.pip-zeus-shell>p{font-size:12px;color:#c4c7cd}section{display:grid;gap:8px}article{display:grid;grid-template-columns:88px minmax(0,1fr);gap:10px;border:1px solid #5a513b;border-radius:5px;overflow:hidden;background:#191f28}article>div{padding:8px 8px 8px 0}img,.pip-rift{width:88px;height:100%;min-height:120px;object-fit:cover}.pip-rift{display:grid;place-items:center;font-size:30px}strong,small,b{display:block}small{margin-top:4px;color:#c4c7cd;font-size:11px;overflow-wrap:anywhere}b{margin-top:6px;font:700 21px Consolas,monospace}`; }
}());
