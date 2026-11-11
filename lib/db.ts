import "server-only";
import { createClient } from "@libsql/client";

const client = createClient({ url: "file:somnolence.db" });

let ready: Promise<unknown> | null = null;

// Crée les tables au premier appel, puis renvoie le client
export async function getDb() {
  if (!ready) {
    ready = client.batch(
      [
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          ntfy_topic TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS settings (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          data TEXT NOT NULL
        )`,
      ],
      "write",
    );
  }
  await ready;
  return client;
}
