#!/usr/bin/env python3
"""
Genererar klientens ikonfil ur icons.json.

icons.json är enda källan. Ändra en bana där, kör det här skriptet, och både
kontaktkartan och appen följer med. Redigera aldrig den genererade filen för
hand — nästa körning skriver över den.
"""

import json
import pathlib

HERE = pathlib.Path(__file__).parent
OUT = HERE / "../../mobile/src/components/icons/paths.ts"

ICONS = json.load(open(HERE / "icons.json"))

lines = [
    "/**",
    " * GENERERAD FIL — redigera inte för hand.",
    " *",
    " * Källa: design/icons/icons.json",
    " * Kör:   python3 design/icons/generate.py",
    " *",
    " * Se design/icons/SPEC.md för rutnät, streckvikt och formspråk.",
    " */",
    "",
    "export interface IconShape {",
    "  /** SVG-bana på ett 24×24-rutnät. */",
    "  d?: string;",
    "  /** Cirkel som [cx, cy, r]. Används där en bana bara skulle bli krångligare. */",
    "  c?: readonly [number, number, number];",
    "}",
    "",
    "const PATHS = {",
]

for name, shapes in ICONS.items():
    parts = []
    for shape in shapes:
        if "d" in shape:
            parts.append(f'{{ d: "{shape["d"]}" }}')
        else:
            cx, cy, r = shape["c"]
            parts.append(f"{{ c: [{cx}, {cy}, {r}] }}")
    body = ",\n    ".join(parts)
    lines.append(f"  {name}: [\n    {body},\n  ],")

lines += [
    "} satisfies Record<string, readonly IconShape[]>;",
    "",
    "export type IconName = keyof typeof PATHS;",
    "",
    "// Nycklarna behåller sina literaltyper; värdena vidgas till IconShape så",
    "// att komponenten kan läsa både d och c utan att tvinga fram typvakter.",
    "export const ICON_PATHS: Record<IconName, readonly IconShape[]> = PATHS;",
    "",
    "export const ICON_NAMES = Object.keys(PATHS) as IconName[];",
    "",
]

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text("\n".join(lines))
print(f"{OUT.resolve()}  ({len(ICONS)} ikoner)")
