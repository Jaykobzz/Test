/**
 * Språk i appen.
 *
 * Ingen översättningsmodul, utan en skriven ordbok. Skälet är typerna: en
 * modul faller tyst tillbaka på nyckeln eller på svenska när en text saknas,
 * och då upptäcks luckan av en användare. Här är den engelska ordboken typad
 * mot den svenska, så en glömd rad blir ett kompileringsfel i stället.
 *
 * Texter med värden i sig är funktioner och inte mallsträngar. Det är därför
 * "3 platser kvar" och "1 plats kvar" kan skilja sig åt per språk utan att
 * någon behöver bygga en pluralmotor.
 *
 * Svenska är källan. Engelska finns för att de som är nya i Sverige ofta har
 * störst behov av det appen gör och minst nätverk att göra det med.
 */

import { getLocales } from "expo-localization";

import { en } from "./en";
import { sv } from "./sv";

export type Texts = typeof sv;

/**
 * Svenska om telefonen står på svenska, annars engelska.
 *
 * Läses en gång vid start. Byter någon språk i systeminställningarna startas
 * appen om av iOS ändå, så det finns inget att lyssna på.
 */
function pick(): Texts {
  const first = getLocales()[0];
  return first?.languageCode === "sv" ? sv : en;
}

export const t: Texts = pick();

/** Språkkoden som faktiskt används, för sådant som datumformat. */
export const locale: "sv" | "en" = t === sv ? "sv" : "en";
