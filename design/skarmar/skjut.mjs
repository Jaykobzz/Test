/**
 * Fotograferar skärmarna som PNG.
 *
 * Två skärmars innehåll är längre än telefonen, onboarding och spontant. De
 * fotograferas i sin fulla höjd i stället för att klippas, för poängen med en
 * bild man skickar vidare är att den ska gå att se hela.
 */
import { chromium } from "playwright";
import { readdirSync } from "fs";
import { resolve } from "path";

const DIR = resolve("png");
const FULL = new Set(["03-onboarding", "07-spontant", "09-varden-valjer"]);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--font-render-hinting=none"],
});

const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
});

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".html")).sort()) {
  const slug = file.replace(/\.html$/, "");
  await page.goto("file://" + resolve(DIR, file));
  // Google Fonts hämtas över nätet; utan väntan fotograferas fallbacken.
  await page.waitForFunction(() => document.fonts.status === "loaded", null,
    { timeout: 15000 }).catch(() => console.warn("  varning: typsnitt hann inte, " + slug));
  const el = await page.$(".scr");
  await el.screenshot({ path: resolve(DIR, slug + ".png"),
                        ...(FULL.has(slug) ? {} : {}) });
  console.log("  " + slug + ".png");
}

await browser.close();
