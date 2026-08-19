#include <Arduino.h>
#include <U8g2lib.h>
#include <esp_partition.h>
#include "Arduino_GFX.h"
#include "Arduino_ESP32QSPI.h"
#include "Arduino_NV3041A.h"
#include "Arduino_Canvas.h"
#include "font/NanumGothicCoding16.h"

#include "USB.h"
#include "USBHIDConsumerControl.h"
#include "USBHIDKeyboard.h"
#include "TAMC_GT911.h"

// Change this if the touch axes need to be mirrored or swapped.
#define TOUCH_ROTATION ROTATION_INVERTED

static constexpr uint16_t kDefaultScreenWidth = 480;
static constexpr uint16_t kDefaultScreenHeight = 272;
static constexpr uint8_t kBacklightPin = 1;
static constexpr uint8_t kTouchSdaPin = 8;
static constexpr uint8_t kTouchSclPin = 4;
static constexpr uint8_t kTouchIntPin = 3;
static constexpr uint8_t kTouchRstPin = 38;
static constexpr uint32_t kIdleSleepMs = 20000;
static constexpr uint32_t kMacroHoldMs = 20;
static constexpr bool kTouchDiagnosticMode = false;
static constexpr int16_t kTopLayoutH = 42;
static constexpr int16_t kBottomMargin = 70;
static constexpr int16_t kSideMargin = 15;
static constexpr int16_t kColumnGap = 10;
static constexpr int16_t kRowGap = 8;
static constexpr int16_t kDotSize = 6;
static constexpr int16_t kDotGap = 8;
static constexpr int16_t kSwipeThreshold = 14;
static constexpr int16_t kSwipeIntentThreshold = 8;
static constexpr int16_t kSwipeAxisBias = 4;
static constexpr int16_t kTapMoveTolerance = 8;
static constexpr uint32_t kPostSwipeGuardMs = 250;
static constexpr uint32_t kPostMacroGuardMs = 350;
static constexpr uint32_t kTouchReleaseGraceMs = 90;
static constexpr bool kSwipeWrapPages = false;
static constexpr uint32_t kBootSplashMs = 1800;

Arduino_DataBus *bus = new Arduino_ESP32QSPI(
    45 /* cs */, 47 /* sck */, 21 /* d0 */, 48 /* d1 */, 40 /* d2 */, 39 /* d3 */);
Arduino_G *panel = new Arduino_NV3041A(bus, GFX_NOT_DEFINED /* RST */, 0 /* rotation */, true /* IPS */);
Arduino_GFX *gfx = new Arduino_Canvas(kDefaultScreenWidth, kDefaultScreenHeight, panel);

TAMC_GT911 touch(kTouchSdaPin, kTouchSclPin, kTouchIntPin, kTouchRstPin, kDefaultScreenWidth, kDefaultScreenHeight);

USBHIDKeyboard Keyboard;
USBHIDConsumerControl ConsumerControl;

static constexpr uint32_t kConfigMagic = 0x4B474653;
static constexpr uint16_t kConfigVersion = 2;
static constexpr uint8_t kConfigPageCount = 3;
static constexpr uint8_t kConfigButtonCount = 6;
static constexpr uint8_t kConfigKeyCount = 8;
static constexpr size_t kConfigPageNameBytes = 40;
static constexpr size_t kConfigComboLabelBytes = 48;

struct __attribute__((packed)) StoredButtonConfig {
  char comboLabel[kConfigComboLabelBytes];
  uint8_t keyCount;
  uint8_t keys[kConfigKeyCount];
  uint16_t consumerUsage;
  uint8_t iconId;
};

struct __attribute__((packed)) StoredPageConfig {
  char name[kConfigPageNameBytes];
  StoredButtonConfig buttons[kConfigButtonCount];
};

struct __attribute__((packed)) StoredTouchConfig {
  uint32_t magic;
  uint16_t version;
  uint16_t payloadSize;
  uint32_t checksum;
  uint32_t reserved;
  StoredPageConfig pages[kConfigPageCount];
};

static_assert(sizeof(StoredButtonConfig) == 60, "StoredButtonConfig layout changed");
static_assert(sizeof(StoredPageConfig) == 400, "StoredPageConfig layout changed");
static_assert(sizeof(StoredTouchConfig) == 1216, "StoredTouchConfig layout changed");

static StoredTouchConfig storedConfig;
static bool storedConfigValid = false;

struct MacroAction {
  const char *label;
  uint8_t modifiers[3];
  uint8_t modifierCount;
  uint8_t key;
};

struct MacroButton {
  MacroAction action;
  uint8_t column;
  uint8_t row;
  uint8_t columnSpan;
  uint8_t rowSpan;
  uint8_t labelSize;
};

#define ACTION0(LABEL, KEYCODE) { LABEL, { 0, 0, 0 }, 0, KEYCODE }
#define ACTION1(LABEL, MOD1, KEYCODE) { LABEL, { MOD1, 0, 0 }, 1, KEYCODE }
#define ACTION2(LABEL, MOD1, MOD2, KEYCODE) { LABEL, { MOD1, MOD2, 0 }, 2, KEYCODE }
#define BTN0(COL, ROW, COLSPAN, ROWSPAN, SIZE, LABEL, KEYCODE) { ACTION0(LABEL, KEYCODE), COL, ROW, COLSPAN, ROWSPAN, SIZE }
#define BTN1(COL, ROW, COLSPAN, ROWSPAN, SIZE, LABEL, MOD1, KEYCODE) { ACTION1(LABEL, MOD1, KEYCODE), COL, ROW, COLSPAN, ROWSPAN, SIZE }
#define BTN2(COL, ROW, COLSPAN, ROWSPAN, SIZE, LABEL, MOD1, MOD2, KEYCODE) { ACTION2(LABEL, MOD1, MOD2, KEYCODE), COL, ROW, COLSPAN, ROWSPAN, SIZE }
#define BTN_EMPTY { ACTION0("", 0), 0, 0, 0, 0, 1 }

