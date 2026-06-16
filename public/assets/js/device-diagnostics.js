(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  let audioContext = null;
  let micStream = null;
  let webcamStream = null;
  let micAnimation = 0;
  let gamepadAnimation = 0;

  if (document.body.matches('[data-page="device-diagnostics"]')) {
    initWorkbench();
    initAudio();
    initMic();
    initWebcam();
    initGamepad();
    initTouch();
    initSensors();
    initVibration();
  }

  function initWorkbench() {
    const buttons = $$("[data-device-target]");
    const panels = $$("[data-device-panel]");
    const filters = $$("[data-device-filter]");
    const search = $("#deviceSearch");
    let category = "all";

    const activate = (id, updateHash = true) => {
      if (!document.getElementById(id)?.matches("[data-device-panel]")) return;
      buttons.forEach((button) => button.classList.toggle("active", button.dataset.deviceTarget === id));
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
        const inCategory = category === "all" || button.dataset.category === category;
        const haystack = normalize(`${button.textContent} ${button.dataset.keywords || ""}`);
        const found = !query || query.split(" ").every((term) => haystack.includes(term));
        button.hidden = !(inCategory && found);
        if (!button.hidden) visible += 1;
      });
      $("#deviceEmpty").hidden = visible > 0;
    };

    buttons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.deviceTarget)));
    filters.forEach((button) => button.addEventListener("click", () => {
      category = button.dataset.deviceFilter || "all";
      filters.forEach((item) => item.classList.toggle("active", item === button));
      filter();
    }));
    search.addEventListener("input", filter);
    const initial = location.hash.slice(1);
    activate(document.getElementById(initial)?.matches("[data-device-panel]") ? initial : "sound-test", false);
    window.addEventListener("hashchange", () => activate(location.hash.slice(1), false));
  }

  function initAudio() {
    $$("[data-tone]").forEach((button) => button.addEventListener("click", () => {
      playTone(Number(button.dataset.tone), 0.8, Number(button.dataset.pan));
      setText("#soundStatus", `${button.textContent.trim()} 채널 재생`);
      setText("#headphoneStatus", `${button.textContent.trim()} 채널 재생`);
    }));
    $("#playBass").addEventListener("click", () => {
      playTone(Number($("#bassFrequency").value), Number($("#bassDuration").value), 0);
      setText("#bassStatus", `${$("#bassFrequency").value}Hz 재생 중`);
    });
    $("#playFrequency").addEventListener("click", () => {
      playTone(clamp(Number($("#freqTone").value), 20, 20000), 1, 0);
      setText("#freqStatus", `${$("#freqTone").value}Hz 톤 재생`);
    });
    $("#playSweep").addEventListener("click", () => {
      const context = getAudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.setValueAtTime(100, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(10000, context.currentTime + 4);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 4);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 4);
      setText("#freqStatus", "100Hz~10kHz 스윕 재생");
    });
    $("#playAlternating").addEventListener("click", () => {
      playTone(660, 0.45, -1);
      window.setTimeout(() => playTone(660, 0.45, 1), 520);
      setText("#headphoneStatus", "좌우 번갈아 재생");
    });
    $("#playSurround").addEventListener("click", () => {
      const context = getAudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const panner = context.createStereoPanner();
      oscillator.frequency.value = 520;
      gain.gain.value = 0.18;
      panner.pan.setValueAtTime(-1, context.currentTime);
      panner.pan.linearRampToValueAtTime(1, context.currentTime + 1.5);
      panner.pan.linearRampToValueAtTime(-1, context.currentTime + 3);
      oscillator.connect(gain).connect(panner).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 3);
      setText("#surroundStatus", "좌우 이동 톤 재생");
    });
  }

  function playTone(frequency, seconds, pan) {
    const context = getAudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    oscillator.frequency.value = clamp(frequency, 20, 20000);
    panner.pan.value = clamp(pan, -1, 1);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + seconds);
    oscillator.connect(gain).connect(panner).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + seconds + 0.02);
  }

  function getAudioContext() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  }

  function initMic() {
    $("#startMic").addEventListener("click", async () => {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const context = getAudioContext();
        const source = context.createMediaStreamSource(micStream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          const rms = Math.sqrt(data.reduce((sum, value) => {
            const centered = (value - 128) / 128;
            return sum + centered * centered;
          }, 0) / data.length);
          const percent = Math.min(100, Math.round(rms * 260));
          $("#micMeter").style.width = `${percent}%`;
          $("#micStats").innerHTML = [stat("입력 레벨", `${percent}%`), stat("상대 dB", `${Math.round(20 * Math.log10(Math.max(rms, 0.0001)))} dBFS`)].join("");
          micAnimation = requestAnimationFrame(tick);
        };
        tick();
      } catch (error) {
        $("#micStats").innerHTML = stat("오류", error.message);
      }
    });
    $("#stopMic").addEventListener("click", () => {
      cancelAnimationFrame(micAnimation);
      micStream?.getTracks().forEach((track) => track.stop());
      micStream = null;
    });
  }

  function initWebcam() {
    $("#startWebcam").addEventListener("click", async () => {
      try {
        webcamStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        $("#webcamVideo").srcObject = webcamStream;
        setText("#webcamStatus", "웹캠 미리보기 실행 중");
      } catch (error) {
        setText("#webcamStatus", `웹캠 오류: ${error.message}`);
      }
    });
    $("#captureWebcam").addEventListener("click", () => {
      const video = $("#webcamVideo");
      const canvas = $("#webcamCanvas");
      const context = canvas.getContext("2d");
      context.fillStyle = "#0f172a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      if (video.videoWidth) context.drawImage(video, 0, 0, canvas.width, canvas.height);
    });
    $("#stopWebcam").addEventListener("click", () => {
      webcamStream?.getTracks().forEach((track) => track.stop());
      webcamStream = null;
      $("#webcamVideo").srcObject = null;
      setText("#webcamStatus", "웹캠 중지");
    });
  }

  function initGamepad() {
    const render = () => {
      const pads = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean);
      if (!pads.length) {
        $("#gamepadResult").innerHTML = "<strong>게임패드를 찾지 못했습니다.</strong><p>컨트롤러 버튼을 누른 뒤 다시 스캔하세요.</p>";
      } else {
        $("#gamepadResult").innerHTML = pads.map((pad) => `<strong>${escapeHtml(pad.id)}</strong><dl><div><dt>버튼</dt><dd>${pad.buttons.map((button, index) => button.pressed ? index : "").filter(String).join(", ") || "-"}</dd></div><div><dt>축</dt><dd>${pad.axes.map((axis) => axis.toFixed(2)).join(" / ")}</dd></div></dl>`).join("");
      }
      gamepadAnimation = requestAnimationFrame(render);
    };
    $("#scanGamepad").addEventListener("click", () => {
      cancelAnimationFrame(gamepadAnimation);
      render();
    });
  }

  function initTouch() {
    const canvas = $("#touchCanvas");
    const context = canvas.getContext("2d");
    let count = 0;
    context.fillStyle = "#0f172a";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const draw = (event) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * canvas.width / rect.width;
      const y = (event.clientY - rect.top) * canvas.height / rect.height;
      count += 1;
      context.fillStyle = "#22c55e";
      context.beginPath();
      context.arc(x, y, 12, 0, Math.PI * 2);
      context.fill();
      $("#touchStats").innerHTML = [stat("입력", count), stat("마지막 좌표", `${Math.round(x)}, ${Math.round(y)}`)].join("");
    };
    canvas.addEventListener("pointerdown", draw);
    canvas.addEventListener("pointermove", (event) => {
      if (event.buttons) draw(event);
    });
    $("#clearTouch").addEventListener("click", () => {
      count = 0;
      context.fillStyle = "#0f172a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      $("#touchStats").innerHTML = stat("입력", 0);
    });
  }

  function initSensors() {
    $("#startMotion").addEventListener("click", async () => {
      await requestMotionPermission();
      window.addEventListener("devicemotion", (event) => {
        const a = event.accelerationIncludingGravity || {};
        $("#motionStats").innerHTML = [stat("X", fixed(a.x)), stat("Y", fixed(a.y)), stat("Z", fixed(a.z))].join("");
      });
      setText("#motionStatus", "모션 이벤트 대기 중");
    });
    $("#startGyro").addEventListener("click", async () => {
      await requestOrientationPermission();
      window.addEventListener("deviceorientation", (event) => {
        $("#gyroStats").innerHTML = [stat("Alpha", fixed(event.alpha)), stat("Beta", fixed(event.beta)), stat("Gamma", fixed(event.gamma))].join("");
      });
      setText("#gyroStatus", "방향 이벤트 대기 중");
    });
  }

  async function requestMotionPermission() {
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
      await DeviceMotionEvent.requestPermission();
    }
  }

  async function requestOrientationPermission() {
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      await DeviceOrientationEvent.requestPermission();
    }
  }

  function initVibration() {
    $$("[data-vibration]").forEach((button) => button.addEventListener("click", () => {
      if (!navigator.vibrate) {
        setText("#vibrationStatus", "이 브라우저는 Vibration API를 지원하지 않습니다.");
        return;
      }
      const value = button.dataset.vibration === "pattern" ? [100, 80, 100, 80, 220] : Number(button.dataset.vibration);
      navigator.vibrate(value);
      setText("#vibrationStatus", "진동 요청을 보냈습니다.");
    }));
  }

  function stat(label, value) {
    return `<div class="stat-card"><strong>${escapeHtml(value ?? "-")}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function setText(selector, text) {
    const element = $(selector);
    if (element) element.textContent = text;
  }

  function fixed(value) {
    return Number.isFinite(value) ? value.toFixed(2) : "-";
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
