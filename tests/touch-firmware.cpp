#include <algorithm>
#include <cassert>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
using std::min;
using std::max;
template<class T, class L, class H> T constrain(T value, L low, H high) { return min((T)high, max((T)low, value)); }
struct Preferences {};
using esp_partition_mmap_handle_t = uint32_t;
struct esp_partition_t { size_t size; } partition;
constexpr int ESP_PARTITION_TYPE_DATA = 1, ESP_PARTITION_SUBTYPE_DATA_SPIFFS = 2;
constexpr int ESP_PARTITION_MMAP_DATA = 0, ESP_OK = 0;
std::vector<uint8_t> flash;
const esp_partition_t *esp_partition_find_first(int, int, const char *) { return &partition; }
int esp_partition_read(const esp_partition_t *, size_t offset, void *data, size_t length) {
  if (offset + length > flash.size()) return -1;
  std::memcpy(data, flash.data() + offset, length); return ESP_OK;
}
int esp_partition_mmap(const esp_partition_t *, size_t offset, size_t length, int, const void **data, uint32_t *) {
  if (offset + length > flash.size()) return -1;
  *data = flash.data() + offset; return ESP_OK;
}
void esp_partition_munmap(uint32_t) {}
struct { void println(const char *) {} } Serial;
uint32_t clockMs = 1000;
uint32_t millis() { return clockMs; }
struct Hid {
  std::vector<uint16_t> sent;
  bool down = false;
  void press(uint16_t code) { sent.push_back(code); down = true; }
  void releaseAll() { down = false; }
  void release() { down = false; }
} Keyboard, ConsumerControl;
struct { bool freshData = true; int touches = 0; bool isLargeDetect = false; } touch;
bool samplePressed = false;
int16_t sampleX = 80, sampleY = 55;
bool readTouchPoint(int16_t &x, int16_t &y) { x = sampleX; y = sampleY; return samplePressed; }
static void wakeDisplay();
static void enterSettings();
static void handleSettingsTouchFrame(bool, int16_t, int16_t) {}
#include "firmware-under-test.h"
static void wakeDisplay() { backlightOn = true; noteActivity(); }
static void enterSettings() { settingsScreen = SettingsScreen::Menu; touchHeld = false; }
InteractionConfig configuredActions{};

void reset() {
  clockMs = 1000;
  touch = {true, 0, false};
  samplePressed = false;
  sampleX = 80; sampleY = 55;
  currentPage = touchPage = 0;
  backlightOn = true;
  touchHeld = suppressUntilRelease = swipeDetected = touchMovedTooFar = holdExecuted = false;
  slideAnimating = hidActive = false;
  slideOffset = slideTarget = slideFrom = 0;
  pressedButton = touchStartButton = feedbackButton = -1;
  settingsScreen = SettingsScreen::Off;
  settingsPressActive = false;
  Keyboard = {}; ConsumerControl = {};
  storedConfig = {};
  storedConfigValid = interactionConfigValid = true;
  configuredActions = {};
  interactionConfig = &configuredActions;
  storedConfig.pages[0].buttons[0].keyCount = 1;
  storedConfig.pages[0].buttons[0].keys[0] = 'a';
}
void frame(uint32_t after, bool down, int16_t x = 80, int16_t y = 55, bool fresh = true) {
  clockMs += after;
  samplePressed = down; sampleX = x; sampleY = y;
  touch.freshData = fresh; touch.touches = down ? 1 : 0;
  advanceAnimations(); handleTouchFrame();
}