// Edit this table to change button labels, key combos and layout.
// Layout is a 3 x 2 grid: column 0-2, row 0-1.
// columnSpan 2 merges two horizontal cells, rowSpan 2 merges two vertical cells,
// and columnSpan 2 + rowSpan 2 makes a 2 x 2 large button.
// SIZE controls the label font scale. Start with 1; use 2 only for short text.
// Put BTN_EMPTY in cells covered by a merged button.
static const MacroButton kPageButtons[3][6] = {
    {
        BTN0(0, 0, 1, 1, 1, "홈", 0),
        BTN0(1, 0, 1, 1, 1, "이전", 0),
        BTN0(2, 0, 1, 1, 1, "메뉴", 0),
        BTN0(0, 1, 1, 1, 1, "즐겨찾기", 0),
        BTN0(1, 1, 1, 1, 1, "음성", 0),
        BTN0(2, 1, 1, 1, 1, "전원", 0),
    },
    {
        BTN0(0, 0, 1, 1, 1, "홈", 0),
        BTN0(1, 0, 1, 1, 1, "이전", 0),
        BTN0(2, 0, 1, 1, 1, "메뉴", 0),
        BTN0(0, 1, 1, 1, 1, "즐겨찾기", 0),
        BTN0(1, 1, 1, 1, 1, "음성", 0),
        BTN0(2, 1, 1, 1, 1, "전원", 0),
    },
    {
        BTN0(0, 0, 1, 1, 1, "홈", 0),
        BTN0(1, 0, 1, 1, 1, "이전", 0),
        BTN0(2, 0, 1, 1, 1, "메뉴", 0),
        BTN0(0, 1, 1, 1, 1, "즐겨찾기", 0),
        BTN0(1, 1, 1, 1, 1, "음성", 0),
        BTN0(2, 1, 1, 1, 1, "전원", 0),
    },
};

static uint16_t screenWidth = kDefaultScreenWidth;
static uint16_t screenHeight = kDefaultScreenHeight;
static bool backlightOn = false;
static bool uiDirty = true;
static bool touchHeld = false;
static bool suppressUntilRelease = false;
static bool swipeDetected = false;
static bool touchMovedTooFar = false;
static uint8_t currentPage = 0;
static uint8_t touchPage = 0;
static int8_t pressedButton = -1;
static int8_t touchStartButton = -1;
static int16_t touchStartX = 0;
static int16_t touchStartY = 0;
static int16_t lastTouchX = 0;
static int16_t lastTouchY = 0;
static int16_t touchMinX = 0;
static int16_t touchMaxX = 0;
static int16_t touchMinY = 0;
static int16_t touchMaxY = 0;
static uint32_t lastActivityMs = 0;
static uint32_t lastTouchSampleMs = 0;
static uint32_t postSwipeGuardUntilMs = 0;
static uint32_t postMacroGuardUntilMs = 0;

static void setBacklight(bool on) {
  backlightOn = on;
  digitalWrite(kBacklightPin, on ? HIGH : LOW);
}

static uint16_t rgb565(uint8_t r, uint8_t g, uint8_t b) {
  return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}

static uint32_t fnv1a32(const uint8_t *data, size_t length) {
  uint32_t hash = 2166136261UL;
  for (size_t i = 0; i < length; ++i) {
    hash ^= data[i];
    hash *= 16777619UL;
  }
  return hash;
}

static void loadStoredConfig() {
  const esp_partition_t *partition = esp_partition_find_first(
      ESP_PARTITION_TYPE_DATA, ESP_PARTITION_SUBTYPE_DATA_SPIFFS, nullptr);
  if (partition == nullptr || partition->size < sizeof(storedConfig)) {
    Serial.println("touch config partition unavailable");
    return;
  }
  if (esp_partition_read(partition, 0, &storedConfig, sizeof(storedConfig)) != ESP_OK) {
    Serial.println("touch config read failed");
    return;
  }
  const size_t payloadSize = sizeof(storedConfig.pages);
  const uint32_t checksum = fnv1a32(reinterpret_cast<const uint8_t *>(storedConfig.pages), payloadSize);
  if (storedConfig.magic != kConfigMagic || storedConfig.version != kConfigVersion ||
      storedConfig.payloadSize != payloadSize || storedConfig.checksum != checksum) {
    Serial.println("touch config invalid; using firmware defaults");
    return;
  }
  for (uint8_t page = 0; page < kConfigPageCount; ++page) {
    storedConfig.pages[page].name[kConfigPageNameBytes - 1] = '\0';
    for (uint8_t button = 0; button < kConfigButtonCount; ++button) {
      StoredButtonConfig &entry = storedConfig.pages[page].buttons[button];
      entry.comboLabel[kConfigComboLabelBytes - 1] = '\0';
      if (entry.keyCount > kConfigKeyCount) entry.keyCount = kConfigKeyCount;
      if (entry.iconId > 32) entry.iconId = button;
    }
  }
  storedConfigValid = true;
  Serial.println("touch config loaded");
}

static const char *configuredPageName(uint8_t page) {
  if (storedConfigValid && page < kConfigPageCount && storedConfig.pages[page].name[0] != '\0') {
    return storedConfig.pages[page].name;
  }
  static const char *defaults[3] = {"1 페이지", "2 페이지", "3 페이지"};
  return defaults[page < 3 ? page : 0];
}

static const char *configuredComboLabel(uint8_t page, uint8_t button) {
  if (storedConfigValid && page < kConfigPageCount && button < kConfigButtonCount) {
    const char *label = storedConfig.pages[page].buttons[button].comboLabel;
    if (label[0] != '\0') return label;
  }
  return "미설정";
}

static uint8_t configuredIconId(uint8_t page, uint8_t button) {
  if (storedConfigValid && page < kConfigPageCount && button < kConfigButtonCount) {
    return storedConfig.pages[page].buttons[button].iconId;
  }
  return button < 6 ? button : 0;
}

static uint16_t pageBg(uint8_t page) {
  return rgb565(7, 11, 18);
}

static uint16_t pageAccent(uint8_t page) {
  return rgb565(56, 189, 248);
}

static uint16_t pageAccentSoft(uint8_t page) {
  switch (page) {
    case 0:
      return rgb565(17, 64, 70);
    case 1:
      return rgb565(74, 43, 19);
    default:
      return rgb565(28, 65, 39);
  }
}

static uint16_t pageSurface(uint8_t page) {
  return rgb565(27, 37, 50);
}

static uint16_t buttonFill(bool pressed, uint8_t page) {
  return pressed ? rgb565(32, 51, 74) : pageSurface(page);
}

static uint16_t buttonBorder(bool pressed, uint8_t page) {
  return pressed ? rgb565(56, 189, 248) : rgb565(71, 85, 105);
}

static uint16_t buttonShadow() {
  return rgb565(1, 3, 6);
}

static uint16_t textColor() {
  return rgb565(247, 250, 252);
}

static uint16_t mutedColor() {
  return rgb565(95, 107, 124);
}

static uint16_t headerTextColor() {
  return rgb565(213, 221, 232);
}

static const char *pageTitle(uint8_t page) {
  return "TOUCH KEYBOARD";
}

