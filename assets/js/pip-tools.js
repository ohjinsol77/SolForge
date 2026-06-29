(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const STORAGE_KEY = "solforge:pip-tools:v1";
  const MEMO_KEY = "solforge:pip-tools:memos:v1";
  const TICK_MS = 250;

  const root = $("[data-pip-toolbox]");
  if (!root) return;

  const lang = document.documentElement.lang === "en" ? "en" : "ko";
  const text = {
    ko: {
      supported: "PIP 지원 브라우저입니다. 각 도구의 PIP 띄우기 버튼으로 작은 창을 열 수 있습니다.",
      unsupported: "이 브라우저는 Document PIP를 지원하지 않습니다. 페이지 안에서는 모든 도구를 그대로 사용할 수 있습니다.",
      pipOpen: "PIP 창을 열었습니다.",
      pipError: "PIP 창을 열 수 없습니다. 브라우저 지원 여부를 확인하세요.",
      noMatch: "일치하는 PIP 도구가 없습니다.",
      start: "시작",
      pause: "정지",
      reset: "초기화",
      focus: "집중",
      break: "휴식",
      complete: "완료",
      ready: "대기",
      done: "완료",
      timerDone: "타이머가 종료되었습니다.",
      pomodoroDone: "뽀모도로가 완료되었습니다.",
      copied: "복사했습니다.",
      copyFailed: "복사할 수 없습니다.",
      pickUnavailable: "이 브라우저는 화면 색상 선택을 지원하지 않습니다.",
      imageReady: "이미지를 불러왔습니다.",
      imageMissing: "이미지를 먼저 선택하세요.",
      imageDone: "리사이즈가 완료되었습니다.",
      memoUntitled: "제목 없는 메모",
      memoSaved: "메모를 저장했습니다.",
      memoDeleted: "메모를 삭제했습니다.",
      newMemo: "새 메모",
      noMemo: "메모가 없습니다.",
      pipHint: "작은 PIP 창에는 핵심 상태와 조작 버튼만 표시됩니다.",
      mainImageOnly: "이미지 선택과 리사이즈는 메인 화면에서 처리하고 PIP 창은 결과 미리보기만 표시합니다."
    },
    en: {
      supported: "This browser supports PIP. Use each tool's Open PIP button to launch a compact window.",
      unsupported: "This browser does not support Document PIP. All tools still work inside the main page.",
      pipOpen: "PIP window opened.",
      pipError: "Could not open the PIP window. Check browser support.",
      noMatch: "No matching PIP tools.",
      start: "Start",
      pause: "Pause",
      reset: "Reset",
      focus: "Focus",
      break: "Break",
      complete: "Complete",
      ready: "Ready",
      done: "Done",
      timerDone: "Timer finished.",
      pomodoroDone: "Pomodoro complete.",
      copied: "Copied.",
      copyFailed: "Could not copy.",
      pickUnavailable: "This browser does not support screen color picking.",
      imageReady: "Image loaded.",
      imageMissing: "Choose an image first.",
      imageDone: "Resize complete.",
      memoUntitled: "Untitled memo",
      memoSaved: "Memo saved.",
      memoDeleted: "Memo deleted.",
      newMemo: "New memo",
      noMemo: "No memos yet.",
      pipHint: "The PIP window shows only the essential status and controls.",
      mainImageOnly: "Choose and resize images on the main page; the PIP window shows the result preview."
    }
  }[lang];

  const toolMeta = {
    clock: { title: lang === "en" ? "Clock" : "시계", size: { width: 360, height: 220 } },
    timer: { title: lang === "en" ? "Timer" : "타이머", size: { width: 360, height: 260 } },
    pomodoro: { title: lang === "en" ? "Pomodoro" : "뽀모도로", size: { width: 380, height: 310 } },
    color: { title: lang === "en" ? "Color Picker" : "색상 선택", size: { width: 360, height: 320 } },
    image: { title: lang === "en" ? "Image Resize" : "이미지 리사이즈", size: { width: 380, height: 360 } },
    memo: { title: lang === "en" ? "Memo" : "메모", size: { width: 380, height: 420 } }
  };

  const els = {
    search: $("#pipToolSearch"),
    list: $("#pipToolList"),
    empty: $("#pipToolEmpty"),
    support: $("#pipSupportNote"),
    toast: $("#pipToolToast"),
    clockTime: $("#pipClockTime"),
    clockDate: $("#pipClockDate"),
    clockSeconds: $("#pipClockSeconds"),
    clock24h: $("#pipClock24h"),
    clockDateEnabled: $("#pipClockDateEnabled"),
    timerDisplay: $("#pipTimerDisplay"),
    timerProgress: $("#pipTimerProgress"),
    timerMinutes: $("#pipTimerMinutes"),
    timerSeconds: $("#pipTimerSeconds"),
    timerStart: $("#pipTimerStart"),
    timerReset: $("#pipTimerReset"),
    pomodoroMode: $("#pipPomodoroMode"),
    pomodoroDisplay: $("#pipPomodoroDisplay"),
    pomodoroCycle: $("#pipPomodoroCycle"),
    pomodoroProgress: $("#pipPomodoroProgress"),
    focusMinutes: $("#pipFocusMinutes"),
    breakMinutes: $("#pipBreakMinutes"),
    pomodoroCycles: $("#pipPomodoroCycles"),
    pomodoroStart: $("#pipPomodoroStart"),
    pomodoroReset: $("#pipPomodoroReset"),
    colorInput: $("#pipColorInput"),
    colorPreview: $("#pipColorPreview"),
    hexValue: $("#pipHexValue"),
    rgbValue: $("#pipRgbValue"),
    hslValue: $("#pipHslValue"),
    eyeDropper: $("#pipEyeDropper"),
    imageFile: $("#pipImageFile"),
    imageWidth: $("#pipImageWidth"),
    imageHeight: $("#pipImageHeight"),
    imageFormat: $("#pipImageFormat"),
    imageQuality: $("#pipImageQuality"),
    imageRatio: $("#pipImageRatio"),
    resizeImage: $("#pipResizeImage"),
    imageDownload: $("#pipImageDownload"),
    imageResult: $("#pipImageResult"),
    imageCanvas: $("#pipImageCanvas"),
    imageStats: $("#pipImageStats"),
    memoList: $("#pipMemoList"),
    memoTitle: $("#pipMemoTitle"),
    memoBody: $("#pipMemoBody"),
    saveMemo: $("#pipSaveMemo"),
    newMemo: $("#pipNewMemo"),
    deleteMemo: $("#pipDeleteMemo")
  };

  const state = {
    active: readStorage(STORAGE_KEY)?.active || "clock",
    pipTool: null,
    timer: { duration: 300000, remaining: 300000, running: false, endsAt: null },
    pomodoro: { focus: 1500000, break: 300000, cycles: 4, currentCycle: 1, mode: "focus", remaining: 1500000, running: false, endsAt: null },
    color: "#1677ff",
    image: { name: "", sourceUrl: "", outputUrl: "", originalWidth: 0, originalHeight: 0, width: 0, height: 0, ratio: 1 },
    memos: readMemos(),
    activeMemoId: null
  };
  state.activeMemoId = state.memos[0]?.id || null;

  let pipWindow = null;
  let tickHandle = null;
  let audioContext = null;

  init();

  function init() {
    if (!state.memos.length) {
      const memo = createMemo(text.newMemo, "");
      state.memos.push(memo);
      state.activeMemoId = memo.id;
      saveMemos();
    }
    bindNavigation();
    bindClock();
    bindTimer();
    bindPomodoro();
    bindColor();
    bindImage();
    bindMemo();
    bindHashNavigation();
    renderSupport();
    setActivePanel(toolFromHash() || state.active);
    renderAll();
    tickHandle = window.setInterval(tick, TICK_MS);
    window.addEventListener("beforeunload", () => {
      window.clearInterval(tickHandle);
      if (pipWindow && !pipWindow.closed) pipWindow.close();
      if (state.image.sourceUrl) URL.revokeObjectURL(state.image.sourceUrl);
      if (state.image.outputUrl) URL.revokeObjectURL(state.image.outputUrl);
    });
  }

  function bindHashNavigation() {
    window.addEventListener("hashchange", () => {
      const tool = toolFromHash();
      if (tool) setActivePanel(tool);
    });
  }

  function bindNavigation() {
    const buttons = $$("[data-pip-target]", els.list);
    buttons.forEach((button) => {
      button.addEventListener("click", () => setActivePanel(button.dataset.pipTarget.replace(/^pip-/, "")));
    });
    els.search.addEventListener("input", () => {
      const query = normalize(els.search.value);
      let visible = 0;
      buttons.forEach((button) => {
        const haystack = normalize(`${button.textContent} ${button.dataset.keywords || ""}`);
        const show = !query || haystack.includes(query);
        button.hidden = !show;
        if (show) visible += 1;
      });
      els.empty.hidden = visible !== 0;
    });
    $$("[data-open-pip]", root).forEach((button) => {
      button.addEventListener("click", () => openPip(button.dataset.openPip));
    });
  }

  function bindClock() {
    [els.clockSeconds, els.clock24h, els.clockDateEnabled].forEach((input) => input.addEventListener("change", renderClock));
  }

  function bindTimer() {
    [els.timerMinutes, els.timerSeconds].forEach((input) => {
      input.addEventListener("input", () => {
        if (state.timer.running) return;
        resetTimer(readTimerDuration());
      });
    });
    els.timerStart.addEventListener("click", toggleTimer);
    els.timerReset.addEventListener("click", () => resetTimer(readTimerDuration()));
  }

  function bindPomodoro() {
    [els.focusMinutes, els.breakMinutes, els.pomodoroCycles].forEach((input) => {
      input.addEventListener("input", () => {
        if (state.pomodoro.running) return;
        resetPomodoro();
      });
    });
    els.pomodoroStart.addEventListener("click", togglePomodoro);
    els.pomodoroReset.addEventListener("click", resetPomodoro);
  }

  function bindColor() {
    els.colorInput.addEventListener("input", () => {
      setColor(els.colorInput.value);
    });
    els.eyeDropper.addEventListener("click", pickScreenColor);
    $$("[data-copy-pip]", root).forEach((button) => {
      button.addEventListener("click", () => copyText($(`#${button.dataset.copyPip}`)?.textContent || ""));
    });
  }

  function bindImage() {
    els.imageFile.addEventListener("change", loadImageFile);
    els.imageWidth.addEventListener("input", () => syncImageSize("width"));
    els.imageHeight.addEventListener("input", () => syncImageSize("height"));
    els.resizeImage.addEventListener("click", resizeImage);
  }

  function bindMemo() {
    els.saveMemo.addEventListener("click", saveActiveMemo);
    els.newMemo.addEventListener("click", () => {
      const memo = createMemo(text.newMemo, "");
      state.memos.unshift(memo);
      state.activeMemoId = memo.id;
      saveMemos();
      renderMemo();
      showToast(text.memoSaved);
    });
    els.deleteMemo.addEventListener("click", () => {
      if (state.memos.length <= 1) {
        state.memos = [createMemo(text.newMemo, "")];
      } else {
        state.memos = state.memos.filter((memo) => memo.id !== state.activeMemoId);
      }
      state.activeMemoId = state.memos[0]?.id || null;
      saveMemos();
      renderMemo();
      showToast(text.memoDeleted);
    });
    els.memoTitle.addEventListener("input", saveActiveMemoQuietly);
    els.memoBody.addEventListener("input", saveActiveMemoQuietly);
  }

  function setActivePanel(tool) {
    state.active = toolMeta[tool] ? tool : "clock";
    $$("[data-pip-panel]", root).forEach((panel) => {
      panel.hidden = panel.id !== `pip-${state.active}`;
    });
    $$("[data-pip-target]", els.list).forEach((button) => {
      button.classList.toggle("active", button.dataset.pipTarget === `pip-${state.active}`);
    });
    writeStorage(STORAGE_KEY, { active: state.active });
  }

  function toolFromHash() {
    const match = window.location.hash.match(/^#pip-(clock|timer|pomodoro|color|image|memo)$/);
    return match ? match[1] : "";
  }

  function renderSupport() {
    const supported = "documentPictureInPicture" in window;
    els.support.className = `pip-support-note ${supported ? "is-supported" : "is-unsupported"}`;
    els.support.textContent = supported ? text.supported : text.unsupported;
    $$("[data-open-pip]", root).forEach((button) => {
      button.disabled = !supported;
    });
  }

  async function openPip(tool) {
    if (!("documentPictureInPicture" in window)) return;
    try {
      if (pipWindow && !pipWindow.closed && state.pipTool === tool) {
        pipWindow.focus();
        return;
      }
      if (pipWindow && !pipWindow.closed) pipWindow.close();
      state.pipTool = tool;
      const size = toolMeta[tool].size;
      pipWindow = await window.documentPictureInPicture.requestWindow(size);
      pipWindow.document.title = toolMeta[tool].title;
      pipWindow.document.body.innerHTML = `<main class="pip-mini" id="pipMiniRoot"></main>`;
      const style = pipWindow.document.createElement("style");
      style.textContent = pipStyles();
      pipWindow.document.head.appendChild(style);
      pipWindow.document.addEventListener("click", handlePipClick);
      pipWindow.document.addEventListener("input", handlePipInput);
      pipWindow.addEventListener("pagehide", () => {
        pipWindow = null;
        state.pipTool = null;
      });
      renderPip();
      showToast(text.pipOpen);
    } catch (error) {
      console.warn("[SolForge] PIP failed", error);
      showToast(text.pipError);
    }
  }

  function handlePipClick(event) {
    const action = event.target.closest("[data-pip-action]")?.dataset.pipAction;
    if (!action) return;
    if (action === "timer-toggle") toggleTimer();
    if (action === "timer-reset") resetTimer(readTimerDuration());
    if (action === "pomodoro-toggle") togglePomodoro();
    if (action === "pomodoro-reset") resetPomodoro();
    if (action === "copy-hex") copyText(els.hexValue.textContent);
    if (action === "copy-rgb") copyText(els.rgbValue.textContent);
    if (action === "copy-hsl") copyText(els.hslValue.textContent);
    if (action === "memo-save") saveActiveMemoFromPip();
  }

  function handlePipInput(event) {
    const target = event.target;
    if (target.id === "pipMiniColor") setColor(target.value);
    if (target.id === "pipMiniMemoTitle" || target.id === "pipMiniMemoBody") saveActiveMemoFromPip();
  }

  function renderAll() {
    renderClock();
    renderTimer();
    renderPomodoro();
    renderColor();
    renderMemo();
    renderPip();
  }

  function tick() {
    renderClock();
    updateTimer();
    updatePomodoro();
  }

  function renderClock() {
    const now = new Date();
    const time = now.toLocaleTimeString(lang === "en" ? "en-US" : "ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: els.clockSeconds.checked ? "2-digit" : undefined,
      hour12: !els.clock24h.checked
    });
    const date = now.toLocaleDateString(lang === "en" ? "en-US" : "ko-KR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    els.clockTime.textContent = time;
    els.clockDate.textContent = els.clockDateEnabled.checked ? date : "";
    if (state.pipTool === "clock") renderPip();
  }

  function readTimerDuration() {
    const minutes = clamp(Number(els.timerMinutes.value) || 0, 0, 999);
    const seconds = clamp(Number(els.timerSeconds.value) || 0, 0, 59);
    return Math.max(1000, (minutes * 60 + seconds) * 1000);
  }

  function toggleTimer() {
    const timer = state.timer;
    if (timer.running) {
      timer.remaining = remainingMs(timer);
      timer.running = false;
      timer.endsAt = null;
    } else {
      if (remainingMs(timer) <= 0) timer.remaining = readTimerDuration();
      timer.running = true;
      timer.endsAt = Date.now() + remainingMs(timer);
    }
    renderTimer();
  }

  function resetTimer(duration) {
    state.timer = { duration, remaining: duration, running: false, endsAt: null };
    renderTimer();
  }

  function updateTimer() {
    const timer = state.timer;
    if (!timer.running) return;
    timer.remaining = remainingMs(timer);
    if (timer.remaining <= 0) {
      timer.running = false;
      timer.endsAt = null;
      timer.remaining = 0;
      playAlarm();
      showToast(text.timerDone);
    }
    renderTimer();
  }

  function renderTimer() {
    const timer = state.timer;
    const remaining = remainingMs(timer);
    const percent = timer.duration ? Math.max(0, Math.min(100, (remaining / timer.duration) * 100)) : 0;
    els.timerDisplay.textContent = formatClock(remaining);
    els.timerProgress.style.width = `${percent}%`;
    els.timerStart.textContent = timer.running ? text.pause : text.start;
    if (state.pipTool === "timer") renderPip();
  }

  function readPomodoroSettings() {
    return {
      focus: clamp(Number(els.focusMinutes.value) || 25, 1, 180) * 60000,
      break: clamp(Number(els.breakMinutes.value) || 5, 1, 60) * 60000,
      cycles: clamp(Number(els.pomodoroCycles.value) || 4, 1, 12)
    };
  }

  function togglePomodoro() {
    const pomodoro = state.pomodoro;
    if (pomodoro.running) {
      pomodoro.remaining = remainingMs(pomodoro);
      pomodoro.running = false;
      pomodoro.endsAt = null;
    } else {
      if (remainingMs(pomodoro) <= 0) resetPomodoro();
      pomodoro.running = true;
      pomodoro.endsAt = Date.now() + remainingMs(pomodoro);
    }
    renderPomodoro();
  }

  function resetPomodoro() {
    const settings = readPomodoroSettings();
    state.pomodoro = {
      ...settings,
      currentCycle: 1,
      mode: "focus",
      remaining: settings.focus,
      running: false,
      endsAt: null
    };
    renderPomodoro();
  }

  function updatePomodoro() {
    const pomodoro = state.pomodoro;
    if (!pomodoro.running) return;
    pomodoro.remaining = remainingMs(pomodoro);
    if (pomodoro.remaining <= 0) {
      if (pomodoro.mode === "focus") {
        pomodoro.mode = "break";
        pomodoro.remaining = pomodoro.break;
      } else if (pomodoro.currentCycle < pomodoro.cycles) {
        pomodoro.mode = "focus";
        pomodoro.currentCycle += 1;
        pomodoro.remaining = pomodoro.focus;
      } else {
        pomodoro.running = false;
        pomodoro.endsAt = null;
        pomodoro.remaining = 0;
        playAlarm();
        showToast(text.pomodoroDone);
        renderPomodoro();
        return;
      }
      pomodoro.endsAt = Date.now() + pomodoro.remaining;
      playAlarm();
    }
    renderPomodoro();
  }

  function renderPomodoro() {
    const pomodoro = state.pomodoro;
    const remaining = remainingMs(pomodoro);
    const duration = pomodoro.mode === "focus" ? pomodoro.focus : pomodoro.break;
    const percent = duration ? Math.max(0, Math.min(100, (remaining / duration) * 100)) : 0;
    els.pomodoroMode.textContent = pomodoro.mode === "focus" ? text.focus : text.break;
    els.pomodoroDisplay.textContent = formatClock(remaining);
    els.pomodoroCycle.textContent = `${pomodoro.currentCycle} / ${pomodoro.cycles}`;
    els.pomodoroProgress.style.width = `${percent}%`;
    els.pomodoroStart.textContent = pomodoro.running ? text.pause : text.start;
    if (state.pipTool === "pomodoro") renderPip();
  }

  function setColor(value) {
    state.color = normalizeHex(value);
    els.colorInput.value = state.color;
    renderColor();
  }

  async function pickScreenColor() {
    if (!("EyeDropper" in window)) {
      showToast(text.pickUnavailable);
      return;
    }
    try {
      const result = await new window.EyeDropper().open();
      if (result?.sRGBHex) setColor(result.sRGBHex);
    } catch (_error) {
      // User canceled the picker.
    }
  }

  function renderColor() {
    const rgb = hexToRgb(state.color);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    els.colorPreview.style.background = state.color;
    els.hexValue.textContent = state.color;
    els.rgbValue.textContent = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    els.hslValue.textContent = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    if (state.pipTool === "color") renderPip();
  }

  function loadImageFile() {
    const file = els.imageFile.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (state.image.sourceUrl) URL.revokeObjectURL(state.image.sourceUrl);
      state.image = {
        name: file.name,
        sourceUrl: url,
        outputUrl: "",
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight,
        width: img.naturalWidth,
        height: img.naturalHeight,
        ratio: img.naturalWidth / img.naturalHeight
      };
      els.imageWidth.value = String(img.naturalWidth);
      els.imageHeight.value = String(img.naturalHeight);
      showToast(text.imageReady);
      drawImageToCanvas(img, img.naturalWidth, img.naturalHeight, false);
      renderPip();
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }

  function syncImageSize(source) {
    if (!state.image.ratio || !els.imageRatio.checked) return;
    if (source === "width") {
      const width = Math.max(1, Number(els.imageWidth.value) || state.image.width);
      els.imageHeight.value = String(Math.max(1, Math.round(width / state.image.ratio)));
    } else {
      const height = Math.max(1, Number(els.imageHeight.value) || state.image.height);
      els.imageWidth.value = String(Math.max(1, Math.round(height * state.image.ratio)));
    }
  }

  function resizeImage() {
    if (!state.image.sourceUrl) {
      showToast(text.imageMissing);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const width = clamp(Number(els.imageWidth.value) || state.image.width, 1, 8000);
      const height = clamp(Number(els.imageHeight.value) || state.image.height, 1, 8000);
      drawImageToCanvas(img, width, height, true);
      showToast(text.imageDone);
    };
    img.src = state.image.sourceUrl;
  }

  function drawImageToCanvas(img, width, height, downloadable) {
    const canvas = els.imageCanvas;
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    els.imageResult.hidden = false;
    state.image.width = width;
    state.image.height = height;
    state.imageStats.textContent = `${state.image.name || "image"} · ${state.image.originalWidth || width}x${state.image.originalHeight || height} -> ${width}x${height}`;
    if (downloadable) {
      const type = els.imageFormat.value || "image/png";
      const quality = clamp(Number(els.imageQuality.value) || 92, 10, 100) / 100;
      canvas.toBlob((blob) => {
        if (!blob) return;
        if (state.image.outputUrl) URL.revokeObjectURL(state.image.outputUrl);
        state.image.outputUrl = URL.createObjectURL(blob);
        const ext = type.split("/")[1].replace("jpeg", "jpg");
        els.imageDownload.href = state.image.outputUrl;
        els.imageDownload.download = `solforge-resized.${ext}`;
        renderPip();
      }, type, quality);
    }
  }

  function renderMemo() {
    const active = activeMemo();
    els.memoList.innerHTML = state.memos.map((memo) => `
      <button type="button" class="${memo.id === state.activeMemoId ? "active" : ""}" data-memo-id="${memo.id}">
        <strong>${escapeHtml(memo.title || text.memoUntitled)}</strong>
        <small>${escapeHtml(formatMemoDate(memo.updatedAt))}</small>
      </button>
    `).join("");
    $$("[data-memo-id]", els.memoList).forEach((button) => {
      button.addEventListener("click", () => {
        state.activeMemoId = button.dataset.memoId;
        renderMemo();
      });
    });
    els.memoTitle.value = active?.title || "";
    els.memoBody.value = active?.body || "";
    renderPip();
  }

  function saveActiveMemoQuietly() {
    const memo = activeMemo();
    if (!memo) return;
    memo.title = els.memoTitle.value.trim() || text.memoUntitled;
    memo.body = els.memoBody.value;
    memo.updatedAt = Date.now();
    saveMemos();
    renderMemoListOnly();
    renderPip();
  }

  function saveActiveMemo() {
    saveActiveMemoQuietly();
    showToast(text.memoSaved);
  }

  function saveActiveMemoFromPip() {
    const doc = pipWindow?.document;
    if (!doc) return;
    const memo = activeMemo();
    if (!memo) return;
    memo.title = doc.getElementById("pipMiniMemoTitle")?.value.trim() || text.memoUntitled;
    memo.body = doc.getElementById("pipMiniMemoBody")?.value || "";
    memo.updatedAt = Date.now();
    saveMemos();
    els.memoTitle.value = memo.title;
    els.memoBody.value = memo.body;
    renderMemoListOnly();
  }

  function renderMemoListOnly() {
    const activeId = state.activeMemoId;
    els.memoList.innerHTML = state.memos.map((memo) => `
      <button type="button" class="${memo.id === activeId ? "active" : ""}" data-memo-id="${memo.id}">
        <strong>${escapeHtml(memo.title || text.memoUntitled)}</strong>
        <small>${escapeHtml(formatMemoDate(memo.updatedAt))}</small>
      </button>
    `).join("");
    $$("[data-memo-id]", els.memoList).forEach((button) => {
      button.addEventListener("click", () => {
        state.activeMemoId = button.dataset.memoId;
        renderMemo();
      });
    });
  }

  function renderPip() {
    if (!pipWindow || pipWindow.closed || !state.pipTool) return;
    const container = pipWindow.document.getElementById("pipMiniRoot");
    if (!container) return;
    const tool = state.pipTool;
    if (tool === "clock") container.innerHTML = pipClockHtml();
    if (tool === "timer") container.innerHTML = pipTimerHtml();
    if (tool === "pomodoro") container.innerHTML = pipPomodoroHtml();
    if (tool === "color") container.innerHTML = pipColorHtml();
    if (tool === "image") container.innerHTML = pipImageHtml();
    if (tool === "memo") container.innerHTML = pipMemoHtml();
  }

  function pipHeader(tool) {
    return `<header><strong>${escapeHtml(toolMeta[tool].title)}</strong><span>PIP</span></header>`;
  }

  function pipClockHtml() {
    return `${pipHeader("clock")}<section class="center-view clock-view"><strong>${escapeHtml(els.clockTime.textContent)}</strong><span>${escapeHtml(els.clockDate.textContent || text.pipHint)}</span></section>`;
  }

  function pipTimerHtml() {
    const timer = state.timer;
    const remaining = remainingMs(timer);
    const percent = timer.duration ? Math.max(0, Math.min(100, (remaining / timer.duration) * 100)) : 0;
    return `${pipHeader("timer")}<section class="center-view"><small>${timer.running ? text.start : remaining <= 0 ? text.done : text.ready}</small><strong>${formatClock(remaining)}</strong><div class="mini-progress"><span style="width:${percent}%"></span></div><div class="pip-actions"><button data-pip-action="timer-toggle">${timer.running ? text.pause : text.start}</button><button data-pip-action="timer-reset">${text.reset}</button></div></section>`;
  }

  function pipPomodoroHtml() {
    const pomodoro = state.pomodoro;
    const remaining = remainingMs(pomodoro);
    const duration = pomodoro.mode === "focus" ? pomodoro.focus : pomodoro.break;
    const percent = duration ? Math.max(0, Math.min(100, (remaining / duration) * 100)) : 0;
    return `${pipHeader("pomodoro")}<section class="center-view"><small>${pomodoro.mode === "focus" ? text.focus : text.break} · ${pomodoro.currentCycle}/${pomodoro.cycles}</small><strong>${formatClock(remaining)}</strong><div class="mini-progress"><span style="width:${percent}%"></span></div><div class="pip-actions"><button data-pip-action="pomodoro-toggle">${pomodoro.running ? text.pause : text.start}</button><button data-pip-action="pomodoro-reset">${text.reset}</button></div></section>`;
  }

  function pipColorHtml() {
    return `${pipHeader("color")}<section class="color-mini"><div class="mini-swatch" style="background:${state.color}"></div><input id="pipMiniColor" type="color" value="${state.color}"><button data-pip-action="copy-hex"><b>HEX</b><span>${escapeHtml(els.hexValue.textContent)}</span></button><button data-pip-action="copy-rgb"><b>RGB</b><span>${escapeHtml(els.rgbValue.textContent)}</span></button><button data-pip-action="copy-hsl"><b>HSL</b><span>${escapeHtml(els.hslValue.textContent)}</span></button></section>`;
  }

  function pipImageHtml() {
    const src = state.image.outputUrl || state.image.sourceUrl;
    const img = src ? `<img src="${src}" alt="">` : `<div class="empty">${escapeHtml(text.imageMissing)}</div>`;
    const stats = state.image.name ? `${state.image.name} · ${state.image.width || state.image.originalWidth}x${state.image.height || state.image.originalHeight}` : text.mainImageOnly;
    return `${pipHeader("image")}<section class="image-mini">${img}<p>${escapeHtml(stats)}</p><small>${escapeHtml(text.mainImageOnly)}</small></section>`;
  }

  function pipMemoHtml() {
    const memo = activeMemo();
    return `${pipHeader("memo")}<section class="memo-mini"><input id="pipMiniMemoTitle" value="${escapeAttr(memo?.title || "")}" placeholder="${escapeAttr(text.memoUntitled)}"><textarea id="pipMiniMemoBody" placeholder="${escapeAttr(text.noMemo)}">${escapeHtml(memo?.body || "")}</textarea><button data-pip-action="memo-save">${escapeHtml(text.done)}</button></section>`;
  }

  function activeMemo() {
    return state.memos.find((memo) => memo.id === state.activeMemoId) || state.memos[0] || null;
  }

  function createMemo(title, body) {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      body,
      updatedAt: Date.now()
    };
  }

  function readMemos() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(MEMO_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter((memo) => memo && typeof memo === "object").map((memo) => ({
        id: String(memo.id || `${Date.now()}-${Math.random()}`),
        title: String(memo.title || text?.memoUntitled || "Memo").slice(0, 60),
        body: String(memo.body || ""),
        updatedAt: Number(memo.updatedAt) || Date.now()
      })) : [];
    } catch (_error) {
      return [];
    }
  }

  function saveMemos() {
    try {
      window.localStorage.setItem(MEMO_KEY, JSON.stringify(state.memos));
    } catch (_error) {
      // Memo remains available for the current session.
    }
  }

  function readStorage(key) {
    try {
      return JSON.parse(window.localStorage.getItem(key) || "null");
    } catch (_error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_error) {
      // Optional persistence.
    }
  }

  function remainingMs(item) {
    if (item.running && item.endsAt) return Math.max(0, item.endsAt - Date.now());
    return Math.max(0, item.remaining || 0);
  }

  function formatClock(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function formatMemoDate(value) {
    return new Date(value || Date.now()).toLocaleString(lang === "en" ? "en-US" : "ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function normalizeHex(value) {
    const match = String(value || "").trim().match(/^#?[0-9a-f]{6}$/i);
    return match ? `#${match[0].replace("#", "").toLowerCase()}` : "#1677ff";
  }

  function hexToRgb(hex) {
    const value = normalizeHex(hex).slice(1);
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      if (max === g) h = (b - r) / d + 2;
      if (max === b) h = (r - g) / d + 4;
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      showToast(text.copied);
    } catch (_error) {
      showToast(text.copyFailed);
    }
  }

  function playAlarm() {
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const now = audioContext.currentTime;
      [0, 0.18].forEach((offset) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.14);
        osc.connect(gain).connect(audioContext.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.16);
      });
    } catch (_error) {
      // Visual state is sufficient if audio is blocked.
    }
  }

  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 1800);
  }

  function normalize(value) {
    return String(value || "").toLocaleLowerCase("ko").replace(/\s+/g, " ").trim();
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
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function pipStyles() {
    return `
      *{box-sizing:border-box}body{margin:0;background:#0f172a;color:#f8fafc;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .pip-mini{min-height:100vh;padding:12px;background:linear-gradient(180deg,#111827,#020617)}
      header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(148,163,184,.24)}
      header strong{font-size:14px}header span{color:#93c5fd;font-size:11px;font-weight:900}
      .center-view{display:grid;gap:10px;place-items:center;text-align:center}.center-view strong{font-size:46px;line-height:1;font-weight:950}.center-view small,.center-view span{color:#cbd5e1;font-weight:800}
      .clock-view strong{font-size:42px}.mini-progress{width:100%;height:9px;overflow:hidden;border-radius:999px;background:#334155}.mini-progress span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#22c55e,#38bdf8)}
      .pip-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%}button{min-height:38px;border:1px solid rgba(148,163,184,.28);border-radius:8px;background:#1e293b;color:#f8fafc;font-weight:900;cursor:pointer}
      input,textarea{width:100%;border:1px solid rgba(148,163,184,.32);border-radius:8px;background:#111827;color:#f8fafc;padding:9px;font:inherit}textarea{min-height:210px;resize:vertical}
      .color-mini{display:grid;gap:9px}.mini-swatch{height:84px;border:1px solid rgba(148,163,184,.32);border-radius:10px}.color-mini button{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px}
      .image-mini{display:grid;gap:9px}.image-mini img{max-width:100%;max-height:210px;border:1px solid rgba(148,163,184,.32);border-radius:10px;object-fit:contain;background:#020617}.image-mini p{margin:0;font-size:12px;font-weight:800}.image-mini small,.empty{color:#cbd5e1;font-size:12px}
      .memo-mini{display:grid;gap:8px}.memo-mini button{width:100%}
    `;
  }
})();
