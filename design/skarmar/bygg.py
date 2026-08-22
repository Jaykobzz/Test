#!/usr/bin/env python3
"""
Renderar appens skärmar som bilder.

Skärmarna är byggda mot mobile/src/theme.ts: samma hexkoder, radier, typskala
och avstånd som appen faktiskt använder. De riktiga seedbilderna bäddas in, så
det som visas är det man ser i appen och inte en teckning av det.

Ordningen är den en användare möter dem i, inte den de blev byggda i.
"""

import base64
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).parent
SEED = HERE.parents[1] / "mobile" / "assets" / "seed"
OUT = HERE / "png"

# Tokens ur mobile/src/theme.ts. Ändras de där ska de ändras här.
C = {
    "bg": "#F7F5EF", "surface": "#FFFFFF", "surfaceAlt": "#EEEAE0",
    "border": "#DFD9CB", "text": "#14201B", "muted": "#56635C",
    "faint": "#83908A", "primary": "#15604B", "primarySoft": "#D9EBE2",
    "onPrimarySoft": "#0D4A39", "onPrimary": "#FFFFFF", "accent": "#B3541E",
    "overlay": "rgba(12,14,18,.72)",
}


def img(name: str) -> str:
    """Bäddar in en seedbild som data-URI."""
    path = SEED / f"{name}.jpg"
    if not path.exists():
        raise SystemExit(f"saknar bild: {path}")
    return "data:image/jpeg;base64," + base64.b64encode(path.read_bytes()).decode()


MODULES = HERE.parents[1] / "mobile" / "node_modules" / "@expo-google-fonts"

# Vikterna appen faktiskt laddar, se mobile/src/theme.ts.
FACES = [
    ("Unbounded", 600, "unbounded/600SemiBold/Unbounded_600SemiBold.ttf"),
    ("Unbounded", 700, "unbounded/700Bold/Unbounded_700Bold.ttf"),
    ("Hanken Grotesk", 400, "hanken-grotesk/400Regular/HankenGrotesk_400Regular.ttf"),
    ("Hanken Grotesk", 600, "hanken-grotesk/600SemiBold/HankenGrotesk_600SemiBold.ttf"),
    ("Hanken Grotesk", 700, "hanken-grotesk/700Bold/HankenGrotesk_700Bold.ttf"),
]


def fontface() -> str:
    """
    Bäddar in typsnittsfilerna i stället för att hämta dem från Google Fonts.

    Skälet är inte bara att nätet kan vara stängt. Det är att dessa ÄR filerna
    appen laddar, så bilden visar samma bokstavsformer som telefonen ritar och
    inte en näraliggande webbversion.
    """
    out = []
    for family, weight, rel in FACES:
        path = MODULES / rel
        if not path.exists():
            raise SystemExit(f"saknar typsnitt: {path}")
        data = base64.b64encode(path.read_bytes()).decode()
        out.append(
            f"@font-face{{font-family:'{family}';font-weight:{weight};"
            f"font-style:normal;font-display:block;"
            f"src:url(data:font/ttf;base64,{data}) format('truetype');}}")
    return "".join(out)