static int16_t buttonWidth() {
  return (screenWidth - (2 * kSideMargin) - (2 * kColumnGap)) / 3;
}

static int16_t buttonHeight() {
  return (screenHeight - kTopLayoutH - kBottomMargin - kRowGap) / 2;
}

static int16_t buttonX(uint8_t column) {
  return kSideMargin + column * (buttonWidth() + kColumnGap);
}

static int16_t buttonY(uint8_t row) {
  return kTopLayoutH + row * (buttonHeight() + kRowGap);
}

static bool buttonIsVisible(const MacroButton &button) {
  return button.columnSpan > 0 && button.rowSpan > 0;
}

static int16_t buttonSpanWidth(const MacroButton &button) {
  return button.columnSpan * buttonWidth() + (button.columnSpan - 1) * kColumnGap;
}

static int16_t buttonSpanHeight(const MacroButton &button) {
  return button.rowSpan * buttonHeight() + (button.rowSpan - 1) * kRowGap;
}

static int16_t indicatorStartX() {
  const int16_t totalWidth = 28 + (2 * kDotSize) + (2 * kDotGap);
  return screenWidth - kSideMargin - totalWidth;
}

static void noteActivity() {
  lastActivityMs = millis();
}

static void selectBuiltInFont(uint8_t size) {
  gfx->setFont((const GFXfont *)nullptr);
  gfx->setTextSize(size);
  gfx->setTextWrap(false);
}

static void selectLabelFont(uint8_t size) {
#if defined(U8G2_FONT_SUPPORT)
  gfx->setUTF8Print(true);
  gfx->setFont(solforge_nanum_gothic_coding_16);
  gfx->setTextSize(size);
#else
  selectBuiltInFont(size + 1);
#endif
  gfx->setTextWrap(false);
}

static void sendMacro(const MacroAction &action) {
  Keyboard.releaseAll();
  delay(2);

  for (uint8_t i = 0; i < action.modifierCount; ++i) {
    Keyboard.press(action.modifiers[i]);
  }

  if (action.key != 0) {
    Keyboard.press(action.key);
  }

  delay(kMacroHoldMs);
  Keyboard.releaseAll();
  noteActivity();
}

static void sendConfiguredMacro(uint8_t page, uint8_t button) {
  if (!storedConfigValid || page >= kConfigPageCount || button >= kConfigButtonCount) {
    sendMacro(kPageButtons[page][button].action);
    return;
  }
  const StoredButtonConfig &entry = storedConfig.pages[page].buttons[button];
  Keyboard.releaseAll();
  ConsumerControl.release();
  delay(2);
  if (entry.consumerUsage != 0) ConsumerControl.press(entry.consumerUsage);
  for (uint8_t i = 0; i < entry.keyCount; ++i) {
    if (entry.keys[i] != 0) Keyboard.press(entry.keys[i]);
  }
  delay(kMacroHoldMs);
  Keyboard.releaseAll();
  ConsumerControl.release();
  noteActivity();
}

static bool readTouchPoint(int16_t &x, int16_t &y) {
  touch.read();
  if (!touch.isTouched || touch.touches == 0) {
    return false;
  }

  x = touch.points[0].x;
  y = touch.points[0].y;

  if (x < 0) {
    x = 0;
  }
  if (y < 0) {
    y = 0;
  }
  if (x >= screenWidth) {
    x = screenWidth - 1;
  }
  if (y >= screenHeight) {
    y = screenHeight - 1;
  }

  return true;
}

static int8_t hitTestNavigation(int16_t x, int16_t y) {
  if (y < 219 || y >= 262) {
    return -1;
  }
  if (x >= 10 && x < 64) return 6;
  if (x >= 74 && x < 178) return 7;
  if (x >= 188 && x < 292) return 8;
  if (x >= 302 && x < 406) return 9;
  if (x >= 416 && x < 470) return 10;
  return -1;
}

static int8_t hitTestButton(uint8_t page, int16_t x, int16_t y) {
  const int8_t navigation = hitTestNavigation(x, y);
  if (navigation >= 0) {
    return navigation;
  }
  if (y < kTopLayoutH || y >= 202) {
    return -1;
  }

  for (uint8_t i = 0; i < 6; ++i) {
    const MacroButton &button = kPageButtons[page][i];
    if (!buttonIsVisible(button)) {
      continue;
    }

    const int16_t bx = buttonX(button.column);
    const int16_t by = buttonY(button.row);
    const int16_t w = buttonSpanWidth(button);
    const int16_t h = buttonSpanHeight(button);
    if (x >= bx && x < (bx + w) && y >= by && y < (by + h)) {
      return (int8_t)i;
    }
  }

  return -1;
}

static void drawCenteredText(int16_t x, int16_t y, int16_t w, int16_t h, const char *text, uint8_t size, uint16_t color, uint16_t bgColor) {
  int16_t x1 = 0;
  int16_t y1 = 0;
  uint16_t tw = 0;
  uint16_t th = 0;

  selectLabelFont(size);
  gfx->getTextBounds(text, 0, 0, &x1, &y1, &tw, &th);

  const int16_t tx = x + (w - (int16_t)tw) / 2 - x1;
  const int16_t ty = y + (h - (int16_t)th) / 2 - y1;

  gfx->setTextColor(color, bgColor);
  gfx->setCursor(tx, ty);
  gfx->print(text);
}

static void drawCenteredBuiltInText(int16_t x, int16_t y, int16_t w, int16_t h, const char *text, uint8_t size, uint16_t color, uint16_t bgColor) {
  int16_t x1 = 0;
  int16_t y1 = 0;
  uint16_t tw = 0;
  uint16_t th = 0;

  selectBuiltInFont(size);
  gfx->getTextBounds(text, 0, 0, &x1, &y1, &tw, &th);

  const int16_t tx = x + (w - (int16_t)tw) / 2 - x1;
  const int16_t ty = y + (h - (int16_t)th) / 2 - y1;

  gfx->setTextColor(color, bgColor);
  gfx->setCursor(tx, ty);
  gfx->print(text);
}

static void drawThickLine(int16_t x0, int16_t y0, int16_t x1, int16_t y1, uint8_t thickness, uint16_t color) {
  const int8_t radius = thickness / 2;
  for (int8_t offset = -radius; offset <= radius; ++offset) {
    gfx->drawLine(x0 + offset, y0, x1 + offset, y1, color);
    gfx->drawLine(x0, y0 + offset, x1, y1 + offset, color);
  }
}

