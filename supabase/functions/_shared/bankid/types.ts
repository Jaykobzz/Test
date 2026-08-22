/**
 * Identitetsleverantör — gränssnittet som håller BankID utbytbart.
 *
 * Hela appen känner bara till den här formen. Mocken uppfyller den idag; en
 * skarp broker (Criipto, Signicat) eller BankID:s eget RP-API uppfyller samma
 * form imorgon. Att byta ska vara en rad i `resolveProvider()` — inget annat.
 */

export type OrderRef = string;

export interface StartOptions {
  /** Personnummer, ÅÅÅÅMMDDNNNN. Utelämnas vid QR-inloggning på annan enhet. */
  personalNumber?: string;
  /** Klientens IP, som BankID kräver för riskbedömning. */
  endUserIp: string;
}

export interface StartResult {
  orderRef: OrderRef;
  /** Token för att starta BankID-appen på samma enhet. */
  autoStartToken: string;
  /** QR-data att rendera när man signerar på en annan enhet. */
  qrData?: string;
}

export type CollectStatus = "pending" | "complete" | "failed";

export interface VerifiedIdentity {
  /** ÅÅÅÅMMDDNNNN. Lämnar aldrig servern — hashas innan den rör databasen. */
  personalNumber: string;
  givenName: string;
  surname: string;
}

export interface CollectResult {
  status: CollectStatus;
  /** Kod för UI-text, t.ex. "userSign", "outstandingTransaction", "expiredTransaction". */
  hintCode?: string;
  identity?: VerifiedIdentity;
  qrData?: string;
}

export interface IdentityProvider {
  readonly name: string;
  start(options: StartOptions): Promise<StartResult>;
  collect(orderRef: OrderRef): Promise<CollectResult>;
  cancel(orderRef: OrderRef): Promise<void>;
}
