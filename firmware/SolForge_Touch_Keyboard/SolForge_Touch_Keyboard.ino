#include <Arduino.h>
#include <U8g2lib.h>
#include <esp_attr.h>
#include <esp_partition.h>
#include <esp_system.h>
#include <Preferences.h>
#include "Arduino_GFX.h"
#include "Arduino_ESP32QSPI.h"
#include "Arduino_NV3041A.h"
#include "Arduino_Canvas.h"
#include <pgmspace.h>
#include "boot_animation_data.h"
#include "icon_bitmaps.h"
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
static constexpr uint32_t kMacroHoldMs = 20;
static constexpr uint8_t kBacklightLevels = 10;
static constexpr uint32_t kBacklightPwmFreq = 5000;
static constexpr uint8_t kBacklightPwmResolution = 8;
static constexpr uint8_t kDefaultAutoOffIndex = 1;
static constexpr uint16_t kAutoOffChoices[7] = {10, 30, 60, 180, 300, 600, 0};
static const char *const kAutoOffLabels[7] = {"10초", "30초", "1분", "3분", "5분", "10분", "OFF"};
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
static constexpr uint32_t kBootGifGuardMagic = 0x52474232;
static constexpr uint32_t kBootGifGuardIdle = 0;
static constexpr uint32_t kBootGifGuardPlaying = 1;
static constexpr uint32_t kBootGifGuardFailed = 2;
static constexpr uint32_t kBootGifGuardComplete = 3;

struct BootGifGuard {
  uint32_t magic;
  uint32_t state;
};

RTC_NOINIT_ATTR static BootGifGuard bootGifGuard;
static esp_reset_reason_t bootResetReason = ESP_RST_UNKNOWN;
static bool bootGifSkippedAfterCrash = false;

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

enum class SettingsScreen : uint8_t { Off = 0, Menu, Brightness, AutoOff, RebootConfirm };
static SettingsScreen settingsScreen = SettingsScreen::Off;
static uint8_t backlightLevel = 8;
static uint8_t autoOffIndex = kDefaultAutoOffIndex;
static int16_t settingsPressX = -1;
static int16_t settingsPressY = -1;
static int16_t settingsPressedZone = -1;
static int16_t settingsLastX = -1;
static int16_t settingsLastY = -1;
static bool settingsPressActive = false;
static Preferences settingsPrefs;

static void initBacklight() {
  ledcAttach(kBacklightPin, kBacklightPwmFreq, kBacklightPwmResolution);
}

static void applyBacklightDuty() {
  const uint32_t duty = ((uint32_t)backlightLevel * 255U) / kBacklightLevels;
  ledcWrite(kBacklightPin, duty);
}