static void drawTmapIcon(int16_t cx, int16_t cy, uint16_t accent, uint16_t fill) {
  gfx->fillCircle(cx, cy - 7, 27, accent);
  gfx->fillTriangle(cx - 17, cy + 9, cx + 17, cy + 9, cx, cy + 36, accent);
  gfx->fillCircle(cx, cy - 7, 14, fill);
  selectBuiltInFont(2);
  gfx->setTextColor(accent, fill);
  gfx->setCursor(cx - 6, cy - 14);
  gfx->print("T");
}

static void drawHomeIcon(int16_t cx, int16_t cy, uint16_t accent, uint16_t fill) {
  gfx->fillTriangle(cx - 36, cy - 4, cx, cy - 34, cx + 36, cy - 4, accent);
  gfx->fillRoundRect(cx - 28, cy - 5, 56, 43, 5, accent);
  gfx->fillRoundRect(cx - 8, cy + 12, 16, 26, 2, fill);
  gfx->fillRect(cx - 20, cy + 10, 11, 11, fill);
  gfx->fillRect(cx + 9, cy + 10, 11, 11, fill);
}

static void drawChromeIcon(int16_t cx, int16_t cy, uint16_t fill) {
  const uint16_t red = rgb565(234, 67, 53);
  const uint16_t yellow = rgb565(251, 188, 5);
  const uint16_t green = rgb565(52, 168, 83);
  const uint16_t blue = rgb565(66, 133, 244);

  gfx->fillCircle(cx, cy, 34, red);
  gfx->fillTriangle(cx, cy, cx + 34, cy - 5, cx + 15, cy + 31, yellow);
  gfx->fillTriangle(cx, cy, cx - 30, cy + 18, cx - 14, cy - 31, green);
  gfx->fillCircle(cx, cy, 18, fill);
  gfx->fillCircle(cx, cy, 13, blue);
}

static void drawFullscreenIcon(int16_t cx, int16_t cy, uint16_t accent) {
  const int16_t l = cx - 36;
  const int16_t r = cx + 36;
  const int16_t t = cy - 30;
  const int16_t b = cy + 30;
  drawThickLine(l, t, l + 22, t, 5, accent);
  drawThickLine(l, t, l, t + 22, 5, accent);
  drawThickLine(r, t, r - 22, t, 5, accent);
  drawThickLine(r, t, r, t + 22, 5, accent);
  drawThickLine(l, b, l + 22, b, 5, accent);
  drawThickLine(l, b, l, b - 22, 5, accent);
  drawThickLine(r, b, r - 22, b, 5, accent);
  drawThickLine(r, b, r, b - 22, 5, accent);
}

static void drawArrowIcon(int16_t cx, int16_t cy, bool forward, uint16_t accent) {
  const int16_t dir = forward ? 1 : -1;
  const int16_t tipX = cx + (dir * 36);
  const int16_t tailX = cx - (dir * 34);

  drawThickLine(tailX, cy, tipX, cy, 6, accent);
  drawThickLine(tipX, cy, tipX - (dir * 22), cy - 22, 6, accent);
  drawThickLine(tipX, cy, tipX - (dir * 22), cy + 22, 6, accent);
}

static void drawKeyIcon(int16_t cx, int16_t cy, uint16_t accent, uint16_t fill) {
  gfx->fillRoundRect(cx - 31, cy - 21, 62, 42, 7, accent);
  gfx->fillRoundRect(cx - 24, cy - 12, 48, 24, 4, fill);
}

