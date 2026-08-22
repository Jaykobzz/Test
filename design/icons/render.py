#!/usr/bin/env python3
"""
Renderar ikonsetet till en kontaktkarta i tre storlekar.

Testet som räknas är den minsta: går ikonen inte att skilja från grannen vid
14 px är den fel, hur fin den än är i stort format.
"""

import json
import pathlib
import sys

import cairosvg

HERE = pathlib.Path(__file__).parent
ICONS = json.load(open(HERE / "icons.json"))

STROKE = 1.7
COLS = 6
CELL = 96
PAD = 14


def elements(spec, stroke_scale=1.0):
    out = []
    for el in spec:
        if "d" in el:
            out.append(f'<path d="{el["d"]}"/>')
        elif "c" in el:
            cx, cy, r = el["c"]
            out.append(f'<circle cx="{cx}" cy="{cy}" r="{r}"/>')
    return "".join(out)


def single(name, size, color="#14181D"):
    """En ikon som fristående SVG."""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" '
        f'width="{size}" height="{size}" fill="none" stroke="{color}" '
        f'stroke-width="{STROKE}" stroke-linecap="round" stroke-linejoin="round">'
        f'{elements(ICONS[name])}</svg>'
    )


def sheet(size, out_name, bg="#FFFFFF", fg="#14181D"):
    """Kontaktkarta: alla ikoner i rutnät, med namn under."""
    names = list(ICONS)
    rows = (len(names) + COLS - 1) // COLS
    w = COLS * CELL
    h = rows * (CELL + 18)

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}">',
        f'<rect width="{w}" height="{h}" fill="{bg}"/>',
    ]

    for i, name in enumerate(names):
        col, row = i % COLS, i // COLS
        x = col * CELL + (CELL - size) / 2
        y = row * (CELL + 18) + (CELL - size) / 2
        scale = size / 24

        parts.append(
            f'<g transform="translate({x},{y}) scale({scale})" fill="none" '
            f'stroke="{fg}" stroke-width="{STROKE}" stroke-linecap="round" '
            f'stroke-linejoin="round">{elements(ICONS[name])}</g>'
        )
        parts.append(
            f'<text x="{col * CELL + CELL / 2}" y="{row * (CELL + 18) + CELL + 4}" '
            f'font-family="monospace" font-size="10" fill="#8B8B8B" '
            f'text-anchor="middle">{name}</text>'
        )

    parts.append("</svg>")
    svg = "".join(parts)

    cairosvg.svg2png(
        bytestring=svg.encode(),
        write_to=str(HERE / out_name),
        output_width=w * 2,
        output_height=h * 2,
    )
    return HERE / out_name


if __name__ == "__main__":
    for size, name in [(48, "sheet-48.png"), (24, "sheet-24.png"), (14, "sheet-14.png")]:
        path = sheet(size, name)
        print(f"{path.name}  ({size} px)")
