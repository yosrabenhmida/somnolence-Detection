import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getUserThresholds,
  parseThresholds,
  saveUserThresholds,
} from "@/lib/settings";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  }
  const thresholds = await getUserThresholds(session.userId);
  return NextResponse.json({ thresholds });
}

export async function PUT(req: Request) {
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

  const parsed = parseThresholds(
    (body as { thresholds?: unknown } | null)?.thresholds,
  );
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  await saveUserThresholds(session.userId, parsed);
  return NextResponse.json({ ok: true });
}


