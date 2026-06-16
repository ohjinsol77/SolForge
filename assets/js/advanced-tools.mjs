import { GIFEncoder, quantize, applyPalette } from "../vendor/gifenc/gifenc.esm.js";

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DAY_MS = 86400000;

if (document.body.matches('[data-page="advanced-toolbox"]')) {
  initWorkbench();
  initCopy();
  initTime();
  initCode();
  initCrypto();
  initCodes();
  initAscii();
  initGif();
  initMagicEye();
  initBaseball();
  initScanner();
  initFlashlight();
}

function initWorkbench() {
  const buttons = $$("[data-advanced-target]");
  const panels = $$("[data-advanced-panel]");
  const search = $("#advancedSearch");
  const activate = (id, updateHash = true) => {
    if (!document.getElementById(id)?.matches("[data-advanced-panel]")) return;
    buttons.forEach((button) => button.classList.toggle("active", button.dataset.advancedTarget === id));
    panels.forEach((panel) => {
      const active = panel.id === id;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });
    if (updateHash) history.replaceState(null, "", `#${id}`);
  };
  buttons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.advancedTarget)));
  search.addEventListener("input", () => {
    const query = normalize(search.value);
    let visible = 0;
    buttons.forEach((button) => {
      const matches = !query || normalize(`${button.textContent} ${button.dataset.keywords || ""}`).includes(query);
      button.hidden = !matches;
      if (matches) visible += 1;
    });
    $("#advancedEmpty").hidden = visible > 0;
  });
  const initial = location.hash.slice(1);
  activate(document.getElementById(initial)?.matches("[data-advanced-panel]") ? initial : "time-tool", false);
  window.addEventListener("hashchange", () => activate(location.hash.slice(1), false));
}

function initCopy() {
  $$("[data-advanced-copy]").forEach((button) => button.addEventListener("click", async () => {
    const source = document.getElementById(button.dataset.advancedCopy);
    const value = source?.value ?? source?.textContent ?? "";
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast("복사했습니다.");
    } catch (_error) {
      toast("복사하지 못했습니다.");
    }
  }));
}

function initTime() {
  const now = new Date();
  const later = new Date(now.getTime() + 2 * 3600000 + 30 * 60000);
  $("#timeStart").value = localDateTime(now);
  $("#timeEnd").value = localDateTime(later);
  $("#timeBase").value = localDateTime(now);

  const renderDiff = () => {
    const start = new Date($("#timeStart").value);
    const end = new Date($("#timeEnd").value);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
    const difference = end.getTime() - start.getTime();
    const absolute = Math.abs(difference);
    $("#timeDiffResult").innerHTML = resultBlock(
      durationText(absolute),
      difference >= 0 ? "종료 시간이 더 늦습니다." : "시작 시간이 더 늦습니다.",
      [
        ["총 시간", `${formatDecimal(absolute / 3600000)}시간`],
        ["총 분", `${formatDecimal(absolute / 60000)}분`],
        ["총 초", `${formatDecimal(absolute / 1000)}초`]
      ]
    );
  };
  const renderMove = () => {
    const base = new Date($("#timeBase").value);
    const amount = Number($("#timeAmount").value) || 0;
    const unit = { seconds: 1000, minutes: 60000, hours: 3600000, days: DAY_MS }[$("#timeUnit").value];
    const direction = Number($("#timeDirection").value);
    const result = new Date(base.getTime() + amount * unit * direction);
    $("#timeMoveResult").innerHTML = resultBlock(
      result.toLocaleString("ko-KR"),
      `${amount} ${$("#timeUnit").selectedOptions[0].textContent} ${direction > 0 ? "더하기" : "빼기"}`,
      [["ISO", result.toISOString()]]
    );
  };
  const renderWork = () => {
    const [startHour, startMinute] = $("#workStart").value.split(":").map(Number);
    const [endHour, endMinute] = $("#workEnd").value.split(":").map(Number);
    let total = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    if (total < 0) total += 1440;
    const breakTime = Math.max(0, Number($("#workBreak").value) || 0);
    const net = Math.max(0, total - breakTime);
    $("#workResult").innerHTML = resultBlock(
      `${Math.floor(net / 60)}시간 ${net % 60}분`,
      "휴게시간 제외",
      [["총 체류", `${Math.floor(total / 60)}시간 ${total % 60}분`], ["휴게", `${breakTime}분`], ["십진 시간", `${(net / 60).toFixed(2)}시간`]]
    );
  };
  const renderConvert = () => {
    const seconds = (Number($("#timeConvertValue").value) || 0) * Number($("#timeConvertFrom").value);
    $("#timeConvertResult").innerHTML = resultBlock(
      `${formatDecimal(seconds)}초`,
      `${formatDecimal(seconds / 60)}분`,
      [["시간", formatDecimal(seconds / 3600)], ["일", formatDecimal(seconds / 86400)]]
    );
  };
  ["timeStart", "timeEnd"].forEach((id) => document.getElementById(id).addEventListener("input", renderDiff));
  ["timeBase", "timeAmount", "timeUnit", "timeDirection"].forEach((id) => document.getElementById(id).addEventListener("input", renderMove));
  ["workStart", "workEnd", "workBreak"].forEach((id) => document.getElementById(id).addEventListener("input", renderWork));
  ["timeConvertValue", "timeConvertFrom"].forEach((id) => document.getElementById(id).addEventListener("input", renderConvert));
  renderDiff();
  renderMove();
  renderWork();
  renderConvert();
}

