/**
 * Inloggningstillstånd för hela appen.
 *
 * Håller reda på tre saker: om vi vet något än (`loading`), vem som är
 * inloggad (`profile`), och om profilen är färdigifylld (`needsOnboarding`).
 * Rotlayouten läser dessa och skickar användaren rätt.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getBackend } from "@/api";
import type { BankIdCollect, MyProfile } from "@/api/types";

/** Hur ofta vi frågar servern om BankID-signeringen är klar. */
const POLL_INTERVAL_MS = 1200;
/** Ge upp efter tre minuter, samma som BankID:s eget fönster. */
const POLL_TIMEOUT_MS = 180_000;

export type SignInState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "waiting"; hintCode?: string; qrData?: string }
  | { phase: "failed"; message: string };

interface AuthValue {
  loading: boolean;
  profile: MyProfile | null;
  signInState: SignInState;
  signIn(personalNumber: string): Promise<void>;
  cancelSignIn(): void;
  signOut(): Promise<void>;
  /** Läser om profilen, t.ex. efter onboarding eller en profiländring. */
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [signInState, setSignInState] = useState<SignInState>({ phase: "idle" });

  // Pågående order, så att avbryt kan nå den och pollningen kan stoppas.
  const orderRef = useRef<string | null>(null);
  const cancelled = useRef(false);

  const refresh = useCallback(async () => {
    const profile = await getBackend().getMyProfile();
    setProfile(profile);
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const hasSession = await getBackend().restoreSession();
        if (active && hasSession) await refresh();
      } catch {
        // Trasig eller utgången session, användaren får logga in igen.
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [refresh]);

  const signIn = useCallback(async (personalNumber: string) => {
    const backend = getBackend();
    cancelled.current = false;
    setSignInState({ phase: "starting" });

    try {
      const start = await backend.bankIdStart(personalNumber);
      orderRef.current = start.orderRef;
      setSignInState({ phase: "waiting", qrData: start.qrData });

      const deadline = Date.now() + POLL_TIMEOUT_MS;

      // Pollar tills BankID är klart. Samma slinga fungerar mot mocken och
      // mot skarp BankID, det är därför gränssnittet ser ut som det gör.
      while (Date.now() < deadline) {
        if (cancelled.current) return;

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (cancelled.current) return;

        let result: BankIdCollect;
        try {
          result = await backend.bankIdCollect(start.orderRef);
        } catch (error) {
          setSignInState({ phase: "failed", message: describeError(error) });
          return;
        }

        if (result.status === "complete") {
          orderRef.current = null;
          setSignInState({ phase: "idle" });
          await refresh();
          return;
        }

        if (result.status === "failed") {
          setSignInState({ phase: "failed", message: hintToMessage(result.hintCode) });
          return;
        }

        setSignInState({ phase: "waiting", hintCode: result.hintCode, qrData: result.qrData });
      }

      setSignInState({ phase: "failed", message: "Det tog för lång tid. Försök igen." });
    } catch (error) {
      setSignInState({ phase: "failed", message: describeError(error) });
    }
  }, [refresh]);

  const cancelSignIn = useCallback(() => {
    cancelled.current = true;
    const ref = orderRef.current;
    orderRef.current = null;
    setSignInState({ phase: "idle" });
    if (ref) void getBackend().bankIdCancel(ref).catch(() => undefined);
  }, []);

  const signOut = useCallback(async () => {
    await getBackend().signOut();
    setProfile(null);
    setSignInState({ phase: "idle" });
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ loading, profile, signInState, signIn, cancelSignIn, signOut, refresh }),
    [loading, profile, signInState, signIn, cancelSignIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth måste användas inuti AuthProvider");
  return value;
}

/** BankID:s hintkoder översatta till något en människa kan läsa. */
function hintToMessage(hintCode?: string): string {
  switch (hintCode) {
    case "expiredTransaction":
      return "BankID hann gå ut. Försök igen.";
    case "userCancel":
    case "cancelled":
      return "Du avbröt inloggningen.";
    case "certificateErr":
      return "Ditt BankID gick inte att använda. Kontakta din bank.";
    case "startFailed":
      return "BankID kunde inte startas. Kontrollera att appen är installerad.";
    case "invalidParameters":
      return "Något blev fel med inloggningen. Försök igen.";
    default:
      return "Inloggningen misslyckades. Försök igen.";
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "Något gick fel.";
}

/** Väntetext under signering, så att skärmen inte bara står och snurrar. */
export function waitingMessage(hintCode?: string): string {
  switch (hintCode) {
    case "outstandingTransaction":
    case "noClient":
      return "Starta BankID-appen för att skriva under.";
    case "userSign":
      return "Skriv under i BankID-appen.";
    default:
      return "Väntar på BankID …";
  }
}
