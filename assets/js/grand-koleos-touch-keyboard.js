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
    clearedAll: "All button shortcuts and images have been reset.",
    unset: "Not assigned",
    touchTitle: "TOUCH KEYBOARD",
    page: "PAGE",
    pageChanged: "page selected.",
    mediaTitle: "MEDIA KEYS",
    volumeMute: "Mute",
    volumeDown: "Volume −",
    volumeUp: "Volume +",
    changeIcon: "Change image",
    iconChanged: "image changed to",
    iconGroups: { basic: "Basic", app: "Apps", media: "Media", direction: "Directions", device: "Device" },
    pageName: (index) => `Page ${index + 1} name`,
    configCreating: "Creating board settings from the current page names, icons, and shortcuts...",
    firmwareLoading: "Loading the firmware package...",
    firmwareValidating: "Validating firmware files and board settings...",
    firmwareResetting: "Restarting the USB CDC device in bootloader mode...",
    firmwareWaitingPort: "Waiting for the bootloader serial port to appear...",
    firmwareSelectingPort: "Select the new bootloader USB port in the browser dialog...",
    firmwareConnecting: "Connecting to the ESP32-S3 bootloader...",
    firmwareUploading: "Uploading firmware",
    firmwareVerifying: "Verifying the data written to flash...",
    firmwareRebooting: "Firmware verified. Restarting the board in application mode...",
    firmwareSuccess: "Upload complete. The board has restarted with the SolForge Touch Keyboard screen.",
    firmwareFailed: "Upload failed",
    invalidDevice: "This is not the supported ESP32-S3 USB device.",
    invalidFirmware: "Firmware validation failed. Upload was stopped.",
    chipMismatch: "The connected chip is not an ESP32-S3. Upload was stopped.",
    bootloaderPortUnavailable: "The bootloader serial port did not become available. Reconnect the USB cable and select the port again.",
    bootloaderPortCancelled: "Bootloader port selection was cancelled. Click Apply current settings and select the USB JTAG/serial debug unit port.",
    tooManyKeys: "You can assign up to three keys to one button.",
    maxThreeKeys: "You can assign up to three keys to one button.",
    tooManyMedia: "Only one volume media key can be assigned to a button."
  } : {
    button: "버튼",
    empty: "키 조합 없음",
    selected: "선택됨 · 가상 키보드에서 조합할 키를 누르세요.",
    assigned: "에 할당됨",
    removed: "에서 해제됨",
    cleared: "의 키 조합을 지웠습니다.",
    clearedAll: "모든 버튼의 키 조합과 이미지를 초기화했습니다.",
    unset: "미설정",
    touchTitle: "터치 키보드",
    page: "페이지",
    pageChanged: "페이지로 이동했습니다.",
    mediaTitle: "미디어 키",
    volumeMute: "음소거",
    volumeDown: "볼륨 −",
    volumeUp: "볼륨 +",
    changeIcon: "이미지 변경",
    iconChanged: "이미지를 다음으로 변경했습니다:",
    iconGroups: { basic: "기본", app: "앱", media: "미디어", direction: "방향", device: "기기" },
    pageName: (index) => `${index + 1}페이지 이름`,
    configCreating: "현재 페이지 이름과 버튼별 아이콘·키 조합으로 보드 설정을 만들고 있습니다...",
    firmwareLoading: "펌웨어 패키지를 불러오고 있습니다...",
    firmwareValidating: "펌웨어 파일과 보드 설정을 검증하고 있습니다...",
    firmwareResetting: "USB CDC 장치를 부트로더 모드로 다시 시작하고 있습니다...",
    firmwareWaitingPort: "새 부트로더 USB 포트가 나타나기를 기다리고 있습니다...",
    firmwareSelectingPort: "브라우저 창에서 새 부트로더 USB 포트를 선택해 주세요...",
    firmwareConnecting: "ESP32-S3 부트로더에 연결하고 있습니다...",
    firmwareUploading: "펌웨어 업로드 중",
    firmwareVerifying: "플래시에 기록된 데이터를 검증하고 있습니다...",
    firmwareRebooting: "펌웨어 검증 완료 · 보드를 앱 모드로 다시 시작하고 있습니다...",
    firmwareSuccess: "업로드를 완료했습니다. SolForge Touch Keyboard 화면으로 보드가 다시 시작되었습니다.",
    firmwareFailed: "업로드 실패",
    invalidDevice: "지원 대상 ESP32-S3 USB 장치가 아닙니다.",
    invalidFirmware: "펌웨어 검증에 실패해 업로드를 중단했습니다.",
    chipMismatch: "연결된 칩이 ESP32-S3가 아니어서 업로드를 중단했습니다.",
    bootloaderPortUnavailable: "부트로더 USB 포트를 열 수 없습니다. USB 케이블을 다시 연결한 뒤 포트를 다시 선택해 주세요.",
    bootloaderPortCancelled: "부트로더 포트 선택이 취소됐습니다. 현재 설정을 보드에 적용을 다시 누르고 USB JTAG/serial debug unit 포트를 선택해 주세요.",
    tooManyKeys: "버튼 하나에는 키 조합을 최대 3개까지 지정할 수 있습니다.",
    maxThreeKeys: "버튼 하나에는 키 조합을 최대 3개까지만 지정할 수 있습니다.",
    tooManyMedia: "버튼 하나에는 볼륨 미디어 키를 하나만 지정할 수 있습니다."
  };

  const iconCatalog = [
    { id: "home", code: 0, group: "basic", ko: "홈", en: "Home" },
    { id: "back", code: 1, group: "basic", ko: "뒤로가기", en: "Back" },
    { id: "menu", code: 2, group: "basic", ko: "메뉴", en: "Menu" },
    { id: "favorite", code: 3, group: "basic", ko: "즐겨찾기", en: "Favorite" },
    { id: "voice", code: 4, group: "basic", ko: "음성", en: "Voice" },
    { id: "power", code: 5, group: "basic", ko: "전원", en: "Power" },
    { id: "forward", code: 6, group: "basic", ko: "앞으로가기", en: "Forward" },
    { id: "navigation", code: 7, group: "app", ko: "네비게이션", en: "Navigation" },
    { id: "tmap", code: 8, group: "app", ko: "티맵", en: "TMAP" },
    { id: "youtube", code: 9, group: "app", ko: "유튜브", en: "YouTube" },
    { id: "chrome", code: 10, group: "app", ko: "크롬", en: "Chrome" },
    { id: "volume-up", code: 11, group: "media", ko: "볼륨 키우기", en: "Volume up" },
    { id: "volume-down", code: 12, group: "media", ko: "볼륨 줄이기", en: "Volume down" },
    { id: "mute", code: 13, group: "media", ko: "음소거", en: "Mute" },
    { id: "fullscreen", code: 14, group: "media", ko: "전체화면", en: "Fullscreen" },
    { id: "forward-10", code: 15, group: "media", ko: "10초 앞으로", en: "Forward 10 seconds" },
    { id: "replay-10", code: 16, group: "media", ko: "10초 뒤로", en: "Back 10 seconds" },
    { id: "play-pause", code: 17, group: "media", ko: "재생/정지", en: "Play / pause" },
    { id: "previous-track", code: 18, group: "media", ko: "이전곡", en: "Previous track" },
    { id: "next-track", code: 19, group: "media", ko: "다음곡", en: "Next track" },
    { id: "notification", code: 20, group: "device", ko: "알림", en: "Notification" },
    { id: "arrow-up", code: 21, group: "direction", ko: "방향키 위", en: "Arrow up" },
    { id: "arrow-down", code: 22, group: "direction", ko: "방향키 아래", en: "Arrow down" },
    { id: "arrow-left", code: 23, group: "direction", ko: "방향키 왼쪽", en: "Arrow left" },
    { id: "arrow-right", code: 24, group: "direction", ko: "방향키 오른쪽", en: "Arrow right" },
    { id: "music", code: 25, group: "media", ko: "음표", en: "Music" },
    { id: "settings", code: 26, group: "device", ko: "설정", en: "Settings" },
    { id: "phone", code: 27, group: "device", ko: "전화", en: "Phone" },
    { id: "car", code: 28, group: "device", ko: "자동차", en: "Car" },
    { id: "brightness", code: 29, group: "device", ko: "화면 밝기", en: "Brightness" },
    { id: "bluetooth", code: 30, group: "device", ko: "블루투스", en: "Bluetooth" },
    { id: "wifi", code: 31, group: "device", ko: "와이파이", en: "Wi-Fi" },
    { id: "camera", code: 32, group: "device", ko: "카메라", en: "Camera" }
  ];
  const iconById = new Map(iconCatalog.map((icon) => [icon.id, icon]));
  const defaultIconIds = ["home", "back", "menu", "favorite", "voice", "power"];
  const iconLabel = (iconId) => {
    const icon = iconById.get(iconId) || iconCatalog[0];
    return lang === "en" ? icon.en : icon.ko;
  };

  function iconSvg(iconId) {
    const stroke = 'fill="none" stroke="#e8f1fb" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"';
    const icons = {
      home: `<path ${stroke} d="M8 22 24 8l16 14M12 20v19h24V20M20 39V28h8v11"/>`,
      back: `<path ${stroke} d="M20 12 8 24l12 12M10 24h17c8 0 13 5 13 13"/>`,
      menu: `<path ${stroke} d="M10 14h28M10 24h28M10 34h28"/>`,
      favorite: `<path ${stroke} d="m24 7 5.2 10.5 11.6 1.7-8.4 8.2 2 11.6L24 33.5 13.6 39l2-11.6-8.4-8.2 11.6-1.7Z"/>`,
      voice: `<rect x="18" y="7" width="12" height="23" rx="6" ${stroke}/><path ${stroke} d="M12 23a12 12 0 0 0 24 0M24 35v7M18 42h12"/>`,
      power: `<path ${stroke} d="M24 6v17M15 11a17 17 0 1 0 18 0"/>`,
      forward: `<path ${stroke} d="m28 12 12 12-12 12M38 24H21c-8 0-13 5-13 13"/>`,
      navigation: `<circle cx="24" cy="24" r="18" ${stroke}/><path d="m32.5 14-6 15-11 5 6-15Z" fill="#38bdf8" stroke="#e8f1fb" stroke-width="2" stroke-linejoin="round"/>`,
      tmap: `<defs><linearGradient id="tmBar" x1="7" y1="12" x2="41" y2="12"><stop stop-color="#f238b7"/><stop offset=".5" stop-color="#8b39f5"/><stop offset="1" stop-color="#36ddb0"/></linearGradient><linearGradient id="tmCurve" x1="35" y1="8" x2="21" y2="42"><stop stop-color="#36ddb0"/><stop offset=".48" stop-color="#14a8df"/><stop offset="1" stop-color="#1462ff"/></linearGradient></defs><rect x="4" y="4" width="40" height="40" rx="10" fill="white"/><path d="M8 8h33v8H8Z" fill="url(#tmBar)"/><path d="M41 8h-6c-10 0-17 8-17 19v15h8V27c0-7 4-11 10-11h5Z" fill="url(#tmCurve)"/>`,
      youtube: `<rect x="4" y="10" width="40" height="28" rx="8" fill="#ff0033"/><path d="m21 18 11 6-11 6Z" fill="white"/>`,
      chrome: `<circle cx="24" cy="24" r="20" fill="#fff"/><path d="M24 24 12.5 4.2A20 20 0 0 1 43 17H24Z" fill="#ea4335"/><path d="M24 24h19A20 20 0 0 1 18 43l6-19Z" fill="#34a853"/><path d="m24 24-6 19A20 20 0 0 1 12.5 4.2Z" fill="#fbbc05"/><circle cx="24" cy="24" r="9" fill="#4285f4" stroke="white" stroke-width="2"/>`,
      "volume-up": `<path ${stroke} d="M8 20h8l10-9v26l-10-9H8Zm24-2a9 9 0 0 1 0 12M36 13a16 16 0 0 1 0 22"/>`,
      "volume-down": `<path ${stroke} d="M8 20h8l10-9v26l-10-9H8Zm24-2a9 9 0 0 1 0 12"/>`,
      mute: `<path ${stroke} d="M7 20h8l10-9v26l-10-9H7Zm24-3 10 14M41 17 31 31"/>`,
      fullscreen: `<path ${stroke} d="M18 8H8v10M30 8h10v10M40 30v10H30M18 40H8V30"/>`,
      "forward-10": `<path ${stroke} d="m33 12 7 2-2-7M39 14A18 18 0 1 0 42 30"/><text x="24" y="31" fill="#e8f1fb" font-size="15" font-weight="800" text-anchor="middle">10</text>`,
      "replay-10": `<path ${stroke} d="m15 12-7 2 2-7M9 14A18 18 0 1 1 6 30"/><text x="24" y="31" fill="#e8f1fb" font-size="15" font-weight="800" text-anchor="middle">10</text>`,
      "play-pause": `<path d="m8 10 16 14L8 38Z" fill="#e8f1fb"/><rect x="29" y="10" width="5" height="28" rx="2" fill="#e8f1fb"/><rect x="38" y="10" width="5" height="28" rx="2" fill="#e8f1fb"/>`,
      "previous-track": `<rect x="8" y="10" width="4" height="28" rx="2" fill="#e8f1fb"/><path d="m38 10-22 14 22 14Z" fill="#e8f1fb"/>`,
      "next-track": `<path d="m10 10 22 14-22 14Z" fill="#e8f1fb"/><rect x="36" y="10" width="4" height="28" rx="2" fill="#e8f1fb"/>`,
      notification: `<path ${stroke} d="M12 34h24l-3-5V20a9 9 0 0 0-18 0v9Zm8 5a5 5 0 0 0 8 0"/>`,
      "arrow-up": `<path ${stroke} d="m10 28 14-14 14 14M24 15v25"/>`,
      "arrow-down": `<path ${stroke} d="m10 20 14 14 14-14M24 33V8"/>`,
      "arrow-left": `<path ${stroke} d="M28 10 14 24l14 14M15 24h25"/>`,
      "arrow-right": `<path ${stroke} d="m20 10 14 14-14 14M33 24H8"/>`,
      music: `<path ${stroke} d="M20 35V13l19-4v22M20 17l19-4"/><ellipse cx="14" cy="36" rx="7" ry="5" fill="#e8f1fb"/><ellipse cx="33" cy="32" rx="7" ry="5" fill="#e8f1fb"/>`,
      settings: `<path ${stroke} d="M24 7v5M24 36v5M7 24h5M36 24h5M12 12l4 4M32 32l4 4M36 12l-4 4M16 32l-4 4"/><circle cx="24" cy="24" r="10" ${stroke}/><circle cx="24" cy="24" r="4" fill="#e8f1fb"/>`,
      phone: `<path ${stroke} d="M14 8 8 13c2 15 12 25 27 27l5-6-9-6-4 5c-6-3-9-6-12-12l5-4Z"/>`,
      car: `<path ${stroke} d="m9 29 3-11h24l3 11M7 29h34v9H7Zm7 9v4M34 38v4M13 33h3M32 33h3"/>`,
      brightness: `<circle cx="24" cy="24" r="8" fill="#facc15"/><path ${stroke} d="M24 5v6M24 37v6M5 24h6M37 24h6M11 11l4 4M33 33l4 4M37 11l-4 4M15 33l-4 4"/>`,
      bluetooth: `<path ${stroke} d="M23 5v38l12-10-12-9 12-9L23 5Zm0 19-10-8m10 8-10 8"/>`,
      wifi: `<path ${stroke} d="M7 18a26 26 0 0 1 34 0M13 25a17 17 0 0 1 22 0M19 32a8 8 0 0 1 10 0"/><circle cx="24" cy="39" r="3" fill="#e8f1fb"/>`,
      camera: `<path ${stroke} d="M8 16h9l3-5h8l3 5h9v24H8Z"/><circle cx="24" cy="28" r="8" ${stroke}/>`
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${icons[iconId] || icons.home}</svg>`;
  }

  const canvasIconImages = new Map();
  function drawCanvasIcon(iconId, centerX, centerY, size = 30) {
    let image = canvasIconImages.get(iconId);
    if (!image) {
      image = new Image();
      image.addEventListener("load", () => renderPreview(), { once: true });
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg(iconId))}`;
      canvasIconImages.set(iconId, image);
    }
    if (image.complete && image.naturalWidth) context.drawImage(image, centerX - size / 2, centerY - size / 2, size, size);
  }

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

  const keyboardCodes = new Map([
    ["Escape", 0xB1], ["F1", 0xC2], ["F2", 0xC3], ["F3", 0xC4], ["F4", 0xC5], ["F5", 0xC6], ["F6", 0xC7],
    ["F7", 0xC8], ["F8", 0xC9], ["F9", 0xCA], ["F10", 0xCB], ["F11", 0xCC], ["F12", 0xCD], ["Print Screen", 0xCE],
    ["Scroll Lock", 0xCF], ["Pause", 0xD0], ["Backspace", 0xB2], ["Insert", 0xD1], ["Home", 0xD2], ["Page Up", 0xD3],
    ["Tab", 0xB3], ["Delete", 0xD4], ["End", 0xD5], ["Page Down", 0xD6], ["Caps Lock", 0xC1], ["Enter", 0xB0],
    ["Shift", 0x81], ["Right Shift", 0x85], ["Arrow Up", 0xDA], ["Ctrl", 0x80], ["Win", 0x83], ["Alt", 0x82],
    ["Space", 0x20], ["Right Alt", 0x86], ["Menu", 0xED], ["Right Ctrl", 0x84], ["Arrow Left", 0xD8],
    ["Arrow Down", 0xD9], ["Arrow Right", 0xD7]
  ]);
  const consumerCodes = new Map([["Volume Mute", 0x00E2], ["Volume Down", 0x00EA], ["Volume Up", 0x00E9]]);
  const modifierCodes = new Set([0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87]);

  const pageStates = Array.from({ length: 3 }, (_value, index) => ({
    name: lang === "en" ? `Page ${index + 1}` : `${index + 1} 페이지`,
    assignments: Array.from({ length: 6 }, () => []),
    icons: defaultIconIds.slice()
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
  const iconEditor = document.querySelector("#gkIconEditor");
  const selectedIcon = document.querySelector("#gkSelectedIcon");
  const selectedIconName = document.querySelector("#gkSelectedIconName");
  const changeIconButton = document.querySelector("#gkChangeIconButton");
  const iconDialog = document.querySelector("#gkIconDialog");
  const iconGroups = document.querySelector("#gkIconGroups");
  const iconDialogClose = document.querySelector("#gkIconDialogClose");
  const iconDialogDone = document.querySelector("#gkIconDialogDone");
  const uploadSection = document.querySelector("#gkUploadSection");
  const portButton = document.querySelector("#gkPortButton");
  const uploadButton = document.querySelector("#gkUploadButton");
  const uploadStatus = document.querySelector("#gkUploadStatus");
  const uploadProgressRow = document.querySelector("#gkUploadProgressRow");
  const uploadProgress = document.querySelector("#gkUploadProgress");
  const uploadPercent = document.querySelector("#gkUploadPercent");
  const uploadLog = document.querySelector("#gkUploadLog");
  const scriptBase = new URL(".", document.currentScript.src);
  const flasherModuleUrl = new URL("../vendor/esptool-js-0.6.1.bundle.js", scriptBase).href;
  let selectedPort = null;
  let uploadBusy = false;

  function currentAssignments() {
    return pageStates[activePage].assignments;
  }

  function currentIcons() {
    return pageStates[activePage].icons;
  }

  function defaultPageName(index) {
    return lang === "en" ? `Page ${index + 1}` : `${index + 1} 페이지`;
  }

  function displayPageName(index) {
    return pageStates[index].name.trim() || defaultPageName(index);
  }

  function comboTextFor(pageIndex, index) {
    const keys = pageStates[pageIndex].assignments[index];
    return keys.length ? keys.map((id) => keyLabels.get(id) || id).join(" + ") : copy.empty;
  }

  function comboText(index) {
    return comboTextFor(activePage, index);
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
      if (keys.length >= 3) {
        status.textContent = copy.maxThreeKeys;
        window.alert(copy.maxThreeKeys);
        return;
      }
      keys.push(keyId);
      status.textContent = lang === "en" ? `${displayKey} ${copy.assigned} ${buttonText(activeButton)}.` : `${displayKey} · ${buttonText(activeButton)}${copy.assigned}`;
    }
    renderAll();
  }

  function selectButton(index, revealIconEditor = true) {
    activeButton = index;
    if (revealIconEditor) iconEditor.hidden = false;
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

  function syncIconEditor() {
    const iconId = currentIcons()[activeButton];
    selectedIcon.innerHTML = iconSvg(iconId);
    selectedIconName.textContent = iconLabel(iconId);
    changeIconButton.setAttribute("aria-label", `${buttonText(activeButton)} · ${copy.changeIcon}`);
  }

  function renderIconPicker() {
    const selectedId = currentIcons()[activeButton];
    const groupOrder = ["basic", "app", "media", "direction", "device"];
    iconGroups.innerHTML = groupOrder.map((group) => {
      const choices = iconCatalog.filter((icon) => icon.group === group).map((icon) => {
        const label = iconLabel(icon.id);
        const active = icon.id === selectedId;
        return `<button type="button" class="gk-icon-choice${active ? " active" : ""}" data-gk-icon="${escapeHtml(icon.id)}" aria-label="${escapeHtml(label)}" aria-pressed="${active}"><span class="gk-icon-choice-preview" aria-hidden="true">${iconSvg(icon.id)}</span><span>${escapeHtml(label)}</span></button>`;
      }).join("");
      return `<section class="gk-icon-group"><strong>${escapeHtml(copy.iconGroups[group])}</strong><div class="gk-icon-grid">${choices}</div></section>`;
    }).join("");
    iconGroups.querySelectorAll("[data-gk-icon]").forEach((button) => {
      button.addEventListener("click", () => {
        const iconId = button.dataset.gkIcon;
        currentIcons()[activeButton] = iconId;
        status.textContent = `${buttonText(activeButton)} · ${copy.iconChanged} ${iconLabel(iconId)}`;
        renderAll();
        renderIconPicker();
      });
    });
  }

  function openIconPicker() {
    renderIconPicker();
    if (typeof iconDialog.showModal === "function") iconDialog.showModal();
    else iconDialog.setAttribute("open", "");
  }

  function closeIconPicker() {
    if (typeof iconDialog.close === "function") iconDialog.close();
    else iconDialog.removeAttribute("open");
  }

  changeIconButton.addEventListener("click", openIconPicker);
  iconDialogClose.addEventListener("click", closeIconPicker);
  iconDialogDone.addEventListener("click", closeIconPicker);
  iconDialog.addEventListener("click", (event) => {
    if (event.target === iconDialog) closeIconPicker();
  });

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

      drawCanvasIcon(currentIcons()[index], x + buttonWidth / 2, y + 25, 32);

      const assignments = currentAssignments();
      const combo = assignments[index].length ? comboText(index) : copy.unset;
      context.fillStyle = assignments[index].length ? iconColors[index] : "#64748b";
      const fontSize = fitFont(combo, buttonWidth - 16, 10);
      context.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
      context.fillText(combo, x + buttonWidth / 2, y + 59);
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
    syncIconEditor();
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
    pageStates.forEach((page) => {
      page.assignments.forEach((keys) => keys.splice(0));
      page.icons = defaultIconIds.slice();
    });
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

  function setUploadProgress(percent, message, log = false) {
    const value = Math.max(0, Math.min(100, Math.round(percent)));
    uploadProgress.value = value;
    uploadPercent.textContent = `${value}%`;
    uploadStatus.textContent = message;
    if (log) appendUploadLog(`${value}% · ${message}`);
  }

  function writeFixedUtf8(target, offset, length, value) {
    const encoder = new TextEncoder();
    let cursor = 0;
    for (const character of String(value)) {
      const bytes = encoder.encode(character);
      if (cursor + bytes.length >= length) break;
      target.set(bytes, offset + cursor);
      cursor += bytes.length;
    }
    target[offset + cursor] = 0;
  }

  function fnv1a32(bytes) {
    let hash = 0x811C9DC5;
    for (const byte of bytes) {
      hash ^= byte;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
  }

  function keyboardCode(keyId) {
    if (keyboardCodes.has(keyId)) return keyboardCodes.get(keyId);
    if (keyId.length !== 1) return null;
    const character = /^[A-Z]$/.test(keyId) ? keyId.toLowerCase() : keyId;
    return character.charCodeAt(0);
  }

  function buildBoardConfig(address) {
    const pageNameBytes = 40;
    const comboLabelBytes = 48;
    const storedKeyCount = 8;
    const buttonBytes = comboLabelBytes + 1 + storedKeyCount + 2 + 1;
    const pageBytes = pageNameBytes + (6 * buttonBytes);
    const payloadSize = 3 * pageBytes;
    const config = new Uint8Array(4096);
    const view = new DataView(config.buffer);
    view.setUint32(0, 0x4B474653, true);
    view.setUint16(4, 2, true);
    view.setUint16(6, payloadSize, true);
    view.setUint32(12, 0, true);

    let pageOffset = 16;
    pageStates.forEach((page, pageIndex) => {
      writeFixedUtf8(config, pageOffset, pageNameBytes, displayPageName(pageIndex));
      let buttonOffset = pageOffset + pageNameBytes;
      page.assignments.forEach((assignments, buttonIndex) => {
        writeFixedUtf8(config, buttonOffset, comboLabelBytes, assignments.length ? comboTextFor(pageIndex, buttonIndex) : copy.unset);
        const keys = [];
        const media = [];
        assignments.forEach((keyId) => {
          if (consumerCodes.has(keyId)) media.push(consumerCodes.get(keyId));
          else {
            const code = keyboardCode(keyId);
            if (code === null) throw new Error(`${copy.invalidFirmware} (${keyId})`);
            keys.push(code);
          }
        });
        const regularKeyCount = keys.filter((code) => !modifierCodes.has(code)).length;
        if (assignments.length > 3 || regularKeyCount > 6 || keys.length > storedKeyCount) throw new Error(`${copy.tooManyKeys} (${buttonText(buttonIndex)})`);
        if (media.length > 1) throw new Error(`${copy.tooManyMedia} (${buttonText(buttonIndex)})`);
        config[buttonOffset + comboLabelBytes] = keys.length;
        keys.forEach((code, index) => { config[buttonOffset + comboLabelBytes + 1 + index] = code; });
        view.setUint16(buttonOffset + comboLabelBytes + 1 + storedKeyCount, media[0] || 0, true);
        config[buttonOffset + comboLabelBytes + 1 + storedKeyCount + 2] = iconById.get(page.icons[buttonIndex])?.code || 0;
        buttonOffset += buttonBytes;
      });
      pageOffset += pageBytes;
    });
    view.setUint32(8, fnv1a32(config.subarray(16, 16 + payloadSize)), true);
    return { data: config, address, name: lang === "en" ? "Board settings" : "보드 설정" };
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
      files.push({ data: new Uint8Array(buffer), address: Number(entry.address), name: entry.path });
    }
    if (!files.length) throw new Error(copy.invalidFirmware);
    return { manifest, files };
  }

  function isTargetPort(port) {
    const info = port.getInfo();
    return info.usbVendorId === 0x303A && info.usbProductId === 0x1001;
  }

  async function waitForBootloaderPort(previousPort, timeoutMs = 12000) {
    let deadline = Date.now() + timeoutMs;
    let lastOpenError = null;
    let promptedPort = null;
    let permissionPrompted = false;
    setUploadProgress(21, copy.firmwareWaitingPort, true);

    while (Date.now() < deadline) {
      const authorizedPorts = (await navigator.serial.getPorts()).filter(isTargetPort);
      if (promptedPort && !authorizedPorts.includes(promptedPort)) authorizedPorts.unshift(promptedPort);
      // Windows exposes the ESP32-S3 application and ROM bootloader as separate
      // COM ports. Prefer the newly appeared object instead of the stale app port.
      authorizedPorts.sort((left, right) => {
        const leftRank = left === promptedPort ? -1 : Number(left === previousPort);
        const rightRank = right === promptedPort ? -1 : Number(right === previousPort);
        return leftRank - rightRank;
      });

      for (const candidate of authorizedPorts) {
        try {
          if (candidate.readable || candidate.writable) await candidate.close();
          await candidate.open({ baudRate: 115200 });
          await candidate.close();
          await new Promise((resolve) => setTimeout(resolve, 180));
          appendUploadLog("Bootloader serial port ready");
          return candidate;
        } catch (error) {
          lastOpenError = error;
          if (candidate.readable || candidate.writable) {
            try {
              await candidate.close();
            } catch (_closeError) {
              // A disappearing application-mode port is expected here.
            }
          }
        }
      }

      if (!permissionPrompted) {
        permissionPrompted = true;
        setUploadProgress(22, copy.firmwareSelectingPort, true);
        try {
          promptedPort = await navigator.serial.requestPort({ filters: [{ usbVendorId: 0x303A, usbProductId: 0x1001 }] });
          if (!isTargetPort(promptedPort)) throw new Error(copy.invalidDevice);
          appendUploadLog("Bootloader serial port permission granted");
          // Choosing a native serial port may take longer than the discovery
          // timeout. Start a fresh window after the user grants permission.
          deadline = Date.now() + timeoutMs;
          continue;
        } catch (error) {
          if (error?.name === "NotFoundError") throw new Error(copy.bootloaderPortCancelled);
          lastOpenError = error;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    throw new Error(`${copy.bootloaderPortUnavailable}${lastOpenError?.message ? ` (${lastOpenError.message})` : ""}`);
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
    await new Promise((resolve) => setTimeout(resolve, 600));
    return waitForBootloaderPort(port);
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
    uploadProgressRow.hidden = false;
    setUploadProgress(0, copy.configCreating);
    uploadLog.textContent = "";
    uploadLog.hidden = true;
    let transport = null;
    try {
      setUploadProgress(3, copy.configCreating, true);
      setUploadProgress(7, copy.firmwareLoading, true);
      const { manifest, files } = await loadFirmwarePackage();
      setUploadProgress(12, copy.firmwareValidating, true);
      files.push(buildBoardConfig(Number(manifest.configAddress || 0x310000)));
      const { ESPLoader, Transport } = await import(flasherModuleUrl);
      setUploadProgress(18, copy.firmwareResetting, true);
      selectedPort = await resetIntoBootloader(selectedPort);
      transport = new Transport(selectedPort, true);
      const terminal = {
        clean() {
          // Preserve the staged progress messages when esptool clears its terminal.
        },
        writeLine(message) {
          appendUploadLog(message);
        },
        write(message) {
          appendUploadLog(message);
        }
      };
      const loader = new ESPLoader({ transport, baudrate: 460800, terminal, debugLogging: false });
      setUploadProgress(24, copy.firmwareConnecting, true);
      const chipName = await loader.main();
      if (!String(chipName).includes("ESP32-S3")) throw new Error(`${copy.chipMismatch} (${chipName})`);
      appendUploadLog(`${chipName} · ${manifest.version}`);
      const totalBytes = files.reduce((sum, file) => sum + file.data.byteLength, 0);
      const precedingBytes = files.map((_file, index) => files.slice(0, index).reduce((sum, file) => sum + file.data.byteLength, 0));
      setUploadProgress(30, copy.firmwareUploading, true);
      await loader.writeFlash({
        fileArray: files,
        flashMode: manifest.flashMode || "dio",
        flashFreq: manifest.flashFreq || "80m",
        flashSize: manifest.flashSize || "4MB",
        eraseAll: false,
        compress: true,
        calculateMD5Hash: md5Hex,
        reportProgress(fileIndex, written, total) {
          const completed = precedingBytes[fileIndex] + (total ? Math.min(written, total) : 0);
          const percent = 30 + ((completed / totalBytes) * 65);
          const fileName = files[fileIndex]?.name || `${fileIndex + 1}/${files.length}`;
          setUploadProgress(percent, `${copy.firmwareUploading} · ${fileName}`);
        }
      });
      setUploadProgress(96, copy.firmwareVerifying, true);
      setUploadProgress(98, copy.firmwareRebooting, true);
      await watchdogResetIntoApplication(loader);
      try {
        await transport.disconnect();
      } catch (_error) {
        // Native USB can disappear as soon as the board restarts.
      }
      transport = null;
      selectedPort = null;
      setUploadProgress(100, copy.firmwareSuccess, true);
    } catch (error) {
      console.error(error);
      appendUploadLog(error?.message || error);
      uploadStatus.textContent = `${copy.firmwareFailed}: ${error?.message || error}`;
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
