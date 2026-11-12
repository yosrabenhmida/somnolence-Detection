// Envoie l'alerte ntfy au canal de l'utilisateur connecté

import { NextResponse } from "next/server";
import { sendNtfy, type NtfyMessage } from "@/lib/ntfy";
import { getSession } from "@/lib/auth";
import { findUserById } from "@/lib/users";

const MIN_GAP_MS = 20_000; // anti-spam : un envoi par type et par utilisateur toutes les 20 s
const lastSent = new Map<string, number>();

export async function POST(req: Request) {
  // 1. Il faut une session valide, sinon on refuse tout de suite
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  }
  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  }

  // 2. Lecture et validation du corps
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const stage = (body as { stage?: unknown } | null)?.stage;
  if (stage !== "NOTIFY" && stage !== "URGENT" && stage !== "OK") {
    return NextResponse.json({ error: "stage invalide" }, { status: 400 });
  }

  // 3. Anti-spam par utilisateur
  const key = `${user.id}:${stage}`;
  const now = Date.now();
  if (now - (lastSent.get(key) ?? 0) < MIN_GAP_MS) {
    return NextResponse.json({ error: "trop fréquent" }, { status: 429 });
  }
  lastSent.set(key, now);

  // 4. Construction du message
  const time = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Tunis" });
  const msg: NtfyMessage =
    stage === "NOTIFY"
      ? {
          title: "Alerte somnolence",
          message: `Le conducteur ne réagit pas à l'alarme (${time}). Merci de le contacter.`,
          priority: 4,
          tags: ["warning"],
        }
      : stage === "URGENT"
        ? {
            title: "URGENT - somnolence",
            message: `Toujours aucune réaction du conducteur (${time}). Appelez-le maintenant.`,
            priority: 5,
            tags: ["rotating_light"],
          }
        : {
            title: "Conducteur réveillé",
            message: `Le conducteur confirme qu'il va bien (${time}).`,
            priority: 3,
            tags: ["white_check_mark"],
          };

  // TEMPORAIRE (à supprimer après le test) : affiche ton canal dans le terminal
  console.log("ntfy topic:", String(user.ntfy_topic));

  // 5. Envoi au canal de CET utilisateur
  try {
    await sendNtfy(String(user.ntfy_topic), msg);
  } catch (err) {
    console.error("ntfy error:", stage, err);
    return NextResponse.json({ error: "échec de l'envoi" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
