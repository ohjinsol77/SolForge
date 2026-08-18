# SolForge Touch Keyboard firmware

This Arduino sketch targets the ESP32-S3 based ESP32-4827S043C / JC4827W543C capacitive-touch display.

The default 480 × 272 screen mirrors the SolForge homepage preview:

- `TOUCH KEYBOARD` header and three page indicators
- 3 × 2 Home, Back, Menu, Favorites, Voice, and Power cards
- Three page tabs plus previous and next controls

Required Arduino packages:

- ESP32 platform 3.3.7
- U8g2 2.36.19

Compile with:

```powershell
arduino-cli compile --fqbn "esp32:esp32:esp32s3:USBMode=default,CDCOnBoot=cdc,UploadMode=cdc,FlashMode=qio,FlashSize=4M,PartitionScheme=huge_app,UploadSpeed=921600" firmware/SolForge_Touch_Keyboard
```

The generated bootloader, partition table, boot app, and app binaries are published under `assets/firmware/grand-koleos-touch-keyboard/` for the browser uploader.
