/**
 * Antal olästa meddelanden, för pricken i tabbaren.
 *
 * Laddas om varje gång flikarna får fokus igen, alltså när man kommer
 * tillbaka från en chatt eller en aktivitet. Ingen pollning: att fråga
 * servern var trettionde sekund för varje användare kostar pengar och ger
 * inget som fokusomladdningen inte redan ger.
 *
 * När Supabase är uppe bör det här flyttas till realtidsprenumerationen,
 * så att pricken dyker upp medan appen står öppen.
 */

import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { getBackend } from "@/api";

export function useUnread(): number {
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const threads = await getBackend().listThreads();
          if (!active) return;
          setCount(threads.reduce((sum, t) => sum + t.unreadCount, 0));
        } catch {
          // En prick som inte hinner uppdateras är inte värd ett felmeddelande.
        }
      })();
      return () => { active = false; };
    }, []),
  );

  return count;
}