HEAD = """
<style>%(faces)s</style>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; }
  .scr { width: 390px; height: 844px; overflow: hidden; position: relative;
         background: %(bg)s; color: %(text)s;
         font-family: "Hanken Grotesk", system-ui, sans-serif;
         font-size: 15px; line-height: 22px; }
  .disp { font-family: "Unbounded", system-ui, sans-serif; font-weight: 600; }
  .pad { padding: 0 20px; }
  .card { background: %(surface)s; border-radius: 18px; overflow: hidden;
          box-shadow: 0 1px 2px rgba(20,32,27,.05), 0 8px 20px rgba(20,32,27,.06); }
  .meta { font-size: 13px; line-height: 18px; color: %(muted)s; }
  .faint { font-size: 13px; line-height: 18px; color: %(faint)s; }
  .lbl { font-size: 13px; line-height: 18px; font-weight: 600; color: %(muted)s; }
  .micro { font-size: 11px; line-height: 15px; font-weight: 700;
           letter-spacing: .66px; text-transform: uppercase; }
  .chip { border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 600;
          background: %(surfaceAlt)s; color: %(muted)s;
          display: inline-flex; align-items: center; gap: 6px; }
  .chip.on { background: %(primary)s; color: #fff; }
  .chip.acc { background: %(primarySoft)s; color: %(accent)s; }
  .btn { background: %(primary)s; color: #fff; border-radius: 999px; padding: 15px;
         text-align: center; font-size: 15px; font-weight: 700;
         display: flex; align-items: center; justify-content: center; gap: 8px; }
  .btn.ghost { background: transparent; color: %(primary)s; }
  .btn.sec { background: %(surface)s; color: %(muted)s; border: 1px solid %(border)s; }
  .field { background: %(surface)s; border: 1px solid %(border)s; border-radius: 14px;
           padding: 12px; }
  .field.on { border-color: %(primary)s; }
  .badge { display: inline-flex; align-items: center; gap: 5px; border-radius: 999px;
           padding: 5px 10px; font-size: 11px; font-weight: 700;
           letter-spacing: .66px; text-transform: uppercase; }
  .av { border-radius: 999px; object-fit: cover; }
  .sheet { position: absolute; left: 0; right: 0; bottom: 0; background: %(bg)s;
           border-top-left-radius: 22px; border-top-right-radius: 22px;
           padding: 20px 20px 26px; }
  .cover { width: 100%%; object-fit: cover; display: block; }
</style>
""" % {**C, "faces": fontface()}


def svg(d: str, size: int = 17, color: str = "#fff", w: float = 1.9) -> str:
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
            f'stroke="{color}" stroke-width="{w}" stroke-linecap="round" '
            f'stroke-linejoin="round">{d}</svg>')


PIN = '<path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>'
BOLT = '<path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z"/>'
SHIELD = '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/>'
PLUS = '<path d="M12 5v14M5 12h14"/>'
CAL = '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3.5v3M16 3.5v3"/>'
SEND = '<path d="M21 3 10.5 13.5"/><path d="M21 3l-6.5 18-4-8-8-4L21 3Z"/>'
CUP = ('<path d="M4 8h11v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z"/>'
       '<path d="M15 9h2.5a2.5 2.5 0 0 1 0 5H15"/><path d="M6 3.5v2M9.5 3.5v2M13 3.5v2"/>')
CAM = ('<path d="M4 8.5h3l1.5-2h7L17 8.5h3v10H4v-10Z"/><circle cx="12" cy="13" r="3.2"/>')
LOCK = '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7a3.5 3.5 0 1 1 7 0v3.5"/>'


def logo(size: int = 104) -> str:
    """Märket, samma konstruktion som src/components/Logo.tsx."""
    s = size / 180
    t = 46 * s
    haka = 78 * s
    pa = haka + 34 * s + 0.52 * t
    return f'''
    <svg width="{size}" height="{size}" viewBox="0 0 {size} {size}">
      <rect width="{size}" height="{size}" rx="{40*s}" fill="#15604B"/>
      <text x="{size/2}" y="{haka}" font-family="Unbounded" font-weight="700"
            font-size="{t}" fill="#F7F5EF" text-anchor="middle"
            letter-spacing="{-s}">HAKA</text>
      <text x="{size/2}" y="{pa}" font-family="Unbounded" font-weight="700"
            font-size="{t}" fill="#C86A2E" text-anchor="middle"
            letter-spacing="{-s}">P&#197;</text>
      <text x="{size/2}" y="{pa}" font-family="Unbounded" font-weight="700"
            font-size="{t}" fill="#F7F5EF" text-anchor="middle"
            letter-spacing="{-s}">PA</text>
    </svg>'''


# ---------------------------------------------------------------------------
# Skärmarna, i den ordning en användare möter dem
# ---------------------------------------------------------------------------

def s01_inloggning() -> str:
    return f'''
    <div class="scr" style="display:flex; flex-direction:column; justify-content:center; padding:0 20px">
      <div style="text-align:center">{logo(104)}</div>
      <div style="height:16px"></div>
      <div class="meta" style="text-align:center; max-width:300px; margin:0 auto">
        Hitta folk i närheten som vill göra samma sak som du.
      </div>
      <div style="height:34px"></div>
      <div class="lbl">Personnummer</div>
      <div class="field" style="margin-top:4px; color:{C['faint']}">ÅÅÅÅMMDD-XXXX</div>
      <div class="faint" style="padding-top:6px">Testläge: valfritt tolvsiffrigt nummer fungerar.</div>
      <div style="height:16px"></div>
      <div class="btn">{svg(SHIELD)} Logga in med BankID</div>
      <div style="height:20px"></div>
      <div class="faint" style="text-align:center">
        Alla här är verifierade med BankID. Ditt personnummer lagras aldrig.
      </div>
    </div>'''


