/**
 * Väljer backend en gång vid start.
 *
 * Mock-läget kör allt lokalt på telefonen och behöver varken Supabase eller
 * nätverk. Det är också det som gäller om ingen konfiguration finns, för
 * alternativet är att appen tyst försöker nå en server som inte existerar
 * och blir stående på "Väntar på BankID" utan att säga varför. En app som
 * klonas och startas ska fungera direkt.
 *
 * Sätt EXPO_PUBLIC_USE_MOCK_BACKEND=0 i .env när Supabase är uppsatt.
 */

import type { Backend } from "./backend";
import { MockBackend } from "./mock";
import { SupabaseBackend } from "./supabase";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase/client";

const flag = process.env.EXPO_PUBLIC_USE_MOCK_BACKEND;
const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Mock gäller om den är påslagen, eller om Supabase inte är konfigurerat.
 * Ett uttryckligt 0 utan konfiguration respekteras ändå, så att felet syns
 * för den som medvetet stängt av mocken.
 */
export const USING_MOCK = flag === "0" ? false : flag === "1" || !supabaseConfigured;

let instance: Backend | null = null;

export function getBackend(): Backend {
  if (!instance) {
    instance = USING_MOCK ? new MockBackend() : new SupabaseBackend();
  }
  return instance;
}

/** Bara tillgängligt i mock-läge; används av "Börja om" i profilen. */
export async function resetMockData(): Promise<void> {
  const backend = getBackend();
  if (backend instanceof MockBackend) await backend.reset();
}

export type { Backend } from "./backend";
export * from "./types";
