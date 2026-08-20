# SolForge Touch Keyboard firmware

This Arduino sketch targets the ESP32-S3 based ESP32-4827S043C / JC4827W543C capacitive-touch display.

On power-up the firmware plays an embedded boot animation (default: `grand_koleos_480x272_balanced.gif`, 480 × 272) instead of the old panel-check splash, then shows the touch UI:

- `TOUCH KEYBOARD` header and three page indicators
- 3 × 2 Home, Back, Menu, Favorites, Voice, and Power cards
- Page tabs at the bottom switch pages (no prev/next buttons)

Required Arduino packages:

- ESP32 platform 3.3.7
- U8g2 2.36.19
- AnimatedGIF 2.2.3 (vendored under `libraries/`, no manual install needed)

The display labels use a firmware-embedded 16 px bitmap generated from NAVER
NanumGothicCoding 2.5 Regular. It contains all 11,172 modern Hangul syllables,
all 94 assigned Hangul Compatibility Jamo characters (including standalone
inputs such as `ㅅㄷㄴㅅ`), and printable ASCII. The source font is distributed
by NAVER under the SIL Open Font License 1.1.

Regenerate the header with `scripts/generate-touch-keyboard-font.py` and the
official U8g2 `bdfconv` tool when the source font or raster settings change.

Regenerate the boot animation with `scripts/generate-touch-keyboard-boot-gif.py`
when the source GIF changes; the converter emits `boot_gif_data.cpp`/`.h`.

Compile with:

```powershell
arduino-cli compile --fqbn "esp32:esp32:esp32s3:USBMode=default,CDCOnBoot=cdc,UploadMode=cdc,FlashMode=dio,FlashSize=4M,PartitionScheme=huge_app,UploadSpeed=921600" --build-property compiler.cpp.extra_flags=-DU8G2_FONT_SUPPORT --libraries firmware/SolForge_Touch_Keyboard/libraries firmware/SolForge_Touch_Keyboard
```

The generated bootloader, partition table, boot app, and app binaries are published under `assets/firmware/grand-koleos-touch-keyboard/` for the browser uploader.

## Device settings

The last button on the third page is the fixed Settings button. Tapping it opens a settings screen with back and home navigation:

- brightness: 10 PWM backlight levels, applied immediately;
- auto screen off: 10s, 30s, 1m, 3m, 5m, 10m, or off; the first touch wakes the backlight and restarts the timer;
- reboot: confirmation prompt before `ESP.restart()`.

Brightness and auto-off values are stored in NVS (namespace `gk`) and survive reboots. The firmware never sends HID key reports for the fixed Settings button.

## Browser-generated settings

The SolForge page generates a 4 KB settings image and writes it to the start of the `spiffs` partition at `0x310000`. The packed settings contain:

- three UTF-8 page names;
- the display label, selected icon ID, and keyboard codes for all 18 buttons;
- one optional consumer-control usage per button for mute and volume controls;
- an FNV-1a checksum checked by the firmware during startup.

If the settings block is missing or invalid, the firmware uses its built-in page names and empty shortcuts.