def s02_bankid() -> str:
    return f'''
    <div class="scr" style="display:flex; flex-direction:column; justify-content:center; padding:0 20px">
      <div style="text-align:center">{logo(104)}</div>
      <div style="height:16px"></div>
      <div class="meta" style="text-align:center; max-width:300px; margin:0 auto">
        Hitta folk i närheten som vill göra samma sak som du.
      </div>
      <div style="height:34px"></div>
      <div style="background:{C['surface']}; border-radius:18px; padding:20px; text-align:center">
        {svg(SHIELD, 38, C['primary'], 1.6)}
        <div class="disp" style="font-size:14px; line-height:20px; padding-top:12px">
          Skriv under i BankID-appen.
        </div>
        <div class="meta" style="padding-top:6px">Håll appen öppen tills det är klart.</div>
        <div style="height:14px"></div>
        <div class="btn ghost">Avbryt</div>
      </div>
    </div>'''


def s03_onboarding() -> str:
    chips = ["Fiske", "Löpning", "Fika", "Vandring", "Matlagning", "Brädspel",
             "Cykling", "Foto", "Hundar", "Padel"]
    on = {"Fiske", "Löpning", "Fika"}
    chiphtml = "".join(
        f'<span class="chip{" on" if c in on else ""}">{c}</span>' for c in chips)
    return f'''
    <div class="scr">
      <div class="pad" style="padding-top:56px">
        <div class="disp" style="font-size:24px; line-height:32px">Välkommen!</div>
        <div class="meta" style="padding-top:4px">Tre snabba saker, sen är du igång.</div>

        <div style="height:20px"></div>
        <div class="disp" style="font-size:14px; line-height:20px">1. En bild på dig</div>
        <div class="faint" style="padding-top:4px">
          Alla här visar sitt ansikte. Det är därför det känns tryggt att tacka ja.
        </div>
        <div style="height:12px; "></div>
        <div style="display:flex; justify-content:center">
          <div style="position:relative">
            <img class="av" src="{img('avatar-johan')}" style="width:132px; height:132px">
            <div style="position:absolute; right:0; bottom:0; background:{C['primary']};
                        border-radius:999px; padding:9px; display:flex">
              {svg('<path d="M4 20h4L19 9l-4-4L4 16v4Z"/>', 15, '#fff', 1.8)}
            </div>
          </div>
        </div>

        <div style="height:20px"></div>
        <div style="height:1px; background:{C['border']}"></div>
        <div style="height:16px"></div>

        <div class="disp" style="font-size:14px; line-height:20px">2. Vem är du?</div>
        <div style="height:12px"></div>
        <div class="lbl">Vad ska folk kalla dig?</div>
        <div class="field" style="margin-top:4px">Jakob</div>

        <div style="height:12px"></div>
        <div style="background:{C['surfaceAlt']}; border-radius:14px; padding:12px;
                    display:flex; gap:8px; align-items:flex-start">
          {svg(PIN, 17, C['accent'], 1.75)}
          <div>
            <div style="font-size:13px; font-weight:600; line-height:18px">Skarpnäck</div>
            <div class="faint">Vi sparar bara ungefär var du bor, aldrig din exakta adress.</div>
          </div>
        </div>

        <div style="height:16px"></div>
        <div class="disp" style="font-size:14px; line-height:20px">3. Vad gillar du?</div>
        <div class="faint" style="padding-top:4px">Välj minst 3. De styr vad du får se i flödet.</div>
        <div style="display:flex; flex-wrap:wrap; gap:8px; padding-top:12px">{chiphtml}</div>
      </div>
    </div>'''


