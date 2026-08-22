/**
 * Appmärket som bilder, i de varianter som kan behövas.
 *
 * Samma konstruktion som src/components/Logo.tsx: ordet sätts två gånger,
 * "PÅ" med ring underst i ringens färg och "PA" utan ring överst i textens,
 * så att ringen blir typsnittets egen och inte en cirkel på uppmätta
 * koordinater.
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const TTF = readFileSync(
  "/home/user/Test/mobile/node_modules/@expo-google-fonts/unbounded/700Bold/Unbounded_700Bold.ttf",
).toString("base64");

const PINE = "#15604B", CREAM = "#F7F5EF", RUST = "#C86A2E", INK = "#14201B";

const VARIANTS = [
  { slug: "marke-gron",   plate: PINE,  ink: CREAM, ring: RUST,  bg: "#DFD9CB", radius: 0.222 },
  { slug: "marke-morkt",  plate: INK,   ink: CREAM, ring: RUST,  bg: "#DFD9CB", radius: 0.222 },
  { slug: "marke-cremet", plate: CREAM, ink: PINE,  ring: RUST,  bg: "#DFD9CB", radius: 0.222 },
  { slug: "appikon",      plate: PINE,  ink: CREAM, ring: RUST,  bg: null,      radius: 0 },
];

function mark({ plate, ink, ring, radius }, px) {
  const s = px / 180, t = 46 * s;
  const haka = 78 * s, pa = haka + 34 * s + 0.52 * t;
  const word = (y, fill, text) =>
    `<text x="${px / 2}" y="${y}" font-family="UB" font-weight="700" font-size="${t}"
       fill="${fill}" text-anchor="middle" letter-spacing="${-s}">${text}</text>`;
  return `<svg width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">
    <rect width="${px}" height="${px}" rx="${radius * px}" fill="${plate}"/>
    ${word(haka, ink, "HAKA")}
    ${word(pa, ring, "P&#197;")}
    ${word(pa, ink, "PA")}
  </svg>`;
}

const OUT = resolve("marke");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ deviceScaleFactor: 1 });

for (const v of VARIANTS) {
  const px = 1024;
  const pad = v.bg ? 96 : 0;
  const box = px + pad * 2;
  await page.setViewportSize({ width: box, height: box });
  await page.setContent(`<style>
    @font-face{font-family:'UB';font-weight:700;font-display:block;
      src:url(data:font/ttf;base64,${TTF}) format('truetype');}
    html,body{margin:0}
    #f{width:${box}px;height:${box}px;display:flex;align-items:center;justify-content:center;
       background:${v.bg ?? "transparent"}}
  </style><div id="f">${mark(v, px)}</div>`);
  await page.waitForFunction(() => document.fonts.check("700 100px UB"));
  const el = await page.$("#f");
  await el.screenshot({
    path: resolve(OUT, v.slug + ".png"),
    omitBackground: !v.bg,
  });
  console.log("  " + v.slug + ".png");
}

await browser.close();
