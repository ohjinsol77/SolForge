(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  let burnAnimation = 0;

  if (document.body.matches('[data-page="performance-lab"]')) {
    initWorkbench();
    initTools();
  }

  function initWorkbench() {
    const buttons = $$("[data-perf-target]");
    const panels = $$("[data-perf-panel]");
    const search = $("#perfSearch");
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
    buttons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.perfTarget)));
    search.addEventListener("input", () => {
      const query = normalize(search.value);
      let visible = 0;
      buttons.forEach((button) => {
        const found = !query || normalize(`${button.textContent} ${button.dataset.keywords || ""}`).includes(query);
        button.hidden = !found;
        if (found) visible += 1;
      });
      $("#perfEmpty").hidden = visible > 0;
    });
    const initial = location.hash.slice(1);
    activate(document.getElementById(initial)?.matches("[data-perf-panel]") ? initial : "cpu-test", false);
    window.addEventListener("hashchange", () => activate(location.hash.slice(1), false));
  }

  function initTools() {
    $("#runCpuTest").addEventListener("click", cpuTest);
    $("#runGpuTest").addEventListener("click", gpuTest);
    $("#runRamTest").addEventListener("click", ramTest);
    ["bwSize", "bwUnit", "bwMbps"].forEach((id) => document.getElementById(id).addEventListener("input", bandwidth));
    $("#resetDpiTrace").addEventListener("click", resetDpiTrace);
    $("#dpiTraceZone").addEventListener("pointerdown", resetDpiTrace);
    $("#dpiTraceZone").addEventListener("pointermove", dpiTrace);
    $("#toggleBurnIn").addEventListener("click", toggleBurnIn);
    $("#refreshResolution").addEventListener("click", resolution);
    $("#runRtcTest").addEventListener("click", rtcTest);
    bandwidth();
    resetDpiTrace();
    resolution();
    drawBurn(0);
  }

  function cpuTest() {
    const start = performance.now();
    let operations = 0;
    let value = 0;
    while (performance.now() - start < 1200) {
      for (let i = 1; i < 5000; i += 1) value += Math.sqrt(i + value % 17);
      operations += 5000;
    }
    const elapsed = performance.now() - start;
    renderStats("#cpuStats", [["연산", operations.toLocaleString("ko-KR")], ["시간", `${elapsed.toFixed(0)}ms`], ["점수", Math.round(operations / elapsed).toLocaleString("ko-KR")]]);
  }

  function gpuTest() {
    const canvas = $("#gpuCanvas");
    const context = canvas.getContext("2d");
    const particles = Array.from({ length: 420 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: Math.random() * 6 - 3, vy: Math.random() * 6 - 3, r: 2 + Math.random() * 7 }));
    const frames = [];
    const start = performance.now();
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
      if (now - start < 1800) requestAnimationFrame(draw);
      else renderStats("#gpuStats", [["프레임", frames.length], ["추정 FPS", Math.round(frames.length / 1.8)], ["입자", particles.length]]);
    };
    requestAnimationFrame(draw);
  }

  function ramTest() {
    const sizeMb = clamp(Number($("#ramTestSize").value) || 64, 4, 256);
    const start = performance.now();
    const bytes = sizeMb * 1024 * 1024;
    const buffer = new Uint8Array(bytes);
    for (let i = 0; i < buffer.length; i += 4096) buffer[i] = i % 251;
    let checksum = 0;
    for (let i = 0; i < buffer.length; i += 4096) checksum = (checksum + buffer[i]) % 100000;
    const elapsed = performance.now() - start;
    renderStats("#ramTestStats", [["크기", `${sizeMb}MB`], ["시간", `${elapsed.toFixed(1)}ms`], ["체크섬", checksum]]);
  }

  function bandwidth() {
    const mb = positive("#bwSize") * Number($("#bwUnit").value);
    const mbps = positive("#bwMbps");
    const seconds = mb * 8 / mbps;
    $("#bwResult").innerHTML = resultBlock(duration(seconds), `${format(mb)} MB 전송`, [["속도", `${format(mbps)} Mbps`], ["MB/s", format(mbps / 8)], ["1시간 전송량", `${format(mbps / 8 * 3600 / 1024)} GB`]]);
  }

  let dpiStart = null;
  let dpiDistance = 0;
  function resetDpiTrace(event) {
    dpiStart = event ? { x: event.clientX, y: event.clientY } : null;
    dpiDistance = 0;
    renderStats("#dpiTraceStats", [["픽셀 이동", 0], ["추정 DPI", "-"]]);
  }

  function dpiTrace(event) {
    if (!dpiStart) return;
    dpiDistance = Math.max(dpiDistance, Math.hypot(event.clientX - dpiStart.x, event.clientY - dpiStart.y));
    const inches = positive("#dpiCm") / 2.54;
    const dpi = dpiDistance / inches;
    renderStats("#dpiTraceStats", [["픽셀 이동", Math.round(dpiDistance)], ["추정 DPI", Math.round(dpi)]]);
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

  function resultBlock(title, subtitle, rows) {
    return `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(subtitle)}</p><dl>${rows.map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
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
