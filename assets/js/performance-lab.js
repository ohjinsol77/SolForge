(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  let burnAnimation = 0;
  let dpiStart = null;
  let dpiDistance = 0;
  let dpiTracking = false;
  let dpiArmed = false;

  if (document.body.matches('[data-page="performance-lab"]')) {
    initWorkbench();
    initTools();
  }

  function initWorkbench() {
    const buttons = $$("[data-perf-target]");
    const panels = $$("[data-perf-panel]");
    const filters = $$("[data-perf-filter]");
    const search = $("#perfSearch");
    let activeFilter = "all";
    const activate = (id, updateHash = true) => {
      if (!document.getElementById(id)?.matches("[data-perf-panel]")) return;
      buttons.forEach((button) => button.classList.toggle("active", button.dataset.perfTarget === id));
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
        const inCategory = activeFilter === "all" || button.dataset.category === activeFilter;
        const found = inCategory && (!query || normalize(`${button.textContent} ${button.dataset.keywords || ""}`).includes(query));
        button.hidden = !found;
        if (found) visible += 1;
      });
      $("#perfEmpty").hidden = visible > 0;
    };
    buttons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.perfTarget)));
    filters.forEach((button) => button.addEventListener("click", () => {
      activeFilter = button.dataset.perfFilter;
      filters.forEach((item) => item.classList.toggle("active", item === button));
      filter();
    }));
    search.addEventListener("input", () => {
      filter();
    });
    const initial = location.hash.slice(1);
    activate(document.getElementById(initial)?.matches("[data-perf-panel]") ? initial : "cpu-test", false);
    filter();
    window.addEventListener("hashchange", () => activate(location.hash.slice(1), false));
  }

  function initTools() {
    $("#runCpuTest").addEventListener("click", cpuTest);
    $("#runGpuTest").addEventListener("click", gpuTest);
    $("#runRamTest").addEventListener("click", ramTest);
    ["bwSize", "bwUnit", "bwMbps"].forEach((id) => document.getElementById(id).addEventListener("input", bandwidth));
    $("#startDpiTraceButton").addEventListener("click", armDpiTrace);
    $("#resetDpiTrace").addEventListener("click", resetDpiTrace);
    $("#dpiTraceZone").addEventListener("pointerdown", startDpiTrace);
    $("#dpiTraceZone").addEventListener("pointermove", dpiTrace);
    $("#dpiTraceZone").addEventListener("pointerup", finishDpiTrace);
    $("#dpiTraceZone").addEventListener("pointercancel", finishDpiTrace);
    $("#toggleBurnIn").addEventListener("click", toggleBurnIn);
    $("#refreshResolution").addEventListener("click", resolution);
    $("#runRtcTest").addEventListener("click", rtcTest);
    bandwidth();
    resetDpiTrace();
    resolution();
    drawBurn(0);
  }

  async function cpuTest() {
    const button = $("#runCpuTest");
    button.disabled = true;
    button.textContent = "진행 중";
    const start = performance.now();
    let operations = 0;
    let value = 0;
    const durationMs = 1200;
    setProgress("cpuProgress", "#cpuStats", "CPU 계산 진행률", 0);
    while (performance.now() - start < durationMs) {
      for (let chunk = 0; chunk < 18; chunk += 1) {
        for (let i = 1; i < 5000; i += 1) value += Math.sqrt(i + value % 17);
        operations += 5000;
      }
      setProgress("cpuProgress", "#cpuStats", "CPU 계산 진행률", (performance.now() - start) / durationMs * 100);
      await frame();
    }
    const elapsed = performance.now() - start;
    renderStats("#cpuStats", [["연산", operations.toLocaleString("ko-KR")], ["시간", `${elapsed.toFixed(0)}ms`], ["ms당 연산", Math.round(operations / elapsed).toLocaleString("ko-KR")]]);
    setProgress("cpuProgress", "#cpuStats", "CPU 계산 완료", 100);
    button.disabled = false;
    button.textContent = "실행";
  }

  function gpuTest() {
    const button = $("#runGpuTest");
    button.disabled = true;
    button.textContent = "진행 중";
    const canvas = $("#gpuCanvas");
    const context = canvas.getContext("2d");
    const particles = Array.from({ length: 420 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: Math.random() * 6 - 3, vy: Math.random() * 6 - 3, r: 2 + Math.random() * 7 }));
    const frames = [];
    const start = performance.now();
    const durationMs = 1800;
    setProgress("gpuProgress", "#gpuStats", "Canvas 렌더링 진행률", 0);
    const draw = (now) => {
      frames.push(now);
      context.fillStyle = "rgba(15, 23, 42, 0.22)";
      context.fillRect(0, 0, canvas.width, canvas.height);
      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
        context.fillStyle = `hsl(${(particle.x + particle.y) % 360}, 85%, 58%)`;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        context.fill();
      }
      setProgress("gpuProgress", "#gpuStats", "Canvas 렌더링 진행률", (now - start) / durationMs * 100);
      if (now - start < durationMs) requestAnimationFrame(draw);
      else {
        renderStats("#gpuStats", [["프레임", frames.length], ["추정 FPS", Math.round(frames.length / (durationMs / 1000))], ["입자", particles.length]]);
        setProgress("gpuProgress", "#gpuStats", "Canvas 렌더링 완료", 100);
        button.disabled = false;
        button.textContent = "실행";
      }
    };
    requestAnimationFrame(draw);
  }

  async function ramTest() {
    const button = $("#runRamTest");
    button.disabled = true;
    button.textContent = "진행 중";
    const sizeMb = clamp(Number($("#ramTestSize").value) || 64, 4, 256);
    const start = performance.now();
    const bytes = sizeMb * 1024 * 1024;
    const buffer = new Uint8Array(bytes);
    setProgress("ramProgress", "#ramTestStats", "메모리 쓰기 진행률", 0);
    for (let i = 0; i < buffer.length; i += 4096) {
      buffer[i] = i % 251;
      if (i % (4096 * 512) === 0) {
        setProgress("ramProgress", "#ramTestStats", "메모리 쓰기 진행률", i / buffer.length * 50);
        await frame();
      }
    }
    let checksum = 0;
    for (let i = 0; i < buffer.length; i += 4096) {
      checksum = (checksum + buffer[i]) % 100000;
      if (i % (4096 * 512) === 0) {
        setProgress("ramProgress", "#ramTestStats", "메모리 검증 진행률", 50 + i / buffer.length * 50);
        await frame();
      }
    }
    const elapsed = performance.now() - start;
    renderStats("#ramTestStats", [["크기", `${sizeMb}MB`], ["시간", `${elapsed.toFixed(1)}ms`], ["체크섬", checksum]]);
    setProgress("ramProgress", "#ramTestStats", "메모리 테스트 완료", 100);
    button.disabled = false;
    button.textContent = "실행";
  }

  function bandwidth() {
    const mb = positive("#bwSize") * Number($("#bwUnit").value);
    const mbps = positive("#bwMbps");
    const seconds = mb * 8 / mbps;
    $("#bwResult").innerHTML = resultBlock(duration(seconds), `${format(mb)} MB 전송 기준`, [["대역폭", `${format(mbps)} Mbps`], ["초당 전송량", `${format(mbps / 8)} MB/s`], ["1시간 전송량", `${format(mbps / 8 * 3600 / 1024)} GB`]]);
  }

  function resetDpiTrace() {
    dpiStart = null;
    dpiDistance = 0;
    dpiTracking = false;
    dpiArmed = false;
    $("#dpiTraceZone").textContent = "여기를 누른 상태로 입력한 거리만큼 수평 이동하세요.";
    renderStats("#dpiTraceStats", [["픽셀 이동", 0], ["추정 DPI", "-"], ["상태", "대기"]]);
  }

  function armDpiTrace() {
    dpiStart = null;
    dpiDistance = 0;
    dpiTracking = false;
    dpiArmed = true;
    $("#dpiTraceZone").textContent = "시작 지점을 누른 채 실제 거리만큼 수평 이동하세요.";
    renderStats("#dpiTraceStats", [["픽셀 이동", 0], ["추정 DPI", "-"], ["상태", "준비됨"]]);
  }

  function startDpiTrace(event) {
    if (!dpiArmed) armDpiTrace();
    dpiStart = { x: event.clientX, y: event.clientY };
    dpiDistance = 0;
    dpiTracking = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    $("#dpiTraceZone").textContent = "누른 상태로 실제 거리만큼 이동한 뒤 버튼을 떼세요.";
    renderStats("#dpiTraceStats", [["픽셀 이동", 0], ["추정 DPI", "-"], ["상태", "측정 중"]]);
  }

  function dpiTrace(event) {
    if (!dpiStart || !dpiTracking) return;
    dpiDistance = Math.max(dpiDistance, Math.hypot(event.clientX - dpiStart.x, event.clientY - dpiStart.y));
    const inches = positive("#dpiCm") / 2.54;
    const dpi = dpiDistance / inches;
    renderStats("#dpiTraceStats", [["픽셀 이동", Math.round(dpiDistance)], ["추정 DPI", Math.round(dpi)], ["상태", "측정 중"]]);
  }

  function finishDpiTrace() {
    if (!dpiStart) return;
    dpiTracking = false;
    dpiArmed = false;
    const inches = positive("#dpiCm") / 2.54;
    const dpi = dpiDistance / inches;
    $("#dpiTraceZone").textContent = "결과를 유지합니다. 다시 측정하려면 초기화를 누르세요.";
    renderStats("#dpiTraceStats", [["픽셀 이동", Math.round(dpiDistance)], ["추정 DPI", dpiDistance ? Math.round(dpi) : "-"], ["상태", "완료"]]);
  }

  function toggleBurnIn() {
    if (burnAnimation) {
      cancelAnimationFrame(burnAnimation);
      burnAnimation = 0;
      $("#toggleBurnIn").textContent = "시작";
    } else {
      $("#toggleBurnIn").textContent = "중지";
      animateBurn();
    }
  }

  function animateBurn(start = performance.now()) {
    drawBurn(performance.now() - start);
    burnAnimation = requestAnimationFrame(() => animateBurn(start));
  }

  function drawBurn(elapsed) {
    const canvas = $("#burnCanvas");
    const context = canvas.getContext("2d");
    const hue = (elapsed / 24) % 360;
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, `hsl(${hue}, 100%, 50%)`);
    gradient.addColorStop(0.5, `hsl(${(hue + 120) % 360}, 100%, 50%)`);
    gradient.addColorStop(1, `hsl(${(hue + 240) % 360}, 100%, 50%)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  function resolution() {
    renderStats("#resolutionStats", [
      ["뷰포트", `${innerWidth}×${innerHeight}`],
      ["화면", `${screen.width}×${screen.height}`],
      ["사용 가능", `${screen.availWidth}×${screen.availHeight}`],
      ["DPR", devicePixelRatio.toFixed(2)],
      ["색심도", `${screen.colorDepth}bit`]
    ]);
  }

  async function rtcTest() {
    const out = $("#rtcOutput");
    if (!window.RTCPeerConnection) {
      out.value = "RTCPeerConnection을 지원하지 않습니다.";
      return;
    }
    out.value = "후보 수집 중...";
    const pc = new RTCPeerConnection({ iceServers: [] });
    const candidates = [];
    pc.createDataChannel("solforge");
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        candidates.push(event.candidate.candidate);
        out.value = candidates.join("\n");
      }
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    window.setTimeout(() => {
      if (!candidates.length) out.value = "로컬 ICE 후보가 노출되지 않았습니다. 최신 브라우저에서는 mDNS나 정책으로 숨겨질 수 있습니다.";
      pc.close();
    }, 1500);
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
    const safePercent = clamp(percent, 0, 100);
    panel.hidden = false;
    panel.querySelector("header span").textContent = label;
    panel.querySelector("header strong").textContent = `${Math.round(safePercent)}%`;
    panel.querySelector(".progress-track span").style.setProperty("--progress", `${safePercent}%`);
  }

  function resultBlock(title, subtitle, rows) {
    return `<div class="result-main"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(subtitle)}</span></div><dl class="result-list">${rows.map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
  }

  function frame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }

  function duration(seconds) {
    const total = Math.max(0, Math.round(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rest = total % 60;
    return hours ? `${hours}시간 ${minutes}분 ${rest}초` : minutes ? `${minutes}분 ${rest}초` : `${rest}초`;
  }

  function positive(selector) {
    return Math.max(0.000001, Number($(selector).value) || 0.000001);
  }

  function format(value) {
    return Number(value).toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
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
