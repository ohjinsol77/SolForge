#!/usr/bin/env python3
"""Predecode a boot GIF into watchdog-safe RGB565 delta frames."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageSequence


FRAME_WIDTH = 480
FRAME_HEIGHT = 272
MAX_RUN = 0x3FFF
COMMAND_LITERAL = 0x4000
COMMAND_REPEAT = 0x8000


@dataclass(frozen=True)
class EncodedFrame:
    offset: int
    word_count: int
    duration_ms: int


def to_rgb565(pixel: tuple[int, int, int]) -> int:
    red, green, blue = pixel
    return ((red & 0xF8) << 8) | ((green & 0xFC) << 3) | (blue >> 3)


def repeated_run_length(current: list[int], previous: list[int], start: int) -> int:
    color = current[start]
    end = start + 1
    limit = min(len(current), start + MAX_RUN)
    while end < limit and current[end] != previous[end] and current[end] == color:
        end += 1
    return end - start


def encode_frame(current: list[int], previous: list[int]) -> list[int]:
    words: list[int] = []
    index = 0

    while index < len(current):
        if current[index] == previous[index]:
            end = index + 1
            limit = min(len(current), index + MAX_RUN)
            while end < limit and current[end] == previous[end]:
                end += 1
            words.append(end - index)
            index = end
            continue

        repeat_count = repeated_run_length(current, previous, index)
        if repeat_count >= 3:
            words.extend((COMMAND_REPEAT | repeat_count, current[index]))
            index += repeat_count
            continue

        start = index
        index += 1
        limit = min(len(current), start + MAX_RUN)
        while index < limit and current[index] != previous[index]:
            if repeated_run_length(current, previous, index) >= 3:
                break
            index += 1
        words.append(COMMAND_LITERAL | (index - start))
        words.extend(current[start:index])

    return words


def read_animation(gif_path: Path) -> tuple[list[int], list[EncodedFrame]]:
    image = Image.open(gif_path)
    if image.size != (FRAME_WIDTH, FRAME_HEIGHT):
        raise ValueError(
            f"boot GIF must be {FRAME_WIDTH}x{FRAME_HEIGHT}, got {image.width}x{image.height}"
        )

    pixel_count = FRAME_WIDTH * FRAME_HEIGHT
    previous = [0] * pixel_count
    animation_words: list[int] = []
    frames: list[EncodedFrame] = []

    for source_frame in ImageSequence.Iterator(image):
        rgb_frame = source_frame.convert("RGB")
        pixels = (
            rgb_frame.get_flattened_data()
            if hasattr(rgb_frame, "get_flattened_data")
            else rgb_frame.getdata()
        )
        current = [to_rgb565(pixel) for pixel in pixels]
        frame_words = encode_frame(current, previous)
        duration_ms = max(1, int(source_frame.info.get("duration", 100)))
        frames.append(EncodedFrame(len(animation_words), len(frame_words), duration_ms))
        animation_words.extend(frame_words)
        previous = current

    if not frames:
        raise ValueError("boot GIF contains no frames")
    return animation_words, frames


def write_header(output_dir: Path) -> None:
    (output_dir / "boot_animation_data.h").write_text(
        "#pragma once\n"
        "#include <stdint.h>\n\n"
        "struct BootAnimationFrame {\n"
        "  uint32_t offset;\n"
        "  uint32_t wordCount;\n"
        "  uint16_t durationMs;\n"
        "};\n\n"
        "extern const uint16_t bootAnimationData[];\n"
        "extern const BootAnimationFrame bootAnimationFrames[];\n"
        "extern const uint16_t bootAnimationFrameCount;\n",
        encoding="utf-8",
    )


def write_source(
    output_dir: Path,
    source_name: str,
    animation_words: list[int],
    frames: list[EncodedFrame],
) -> None:
    lines = [
        f"// Predecoded RGB565 delta animation from {source_name}",
        "#include <pgmspace.h>",
        '#include "boot_animation_data.h"',
        "",
        "const uint16_t bootAnimationData[] PROGMEM = {",
    ]
    for index in range(0, len(animation_words), 12):
        chunk = animation_words[index : index + 12]
        lines.append("  " + ", ".join(f"0x{word:04X}" for word in chunk) + ",")
    lines.extend(("};", "", "const BootAnimationFrame bootAnimationFrames[] = {"))
    for frame in frames:
        lines.append(f"  {{{frame.offset}u, {frame.word_count}u, {frame.duration_ms}u}},")
    lines.extend(
        (
            "};",
            f"const uint16_t bootAnimationFrameCount = {len(frames)}u;",
            "",
        )
    )
    (output_dir / "boot_animation_data.cpp").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("gif", type=Path, help="input 480x272 GIF file")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("firmware/SolForge_Touch_Keyboard"),
        help="firmware sketch directory (default: firmware/SolForge_Touch_Keyboard)",
    )
    args = parser.parse_args()

    animation_words, frames = read_animation(args.gif)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    write_header(args.output_dir)
    write_source(args.output_dir, args.gif.name, animation_words, frames)
    duration_ms = sum(frame.duration_ms for frame in frames)
    encoded_bytes = len(animation_words) * 2
    print(
        f"wrote boot_animation_data.h/.cpp "
        f"({encoded_bytes} bytes, {len(frames)} frames, {duration_ms} ms)"
    )


if __name__ == "__main__":
    main()