static void drawButtonIcon(uint8_t page, uint8_t index, int16_t cx, int16_t cy, uint16_t accent, uint16_t fill) {
  (void)page;
  const uint8_t icon = configuredIconId(page, index);
  const uint16_t white = rgb565(232, 241, 251);
  const uint16_t red = rgb565(255, 0, 51);
  const uint16_t yellow = rgb565(250, 204, 21);

  if (icon == 0) {  // Home
    gfx->fillTriangle(cx - 12, cy, cx, cy - 11, cx + 12, cy, accent);
    gfx->drawRoundRect(cx - 9, cy, 18, 11, 2, accent);
    gfx->fillRect(cx - 2, cy + 5, 5, 6, accent);
  } else if (icon == 1 || icon == 6) {  // Back / forward
    const int8_t dir = icon == 6 ? 1 : -1;
    drawThickLine(cx - (dir * 10), cy, cx + (dir * 9), cy, 3, accent);
    drawThickLine(cx - (dir * 10), cy, cx - (dir * 2), cy - 8, 3, accent);
    drawThickLine(cx - (dir * 10), cy, cx - (dir * 2), cy + 8, 3, accent);
  } else if (icon == 2) {  // Menu
    for (int8_t offset = -8; offset <= 8; offset += 8) drawThickLine(cx - 11, cy + offset, cx + 11, cy + offset, 3, accent);
  } else if (icon == 3) {  // Favorite
    const int8_t px[10] = {0, 3, 11, 5, 7, 0, -7, -5, -11, -3};
    const int8_t py[10] = {-12, -4, -3, 2, 10, 6, 10, 2, -3, -4};
    for (uint8_t point = 0; point < 10; ++point) {
      const uint8_t next = (point + 1) % 10;
      drawThickLine(cx + px[point], cy + py[point], cx + px[next], cy + py[next], 2, accent);
    }
  } else if (icon == 4) {  // Voice
    gfx->drawRoundRect(cx - 5, cy - 11, 10, 17, 5, accent);
    gfx->drawCircle(cx, cy - 1, 11, accent);
    gfx->fillRect(cx - 7, cy - 13, 15, 9, fill);
    drawThickLine(cx, cy + 9, cx, cy + 13, 2, accent);
    drawThickLine(cx - 5, cy + 13, cx + 5, cy + 13, 2, accent);
  } else if (icon == 5) {  // Power
    gfx->drawCircle(cx, cy + 1, 11, accent);
    gfx->fillRect(cx - 4, cy - 13, 9, 7, fill);
    drawThickLine(cx, cy - 12, cx, cy + 1, 3, accent);
  } else if (icon == 7) {  // Navigation
    gfx->drawCircle(cx, cy, 13, accent);
    gfx->fillTriangle(cx - 5, cy + 9, cx + 10, cy - 10, cx + 4, cy + 5, accent);
    gfx->fillTriangle(cx - 5, cy + 9, cx + 10, cy - 10, cx - 1, cy - 4, white);
  } else if (icon == 8) {  // TMAP
    gfx->fillRoundRect(cx - 15, cy - 15, 30, 30, 8, rgb565(237, 23, 76));
    gfx->fillRect(cx - 9, cy - 8, 18, 5, white);
    gfx->fillRect(cx - 2, cy - 7, 5, 18, white);
    drawThickLine(cx + 6, cy - 12, cx + 11, cy - 8, 2, white);
    drawThickLine(cx + 11, cy - 8, cx + 6, cy - 4, 2, white);
  } else if (icon == 9) {  // YouTube
    gfx->fillRoundRect(cx - 17, cy - 11, 34, 22, 6, red);
    gfx->fillTriangle(cx - 4, cy - 7, cx - 4, cy + 7, cx + 8, cy, white);
  } else if (icon == 10) {  // Chrome
    const uint16_t chromeRed = rgb565(234, 67, 53);
    const uint16_t chromeYellow = rgb565(251, 188, 5);
    const uint16_t chromeGreen = rgb565(52, 168, 83);
    const uint16_t chromeBlue = rgb565(66, 133, 244);
    gfx->fillCircle(cx, cy, 15, chromeRed);
    gfx->fillTriangle(cx, cy, cx + 15, cy - 2, cx + 7, cy + 13, chromeYellow);
    gfx->fillTriangle(cx, cy, cx - 13, cy + 8, cx - 7, cy - 13, chromeGreen);
    gfx->fillCircle(cx, cy, 8, white);
    gfx->fillCircle(cx, cy, 6, chromeBlue);
  } else if (icon >= 11 && icon <= 13) {  // Volume
    gfx->fillRect(cx - 13, cy - 5, 7, 10, accent);
    gfx->fillTriangle(cx - 7, cy - 5, cx + 2, cy - 12, cx + 2, cy + 12, accent);
    if (icon == 13) {
      drawThickLine(cx + 7, cy - 7, cx + 14, cy + 7, 2, accent);
      drawThickLine(cx + 14, cy - 7, cx + 7, cy + 7, 2, accent);
    } else {
      gfx->drawCircle(cx + 3, cy, 9, accent);
      gfx->fillRect(cx - 1, cy - 12, 8, 24, fill);
      if (icon == 11) {
        gfx->drawCircle(cx + 3, cy, 14, accent);
        gfx->fillRect(cx - 2, cy - 16, 8, 32, fill);
      }
    }
  } else if (icon == 14) {  // Fullscreen
    drawThickLine(cx - 13, cy - 12, cx - 4, cy - 12, 2, accent); drawThickLine(cx - 13, cy - 12, cx - 13, cy - 3, 2, accent);
    drawThickLine(cx + 13, cy - 12, cx + 4, cy - 12, 2, accent); drawThickLine(cx + 13, cy - 12, cx + 13, cy - 3, 2, accent);
    drawThickLine(cx - 13, cy + 12, cx - 4, cy + 12, 2, accent); drawThickLine(cx - 13, cy + 12, cx - 13, cy + 3, 2, accent);
    drawThickLine(cx + 13, cy + 12, cx + 4, cy + 12, 2, accent); drawThickLine(cx + 13, cy + 12, cx + 13, cy + 3, 2, accent);
  } else if (icon == 15 || icon == 16) {  // 10-second seek
    const int8_t dir = icon == 15 ? 1 : -1;
    gfx->drawCircle(cx, cy, 13, accent);
    gfx->fillRect(cx - 15, cy - 14, 9, 8, fill);
    drawThickLine(cx + (dir * 13), cy - 8, cx + (dir * 13), cy - 14, 2, accent);
    drawThickLine(cx + (dir * 13), cy - 14, cx + (dir * 7), cy - 12, 2, accent);
    drawCenteredBuiltInText(cx - 10, cy - 7, 20, 15, "10", 1, white, fill);
  } else if (icon == 17) {  // Play / pause
    gfx->fillTriangle(cx - 13, cy - 11, cx - 13, cy + 11, cx + 1, cy, accent);
    gfx->fillRect(cx + 5, cy - 11, 4, 22, accent);
    gfx->fillRect(cx + 12, cy - 11, 4, 22, accent);
  } else if (icon == 18 || icon == 19) {  // Previous / next track
    const int8_t dir = icon == 19 ? 1 : -1;
    gfx->fillRect(cx + (dir * 11) - 2, cy - 11, 4, 22, accent);
    gfx->fillTriangle(cx - (dir * 10), cy - 11, cx - (dir * 10), cy + 11, cx + (dir * 8), cy, accent);
  } else if (icon == 20) {  // Notification
    gfx->fillCircle(cx, cy + 11, 4, accent);
    gfx->fillRoundRect(cx - 11, cy - 10, 22, 19, 10, accent);
    gfx->fillRect(cx - 14, cy + 5, 28, 5, accent);
    gfx->fillRoundRect(cx - 7, cy - 6, 14, 13, 6, fill);
  } else if (icon >= 21 && icon <= 24) {  // Direction arrows
    if (icon == 21 || icon == 22) {
      const int8_t dir = icon == 22 ? 1 : -1;
      drawThickLine(cx, cy - (dir * 11), cx, cy + (dir * 11), 3, accent);
      drawThickLine(cx, cy + (dir * 11), cx - 8, cy + (dir * 3), 3, accent);
      drawThickLine(cx, cy + (dir * 11), cx + 8, cy + (dir * 3), 3, accent);
    } else {
      const int8_t dir = icon == 24 ? 1 : -1;
      drawThickLine(cx - (dir * 11), cy, cx + (dir * 11), cy, 3, accent);
      drawThickLine(cx + (dir * 11), cy, cx + (dir * 3), cy - 8, 3, accent);
      drawThickLine(cx + (dir * 11), cy, cx + (dir * 3), cy + 8, 3, accent);
    }
  } else if (icon == 25) {  // Music
    drawThickLine(cx - 3, cy - 11, cx + 11, cy - 14, 2, accent);
    drawThickLine(cx - 3, cy - 11, cx - 3, cy + 8, 2, accent);
    drawThickLine(cx + 11, cy - 14, cx + 11, cy + 5, 2, accent);
    gfx->fillCircle(cx - 8, cy + 9, 5, accent);
    gfx->fillCircle(cx + 6, cy + 6, 5, accent);
  } else if (icon == 26) {  // Settings
    gfx->drawCircle(cx, cy, 12, accent); gfx->drawCircle(cx, cy, 5, accent);
    for (uint8_t spoke = 0; spoke < 4; ++spoke) {
      const int8_t dx = spoke % 2 == 0 ? 14 : 0;
      const int8_t dy = spoke % 2 == 1 ? 14 : 0;
      drawThickLine(cx - dx, cy - dy, cx + dx, cy + dy, 2, accent);
    }
  } else if (icon == 27) {  // Phone
    drawThickLine(cx - 10, cy - 12, cx - 5, cy + 2, 4, accent);
    drawThickLine(cx - 5, cy + 2, cx + 8, cy + 11, 4, accent);
    drawThickLine(cx - 10, cy - 12, cx - 4, cy - 8, 5, accent);
    drawThickLine(cx + 8, cy + 11, cx + 13, cy + 5, 5, accent);
  } else if (icon == 28) {  // Car
    gfx->drawRoundRect(cx - 14, cy - 3, 28, 13, 4, accent);
    drawThickLine(cx - 10, cy - 3, cx - 6, cy - 10, 2, accent);
    drawThickLine(cx - 6, cy - 10, cx + 7, cy - 10, 2, accent);
    drawThickLine(cx + 7, cy - 10, cx + 11, cy - 3, 2, accent);
    gfx->fillCircle(cx - 8, cy + 10, 3, accent); gfx->fillCircle(cx + 8, cy + 10, 3, accent);
  } else if (icon == 29) {  // Brightness
    gfx->fillCircle(cx, cy, 6, yellow);
    for (uint8_t ray = 0; ray < 4; ++ray) {
      const int8_t dx = ray % 2 == 0 ? 13 : 0;
      const int8_t dy = ray % 2 == 1 ? 13 : 0;
      drawThickLine(cx - dx, cy - dy, cx - (dx / 2), cy - (dy / 2), 2, yellow);
      drawThickLine(cx + (dx / 2), cy + (dy / 2), cx + dx, cy + dy, 2, yellow);
    }
  } else if (icon == 30) {  // Bluetooth
    drawThickLine(cx, cy - 14, cx, cy + 14, 2, accent);
    drawThickLine(cx, cy - 14, cx + 9, cy - 6, 2, accent); drawThickLine(cx + 9, cy - 6, cx - 7, cy + 8, 2, accent);
    drawThickLine(cx - 7, cy - 8, cx + 9, cy + 6, 2, accent); drawThickLine(cx + 9, cy + 6, cx, cy + 14, 2, accent);
  } else if (icon == 31) {  // Wi-Fi
    gfx->drawCircle(cx, cy + 11, 3, accent);
    gfx->drawCircle(cx, cy + 9, 10, accent); gfx->fillRect(cx - 12, cy - 3, 24, 13, fill);
    gfx->drawCircle(cx, cy + 7, 17, accent); gfx->fillRect(cx - 19, cy - 10, 38, 17, fill);
  } else {  // Camera
    gfx->drawRoundRect(cx - 14, cy - 9, 28, 20, 3, accent);
    gfx->fillRect(cx - 6, cy - 13, 12, 5, accent);
    gfx->drawCircle(cx, cy + 1, 7, accent);
  }
}

