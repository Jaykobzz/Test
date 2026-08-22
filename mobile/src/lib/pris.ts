/**
 * Kostnad i klartext.
 *
 * En egen fil för att "Gratis" och "120 kr" ska stå likadant överallt.
 * Priset är det man vill veta innan man hakar på, inte vid grinden, så det
 * dyker upp på flera ställen och får inte formuleras om på vägen.
 */

/** "Gratis" eller "120 kr". */
export function formatPrice(priceSek: number | null): string {
  return priceSek === null || priceSek === 0 ? "Gratis" : `${priceSek} kr`;
}

/** Samma sak, men med vad som ingår underförstått. Används på kortet. */
export function formatPriceShort(priceSek: number | null): string | null {
  return priceSek === null || priceSek === 0 ? null : `${priceSek} kr`;
}
