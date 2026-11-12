"use client";

import { useEffect, useState } from "react";

export type WakeLockState = "pending" | "active" | "inactive" | "unsupported";

// Demande au navigateur de garder l'écran allumé tant que la page est visible
export function useWakeLock(): WakeLockState {
  const [state, setState] = useState<WakeLockState>("pending");

  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      await Promise.resolve();
      if (cancelled) return;

      if (!("wakeLock" in navigator)) {
        setState("unsupported");
        return;
      }
      if (document.visibilityState !== "visible") return;

      try {
        const s = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void s.release();
          return;
        }
        sentinel = s;
        setState("active");
        s.addEventListener("release", () => {
          if (sentinel === s) {
            sentinel = null;
            setState("inactive");
          }
        });
      } catch {
        setState("inactive");
      }
    };

    // Le verrou est perdu quand la page passe en arrière-plan : on le redemande au retour
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !sentinel) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release();
    };
  }, []);

  return state;
}

// Mesure combien de temps la page est restée en arrière-plan (au moins 2 s)
export function useBackgroundGap() {
  const [gap, setGap] = useState<number | null>(null);

  useEffect(() => {
    let hiddenAt: number | null = null;

    const onChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (hiddenAt !== null) {
        const seconds = (Date.now() - hiddenAt) / 1000;
        hiddenAt = null;
        if (seconds >= 2) setGap(seconds);
      }
    };

    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return { gap, dismiss: () => setGap(null) };
}
