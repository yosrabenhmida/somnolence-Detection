import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addEpisode, listEpisodes, parseEpisode } from "@/lib/episodes";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  }
  return NextResponse.json({ episodes: await listEpisodes(session.userId) });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = parseEpisode(body);
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  await addEpisode(session.userId, parsed);
  return NextResponse.json({ ok: true });
}