static void setBacklight(bool on) {
  backlightOn = on;
  if (on) {
    applyBacklightDuty();
  } else {
    ledcWrite(kBacklightPin, 0);
  }
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

static void loadDeviceSettings() {
  settingsPrefs.begin("gk", false);
  backlightLevel = constrain(settingsPrefs.getUChar("bright", 8), 1, kBacklightLevels);
  autoOffIndex = constrain(settingsPrefs.getUChar("autoff", kDefaultAutoOffIndex), 0, 6);
  settingsPrefs.end();
}

static void saveDeviceSettings() {
  settingsPrefs.begin("gk", false);
  settingsPrefs.putUChar("bright", backlightLevel);
  settingsPrefs.putUChar("autoff", autoOffIndex);
  settingsPrefs.end();
}

static uint32_t autoOffMs() {
  return (uint32_t)kAutoOffChoices[autoOffIndex] * 1000UL;
}

static const char *configuredPageName(uint8_t page) {
  if (storedConfigValid && page < kConfigPageCount && storedConfig.pages[page].name[0] != '\0') {
    return storedConfig.pages[page].name;
  }
  static const char *defaults[3] = {"1 페이지", "2 페이지", "3 페이지"};
  return defaults[page < 3 ? page : 0];
}

static bool isSettingsButton(uint8_t page, uint8_t button) {
  return page == 2 && button == 5;
}

static const char *configuredComboLabel(uint8_t page, uint8_t button) {
  if (isSettingsButton(page, button)) {
    if (storedConfigValid && storedConfig.pages[2].buttons[5].comboLabel[0] != '\0') {
      return storedConfig.pages[2].buttons[5].comboLabel;
    }
    return "설정";
  }
  if (storedConfigValid && page < kConfigPageCount && button < kConfigButtonCount) {
    const char *label = storedConfig.pages[page].buttons[button].comboLabel;
    if (label[0] != '\0') return label;
  }
  return "미설정";
}

static uint8_t configuredIconId(uint8_t page, uint8_t button) {
  if (isSettingsButton(page, button)) {
    return 26;
  }
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
  if (isSettingsButton(page, button)) {
    return;
  }
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
  if (x >= 12 && x < 156) return 7;
  if (x >= 168 && x < 312) return 8;
  if (x >= 324 && x < 468) return 9;
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

static constexpr uint16_t kBitmapTransparent = 0x0001;

static void drawBitmapIcon(const uint16_t *pixels, int16_t x, int16_t y, uint8_t size) {
  for (uint8_t row = 0; row < size; ++row) {
    const uint16_t *line = &pixels[row * size];
    int16_t col = 0;
    while (col < size) {
      while (col < size && line[col] == kBitmapTransparent) {
        ++col;
      }
      if (col >= size) {
        break;
      }
      const int16_t start = col;
      while (col < size && line[col] != kBitmapTransparent) {
        ++col;
      }
      gfx->draw16bitRGBBitmap(x + start, y + row, &line[start], col - start, 1);
    }
  }
}

static void drawButtonIcon(uint8_t page, uint8_t index, int16_t cx, int16_t cy, uint16_t accent, uint16_t fill) {
  (void)page;
  const uint8_t icon = configuredIconId(page, index);
  const uint16_t white = rgb565(232, 241, 251);
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
    drawBitmapIcon(kIconTmap, cx - 16, cy - 16, 32);
  } else if (icon == 9) {  // YouTube
    drawBitmapIcon(kIconYoutube, cx - 16, cy - 16, 32);
  } else if (icon == 10) {  // Chrome
    drawBitmapIcon(kIconChrome, cx - 16, cy - 16, 32);
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
    drawThickLine(cx, cy - 14, cx + 9, cy - 6, 2, accent);
    drawThickLine(cx + 9, cy - 6, cx, cy, 2, accent);
    drawThickLine(cx, cy, cx + 9, cy + 6, 2, accent);
    drawThickLine(cx + 9, cy + 6, cx, cy + 14, 2, accent);
    drawThickLine(cx, cy, cx - 8, cy - 8, 2, accent);
    drawThickLine(cx, cy, cx - 8, cy + 8, 2, accent);
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
  drawCenteredText(x + 4, 222, width - 8, 36, label, 1, color, fill);
}

static void drawBottomNavigation() {
  gfx->fillRect(0, 210, screenWidth, 62, rgb565(21, 29, 41));
  drawNavigationBox(7, 12, 144, configuredPageName(0), currentPage == 0, false);
  drawNavigationBox(8, 168, 144, configuredPageName(1), currentPage == 1, false);
  drawNavigationBox(9, 324, 144, configuredPageName(2), currentPage == 2, false);
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

static void renderScreen();

static uint16_t settingsBg() {
  return rgb565(8, 12, 18);
}

static uint16_t settingsPanel() {
  return rgb565(21, 29, 41);
}

static uint16_t settingsPanelPressed() {
  return rgb565(32, 51, 74);
}

static uint16_t settingsAccent() {
  return rgb565(56, 189, 248);
}

static uint16_t settingsAccentFill() {
  return rgb565(7, 89, 183);
}

static uint16_t settingsLine() {
  return rgb565(52, 65, 84);
}

static void enterSettings() {
  settingsScreen = SettingsScreen::Menu;
  currentPage = 2;
  touchHeld = false;
  suppressUntilRelease = false;
  swipeDetected = false;
  touchMovedTooFar = false;
  pressedButton = -1;
  touchStartButton = -1;
  settingsPressActive = false;
  settingsPressedZone = -1;
  noteActivity();
  uiDirty = true;
  renderScreen();
}

static void leaveSettings() {
  settingsScreen = SettingsScreen::Off;
  currentPage = 2;
  touchHeld = false;
  suppressUntilRelease = false;
  swipeDetected = false;
  touchMovedTooFar = false;
  pressedButton = -1;
  touchStartButton = -1;
  settingsPressActive = false;
  settingsPressedZone = -1;
  noteActivity();
  uiDirty = true;
  renderScreen();
}

static void drawBackIcon(int16_t cx, int16_t cy, uint16_t color) {
  drawThickLine(cx + 7, cy - 7, cx - 7, cy, 3, color);
  drawThickLine(cx - 7, cy, cx + 7, cy + 7, 3, color);
}

static void drawHomeIcon(int16_t cx, int16_t cy, uint16_t color) {
  drawThickLine(cx - 9, cy + 1, cx, cy - 9, 3, color);
  drawThickLine(cx + 9, cy + 1, cx, cy - 9, 3, color);
  gfx->fillRect(cx - 6, cy + 1, 12, 8, color);
  gfx->fillRect(cx - 2, cy + 4, 4, 5, settingsPanel());
}

static void drawSettingsHeader(const char *title) {
  const uint16_t bg = settingsBg();
  const uint16_t panel = settingsPanel();
  gfx->fillScreen(bg);
  gfx->fillRect(0, 0, screenWidth, 42, panel);
  gfx->drawLine(0, 41, screenWidth, 41, settingsLine());
  drawCenteredText(0, 0, screenWidth, 42, title, 1, textColor(), panel);
  drawBackIcon(30, 21, settingsAccent());
  drawHomeIcon(screenWidth - 30, 21, settingsAccent());
}

static void drawSettingsRow(int16_t y, const char *label, bool highlighted, bool pressed) {
  const uint16_t fill = highlighted ? settingsAccentFill() : pressed ? settingsPanelPressed() : settingsPanel();
  const uint16_t border = highlighted ? settingsAccent() : settingsLine();
  const uint16_t color = highlighted ? rgb565(248, 250, 252) : textColor();
  gfx->fillRoundRect(24, y, screenWidth - 48, 40, 9, fill);
  gfx->drawRoundRect(24, y, screenWidth - 48, 40, 9, border);
  drawCenteredText(24, y, screenWidth - 48, 40, label, 1, color, fill);
}

static void renderSettingsMenu() {
  static const char *items[3] = {"밝기 조절", "자동 화면 꺼짐", "재부팅"};
  drawSettingsHeader("설정");
  for (uint8_t i = 0; i < 3; ++i) {
    drawSettingsRow(60 + i * 50, items[i], false, settingsPressedZone == (int16_t)(100 + i));
  }
}

static void renderSettingsBrightness() {
  drawSettingsHeader("밝기 조절");
  char value[8];
  snprintf(value, sizeof(value), "%u / %u", backlightLevel, kBacklightLevels);
  drawCenteredText(0, 64, screenWidth, 40, value, 1, textColor(), settingsBg());

  const int16_t barX = 102;
  const int16_t barY = 118;
  const int16_t barW = 26;
  const int16_t barGap = 4;
  for (uint8_t i = 0; i < kBacklightLevels; ++i) {
    const bool filled = i < backlightLevel;
    gfx->fillRoundRect(barX + i * (barW + barGap), barY, barW, 14, 3, filled ? settingsAccent() : settingsLine());
  }

  const int16_t buttonY = 158;
  const int16_t buttonH = 52;
  gfx->fillRoundRect(60, buttonY, 140, buttonH, 10, settingsPressedZone == 200 ? settingsPanelPressed() : settingsPanel());
  gfx->drawRoundRect(60, buttonY, 140, buttonH, 10, settingsLine());
  drawCenteredText(60, buttonY, 140, buttonH, "-", 1, textColor(), settingsPanel());
  gfx->fillRoundRect(280, buttonY, 140, buttonH, 10, settingsPressedZone == 201 ? settingsPanelPressed() : settingsPanel());
  gfx->drawRoundRect(280, buttonY, 140, buttonH, 10, settingsLine());
  drawCenteredText(280, buttonY, 140, buttonH, "+", 1, textColor(), settingsPanel());
}

static void renderSettingsAutoOff() {
  drawSettingsHeader("자동 화면 꺼짐");
  for (uint8_t i = 0; i < 7; ++i) {
    const bool selected = i == autoOffIndex;
    const int16_t y = 52 + i * 26;
    const uint16_t fill = selected ? settingsAccentFill() : settingsPressedZone == (int16_t)(300 + i) ? settingsPanelPressed() : settingsPanel();
    const uint16_t border = selected ? settingsAccent() : settingsLine();
    const uint16_t color = selected ? rgb565(248, 250, 252) : textColor();
    gfx->fillRoundRect(24, y, screenWidth - 48, 24, 6, fill);
    gfx->drawRoundRect(24, y, screenWidth - 48, 24, 6, border);
    drawCenteredText(24, y, screenWidth - 48, 24, kAutoOffLabels[i], 1, color, fill);
  }
}

static void renderSettingsReboot() {
  drawSettingsHeader("재부팅");
  drawCenteredText(20, 80, screenWidth - 40, 48, "정말 재부팅 하시겠습니까?", 1, textColor(), settingsBg());

  const int16_t buttonY = 150;
  const int16_t buttonH = 52;
  gfx->fillRoundRect(60, buttonY, 160, buttonH, 10, settingsPressedZone == 400 ? settingsPanelPressed() : settingsPanel());
  gfx->drawRoundRect(60, buttonY, 160, buttonH, 10, settingsLine());
  drawCenteredText(60, buttonY, 160, buttonH, "진행", 1, textColor(), settingsPanel());
  gfx->fillRoundRect(260, buttonY, 160, buttonH, 10, settingsPressedZone == 401 ? settingsPanelPressed() : settingsPanel());
  gfx->drawRoundRect(260, buttonY, 160, buttonH, 10, settingsLine());
  drawCenteredText(260, buttonY, 160, buttonH, "취소", 1, textColor(), settingsPanel());
}

static void renderSettingsScreen() {
  switch (settingsScreen) {
    case SettingsScreen::Menu:
      renderSettingsMenu();
      break;
    case SettingsScreen::Brightness:
      renderSettingsBrightness();
      break;
    case SettingsScreen::AutoOff:
      renderSettingsAutoOff();
      break;
    case SettingsScreen::RebootConfirm:
      renderSettingsReboot();
      break;
    default:
      break;
  }
  gfx->flush();
  uiDirty = false;
}

static int16_t settingsZoneAt(int16_t x, int16_t y) {
  if (y < 42) {
    if (x < 64) return 0;
    if (x >= screenWidth - 64) return 1;
    return -1;
  }
  switch (settingsScreen) {
    case SettingsScreen::Menu: {
      if (y >= 60 && y < 210) {
        const int16_t row = (y - 60) / 50;
        if (row < 3) return 100 + row;
      }
      break;
    }
    case SettingsScreen::Brightness: {
      if (y >= 158 && y < 210) {
        return x < screenWidth / 2 ? 200 : 201;
      }
      break;
    }
    case SettingsScreen::AutoOff: {
      if (y >= 52 && y < 234) {
        const int16_t row = (y - 52) / 26;
        if (row < 7) return 300 + row;
      }
      break;
    }
    case SettingsScreen::RebootConfirm: {
      if (y >= 150 && y < 202) {
        return x < screenWidth / 2 ? 400 : 401;
      }
      break;
    }
    default:
      break;
  }
  return -1;
}

static void settingsTap(int16_t zone) {
  if (zone == 0) {
    if (settingsScreen == SettingsScreen::Menu) {
      leaveSettings();
    } else {
      settingsScreen = SettingsScreen::Menu;
      uiDirty = true;
      renderScreen();
    }
    return;
  }
  if (zone == 1) {
    leaveSettings();
    return;
  }
  switch (settingsScreen) {
    case SettingsScreen::Menu:
      if (zone >= 100 && zone < 103) {
        settingsScreen = zone == 100 ? SettingsScreen::Brightness
                                     : zone == 101 ? SettingsScreen::AutoOff
                                                   : SettingsScreen::RebootConfirm;
      }
      break;
    case SettingsScreen::Brightness:
      if (zone == 200 && backlightLevel > 1) {
        backlightLevel--;
        applyBacklightDuty();
        saveDeviceSettings();
      } else if (zone == 201 && backlightLevel < kBacklightLevels) {
        backlightLevel++;
        applyBacklightDuty();
        saveDeviceSettings();
      }
      break;
    case SettingsScreen::AutoOff:
      if (zone >= 300 && zone < 307) {
        autoOffIndex = (uint8_t)(zone - 300);
        saveDeviceSettings();
      }
      break;
    case SettingsScreen::RebootConfirm:
      if (zone == 400) {
        ESP.restart();
      } else if (zone == 401) {
        settingsScreen = SettingsScreen::Menu;
      }
      break;
    default:
      break;
  }
  noteActivity();
  uiDirty = true;
  renderScreen();
}

static void handleSettingsTouchFrame(bool pressed, int16_t x, int16_t y) {
  if (pressed) {
    noteActivity();
    settingsLastX = x;
    settingsLastY = y;
    lastTouchSampleMs = millis();
    if (!settingsPressActive) {
      settingsPressActive = true;
      settingsPressX = x;
      settingsPressY = y;
      settingsPressedZone = settingsZoneAt(x, y);
      uiDirty = true;
    }
    return;
  }
  if (!settingsPressActive) {
    return;
  }
  settingsPressActive = false;
  const int16_t dx = abs(settingsLastX - settingsPressX);
  const int16_t dy = abs(settingsLastY - settingsPressY);
  const int16_t zone = settingsZoneAt(settingsLastX, settingsLastY);
  const int16_t pressedZone = settingsPressedZone;
  settingsPressedZone = -1;
  uiDirty = true;
  if (dx > 14 || dy > 14 || zone < 0 || zone != pressedZone) {
    return;
  }
  settingsTap(zone);
}

static void renderScreen() {
  if (settingsScreen != SettingsScreen::Off) {
    renderSettingsScreen();
    return;
  }
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
  if (control >= 7 && control <= 9) {
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
  const uint32_t timeoutMs = autoOffMs();
  if (backlightOn && timeoutMs != 0 && (millis() - lastActivityMs >= timeoutMs)) {
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

  if (settingsScreen != SettingsScreen::Off) {
    if (suppressUntilRelease) {
      if (!pressed) {
        suppressUntilRelease = false;
      }
      return;
    }
    handleSettingsTouchFrame(pressed, x, y);
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
      } else if (isSettingsButton(touchPage, releasedControl)) {
        enterSettings();
        postMacroGuardUntilMs = millis() + kPostMacroGuardMs;
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

static constexpr uint16_t kAnimationCommandMask = 0xC000;
static constexpr uint16_t kAnimationCountMask = 0x3FFF;
static constexpr uint16_t kAnimationLiteral = 0x4000;
static constexpr uint16_t kAnimationRepeat = 0x8000;

static bool applyBootAnimationFrame(const BootAnimationFrame &frame) {
  Arduino_Canvas *canvas = static_cast<Arduino_Canvas *>(gfx);
  uint16_t *framebuffer = canvas->getFramebuffer();
  const uint32_t pixelCount = static_cast<uint32_t>(screenWidth) * screenHeight;
  const uint32_t end = frame.offset + frame.wordCount;
  uint32_t dataIndex = frame.offset;
  uint32_t pixelIndex = 0;

  while (dataIndex < end && pixelIndex < pixelCount) {
    const uint16_t command = pgm_read_word(&bootAnimationData[dataIndex++]);
    const uint16_t type = command & kAnimationCommandMask;
    const uint16_t count = command & kAnimationCountMask;
    if (count == 0 || pixelIndex + count > pixelCount) {
      return false;
    }

    if (type == 0) {
      pixelIndex += count;
    } else if (type == kAnimationLiteral) {
      if (dataIndex + count > end) {
        return false;
      }
      for (uint16_t index = 0; index < count; ++index) {
        framebuffer[pixelIndex++] = pgm_read_word(&bootAnimationData[dataIndex++]);
      }
    } else if (type == kAnimationRepeat) {
      if (dataIndex >= end) {
        return false;
      }
      const uint16_t color = pgm_read_word(&bootAnimationData[dataIndex++]);
      for (uint16_t index = 0; index < count; ++index) {
        framebuffer[pixelIndex++] = color;
      }
    } else {
      return false;
    }

    if ((pixelIndex & 0x3FFF) == 0) {
      yield();
    }
  }

  return dataIndex == end && pixelIndex == pixelCount;
}

static void playBootGif() {
  static constexpr uint32_t kBootGifTimeoutMs = 5000;
  const uint32_t startedAtMs = millis();
  uint32_t targetElapsedMs = 0;
  Arduino_Canvas *canvas = static_cast<Arduino_Canvas *>(gfx);
  memset(canvas->getFramebuffer(), 0, static_cast<size_t>(screenWidth) * screenHeight * sizeof(uint16_t));

  for (uint16_t frameIndex = 0; frameIndex < bootAnimationFrameCount; ++frameIndex) {
    if (millis() - startedAtMs >= kBootGifTimeoutMs) {
      Serial.println("boot animation timeout");
      break;
    }
    const BootAnimationFrame &frame = bootAnimationFrames[frameIndex];
    if (!applyBootAnimationFrame(frame)) {
      Serial.printf("boot animation frame %u invalid\r\n", frameIndex);
      break;
    }
    gfx->flush();
    targetElapsedMs += frame.durationMs;
    const uint32_t elapsedMs = millis() - startedAtMs;
    if (targetElapsedMs > elapsedMs) {
      delay(targetElapsedMs - elapsedMs);
    }
    yield();
  }
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
  bootResetReason = esp_reset_reason();
  if (bootGifGuard.magic != kBootGifGuardMagic) {
    bootGifGuard.magic = kBootGifGuardMagic;
    bootGifGuard.state = kBootGifGuardIdle;
  }
  if (bootGifGuard.state == kBootGifGuardPlaying || bootGifGuard.state == kBootGifGuardFailed) {
    bootGifGuard.state = kBootGifGuardFailed;
    bootGifSkippedAfterCrash = true;
  } else {
    bootGifGuard.state = kBootGifGuardPlaying;
  }

  Serial.begin(115200);
  delay(50);

  initBacklight();
  setBacklight(false);

  loadStoredConfig();
  loadDeviceSettings();

  // Keep the proven HID/CDC startup order from the stable non-animation build.
  Keyboard.begin();
  ConsumerControl.begin();
  USB.begin();

  initDisplay();
  initTouch();

  setBacklight(true);
  if (!bootGifSkippedAfterCrash) {
    playBootGif();
  }

  noteActivity();
  renderScreen();
  if (!bootGifSkippedAfterCrash) {
    bootGifGuard.state = kBootGifGuardComplete;
  }
  Serial.printf("boot ready reset_reason=%d gif_skipped_after_crash=%d guard_state=%lu\r\n",
                static_cast<int>(bootResetReason), bootGifSkippedAfterCrash,
                static_cast<unsigned long>(bootGifGuard.state));
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