function initCode() {
  const input = $("#codeInput");
  const output = $("#codeOutput");
  const language = $("#codeLanguage");
  const status = $("#codeStatus");
  const run = (minify) => {
    try {
      const value = input.value;
      let result;
      if (language.value === "json") {
        result = JSON.stringify(JSON.parse(value), null, minify ? 0 : 2);
      } else if (minify) {
        result = minifySource(value, language.value);
      } else {
        result = beautifySource(value, language.value);
      }
      output.value = result;
      const saved = Math.max(0, value.length - result.length);
      status.textContent = minify ? `${saved.toLocaleString()}자를 줄였습니다.` : "기본 들여쓰기를 적용했습니다.";
      status.className = "validation-message valid";
    } catch (error) {
      output.value = "";
      status.textContent = `변환 오류: ${error.message}`;
      status.className = "validation-message invalid";
    }
  };
  $("#beautifyCode").addEventListener("click", () => run(false));
  $("#minifyCode").addEventListener("click", () => run(true));
  language.addEventListener("change", () => {
    const samples = {
      json: '{"name":"SolForge","static":true,"tools":59}',
      css: "body{margin:0;color:#111}.card{padding:16px;border:1px solid #ddd}",
      javascript: "function sum(a,b){const result=a+b;return result;}console.log(sum(1,2));",
      html: "<main><section><h1>SolForge</h1><p>Static tools</p></section></main>",
      sql: "select u.id,u.name from users u where u.status='active' order by u.id desc;"
    };
    input.value = samples[language.value];
    run(false);
  });
  run(false);
}

