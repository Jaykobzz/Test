#!/usr/bin/env python3
"""
Bygger appens ikonfiler ur märket i render.py.

Tre filer, tre olika krav:

  icon.png        iOS och allmän ikon. Måste vara en fylld fyrkant UTAN egna
                  hörn, för iOS lägger på sin egen mask. Ritar man in radien
                  själv får man en rundad ikon inuti en rundad mask.

  adaptive-icon-foreground.png
                  Android. Genomskinlig, och motivet måste hålla sig innanför
                  den säkra cirkeln på ungefär 66 % av ytan, eftersom
                  tillverkare maskar den olika. Bakgrundsfärgen sätts i
                  app.json, inte här.

  splash-icon.png Startskärmen. Genomskinlig, för app.json målar redan granen
                  bakom.
"""

import pathlib
import re
import sys

import cairosvg

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import render  # noqa: E402

OUT = pathlib.Path(__file__).parents[2] / "mobile" / "assets"


def emit(name: str, px: int, *, bg: str | None, radius: float, content: float) -> None:
    """
    `radius` är plattans hörnradie som andel av bredden, 0 för fyrkant.
    `content` är hur stor andel av ytan märket upptar.
    `bg` None ger genomskinlig botten.
    """
    svg = render.mark(px, bg=render.PINE, fg=render.CREAM, ring=render.RUST)
    inner = svg.split(">", 1)[1].rsplit("</svg>", 1)[0]
    inner = re.sub(r"<rect[^>]*/>", "", inner, count=1)

    offset = px * (1 - content) / 2
    plate = (
        f'<rect width="{px}" height="{px}" rx="{radius*px}" fill="{bg}"/>'
        if bg else ""
    )

    doc = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{px}" height="{px}" '
        f'viewBox="0 0 {px} {px}">{plate}'
        f'<g transform="translate({offset},{offset}) scale({content})">{inner}</g>'
        f"</svg>"
    )
    cairosvg.svg2png(bytestring=doc.encode(), write_to=str(OUT / name),
                     output_width=px, output_height=px)
    print(f"  {name}  {px}x{px}")


if __name__ == "__main__":
    print("skriver till", OUT)
    emit("icon.png", 1024, bg=render.PINE, radius=0.0, content=0.84)
    emit("adaptive-icon-foreground.png", 1024, bg=None, radius=0.0, content=0.62)
    emit("splash-icon.png", 512, bg=None, radius=0.0, content=1.0)
