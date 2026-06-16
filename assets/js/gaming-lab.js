(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  if (document.body.matches('[data-page="gaming-lab"]')) {
    initWorkbench();
    initClickTests();
    initDoubleClick();
    initScrollTest();
    initPolling();
    initDpi();
    initSpacebar();
    initKeyboard();
    initKeySpeed();
    initReaction();
    initAim();
    initDisplay();
  }

  function initWorkbench() {
    const buttons = $$("[data-gaming-target]");
    const panels = $$("[data-gaming-panel]");
    const filters = $$("[data-gaming-filter]");
    const search = $("#gamingSearch");
    let category = "all";

    const activate = (id, updateHash = true) => {
      if (!document.getElementById(id)?.matches("[data-gaming-panel]")) return;
      buttons.forEach((button) => button.classList.toggle("active", button.dataset.gamingTarget === id));
      panels.forEach((panel) => {
        const active = panel.id === id;
        panel.hidden = !active;
        panel.classList.toggle("active", active);
      });
      if (updateHash) history.replaceState(null, "", `#${id}`);
    };

    const applyFilter = () => {
      const query = normalize(search.value);
      let visible = 0;
      buttons.forEach((button) => {
        const inCategory = category === "all" || button.dataset.category === category;
        const haystack = normalize(`${button.textContent} ${button.dataset.keywords || ""}`);
        const found = !query || query.split(" ").every((term) => haystack.includes(term));
        button.hidden = !(inCategory && found);
        if (!button.hidden) visible += 1;
      });
      $("#gamingEmpty").hidden = visible > 0;
    };

    buttons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.gamingTarget)));
    filters.forEach((button) => button.addEventListener("click", () => {
      category = button.dataset.gamingFilter || "all";
      filters.forEach((item) => item.classList.toggle("active", item === button));
      applyFilter();
    }));
    search.addEventListener("input", applyFilter);

    const initial = location.hash.slice(1);
    activate(document.getElementById(initial)?.matches("[data-gaming-panel]") ? initial : "cps-test", false);
    window.addEventListener("hashchange", () => activate(location.hash.slice(1), false));
  }

  function initClickTests() {
    createClickTest({
      kind: "left",
      pad: $("#leftCpsPad"),
      secondsInput: $("#leftCpsSeconds"),
      output: $("#leftCpsStats"),
      eventName: "click",
      validEvent: (event) => event.button === 0
    });
    createClickTest({
      kind: "right",
      pad: $("#rightCpsPad"),
      secondsInput: $("#rightCpsSeconds"),
      output: $("#rightCpsStats"),
      eventName: "contextmenu",
      validEvent: () => true
    });
  }

  function createClickTest({ kind, pad, secondsInput, output, eventName, validEvent }) {
    let count = 0;
    let start = 0;
    let timer = null;
    let running = false;
    let finished = false;

    const render = () => {
      const limit = clamp(Number(secondsInput.value) || 5, 1, 60);
      const elapsed = running ? Math.min(limit, (performance.now() - start) / 1000) : finished ? limit : 0;
      const remaining = running ? Math.max(0, limit - elapsed) : finished ? 0 : limit;
      output.innerHTML = [
        stat("클릭", count),
        stat("CPS", elapsed > 0 ? (count / elapsed).toFixed(2) : "0.00"),
        stat("남은 시간", `${remaining.toFixed(1)}초`)
      ].join("");
      if (running) pad.querySelector("strong").textContent = `${count}회`;
      else if (!finished) pad.querySelector("strong").textContent = kind === "right" ? "우클릭해서 시작" : "클릭해서 시작";
    };

    const finish = () => {
      running = false;
      finished = true;
      window.clearInterval(timer);
      const limit = clamp(Number(secondsInput.value) || 5, 1, 60);
      const cps = count / limit;
      pad.classList.add("finished");
      pad.querySelector("strong").textContent = `${cps.toFixed(2)} CPS`;
      pad.querySelector("span").textContent = "결과를 유지합니다. 다시 측정하려면 초기화를 누르세요.";
      render();
    };

    const reset = () => {
      count = 0;
      running = false;
      finished = false;
      window.clearInterval(timer);
      pad.classList.remove("finished");
      pad.querySelector("strong").textContent = kind === "right" ? "우클릭해서 시작" : "클릭해서 시작";
      pad.querySelector("span").textContent = kind === "right" ? "오른쪽 버튼만 카운트합니다." : "좌클릭만 카운트합니다.";
      render();
    };

    pad.addEventListener(eventName, (event) => {
      event.preventDefault();
      if (!validEvent(event)) return;
      if (finished) return;
      const limit = clamp(Number(secondsInput.value) || 5, 1, 60);
      if (!running) {
        count = 0;
        start = performance.now();
        running = true;
        timer = window.setInterval(() => {
          render();
          if ((performance.now() - start) / 1000 >= limit) finish();
        }, 80);
      }
      if ((performance.now() - start) / 1000 <= limit) count += 1;
      render();
    });

    secondsInput.addEventListener("input", reset);
    document.querySelector(`[data-reset-click-test="${kind}"]`).addEventListener("click", reset);
    render();
  }

  function initDoubleClick() {
    let last = 0;
    let clicks = 0;
    let doubles = 0;
    const render = (interval = 0) => {
      $("#doubleClickResult").innerHTML = resultBlock(
        `${doubles}회 감지`,
        interval ? `마지막 간격 ${Math.round(interval)}ms` : "클릭을 시작하세요.",
        [["전체 클릭", clicks], ["감지 기준", `${$("#doubleThreshold").value}ms`]]
      );
    };
    $("#doubleClickPad").addEventListener("click", () => {
      const now = performance.now();
      const interval = last ? now - last : 0;
      clicks += 1;
      if (interval && interval <= (Number($("#doubleThreshold").value) || 250)) doubles += 1;
      last = now;
      render(interval);
    });
    $("#resetDoubleClick").addEventListener("click", () => {
      last = 0;
      clicks = 0;
      doubles = 0;
      render();
    });
    $("#doubleThreshold").addEventListener("input", () => render());
    render();
  }

  function initScrollTest() {
    let events = 0;
    let total = 0;
    let up = 0;
    let down = 0;
    let first = 0;
    const render = () => {
      const elapsed = first ? Math.max(0.1, (performance.now() - first) / 1000) : 0;
      $("#scrollStats").innerHTML = [
        stat("이벤트", events),
        stat("위 / 아래", `${up} / ${down}`),
        stat("누적 delta", Math.round(total)),
        stat("초당 이벤트", elapsed ? (events / elapsed).toFixed(1) : "0.0")
      ].join("");
    };
    $("#scrollZone").addEventListener("wheel", (event) => {
      event.preventDefault();
      if (!first) first = performance.now();
      events += 1;
      total += event.deltaY;
      if (event.deltaY < 0) up += 1;
      if (event.deltaY > 0) down += 1;
      render();
    }, { passive: false });
    $("#resetScrollTest").addEventListener("click", () => {
      events = 0;
      total = 0;
      up = 0;
      down = 0;
      first = 0;
      render();
    });
    render();
  }

  function initPolling() {
    const samples = [];
    let last = 0;
    const zone = $("#pollingZone");
    const render = () => {
      const usable = samples.slice(-80);
      const average = usable.length ? usable.reduce((sum, item) => sum + item, 0) / usable.length : 0;
      const hz = average ? 1000 / average : 0;
      $("#pollingStats").innerHTML = [
        stat("샘플", samples.length),
        stat("평균 간격", average ? `${average.toFixed(2)}ms` : "-"),
        stat("추정 Hz", hz ? Math.round(hz) : "-")
      ].join("");
    };
    zone.addEventListener("pointermove", () => {
      const now = performance.now();
      if (last) {
        const delta = now - last;
        if (delta > 0 && delta < 200) samples.push(delta);
      }
      last = now;
      render();
    });
    $("#resetPolling").addEventListener("click", () => {
      samples.length = 0;
      last = 0;
      render();
    });
    render();
  }

  function initDpi() {
    const render = () => {
      const dpi = Math.max(1, Number($("#dpiValue").value) || 1);
      const sensitivity = Math.max(0, Number($("#gameSensitivity").value) || 0);
      const distance = Math.max(0.1, Number($("#dpiDistance").value) || 0.1);
      const degrees = clamp(Number($("#dpiDegrees").value) || 180, 1, 360);
      const edpi = dpi * sensitivity;
      $("#edpiResult").innerHTML = resultBlock(`${edpi.toFixed(2)} eDPI`, `${dpi} DPI × ${sensitivity}`, [["낮음", edpi < 400 ? "예" : "아니오"], ["고감도", edpi > 1200 ? "예" : "아니오"]]);
      $("#cm360Result").innerHTML = resultBlock(`${(distance * 360 / degrees).toFixed(2)}cm / 360`, `${degrees}도 회전에 ${distance}cm`, [["inch / 360", (distance * 360 / degrees / 2.54).toFixed(2)]]);
    };
    ["dpiValue", "gameSensitivity", "dpiDistance", "dpiDegrees"].forEach((id) => document.getElementById(id).addEventListener("input", render));
    render();
  }

  function initSpacebar() {
    let count = 0;
    let start = 0;
    let timer = null;
    let running = false;
    let finished = false;
    const render = () => {
      const limit = clamp(Number($("#spacebarSeconds").value) || 5, 1, 60);
      const elapsed = running ? Math.min(limit, (performance.now() - start) / 1000) : finished ? limit : 0;
      $("#spacebarStats").innerHTML = [
        stat("입력", count),
        stat("SPS", elapsed ? (count / elapsed).toFixed(2) : "0.00"),
        stat("남은 시간", `${(running ? Math.max(0, limit - elapsed) : finished ? 0 : limit).toFixed(1)}초`)
      ].join("");
    };
    const finish = () => {
      running = false;
      finished = true;
      window.clearInterval(timer);
      const limit = clamp(Number($("#spacebarSeconds").value) || 5, 1, 60);
      $("#spacebarPad").classList.add("finished");
      $("#spacebarPad").querySelector("strong").textContent = `${(count / limit).toFixed(2)} SPS`;
      $("#spacebarPad").querySelector("span").textContent = "결과를 유지합니다. 다시 측정하려면 초기화를 누르세요.";
      render();
    };
    const hit = () => {
      if (finished) return;
      const limit = clamp(Number($("#spacebarSeconds").value) || 5, 1, 60);
      if (!running) {
        count = 0;
        start = performance.now();
        running = true;
        timer = window.setInterval(() => {
          render();
          if ((performance.now() - start) / 1000 >= limit) finish();
        }, 80);
      }
      if ((performance.now() - start) / 1000 <= limit) count += 1;
      render();
    };
    $("#spacebarPad").addEventListener("keydown", (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        hit();
      }
    });
    $("#spacebarPad").addEventListener("click", () => $("#spacebarPad").focus());
    $("#resetSpacebar").addEventListener("click", () => {
      count = 0;
      running = false;
      finished = false;
      window.clearInterval(timer);
      $("#spacebarPad").classList.remove("finished");
      $("#spacebarPad").querySelector("strong").textContent = "Space 입력";
      $("#spacebarPad").querySelector("span").textContent = "버튼 포커스 후 스페이스바를 누르세요.";
      render();
    });
    render();
  }

  function initKeyboard() {
    const active = new Map();
    const log = $("#keyboardLog");
    const updateActive = () => {
      $("#activeKeyGrid").innerHTML = Array.from(active.values()).map((item) => `<span>${escapeHtml(item.key)} <small>${escapeHtml(item.code)}</small></span>`).join("");
    };
    const addLog = (event, state) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${escapeHtml(event.key)}</td><td>${escapeHtml(event.code)}</td><td>${state}</td><td>${new Date().toLocaleTimeString("ko-KR")}</td>`;
      log.prepend(row);
      while (log.children.length > 30) log.lastElementChild.remove();
      $("#keyboardReadout").textContent = `${event.key} · ${event.code} · ${event.ctrlKey ? "Ctrl " : ""}${event.shiftKey ? "Shift " : ""}${event.altKey ? "Alt " : ""}${event.metaKey ? "Meta" : ""}`;
    };
    $("#keyboardReadout").addEventListener("keydown", (event) => {
      event.preventDefault();
      active.set(event.code, { key: event.key, code: event.code });
      addLog(event, "down");
      updateActive();
    });
    $("#keyboardReadout").addEventListener("keyup", (event) => {
      event.preventDefault();
      active.delete(event.code);
      addLog(event, "up");
      updateActive();
    });
    $("#clearKeyboardLog").addEventListener("click", () => {
      log.innerHTML = "";
      active.clear();
      $("#keyboardReadout").textContent = "이 영역을 클릭하고 키를 누르세요.";
      updateActive();
    });
  }

  function initKeySpeed() {
    let first = 0;
    let lastValue = "";
    const render = () => {
      const elapsed = first ? Math.max(0.1, (performance.now() - first) / 1000) : 0;
      const count = $("#keySpeedInput").value.length;
      $("#keySpeedStats").innerHTML = [
        stat("입력수", count),
        stat("KPM", elapsed ? Math.round(count / elapsed * 60) : 0),
        stat("초당 입력", elapsed ? (count / elapsed).toFixed(1) : "0.0")
      ].join("");
    };
    $("#keySpeedInput").addEventListener("input", () => {
      if (!first || $("#keySpeedInput").value.length < lastValue.length) first = performance.now();
      lastValue = $("#keySpeedInput").value;
      render();
    });
    $("#resetKeySpeed").addEventListener("click", () => {
      first = 0;
      lastValue = "";
      $("#keySpeedInput").value = "";
      render();
    });
    render();
  }

  function initReaction() {
    const pad = $("#reactionPad");
    const scores = [];
    let state = "idle";
    let readyAt = 0;
    let timeout = null;
    const render = () => {
      const best = scores.length ? Math.min(...scores) : "-";
      const average = scores.length ? Math.round(scores.reduce((sum, item) => sum + item, 0) / scores.length) : "-";
      $("#reactionStats").innerHTML = [
        stat("시도", scores.length),
        stat("최고", best === "-" ? "-" : `${best}ms`),
        stat("평균", average === "-" ? "-" : `${average}ms`)
      ].join("");
    };
    pad.addEventListener("click", () => {
      if (state === "idle") {
        state = "waiting";
        pad.className = "reaction-pad armed";
        pad.innerHTML = "<strong>기다리세요</strong><span>초록색이 되면 클릭</span>";
        timeout = window.setTimeout(() => {
          state = "ready";
          readyAt = performance.now();
          pad.className = "reaction-pad ready";
          pad.innerHTML = "<strong>지금!</strong><span>클릭하세요</span>";
        }, 900 + Math.random() * 2600);
      } else if (state === "waiting") {
        window.clearTimeout(timeout);
        state = "idle";
        pad.className = "reaction-pad waiting";
        pad.innerHTML = "<strong>너무 빨랐어요</strong><span>다시 클릭해서 시작</span>";
      } else if (state === "ready") {
        const score = Math.round(performance.now() - readyAt);
        scores.push(score);
        state = "idle";
        pad.className = "reaction-pad waiting";
        pad.innerHTML = `<strong>${score}ms</strong><span>다시 클릭해서 시작</span>`;
        render();
      }
    });
    $("#resetReaction").addEventListener("click", () => {
      scores.length = 0;
      state = "idle";
      window.clearTimeout(timeout);
      pad.className = "reaction-pad waiting";
      pad.innerHTML = "<strong>시작</strong><span>클릭하면 대기 상태로 들어갑니다.</span>";
      render();
    });
    render();
  }

  function initAim() {
    const arena = $("#aimArena");
    const target = $("#aimTarget");
    let running = false;
    let hits = 0;
    let misses = 0;
    let shownAt = 0;
    let reactionSum = 0;
    let endAt = 0;
    let timer = null;

    const render = () => {
      const total = hits + misses;
      $("#aimStats").innerHTML = [
        stat("명중", hits),
        stat("실패", misses),
        stat("명중률", total ? `${Math.round(hits / total * 100)}%` : "0%"),
        stat("평균 반응", hits ? `${Math.round(reactionSum / hits)}ms` : "-")
      ].join("");
    };
    const place = () => {
      const size = clamp(Number($("#aimSize").value) || 42, 18, 90);
      const rect = arena.getBoundingClientRect();
      target.style.width = `${size}px`;
      target.style.height = `${size}px`;
      target.style.left = `${Math.random() * Math.max(1, rect.width - size)}px`;
      target.style.top = `${Math.random() * Math.max(1, rect.height - size)}px`;
      target.hidden = false;
      shownAt = performance.now();
    };
    const finish = () => {
      running = false;
      target.hidden = true;
      window.clearInterval(timer);
      $("#startAimTrainer").textContent = "다시 시작";
      render();
    };
    $("#startAimTrainer").addEventListener("click", () => {
      running = true;
      hits = 0;
      misses = 0;
      reactionSum = 0;
      endAt = performance.now() + clamp(Number($("#aimSeconds").value) || 20, 5, 60) * 1000;
      $("#startAimTrainer").textContent = "진행 중";
      place();
      render();
      timer = window.setInterval(() => {
        if (performance.now() >= endAt) finish();
      }, 100);
    });
    target.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!running) return;
      hits += 1;
      reactionSum += performance.now() - shownAt;
      if (performance.now() >= endAt) finish();
      else place();
      render();
    });
    arena.addEventListener("click", () => {
      if (!running) return;
      misses += 1;
      render();
    });
    render();
  }

  function initDisplay() {
    const canvas = $("#displayCanvas");
    const context = canvas.getContext("2d");
    const draw = (pattern) => {
      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);
      if (["white", "black", "red", "green", "blue"].includes(pattern)) {
        context.fillStyle = { white: "#fff", black: "#000", red: "#f00", green: "#0f0", blue: "#00f" }[pattern];
        context.fillRect(0, 0, width, height);
      } else if (pattern === "grid") {
        context.fillStyle = "#f8fafc";
        context.fillRect(0, 0, width, height);
        context.strokeStyle = "#111827";
        context.lineWidth = 1;
        for (let x = 0; x <= width; x += 40) line(context, x, 0, x, height);
        for (let y = 0; y <= height; y += 40) line(context, 0, y, width, y);
      } else {
        const gradient = context.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, "#000");
        gradient.addColorStop(0.2, "#f00");
        gradient.addColorStop(0.4, "#0f0");
        gradient.addColorStop(0.6, "#00f");
        gradient.addColorStop(0.8, "#fff");
        gradient.addColorStop(1, "#000");
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      }
    };
    $$("[data-pattern]").forEach((button) => button.addEventListener("click", () => draw(button.dataset.pattern)));
    $("#toggleDisplayFullscreen").addEventListener("click", () => {
      if (canvas.requestFullscreen) canvas.requestFullscreen();
    });
    draw("gradient");
  }

  function line(context, x1, y1, x2, y2) {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }

  function stat(label, value) {
    return `<div class="stat-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function resultBlock(title, subtitle, rows = []) {
    return [
      `<strong>${escapeHtml(title)}</strong>`,
      subtitle ? `<p>${escapeHtml(subtitle)}</p>` : "",
      rows.length ? `<dl>${rows.map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : ""
    ].join("");
  }

  function normalize(value) {
    return String(value || "").toLocaleLowerCase("ko").replace(/[·•._/\\-]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}());