function initCrypto() {
  $("#runHash").addEventListener("click", async () => {
    const digest = await crypto.subtle.digest($("#hashAlgorithm").value, encoder.encode($("#hashInput").value));
    $("#hashOutput").value = bufferToHex(digest);
  });
  $("#runHmac").addEventListener("click", async () => {
    const key = await crypto.subtle.importKey("raw", encoder.encode($("#hmacSecret").value), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode($("#hmacInput").value));
    $("#hmacOutput").value = bufferToHex(signature);
  });
  $("#runPbkdf").addEventListener("click", async () => {
    const bits = await deriveBits($("#pbkdfPassword").value, encoder.encode($("#pbkdfSalt").value), Number($("#pbkdfIterations").value) || 100000, 256);
    $("#pbkdfOutput").value = bufferToHex(bits);
  });
  $("#aesEncrypt").addEventListener("click", async () => {
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveAesKey($("#aesPassword").value, salt);
      const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode($("#aesInput").value));
      $("#aesOutput").value = JSON.stringify({
        algorithm: "AES-GCM",
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        data: bytesToBase64(new Uint8Array(cipher))
      });
    } catch (error) {
      $("#aesOutput").value = `암호화 오류: ${error.message}`;
    }
  });
  $("#aesDecrypt").addEventListener("click", async () => {
    try {
      const payload = JSON.parse($("#aesOutput").value);
      const salt = base64ToBytes(payload.salt);
      const iv = base64ToBytes(payload.iv);
      const key = await deriveAesKey($("#aesPassword").value, salt);
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, base64ToBytes(payload.data));
      $("#aesInput").value = decoder.decode(plain);
      toast("복호화했습니다.");
    } catch (error) {
      toast(`복호화 실패: ${error.message}`);
    }
  });
}

function initCodes() {
  const canvas = $("#codeCanvas");
  const download = $("#codeDownload");
  const status = $("#codeImageStatus");
  const render = () => {
    const value = $("#codeValue").value.trim();
    if (!value) {
      canvas.width = 0;
      canvas.height = 0;
      download.removeAttribute("href");
      status.textContent = "이미지로 만들 내용을 입력하세요.";
      status.className = "validation-message invalid";
      return;
    }
    try {
      if ($("#codeType").value === "qr") {
        drawQr(canvas, value, $("#qrLevel").value, Number($("#codeScale").value) || 6);
        status.textContent = `QR 이미지를 생성했습니다. ${canvas.width} x ${canvas.height}px`;
      } else {
        const meta = drawCode39(canvas, value, Number($("#codeScale").value) || 6);
        const notes = [];
        if (meta.removedCount) notes.push(`지원하지 않는 문자 ${meta.removedCount}개 제외`);
        if (meta.scale !== meta.requestedScale) notes.push(`긴 입력이라 크기를 ${meta.scale}로 자동 조정`);
        status.textContent = [`Code 39 이미지를 생성했습니다. ${meta.width} x ${meta.height}px`, ...notes].join(" · ");
      }
      download.href = canvas.toDataURL("image/png");
      status.className = "validation-message valid";
    } catch (error) {
      canvas.width = 0;
      canvas.height = 0;
      download.removeAttribute("href");
      status.textContent = error.message;
      status.className = "validation-message invalid";
    }
  };
  $("#generateCodeImage").addEventListener("click", render);
  $("#codeType").addEventListener("change", () => {
    $("#qrLevel").disabled = $("#codeType").value !== "qr";
    render();
  });
  render();
}

function initAscii() {
  $("#generateTextAscii").addEventListener("click", () => {
    const text = $("#asciiText").value.trim() || "SOLFORGE";
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = "bold 42px monospace";
    const width = Math.ceil(context.measureText(text).width) + 20;
    canvas.width = width;
    canvas.height = 64;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, 64);
    context.font = "bold 42px monospace";
    context.fillStyle = "#000";
    context.fillText(text, 10, 47);
    $("#asciiOutput").value = imageDataToAscii(context.getImageData(0, 0, width, 64), Math.min(120, Math.ceil(width / 5)), true);
  });
  $("#generateImageAscii").addEventListener("click", async () => {
    const file = $("#asciiImageFile").files?.[0];
    if (!file) {
      toast("이미지 파일을 선택하세요.");
      return;
    }
    const bitmap = await createImageBitmap(file);
    const width = Math.max(20, Math.min(160, Number($("#asciiWidth").value) || 80));
    const height = Math.max(1, Math.round(bitmap.height / bitmap.width * width * 0.48));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    $("#asciiOutput").value = imageDataToAscii(context.getImageData(0, 0, width, height), width, false);
  });
  $("#generateTextAscii").click();
}

