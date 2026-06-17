(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const encoder = new TextEncoder();

  function init() {
    if (!document.body.matches('[data-page="file-media-toolbox"]')) return;
    initWorkbench();
    initCopy();
    initCharacters();
    initCodeTable();
    initColor();
    initDiff();
    initSubtitle();
    initHtmlEditor();
    initChecksum();
    initImage();
    initTts();
    initStt();
    initEml();
    initKeyEvents();
  }

  function initWorkbench() {
    const buttons = $$("[data-media-target]");
    const panels = $$("[data-media-panel]");
    const filters = $$("[data-media-filter]");
    const search = $("#mediaToolSearch");
    let activeFilter = "all";
    const activate = (id, updateHash = true) => {
      if (!document.getElementById(id)?.matches("[data-media-panel]")) return;
      buttons.forEach((button) => button.classList.toggle("active", button.dataset.mediaTarget === id));
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
        const matches = inCategory && (!query || normalize(`${button.textContent} ${button.dataset.keywords || ""}`).includes(query));
        button.hidden = !matches;
        if (matches) visible += 1;
      });
      $("#mediaToolEmpty").hidden = visible > 0;
    };
    buttons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.mediaTarget)));
    filters.forEach((button) => button.addEventListener("click", () => {
      activeFilter = button.dataset.mediaFilter;
      filters.forEach((item) => item.classList.toggle("active", item === button));
      filter();
    }));
    search.addEventListener("input", () => {
      filter();
    });
    const initial = location.hash.slice(1);
    activate(document.getElementById(initial)?.matches("[data-media-panel]") ? initial : "character-map", false);
    filter();
    window.addEventListener("hashchange", () => activate(location.hash.slice(1), false));
  }

  function initCopy() {
    $$("[data-media-copy]").forEach((button) => button.addEventListener("click", async () => {
      const source = document.getElementById(button.dataset.mediaCopy);
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

  function initCharacters() {
    const groups = [
      ["별", "★ ☆ ✦ ✧ ✩ ✪ ✫ ✬ ✭ ✮ ✯ ✰"],
      ["하트", "♥ ♡ ❤ ❥ ❣ 💙 💚 💛 💜 🖤"],
      ["화살표", "← ↑ → ↓ ↔ ↕ ↖ ↗ ↘ ↙ ⇐ ⇒ ⇔ ➜ ➤"],
      ["도형", "■ □ ● ○ ◆ ◇ ▲ △ ▼ ▽ ◐ ◑ ◒ ◓"],
      ["수학", "± × ÷ ≠ ≤ ≥ ≈ ∞ √ ∑ ∏ ∫ ∂ ∆ π"],
      ["통화", "₩ $ € ¥ £ ¢ ₹ ₽ ₫ ₿"],
      ["괄호", "〈 〉 《 》 「 」 『 』 【 】 〔 〕 ⟨ ⟩"],
      ["체크", "✓ ✔ ✕ ✖ ☑ ☒ ☐ ✅ ❌"],
      ["날씨", "☀ ☁ ☂ ☃ ☄ ⚡ ❄ 🌙"],
      ["기호", "© ® ™ § ¶ † ‡ ※ № ℃ ℉ ‰"]
    ];
    const search = $("#characterSearch");
    const grid = $("#characterGrid");
    const render = () => {
      const query = normalize(search.value);
      grid.innerHTML = groups.map(([label, characters]) => {
        const items = characters.split(/\s+/).filter(Boolean);
        if (query && !normalize(`${label} ${characters}`).includes(query)) return "";
        return `<section><h3>${label}</h3><div>${items.map((character) => `<button type="button" data-character="${escapeHtml(character)}" title="${label} ${escapeHtml(character)}">${escapeHtml(character)}</button>`).join("")}</div></section>`;
      }).join("");
      $$("[data-character]", grid).forEach((button) => button.addEventListener("click", async () => {
        const character = button.dataset.character;
        try {
          await navigator.clipboard.writeText(character);
          $("#characterInfo").textContent = `${character} 복사 완료 · U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;
        } catch (_error) {
          $("#characterInfo").textContent = `${character} · U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;
        }
      }));
    };
    search.addEventListener("input", render);
    render();
  }

  function initCodeTable() {
    const descriptions = {
      32: "공백", 33: "느낌표", 34: "큰따옴표", 35: "해시", 36: "달러",
      37: "퍼센트", 38: "앰퍼샌드", 39: "작은따옴표", 40: "여는 괄호",
      41: "닫는 괄호", 42: "별표", 43: "더하기", 44: "쉼표", 45: "하이픈",
      46: "마침표", 47: "슬래시", 58: "콜론", 59: "세미콜론", 60: "작다",
      61: "등호", 62: "크다", 63: "물음표", 64: "골뱅이", 91: "여는 대괄호",
      92: "역슬래시", 93: "닫는 대괄호", 94: "캐럿", 95: "밑줄", 96: "백틱",
      123: "여는 중괄호", 124: "파이프", 125: "닫는 중괄호", 126: "물결표"
    };
    const rows = Array.from({ length: 95 }, (_, index) => {
      const decimal = index + 32;
      const character = String.fromCharCode(decimal);
      return { character, decimal, hex: decimal.toString(16).toUpperCase().padStart(2, "0"), html: `&#${decimal};`, description: descriptions[decimal] || (decimal <= 57 ? "숫자·기호" : decimal <= 90 ? "영문 대문자" : decimal <= 122 ? "영문 소문자" : "기호") };
    });
    const search = $("#codeTableSearch");
    const body = $("#codeTableBody");
    const render = () => {
      const query = normalize(search.value.replace(/&(?:#|amp;#)/g, ""));
      body.innerHTML = rows.filter((row) => !query || normalize(`${row.character} ${row.decimal} ${row.hex} ${row.html} ${row.description}`).includes(query)).map((row) => `<tr><td><strong>${escapeHtml(row.character === " " ? "Space" : row.character)}</strong></td><td>${row.decimal}</td><td>0x${row.hex}</td><td><code>${escapeHtml(row.html)}</code></td><td>${row.description}</td></tr>`).join("");
    };
    search.addEventListener("input", render);
    render();
  }

  function initColor() {
    const picker = $("#colorPickerInput");
    const hexInput = $("#colorHexInput");
    const preview = $("#colorPreview");
    const output = $("#colorResult");
    const render = (value) => {
      const hex = normalizeHex(value);
      if (!hex) {
        output.innerHTML = errorBlock("6자리 HEX 색상을 입력하세요.");
        return;
      }
      picker.value = hex;
      hexInput.value = hex;
      preview.style.background = hex;
      const [red, green, blue] = hexToRgb(hex);
      const [hue, saturation, lightness] = rgbToHsl(red, green, blue);
      const contrast = relativeLuminance(red, green, blue) > 0.42 ? "#111827" : "#ffffff";
      preview.style.color = contrast;
      preview.textContent = contrast === "#ffffff" ? "밝은 글자" : "어두운 글자";
      output.innerHTML = resultBlock(hex.toUpperCase(), `rgb(${red}, ${green}, ${blue})`, [
        ["HSL", `hsl(${hue}, ${saturation}%, ${lightness}%)`],
        ["추천 글자색", contrast],
        ["CSS 변수", `--color: ${hex};`]
      ]);
    };
    picker.addEventListener("input", () => render(picker.value));
    hexInput.addEventListener("input", () => render(hexInput.value));
    render(picker.value);
  }

  function initDiff() {
    const original = $("#diffOriginal");
    const changed = $("#diffChanged");
    const output = $("#diffOutput");
    original.value = "SolForge\n텍스트 비교\n기존 줄";
    changed.value = "SolForge\n텍스트 비교 도구\n새 줄";
    const render = () => {
      const left = original.value.split(/\r?\n/);
      const right = changed.value.split(/\r?\n/);
      const operations = lineDiff(left, right);
      const summary = operations.reduce((counts, item) => {
        counts[item.type] += 1;
        return counts;
      }, { same: 0, add: 0, remove: 0 });
      output.innerHTML = `<div class="diff-summary"><span>동일 ${summary.same}</span><span class="diff-add">추가 ${summary.add}</span><span class="diff-remove">삭제 ${summary.remove}</span></div><pre>${operations.map((item) => `<span class="diff-${item.type}">${item.type === "add" ? "+" : item.type === "remove" ? "-" : " "} ${escapeHtml(item.text)}</span>`).join("\n")}</pre>`;
    };
    $("#compareText").addEventListener("click", render);
    render();
  }

  function initSubtitle() {
    const input = $("#subtitleInput");
    const output = $("#subtitleOutput");
    const offset = $("#subtitleOffset");
    input.value = [
      "<SAMI>",
      "<BODY>",
      "<SYNC Start=1000><P Class=KRCC>첫 번째 자막",
      "<SYNC Start=3500><P Class=KRCC>두 번째<br>자막",
      "<SYNC Start=6000><P Class=KRCC>&nbsp;",
      "</BODY>",
      "</SAMI>"
    ].join("\n");
    const render = () => {
      const syncs = [];
      const pattern = /<sync\b[^>]*start\s*=\s*["']?(\d+)["']?[^>]*>([\s\S]*?)(?=<sync\b|<\/body>|$)/gi;
      let match;
      while ((match = pattern.exec(input.value))) {
        const text = match[2]
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/gi, " ")
          .replace(/&amp;/gi, "&")
          .replace(/&lt;/gi, "<")
          .replace(/&gt;/gi, ">")
          .trim();
        syncs.push({ start: Number(match[1]), text });
      }
      const adjustment = Number(offset.value) || 0;
      const cues = syncs.filter((item) => item.text).map((item, index, filtered) => {
        const originalIndex = syncs.indexOf(item);
        const next = syncs.slice(originalIndex + 1).find((candidate) => candidate.start > item.start);
        const start = Math.max(0, item.start + adjustment);
        const end = Math.max(start + 500, (next?.start ?? item.start + 3000) + adjustment);
        return `${index + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${item.text}`;
      });
      output.value = cues.join("\n\n");
    };
    $("#convertSubtitle").addEventListener("click", render);
    render();
  }

  function initHtmlEditor() {
    const input = $("#htmlEditorInput");
    const preview = $("#htmlPreview");
    const render = () => {
      preview.srcdoc = input.value;
    };
    $("#runHtml").addEventListener("click", render);
    $("#printHtml").addEventListener("click", () => {
      try {
        preview.contentWindow?.print();
      } catch (_error) {
        toast("미리보기 인쇄를 시작하지 못했습니다.");
      }
    });
    render();
  }

  function initChecksum() {
    const input = $("#checksumFile");
    const output = $("#checksumResult");
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      output.innerHTML = resultBlock("계산 중...", `${file.name} · ${formatBytes(file.size)}`, []);
      try {
        const buffer = await file.arrayBuffer();
        const algorithms = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];
        const rows = [];
        for (const algorithm of algorithms) {
          const digest = await crypto.subtle.digest(algorithm, buffer);
          rows.push([algorithm, bufferToHex(digest)]);
        }
        output.innerHTML = resultBlock(file.name, formatBytes(file.size), rows);
      } catch (error) {
        output.innerHTML = errorBlock(`체크섬 계산 실패: ${error.message}`);
      }
    });
  }

  function initImage() {
    const input = $("#imageFile");
    const processButton = $("#processImage");
    const result = $("#imageResult");
    const preview = $("#imagePreview");
    const stats = $("#imageStats");
    const dataUrlOutput = $("#imageDataUrl");
    const download = $("#imageDownload");
    let sourceFile = null;
    input.addEventListener("change", () => {
      sourceFile = input.files?.[0] || null;
    });
    processButton.addEventListener("click", async () => {
      if (!sourceFile) {
        toast("이미지 파일을 먼저 선택하세요.");
        return;
      }
      try {
        const bitmap = await createImageBitmap(sourceFile);
        const maxSize = Math.max(64, Number($("#imageMaxSize").value) || 1600);
        const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if ($("#imageFormat").value === "image/jpeg") {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
        }
        context.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        const format = $("#imageFormat").value;
        const quality = Math.max(0.1, Math.min(1, (Number($("#imageQuality").value) || 82) / 100));
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, format, quality));
        if (!blob) throw new Error("이미지를 생성하지 못했습니다.");
        const dataUrl = canvas.toDataURL(format, quality);
        preview.src = dataUrl;
        dataUrlOutput.value = dataUrl;
        download.href = URL.createObjectURL(blob);
        download.download = `solforge-${Date.now()}.${format === "image/png" ? "png" : format === "image/webp" ? "webp" : "jpg"}`;
        stats.textContent = `${bitmapSize(sourceFile.size)} → ${bitmapSize(blob.size)} · ${width} × ${height}px · ${Math.round((1 - blob.size / sourceFile.size) * 100)}% 변화`;
        result.hidden = false;
      } catch (error) {
        toast(`이미지 변환 실패: ${error.message}`);
      }
    });
  }

  function initTts() {
    const voiceSelect = $("#ttsVoice");
    const status = $("#ttsStatus");
    const populate = () => {
      const voices = speechSynthesis.getVoices();
      voiceSelect.innerHTML = voices.map((voice, index) => `<option value="${index}">${escapeHtml(voice.name)} (${voice.lang})</option>`).join("");
      const koreanIndex = voices.findIndex((voice) => voice.lang.toLowerCase().startsWith("ko"));
      if (koreanIndex >= 0) voiceSelect.value = String(koreanIndex);
      status.textContent = voices.length ? `${voices.length}개 음성을 사용할 수 있습니다.` : "설치된 음성을 불러오는 중입니다.";
    };
    if (!("speechSynthesis" in window)) {
      status.textContent = "이 브라우저는 음성 합성을 지원하지 않습니다.";
      return;
    }
    populate();
    speechSynthesis.addEventListener("voiceschanged", populate);
    $("#speakText").addEventListener("click", () => {
      const text = $("#ttsInput").value.trim();
      if (!text) return;
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = speechSynthesis.getVoices();
      utterance.voice = voices[Number(voiceSelect.value)] || null;
      utterance.rate = Number($("#ttsRate").value);
      utterance.pitch = Number($("#ttsPitch").value);
      utterance.onstart = () => {
        status.textContent = "읽는 중입니다.";
      };
      utterance.onend = () => {
        status.textContent = "읽기를 마쳤습니다.";
      };
      speechSynthesis.speak(utterance);
    });
    $("#stopSpeech").addEventListener("click", () => {
      speechSynthesis.cancel();
      status.textContent = "읽기를 중지했습니다.";
    });
  }

  function initStt() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const status = $("#sttStatus");
    const output = $("#sttOutput");
    if (!Recognition) {
      status.textContent = "이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 계열 브라우저를 확인하세요.";
      $("#startRecognition").disabled = true;
      $("#stopRecognition").disabled = true;
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalText = "";
    recognition.onstart = () => {
      status.textContent = "마이크 음성을 듣고 있습니다.";
    };
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += `${transcript}\n`;
        else interim += transcript;
      }
      output.value = `${finalText}${interim}`;
    };
    recognition.onerror = (event) => {
      status.textContent = `음성 인식 오류: ${event.error}`;
    };
    recognition.onend = () => {
      status.textContent = "음성 인식이 종료됐습니다.";
    };
    $("#startRecognition").addEventListener("click", () => {
      recognition.lang = $("#sttLanguage").value;
      finalText = output.value ? `${output.value.trim()}\n` : "";
      recognition.start();
    });
    $("#stopRecognition").addEventListener("click", () => recognition.stop());
  }

  function initEml() {
    const input = $("#emlFile");
    const headersOutput = $("#emlHeaders");
    const bodyOutput = $("#emlBody");
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const raw = await file.text();
        const parsed = parseEml(raw);
        headersOutput.innerHTML = resultBlock(
          parsed.subject || "(제목 없음)",
          file.name,
          [
            ["보낸 사람", parsed.from || "없음"],
            ["받는 사람", parsed.to || "없음"],
            ["날짜", parsed.date || "없음"],
            ["Content-Type", parsed.contentType || "text/plain"]
          ]
        );
        bodyOutput.textContent = parsed.body || "(표시할 텍스트 본문이 없습니다.)";
      } catch (error) {
        headersOutput.innerHTML = errorBlock(`EML 파일을 읽지 못했습니다: ${error.message}`);
      }
    });
  }

  function initKeyEvents() {
    const capture = $("#keyCapture");
    const stats = $("#keyStats");
    const history = $("#keyHistory");
    const render = (event) => {
      const modifiers = [event.ctrlKey && "Ctrl", event.altKey && "Alt", event.shiftKey && "Shift", event.metaKey && "Meta"].filter(Boolean).join(" + ") || "없음";
      stats.innerHTML = [
        stat("key", event.key),
        stat("code", event.code),
        stat("keyCode", event.keyCode),
        stat("modifier", modifiers)
      ].join("");
      const row = document.createElement("tr");
      row.innerHTML = `<td>${escapeHtml(event.key)}</td><td>${escapeHtml(event.code)}</td><td>${event.keyCode}</td><td>${escapeHtml(modifiers)}</td>`;
      history.prepend(row);
      while (history.children.length > 20) history.lastElementChild.remove();
      if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) event.preventDefault();
    };
    capture.addEventListener("keydown", render);
    $("#clearKeyHistory").addEventListener("click", () => {
      history.innerHTML = "";
      stats.innerHTML = "";
      capture.focus();
    });
  }

  function lineDiff(left, right) {
    const rows = left.length + 1;
    const columns = right.length + 1;
    const matrix = Array.from({ length: rows }, () => new Uint16Array(columns));
    for (let i = 1; i < rows; i += 1) {
      for (let j = 1; j < columns; j += 1) {
        matrix[i][j] = left[i - 1] === right[j - 1]
          ? matrix[i - 1][j - 1] + 1
          : Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
    const result = [];
    let i = left.length;
    let j = right.length;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && left[i - 1] === right[j - 1]) {
        result.push({ type: "same", text: left[i - 1] });
        i -= 1;
        j -= 1;
      } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
        result.push({ type: "add", text: right[j - 1] });
        j -= 1;
      } else {
        result.push({ type: "remove", text: left[i - 1] });
        i -= 1;
      }
    }
    return result.reverse();
  }

  function parseEml(raw) {
    const normalized = raw.replace(/\r\n?/g, "\n");
    const [headerText, ...bodyParts] = normalized.split("\n\n");
    const unfolded = headerText.replace(/\n[ \t]+/g, " ");
    const headers = {};
    unfolded.split("\n").forEach((line) => {
      const index = line.indexOf(":");
      if (index > 0) headers[line.slice(0, index).toLowerCase()] = line.slice(index + 1).trim();
    });
    let body = bodyParts.join("\n\n");
    const contentType = headers["content-type"] || "text/plain";
    const boundary = contentType.match(/boundary="?([^";]+)"?/i)?.[1];
    if (boundary) {
      const parts = body.split(`--${boundary}`);
      const textPart = parts.find((part) => /content-type:\s*text\/plain/i.test(part));
      if (textPart) body = textPart.split(/\n\n/).slice(1).join("\n\n").replace(/--\s*$/, "");
    }
    const transfer = (body.match(/^content-transfer-encoding:\s*([^\n]+)/im)?.[1] || headers["content-transfer-encoding"] || "").toLowerCase();
    body = body.replace(/^content-[^:]+:[^\n]*\n/gim, "").trim();
    if (transfer.includes("base64")) {
      try {
        body = new TextDecoder().decode(Uint8Array.from(atob(body.replace(/\s/g, "")), (character) => character.charCodeAt(0)));
      } catch (_error) {
        // Keep the source text when decoding fails.
      }
    } else if (transfer.includes("quoted-printable")) {
      body = decodeQuotedPrintable(body);
    }
    return {
      subject: decodeMimeHeader(headers.subject || ""),
      from: decodeMimeHeader(headers.from || ""),
      to: decodeMimeHeader(headers.to || ""),
      date: headers.date || "",
      contentType,
      body
    };
  }

  function decodeMimeHeader(value) {
    return value.replace(/=\?([^?]+)\?([bq])\?([^?]+)\?=/gi, (_match, charset, encoding, content) => {
      try {
        const bytes = encoding.toLowerCase() === "b"
          ? Uint8Array.from(atob(content), (character) => character.charCodeAt(0))
          : Uint8Array.from(content.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (_item, hex) => String.fromCharCode(parseInt(hex, 16))), (character) => character.charCodeAt(0));
        return new TextDecoder(charset).decode(bytes);
      } catch (_error) {
        return content;
      }
    });
  }

  function decodeQuotedPrintable(value) {
    const joined = value.replace(/=\n/g, "");
    const bytes = [];
    for (let index = 0; index < joined.length; index += 1) {
      if (joined[index] === "=" && /^[0-9A-F]{2}$/i.test(joined.slice(index + 1, index + 3))) {
        bytes.push(parseInt(joined.slice(index + 1, index + 3), 16));
        index += 2;
      } else {
        bytes.push(joined.charCodeAt(index));
      }
    }
    return new TextDecoder().decode(Uint8Array.from(bytes));
  }

  function normalizeHex(value) {
    const cleaned = String(value).trim().replace(/^#/, "");
    if (/^[0-9a-f]{3}$/i.test(cleaned)) return `#${cleaned.split("").map((item) => item + item).join("").toLowerCase()}`;
    if (/^[0-9a-f]{6}$/i.test(cleaned)) return `#${cleaned.toLowerCase()}`;
    return "";
  }

  function hexToRgb(hex) {
    const value = parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }

  function rgbToHsl(red, green, blue) {
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue = 0;
    let saturation = 0;
    const lightness = (max + min) / 2;
    if (max !== min) {
      const delta = max - min;
      saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
      if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
      else if (max === g) hue = (b - r) / delta + 2;
      else hue = (r - g) / delta + 4;
      hue /= 6;
    }
    return [Math.round(hue * 360), Math.round(saturation * 100), Math.round(lightness * 100)];
  }

  function relativeLuminance(red, green, blue) {
    return [red, green, blue].map((value) => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  }

  function srtTime(milliseconds) {
    const total = Math.max(0, Math.round(milliseconds));
    const hours = Math.floor(total / 3600000);
    const minutes = Math.floor((total % 3600000) / 60000);
    const seconds = Math.floor((total % 60000) / 1000);
    const ms = total % 1000;
    return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(ms, 3)}`;
  }

  function stat(label, value) {
    return `<div class="stat-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function resultBlock(main, subtitle, rows) {
    return [
      `<div class="result-main"><strong>${escapeHtml(main)}</strong>${subtitle ? `<span>${escapeHtml(subtitle)}</span>` : ""}</div>`,
      rows.length ? `<dl class="result-list">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : ""
    ].join("");
  }

  function errorBlock(message) {
    return `<div class="result-main error-result"><strong>${escapeHtml(message)}</strong></div>`;
  }

  function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  }

  function bitmapSize(bytes) {
    return formatBytes(bytes);
  }

  function toast(message) {
    const element = $("#mediaToast");
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove("show"), 1600);
  }

  function pad(value, length) {
    return String(value).padStart(length, "0");
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

  document.addEventListener("DOMContentLoaded", init);
}());
