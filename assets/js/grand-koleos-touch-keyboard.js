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
    clearedAll: "All button names, shortcuts, long-press actions, and images have been reset.",
    confirmClearAll: "Reset all button names, shortcuts, long-press actions, and images?",
    settingsLabel: "Settings",
    settingsLocked: "The Settings button is fixed and cannot be edited.",
    unset: "Not assigned",
    page: "PAGE",
    pageChanged: "selected.",
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
    tooManyMedia: "Only one volume media key can be assigned to a button.",
    themeChanged: "Button theme changed."
  } : {
    button: "버튼",
    empty: "키 조합 없음",
    selected: "선택됨 · 가상 키보드에서 조합할 키를 누르세요.",
    assigned: "에 할당됨",
    removed: "에서 해제됨",
    cleared: "의 키 조합을 지웠습니다.",
    clearedAll: "모든 버튼의 기능명·키 조합·길게 누르기 동작·이미지를 초기화했습니다.",
    confirmClearAll: "모든 버튼의 기능명·키 조합·길게 누르기 동작·이미지를 초기화할까요?",
    settingsLabel: "설정",
    settingsLocked: "설정 버튼은 고정되어 있어 수정할 수 없습니다.",
    unset: "미설정",
    page: "페이지",
    pageChanged: "로 이동했습니다.",
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
    tooManyMedia: "버튼 하나에는 볼륨 미디어 키를 하나만 지정할 수 있습니다.",
    themeChanged: "버튼 테마를 변경했습니다."
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
    { id: "forward-10", code: 15, group: "media", ko: "10초 앞으로", en: "Forward 10s" },
    { id: "replay-10", code: 16, group: "media", ko: "10초 뒤로", en: "Back 10s" },
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
  const settingsPageIndex = 2;
  const settingsButtonIndex = 5;
  const settingsIconId = "settings";
  const isSettingsButton = (pageIndex, buttonIndex) => pageIndex === settingsPageIndex && buttonIndex === settingsButtonIndex;
  const defaultAssignments = [
    [["Win", "H"], ["Win", "B"], ["F"], ["Win", "M"], ["L"], ["Alt", "Arrow Left"]],
    [[], [], [], [], [], []],
    [[], [], [], [], [], []]
  ];
  const defaultPageIcons = [
    ["home", "chrome", "fullscreen", "tmap", "replay-10", "back"],
    defaultIconIds,
    defaultIconIds
  ];

  const buttonThemes = new Map([
    ["classic", {
      screen: ["#070b12", "#101824"],
      text: "#f8fafc",
      pageDot: "#38bdf8",
      pageDotInactive: "#6b7280",
      cardActive: ["#20334a", "#152a40"],
      cardIdle: ["#1b2532", "#131c27"],
      cardBorder: "#475569",
      cardActiveBorder: "#38bdf8",
      settingsText: "#38bdf8",
      emptyText: "#64748b",
      iconPlate: null,
      footer: "#151d29",
      tabActive: "#0759b7",
      tabActiveBorder: "#1687ff",
      tabIdle: "#1a2431",
      tabIdleBorder: "#344154",
      tabText: "#f8fafc",
      tabInactiveText: "#536172",
      radius: 12,
      shadowBlur: 0,
      iconColors: ["#38bdf8", "#fb5c7c", "#4ade55", "#facc15", "#a66df4", "#22d3ee"]
    }],
    ["light", {
      screen: ["#f7fafc", "#e5edf5"],
      text: "#172338",
      pageDot: "#2563eb",
      pageDotInactive: "#a5b4c4",
      cardActive: ["#ffffff", "#e8f2ff"],
      cardIdle: ["#ffffff", "#edf3f8"],
      cardBorder: "#b7c8d8",
      cardActiveBorder: "#2879d0",
      settingsText: "#1d4ed8",
      emptyText: "#718096",
      iconPlate: "#2563eb",
      footer: "#d8e4ee",
      tabActive: "#2563eb",
      tabActiveBorder: "#60a5fa",
      tabIdle: "#f8fbfd",
      tabIdleBorder: "#b7c8d8",
      tabText: "#ffffff",
      tabInactiveText: "#334155",
      radius: 15,
      shadowBlur: 7,
      iconColors: ["#0369a1", "#be123c", "#15803d", "#a16207", "#7e22ce", "#0e7490"]
    }],
    ["dark", {
      screen: ["#090a13", "#171326"],
      text: "#f5f3ff",
      pageDot: "#c084fc",
      pageDotInactive: "#655d7c",
      cardActive: ["#302650", "#19182f"],
      cardIdle: ["#211d36", "#141322"],
      cardBorder: "#4a4565",
      cardActiveBorder: "#c084fc",
      settingsText: "#67e8f9",
      emptyText: "#817b9b",
      iconPlate: null,
      footer: "#0d0d19",
      tabActive: "#6d28d9",
      tabActiveBorder: "#c084fc",
      tabIdle: "#171426",
      tabIdleBorder: "#413a5b",
      tabText: "#ffffff",
      tabInactiveText: "#8c85a4",
      radius: 16,
      shadowBlur: 9,
      iconColors: ["#67e8f9", "#fb7185", "#86efac", "#fde68a", "#d8b4fe", "#5eead4"]
    }]
  ]);
  const buttonThemeStorageKey = "solforge-grand-koleos-button-theme";
  const readButtonTheme = () => {
    try {
      const saved = window.localStorage.getItem(buttonThemeStorageKey);
      return buttonThemes.has(saved) ? saved : "classic";
    } catch (_error) {
      return "classic";
    }
  };
  let buttonTheme = readButtonTheme();
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
  const iconTintCanvas = document.createElement("canvas");
  iconTintCanvas.width = iconTintCanvas.height = 64;
  function getIconImage(iconId) {
    let image = canvasIconImages.get(iconId);
    if (!image) {
      image = new Image();
      image.addEventListener("load", () => renderPreview(), { once: true });
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg(iconId))}`;
      canvasIconImages.set(iconId, image);
    }
    return image;
  }
  function drawCanvasIcon(iconId, centerX, centerY, size = 30) {
    const image = getIconImage(iconId);
    if (!image.complete || !image.naturalWidth) return;
    if (["tmap", "youtube", "chrome"].includes(iconId)) {
      context.drawImage(image, centerX - size / 2, centerY - size / 2, size, size);
      return;
    }
    const tint = iconTintCanvas.getContext("2d");
    tint.clearRect(0, 0, 64, 64);
    tint.drawImage(image, 0, 0, 64, 64);
    tint.globalCompositeOperation = "source-in";
    tint.fillStyle = (buttonThemes.get(buttonTheme) || buttonThemes.get("classic")).pageDot;
    tint.fillRect(0, 0, 64, 64);
    tint.globalCompositeOperation = "source-over";
    context.drawImage(iconTintCanvas, centerX - size / 2, centerY - size / 2, size, size);
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
    assignments: defaultAssignments[index].map((keys) => keys.slice()),
    icons: defaultPageIcons[index].slice(),
    labels: Array(6).fill(""),
    holds: Array.from({ length: 6 }, () => []),
    holdModes: Array(6).fill(0)
  }));
  pageStates[settingsPageIndex].icons[settingsButtonIndex] = settingsIconId;
  pageStates[settingsPageIndex].assignments[settingsButtonIndex] = [];
  const buttonBoxes = [];
  const navigationBoxes = [];
  let activeButton = 0;
  let activePage = 0;
  let transitioning = false;
  let pointerState = null;
  let buttonPressIndex = -1;
  let buttonPressProgress = 0;
  let buttonPressAnimationFrame = 0;
  let iconDialogReturnFocus = null;

  const keyboard = document.querySelector("#gkKeyboard");
  const preview = document.querySelector("#gkPreview");
  const context = preview.getContext("2d");
  const nameInput = document.querySelector("#gkButtonName");
  const actionTarget = document.querySelector("#gkActionTarget");
  const holdMode = document.querySelector("#gkHoldMode");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const labelFont = 'system-ui, "Malgun Gothic", sans-serif';
  let slideOffset = 0;
  let slideFrame = 0;
  preview.width = 960;
  preview.height = 544;
  context.scale(2, 2);
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
  const buttonThemeOptions = document.querySelectorAll("[data-gk-button-theme]");
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
    return actionTarget.value === "hold" ? pageStates[activePage].holds : pageStates[activePage].assignments;
  }

  function displayButtonName(page, button) {
    if (isSettingsButton(page, button)) return copy.settingsLabel;
    return pageStates[page].labels[button].trim() || iconLabel(pageStates[page].icons[button]);
  }

  function canRepeat(page, button) {
    const keys = pageStates[page].assignments[button];
    return keys.length === 1 && ["Volume Up", "Volume Down"].includes(keys[0]);
  }

  function syncActionEditor() {
    nameInput.value = pageStates[activePage].labels[activeButton];
    const repeatAllowed = canRepeat(activePage, activeButton);
    if (!repeatAllowed && pageStates[activePage].holdModes[activeButton] === 2) pageStates[activePage].holdModes[activeButton] = 0;
    holdMode.value = String(pageStates[activePage].holdModes[activeButton]);
    holdMode.querySelector('[value="2"]').disabled = !repeatAllowed;
    actionTarget.querySelector('[value="hold"]').disabled = holdMode.value !== "1";
    if (holdMode.value !== "1") actionTarget.value = "tap";
  }

  nameInput.addEventListener("input", () => {
    pageStates[activePage].labels[activeButton] = nameInput.value;
    renderPreview();
    renderAssignmentSummary();
  });
  actionTarget.addEventListener("change", renderAll);
  holdMode.addEventListener("change", () => {
    pageStates[activePage].holdModes[activeButton] = Number(holdMode.value);
    actionTarget.value = holdMode.value === "1" ? "hold" : "tap";
    renderAll();
  });

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
    const keys = currentAssignments()[index];
    return keys.length ? keys.map((id) => keyLabels.get(id) || id).join(" + ") : copy.empty;
  }

  function syncButtonThemePicker() {
    buttonThemeOptions.forEach((option) => {
      const selected = option.dataset.gkButtonTheme === buttonTheme;
      option.classList.toggle("active", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
  }

  function selectButtonTheme(themeId, announce = true) {
    if (!buttonThemes.has(themeId)) return;
    buttonTheme = themeId;
    try {
      window.localStorage.setItem(buttonThemeStorageKey, themeId);
    } catch (_error) {
      // Private browsing and blocked storage should not affect the preview.
    }
    syncButtonThemePicker();
    if (announce) status.textContent = copy.themeChanged;
    renderPreview();
    const animation = preview.animate([
      { opacity: 0.78, filter: "brightness(1.08)" },
      { opacity: 1, filter: "brightness(1)" }
    ], { duration: 220, easing: "cubic-bezier(.22, 1, .36, 1)" });
    animation.finished.catch(() => {});
  }

  buttonThemeOptions.forEach((option) => {
    option.addEventListener("click", () => selectButtonTheme(option.dataset.gkButtonTheme));
  });

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
      if (consumerCodes.has(keyId) && keys.some((existing) => consumerCodes.has(existing))) {
        status.textContent = copy.tooManyMedia;
        return;
      }
      if (keys.length >= 3) {
        status.textContent = copy.maxThreeKeys;
        return;
      }
      keys.push(keyId);
      status.textContent = lang === "en" ? `${displayKey} ${copy.assigned} ${buttonText(activeButton)}.` : `${displayKey} · ${buttonText(activeButton)}${copy.assigned}`;
    }
    renderAll();
  }

  function selectButton(index, revealIconEditor = true) {
    if (isSettingsButton(activePage, index)) {
      status.textContent = copy.settingsLocked;
      return;
    }
    activeButton = index;
    actionTarget.value = "tap";
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
    assignmentList.innerHTML = assignments.map((_keys, index) => {
      if (isSettingsButton(activePage, index)) {
        return `<button type="button" class="locked" data-gk-button="${index}" disabled aria-disabled="true"><span>${escapeHtml(copy.settingsLabel)}</span><strong>${escapeHtml(copy.settingsLabel)}</strong></button>`;
      }
      return `<button type="button" class="${index === activeButton ? "active" : ""}" data-gk-button="${index}" aria-pressed="${index === activeButton}"><span>${escapeHtml(displayButtonName(activePage, index))}</span><strong>${escapeHtml(comboText(index))}</strong></button>`;
    }).join("");
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
    iconDialogReturnFocus = document.activeElement;
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
  iconDialog.addEventListener("close", () => {
    if (iconDialogReturnFocus) {
      iconDialogReturnFocus.focus?.();
      iconDialogReturnFocus = null;
    }
  });
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

  function fittedLabel(ctx, text, maxWidth) {
    ctx.font = `600 18px ${labelFont}`;
    if (ctx.measureText(text).width <= maxWidth) return text;
    const characters = Array.from(text);
    while (characters.length && ctx.measureText(characters.join("") + "…").width > maxWidth) characters.pop();
    return characters.join("") + "…";
  }

  // Store only the 21 visible labels as 4-bit alpha masks, not an entire CJK font.
  function writeLabelMask(config, offset, text) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 24;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(fittedLabel(ctx, text, 128), 64, 12);
    const pixels = ctx.getImageData(0, 0, 128, 24).data;
    for (let p = 0; p < 128 * 24; p += 2) {
      config[offset + p / 2] = (Math.round(pixels[p * 4 + 3] / 17) << 4) | Math.round(pixels[(p + 1) * 4 + 3] / 17);
    }
  }

  async function prepareBoardConfig(address) {
    await document.fonts.ready;
    await Promise.all(pageStates.flatMap((page) => page.icons).map((id) => getIconImage(id).decode()));
    return buildBoardConfig(address);
  }

  function writeIconMask(config, offset, iconId) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const image = getIconImage(iconId);
    if (!image.complete || !image.naturalWidth) throw new Error(copy.invalidFirmware);
    ctx.drawImage(image, 0, 0, 32, 32);
    const pixels = ctx.getImageData(0, 0, 32, 32).data;
    for (let p = 0; p < 1024; p += 2) {
      config[offset + p / 2] = (Math.round(pixels[p * 4 + 3] / 17) << 4) | Math.round(pixels[(p + 1) * 4 + 3] / 17);
    }
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
    const theme = buttonThemes.get(buttonTheme) || buttonThemes.get("classic");
    context.fillStyle = theme.screen[0];
    context.fillRect(0, 0, 480, 272);

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = theme.text;
    context.font = "800 16px Inter, Arial, sans-serif";

    const outerX = 15;
    const outerY = 14;
    const columnGap = 10;
    const rowGap = 8;
    const buttonWidth = Math.floor((480 - outerX * 2 - columnGap * 2) / 3);
    const buttonHeight = 94;
    buttonBoxes.length = 0;

    const drawPage = (pageIndex, offset) => {
    context.save();
    context.beginPath();
    context.rect(0, 0, 480, 212);
    context.clip();
    context.translate(offset, 0);
    for (let index = 0; index < 6; index += 1) {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = outerX + column * (buttonWidth + columnGap);
      const y = outerY + row * (buttonHeight + rowGap);
      if (pageIndex === activePage) buttonBoxes.push({ x, y, width: buttonWidth, height: buttonHeight });

      const isFixed = isSettingsButton(pageIndex, index);
      const isActive = pageIndex === activePage && index === activeButton && !isFixed;
      const pressOffset = pageIndex === activePage && buttonPressIndex === index && !isFixed ? 2 * buttonPressProgress : 0;
      const paintY = y + pressOffset;
      const paintHeight = buttonHeight - pressOffset;
      context.save();
      roundedRect(context, x, paintY, buttonWidth, paintHeight, 14);
      context.fillStyle = isActive ? theme.cardActive[0] : theme.cardIdle[0];
      context.fill();
      if (isActive) {
        context.lineWidth = 1;
        context.strokeStyle = theme.cardActiveBorder;
        context.stroke();
      }
      context.restore();

      drawCanvasIcon(isFixed ? settingsIconId : pageStates[pageIndex].icons[index], x + buttonWidth / 2, y + 30 + pressOffset * 0.5, 32);

      const label = fittedLabel(context, displayButtonName(pageIndex, index), 128);
      context.fillStyle = theme.text;
      context.fillText(label, x + buttonWidth / 2, y + 67 + pressOffset);
      if (!isFixed && pageStates[pageIndex].holdModes[index]) {
        context.fillStyle = theme.pageDot;
        roundedRect(context, x + buttonWidth / 2 - 9, y + 84, 18, 2, 1);
        context.fill();
      }
    }
    context.restore();
    };
    drawPage(activePage, slideOffset);
    if (slideOffset < 0 && activePage < 2) drawPage(activePage + 1, slideOffset + 480);
    if (slideOffset > 0 && activePage > 0) drawPage(activePage - 1, slideOffset - 480);

    context.fillStyle = theme.screen[0];
    context.fillRect(0, 212, 480, 60);
    const bottomItems = pageStates.map((_page, index) => ({ x: 12 + index * 156, width: 144, label: displayPageName(index), type: "page", pageIndex: index, active: activePage === index }));
    navigationBoxes.length = 0;
    bottomItems.forEach((item) => {
      roundedRect(context, item.x, 224, item.width, 38, 10);
      context.fillStyle = item.active ? theme.cardActive[0] : theme.screen[0];
      context.fill();
      context.fillStyle = item.active ? theme.text : theme.emptyText;
      context.fillText(fittedLabel(context, item.label, 128), item.x + item.width / 2, 243);
      if (item.active) {
        context.fillStyle = theme.pageDot;
        context.fillRect(item.x + item.width / 2 - 12, 264, 24, 2);
      }
      navigationBoxes.push({ x: item.x, y: 220, width: item.width, height: 48, type: item.type, pageIndex: item.pageIndex, disabled: item.disabled });
    });
  }

  function renderAll() {
    syncActionEditor();
    activeButtonOutput.textContent = `${displayPageName(activePage)} · ${buttonText(activeButton)}`;
    activeComboOutput.textContent = comboText(activeButton);
    syncButtonThemePicker();
    syncKeyboardState();
    syncPageNameFields();
    renderAssignmentSummary();
    syncIconEditor();
    renderPreview();
  }

  function canvasPoint(event) {
    const rect = preview.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (480 / rect.width),
      y: (event.clientY - rect.top) * (272 / rect.height)
    };
  }

  function buttonIndexAtPoint(point) {
    return buttonBoxes.findIndex((box) => point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height);
  }

  function animateButtonPress(index, target) {
    if (buttonPressAnimationFrame) cancelAnimationFrame(buttonPressAnimationFrame);
    if (target > 0) buttonPressIndex = index;
    if (buttonPressIndex < 0) return;
    const from = buttonPressProgress;
    const startedAt = performance.now();
    const duration = reducedMotion.matches ? 1 : target > 0 ? 60 : 120;
    const frame = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      buttonPressProgress = from + (target - from) * eased;
      renderPreview();
      if (progress < 1) {
        buttonPressAnimationFrame = requestAnimationFrame(frame);
      } else {
        buttonPressProgress = target;
        buttonPressAnimationFrame = 0;
        if (target === 0) buttonPressIndex = -1;
        renderPreview();
      }
    };
    buttonPressAnimationFrame = requestAnimationFrame(frame);
  }

  function releaseButtonPress() {
    if (buttonPressIndex >= 0) animateButtonPress(buttonPressIndex, 0);
  }

  function handleCanvasTap(event) {
    const { x, y } = canvasPoint(event);
    const index = buttonIndexAtPoint({ x, y });
    if (index >= 0) {
      selectButton(index);
      return;
    }
    const navigation = navigationBoxes.find((box) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height);
    if (!navigation || navigation.disabled) return;
    changePage(navigation.pageIndex);
  }

  function setPage(index, announce = true) {
    if (index < 0 || index >= pageStates.length || index === activePage) return false;
    activePage = index;
    activeButton = 0;
    actionTarget.value = "tap";
    if (announce) {
      status.textContent = lang === "en" ? `${displayPageName(index)} ${copy.pageChanged}` : `${displayPageName(index)}${copy.pageChanged}`;
    }
    renderAll();
    return true;
  }

  function animateSlide(target, done) {
    if (slideFrame) cancelAnimationFrame(slideFrame);
    const from = slideOffset;
    const start = performance.now();
    const duration = reducedMotion.matches ? 1 : 180;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      slideOffset = from + (target - from) * (1 - Math.pow(1 - p, 3));
      renderPreview();
      if (p < 1) slideFrame = requestAnimationFrame(tick);
      else {
        slideFrame = 0;
        slideOffset = 0;
        transitioning = false;
        if (done) done();
        renderPreview();
      }
    };
    transitioning = true;
    slideFrame = requestAnimationFrame(tick);
  }

  function changePage(index) {
    if (transitioning) return;
    if (index < 0 || index >= pageStates.length || index === activePage) {
      animateSlide(0);
      return;
    }
    animateSlide(index > activePage ? -480 : 480, () => setPage(index));
  }

  preview.addEventListener("pointerdown", (event) => {
    if (transitioning || pointerState || event.button > 0) return;
    const point = canvasPoint(event);
    pointerState = { id: event.pointerId, start: point, dx: 0, dy: 0, swiping: false, cancelled: false, started: performance.now(), button: buttonIndexAtPoint(point) };
    if (pointerState.button >= 0 && !isSettingsButton(activePage, pointerState.button)) animateButtonPress(pointerState.button, 1);
    preview.setPointerCapture?.(event.pointerId);
    preview.classList.add("dragging");
  });

  preview.addEventListener("pointermove", (event) => {
    if (!pointerState || pointerState.id !== event.pointerId || transitioning) return;
    const point = canvasPoint(event);
    const state = pointerState;
    state.dx = point.x - state.start.x;
    state.dy = point.y - state.start.y;
    if (!state.swiping && Math.abs(state.dy) > 12 && Math.abs(state.dy) >= Math.abs(state.dx)) state.cancelled = true;
    if (state.cancelled) { releaseButtonPress(); return; }
    if (!state.swiping && state.start.y < 212 && Math.abs(state.dx) > 12 && Math.abs(state.dx) > Math.abs(state.dy) * 1.4) {
      state.swiping = true;
      releaseButtonPress();
    }
    if (!state.swiping) {
      if (Math.max(Math.abs(state.dx), Math.abs(state.dy)) > 12) {
        state.cancelled = true;
        releaseButtonPress();
      }
      return;
    }
    event.preventDefault();
    const boundary = (activePage === 0 && state.dx > 0) || (activePage === 2 && state.dx < 0);
    slideOffset = Math.max(-480, Math.min(480, state.dx * (boundary ? 0.22 : 1)));
    renderPreview();
  });

  preview.addEventListener("pointerup", (event) => {
    if (!pointerState || pointerState.id !== event.pointerId) return;
    const state = pointerState;
    pointerState = null;
    releaseButtonPress();
    preview.classList.remove("dragging");
    preview.releasePointerCapture?.(event.pointerId);
    const point = canvasPoint(event);
    if (!state.swiping) {
      if (!state.cancelled && Math.max(Math.abs(point.x - state.start.x), Math.abs(point.y - state.start.y)) <= 12 &&
          buttonIndexAtPoint(point) === state.button) handleCanvasTap(event);
      return;
    }
    const elapsed = Math.max(1, performance.now() - state.started);
    const commit = Math.abs(state.dx) >= 48 || (Math.abs(state.dx) >= 24 && Math.abs(state.dx) / elapsed > 0.45);
    if (commit) changePage(activePage + (state.dx < 0 ? 1 : -1));
    else animateSlide(0);
  });

  function cancelPointer() {
    if (!pointerState) return;
    pointerState = null;
    releaseButtonPress();
    preview.classList.remove("dragging");
    animateSlide(0);
  }
  preview.addEventListener("pointercancel", cancelPointer);
  preview.addEventListener("lostpointercapture", cancelPointer);

  document.querySelector("#gkClearButton").addEventListener("click", () => {
    currentAssignments()[activeButton] = [];
    status.textContent = lang === "en" ? `${copy.cleared} ${buttonText(activeButton)}.` : `${buttonText(activeButton)}${copy.cleared}`;
    renderAll();
  });

  document.querySelector("#gkClearAll").addEventListener("click", () => {
    if (!window.confirm(copy.confirmClearAll)) return;
    pageStates.forEach((page, index) => {
      page.assignments = defaultAssignments[index].map((keys) => keys.slice());
      page.icons = defaultPageIcons[index].slice();
      page.labels.fill("");
      page.holds = Array.from({ length: 6 }, () => []);
      page.holdModes.fill(0);
    });
    pageStates[settingsPageIndex].icons[settingsButtonIndex] = settingsIconId;
    pageStates[settingsPageIndex].assignments[settingsButtonIndex] = [];
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
    const config = new Uint8Array(45056);
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
        const isFixed = isSettingsButton(pageIndex, buttonIndex);
        writeFixedUtf8(config, buttonOffset, comboLabelBytes, displayButtonName(pageIndex, buttonIndex));
        const keys = [];
        const media = [];
        if (!isFixed) {
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
        }
        config[buttonOffset + comboLabelBytes] = keys.length;
        keys.forEach((code, index) => { config[buttonOffset + comboLabelBytes + 1 + index] = code; });
        view.setUint16(buttonOffset + comboLabelBytes + 1 + storedKeyCount, media[0] || 0, true);
        config[buttonOffset + comboLabelBytes + 1 + storedKeyCount + 2] = isFixed ? 26 : (iconById.get(page.icons[buttonIndex])?.code || 0);
        buttonOffset += buttonBytes;
      });
      pageOffset += pageBytes;
    });
    view.setUint32(8, fnv1a32(config.subarray(16, 16 + payloadSize)), true);
    // The original v2 block stays intact. Optional interaction data starts at 1216.
    const extensionOffset = 1216;
    const actionsOffset = extensionOffset + 16;
    const labelsOffset = actionsOffset + 18 * 12;
    const iconsOffset = labelsOffset + 21 * 1536;
    const extensionSize = 18 * 12 + 21 * 1536 + 18 * 512;
    view.setUint32(extensionOffset, 0x31584B47, true);
    view.setUint16(extensionOffset + 4, 1, true);
    view.setUint16(extensionOffset + 6, extensionSize, true);
    view.setUint32(extensionOffset + 12, lang === "en" ? 1 : 0, true);
    pageStates.forEach((page, p) => {
      page.holds.forEach((keys, b) => {
        const offset = actionsOffset + (p * 6 + b) * 12;
        const fixed = isSettingsButton(p, b);
        const mode = fixed || (page.holdModes[b] === 1 && !keys.length) ? 0 : page.holdModes[b];
        const keyboard = fixed ? [] : keys.filter((key) => !consumerCodes.has(key)).map(keyboardCode);
        const media = fixed ? [] : keys.filter((key) => consumerCodes.has(key));
        if (keyboard.some((code) => code === null) || keys.length > 3 || media.length > 1 || (mode === 2 && !canRepeat(p, b))) throw new Error(copy.invalidFirmware);
        config[offset] = mode;
        config[offset + 1] = keyboard.length;
        keyboard.forEach((code, i) => { config[offset + 2 + i] = code; });
        view.setUint16(offset + 10, media.length ? consumerCodes.get(media[0]) : 0, true);
        writeLabelMask(config, labelsOffset + (p * 6 + b) * 1536, displayButtonName(p, b));
        writeIconMask(config, iconsOffset + (p * 6 + b) * 512, page.icons[b]);
      });
      writeLabelMask(config, labelsOffset + (18 + p) * 1536, displayPageName(p));
    });
    // Bind extension and legacy data together so stale labels/actions are rejected.
    view.setUint32(extensionOffset + 8, fnv1a32(config.subarray(0, extensionOffset)) ^ fnv1a32(config.subarray(extensionOffset + 12, actionsOffset + extensionSize)), true);
    return { data: config, address, name: lang === "en" ? "Board settings" : "보드 설정" };
  }

  async function loadFirmwarePackage() {
    const manifestUrl = new URL(uploadSection.dataset.firmwareManifest, document.baseURI);
    const manifestResponse = await fetch(manifestUrl, { cache: "no-store" });
    if (!manifestResponse.ok) throw new Error(`Firmware manifest HTTP ${manifestResponse.status}`);
    const manifest = await manifestResponse.json();
    if (manifest.interactionVersion !== 1 || manifest.configSize !== 45056) throw new Error(copy.invalidFirmware);
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
      files.push(await prepareBoardConfig(Number(manifest.configAddress || 0x310000)));
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