static void drawHeader() {
  const uint16_t bg = pageBg(currentPage);
  gfx->fillRect(0, 0, screenWidth, kTopLayoutH, bg);
  drawCenteredBuiltInText(0, 0, screenWidth, 29, pageTitle(currentPage), 2, textColor(), bg);
}

static void drawPageIndicator() {
  for (uint8_t i = 0; i < 3; ++i) {
    const bool active = (i == currentPage);
    gfx->fillCircle(228 + (i * 12), 31, 3, active ? rgb565(56, 189, 248) : rgb565(107, 114, 128));
  }
}

static void drawNavigationBox(int8_t control, int16_t x, int16_t width, const char *label, bool active, bool disabled) {
  const bool pressed = pressedButton == control;
  const uint16_t fill = active ? rgb565(7, 89, 183) : disabled ? rgb565(17, 25, 35) : pressed ? rgb565(32, 51, 74) : rgb565(26, 36, 49);
  const uint16_t border = active ? rgb565(22, 135, 255) : disabled ? rgb565(38, 49, 64) : rgb565(52, 65, 84);
  const uint16_t color = disabled ? rgb565(83, 97, 114) : textColor();
  gfx->fillRoundRect(x, 219, width, 43, 9, fill);
  gfx->drawRoundRect(x, 219, width, 43, 9, border);
  if (control == 6 || control == 10) {
    const int16_t cx = x + (width / 2);
    const int16_t direction = control == 6 ? -1 : 1;
    drawThickLine(cx + (direction * 5), 230, cx - (direction * 5), 240, 3, color);
    drawThickLine(cx - (direction * 5), 240, cx + (direction * 5), 250, 3, color);
  } else {
    drawCenteredText(x + 4, 222, width - 8, 36, label, 1, color, fill);
  }
}

static void drawBottomNavigation() {
  gfx->fillRect(0, 210, screenWidth, 62, rgb565(21, 29, 41));
  drawNavigationBox(6, 10, 54, "", false, currentPage == 0);
  drawNavigationBox(7, 74, 104, configuredPageName(0), currentPage == 0, false);
  drawNavigationBox(8, 188, 104, configuredPageName(1), currentPage == 1, false);
  drawNavigationBox(9, 302, 104, configuredPageName(2), currentPage == 2, false);
  drawNavigationBox(10, 416, 54, "", false, currentPage == 2);
}

static void drawButton(uint8_t page, uint8_t index, bool pressed) {
  const MacroButton &button = kPageButtons[page][index];
  if (!buttonIsVisible(button)) {
    return;
  }

  const int16_t w = buttonSpanWidth(button);
  const int16_t h = buttonSpanHeight(button);
  const int16_t x = buttonX(button.column);
  const int16_t y = buttonY(button.row);
  const uint16_t fill = buttonFill(pressed, page);
  const uint16_t accent = pageAccent(page);
  const int16_t bx = x;
  const int16_t by = y;
  const int16_t iconCx = bx + (w / 2);
  const int16_t iconCy = by + 25;

  gfx->fillRoundRect(bx, by, w, h, 12, fill);
  gfx->drawRoundRect(bx, by, w, h, 12, buttonBorder(pressed, page));

  drawButtonIcon(page, index, iconCx, iconCy, accent, fill);
  drawCenteredText(bx + 8, by + 49, w - 16, 22, configuredComboLabel(page, index), 1, mutedColor(), fill);
}

