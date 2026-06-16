(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  let ghostingAnimation = 0;

  if (document.body.matches('[data-page="display-diagnostics"]')) {
    initWorkbench();
    initPatterns();
    initMotion();
  }

  function initWorkbench() {
    const buttons = $$("[data-display-target]");
    const panels = $$("[data-display-panel]");
    const search = $("#displaySearch");
    const activate = (id, updateHash = true) => {
      if (!document.getElementById(id)?.matches("[data-display-panel]")) return;
      buttons.forEach((button) => button.classList.toggle("active", button.dataset.displayTarget === id));
      panels.forEach((panel) => {
        const active = panel.id === id;
        panel.hidden = !active;
        panel.classList.toggle("active", active);
      });
      if (updateHash) history.replaceState(null, "", `#${id}`);
    };
    buttons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.displayTarget)));
    search.addEventListener("input", () => {
      const query = normalize(search.value);
      let visible = 0;
      buttons.forEach((button) => {
        const found = !query || normalize(`${button.textContent} ${button.dataset.keywords || ""}`).includes(query);
        button.hidden = !found;
        if (found) visible += 1;
      });
      $("#displayEmpty").hidden = visible > 0;
    });
    const initial = location.hash.slice(1);
    activate(document.getElementById(initial)?.matches("[data-display-panel]") ? initial : "dead-pixel", false);
    window.addEventListener("hashchange", () => activate(location.hash.slice(1), false));
  }

  function initPatterns() {
    const colors = [["흰색", "#fff"], ["검정", "#000"], ["빨강", "#f00"], ["초록", "#0f0"], ["파랑", "#00f"], ["회색", "#808080"]];
    $("[data-solid-buttons]").innerHTML = colors.map(([label, color]) => `<button type="button" data-solid="${color}">${label}</button>`).join("");
    $$("[data-solid]").forEach((button) => button.addEventListener("click", () => solid("deadPixelCanvas", button.dataset.solid)));
    $$("[data-fullscreen]").forEach((button) => button.addEventListener("click", () => document.getElementById(button.dataset.fullscreen)?.requestFullscreen?.()));
    solid("deadPixelCanvas", "#fff");
    solid("backlightCanvas", "#000");
    steps("blackLevelCanvas", 0, 48);
    steps("whiteLevelCanvas", 208, 255);
    steps("brightnessCanvas", 0, 255);
    contrast();
    gamma();
    colorRange();
    uniformity();
  }

  function solid(id, color) {
    const { canvas, context } = getCanvas(id);
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  function steps(id, start, end) {
    const { canvas, context } = getCanvas(id);
    const count = 16;
    for (let i = 0; i < count; i += 1) {
      const value = Math.round(start + (end - start) * i / (count - 1));
      context.fillStyle = `rgb(${value},${value},${value})`;
      context.fillRect(i * canvas.width / count, 0, canvas.width / count + 1, canvas.height);
      context.fillStyle = value > 128 ? "#111" : "#fff";
      context.font = "24px sans-serif";
      context.fillText(String(value), i * canvas.width / count + 12, canvas.height - 24);
    }
  }

  function contrast() {
    const { canvas, context } = getCanvas("contrastCanvas");
    const size = 60;
    for (let y = 0; y < canvas.height; y += size) {
      for (let x = 0; x < canvas.width; x += size) {
        context.fillStyle = ((x / size + y / size) % 2) ? "#000" : "#fff";
        context.fillRect(x, y, size, size);
      }
    }
    context.fillStyle = "rgba(127,127,127,0.85)";
    context.fillRect(120, 160, canvas.width - 240, 220);
  }

  function gamma() {
    const { canvas, context } = getCanvas("gammaCanvas");
    context.fillStyle = "#777";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let x = 0; x < canvas.width; x += 8) {
      context.fillStyle = x % 16 === 0 ? "#555" : "#999";
      context.fillRect(x, 0, 8, canvas.height);
    }
    context.fillStyle = "rgba(127,127,127,0.95)";
    context.fillRect(0, canvas.height / 3, canvas.width, canvas.height / 3);
  }

  function colorRange() {
    const { canvas, context } = getCanvas("colorRangeCanvas");
    const bands = [["#f00", "#000"], ["#0f0", "#000"], ["#00f", "#000"], ["#fff", "#000"]];
    bands.forEach(([from, to], index) => {
      const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, to);
      gradient.addColorStop(1, from);
      context.fillStyle = gradient;
      context.fillRect(0, index * canvas.height / bands.length, canvas.width, canvas.height / bands.length);
    });
  }

  function uniformity() {
    const { canvas, context } = getCanvas("uniformityCanvas");
    context.fillStyle = "#b8b8b8";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(0,0,0,0.22)";
    context.lineWidth = 2;
    for (let x = 0; x <= canvas.width; x += canvas.width / 4) line(context, x, 0, x, canvas.height);
    for (let y = 0; y <= canvas.height; y += canvas.height / 3) line(context, 0, y, canvas.width, y);
  }

  function initMotion() {
    $("#toggleGhosting").addEventListener("click", () => {
      if (ghostingAnimation) {
        cancelAnimationFrame(ghostingAnimation);
        ghostingAnimation = 0;
        $("#toggleGhosting").textContent = "시작";
      } else {
        $("#toggleGhosting").textContent = "중지";
        animateGhosting();
      }
    });
    $("#startFrameSkip").addEventListener("click", frameSkipping);
    $("#measureFps").addEventListener("click", measureFps);
    measureFps();
    drawFrameBase();
    drawGhostingBase(0);
  }

  function animateGhosting(start = performance.now()) {
    const elapsed = performance.now() - start;
    drawGhostingBase(elapsed);
    ghostingAnimation = requestAnimationFrame(() => animateGhosting(start));
  }

  function drawGhostingBase(elapsed) {
    const { canvas, context } = getCanvas("ghostingCanvas");
    context.fillStyle = "#111827";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const x = (elapsed / 2) % (canvas.width + 140) - 140;
    for (let i = 0; i < 6; i += 1) {
      context.fillStyle = `rgba(34,197,94,${0.16 + i * 0.12})`;
      context.fillRect(x - i * 28, 190, 120, 120);
    }
  }

  function frameSkipping() {
    const { canvas, context } = getCanvas("frameCanvas");
    drawFrameBase();
    const samples = [];
    const start = performance.now();
    const tick = (now) => {
      samples.push(now);
      const x = ((now - start) / 2000) * canvas.width;
      context.fillStyle = "#22c55e";
      context.beginPath();
      context.arc(x, canvas.height / 2, 6, 0, Math.PI * 2);
      context.fill();
      if (now - start < 2000) requestAnimationFrame(tick);
      else {
        const gaps = samples.slice(1).map((value, index) => value - samples[index]);
        const max = Math.max(...gaps);
        $("#frameStats").innerHTML = [stat("프레임", samples.length), stat("최대 간격", `${max.toFixed(1)}ms`), stat("추정 FPS", Math.round(samples.length / 2))].join("");
      }
    };
    requestAnimationFrame(tick);
  }

  function drawFrameBase() {
    const { canvas, context } = getCanvas("frameCanvas");
    context.fillStyle = "#0f172a";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(255,255,255,0.18)";
    for (let x = 0; x < canvas.width; x += 48) line(context, x, 0, x, canvas.height);
  }

  function measureFps() {
    const samples = [];
    const start = performance.now();
    const tick = (now) => {
      samples.push(now);
      if (now - start < 1200) requestAnimationFrame(tick);
      else {
        const gaps = samples.slice(1).map((value, index) => value - samples[index]);
        const average = gaps.reduce((sum, value) => sum + value, 0) / gaps.length;
        $("#fpsStats").innerHTML = [
          stat("추정 FPS", Math.round(1000 / average)),
          stat("평균 간격", `${average.toFixed(2)}ms`),
          stat("뷰포트", `${innerWidth}×${innerHeight}`),
          stat("화면", `${screen.width}×${screen.height}`),
          stat("DPR", devicePixelRatio.toFixed(2))
        ].join("");
      }
    };
    requestAnimationFrame(tick);
  }

  function getCanvas(id) {
    const canvas = document.getElementById(id);
    return { canvas, context: canvas.getContext("2d") };
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
