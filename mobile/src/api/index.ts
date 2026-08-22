/**
 * Väljer backend en gång vid start.
 *
 * Med EXPO_PUBLIC_USE_MOCK_BACKEND=1 körs allt lokalt på telefonen, bra för
 * att klicka igenom flödet innan Supabase är uppsatt. Annars går appen mot
 * riktig databas.
 */

import type { Backend } from "./backend";
import { MockBackend } from "./mock";
import { SupabaseBackend } from "./supabase";

export const USING_MOCK = process.env.EXPO_PUBLIC_USE_MOCK_BACKEND === "1";

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