function initGif() {
  $("#generateGif").addEventListener("click", async () => {
    const files = Array.from($("#gifFiles").files || []);
    if (files.length < 2) {
      toast("이미지를 2개 이상 선택하세요.");
      return;
    }
    const button = $("#generateGif");
    button.disabled = true;
    button.textContent = "생성 중...";
    try {
      const bitmaps = [];
      for (const file of files) bitmaps.push(await createImageBitmap(file));
      const maxSize = Math.max(64, Math.min(800, Number($("#gifSize").value) || 360));
      const ratio = Math.min(1, maxSize / Math.max(...bitmaps.flatMap((bitmap) => [bitmap.width, bitmap.height])));
      const width = Math.max(1, Math.round(Math.max(...bitmaps.map((bitmap) => bitmap.width)) * ratio));
      const height = Math.max(1, Math.round(Math.max(...bitmaps.map((bitmap) => bitmap.height)) * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const gif = GIFEncoder();
      const delay = Math.max(20, Number($("#gifDelay").value) || 500);
      const repeat = Number($("#gifRepeat").value);
      for (const bitmap of bitmaps) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        const frameRatio = Math.min(width / bitmap.width, height / bitmap.height);
        const drawWidth = bitmap.width * frameRatio;
        const drawHeight = bitmap.height * frameRatio;
        context.drawImage(bitmap, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
        const data = context.getImageData(0, 0, width, height).data;
        const palette = quantize(data, 256);
        const index = applyPalette(data, palette);
        gif.writeFrame(index, width, height, { palette, delay, repeat });
      }
      bitmaps.forEach((bitmap) => bitmap.close());
      gif.finish();
      const bytes = gif.bytes();
      const blob = new Blob([bytes], { type: "image/gif" });
      const url = URL.createObjectURL(blob);
      $("#gifPreview").src = url;
      $("#gifDownload").href = url;
      $("#gifStats").textContent = `${files.length}프레임 · ${width} × ${height}px · ${formatBytes(blob.size)}`;
      $("#gifResult").hidden = false;
    } catch (error) {
      toast(`GIF 생성 실패: ${error.message}`);
    } finally {
      button.disabled = false;
      button.textContent = "GIF 생성";
    }
  });

  $("#extractGifFrames").addEventListener("click", async () => {
    const file = $("#gifExtractFile").files?.[0];
    const status = $("#gifExtractStatus");
    const grid = $("#gifFrameGrid");
    grid.replaceChildren();
    if (!file) {
      status.textContent = "GIF 파일을 선택하세요.";
      return;
    }
    if (!("ImageDecoder" in window)) {
      status.textContent = "이 브라우저는 GIF 프레임 추출 API를 지원하지 않습니다.";
      return;
    }
    const button = $("#extractGifFrames");
    button.disabled = true;
    button.textContent = "추출 중...";
    let decoder;
    try {
      decoder = new ImageDecoder({ data: await file.arrayBuffer(), type: "image/gif" });
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      const frameCount = Math.min(track.frameCount, 200);
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        const { image } = await decoder.decode({ frameIndex });
        const canvas = document.createElement("canvas");
        canvas.width = image.displayWidth;
        canvas.height = image.displayHeight;
        canvas.getContext("2d").drawImage(image, 0, 0);
        image.close();
        const blob = await canvasToBlob(canvas, "image/png");
        const url = URL.createObjectURL(blob);
        const item = document.createElement("article");
        item.className = "gif-frame-card";
        item.innerHTML = `<img src="${url}" alt="${frameIndex + 1}번 GIF 프레임"><a class="ghost-button" href="${url}" download="frame-${String(frameIndex + 1).padStart(3, "0")}.png">${frameIndex + 1}번 PNG</a>`;
        grid.append(item);
      }
      status.textContent = `${frameCount}개 프레임 추출 완료${track.frameCount > frameCount ? " · 최대 200개까지만 표시" : ""}`;
    } catch (error) {
      status.textContent = `프레임 추출 실패: ${error.message}`;
    } finally {
      decoder?.close();
      button.disabled = false;
      button.textContent = "GIF 프레임 추출";
    }
  });
}

function initMagicEye() {
  const render = () => {
    const width = Math.max(320, Math.min(1200, Number($("#magicWidth").value) || 720));
    const height = Math.round(width * 0.55);
    const separation = Math.max(54, Math.round(width / 8));
    const depth = Number($("#magicDepth").value) || 12;
    const text = $("#magicText").value.trim() || "SF";
    const depthCanvas = document.createElement("canvas");
    depthCanvas.width = width;
    depthCanvas.height = height;
    const depthContext = depthCanvas.getContext("2d");
    depthContext.fillStyle = "#000";
    depthContext.fillRect(0, 0, width, height);
    depthContext.fillStyle = "#fff";
    depthContext.font = `bold ${Math.round(height * 0.42)}px sans-serif`;
    depthContext.textAlign = "center";
    depthContext.textBaseline = "middle";
    depthContext.fillText(text, width / 2, height / 2);
    const mask = depthContext.getImageData(0, 0, width, height).data;

    const canvas = $("#magicCanvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const image = context.createImageData(width, height);
    const pattern = Array.from({ length: height }, () => Array.from({ length: separation }, () => {
      const base = secureRandom(210);
      return [base, Math.min(255, base + secureRandom(45)), Math.min(255, base + secureRandom(45))];
    }));
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const masked = mask[(y * width + x) * 4] > 100;
        const shift = masked ? depth : 0;
        const sourceX = x < separation ? x : Math.max(0, x - separation + shift);
        const color = x < separation ? pattern[y][x] : [
          image.data[(y * width + sourceX) * 4],
          image.data[(y * width + sourceX) * 4 + 1],
          image.data[(y * width + sourceX) * 4 + 2]
        ];
        const index = (y * width + x) * 4;
        image.data[index] = color[0];
        image.data[index + 1] = color[1];
        image.data[index + 2] = color[2];
        image.data[index + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    $("#magicDownload").href = canvas.toDataURL("image/png");
  };
  $("#generateMagicEye").addEventListener("click", render);
  render();
}

function initBaseball() {
  let answer = [];
  let attempts = 0;
  const start = () => {
    const digits = Number($("#baseballDigits").value);
    const pool = Array.from({ length: 10 }, (_, index) => index);
    answer = [];
    while (answer.length < digits) answer.push(pool.splice(secureRandom(pool.length), 1)[0]);
    attempts = 0;
    $("#baseballHistory").innerHTML = "";
    $("#baseballGuess").value = "";
    $("#baseballGuess").maxLength = digits;
    $("#baseballStatus").innerHTML = resultBlock(`${digits}자리 게임 시작`, "중복 없는 숫자를 입력하세요.", []);
  };
  const submit = () => {
    const guessText = $("#baseballGuess").value.trim();
    const digits = Number($("#baseballDigits").value);
    if (!new RegExp(`^\\d{${digits}}$`).test(guessText) || new Set(guessText).size !== digits) {
      $("#baseballStatus").innerHTML = errorBlock(`${digits}자리의 서로 다른 숫자를 입력하세요.`);
      return;
    }
    const guess = Array.from(guessText, Number);
    attempts += 1;
    const strikes = guess.filter((value, index) => value === answer[index]).length;
    const balls = guess.filter((value, index) => value !== answer[index] && answer.includes(value)).length;
    const row = document.createElement("tr");
    row.innerHTML = `<td>${attempts}</td><td>${escapeHtml(guessText)}</td><td><strong>${strikes}S ${balls}B</strong></td>`;
    $("#baseballHistory").prepend(row);
    if (strikes === digits) {
      $("#baseballStatus").innerHTML = resultBlock(`${attempts}회 만에 정답`, `${answer.join("")}`, []);
    } else {
      $("#baseballStatus").innerHTML = resultBlock(`${strikes} Strike · ${balls} Ball`, `${attempts}번째 시도`, [["Out", String(digits - strikes - balls)]]);
    }
    $("#baseballGuess").value = "";
    $("#baseballGuess").focus();
  };
  $("#newBaseballGame").addEventListener("click", start);
  $("#baseballDigits").addEventListener("change", start);
  $("#submitBaseballGuess").addEventListener("click", submit);
  $("#baseballGuess").addEventListener("keydown", (event) => {
    if (event.key === "Enter") submit();
  });
  start();
}

function initScanner() {
  const output = $("#scannerResult");
  const video = $("#scannerVideo");
  let stream = null;
  let scanning = false;
  const getDetector = async () => {
    if (!("BarcodeDetector" in window)) throw new Error("이 브라우저는 BarcodeDetector를 지원하지 않습니다.");
    const formats = await BarcodeDetector.getSupportedFormats();
    return new BarcodeDetector({ formats });
  };
  const show = (items) => {
    output.innerHTML = items.length
      ? resultBlock(items[0].rawValue, items[0].format, items.slice(1).map((item, index) => [`추가 ${index + 1}`, `${item.format}: ${item.rawValue}`]))
      : errorBlock("코드를 찾지 못했습니다.");
  };
  output.innerHTML = "BarcodeDetector" in window
    ? resultBlock("스캔 대기 중", "이미지를 선택하거나 카메라를 시작하세요.", [])
    : errorBlock("이 브라우저는 BarcodeDetector를 지원하지 않습니다.");
  $("#scannerFile").addEventListener("change", async () => {
    const file = $("#scannerFile").files?.[0];
    if (!file) return;
    try {
      const detector = await getDetector();
      const bitmap = await createImageBitmap(file);
      const items = await detector.detect(bitmap);
      bitmap.close();
      show(items);
    } catch (error) {
      output.innerHTML = errorBlock(error.message);
    }
  });
  const scanFrame = async () => {
    if (!scanning || !stream) return;
    try {
      const detector = await getDetector();
      const items = await detector.detect(video);
      if (items.length) {
        show(items);
        stop();
        return;
      }
    } catch (_error) {
      // Camera frames may not be ready yet.
    }
    requestAnimationFrame(scanFrame);
  };
  const stop = () => {
    scanning = false;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
  };
  $("#startScannerCamera").addEventListener("click", async () => {
    try {
      await getDetector();
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      video.srcObject = stream;
      await video.play();
      scanning = true;
      scanFrame();
    } catch (error) {
      output.innerHTML = errorBlock(`카메라 시작 실패: ${error.message}`);
    }
  });
  $("#stopScannerCamera").addEventListener("click", stop);
  window.addEventListener("pagehide", stop);
}

function initFlashlight() {
  const screen = $("#flashlightScreen");
  const status = $("#torchStatus");
  let screenOn = false;
  let stream = null;
  let track = null;
  $("#toggleScreenLight").addEventListener("click", async () => {
    screenOn = !screenOn;
    screen.classList.toggle("on", screenOn);
    document.body.classList.toggle("screen-light-on", screenOn);
    $("#toggleScreenLight").textContent = screenOn ? "화면 끄기" : "화면 켜기";
    try {
      if (screenOn && document.documentElement.requestFullscreen) await screen.requestFullscreen();
      else if (!screenOn && document.fullscreenElement) await document.exitFullscreen();
    } catch (_error) {
      // Fullscreen is optional.
    }
  });
  $("#toggleTorch").addEventListener("click", async () => {
    try {
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        track = stream.getVideoTracks()[0];
        $("#torchVideo").srcObject = stream;
        await $("#torchVideo").play();
      }
      const capabilities = track.getCapabilities?.() || {};
      if (!capabilities.torch) throw new Error("이 카메라는 torch 기능을 지원하지 않습니다.");
      const current = track.getSettings?.().torch || false;
      await track.applyConstraints({ advanced: [{ torch: !current }] });
      status.textContent = !current ? "카메라 LED를 켰습니다." : "카메라 LED를 껐습니다.";
      $("#toggleTorch").textContent = !current ? "카메라 LED 끄기" : "카메라 LED 켜기";
    } catch (error) {
      status.textContent = `LED 사용 불가: ${error.message}`;
    }
  });
  const stop = () => {
    stream?.getTracks().forEach((item) => item.stop());
    stream = null;
    track = null;
    $("#torchVideo").srcObject = null;
    status.textContent = "카메라를 종료했습니다.";
  };
  $("#stopTorch").addEventListener("click", stop);
  window.addEventListener("pagehide", stop);
}

function beautifySource(source, language) {
  if (language === "sql") {
    return source
      .replace(/\s+/g, " ")
      .replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|LEFT JOIN|RIGHT JOIN|INNER JOIN|JOIN|UNION|VALUES|SET)\b/gi, "\n$1")
      .replace(/\b(AND|OR)\b/gi, "\n  $1")
      .trim()
      .replace(/\b(select|from|where|group by|order by|having|limit|left join|right join|inner join|join|union|values|set|and|or)\b/gi, (value) => value.toUpperCase());
  }
  const tokens = language === "html"
    ? source.replace(/>\s*</g, ">\n<").split("\n")
    : source.replace(/([{};])/g, "$1\n").split("\n");
  let depth = 0;
  return tokens.map((raw) => raw.trim()).filter(Boolean).map((line) => {
    if (/^(<\/|})/.test(line)) depth = Math.max(0, depth - 1);
    const output = `${"  ".repeat(depth)}${line}`;
    if ((language === "html" && /^<[^/!][^>]*[^/]?>$/.test(line) && !/<(meta|link|img|input|br|hr)\b/i.test(line)) || (language !== "html" && /\{$/.test(line))) depth += 1;
    return output;
  }).join("\n");
}