int main(int argc, char **argv) {
  // Exercise real bitmap clipping at every subpixel-alignment boundary and at 180 degrees.
  std::vector<uint16_t> pixels(128 * 2);
  for (size_t i = 0; i < pixels.size(); ++i) pixels[i] = (uint16_t)(i + 1);
  for (int rotation : {0, 2}) for (int x = -140; x < 490; ++x) {
    std::vector<uint16_t> actual(480 * 272), expected(actual.size());
    if (rotation == 0) gfx_draw_bitmap_to_framebuffer(pixels.data(), 128, 2, actual.data(), x, 50, 480, 272);
    else gfx_draw_bitmap_to_framebuffer_rotate_2(pixels.data(), 128, 2, actual.data(), x, 50, 480, 272);
    for (int dy = 0; dy < 2; ++dy) for (int dx = 0; dx < 128; ++dx) {
      const int px = x + dx, py = 50 + dy;
      if (px < 0 || px >= 480) continue;
      const int index = rotation == 0 ? py * 480 + px : (271 - py) * 480 + 479 - px;
      expected[index] = pixels[dy * 128 + dx];
    }
    assert(actual == expected);
  }
  reset();
  assert(buttonHeight() == 94 && hitTestButton(0, 80, 105) == 0);
  frame(0, true); assert(pressedButton == 0 && Keyboard.sent.empty());
  frame(30, false); assert(Keyboard.sent == std::vector<uint16_t>{'a'});
  frame(21, false); assert(!Keyboard.down);
  frame(5, true); frame(25, false); assert(Keyboard.sent.size() == 2); // no 350ms lockout

  reset(); frame(0, true); frame(25, true, 80, 100); frame(20, false);
  assert(currentPage == 0 && !slideAnimating && Keyboard.sent.empty()); // vertical cancellation
  reset(); frame(0, true, 240, 55); frame(100, true, 150, 55);
  assert(slideOffset == -90 && currentPage == 0 && Keyboard.sent.empty());
  frame(10, false, 150, 55); assert(slideAnimating && currentPage == 0);
  frame(90, false); assert(slideOffset < -90);
  frame(100, false); assert(currentPage == 1 && slideOffset == 0 && !slideAnimating);

  reset(); frame(0, true); frame(100, true, 100, 55); frame(10, false, 100, 55);
  frame(200, false); assert(currentPage == 0 && slideOffset == 0 && Keyboard.sent.empty());
  reset(); frame(0, true, 240, 55); frame(300, true, 222, 55); frame(10, false, 222, 55);
  frame(200, false); assert(currentPage == 0 && Keyboard.sent.empty()); // short drag snaps back

  reset(); configuredActions.actions[0].mode = 1;
  configuredActions.actions[0].keyCount = 1; configuredActions.actions[0].keys[0] = 'b';
  frame(0, true); frame(590, true); assert(Keyboard.sent.empty() && holdProgress > 90);
  frame(11, true); assert(Keyboard.sent == std::vector<uint16_t>{'b'});
  frame(200, true); frame(20, false); assert(Keyboard.sent.size() == 1);
  reset(); configuredActions.actions[0].mode = 1;
  frame(0, true); frame(500, true, 80, 120); frame(200, true, 80, 120); frame(20, false);
  assert(Keyboard.sent.empty());

  reset(); configuredActions.actions[0].mode = 2;
  storedConfig.pages[0].buttons[0].keyCount = 0;
  storedConfig.pages[0].buttons[0].consumerUsage = 0xE9;
  frame(0, true); frame(601, true); frame(151, true);
  assert(ConsumerControl.sent == std::vector<uint16_t>({0xE9, 0xE9}));
  frame(30, false); frame(500, false); assert(ConsumerControl.sent.size() == 2 && !ConsumerControl.down);

  reset(); backlightOn = false;
  frame(0, true); frame(800, true); frame(20, false); assert(Keyboard.sent.empty());
  frame(20, true); frame(20, false); assert(Keyboard.sent.size() == 1);
  reset(); frame(0, true); frame(10, false, 80, 55, false);
  assert(touchHeld && Keyboard.sent.empty()); // missing frame is not an immediate release
  frame(10, true); frame(10, false); assert(Keyboard.sent.size() == 1);
  reset(); frame(0, true); touch.touches = 2; handleTouchFrame();
  frame(20, false); assert(Keyboard.sent.empty()); // multi-touch cancels
  reset(); currentPage = 2; frame(0, true, 395, 160); frame(20, false, 395, 160);
  assert(settingsScreen == SettingsScreen::Menu && Keyboard.sent.empty());
  reset(); clockMs = UINT32_MAX - 10; frame(0, true); frame(5, false);
  frame(25, false); assert(!Keyboard.down); // wrap-safe HID release

  if (argc > 1) {
    std::ifstream file(argv[1], std::ios::binary);
    flash.assign(std::istreambuf_iterator<char>(file), {});
    assert(flash.size() == 45056);
    partition.size = flash.size();
    storedConfigValid = interactionConfigValid = false;
    loadStoredConfig();
    assert(storedConfigValid && interactionConfigValid && interactionConfig->actions[0].mode == 1);
    flash[1500] ^= 1; // damaged text must invalidate the entire extension
    storedConfigValid = interactionConfigValid = false;
    loadStoredConfig(); assert(storedConfigValid && !interactionConfigValid);
    flash.resize(4096); partition.size = flash.size(); interactionConfig = nullptr;
    storedConfigValid = interactionConfigValid = false;
    loadStoredConfig(); assert(storedConfigValid && !interactionConfigValid); // v2 fallback
    flash[60] ^= 1;
    storedConfigValid = false; loadStoredConfig(); assert(!storedConfigValid);
  }
  std::cout << "Touch firmware: gesture, hold, repeat, wake, settings, rollover and config checks passed\n";
}
