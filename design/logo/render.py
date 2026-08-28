#!/usr/bin/env python3
"""
Appmärket för Haka på, i varianter och storlekar.

Testet är den minsta rutan. Ett märke som bara håller på 1024 px är en affisch,
inte ett appmärke.

Ringen på Å ritas som en egen cirkel i stället för att sättas som tecken. Två
skäl: den går då att färga för sig, och den är det enda runda i ett annars
kantigt märke. Positionen är uppmätt ur typsnittet, inte gissad. Metoden var
att rendera "PÅ" och "PA" med allt annat identiskt och jämföra bilderna, för
pixlarna som skiljer ÄR ringen.
"""

import pathlib

import cairosvg

HERE = pathlib.Path(__file__).parent

INK = "#14201B"
CREAM = "#F7F5EF"
PINE = "#15604B"
MINT = "#5FBF9E"
AMBER = "#B3541E"   # Bryggans accent
RUST = "#C86A2E"    # ljusare, för mörk botten

# Uppmätt ur Unbounded 800, i enheter av teckengraden. Se filhuvudet.
RING_DX, RING_DY, RING_R, RING_W = 0.3587, 0.9239, 0.152, 0.085

SIZES = [180, 96, 48, 28]


def mark(px: int, bg: str, fg: str, ring: str, pa_scale: float = 1.0) -> str:
    """Ett märke. `ring` är ringens färg, `pa_scale` hur mycket större PÅ är."""
    s = px / 180
    haka_size = 46 * s
    pa_size = haka_size * pa_scale
    cx = px / 2
    haka_base = 78 * s
    pa_base = haka_base + 34 * s + 0.52 * pa_size

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{px}" height="{px}" '
        f'viewBox="0 0 {px} {px}">'
        f'<rect width="{px}" height="{px}" rx="{40*s}" fill="{bg}"/>'
        f'<text x="{cx}" y="{haka_base}" font-family="Unbounded" font-weight="800" '
        f'font-size="{haka_size}" fill="{fg}" text-anchor="middle" '
        f'letter-spacing="{-1*s}">HAKA</text>'
        # PA sätts utan ring; ringen ritas nedan så att den kan färgas för sig.
        f'<text x="{cx}" y="{pa_base}" font-family="Unbounded" font-weight="800" '
        f'font-size="{pa_size}" fill="{fg}" text-anchor="middle" '
        f'letter-spacing="{-1*s*pa_scale}">PA</text>'
        f'<circle cx="{cx + RING_DX*pa_size}" cy="{pa_base - RING_DY*pa_size}" '
        f'r="{RING_R*pa_size}" fill="none" stroke="{ring}" '
        f'stroke-width="{RING_W*pa_size}"/>'
        f'</svg>'
    )


VARIANTS = {
    "gron platta, cremering": dict(bg=PINE, fg=CREAM, ring=CREAM),
    "gron platta, rostring": dict(bg=PINE, fg=CREAM, ring=RUST),
    "mork, rostring": dict(bg=INK, fg=CREAM, ring=RUST),
    "mork, mintring": dict(bg=INK, fg=CREAM, ring=MINT),
    "cremeplatta, gron text": dict(bg=CREAM, fg=PINE, ring=AMBER),
}


def sheet(out_name: str = "varianter.png") -> None:
    pad, gap, label_h = 26, 22, 26
    col_w = max(SIZES) + gap
    row_h = max(SIZES) + label_h + gap
    w = pad * 2 + col_w * len(SIZES)
    h = pad * 2 + row_h * len(VARIANTS)

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}">',
        f'<rect width="{w}" height="{h}" fill="#DFDBD2"/>',
    ]

    for row, (name, kw) in enumerate(VARIANTS.items()):
        y0 = pad + row * row_h
        parts.append(
            f'<text x="{pad}" y="{y0+12}" font-family="monospace" font-size="12" '
            f'fill="#56635C">{name}</text>'
        )
        for col, size in enumerate(SIZES):
            x = pad + col * col_w
            y = y0 + label_h + (max(SIZES) - size) / 2
            inner = mark(size, **kw).split(">", 1)[1].rsplit("</svg>", 1)[0]
            parts.append(f'<g transform="translate({x},{y})">{inner}</g>')

    parts.append("</svg>")
    cairosvg.svg2png(
        bytestring="".join(parts).encode(),
        write_to=str(HERE / out_name),
        output_width=w * 2,
        output_height=h * 2,
    )
    print(out_name)


if __name__ == "__main__":
    sheet()