def s04_flodet() -> str:
    return f'''
    <div class="scr">
      <div class="pad" style="display:flex; align-items:flex-start;
                  justify-content:space-between; padding-top:56px; padding-bottom:14px">
        <div>
          <div class="disp" style="font-size:24px; line-height:32px">Upptäck</div>
          <div style="display:flex; align-items:center; gap:5px; margin-top:2px">
            {svg(PIN, 13, C['faint'], 1.75)}
            <span class="faint">Skarpnäck · 10 km</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:6px; background:{C['primary']};
                    color:#fff; border-radius:999px; padding:10px 16px;
                    font-size:15px; font-weight:700">
          {svg(PLUS, 17, '#fff', 2.2)} Lägg upp
        </div>
      </div>

      <div class="pad" style="padding-bottom:10px; display:flex; align-items:center; gap:7px">
        {svg(BOLT, 14, C['accent'], 1.9)}
        <span class="micro" style="color:{C['accent']}">Händer snart</span>
      </div>

      <div class="pad" style="padding-bottom:16px">
        <div class="card">
          <div style="height:132px; background:#1D5B6E; display:flex; align-items:center;
                      justify-content:center; position:relative">
            <div style="opacity:.42">{svg(CUP, 64, '#F7F5EF', 1.4)}</div>
            <div style="position:absolute; top:12px; left:12px">
              <span class="badge" style="background:{C['accent']}; color:#fff">Spontant</span>
            </div>
            <div style="position:absolute; top:12px; right:12px">
              <span class="badge" style="background:{C['overlay']}; color:#fff">Om 25 min</span>
            </div>
          </div>
          <div style="padding:16px">
            <div class="disp" style="font-size:18px; line-height:24px">Ta en fika</div>
            <div class="meta" style="margin-top:4px">Skarpnäcks torg · 600 m</div>
            <div style="display:flex; align-items:center; gap:8px; margin-top:12px">
              <img class="av" src="{img('avatar-elin')}" style="width:26px; height:26px">
              <span class="meta">Elin · 2 platser kvar</span>
            </div>
          </div>
        </div>
      </div>

      <div class="pad" style="padding-bottom:10px">
        <span class="micro" style="color:{C['faint']}">Planerat</span>
      </div>

      <div class="pad">
        <div class="card">
          <div style="position:relative">
            <img class="cover" src="{img('cover-fiske')}" style="height:172px">
            <div style="position:absolute; top:12px; left:12px">
              <span class="badge" style="background:{C['overlay']}; color:#fff">Din aktivitet</span>
            </div>
          </div>
          <div style="padding:16px">
            <div class="disp" style="font-size:18px; line-height:24px">Fiska i Drevviken</div>
            <div class="meta" style="margin-top:4px">Imorgon 13–15 · Drevviken · 1,2 km</div>
            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:12px">
              <div style="display:flex; align-items:center; gap:8px">
                <img class="av" src="{img('avatar-micke')}" style="width:26px; height:26px">
                <span class="meta">5 vill haka på</span>
              </div>
              <span class="badge" style="background:{C['primarySoft']}; color:{C['onPrimarySoft']}">Svara</span>
            </div>
          </div>
        </div>
      </div>
    </div>'''


def s05_aktivitet() -> str:
    return f'''
    <div class="scr">
      <img class="cover" src="{img('cover-lopning')}" style="height:230px">
      <div class="pad" style="padding-top:16px">
        <div class="disp" style="font-size:24px; line-height:32px">Löprunda i Nackareservatet</div>
        <div class="meta" style="padding-top:4px">Lugnt tempo, cirka en timme. Vi startar vid Hammarbybacken.</div>

        <div style="height:16px"></div>
        <div style="display:flex; gap:10px; align-items:center">
          {svg(CAL, 17, C['muted'], 1.75)}
          <span style="font-size:15px">Lördag 09–10</span>
        </div>
        <div style="height:10px"></div>
        <div style="display:flex; gap:10px; align-items:center">
          {svg(PIN, 17, C['muted'], 1.75)}
          <span style="font-size:15px">Nackareservatet · 2,4 km bort</span>
        </div>

        <div style="height:18px"></div>
        <div style="height:1px; background:{C['border']}"></div>
        <div style="height:16px"></div>

        <div class="lbl">Värd</div>
        <div style="display:flex; gap:12px; align-items:center; padding-top:8px">
          <img class="av" src="{img('avatar-sara')}" style="width:48px; height:48px">
          <div>
            <div style="font-weight:600">Sara, 34</div>
            <div style="display:flex; align-items:center; gap:6px; padding-top:2px">
              {svg(SHIELD, 12, C['primary'], 2)}
              <span class="faint">BankID · 8 aktiviteter</span>
            </div>
          </div>
        </div>

        <div style="height:16px"></div>
        <div class="lbl">Med hittills</div>
        <div style="display:flex; gap:-8px; padding-top:8px">
          <img class="av" src="{img('avatar-amir')}" style="width:38px; height:38px; border:2px solid {C['bg']}">
          <img class="av" src="{img('avatar-klara')}" style="width:38px; height:38px; border:2px solid {C['bg']}; margin-left:-10px">
          <img class="av" src="{img('avatar-nils')}" style="width:38px; height:38px; border:2px solid {C['bg']}; margin-left:-10px">
        </div>

        <div style="height:22px"></div>
        <div class="btn">{svg(PLUS, 17, '#fff', 2.2)} Haka på</div>
      </div>
    </div>'''


