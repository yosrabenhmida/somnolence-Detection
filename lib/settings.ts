import "server-only";
import { getDb } from "./db";
import { DEFAULT_THRESHOLDS } from "./config";
import type { Thresholds } from "./types";

const KEYS = [
  "earThreshold",
  "windowSeconds",
  "perclosDrowsy",
  "perclosSleepy",
  "closedSecondsSleepy",
] as const;

// Valide un objet venu du navigateur. Renvoie les réglages propres, ou un message d'erreur.
export function parseThresholds(input: unknown): Thresholds | string {
  if (typeof input !== "object" || input === null) {
    return "Réglages invalides.";
  }
  const raw = input as Record<string, unknown>;
  const out: Record<string, number> = {};

  for (const k of KEYS) {
    const v = raw[k];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      return `Valeur invalide pour ${k}.`;
    }
    out[k] = v;
  }

  const t = out as unknown as Thresholds;

  if (t.earThreshold <= 0.05 || t.earThreshold >= 0.5)
    return "Le seuil EAR doit être entre 0,05 et 0,5.";
  if (t.windowSeconds < 5 || t.windowSeconds > 300)
    return "La fenêtre doit être entre 5 et 300 secondes.";
  if (t.perclosDrowsy <= 0 || t.perclosDrowsy >= 1)
    return "Le PERCLOS DROWSY doit être entre 0 % et 100 %.";
  if (t.perclosSleepy <= 0 || t.perclosSleepy > 1)
    return "Le PERCLOS SLEEPY doit être entre 0 % et 100 %.";
  if (t.perclosSleepy <= t.perclosDrowsy)
    return "Le seuil SLEEPY doit être supérieur à celui de DROWSY.";
  if (t.closedSecondsSleepy < 1 || t.closedSecondsSleepy > 60)
    return "La fermeture continue doit être entre 1 et 60 secondes.";

  return t;
}

export async function getUserThresholds(userId: number): Promise<Thresholds> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT data FROM settings WHERE user_id = ?",
    args: [userId],
  });
  const row = result.rows[0];
  if (!row) return DEFAULT_THRESHOLDS;

  try {
    const parsed = parseThresholds(JSON.parse(String(row.data)));
    return typeof parsed === "string" ? DEFAULT_THRESHOLDS : parsed;
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

export async function saveUserThresholds(userId: number, t: Thresholds) {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO settings (user_id, data) VALUES (?, ?)
          ON CONFLICT(user_id) DO UPDATE SET data = excluded.data`,
    args: [userId, JSON.stringify(t)],
  });
}
