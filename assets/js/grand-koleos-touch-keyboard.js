(function () {
  "use strict";

  if (!document.body.matches('[data-page="grand-koleos-touch-keyboard"]')) return;

  const lang = document.documentElement.lang === "en" ? "en" : "ko";
  const copy = lang === "en" ? {
    button: "Button",
    empty: "No shortcut",
    selected: "selected. Choose keys from the virtual keyboard.",
    assigned: "assigned to",
    removed: "removed from",
    cleared: "Shortcut cleared for",
    clearedAll: "All button shortcuts have been reset.",
    unset: "Not assigned",
    touchTitle: "TOUCH KEYBOARD",
    page: "PAGE",
    pageChanged: "page selected.",
    mediaTitle: "MEDIA KEYS",
    volumeMute: "Mute",
    volumeDown: "Volume −",
    volumeUp: "Volume +",
    pageName: (index) => `Page ${index + 1} name`,
    cardNames: ["Home", "Back", "Menu", "Favorites", "Voice", "Power"],
    firmwareLoading: "Loading and validating the firmware package...",
    firmwareResetting: "Restarting the USB CDC device in bootloader mode...",
    firmwareConnecting: "Connecting to the ESP32-S3 bootloader...",
    firmwareUploading: "Uploading firmware",
    firmwareRebooting: "Firmware verified. Restarting the board in application mode...",
    firmwareSuccess: "Upload complete. The board has restarted with the Grand Koleos Macro screen.",
    firmwareFailed: "Upload failed",
    invalidDevice: "This is not the supported ESP32-S3 USB device.",
    invalidFirmware: "Firmware validation failed. Upload was stopped.",
    chipMismatch: "The connected chip is not an ESP32-S3. Upload was stopped."
  } : {
    button: "버튼",
    empty: "키 조합 없음",
    selected: "선택됨 · 가상 키보드에서 조합할 키를 누르세요.",
    assigned: "에 할당됨",
    removed: "에서 해제됨",
    cleared: "의 키 조합을 지웠습니다.",
    clearedAll: "모든 버튼의 키 조합을 초기화했습니다.",
    unset: "미설정",
    touchTitle: "터치 키보드",
    page: "페이지",
    pageChanged: "페이지로 이동했습니다.",
    mediaTitle: "미디어 키",
    volumeMute: "음소거",
    volumeDown: "볼륨 −",
    volumeUp: "볼륨 +",
    pageName: (index) => `${index + 1}페이지 이름`,
    cardNames: ["홈", "이전", "메뉴", "즐겨찾기", "음성", "전원"],
    firmwareLoading: "펌웨어 패키지를 불러와 검증하고 있습니다...",
    firmwareResetting: "USB CDC 장치를 부트로더 모드로 다시 시작하고 있습니다...",
    firmwareConnecting: "ESP32-S3 부트로더에 연결하고 있습니다...",
    firmwareUploading: "펌웨어 업로드 중",
    firmwareRebooting: "펌웨어 검증 완료 · 보드를 앱 모드로 다시 시작하고 있습니다...",
    firmwareSuccess: "업로드를 완료했습니다. Grand Koleos Macro 화면으로 보드가 다시 시작되었습니다.",
    firmwareFailed: "업로드 실패",
    invalidDevice: "지원 대상 ESP32-S3 USB 장치가 아닙니다.",
    invalidFirmware: "펌웨어 검증에 실패해 업로드를 중단했습니다.",
    chipMismatch: "연결된 칩이 ESP32-S3가 아니어서 업로드를 중단했습니다."
  };

  const key = (id, label = id, units = 1, kind = "standard", comboLabel = id) => ({ id, label, units, kind, comboLabel });
  const gap = (units = 0.45) => ({ gap: true, units });
  const mediaKeys = [
    key("Volume Mute", copy.volumeMute, 2.25, "media", copy.volumeMute),
    key("Volume Down", copy.volumeDown, 2.25, "media", copy.volumeDown),
    key("Volume Up", copy.volumeUp, 2.25, "media", copy.volumeUp)
  ];
  const keyboardRows = [
    [key("Escape", "Esc", 1, "system"), gap(0.7), key("F1", "F1", 1, "function"), key("F2", "F2", 1, "function"), key("F3", "F3", 1, "function"), key("F4", "F4", 1, "function"), gap(0.4), key("F5", "F5", 1, "function"), key("F6", "F6", 1, "function"), key("F7", "F7", 1, "function"), key("F8", "F8", 1, "function"), gap(0.4), key("F9", "F9", 1, "function"), key("F10", "F10", 1, "function"), key("F11", "F11", 1, "function"), key("F12", "F12", 1, "function"), gap(0.8), key("Print Screen", "PrtSc", 1, "system"), key("Scroll Lock", "Scroll", 1, "system"), key("Pause", "Pause", 1, "system")],
    [key("`", "~\n`"), key("1", "!\n1"), key("2", "@\n2"), key("3", "#\n3"), key("4", "$\n4"), key("5", "%\n5"), key("6", "^\n6"), key("7", "&\n7"), key("8", "*\n8"), key("9", "(\n9"), key("0", ")\n0"), key("-", "_\n-"), key("=", "+\n="), key("Backspace", "Backspace", 2, "editing"), gap(0.7), key("Insert", "Ins", 1, "navigation"), key("Home", "Home", 1, "navigation"), key("Page Up", "PgUp", 1, "navigation")],
    [key("Tab", "Tab", 1.5, "modifier"), key("Q"), key("W"), key("E"), key("R"), key("T"), key("Y"), key("U"), key("I"), key("O"), key("P"), key("[", "{\n["), key("]", "}\n]"), key("\\", "|\n\\", 1.5), gap(0.7), key("Delete", "Del", 1, "navigation"), key("End", "End", 1, "navigation"), key("Page Down", "PgDn", 1, "navigation")],
    [key("Caps Lock", "Caps", 1.8, "modifier"), key("A"), key("S"), key("D"), key("F"), key("G"), key("H"), key("J"), key("K"), key("L"), key(";", ":\n;"), key("'", "\"\n'"), key("Enter", "Enter", 2.2, "editing"), gap(0.7), gap(3)],
    [key("Shift", "Shift", 2.35, "modifier"), key("Z"), key("X"), key("C"), key("V"), key("B"), key("N"), key("M"), key(",", "<\n,"), key(".", ">\n."), key("/", "?\n/"), key("Right Shift", "Shift", 2.65, "modifier"), gap(0.7), gap(), key("Arrow Up", "↑", 1, "arrow"), gap()],
    [key("Ctrl", "Ctrl", 1.3, "modifier"), key("Win", "Win", 1.25, "modifier"), key("Alt", "Alt", 1.25, "modifier"), key("Space", "Space", 7.5), key("Right Alt", "Alt", 1.25, "modifier"), key("Menu", "Menu", 1.15, "modifier"), key("Right Ctrl", "Ctrl", 1.3, "modifier"), gap(0.7), key("Arrow Left", "←", 1, "arrow"), key("Arrow Down", "↓", 1, "arrow"), key("Arrow Right", "→", 1, "arrow")]
  ];

  const keyLabels = new Map();
  [...mediaKeys, ...keyboardRows.flat()].forEach((item) => {
    if (!item.gap && !keyLabels.has(item.id)) keyLabels.set(item.id, item.comboLabel);
  });

  const pageStates = Array.from({ length: 3 }, (_value, index) => ({
    name: lang === "en" ? `Page ${index + 1}` : `${index + 1} 페이지`,
    assignments: Array.from({ length: 6 }, () => [])
  }));
  const buttonBoxes = [];
  const navigationBoxes = [];
  let activeButton = 0;
  let activePage = 0;
  let transitioning = false;
  let pointerState = null;

  const keyboard = document.querySelector("#gkKeyboard");
  const preview = document.querySelector("#gkPreview");
  const context = preview.getContext("2d");
  const activeButtonOutput = document.querySelector("#gkActiveButton");
  const activeComboOutput = document.querySelector("#gkActiveCombo");
  const status = document.querySelector("#gkStatus");
  const assignmentList = document.querySelector("#gkAssignmentList");
  const pageNameFields = document.querySelector("#gkPageNameFields");
  const uploadSection = document.querySelector("#gkUploadSection");
  const portButton = document.querySelector("#gkPortButton");
  const uploadButton = document.querySelector("#gkUploadButton");
  const uploadStatus = document.querySelector("#gkUploadStatus");
  const uploadProgress = document.querySelector("#gkUploadProgress");
  const uploadLog = document.querySelector("#gkUploadLog");
  const scriptBase = new URL(".", document.currentScript.src);
  const flasherModuleUrl = new URL("../vendor/esptool-js-0.6.1.bundle.js", scriptBase).href;
  let selectedPort = null;
  let uploadBusy = false;

  function currentAssignments() {
    return pageStates[activePage].assignments;
  }

  function defaultPageName(index) {
    return lang === "en" ? `Page ${index + 1}` : `${index + 1} 페이지`;
  }

  function displayPageName(index) {
    return pageStates[index].name.trim() || defaultPageName(index);
  }

  function comboText(index) {
    const assignments = currentAssignments();
    return assignments[index].length ? assignments[index].map((id) => keyLabels.get(id) || id).join(" + ") : copy.empty;
  }

  function buttonText(index) {
    return `${copy.button} ${index + 1}`;
  }

  function renderKeyboard() {
    const renderKey = (item, extraClass = "") => {
      if (item.gap) return `<span class="gk-key-gap" style="--key-units:${item.units}" aria-hidden="true"></span>`;
      const label = item.label.split("\n").map((line) => `<span>${escapeHtml(line)}</span>`).join("");
      return `<button type="button" class="gk-key gk-key-${item.kind}${extraClass ? ` ${extraClass}` : ""}" style="--key-units:${item.units}" data-gk-key="${escapeHtml(item.id)}" aria-pressed="false" aria-label="${escapeHtml(item.comboLabel)}">${label}</button>`;
    };
    keyboard.innerHTML = `<div class="gk-media-strip"><span>${escapeHtml(copy.mediaTitle)}</span><div>${mediaKeys.map((item) => renderKey(item, "gk-media-key")).join("")}</div></div><div class="gk-keyboard-rows">${keyboardRows.map((row) => `<div class="gk-key-row">${row.map((item) => renderKey(item)).join("")}</div>`).join("")}</div>`;
    keyboard.querySelectorAll("[data-gk-key]").forEach((button) => {
      button.addEventListener("click", () => toggleKey(button.dataset.gkKey));
    });
    syncKeyboardState();
  }

  function toggleKey(keyId) {
    const keys = currentAssignments()[activeButton];
    const index = keys.indexOf(keyId);
    const displayKey = keyLabels.get(keyId) || keyId;
    if (index >= 0) {
      keys.splice(index, 1);
      status.textContent = lang === "en" ? `${displayKey} ${copy.removed} ${buttonText(activeButton)}.` : `${displayKey} · ${buttonText(activeButton)}${copy.removed}`;
    } else {
      keys.push(keyId);
      status.textContent = lang === "en" ? `${displayKey} ${copy.assigned} ${buttonText(activeButton)}.` : `${displayKey} · ${buttonText(activeButton)}${copy.assigned}`;
    }
    renderAll();
  }

  function selectButton(index) {
    activeButton = index;
    status.textContent = `${buttonText(index)} ${copy.selected}`;
    renderAll();
  }

  function syncKeyboardState() {
    const selected = new Set(currentAssignments()[activeButton]);
    keyboard.querySelectorAll("[data-gk-key]").forEach((button) => {
      const pressed = selected.has(button.dataset.gkKey);
      button.classList.toggle("active", pressed);
      button.setAttribute("aria-pressed", String(pressed));
    });
  }

  function renderAssignmentSummary() {
    const assignments = currentAssignments();
    assignmentList.innerHTML = assignments.map((_keys, index) => `<button type="button" class="${index === activeButton ? "active" : ""}" data-gk-button="${index}" aria-pressed="${index === activeButton}"><span>${buttonText(index)}</span><strong>${escapeHtml(comboText(index))}</strong></button>`).join("");
    assignmentList.querySelectorAll("[data-gk-button]").forEach((button) => {
      button.addEventListener("click", () => selectButton(Number(button.dataset.gkButton)));
    });
  }

  function renderPageNameFields() {
    pageNameFields.innerHTML = pageStates.map((page, index) => `<label class="gk-page-name-field${index === activePage ? " active" : ""}" data-gk-page-field="${index}"><span>${escapeHtml(copy.pageName(index))}</span><input type="text" maxlength="12" value="${escapeHtml(page.name)}" data-gk-page-name="${index}" autocomplete="off"></label>`).join("");
    pageNameFields.querySelectorAll("[data-gk-page-name]").forEach((input) => {
      const index = Number(input.dataset.gkPageName);
      input.addEventListener("focus", () => {
        if (index !== activePage) setPage(index, false);
      });
      input.addEventListener("input", () => {
        pageStates[index].name = input.value;
        renderPreview();
      });
      input.addEventListener("blur", () => {
        if (!input.value.trim()) {
          pageStates[index].name = defaultPageName(index);
          input.value = pageStates[index].name;
          renderPreview();
        }
      });
    });
  }

  function syncPageNameFields() {
    pageNameFields.querySelectorAll("[data-gk-page-field]").forEach((field) => {
      field.classList.toggle("active", Number(field.dataset.gkPageField) === activePage);
    });
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function fitFont(text, maxWidth, initialSize, minimumSize = 8) {
    let size = initialSize;
    while (size > minimumSize) {
      context.font = `700 ${size}px Inter, Arial, sans-serif`;
      if (context.measureText(text).width <= maxWidth) break;
      size -= 1;
    }
    return size;
  }

  function drawTouchIcon(index, centerX, centerY, color) {
    context.save();
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    if (index === 0) {
      context.beginPath();
      context.moveTo(centerX - 10, centerY);
      context.lineTo(centerX, centerY - 9);
      context.lineTo(centerX + 10, centerY);
      context.moveTo(centerX - 7, centerY - 2);
      context.lineTo(centerX - 7, centerY + 9);
      context.lineTo(centerX + 7, centerY + 9);
      context.lineTo(centerX + 7, centerY - 2);
      context.stroke();
    } else if (index === 1) {
      context.beginPath();
      context.moveTo(centerX + 10, centerY + 8);
      context.quadraticCurveTo(centerX + 8, centerY - 6, centerX - 6, centerY - 4);
      context.moveTo(centerX - 6, centerY - 4);
      context.lineTo(centerX, centerY - 10);
      context.moveTo(centerX - 6, centerY - 4);
      context.lineTo(centerX, centerY + 2);
      context.stroke();
    } else if (index === 2) {
      [-7, 0, 7].forEach((offset) => {
        context.beginPath();
        context.moveTo(centerX - 10, centerY + offset);
        context.lineTo(centerX + 10, centerY + offset);
        context.stroke();
      });
    } else if (index === 3) {
      context.beginPath();
      for (let point = 0; point < 10; point += 1) {
        const angle = -Math.PI / 2 + point * Math.PI / 5;
        const radius = point % 2 === 0 ? 11 : 5;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (point === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      context.stroke();
    } else if (index === 4) {
      roundedRect(context, centerX - 5, centerY - 10, 10, 16, 5);
      context.stroke();
      context.beginPath();
      context.arc(centerX, centerY - 1, 10, 0.15 * Math.PI, 0.85 * Math.PI);
      context.moveTo(centerX, centerY + 9);
      context.lineTo(centerX, centerY + 13);
      context.moveTo(centerX - 5, centerY + 13);
      context.lineTo(centerX + 5, centerY + 13);
      context.stroke();
    } else {
      context.beginPath();
      context.arc(centerX, centerY + 1, 10, -0.25 * Math.PI, 1.25 * Math.PI);
      context.stroke();
      context.beginPath();
      context.moveTo(centerX, centerY - 12);
      context.lineTo(centerX, centerY + 1);
      context.stroke();
    }
    context.restore();
  }

  function renderPreview() {
    const gradient = context.createLinearGradient(0, 0, 480, 272);
    gradient.addColorStop(0, "#070b12");
    gradient.addColorStop(1, "#101824");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 480, 272);

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#f8fafc";
    context.font = "800 16px Inter, Arial, sans-serif";
    context.fillText(copy.touchTitle, 240, 15);
    [0, 1, 2].forEach((dot) => {
      context.beginPath();
      context.arc(228 + dot * 12, 31, 3, 0, Math.PI * 2);
      context.fillStyle = dot === activePage ? "#38bdf8" : "#6b7280";
      context.fill();
    });

    const outerX = 15;
    const outerY = 42;
    const columnGap = 10;
    const rowGap = 8;
    const buttonWidth = (480 - outerX * 2 - columnGap * 2) / 3;
    const buttonHeight = 76;
    const iconColors = ["#38bdf8", "#fb5c7c", "#4ade55", "#facc15", "#a66df4", "#22d3ee"];
    buttonBoxes.length = 0;

    for (let index = 0; index < 6; index += 1) {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = outerX + column * (buttonWidth + columnGap);
      const y = outerY + row * (buttonHeight + rowGap);
      buttonBoxes.push({ x, y, width: buttonWidth, height: buttonHeight });

      const isActive = index === activeButton;
      roundedRect(context, x, y, buttonWidth, buttonHeight, 12);
      const cardGradient = context.createLinearGradient(x, y, x, y + buttonHeight);
      cardGradient.addColorStop(0, isActive ? "#20334a" : "#1b2532");
      cardGradient.addColorStop(1, isActive ? "#152a40" : "#131c27");
      context.fillStyle = cardGradient;
      context.fill();
      context.lineWidth = isActive ? 2.5 : 1.25;
      context.strokeStyle = isActive ? "#38bdf8" : "#475569";
      context.stroke();

      drawTouchIcon(index, x + buttonWidth / 2, y + 21, iconColors[index]);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#f8fafc";
      context.font = "800 14px Inter, Arial, sans-serif";
      context.fillText(copy.cardNames[index], x + buttonWidth / 2, y + 46);

      const assignments = currentAssignments();
      const combo = assignments[index].length ? comboText(index) : copy.unset;
      context.fillStyle = assignments[index].length ? iconColors[index] : "#64748b";
      const fontSize = fitFont(combo, buttonWidth - 16, 10);
      context.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
      context.fillText(combo, x + buttonWidth / 2, y + 65);
    }

    context.fillStyle = "#151d29";
    context.fillRect(0, 210, 480, 62);
    const bottomItems = [
      { x: 10, width: 54, label: "‹", type: "previous", disabled: activePage === 0 },
      ...pageStates.map((_page, index) => ({ x: 74 + index * 114, width: 104, label: displayPageName(index), type: "page", pageIndex: index, active: activePage === index })),
      { x: 416, width: 54, label: "›", type: "next", disabled: activePage === pageStates.length - 1 }
    ];
    navigationBoxes.length = 0;
    bottomItems.forEach((item) => {
      roundedRect(context, item.x, 219, item.width, 43, 9);
      context.fillStyle = item.active ? "#0759b7" : item.disabled ? "#111923" : "#1a2431";
      context.fill();
      context.strokeStyle = item.active ? "#1687ff" : item.disabled ? "#263140" : "#344154";
      context.lineWidth = 1;
      context.stroke();
      context.fillStyle = item.disabled ? "#536172" : "#f8fafc";
      const tabFontSize = item.label.length === 1 ? 28 : fitFont(item.label, item.width - 12, 12, 8);
      context.font = item.label.length === 1 ? `700 ${tabFontSize}px Inter, Arial, sans-serif` : `800 ${tabFontSize}px Inter, Arial, sans-serif`;
      context.fillText(item.label, item.x + item.width / 2, 241);
      navigationBoxes.push({ x: item.x, y: 219, width: item.width, height: 43, type: item.type, pageIndex: item.pageIndex, disabled: item.disabled });
    });
  }

  function renderAll() {
    activeButtonOutput.textContent = `${displayPageName(activePage)} · ${buttonText(activeButton)}`;
    activeComboOutput.textContent = comboText(activeButton);
    syncKeyboardState();
    syncPageNameFields();
    renderAssignmentSummary();
    renderPreview();
  }

  function canvasPoint(event) {
    const rect = preview.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (preview.width / rect.width),
      y: (event.clientY - rect.top) * (preview.height / rect.height)
    };
  }

  function handleCanvasTap(event) {
    const { x, y } = canvasPoint(event);
    const index = buttonBoxes.findIndex((box) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height);
    if (index >= 0) {
      selectButton(index);
      return;
    }
    const navigation = navigationBoxes.find((box) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height);
    if (!navigation || navigation.disabled) return;
    if (navigation.type === "previous") changePage(activePage - 1);
    else if (navigation.type === "next") changePage(activePage + 1);
    else changePage(navigation.pageIndex);
  }

  function setPage(index, announce = true) {
    if (index < 0 || index >= pageStates.length || index === activePage) return false;
    activePage = index;
    activeButton = 0;
    if (announce) {
      status.textContent = lang === "en" ? `${displayPageName(index)} ${copy.pageChanged}` : `${displayPageName(index)} ${copy.pageChanged}`;
    }
    renderAll();
    return true;
  }

  async function changePage(index, startOffset = 0) {
    if (transitioning || index < 0 || index >= pageStates.length || index === activePage) {
      snapPreview(startOffset);
      return;
    }
    transitioning = true;
    const direction = index > activePage ? 1 : -1;
    const width = preview.getBoundingClientRect().width;
    const travel = Math.min(width * 0.24, 150);
    const startOpacity = Math.max(0.72, 1 - Math.abs(startOffset) / Math.max(width, 1) * 0.7);

    try {
      const exitAnimation = preview.animate([
        { transform: `translate3d(${startOffset}px, 0, 0)`, opacity: startOpacity },
        { transform: `translate3d(${-direction * travel}px, 0, 0)`, opacity: 0 }
      ], { duration: startOffset ? 125 : 155, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" });
      await exitAnimation.finished;
      exitAnimation.cancel();
      preview.style.transform = "";
      preview.style.opacity = "";
      setPage(index);

      const enterAnimation = preview.animate([
        { transform: `translate3d(${direction * travel}px, 0, 0)`, opacity: 0 },
        { transform: "translate3d(0, 0, 0)", opacity: 1 }
      ], { duration: 240, easing: "cubic-bezier(.22, 1, .36, 1)" });
      await enterAnimation.finished;
    } catch (_error) {
      setPage(index);
    } finally {
      preview.style.transform = "";
      preview.style.opacity = "";
      transitioning = false;
    }
  }

  function snapPreview(startOffset = 0) {
    const opacity = Math.max(0.72, 1 - Math.abs(startOffset) / Math.max(preview.getBoundingClientRect().width, 1) * 0.7);
    const animation = preview.animate([
      { transform: `translate3d(${startOffset}px, 0, 0)`, opacity },
      { transform: "translate3d(0, 0, 0)", opacity: 1 }
    ], { duration: 220, easing: "cubic-bezier(.22, 1, .36, 1)" });
    animation.finished.catch(() => {}).finally(() => {
      preview.style.transform = "";
      preview.style.opacity = "";
    });
  }

  preview.addEventListener("pointerdown", (event) => {
    if (transitioning || event.button > 0) return;
    pointerState = { id: event.pointerId, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0, swiping: false };
    preview.setPointerCapture?.(event.pointerId);
    preview.classList.add("dragging");
  });

  preview.addEventListener("pointermove", (event) => {
    if (!pointerState || pointerState.id !== event.pointerId || transitioning) return;
    pointerState.dx = event.clientX - pointerState.startX;
    pointerState.dy = event.clientY - pointerState.startY;
    if (!pointerState.swiping && Math.abs(pointerState.dx) > 7 && Math.abs(pointerState.dx) > Math.abs(pointerState.dy) * 1.15) {
      pointerState.swiping = true;
    }
    if (!pointerState.swiping) return;
    event.preventDefault();
    const width = preview.getBoundingClientRect().width;
    const atBoundary = (activePage === 0 && pointerState.dx > 0) || (activePage === pageStates.length - 1 && pointerState.dx < 0);
    const resistedDx = atBoundary ? pointerState.dx * 0.28 : pointerState.dx;
    const limitedDx = Math.max(-width * 0.38, Math.min(width * 0.38, resistedDx));
    pointerState.renderedDx = limitedDx;
    preview.style.transform = `translate3d(${limitedDx}px, 0, 0)`;
    preview.style.opacity = String(Math.max(0.72, 1 - Math.abs(limitedDx) / Math.max(width, 1) * 0.7));
  });

  preview.addEventListener("pointerup", (event) => {
    if (!pointerState || pointerState.id !== event.pointerId) return;
    const state = pointerState;
    pointerState = null;
    preview.classList.remove("dragging");
    preview.releasePointerCapture?.(event.pointerId);
    if (!state.swiping) {
      handleCanvasTap(event);
      return;
    }
    const width = preview.getBoundingClientRect().width;
    const threshold = Math.max(42, width * 0.11);
    const renderedDx = state.renderedDx || 0;
    if (Math.abs(state.dx) >= threshold) {
      changePage(activePage + (state.dx < 0 ? 1 : -1), renderedDx);
    } else {
      snapPreview(renderedDx);
    }
  });

  preview.addEventListener("pointercancel", () => {
    const renderedDx = pointerState?.renderedDx || 0;
    pointerState = null;
    preview.classList.remove("dragging");
    snapPreview(renderedDx);
  });

  document.querySelector("#gkClearButton").addEventListener("click", () => {
    currentAssignments()[activeButton] = [];
    status.textContent = lang === "en" ? `${copy.cleared} ${buttonText(activeButton)}.` : `${buttonText(activeButton)}${copy.cleared}`;
    renderAll();
  });

  document.querySelector("#gkClearAll").addEventListener("click", () => {
    pageStates.forEach((page) => page.assignments.forEach((keys) => keys.splice(0)));
    status.textContent = copy.clearedAll;
    renderAll();
  });

  function formatUsbId(value) {
    return Number.isInteger(value) ? `0x${value.toString(16).toUpperCase().padStart(4, "0")}` : "—";
  }

  function appendUploadLog(message) {
    const line = String(message || "").trim();
    if (!line) return;
    const lines = `${uploadLog.textContent}\n${line}`.trim().split("\n").slice(-8);
    uploadLog.textContent = lines.join("\n");
    uploadLog.hidden = false;
  }

  async function sha256Hex(data) {
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function md5Hex(image) {
    const view = image.buffer.slice(image.byteOffset, image.byteOffset + image.byteLength);
    return window.SparkMD5.ArrayBuffer.hash(view);
  }

  async function loadFirmwarePackage() {
    const manifestUrl = new URL(uploadSection.dataset.firmwareManifest, document.baseURI);
    const manifestResponse = await fetch(manifestUrl, { cache: "no-store" });
    if (!manifestResponse.ok) throw new Error(`Firmware manifest HTTP ${manifestResponse.status}`);
    const manifest = await manifestResponse.json();
    const files = [];
    for (const entry of manifest.files || []) {
      const fileUrl = new URL(entry.path, manifestUrl);
      const response = await fetch(fileUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Firmware file HTTP ${response.status}: ${entry.path}`);
      const buffer = await response.arrayBuffer();
      const actualHash = await sha256Hex(buffer);
      if (actualHash !== String(entry.sha256).toLowerCase()) throw new Error(`${copy.invalidFirmware} (${entry.path})`);
      files.push({ data: new Uint8Array(buffer), address: Number(entry.address) });
    }
    if (!files.length) throw new Error(copy.invalidFirmware);
    return { manifest, files };
  }

  async function resetIntoBootloader(port) {
    uploadStatus.textContent = copy.firmwareResetting;
    appendUploadLog("USB CDC 1200bps bootloader reset");
    try {
      await port.open({ baudRate: 1200 });
      await new Promise((resolve) => setTimeout(resolve, 120));
      await port.close();
    } catch (error) {
      if (port.readable || port.writable) {
        try {
          await port.close();
        } catch (_closeError) {
          // The device may already have disconnected for its bootloader reset.
        }
      }
      appendUploadLog(error?.message || error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1800));
    const authorizedPorts = await navigator.serial.getPorts();
    return authorizedPorts.find((candidate) => {
      const info = candidate.getInfo();
      return info.usbVendorId === 0x303A && info.usbProductId === 0x1001;
    }) || port;
  }

  async function watchdogResetIntoApplication(loader) {
    // USB-Serial/JTAG only performs a core reset via RTS. A watchdog reset is
    // required to re-sample GPIO0 and leave the ESP32-S3 download mode.
    const rtcBase = 0x60008000;
    const wdtConfig0 = rtcBase + 0x0098;
    const wdtConfig1 = rtcBase + 0x009C;
    const wdtWriteProtect = rtcBase + 0x00B0;
    await loader.writeReg(wdtWriteProtect, 0x50D83AA1);
    await loader.writeReg(wdtConfig1, 2000);
    await loader.writeReg(wdtConfig0, 0xD0000102);
    await loader.writeReg(wdtWriteProtect, 0);
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  async function uploadFirmware() {
    if (!selectedPort || uploadBusy) return;
    uploadBusy = true;
    portButton.disabled = true;
    uploadButton.disabled = true;
    uploadProgress.hidden = false;
    uploadProgress.value = 0;
    uploadLog.textContent = "";
    uploadLog.hidden = true;
    let transport = null;
    try {
      uploadStatus.textContent = copy.firmwareLoading;
      const { manifest, files } = await loadFirmwarePackage();
      const { ESPLoader, Transport } = await import(flasherModuleUrl);
      selectedPort = await resetIntoBootloader(selectedPort);
      transport = new Transport(selectedPort, true);
      const terminal = {
        clean() {
          uploadLog.textContent = "";
        },
        writeLine(message) {
          appendUploadLog(message);
        },
        write(message) {
          appendUploadLog(message);
        }
      };
      const loader = new ESPLoader({ transport, baudrate: 460800, terminal, debugLogging: false });
      uploadStatus.textContent = copy.firmwareConnecting;
      const chipName = await loader.main();
      if (!String(chipName).includes("ESP32-S3")) throw new Error(`${copy.chipMismatch} (${chipName})`);
      appendUploadLog(`${chipName} · ${manifest.version}`);
      await loader.writeFlash({
        fileArray: files,
        flashMode: manifest.flashMode || "dio",
        flashFreq: manifest.flashFreq || "80m",
        flashSize: manifest.flashSize || "4MB",
        eraseAll: false,
        compress: true,
        calculateMD5Hash: md5Hex,
        reportProgress(fileIndex, written, total) {
          const fileProgress = total ? written / total : 0;
          const percent = Math.round(((fileIndex + fileProgress) / files.length) * 100);
          uploadProgress.value = percent;
          uploadStatus.textContent = `${copy.firmwareUploading} · ${percent}%`;
        }
      });
      uploadProgress.value = 100;
      uploadStatus.textContent = copy.firmwareRebooting;
      appendUploadLog(copy.firmwareRebooting);
      await watchdogResetIntoApplication(loader);
      try {
        await transport.disconnect();
      } catch (_error) {
        // Native USB can disappear as soon as the board restarts.
      }
      transport = null;
      selectedPort = null;
      uploadStatus.textContent = copy.firmwareSuccess;
    } catch (error) {
      console.error(error);
      appendUploadLog(error?.message || error);
      uploadStatus.textContent = `${copy.firmwareFailed}: ${error?.message || error}`;
      uploadProgress.value = 0;
      if (transport) {
        try {
          await transport.disconnect();
        } catch (_disconnectError) {
          // Keep the original upload error visible.
        }
      }
    } finally {
      uploadBusy = false;
      portButton.disabled = false;
      uploadButton.disabled = !selectedPort;
    }
  }

  function useSelectedPort(port) {
    const info = port.getInfo();
    if (info.usbVendorId !== 0x303A || info.usbProductId !== 0x1001) throw new Error(copy.invalidDevice);
    selectedPort = port;
    uploadButton.disabled = false;
    uploadStatus.textContent = `${uploadSection.dataset.copySelected} VID ${formatUsbId(info.usbVendorId)} · PID ${formatUsbId(info.usbProductId)}`;
  }

  async function initializePortSelector() {
    if (!window.isSecureContext) {
      portButton.disabled = true;
      uploadStatus.textContent = uploadSection.dataset.copyInsecure;
      return;
    }
    if (!("serial" in navigator)) {
      portButton.disabled = true;
      uploadStatus.textContent = uploadSection.dataset.copyUnsupported;
      return;
    }
    const authorizedPorts = await navigator.serial.getPorts();
    const authorizedTarget = authorizedPorts.find((port) => {
      const info = port.getInfo();
      return info.usbVendorId === 0x303A && info.usbProductId === 0x1001;
    });
    if (authorizedTarget) useSelectedPort(authorizedTarget);
    portButton.addEventListener("click", async () => {
      try {
        const port = await navigator.serial.requestPort({ filters: [{ usbVendorId: 0x303A, usbProductId: 0x1001 }] });
        useSelectedPort(port);
      } catch (error) {
        if (error?.name !== "NotFoundError") console.error(error);
        selectedPort = null;
        uploadButton.disabled = true;
        uploadStatus.textContent = error?.name === "NotFoundError" ? uploadSection.dataset.copyCancelled : `${uploadSection.dataset.copyCancelled} ${error?.message || ""}`.trim();
      }
    });
    uploadButton.addEventListener("click", uploadFirmware);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  renderPageNameFields();
  renderKeyboard();
  renderAll();
  initializePortSelector();
}());