def s06_valjaren() -> str:
    # Flödet ligger kvar bakom överlägget. En modal över en tom yta ser ut som
    # en egen skärm, och det är just poängen att den inte är det.
    bakom = s04_flodet().replace('<div class="scr">', '<div style="position:absolute; inset:0">', 1)
    return f'''
    <div class="scr">
      {bakom}
      <div style="position:absolute; inset:0; background:{C['overlay']}"></div>
      <div class="sheet" style="display:flex; flex-direction:column; gap:12px">
        <div class="disp" style="font-size:18px; line-height:24px">Vad vill du lägga upp?</div>
        <div style="display:flex; gap:12px; align-items:flex-start;
                    background:{C['primarySoft']}; border-radius:18px; padding:16px">
          {svg(BOLT, 26, C['primary'], 1.6)}
          <div style="flex:1">
            <div style="font-weight:600">Spontant nu</div>
            <div class="meta" style="padding-top:4px">
              Något du vill göra inom några timmar. Går ut till folk i närheten direkt.
            </div>
          </div>
        </div>
        <div style="display:flex; gap:12px; align-items:flex-start;
                    background:{C['surface']}; border-radius:18px; padding:16px">
          {svg(CAL, 26, C['muted'], 1.6)}
          <div style="flex:1">
            <div style="font-weight:600">Planera något</div>
            <div class="meta" style="padding-top:4px">
              En aktivitet längre fram, med bild och beskrivning.
            </div>
          </div>
        </div>
      </div>
    </div>'''


def s07_spontan() -> str:
    def row(items, on_index):
        return "".join(
            f'<span class="chip{" on" if i == on_index else ""}">{t}</span>'
            for i, t in enumerate(items))
    return f'''
    <div class="scr">
      <div class="pad" style="padding-top:22px; display:flex; align-items:center;
                  justify-content:space-between">
        <span class="meta">Avbryt</span>
        <span class="disp" style="font-size:18px">Spontant nu</span>
        <span style="width:44px"></span>
      </div>
      <div class="pad">
        <div class="meta" style="padding:10px 0 16px">
          Går ut till folk i närheten som gillar samma sak. Den försvinner av
          sig själv när den har varit.
        </div>

        <div class="lbl">Vad?</div>
        <div style="display:flex; flex-wrap:wrap; gap:8px; padding-top:8px">
          <span class="chip on">{svg(CUP, 15, '#fff', 1.7)} Ta en fika</span>
          <span class="chip">Promenad</span>
          <span class="chip">Löprunda</span>
          <span class="chip">Cykla en sväng</span>
          <span class="chip">Gå på gymmet</span>
          <span class="chip">Käka lunch</span>
        </div>

        <div style="height:16px"></div>
        <div class="lbl">När?</div>
        <div style="display:flex; gap:8px; padding-top:8px">{row(["Nu","Om 30 min","Om 1 h","Om 2 h"], 1)}</div>

        <div style="height:16px"></div>
        <div class="lbl">Hur länge?</div>
        <div style="display:flex; gap:8px; padding-top:8px">{row(["1 h","2 h","3 h"], 1)}</div>

        <div style="height:16px"></div>
        <div style="height:1px; background:{C['border']}"></div>
        <div style="height:16px"></div>

        <div class="lbl">Var?</div>
        <div class="field" style="margin-top:8px; display:flex; align-items:center; gap:8px">
          {svg(PIN, 16, C['accent'], 1.75)} Skarpnäcks torg
        </div>

        <div style="height:16px"></div>
        <div class="lbl">Hur många?</div>
        <div style="display:flex; flex-wrap:wrap; gap:8px; padding-top:8px">
          {row(["1","2","3","4","6","Spelar ingen roll"], 2)}
        </div>

        <div style="height:16px"></div>
        <div class="lbl">Vem får se?</div>
        <div style="display:flex; gap:8px; padding-top:8px">{row(["Alla i närheten","Bara kompisar"], 0)}</div>

        <div style="height:22px"></div>
        <div class="btn">Lägg upp</div>
      </div>
    </div>'''


