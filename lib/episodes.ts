import "server-only";
import { getDb } from "./db";

export type EpisodeRow = {
  id: number;
  startedAt: number; // ms depuis 1970
  endedAt: number;
  maxLevel: "DROWSY" | "SLEEPY";
  notified: boolean;
  urgent: boolean;
  acknowledged: boolean;
};

let ready: Promise<unknown> | null = null;

async function table() {
  const db = await getDb();
  ready ??= db.execute(`CREATE TABLE IF NOT EXISTS episodes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    started_at   INTEGER NOT NULL,
    ended_at     INTEGER NOT NULL,
    max_level    TEXT    NOT NULL,
    notified     INTEGER NOT NULL DEFAULT 0,
    urgent       INTEGER NOT NULL DEFAULT 0,
    acknowledged INTEGER NOT NULL DEFAULT 0
  )`);
  await ready;
  return db;
}

export function parseEpisode(input: unknown): Omit<EpisodeRow, "id"> | string {
  if (typeof input !== "object" || input === null) return "Épisode invalide.";
  const r = input as Record<string, unknown>;
  const { startedAt, endedAt, maxLevel } = r;
  if (typeof startedAt !== "number" || typeof endedAt !== "number")
    return "Dates invalides.";
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt))
    return "Dates invalides.";
  if (endedAt < startedAt) return "La fin précède le début.";
  if (endedAt - startedAt > 24 * 3600_000) return "Durée irréaliste.";
  if (maxLevel !== "DROWSY" && maxLevel !== "SLEEPY") return "Niveau invalide.";
  return {
    startedAt,
    endedAt,
    maxLevel,
    notified: r.notified === true,
    urgent: r.urgent === true,
    acknowledged: r.acknowledged === true,
  };
}

export async function addEpisode(userId: number, e: Omit<EpisodeRow, "id">) {
  const db = await table();
  await db.execute({
    sql: `INSERT INTO episodes
          (user_id, started_at, ended_at, max_level, notified, urgent, acknowledged)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      userId,
      Math.round(e.startedAt),
      Math.round(e.endedAt),
      e.maxLevel,
      e.notified ? 1 : 0,
      e.urgent ? 1 : 0,
      e.acknowledged ? 1 : 0,
    ],
  });
}

export async function listEpisodes(
  userId: number,
  limit = 100,
): Promise<EpisodeRow[]> {
  const db = await table();
  const res = await db.execute({
    sql: `SELECT * FROM episodes WHERE user_id = ?
          ORDER BY started_at DESC LIMIT ?`,
    args: [userId, limit],
  });
  return res.rows.map((r) => ({
    id: Number(r.id),
    startedAt: Number(r.started_at),
    endedAt: Number(r.ended_at),
    maxLevel: String(r.max_level) as "DROWSY" | "SLEEPY",
    notified: Number(r.notified) === 1,
    urgent: Number(r.urgent) === 1,
    acknowledged: Number(r.acknowledged) === 1,
  }));
}
