/**
 * Skarp BankID via Criipto (eller Signicat — samma OIDC-form).
 *
 * Den här filen är avsiktligt inte inkopplad än. Den ligger här för att visa
 * exakt var den riktiga integrationen tar vid, och för att bevisa att
 * gränssnittet i types.ts räcker för ett riktigt flöde.
 *
 * Att aktivera:
 *   1. Skapa ett konto hos Criipto och en applikation med BankID-acr:
 *      urn:grn:authn:se:bankid
 *   2. Sätt hemligheterna i Supabase:
 *        supabase secrets set BANKID_MODE=criipto \
 *          CRIIPTO_DOMAIN=... CRIIPTO_CLIENT_ID=... CRIIPTO_CLIENT_SECRET=...
 *   3. Byt raden i resolveProvider() i ../../bankid-auth/index.ts.
 *
 * Skillnad mot mocken: Criipto är ett omdirigeringsflöde, inte en pollning.
 * Klienten öppnar authorize-URL:en i ett webbläsarfönster, användaren signerar,
 * och Criipto skickar tillbaka en `code` till appens redirect-URI. `collect()`
 * växlar in koden mot ett id_token. Därför bär orderRef här koden i stället för
 * en order — samma gränssnitt, annan innebörd.
 */

import type {
  CollectResult,
  IdentityProvider,
  OrderRef,
  StartOptions,
  StartResult,
  VerifiedIdentity,
} from "./types.ts";

export interface CriiptoConfig {
  domain: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface CriiptoClaims {
  /** Criipto lämnar personnumret i `ssn` för svenskt BankID. */
  ssn?: string;
  socialno?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
}

export class CriiptoBankIdProvider implements IdentityProvider {
  readonly name = "criipto-bankid";

  constructor(private readonly config: CriiptoConfig) {}

  async start(options: StartOptions): Promise<StartResult> {
    const state = crypto.randomUUID();
    const url = new URL(`https://${this.config.domain}/oauth2/authorize`);
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid");
    url.searchParams.set("state", state);
    url.searchParams.set(
      "acr_values",
      options.personalNumber
        ? "urn:grn:authn:se:bankid:same-device"
        : "urn:grn:authn:se:bankid:another-device:qr",
    );

    // autoStartToken bär här hela authorize-URL:en; klienten öppnar den.
    return { orderRef: state, autoStartToken: url.toString() };
  }

  /** orderRef är auktoriseringskoden som redirect-URI:n tog emot. */
  async collect(orderRef: OrderRef): Promise<CollectResult> {
    const response = await fetch(`https://${this.config.domain}/oauth2/token`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: "Basic " +
          btoa(`${this.config.clientId}:${this.config.clientSecret}`),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: orderRef,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      return { status: "failed", hintCode: "tokenExchangeFailed" };
    }

    const { id_token } = await response.json() as { id_token?: string };
    if (!id_token) return { status: "failed", hintCode: "noIdToken" };

    const identity = decodeIdentity(id_token);
    if (!identity) return { status: "failed", hintCode: "missingSsnClaim" };

    return { status: "complete", identity };
  }

  async cancel(_orderRef: OrderRef): Promise<void> {
    // Ett övergivet omdirigeringsflöde löper ut av sig självt.
  }
}

/**
 * Läser identiteten ur id_token.
 *
 * OBS: signaturen verifieras inte här. Token hämtas över TLS direkt från
 * Criiptos token-endpoint med klienthemligheten, vilket enligt OIDC Core 3.1.3.7
 * gör signaturvalidering valfri för just code flow. Skulle token någon gång
 * komma från klienten i stället måste JWKS-validering läggas till här först.
 */
function decodeIdentity(idToken: string): VerifiedIdentity | null {
  const payload = idToken.split(".")[1];
  if (!payload) return null;

  const padded = payload.replace(/-/g, "+").replace(/_/g, "/")
    .padEnd(Math.ceil(payload.length / 4) * 4, "=");
  const claims = JSON.parse(atob(padded)) as CriiptoClaims;

  const personalNumber = (claims.ssn ?? claims.socialno ?? "").replace(/\D/g, "");
  if (personalNumber.length !== 12) return null;

  const [fallbackGiven, ...fallbackRest] = (claims.name ?? "").split(" ");

  return {
    personalNumber,
    givenName: claims.given_name ?? fallbackGiven ?? "",
    surname: claims.family_name ?? fallbackRest.join(" ") ?? "",
  };
}