def s08_hakapa() -> str:
    return f'''
    <div class="scr">
      <div style="position:absolute; inset:0">
        <img class="cover" src="{img('cover-fiske')}" style="height:230px">
        <div class="pad" style="padding-top:16px">
          <div class="disp" style="font-size:24px; line-height:32px">Fiska i Drevviken</div>
          <div class="meta" style="padding-top:4px">Imorgon 13–15 · Drevviken, Skarpnäck</div>
        </div>
      </div>
      <div style="position:absolute; inset:0; background:{C['overlay']}"></div>

      <div class="sheet">
        <div class="disp" style="font-size:18px; line-height:24px">Haka på Fiska i Drevviken</div>
        <div class="meta" style="padding-top:4px">
          Skriv en rad till värden. Det är den som gör att du syns bland de
          andra som vill med.
        </div>

        <div style="height:16px"></div>
        <div class="lbl">Din rad</div>
        <div class="field on" style="margin-top:4px; min-height:96px">
          Har aldrig fiskat men velat testa i flera år. Bor vid Drevviken så det
          är nära för mig.<span style="display:inline-block; width:1.5px; height:17px;
          background:{C['primary']}; vertical-align:-3px; margin-left:1px"></span>
        </div>

        <div style="height:16px"></div>
        <div class="lbl">Hur van är du?</div>
        <div class="faint" style="padding-top:2px">
          Frivilligt. Hjälper värden planera, och att vara ny är aldrig ett minus.
        </div>
        <div style="display:flex; gap:8px; padding-top:8px">
          <span class="chip on">Första gången</span>
          <span class="chip">Gjort det förr</span>
          <span class="chip">Gör det ofta</span>
        </div>

        <div style="height:20px"></div>
        <div class="btn">{svg(SEND)} Skicka</div>
        <div class="btn ghost" style="padding-top:12px; padding-bottom:0">Avbryt</div>
      </div>
    </div>'''


def s09_varden() -> str:
    def sokande(avatar, namn, cred, rad, niva, dim=False):
        return f'''
        <div class="card" style="padding:16px{'; opacity:.55' if dim else ''}">
          <div style="display:flex; gap:12px">
            <img class="av" src="{img(avatar)}" style="width:48px; height:48px">
            <div style="flex:1">
              <div style="font-weight:600">{namn}</div>
              <div style="display:flex; align-items:center; gap:6px; padding-top:2px">
                {svg(SHIELD, 12, C['primary'], 2)}
                <span class="faint">{cred}</span>
              </div>
            </div>
          </div>
          {'' if dim else f"""
          <div style="padding-top:12px">”{rad}”</div>
          <div style="padding-top:8px"><span class="chip acc">{niva}</span></div>
          <div style="display:flex; gap:8px; padding-top:14px">
            <div class="btn" style="flex:1; padding:12px">Acceptera</div>
            <div class="btn sec" style="padding:12px 18px">Nej tack</div>
          </div>"""}
        </div>'''

    return f'''
    <div class="scr">
      <div class="pad" style="padding-top:56px">
        <div class="disp" style="font-size:24px; line-height:32px">Fiska i Drevviken</div>
        <div class="meta" style="padding-top:4px">Imorgon 13–15 · 4 platser · 1 tagen</div>

        <div style="height:20px"></div>
        <div class="disp" style="font-size:14px; line-height:20px">Vill haka på (5)</div>
        <div class="meta" style="padding-top:4px">
          Du väljer vilka. De andra får bara veta att platserna gick åt.
        </div>

        <div style="height:12px"></div>
        <div style="display:flex; flex-direction:column; gap:12px">
          {sokande('avatar-thu', 'Thu, 29', 'BankID · 3 aktiviteter · Årsta',
                   'Har aldrig fiskat men velat testa i flera år.', 'Första gången')}
          {sokande('avatar-amir', 'Amir, 36', 'BankID · 11 aktiviteter · Farsta',
                   'Bor tre kvarter bort och har extra spö om någon behöver.', 'Gör det ofta')}
          {sokande('avatar-klara', 'Klara, 31', 'BankID · 6 aktiviteter · Bagarmossen',
                   '', '', dim=True)}
        </div>
      </div>
    </div>'''