function minifySource(source, language) {
  let result = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  if (language === "html") result = result.replace(/<!--[\s\S]*?-->/g, "");
  result = result.replace(/\s+/g, " ").replace(/\s*([{};,:>])\s*/g, "$1").trim();
  return result;
}

async function deriveBits(password, salt, iterations, length) {
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, keyMaterial, length);
}

async function deriveAesKey(password, salt) {
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 150000 },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function drawQr(canvas, value, level, scale) {
  const qr = window.qrcode(0, level);
  qr.addData(value);
  qr.make();
  const count = qr.getModuleCount();
  const margin = 4;
  const size = (count + margin * 2) * scale;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#111827";
  for (let row = 0; row < count; row += 1) {
    for (let column = 0; column < count; column += 1) {
      if (qr.isDark(row, column)) context.fillRect((column + margin) * scale, (row + margin) * scale, scale, scale);
    }
  }
}

function drawCode39(canvas, rawValue, scale) {
  const patterns = {
    "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn",
    "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw",
    "8": "wnnwnnwnn", "9": "nnwwnnwnn", A: "wnnnnwnnw", B: "nnwnnwnnw",
    C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn",
    G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn",
    K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww",
    O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn",
    S: "nnwnnnwwn", T: "nnnnwnwwn", U: "wwnnnnnnw", V: "nwwnnnnnw",
    W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn",
    "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "$": "nwnwnwnnn",
    "/": "nwnwnnnwn", "+": "nwnnnwnwn", "%": "nnnwnwnwn", "*": "nwnnwnwnn"
  };
  const normalized = rawValue.toUpperCase();
  const encodedValue = normalized.replace(/[^0-9A-Z .$/+%-]/g, "");
  if (!encodedValue) throw new Error("Code 39는 영문, 숫자, 공백, - . $ / + % 문자만 사용할 수 있습니다.");
  const value = `*${encodedValue}*`;
  const requestedScale = Math.max(1, Number(scale) || 1);
  const measureWidth = (narrowValue) => {
    const wideValue = narrowValue * 3;
    const gapValue = narrowValue;
    const quietValue = narrowValue * 10;
    return quietValue * 2 + Array.from(value).reduce((sum, character) => sum + Array.from(patterns[character]).reduce((inner, type) => inner + (type === "w" ? wideValue : narrowValue), 0) + gapValue, 0);
  };
  const scaleLimit = Math.max(1, Math.floor(1400 / measureWidth(1)));
  const effectiveScale = Math.min(requestedScale, scaleLimit);
  const narrow = effectiveScale;
  const wide = narrow * 3;
  const gap = narrow;
  const quiet = narrow * 10;
  const width = measureWidth(narrow);
  const height = 120;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#111";
  let x = quiet;
  for (const character of value) {
    const pattern = patterns[character];
    Array.from(pattern).forEach((type, index) => {
      const barWidth = type === "w" ? wide : narrow;
      if (index % 2 === 0) context.fillRect(x, 8, barWidth, 82);
      x += barWidth;
    });
    x += gap;
  }
  context.font = "16px monospace";
  context.textAlign = "center";
  context.fillText(encodedValue, width / 2, 112);
  return {
    width,
    height,
    scale: effectiveScale,
    requestedScale,
    removedCount: normalized.length - encodedValue.length
  };
}

