/**
 * bankid-auth. Den enda vägen in i appen.
 *
 * Tre endpoints:
 *   POST /bankid-auth/start    { personalNumber? }  -> { orderRef, autoStartToken, qrData? }
 *   POST /bankid-auth/collect  { orderRef }         -> { status, ... , tokenHash? }
 *   POST /bankid-auth/cancel   { orderRef }         -> { ok: true }
 *
 * Vid `complete` gör funktionen tre saker som klienten aldrig får göra själv:
 *   1. Hashar personnumret med en serverhemlighet (HMAC-SHA256). Råa numret
 *      lämnar aldrig den här filen.
 *   2. Slår upp eller skapar auth-användaren utifrån hashen.
 *   3. Ger tillbaka ett engångstoken som klienten växlar mot en session via
 *      supabase.auth.verifyOtp(). Klienten ser alltså aldrig service-nyckeln.
 */

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { IdentityProvider } from "../_shared/bankid/types.ts";
import { MockBankIdProvider } from "../_shared/bankid/mock.ts";
import { CriiptoBankIdProvider } from "../_shared/bankid/criipto.ts";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Saknar miljövariabel ${name}`);
  return value;
}

function resolveProvider(): IdentityProvider {
  const mode = Deno.env.get("BANKID_MODE") ?? "mock";

  switch (mode) {
    case "mock":
      return new MockBankIdProvider(requireEnv("BANKID_ORDER_SECRET"));

    case "criipto":
      return new CriiptoBankIdProvider({
        domain: requireEnv("CRIIPTO_DOMAIN"),
        clientId: requireEnv("CRIIPTO_CLIENT_ID"),
        clientSecret: requireEnv("CRIIPTO_CLIENT_SECRET"),
        redirectUri: requireEnv("CRIIPTO_REDIRECT_URI"),
      });

    default:
      throw new Error(`Okänt BANKID_MODE: ${mode}`);
  }
}

/**
 * HMAC-SHA256 av personnumret. Peppar-hemligheten ligger bara på servern, så
 * ett läckt databasutdrag går inte att brute-forcea trots att personnummer är
 * ett litet sökrum (~10^12 och lätt att räkna igenom utan peppar).
 */
async function hashPersonalNumber(pnr: string, pepper: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(pnr));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Intern adress som aldrig mejlas — Supabase auth vill ha en unik identifierare. */
function internalEmail(hash: string): string {
  return `${hash.slice(0, 32)}@bankid.hakapa.internal`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}

interface ResolvedUser {
  userId: string;
  isNewUser: boolean;
  needsOnboarding: boolean;
}

async function resolveUser(
  admin: SupabaseClient,
  hash: string,
  givenName: string,
  surname: string,
  birthYear: number,
): Promise<ResolvedUser> {
  const { data: existing, error: lookupError } = await admin
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("personal_number_hash", hash)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing) {
    return {
      userId: existing.id,
      isNewUser: false,
      // Ett halvfärdigt konto (avbruten onboarding) ska tillbaka till onboarding.
      needsOnboarding: !existing.avatar_url || !existing.display_name,
    };
  }

  const email = internalEmail(hash);
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { bankid_verified: true },
  });
  if (createError) throw createError;

  const userId = created.user!.id;

  // Profilen skapas med ett arbetsnamn och tom bild; onboarding fyller i resten.
  // avatar_url är NOT NULL, så platshållaren måste vara en riktig sträng.
  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    personal_number_hash: hash,
    legal_given_name: givenName,
    legal_family_name: surname,
    birth_year: birthYear,
    display_name: givenName || "Ny kompis",
    avatar_url: "pending",
  });

  if (profileError) {
    // Rulla tillbaka auth-användaren, annars blir hashen upptagen av ett
    // konto som inte har någon profil och nästa försök fastnar för alltid.
    await admin.auth.admin.deleteUser(userId);
    throw profileError;
  }

  return { userId, isNewUser: true, needsOnboarding: true };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const action = new URL(request.url).pathname.split("/").filter(Boolean).pop();

  try {
    const provider = resolveProvider();
    const body = await request.json().catch(() => ({})) as Record<string, string>;

    if (action === "start") {
      const endUserIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
        ?? "127.0.0.1";
      const result = await provider.start({
        personalNumber: body.personalNumber,
        endUserIp,
      });
      return json(result);
    }

    if (action === "cancel") {
      if (!body.orderRef) return json({ error: "orderRef saknas" }, 400);
      await provider.cancel(body.orderRef);
      return json({ ok: true });
    }

    if (action !== "collect") {
      return json({ error: "Okänd åtgärd" }, 404);
    }

    if (!body.orderRef) return json({ error: "orderRef saknas" }, 400);

    const result = await provider.collect(body.orderRef);
    if (result.status !== "complete" || !result.identity) {
      return json({ status: result.status, hintCode: result.hintCode, qrData: result.qrData });
    }

    const { personalNumber, givenName, surname } = result.identity;
    const hash = await hashPersonalNumber(personalNumber, requireEnv("PNR_PEPPER"));
    const birthYear = Number(personalNumber.slice(0, 4));

    const admin = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const user = await resolveUser(admin, hash, givenName, surname, birthYear);

    // Engångslänk som klienten löser in mot en riktig session. Vi skickar bara
    // token_hash vidare — aldrig service-nyckeln.
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: internalEmail(hash),
    });
    if (linkError) throw linkError;

    return json({
      status: "complete",
      tokenHash: link.properties.hashed_token,
      isNewUser: user.isNewUser,
      needsOnboarding: user.needsOnboarding,
      // Förnamnet är trevligt att kunna visa direkt i onboarding.
      givenName,
    });
  } catch (error) {
    console.error("bankid-auth", error);
    const message = error instanceof Error ? error.message : "Okänt fel";
    return json({ error: message }, 400);
  }
});
