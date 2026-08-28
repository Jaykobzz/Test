/*
  Kontrollerar att engelskan är komplett och att ingen svenska läckt in i den.

  Typerna fångar en glömd nyckel vid kompilering. Det de inte fångar är en
  nyckel som finns men som fortfarande innehåller svensk text, vilket är precis
  vad som händer när man klistrar in ett block och glömmer översätta det.
*/
const Module = require("module");
const path = require("path");
const BUILD = path.join(__dirname, "..", ".flode");

const stubs = {
  "expo-localization": {
    __esModule: true,
    getLocales: () => [{ languageCode: "en", languageTag: "en-GB" }],
  },
};
const realResolve = Module._resolveFilename;
Module._resolveFilename = function (r, ...rest) {
  if (stubs[r]) return "stub:" + r;
  if (r.startsWith("@/")) return realResolve.call(this, path.join(BUILD, r.slice(2)), ...rest);
  return realResolve.call(this, r, ...rest);
};
const realLoad = Module._load;
Module._load = function (r, ...rest) {
  if (stubs[r]) return stubs[r];
  return realLoad.call(this, r, ...rest);
};

const { sv } = require(path.join(BUILD, "i18n/sv.js"));
const { en } = require(path.join(BUILD, "i18n/en.js"));

/*
  Egennamn böjs inte om vid översättning. Appen heter Haka på på engelska
  också, och Drevviken ligger kvar i Skarpnäck oavsett vilket språk man läser
  på. De plockas bort innan texten prövas, annars flaggas rätt översättningar
  som fel och testet blir något man lär sig ignorera.
*/
const EGENNAMN = /Haka på|Drevviken|Skarpnäck|Vega|BankID/g;

/* Ord som bara finns på svenska. Å, ä och ö räcker inte: "Padel" och
   "Skateboard" är samma på båda språken och ska inte flaggas. */
const SVENSKT = /[åäöÅÄÖ]|\b(och|eller|inte|för|med|från|som|att|det|den|ditt|din|dina)\b/i;

/** Texten som den ska prövas: utan egennamn. */
function prova(text) {
  return String(text).replace(EGENNAMN, "");
}

let fel = 0, kollade = 0;

function walk(a, b, sti) {
  for (const nyckel of Object.keys(a)) {
    const vagen = sti ? `${sti}.${nyckel}` : nyckel;
    const svVal = a[nyckel], enVal = b?.[nyckel];

    if (enVal === undefined) { console.log("  SAKNAS  " + vagen); fel++; continue; }

    if (typeof svVal === "function") {
      if (typeof enVal !== "function") { console.log("  FEL TYP " + vagen); fel++; continue; }
      // Kör båda med ett värde och jämför utfallet, inte källkoden.
      const ut = String(enVal(3));
      kollade++;
      if (SVENSKT.test(prova(ut))) { console.log(`  SVENSKA ${vagen}: "${ut}"`); fel++; }
      continue;
    }

    if (svVal && typeof svVal === "object") { walk(svVal, enVal, vagen); continue; }

    if (typeof svVal === "string") {
      kollade++;
      if (SVENSKT.test(prova(enVal))) { console.log(`  SVENSKA ${vagen}: "${enVal}"`); fel++; }
      if (enVal === svVal && prova(svVal).trim().length > 12) {
        console.log(`  OÖVERSATT ${vagen}: "${enVal}"`); fel++;
      }
    }
  }
}

console.log("\nSpråkkontroll");
walk(sv, en, "");
console.log(`\n${kollade} texter kontrollerade, ${fel} fel`);
process.exit(fel ? 1 : 0);
