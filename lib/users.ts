import "server-only";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { getDb } from "./db";

export type User = {
  id: number;
  email: string;
  password_hash: string;
  ntfy_topic: string;
};

export async function findUserByEmail(email: string) {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email.trim().toLowerCase()],
  });
  return result.rows[0] as unknown as User | undefined;
}

export async function findUserById(id: number) {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [id],
  });
  return result.rows[0] as unknown as User | undefined;
}

export async function createUser(email: string, password: string) {
  const db = await getDb();
  const passwordHash = await bcrypt.hash(password, 12);
  // Canal ntfy aléatoire et impossible à deviner
  const ntfyTopic = "somnolence-" + randomBytes(16).toString("hex");

  const result = await db.execute({
    sql: "INSERT INTO users (email, password_hash, ntfy_topic) VALUES (?, ?, ?)",
    args: [email.trim().toLowerCase(), passwordHash, ntfyTopic],
  });

  return { id: Number(result.lastInsertRowid), ntfyTopic };
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