def s10_chatten() -> str:
    def bubbla(text, mine=False, extra=""):
        bg = C['primary'] if mine else C['surface']
        fg = "#fff" if mine else C['text']
        align = "flex-end" if mine else "flex-start"
        return f'''
        <div style="display:flex; justify-content:{align}">
          <div style="background:{bg}; color:{fg}; border-radius:14px; padding:10px 14px;
                      max-width:76%; font-size:15px; line-height:22px">{text}{extra}</div>
        </div>'''

    nal = bubbla(
        '<div style="display:flex; gap:8px; align-items:center">'
        + svg(PIN, 22, C["primary"], 1.75)
        + '<div><div style="font-weight:600">Bryggan, Drevviken</div>'
        + '<div class="faint">Tryck för att öppna i kartor</div></div></div>'
    )

    return f'''
    <div class="scr" style="background:{C['surfaceAlt']}">
      <div style="background:{C['bg']}; padding:52px 20px 14px;
                  border-bottom:1px solid {C['border']}">
        <div style="display:flex; gap:10px; align-items:center">
          <img class="cover" src="{img('cover-fiske')}"
               style="width:38px; height:38px; border-radius:10px">
          <div>
            <div style="font-weight:600">Fiska i Drevviken</div>
            <div class="faint">3 med · imorgon 13–15</div>
          </div>
        </div>
      </div>

      <div style="padding:16px 20px; display:flex; flex-direction:column; gap:10px">
        <div style="text-align:center" class="faint">Idag</div>
        {bubbla('Kul att du hakade på! Vi ses vid bryggan nedanför fältet.')}
        {bubbla('Perfekt. Ska jag ta med något?', True)}
        {bubbla('Bara varma kläder. Jag har extra spö och kaffe.')}
        {nal}
        {bubbla('Toppen, då hittar jag. Vi ses!', True)}
      </div>

      <div style="position:absolute; left:0; right:0; bottom:0; background:{C['bg']};
                  border-top:1px solid {C['border']}; padding:12px 20px 28px;
                  display:flex; gap:10px; align-items:center">
        <div style="width:34px; height:34px; border-radius:999px; background:{C['surfaceAlt']};
                    display:flex; align-items:center; justify-content:center">
          {svg(PLUS, 18, C['muted'], 2)}
        </div>
        <div style="flex:1; background:{C['surface']}; border:1px solid {C['border']};
                    border-radius:999px; padding:10px 16px; color:{C['faint']}">Skriv något …</div>
      </div>
    </div>'''


SCREENS = [
    ("01-inloggning", "Inloggning", s01_inloggning),
    ("02-bankid", "BankID väntar", s02_bankid),
    ("03-onboarding", "Onboarding", s03_onboarding),
    ("04-flodet", "Flödet", s04_flodet),
    ("05-aktivitet", "Aktiviteten", s05_aktivitet),
    ("06-valjaren", "Planerat eller spontant", s06_valjaren),
    ("07-spontant", "Spontant nu", s07_spontan),
    ("08-haka-pa", "Haka på", s08_hakapa),
    ("09-varden-valjer", "Värden väljer", s09_varden),
    ("10-chatten", "Chatten", s10_chatten),
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    pages = []
    for slug, namn, fn in SCREENS:
        html = f"<!doctype html><html><head><meta charset='utf-8'>{HEAD}</head><body>{fn()}</body></html>"
        path = OUT / f"{slug}.html"
        path.write_text(html, encoding="utf-8")
        pages.append((slug, namn, path))
    print(f"{len(pages)} skärmar skrivna till {OUT}")
    return pages


if __name__ == "__main__":
    main()
