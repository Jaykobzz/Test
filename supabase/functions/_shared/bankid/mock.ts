/**
 * Mock-BankID för utveckling.
 *
 * Den är avsiktligt tillståndslös: ordern kodas in i en signerad orderRef i
 * stället för att lagras. Edge-funktioner kan landa på olika instanser mellan
 * start och collect, och ett minnesobjekt hade då tappat ordern.
 *
 * Signeringen "tar" tre sekunder, så att klienten får öva på väntetillståndet
 * — den delen av flödet finns kvar när riktig BankID kopplas in.
 */

import type {
  CollectResult,
  IdentityProvider,
  OrderRef,
  StartOptions,
  StartResult,
} from "./types.ts";

const SIGNING_DURATION_MS = 3_000;
const ORDER_TTL_MS = 3 * 60_000;

const FIRST_NAMES = [
  "Anna", "Erik", "Maria", "Johan", "Sara", "Karl", "Elin", "Anders",
  "Ida", "Lars", "Emma", "Nils", "Klara", "Oskar", "Linnea", "Gustav",
];
const LAST_NAMES = [
  "Andersson", "Johansson", "Karlsson", "Nilsson", "Eriksson", "Larsson",
  "Olsson", "Persson", "Svensson", "Gustafsson", "Lindberg", "Sandberg",
];

interface MockOrder {
  pnr: string;
  createdAt: number;
}

function encoder() {
  return new TextEncoder();
}

function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    encoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder().encode(payload));
  return base64UrlEncode(new Uint8Array(sig));
}

/**
 * Deterministiskt namn ur personnumret, så att samma testnummer alltid är
 * samma person mellan omstarter.
 */
function nameFor(pnr: string): { givenName: string; surname: string } {
  let hash = 0;
  for (const ch of pnr) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    givenName: FIRST_NAMES[hash % FIRST_NAMES.length],
    surname: LAST_NAMES[(hash >>> 8) % LAST_NAMES.length],
  };
}

/** Rimlighetskontroll, inte Luhn — mocken ska släppa igenom påhittade nummer. */
function normalizePersonalNumber(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 12) return digits;
  if (digits.length === 10) {
    const yy = Number(digits.slice(0, 2));
    const nowYY = new Date().getFullYear() % 100;
    const century = yy > nowYY ? "19" : "20";
    return century + digits;
  }
  throw new Error("Personnumret ska ha 10 eller 12 siffror");
}

export class MockBankIdProvider implements IdentityProvider {
  readonly name = "mock-bankid";

  constructor(private readonly secret: string) {}

  async start(options: StartOptions): Promise<StartResult> {
    if (!options.personalNumber) {
      throw new Error("Mock-BankID kräver personnummer");
    }
    const order: MockOrder = {
      pnr: normalizePersonalNumber(options.personalNumber),
      createdAt: Date.now(),
    };
    const payload = base64UrlEncode(encoder().encode(JSON.stringify(order)));
    const signature = await sign(payload, this.secret);
    const orderRef = `${payload}.${signature}`;

    return {
      orderRef,
      autoStartToken: crypto.randomUUID(),
      qrData: `mock.${orderRef.slice(0, 24)}`,
    };
  }

  async collect(orderRef: OrderRef): Promise<CollectResult> {
    const [payload, signature] = orderRef.split(".");
    if (!payload || !signature) return { status: "failed", hintCode: "invalidParameters" };

    const expected = await sign(payload, this.secret);
    if (expected !== signature) return { status: "failed", hintCode: "invalidParameters" };

    let order: MockOrder;
    try {
      order = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    } catch {
      return { status: "failed", hintCode: "invalidParameters" };
    }

    const age = Date.now() - order.createdAt;
    if (age > ORDER_TTL_MS) return { status: "failed", hintCode: "expiredTransaction" };

    if (age < SIGNING_DURATION_MS) {
      return {
        status: "pending",
        hintCode: age < 1_000 ? "outstandingTransaction" : "userSign",
        qrData: `mock.${payload.slice(0, 24)}.${Math.floor(age / 1000)}`,
      };
    }

    return {
      status: "complete",
      identity: { personalNumber: order.pnr, ...nameFor(order.pnr) },
    };
  }

  async cancel(_orderRef: OrderRef): Promise<void> {
    // Tillståndslös mock — det finns ingen order att riva.
  }
}
