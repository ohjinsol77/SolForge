(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  let audioContext = null;

  if (document.body.matches('[data-page="input-training"]')) {
    initWorkbench();
    initAuditory();
    initMemory();
    initTyping();
    initWasd();
    initKeyboardTools();
    initMouseTools();
  }

  function initWorkbench() {
    const buttons = $$("[data-input-target]");
    const panels = $$("[data-input-panel]");
    const filters = $$("[data-input-filter]");
    const search = $("#inputSearch");
    let category = "all";
    const activate = (id, updateHash = true) => {
      if (!document.getElementById(id)?.matches("[data-input-panel]")) return;
      buttons.forEach((button) => button.classList.toggle("active", button.dataset.inputTarget === id));
      panels.forEach((panel) => {
        const active = panel.id === id;
        panel.hidden = !active;
        panel.classList.toggle("active", active);
      });
      if (updateHash) history.replaceState(null, "", `#${id}`);
    };
    const filter = () => {
      const query = normalize(search.value);
      let visible = 0;
      buttons.forEach((button) => {
        const okCategory = category === "all" || button.dataset.category === category;
        const okQuery = !query || normalize(`${button.textContent} ${button.dataset.keywords || ""}`).includes(query);
        button.hidden = !(okCategory && okQuery);
        if (!button.hidden) visible += 1;
      });
      $("#inputEmpty").hidden = visible > 0;
    };
    buttons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.inputTarget)));
    filters.forEach((button) => button.addEventListener("click", () => {
      category = button.dataset.inputFilter || "all";
      filters.forEach((item) => item.classList.toggle("active", item === button));
      filter();
    }));
    search.addEventListener("input", filter);
    const initial = location.hash.slice(1);
    activate(document.getElementById(initial)?.matches("[data-input-panel]") ? initial : "auditory-reaction", false);
    window.addEventListener("hashchange", () => activate(location.hash.slice(1), false));
  }

  function initAuditory() {
    const scores = [];
    let readyAt = 0;
    let waiting = false;
    $("#startAuditory").addEventListener("click", () => {
      waiting = true;
      $("#auditoryPad").className = "reaction-pad armed";
      $("#auditoryPad").innerHTML = "<strong>듣는 중</strong><span>삐 소리를 기다리세요</span>";
      window.setTimeout(() => {
        playTone(880, 0.18);
        readyAt = performance.now();
        $("#auditoryPad").className = "reaction-pad ready";
        $("#auditoryPad").innerHTML = "<strong>클릭!</strong><span>지금 클릭하세요</span>";
      }, 900 + Math.random() * 2600);
    });
    $("#auditoryPad").addEventListener("click", () => {
      if (!waiting || !readyAt) return;
      const score = Math.round(performance.now() - readyAt);
      scores.push(score);
      waiting = false;
      readyAt = 0;
      $("#auditoryPad").className = "reaction-pad waiting";
      $("#auditoryPad").innerHTML = `<strong>${score}ms</strong><span>다시 시작하세요</span>`;
      renderStats("#auditoryStats", [["시도", scores.length], ["최고", `${Math.min(...scores)}ms`], ["평균", `${Math.round(avg(scores))}ms`]]);
    });
  }

  function initMemory() {
    const sequence = [];
    let index = 0;
    let locked = true;
    const buttons = $$("[data-memory]");
    const flash = async (button) => {
      button.classList.add("active");
      await sleep(320);
      button.classList.remove("active");
      await sleep(120);
    };
    const playRound = async () => {
      locked = true;
      index = 0;
      sequence.push(Math.floor(Math.random() * 4));
      $("#memoryStatus").innerHTML = `<strong>${sequence.length}단계</strong><p>순서를 기억하세요.</p>`;
      await sleep(300);
      for (const step of sequence) await flash(buttons[step]);
      locked = false;
      $("#memoryStatus").innerHTML = `<strong>입력하세요</strong><p>${sequence.length}개 색상을 순서대로 누르세요.</p>`;
    };
    $("#startMemory").addEventListener("click", () => {
      sequence.length = 0;
      playRound();
    });
    buttons.forEach((button) => button.addEventListener("click", () => {
      if (locked || !sequence.length) return;
      const value = Number(button.dataset.memory);
      if (value !== sequence[index]) {
        $("#memoryStatus").innerHTML = `<strong>${sequence.length - 1}단계 성공</strong><p>다시 시작해보세요.</p>`;
        sequence.length = 0;
        locked = true;
        return;
      }
      index += 1;
      if (index === sequence.length) playRound();
    }));
  }

  function initTyping() {
    const prompts = [
      "SolForge keeps useful browser tools close at hand.",
      "정적 페이지에서도 충분히 많은 계산과 테스트를 실행할 수 있습니다.",
      "Fast aim, clean input, and steady rhythm make practice easier."
    ];
    let prompt = "";
    let start = 0;
    const reset = () => {
      prompt = prompts[Math.floor(Math.random() * prompts.length)];
      $("#typingPrompt").textContent = prompt;
      $("#typingInput").value = "";
      start = 0;
      renderStats("#typingStats", [["WPM", 0], ["정확도", "100%"], ["진행", "0%"]]);
    };
    $("#typingInput").addEventListener("input", () => {
      if (!start) start = performance.now();
      const input = $("#typingInput").value;
      const correct = input.split("").filter((char, index) => char === prompt[index]).length;
      const accuracy = input.length ? Math.round(correct / input.length * 100) : 100;
      const minutes = Math.max(0.01, (performance.now() - start) / 60000);
      const wpm = Math.round(input.length / 5 / minutes);
      renderStats("#typingStats", [["WPM", wpm], ["정확도", `${accuracy}%`], ["진행", `${Math.min(100, Math.round(input.length / prompt.length * 100))}%`]]);
    });
    $("#resetTyping").addEventListener("click", reset);
    reset();
  }

  function initWasd() {
    const keys = ["W", "A", "S", "D"];
    let current = "W";
    let start = 0;
    let hits = 0;
    let misses = 0;
    const next = () => {
      current = keys[Math.floor(Math.random() * keys.length)];
      $("#wasdPrompt").textContent = current;
      start = performance.now();
      $("#wasdPrompt").focus();
    };
    $("#startWasd").addEventListener("click", () => {
      hits = 0;
      misses = 0;
      next();
    });
    $("#wasdPrompt").addEventListener("keydown", (event) => {
      const key = event.key.toUpperCase();
      if (!keys.includes(key)) return;
      if (key === current) hits += 1;
      else misses += 1;
      const ms = Math.round(performance.now() - start);
      renderStats("#wasdStats", [["성공", hits], ["실패", misses], ["반응", `${ms}ms`]]);
      next();
    });
  }

  function initKeyboardTools() {
    clickCounter("#keyboardClickPad", "#keyboardClickStats", "#resetKeyboardClicker");
    let lastKey = "";
    let lastTime = 0;
    let doubles = 0;
    $("#keyDoublePad").addEventListener("keydown", (event) => {
      event.preventDefault();
      const now = performance.now();
      if (event.code === lastKey && now - lastTime <= Number($("#keyDoubleThreshold").value)) doubles += 1;
      lastKey = event.code;
      lastTime = now;
      $("#keyDoubleResult").innerHTML = `<strong>${doubles}회 감지</strong><p>마지막 키: ${escapeHtml(event.code)}</p>`;
    });
    const pressed = new Map();
    $("#ghostingPad").addEventListener("keydown", (event) => {
      event.preventDefault();
      pressed.set(event.code, event.key);
      renderGhosting();
    });
    $("#ghostingPad").addEventListener("keyup", (event) => {
      event.preventDefault();
      pressed.delete(event.code);
      renderGhosting();
    });
    function renderGhosting() {
      $("#ghostingKeys").innerHTML = Array.from(pressed.entries()).map(([code, key]) => `<span>${escapeHtml(key)} <small>${escapeHtml(code)}</small></span>`).join("");
    }
    latencyTool("#startKeyLatency", "#keyLatencyPad", "#keyLatencyStats", "keydown");
    const intervals = [];
    let last = 0;
    $("#keyPollingPad").addEventListener("keydown", (event) => {
      event.preventDefault();
      const now = performance.now();
      if (last) intervals.push(now - last);
      last = now;
      const recent = intervals.slice(-30);
      const average = recent.length ? avg(recent) : 0;
      renderStats("#keyPollingStats", [["샘플", intervals.length], ["평균 간격", average ? `${average.toFixed(1)}ms` : "-"], ["추정 Hz", average ? Math.round(1000 / average) : "-"]]);
    });
  }

  function initMouseTools() {
    aimTool("#startMouseAccuracy", "#accuracyArena", "#accuracyTarget", "#accuracyStats");
    canvasDraw("#dragCanvas", "#dragStats", "#clearDrag");
    driftTool();
    speedTool();
    latencyTool("#startMouseLatency", "#mouseLatencyPad", "#mouseLatencyStats", "click");
    spinTool();
    testerTool();
  }

  function clickCounter(padSelector, statsSelector, resetSelector) {
    let count = 0;
    let first = 0;
    let timer = null;
    let finished = false;
    const limit = 5;
    $(padSelector).addEventListener("keydown", (event) => {
      event.preventDefault();
      if (finished) return;
      if (!first) {
        first = performance.now();
        $(padSelector).textContent = "측정 중입니다.";
        timer = window.setInterval(() => {
          const elapsed = (performance.now() - first) / 1000;
          const remaining = Math.max(0, limit - elapsed);
          renderStats(statsSelector, [["입력", count], ["KPS", elapsed ? (count / elapsed).toFixed(2) : "0.00"], ["남은 시간", `${remaining.toFixed(1)}초`]]);
          if (elapsed >= limit) {
            window.clearInterval(timer);
            finished = true;
            $(padSelector).classList.add("finished");
            $(padSelector).textContent = "결과를 유지합니다. 다시 측정하려면 초기화를 누르세요.";
            renderStats(statsSelector, [["입력", count], ["KPS", (count / limit).toFixed(2)], ["상태", "완료"]]);
          }
        }, 80);
      }
      count += 1;
      const elapsed = Math.max(0.1, (performance.now() - first) / 1000);
      renderStats(statsSelector, [["입력", count], ["KPS", (count / elapsed).toFixed(2)], ["남은 시간", `${Math.max(0, limit - elapsed).toFixed(1)}초`]]);
    });
    $(resetSelector).addEventListener("click", () => {
      count = 0;
      first = 0;
      finished = false;
      window.clearInterval(timer);
      $(padSelector).classList.remove("finished");
      $(padSelector).textContent = "키를 누르세요.";
      renderStats(statsSelector, [["입력", 0], ["KPS", "0.00"], ["상태", "대기"]]);
    });
    renderStats(statsSelector, [["입력", 0], ["KPS", "0.00"], ["상태", "대기"]]);
  }

  function latencyTool(startSelector, padSelector, statsSelector, eventName) {
    let readyAt = 0;
    let scores = [];
    $(startSelector).addEventListener("click", () => {
      readyAt = 0;
      $(padSelector).className = "reaction-pad armed";
      $(padSelector).innerHTML = "<strong>기다리세요</strong><span>초록색이 되면 입력</span>";
      $(padSelector).focus?.();
      window.setTimeout(() => {
        readyAt = performance.now();
        $(padSelector).className = "reaction-pad ready";
        $(padSelector).innerHTML = "<strong>지금!</strong><span>입력하세요</span>";
      }, 800 + Math.random() * 2200);
    });
    $(padSelector).addEventListener(eventName, (event) => {
      event.preventDefault?.();
      if (!readyAt) return;
      const score = Math.round(performance.now() - readyAt);
      scores.push(score);
      readyAt = 0;
      $(padSelector).className = "reaction-pad waiting";
      $(padSelector).innerHTML = `<strong>${score}ms</strong><span>다시 시작</span>`;
      renderStats(statsSelector, [["시도", scores.length], ["최고", `${Math.min(...scores)}ms`], ["평균", `${Math.round(avg(scores))}ms`]]);
    });
  }

  function aimTool(startSelector, arenaSelector, targetSelector, statsSelector) {
    let hits = 0;
    let misses = 0;
    const place = () => {
      const arena = $(arenaSelector);
      const target = $(targetSelector);
      const rect = arena.getBoundingClientRect();
      target.style.width = "38px";
      target.style.height = "38px";
      target.style.left = `${Math.random() * Math.max(1, rect.width - 38)}px`;
      target.style.top = `${Math.random() * Math.max(1, rect.height - 38)}px`;
      target.hidden = false;
    };
    $(startSelector).addEventListener("click", () => {
      hits = 0;
      misses = 0;
      place();
      renderStats(statsSelector, [["명중", 0], ["실패", 0], ["명중률", "0%"]]);
    });
    $(targetSelector).addEventListener("click", (event) => {
      event.stopPropagation();
      hits += 1;
      place();
      renderStats(statsSelector, [["명중", hits], ["실패", misses], ["명중률", `${Math.round(hits / Math.max(1, hits + misses) * 100)}%`]]);
    });
    $(arenaSelector).addEventListener("click", () => {
      misses += 1;
      renderStats(statsSelector, [["명중", hits], ["실패", misses], ["명중률", `${Math.round(hits / Math.max(1, hits + misses) * 100)}%`]]);
    });
  }

  function canvasDraw(canvasSelector, statsSelector, clearSelector) {
    const canvas = $(canvasSelector);
    const context = canvas.getContext("2d");
    let drawing = false;
    let points = 0;
    const renderDragState = (status) => {
      renderStats(statsSelector, [["포인트", points], ["상태", status]]);
    };
    const reset = () => {
      context.fillStyle = "#0f172a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      points = 0;
      drawing = false;
      renderDragState("대기");
    };
    const pos = (event) => {
      const rect = canvas.getBoundingClientRect();
      return [(event.clientX - rect.left) * canvas.width / rect.width, (event.clientY - rect.top) * canvas.height / rect.height];
    };
    canvas.addEventListener("pointerdown", (event) => {
      drawing = true;
      canvas.setPointerCapture?.(event.pointerId);
      context.beginPath();
      context.moveTo(...pos(event));
      renderDragState("드래그 중");
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!drawing) return;
      context.strokeStyle = "#22c55e";
      context.lineWidth = 4;
      context.lineTo(...pos(event));
      context.stroke();
      points += 1;
      renderDragState("드래그 중");
    });
    const finishDrag = (event, status = "완료") => {
      if (!drawing) return;
      drawing = false;
      if (event?.pointerId !== undefined) canvas.releasePointerCapture?.(event.pointerId);
      renderDragState(points ? status : "대기");
    };
    canvas.addEventListener("pointerup", (event) => finishDrag(event));
    canvas.addEventListener("pointercancel", (event) => finishDrag(event, "취소"));
    canvas.addEventListener("lostpointercapture", () => {
      if (!drawing) return;
      drawing = false;
      renderDragState(points ? "완료" : "대기");
    });
    window.addEventListener("pointerup", (event) => finishDrag(event));
    $(clearSelector).addEventListener("click", reset);
    reset();
  }

  function driftTool() {
    let measuring = false;
    let moves = 0;
    let startedAt = 0;
    let timer = null;
    $("#startDrift").addEventListener("click", () => {
      measuring = true;
      moves = 0;
      startedAt = performance.now();
      setProgress("driftProgress", "#driftStats", "드리프트 측정 진행률", 0);
      renderStats("#driftStats", [["이동 이벤트", 0], ["상태", "측정 중"]]);
      window.clearInterval(timer);
      timer = window.setInterval(() => {
        const percent = (performance.now() - startedAt) / 5000 * 100;
        setProgress("driftProgress", "#driftStats", "드리프트 측정 진행률", percent);
        if (percent >= 100) {
          window.clearInterval(timer);
        }
      }, 80);
      window.setTimeout(() => {
        measuring = false;
        window.clearInterval(timer);
        renderStats("#driftStats", [["이동 이벤트", moves], ["상태", "완료"]]);
        setProgress("driftProgress", "#driftStats", "드리프트 측정 완료", 100);
      }, 5000);
    });
    $("#driftZone").addEventListener("pointermove", () => {
      if (measuring) moves += 1;
    });
  }

  function speedTool() {
    let last = null;
    let maxSpeed = 0;
    $("#speedZone").addEventListener("pointermove", (event) => {
      const now = performance.now();
      if (last) {
        const distance = Math.hypot(event.clientX - last.x, event.clientY - last.y);
        const speed = distance / Math.max(1, now - last.time) * 1000;
        maxSpeed = Math.max(maxSpeed, speed);
        renderStats("#speedStats", [["현재", `${Math.round(speed)} px/s`], ["최대", `${Math.round(maxSpeed)} px/s`]]);
      }
      last = { x: event.clientX, y: event.clientY, time: now };
    });
    $("#resetMouseSpeed").addEventListener("click", () => {
      last = null;
      maxSpeed = 0;
      renderStats("#speedStats", [["현재", "-"], ["최대", "-"]]);
    });
  }

  function spinTool() {
    const canvas = $("#spinCanvas");
    const context = canvas.getContext("2d");
    let lastAngle = null;
    let total = 0;
    const reset = () => {
      context.fillStyle = "#0f172a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#334155";
      context.beginPath();
      context.arc(canvas.width / 2, canvas.height / 2, 150, 0, Math.PI * 2);
      context.stroke();
      lastAngle = null;
      total = 0;
      renderStats("#spinStats", [["누적 각도", "0°"], ["회전", "0.00"]]);
    };
    canvas.addEventListener("pointermove", (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * canvas.width / rect.width - canvas.width / 2;
      const y = (event.clientY - rect.top) * canvas.height / rect.height - canvas.height / 2;
      const angle = Math.atan2(y, x);
      if (lastAngle !== null) {
        let diff = angle - lastAngle;
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        total += diff;
      }
      lastAngle = angle;
      renderStats("#spinStats", [["누적 각도", `${Math.round(total * 180 / Math.PI)}°`], ["회전", (Math.abs(total) / (Math.PI * 2)).toFixed(2)]]);
    });
    $("#resetSpin").addEventListener("click", reset);
    reset();
  }

  function testerTool() {
    const zone = $("#mouseTesterZone");
    let wheels = 0;
    const render = (event, extra = "") => {
      renderStats("#mouseTesterStats", [["버튼", event.buttons || event.button || 0], ["좌표", `${event.offsetX ?? "-"}, ${event.offsetY ?? "-"}`], ["휠", wheels], ["상태", extra || event.type]]);
    };
    ["pointermove", "pointerdown", "pointerup"].forEach((type) => zone.addEventListener(type, (event) => render(event)));
    zone.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      render(event, "우클릭");
    });
    zone.addEventListener("wheel", (event) => {
      event.preventDefault();
      wheels += Math.sign(event.deltaY);
      render(event, "휠");
    }, { passive: false });
  }

  function playTone(frequency, seconds) {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.16;
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + seconds);
  }

  function renderStats(selector, rows) {
    $(selector).innerHTML = rows.map(([label, value]) => `<div class="stat-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("");
  }

  function setProgress(id, anchorSelector, label, percent) {
    const anchor = $(anchorSelector);
    let panel = document.getElementById(id);
    if (!panel) {
      panel = document.createElement("div");
      panel.id = id;
      panel.className = "progress-panel";
      panel.innerHTML = '<header><span></span><strong>0%</strong></header><div class="progress-track"><span></span></div>';
      anchor.insertAdjacentElement("afterend", panel);
    }
    const safePercent = Math.min(100, Math.max(0, percent));
    panel.hidden = false;
    panel.querySelector("header span").textContent = label;
    panel.querySelector("header strong").textContent = `${Math.round(safePercent)}%`;
    panel.querySelector(".progress-track span").style.setProperty("--progress", `${safePercent}%`);
  }

  function avg(values) {
    return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function normalize(value) {
    return String(value || "").toLocaleLowerCase("ko").replace(/[·•._/\\-]+/g, " ").replace(/\s+/g, " ").trim();
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