function imageDataToAscii(imageData, width, invert) {
  const ramp = invert ? "@%#*+=-:. " : " .:-=+*#%@";
  const lines = [];
  for (let y = 0; y < imageData.height; y += 1) {
    let line = "";
    for (let x = 0; x < width; x += 1) {
      const index = (y * imageData.width + Math.min(x, imageData.width - 1)) * 4;
      const brightness = imageData.data[index] * 0.2126 + imageData.data[index + 1] * 0.7152 + imageData.data[index + 2] * 0.0722;
      line += ramp[Math.min(ramp.length - 1, Math.floor(brightness / 256 * ramp.length))];
    }
    lines.push(line.replace(/\s+$/, ""));
  }
  return lines.join("\n");
}

function localDateTime(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function durationText(milliseconds) {
  const days = Math.floor(milliseconds / DAY_MS);
  const hours = Math.floor(milliseconds % DAY_MS / 3600000);
  const minutes = Math.floor(milliseconds % 3600000 / 60000);
  const seconds = Math.floor(milliseconds % 60000 / 1000);
  return [days && `${days}일`, hours && `${hours}시간`, minutes && `${minutes}분`, seconds && `${seconds}초`].filter(Boolean).join(" ") || "0초";
}

function resultBlock(main, subtitle, rows) {
  return `<div class="result-main"><strong>${escapeHtml(main)}</strong>${subtitle ? `<span>${escapeHtml(subtitle)}</span>` : ""}</div>${rows.length ? `<dl class="result-list">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : ""}`;
}

function errorBlock(message) {
  return `<div class="result-main error-result"><strong>${escapeHtml(message)}</strong></div>`;
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function secureRandom(max) {
  if (max <= 1) return 0;
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  do crypto.getRandomValues(buffer); while (buffer[0] >= limit);
  return buffer[0] % max;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("이미지 변환에 실패했습니다."));
    }, type);
  });
}

function formatDecimal(value) {
  return Number(Number(value).toPrecision(12)).toLocaleString("ko-KR", { maximumFractionDigits: 10 });
}

function normalize(value) {
  return String(value || "").toLocaleLowerCase("ko").replace(/[·•._/\\-]+/g, " ").replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function toast(message) {
  const element = $("#advancedToast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 1600);
}
