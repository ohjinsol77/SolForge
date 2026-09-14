"""Run the actual firmware input/config functions against a deterministic host clock.

Requires Python 3 and g++; optionally pass a settings-*.bin from the browser tests.
Display, flash and USB are mocked; this is not a hardware performance test.
"""
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / "firmware/SolForge_Touch_Keyboard/SolForge_Touch_Keyboard.ino").read_text()


def section(start, end):
    return source[source.index(start):source.index(end, source.index(start))]


def function(name, text=source):
    match = re.search(r"^(?:static )?[^\n]+\b" + name + r"\([^)]*\)\s*\{", text, re.M)
    if not match:
        raise RuntimeError(f"Missing firmware function: {name}")
    start = text.index("{", match.start())
    depth = 1
    end = start + 1
    while depth:
        depth += (text[end] == "{") - (text[end] == "}")
        end += 1
    return text[match.start():end] + "\n"


names = ["fnv1a32", "loadStoredConfig", "isSettingsButton", "buttonWidth", "buttonHeight",
         "buttonX", "buttonY", "buttonIsVisible", "buttonSpanWidth", "buttonSpanHeight",
         "hitTestNavigation", "hitTestButton", "noteActivity", "releaseHid",
         "sendConfiguredMacro", "startSlide", "advanceAnimations", "handleTouchFrame"]

with tempfile.TemporaryDirectory(prefix="solforge-touch-test-") as directory:
    temporary = Path(directory)
    generated = section("static constexpr uint16_t kDefaultScreenWidth", "struct BootGifGuard")
    generated += section("static constexpr uint32_t kConfigMagic", "static const char *uiText")
    generated += "\n".join(function(name) for name in names)
    bitmap_source = (ROOT / "firmware/SolForge_Touch_Keyboard/Arduino_G.cpp").read_text()
    generated += function("gfx_draw_bitmap_to_framebuffer", bitmap_source)
    generated += function("gfx_draw_bitmap_to_framebuffer_rotate_2", bitmap_source)
    (temporary / "firmware-under-test.h").write_text(generated)
    executable = temporary / "touch-test"
    subprocess.run(["g++", "-std=c++17", "-O1", "-g", "-fsanitize=address,undefined",
                    "-I", str(temporary), str(ROOT / "tests/touch-firmware.cpp"),
                    "-o", str(executable)], check=True)
    subprocess.run([str(executable), *sys.argv[1:]], check=True)