static void drawBootSplash() {
  const uint16_t bg = rgb565(245, 247, 250);
  const uint16_t dark = rgb565(15, 23, 42);
  const uint16_t accent1 = rgb565(239, 68, 68);
  const uint16_t accent2 = rgb565(34, 197, 94);
  const uint16_t accent3 = rgb565(59, 130, 246);
  const uint16_t accent4 = rgb565(245, 158, 11);

  gfx->fillScreen(bg);
  gfx->drawRect(0, 0, screenWidth, screenHeight, dark);
  gfx->fillRect(0, 0, screenWidth, 34, dark);
  gfx->fillRect(0, screenHeight - 34, screenWidth, 34, dark);

  gfx->fillRect(18, 58, 136, 82, accent1);
  gfx->fillRect(172, 58, 136, 82, accent2);
  gfx->fillRect(326, 58, 136, 82, accent3);
  gfx->fillRect(96, 156, 288, 48, accent4);

  selectBuiltInFont(3);
  gfx->setTextColor(bg, dark);
  gfx->setCursor(12, 7);
  gfx->print("JC4827W543");

  selectBuiltInFont(3);
  gfx->setTextColor(dark, bg);
  gfx->setCursor(122, 168);
  gfx->print("PANEL OK");

  selectBuiltInFont(2);
  gfx->setTextColor(dark, bg);
  gfx->setCursor(78, 224);
  gfx->print("BOOT CHECK");

  selectBuiltInFont(2);
  gfx->setTextColor(bg, dark);
  gfx->setCursor(12, screenHeight - 27);
  gfx->print("DISPLAY + BACKLIGHT");

  gfx->flush();
}

static void renderScreen() {
  gfx->fillScreen(pageBg(currentPage));
  drawHeader();

  for (uint8_t i = 0; i < 6; ++i) {
    const bool pressed = (pressedButton == (int8_t)i);
    drawButton(currentPage, i, pressed);
  }

  drawPageIndicator();
  drawBottomNavigation();
  gfx->flush();
  uiDirty = false;
}

static void wakeDisplay() {
  if (!backlightOn) {
    setBacklight(true);
  }
  noteActivity();
  uiDirty = true;
  renderScreen();
}

static bool changePageFromSwipe(int16_t dx) {
  if (dx == 0) {
    return false;
  }

  const uint8_t oldPage = currentPage;
  if (dx < 0) {
    if (currentPage < 2) {
      currentPage++;
    } else if (kSwipeWrapPages) {
      currentPage = 0;
    }
  } else {
    if (currentPage > 0) {
      currentPage--;
    } else if (kSwipeWrapPages) {
      currentPage = 2;
    }
  }

  return currentPage != oldPage;
}

static bool activateNavigation(int8_t control) {
  const uint8_t oldPage = currentPage;
  if (control == 6 && currentPage > 0) {
    currentPage--;
  } else if (control == 10 && currentPage < 2) {
    currentPage++;
  } else if (control >= 7 && control <= 9) {
    currentPage = control - 7;
  }
  return currentPage != oldPage;
}

static void finishSwipeGesture(int16_t dx) {
  changePageFromSwipe(dx);
  pressedButton = -1;
  touchStartButton = -1;
  touchMovedTooFar = true;
  swipeDetected = true;
  suppressUntilRelease = true;
  uiDirty = true;
  noteActivity();
  postSwipeGuardUntilMs = millis() + kPostSwipeGuardMs;
  renderScreen();
}

static int16_t dominantSwipeDelta() {
  const int16_t leftDistance = touchStartX - touchMinX;
  const int16_t rightDistance = touchMaxX - touchStartX;
  const int16_t upDistance = touchStartY - touchMinY;
  const int16_t downDistance = touchMaxY - touchStartY;

  int16_t bestDelta = 0;
  int16_t bestDistance = 0;

  if (leftDistance > bestDistance) {
    bestDistance = leftDistance;
    bestDelta = -leftDistance;
  }
  if (rightDistance > bestDistance) {
    bestDistance = rightDistance;
    bestDelta = rightDistance;
  }
  if (upDistance > bestDistance) {
    bestDistance = upDistance;
    bestDelta = -upDistance;
  }
  if (downDistance > bestDistance) {
    bestDistance = downDistance;
    bestDelta = downDistance;
  }

  return bestDelta;
}

static void handleSleepTimeout() {
  if (backlightOn && (millis() - lastActivityMs >= kIdleSleepMs)) {
    Keyboard.releaseAll();
    setBacklight(false);
    touchHeld = false;
    suppressUntilRelease = false;
    swipeDetected = false;
    touchMovedTooFar = false;
    pressedButton = -1;
    touchStartButton = -1;
    lastTouchSampleMs = 0;
    postMacroGuardUntilMs = 0;
  }
}

