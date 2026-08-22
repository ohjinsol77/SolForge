#!/usr/bin/env python3
"""Generate the complete Korean U8g2 font used by the touch keyboard firmware."""

from __future__ import annotations

import argparse
import subprocess
import tempfile
import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

try:
    from fontTools.ttLib import TTFont
except ImportError:
    TTFont = None


MODERN_HANGUL_RANGES = (
    (0x3130, 0x318F),  # Hangul Compatibility Jamo used by standalone keyboard input
    (0xAC00, 0xD7AF),  # All 11,172 modern Hangul syllables
)


def selected_codepoints() -> list[int]:
    points = list(range(0x20, 0x7F))
    for first, last in MODERN_HANGUL_RANGES:
        for codepoint in range(first, last + 1):
            if "HANGUL" in unicodedata.name(chr(codepoint), ""):
                points.append(codepoint)
    return sorted(set(points))


def glyph_bbox(font: ImageFont.FreeTypeFont, character: str) -> tuple[int, int, int, int]:
    box = font.getbbox(character, anchor="ls")
    return box if box else (0, 0, 0, 0)


def bitmap_rows(font: ImageFont.FreeTypeFont, character: str, box: tuple[int, int, int, int], threshold: int) -> list[str]:
    left, top, right, bottom = box
    width = max(0, right - left)
    height = max(0, bottom - top)
    if width == 0 or height == 0:
        return []

    image = Image.new("L", (width, height), 0)
    ImageDraw.Draw(image).text((-left, -top), character, font=font, fill=255, anchor="ls")
    byte_width = (width + 7) // 8
    rows: list[str] = []
    for y in range(height):
        row = bytearray(byte_width)
        for x in range(width):
            if image.getpixel((x, y)) >= threshold:
                row[x // 8] |= 0x80 >> (x % 8)
        rows.append(row.hex().upper())
    return rows


def write_bdf(
    font_path: Path,
    output_path: Path,
    pixel_size: int,
    threshold: int,
    weight: str,
) -> tuple[int, int]:
    points = selected_codepoints()
    missing: list[int] = []
    if TTFont is not None:
        cmap = TTFont(font_path, lazy=True).getBestCmap() or {}
        missing = [codepoint for codepoint in points if codepoint not in cmap]
        if missing:
            sample = ", ".join(f"U+{codepoint:04X}" for codepoint in missing[:12])
            raise RuntimeError(f"The source font is missing {len(missing)} requested glyphs: {sample}")

    font = ImageFont.truetype(str(font_path), pixel_size, layout_engine=ImageFont.Layout.BASIC)
    ascent, descent = font.getmetrics()
    boxes = {codepoint: glyph_bbox(font, chr(codepoint)) for codepoint in points}
    min_left = min(box[0] for box in boxes.values())
    max_right = max(box[2] for box in boxes.values())
    min_y = min(-box[3] for box in boxes.values())
    max_y = max(-box[1] for box in boxes.values())

    with output_path.open("w", encoding="ascii", newline="\n") as bdf:
        bdf.write("STARTFONT 2.1\n")
        bdf.write(
            f"FONT -SolForge-NanumGothicCoding-{weight}-R-Normal-Sans-"
            f"{pixel_size}-{pixel_size * 10}-72-72-M-{pixel_size * 10}-ISO10646-1\n"
        )
        bdf.write(f"SIZE {pixel_size} 72 72\n")
        bdf.write(f"FONTBOUNDINGBOX {max_right - min_left} {max_y - min_y} {min_left} {min_y}\n")
        bdf.write("STARTPROPERTIES 5\n")
        bdf.write(f"PIXEL_SIZE {pixel_size}\n")
        bdf.write(f"FONT_ASCENT {ascent}\n")
        bdf.write(f"FONT_DESCENT {descent}\n")
        bdf.write("DEFAULT_CHAR 63\n")
        bdf.write(
            f'COPYRIGHT "NAVER NanumGothicCoding 2.5 {weight}, SIL Open Font License 1.1"\n'
        )
        bdf.write("ENDPROPERTIES\n")
        bdf.write(f"CHARS {len(points)}\n")

        for codepoint in points:
            character = chr(codepoint)
            left, top, right, bottom = boxes[codepoint]
            width = max(0, right - left)
            height = max(0, bottom - top)
            advance = max(1, round(font.getlength(character)))
            bdf.write(f"STARTCHAR U+{codepoint:04X}\n")
            bdf.write(f"ENCODING {codepoint}\n")
            bdf.write(f"SWIDTH {round(advance * 1000 / pixel_size)} 0\n")
            bdf.write(f"DWIDTH {advance} 0\n")
            bdf.write(f"BBX {width} {height} {left} {-bottom}\n")
            bdf.write("BITMAP\n")
            for row in bitmap_rows(font, character, boxes[codepoint], threshold):
                bdf.write(f"{row}\n")
            bdf.write("ENDCHAR\n")
        bdf.write("ENDFONT\n")

    return len(points), len(missing)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--font", type=Path, required=True, help="NanumGothicCoding TTF from NAVER release 2.5")
    parser.add_argument("--bdfconv", type=Path, required=True, help="U8g2 bdfconv executable")
    parser.add_argument("--output", type=Path, required=True, help="Generated C/C++ header")
    parser.add_argument("--pixel-size", type=int, default=16)
    parser.add_argument("--threshold", type=int, default=112)
    parser.add_argument("--weight", choices=("Regular", "Bold"), default="Regular")
    args = parser.parse_args()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="solforge-korean-font-") as temp_dir:
        weight_slug = args.weight.lower()
        symbol = f"solforge_nanum_gothic_coding_{args.pixel_size}_{weight_slug}"
        bdf_path = Path(temp_dir) / f"nanum_gothic_coding_complete_{args.pixel_size}_{weight_slug}.bdf"
        generated_path = Path(temp_dir) / f"nanum_gothic_coding_complete_{args.pixel_size}_{weight_slug}.h"
        glyph_count, missing_count = write_bdf(
            args.font, bdf_path, args.pixel_size, args.threshold, args.weight
        )
        subprocess.run(
            [
                str(args.bdfconv),
                "-f",
                "1",
                "-b",
                "0",
                "-v",
                "-m",
                "32-65535",
                "-n",
                symbol,
                "-o",
                str(generated_path),
                str(bdf_path),
            ],
            check=True,
        )
        generated = generated_path.read_text(encoding="ascii")
        notice = (
            "#pragma once\n\n"
            f"// Generated from NAVER NanumGothicCoding 2.5 {args.weight}.\n"
            "// Copyright NAVER Corporation. Licensed under SIL OFL 1.1.\n"
            "// Includes all 11,172 modern Hangul syllables, all 94 assigned compatibility\n"
            "// Jamo code points used by standalone Korean input, plus printable ASCII.\n\n"
        )
        args.output.write_text(notice + generated, encoding="ascii", newline="\n")

    print(f"Generated {glyph_count} glyphs; missing source glyphs: {missing_count}; output: {args.output}")


if __name__ == "__main__":
    main()
