/**
 * Kostnad i klartext.
 *
 * Här står ingenting om "gratis", och det är avsiktligt. Att skriva gratis
 * på något förutsätter att pris är normen och att noll är undantaget, och i
 * samma stund har appen gjort umgänget till en produkt med rabatt. Kostar
 * det ingenting säger appen ingenting.
 *
 * Formuleringen säger också var pengarna hamnar. Värden tar inte betalt,
 * bastun gör det. Det är hela skillnaden mellan en hängning och ett event,
 * och den skillnaden ska synas i orden.
 */

/** "Kostar 120 kr på plats" eller "Costs 120 kr on site", annars null. */
import { t } from "@/i18n";

export function formatCost(priceSek: number | null): string | null {
  if (priceSek === null || priceSek === 0) return null;
  return t.activity.costsOnSite(priceSek);
}
