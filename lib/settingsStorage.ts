import { DEFAULT_THRESHOLDS } from "./config";
import type { Thresholds } from "./types";

const ENDPOINT = "/api/settings";

export async function loadThresholds(): Promise<Thresholds> {
  try {
    const r = await fetch(ENDPOINT, { cache: "no-store" });
    if (!r.ok) return DEFAULT_THRESHOLDS;
    const data = await r.json();
    return { ...DEFAULT_THRESHOLDS, ...(data?.thresholds ?? {}) };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

// Retourne true si l'enregistrement a réussi
export async function saveThresholds(t: Thresholds): Promise<boolean> {
  try {
    const r = await fetch(ENDPOINT, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thresholds: t }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// Pas de DELETE côté API : on réenregistre les valeurs par défaut
export async function resetThresholds(): Promise<boolean> {
  return saveThresholds(DEFAULT_THRESHOLDS);
}

// Retourne un message d'erreur, ou null si tout est valide
export function validateThresholds(t: Thresholds): string | null {
  if (!(t.earThreshold >= 0.05 && t.earThreshold <= 0.4))
    return "Seuil EAR : une valeur entre 0,05 et 0,40.";
  if (!(t.windowSeconds >= 5 && t.windowSeconds <= 120))
    return "Fenêtre : une valeur entre 5 et 120 secondes.";
  if (!(t.perclosDrowsy > 0 && t.perclosDrowsy < 1))
    return "PERCLOS DROWSY : une valeur entre 1 % et 99 %.";
  if (!(t.perclosSleepy > t.perclosDrowsy && t.perclosSleepy <= 1))
    return "PERCLOS SLEEPY doit être supérieur à DROWSY et au plus 100 %.";
  if (!(t.closedSecondsSleepy >= 1 && t.closedSecondsSleepy <= 30))
    return "Fermeture continue : une valeur entre 1 et 30 secondes.";
  return null;
}