static void handleTouchFrame() {
  int16_t x = 0;
  int16_t y = 0;
  const uint32_t now = millis();
  const bool hasTouchSample = readTouchPoint(x, y);
  bool pressed = hasTouchSample;

  if (hasTouchSample) {
    lastTouchSampleMs = now;
  } else if (touchHeld && (now - lastTouchSampleMs <= kTouchReleaseGraceMs)) {
    pressed = true;
    x = lastTouchX;
    y = lastTouchY;
  }

  if (postMacroGuardUntilMs != 0) {
    pressedButton = -1;
    touchStartButton = -1;
    touchHeld = false;
    suppressUntilRelease = false;
    if (pressed || now < postMacroGuardUntilMs) {
      return;
    }
    postMacroGuardUntilMs = 0;
  }

  if (postSwipeGuardUntilMs != 0 && now < postSwipeGuardUntilMs) {
    pressedButton = -1;
    touchStartButton = -1;
    if (!pressed) {
      touchHeld = false;
      suppressUntilRelease = false;
    }
    return;
  }
  postSwipeGuardUntilMs = 0;

  if (!backlightOn) {
    if (pressed) {
      touchHeld = true;
      suppressUntilRelease = true;
      swipeDetected = false;
      touchMovedTooFar = false;
      pressedButton = -1;
      touchStartButton = -1;
      touchStartX = x;
      touchStartY = y;
      lastTouchX = x;
      lastTouchY = y;
      lastTouchSampleMs = now;
      touchMinX = x;
      touchMaxX = x;
      touchMinY = y;
      touchMaxY = y;
      touchPage = currentPage;
      wakeDisplay();
    }
    return;
  }

  if (suppressUntilRelease) {
    if (!pressed) {
      suppressUntilRelease = false;
      touchHeld = false;
    }
    return;
  }

  if (pressed) {
    noteActivity();

    if (!touchHeld) {
      touchHeld = true;
      swipeDetected = false;
      touchMovedTooFar = false;
      touchStartX = x;
      touchStartY = y;
      lastTouchX = x;
      lastTouchY = y;
      touchMinX = x;
      touchMaxX = x;
      touchMinY = y;
      touchMaxY = y;
      touchPage = currentPage;
      touchStartButton = hitTestButton(currentPage, x, y);
      pressedButton = -1;
    } else {
      if (!hasTouchSample) {
        return;
      }

      lastTouchX = x;
      lastTouchY = y;

      const int16_t dx = x - touchStartX;
      const int16_t dy = y - touchStartY;
      const int16_t absDx = abs(dx);
      const int16_t absDy = abs(dy);

      if (x < touchMinX) {
        touchMinX = x;
      }
      if (x > touchMaxX) {
        touchMaxX = x;
      }
      if (y < touchMinY) {
        touchMinY = y;
      }
      if (y > touchMaxY) {
        touchMaxY = y;
      }

      const int16_t spanX = touchMaxX - touchMinX;
      const int16_t spanY = touchMaxY - touchMinY;
      const int16_t spanMajor = max(spanX, spanY);

      if (!touchMovedTooFar && (absDx > kTapMoveTolerance || absDy > kTapMoveTolerance)) {
        touchMovedTooFar = true;
        pressedButton = -1;
        touchStartButton = -1;
        uiDirty = true;
      }

      if (!swipeDetected && spanMajor > kSwipeIntentThreshold) {
        swipeDetected = true;
        pressedButton = -1;
        touchStartButton = -1;
        touchMovedTooFar = true;
        uiDirty = true;
      }

      if (swipeDetected && spanMajor >= kSwipeThreshold) {
        finishSwipeGesture(dominantSwipeDelta());
      }
    }

    return;
  }

  if (touchHeld) {
    touchHeld = false;

    if (swipeDetected) {
      const int16_t dx = lastTouchX - touchStartX;
      const int16_t spanX = touchMaxX - touchMinX;
      const int16_t spanY = touchMaxY - touchMinY;
      if (max(spanX, spanY) >= kSwipeThreshold) {
        changePageFromSwipe(dominantSwipeDelta());
      }
      pressedButton = -1;
      touchStartButton = -1;
      uiDirty = true;
      noteActivity();
      postSwipeGuardUntilMs = millis() + kPostSwipeGuardMs;
    } else if (!touchMovedTooFar && touchStartButton >= 0 && touchPage == currentPage) {
      const int8_t releaseButton = hitTestButton(touchPage, lastTouchX, lastTouchY);
      if (releaseButton != touchStartButton) {
        pressedButton = -1;
        touchStartButton = -1;
        uiDirty = true;
        suppressUntilRelease = false;
        return;
      }

      const int8_t releasedControl = touchStartButton;
      pressedButton = -1;
      touchStartButton = -1;
      uiDirty = true;
      if (releasedControl >= 6) {
        activateNavigation(releasedControl);
        noteActivity();
        renderScreen();
      } else {
        sendConfiguredMacro(touchPage, releasedControl);
        postMacroGuardUntilMs = millis() + kPostMacroGuardMs;
      }
    } else {
      pressedButton = -1;
      touchStartButton = -1;
      uiDirty = true;
    }
  }

  suppressUntilRelease = false;
}

static void initDisplay() {
  Serial.println("init display");
  if (!gfx->begin()) {
    Serial.println("gfx->begin() failed");
  }

  gfx->displayOn();
  delay(120);

  screenWidth = gfx->width();
  screenHeight = gfx->height();
  Serial.printf("display size: %u x %u\r\n", screenWidth, screenHeight);
  selectBuiltInFont(1);
}

static void initTouch() {
  touch.begin(GT911_ADDR1);
  Wire.setClock(400000);
  touch.setRotation(TOUCH_ROTATION);
  touch.setResolution(screenWidth, screenHeight);
}

static bool i2cAddressResponds(uint8_t address) {
  Wire.beginTransmission(address);
  return Wire.endTransmission() == 0;
}

static void drawTouchDiagnostic(bool pressed, int16_t x, int16_t y) {
  const bool gt911Addr1 = i2cAddressResponds(GT911_ADDR1);
  const bool gt911Addr2 = i2cAddressResponds(GT911_ADDR2);

  gfx->fillScreen(rgb565(8, 12, 18));
  gfx->setFont((const GFXfont *)nullptr);
  gfx->setTextWrap(false);

  gfx->setTextSize(3);
  gfx->setTextColor(rgb565(255, 255, 255), rgb565(8, 12, 18));
  gfx->setCursor(18, 18);
  gfx->print("TOUCH DIAG");

  gfx->setTextSize(2);
  gfx->setCursor(18, 66);
  gfx->print("GT911 0x5D: ");
  gfx->print(gt911Addr1 ? "OK" : "NO");

  gfx->setCursor(18, 94);
  gfx->print("GT911 0x14: ");
  gfx->print(gt911Addr2 ? "OK" : "NO");

  gfx->setCursor(18, 134);
  gfx->print("STATE: ");
  gfx->print(pressed ? "TOUCHED" : "WAITING");

  gfx->setCursor(18, 164);
  gfx->print("X:");
  gfx->print(x);
  gfx->print(" Y:");
  gfx->print(y);

  gfx->setCursor(18, 220);
  gfx->print("Touch the glass");

  if (pressed) {
    gfx->fillCircle(x, y, 12, rgb565(239, 68, 68));
  }

  gfx->flush();

  Serial.printf("touch_diag addr5D=%d addr14=%d pressed=%d x=%d y=%d touches=%u\r\n",
                gt911Addr1, gt911Addr2, pressed, x, y, touch.touches);
}

void setup() {
  Serial.begin(115200);
  delay(50);

  pinMode(kBacklightPin, OUTPUT);
  setBacklight(false);

  loadStoredConfig();
  Keyboard.begin();
  ConsumerControl.begin();
  USB.begin();

  initDisplay();
  initTouch();

  setBacklight(true);
  drawBootSplash();
  delay(kBootSplashMs);

  noteActivity();
  renderScreen();
}

void loop() {
  if (kTouchDiagnosticMode) {
    static uint32_t lastDrawMs = 0;
    static bool lastPressed = false;
    static int16_t lastX = -1;
    static int16_t lastY = -1;

    setBacklight(true);

    int16_t x = 0;
    int16_t y = 0;
    const bool pressed = readTouchPoint(x, y);
    const bool changed = (pressed != lastPressed) || (x != lastX) || (y != lastY);

    if (changed || (millis() - lastDrawMs >= 500)) {
      drawTouchDiagnostic(pressed, x, y);
      lastDrawMs = millis();
      lastPressed = pressed;
      lastX = x;
      lastY = y;
    }

    delay(20);
    return;
  }

  handleTouchFrame();
  handleSleepTimeout();

  if (uiDirty && backlightOn) {
    renderScreen();
  }

  delay(5);
}
