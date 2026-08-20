#!/usr/bin/env python3
"""Embed a boot splash GIF into the touch keyboard firmware as C arrays."""

from __future__ import annotations

import argparse
from pathlib import Path


def gif_info(data: bytes) -> tuple[int, int, int]:
    if len(data) < 6 or (data[:6] != b"GIF89a" and data[:6] != b"GIF87a"):
        raise ValueError("not a GIF file")
    width = data[6] | (data[7] << 8)
    height = data[8] | (data[9] << 8)

    # Walk the block structure so 0x2C image separators embedded in LZW
    # sub-blocks are not miscounted as frames.
    pos = 6
    pos += 7  # logical screen descriptor
    flags = data[10]
    if flags & 0x80:  # global color table follows
        pos += 3 * (1 << ((flags & 0x07) + 1))

    frames = 0
    while pos < len(data):
        marker = data[pos]
        if marker == 0x3B:  # trailer
            break
        if marker == 0x2C:  # image descriptor
            frames += 1
            pos += 10
            image_flags = data[pos - 1]
            if image_flags & 0x80:  # local color table
                pos += 3 * (1 << ((image_flags & 0x07) + 1))
            pos += 1  # LZW minimum code size
            pos = skip_sub_blocks(data, pos)
        elif marker == 0x21:  # extension
            pos += 2  # extension introducer + label
            pos = skip_sub_blocks(data, pos)
        else:
            raise ValueError(f"unexpected GIF marker 0x{marker:02X} at {pos}")
    return width, height, frames


def skip_sub_blocks(data: bytes, pos: int) -> int:
    while pos < len(data):
        size = data[pos]
        pos += 1 + size
        if size == 0:
            break
    return pos


def write_header(output_dir: Path, source_name: str, width: int, height: int, frames: int) -> None:
    (output_dir / "boot_gif_data.h").write_text(
        "#pragma once\n"
        "#include <stdint.h>\n"
        "extern const unsigned char bootGifData[];\n"
        "extern const uint32_t bootGifDataSize;\n",
        encoding="utf-8",
    )


def write_source(output_dir: Path, source_name: str, data: bytes, width: int, height: int, frames: int) -> None:
    lines = [
        f"// Boot splash GIF data: {source_name} ({width}x{height}, {frames} frames)",
        '#include "boot_gif_data.h"',
        "const unsigned char bootGifData[] = {",
    ]
    for index in range(0, len(data), 16):
        chunk = data[index : index + 16]
        lines.append(",".join(f"0x{byte:02X}" for byte in chunk) + ",")
    lines.append("};")
    lines.append(f"const uint32_t bootGifDataSize = {len(data)};")
    lines.append("")
    (output_dir / "boot_gif_data.cpp").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("gif", type=Path, help="input GIF file")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("firmware/SolForge_Touch_Keyboard"),
        help="firmware sketch directory (default: firmware/SolForge_Touch_Keyboard)",
    )
    args = parser.parse_args()

    data = args.gif.read_bytes()
    width, height, frames = gif_info(data)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    write_header(args.output_dir, args.gif.name, width, height, frames)
    write_source(args.output_dir, args.gif.name, data, width, height, frames)
    print(f"wrote boot_gif_data.h/.cpp ({len(data)} bytes, {width}x{height}, {frames} frames)")


if __name__ == "__main__":
    main()
