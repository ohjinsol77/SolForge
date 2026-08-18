#include <Arduino.h>
#include <U8g2lib.h>
#include "Arduino_GFX.h"
#include "Arduino_ESP32QSPI.h"
#include "Arduino_NV3041A.h"
#include "Arduino_Canvas.h"

#include "USB.h"
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
  gfx->setFont(u8g2_font_gulim14_t_korean2);
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
  static const uint16_t colors[6] = {
      rgb565(56, 189, 248), rgb565(251, 92, 124), rgb565(74, 222, 85),
      rgb565(250, 204, 21), rgb565(166, 109, 244), rgb565(34, 211, 238)};
  const uint16_t color = colors[index % 6];
  if (index == 0) {
    drawThickLine(cx - 10, cy, cx, cy - 9, 3, color);
    drawThickLine(cx, cy - 9, cx + 10, cy, 3, color);
    drawThickLine(cx - 7, cy - 2, cx - 7, cy + 9, 3, color);
    drawThickLine(cx + 7, cy - 2, cx + 7, cy + 9, 3, color);
    drawThickLine(cx - 7, cy + 9, cx + 7, cy + 9, 3, color);
  } else if (index == 1) {
    drawThickLine(cx + 10, cy + 8, cx + 8, cy - 2, 3, color);
    drawThickLine(cx + 8, cy - 2, cx - 6, cy - 4, 3, color);
    drawThickLine(cx - 6, cy - 4, cx, cy - 10, 3, color);
    drawThickLine(cx - 6, cy - 4, cx, cy + 2, 3, color);
  } else if (index == 2) {
    for (int8_t offset = -7; offset <= 7; offset += 7) {
      drawThickLine(cx - 10, cy + offset, cx + 10, cy + offset, 3, color);
    }
  } else if (index == 3) {
    const int8_t px[10] = {0, 3, 10, 5, 7, 0, -7, -5, -10, -3};
    const int8_t py[10] = {-11, -4, -3, 2, 9, 5, 9, 2, -3, -4};
    for (uint8_t point = 0; point < 10; ++point) {
      const uint8_t next = (point + 1) % 10;
      drawThickLine(cx + px[point], cy + py[point], cx + px[next], cy + py[next], 2, color);
    }
  } else if (index == 4) {
    gfx->drawRoundRect(cx - 5, cy - 10, 10, 16, 5, color);
    gfx->drawCircle(cx, cy - 1, 10, color);
    gfx->fillRect(cx - 3, cy - 12, 7, 6, fill);
    drawThickLine(cx, cy + 9, cx, cy + 13, 2, color);
    drawThickLine(cx - 5, cy + 13, cx + 5, cy + 13, 2, color);
  } else {
    gfx->drawCircle(cx, cy + 1, 10, color);
    gfx->fillRect(cx - 4, cy - 12, 9, 6, fill);
    drawThickLine(cx, cy - 12, cx, cy + 1, 3, color);
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
  drawNavigationBox(7, 74, 104, "1 페이지", currentPage == 0, false);
  drawNavigationBox(8, 188, 104, "2 페이지", currentPage == 1, false);
  drawNavigationBox(9, 302, 104, "3 페이지", currentPage == 2, false);
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
  const int16_t iconCy = by + 21;

  gfx->fillRoundRect(bx, by, w, h, 12, fill);
  gfx->drawRoundRect(bx, by, w, h, 12, buttonBorder(pressed, page));

  drawButtonIcon(page, index, iconCx, iconCy, accent, fill);
  drawCenteredText(bx + 8, by + 33, w - 16, 26, button.action.label, 1, textColor(), fill);
  drawCenteredText(bx + 8, by + 55, w - 16, 18, "미설정", 1, mutedColor(), fill);
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
        const MacroAction &action = kPageButtons[touchPage][releasedControl].action;
        sendMacro(action);
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

  Keyboard.begin();
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
