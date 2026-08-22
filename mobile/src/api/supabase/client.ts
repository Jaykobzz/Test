/**
 * Supabase-klienten.
 *
 * Sessionen ligger i SecureStore (Keychain på iOS, EncryptedSharedPreferences
 * på Android) i stället för AsyncStorage. Det är en BankID-verifierad identitet
 *, en token som ger tillgång till den ska inte ligga i klartext på disk.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * SecureStore tar max ~2 kB per värde och Supabase-sessioner är större än så.
 * Adaptern delar värdet i bitar och håller reda på antalet i en indexnyckel.
 */
const CHUNK_SIZE = 1800;

const chunkedSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const count = await SecureStore.getItemAsync(`${key}.parts`);
    if (count === null) return SecureStore.getItemAsync(key);

    const parts: string[] = [];
    for (let i = 0; i < Number(count); i++) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part === null) return null; // Trasig kedja, behandla som utloggad.
      parts.push(part);
    }
    return parts.join("");
  },

  async setItem(key: string, value: string): Promise<void> {
    await chunkedSecureStore.removeItem(key);

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const count = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(
        `${key}.${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      );
    }
    await SecureStore.setItemAsync(`${key}.parts`, String(count));
  },

  async removeItem(key: string): Promise<void> {
    const count = await SecureStore.getItemAsync(`${key}.parts`);
    if (count !== null) {
      for (let i = 0; i < Number(count); i++) {
        await SecureStore.deleteItemAsync(`${key}.${i}`);
      }
      await SecureStore.deleteItemAsync(`${key}.parts`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (client) return client;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "EXPO_PUBLIC_SUPABASE_URL och EXPO_PUBLIC_SUPABASE_ANON_KEY saknas. "
      + "Sätt dem i .env, eller kör med EXPO_PUBLIC_USE_MOCK_BACKEND=1.",
    );
  }

  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // På webben finns ingen SecureStore; där får webbläsarens lagring duga.
      storage: Platform.OS === "web" ? undefined : chunkedSecureStore,
      autoRefreshToken: true,
      persistSession: true,
      // Appen tar aldrig emot tokens i URL:en; inloggning går via verifyOtp.
      detectSessionInUrl: false,
    },
  });

  return client;
}
