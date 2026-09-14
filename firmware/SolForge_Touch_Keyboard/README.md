# SolForge Touch Keyboard firmware

This Arduino sketch targets the ESP32-S3 based ESP32-4827S043C / JC4827W543C capacitive-touch display.

On power-up the firmware initializes the display and touch controller, then shows the touch UI:

- 3 × 2 cards, each 143 × 94 pixels, with 14 px top spacing
- Fixed bottom page tabs; horizontal dragging moves only the button area
- Immediate press feedback, 120 ms release feedback, 180 ms eased page settling
- Optional 600 ms secondary action, or 150 ms repeat for a volume-only tap
- Vertical movement, multiple contacts, and moving off a button cancel the tap
- The first touch after screen-off only wakes the screen

Required Arduino packages:

- ESP32 platform 3.3.7
- U8g2 2.36.19
- AnimatedGIF 2.2.3 (vendored under `libraries/`, no manual install needed)

New browser settings contain 18 px antialiased button/page labels and tintable
32 px icon masks. The masks use 4-bit alpha, stay in memory-mapped flash, and
blend with the active theme at runtime. Color app logos retain their embedded
RGB565 assets. Long names use ellipsis rather than shrinking below legible size.
Labels and icons are generated only for the configured buttons; a larger full
CJK font is not needed. The browser uses system fonts, so exact glyph shapes
can vary by the computer used to configure the device.

Legacy settings and onboard settings screens use a firmware-embedded 16 px bitmap generated from NAVER
NanumGothicCoding 2.5 Bold for cleaner strokes on the 480 × 272 panel. It
contains all 11,172 modern Hangul syllables,
all 94 assigned Hangul Compatibility Jamo characters (including standalone
inputs such as `ㅅㄷㄴㅅ`), and printable ASCII. The source font is distributed
by NAVER under the SIL Open Font License 1.1.

Regenerate the header with `scripts/generate-touch-keyboard-font.py` and the
official U8g2 `bdfconv` tool when the source font or raster settings change.


Compile with:

```powershell
arduino-cli compile --fqbn "esp32:esp32:esp32s3:USBMode=default,CDCOnBoot=cdc,UploadMode=cdc,FlashMode=dio,FlashSize=4M,PartitionScheme=huge_app,UploadSpeed=921600" --build-property compiler.cpp.extra_flags=-DU8G2_FONT_SUPPORT --libraries firmware/SolForge_Touch_Keyboard/libraries firmware/SolForge_Touch_Keyboard
```

The generated bootloader, partition table, boot app, and app binaries are published under `assets/firmware/grand-koleos-touch-keyboard/` for the browser uploader.

## Device settings

The last button on the third page is the fixed Settings button. Tapping it opens a settings screen with back and home navigation:

- brightness: 10 PWM backlight levels, applied immediately;
- button theme: Classic Navy, Soft Light, or Obsidian Glow, applied immediately;
- auto screen off: 10s, 30s, 1m, 3m, 5m, 10m, or off; the first touch wakes the backlight and restarts the timer;
- screen orientation: normal or 180-degree rotation, with matching touch-coordinate rotation;
- reboot: confirmation prompt before `ESP.restart()`.

Brightness, button theme, auto-off, and screen-orientation values are stored in NVS (namespace `gk`) and survive reboots. The firmware never sends HID key reports for the fixed Settings button.

## Browser-generated settings

The SolForge page generates a 44 KiB settings image and writes it to the start of the `spiffs` partition at `0x310000`. The original 1,216-byte v2 block remains compatible with existing settings and contains:

- three UTF-8 page names;
- the display label, selected icon ID, and keyboard codes for all 18 buttons;
- one optional consumer-control usage per button for mute and volume controls;
- an FNV-1a checksum checked by the firmware during startup.

If the settings block is missing or invalid, the firmware uses its built-in page names and empty shortcuts.

At offset 1,216, the optional interaction block contains a 16-byte header,
18 × 12-byte hold actions, 21 × 1,536-byte label masks and 18 × 512-byte icon
masks. Its magic is `0x31584B47`, version is 1, and payload size is 41,688.
The checksum is the XOR of FNV-1a over the complete original v2 block and
FNV-1a over the interaction block from offset 12 to its end (language + payload).
This binds names, shortcuts and images together. Invalid extensions fall back
to tap-only v2 behavior. The language flag selects Korean (0) or English (1)
for onboard settings. Fixed Settings never sends HID reports.

The extension ends at byte 42,920; the remaining settings image is zero padding.
No filesystem is mounted over this raw partition. The browser rejects older
firmware manifests that do not advertise interaction version 1 and size 45,056.
HID reports are released on a non-blocking timer; there is no global post-tap
cooldown. This device sends commands, not confirmation of vehicle state.

After compiling with `--build-path /tmp/solforge-touch-build`, refresh the shipped
binaries and manifest together:

```sh
python3 scripts/package-touch-keyboard.py --build-dir /tmp/solforge-touch-build \
  --boot-app /path/to/esp32/tools/partitions/boot_app0.bin \
  --version 2026.09.14-smooth-touch-actions
```

Verification (serve `dist` at localhost:4173 for browser tests):

```sh
npm run build
npm run check
npx playwright test tests/touch-keyboard.spec.js --workers=1
python3 tests/check_touch_firmware.py
# Optional: also validate an encoder fixture produced by the browser tests.
python3 tests/check_touch_firmware.py /path/to/settings-ko.bin
```

The host test runs the sketch's actual input and config functions with mocked
USB, flash and clock, under address/undefined-behavior sanitizers. Frame rate,
physical touch timing and target vehicle HID compatibility still need a board.
