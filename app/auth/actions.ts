"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createUser, findUserByEmail, verifyPassword } from "@/lib/users";
import { createSession, destroySession } from "@/lib/auth";

export type FormState = { error?: string } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signup(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!EMAIL_RE.test(email)) return { error: "Adresse email invalide." };
  if (password.length < 8)
    return { error: "Le mot de passe doit faire au moins 8 caractères." };
  if (password !== confirm)
    return { error: "Les mots de passe ne correspondent pas." };

  if (await findUserByEmail(email))
    return { error: "Un compte existe déjà avec cet email." };

  let userId: number;
  let ntfyTopic: string;
  try {
    ({ id: userId, ntfyTopic } = await createUser(email, password));
  } catch {
    return { error: "Impossible de créer le compte. Réessaie." };
  }

  await createSession(userId);

  // Cookie temporaire : sert uniquement à montrer le canal une fois
  (await cookies()).set("ntfy_reveal", ntfyTopic, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  redirect("/welcome");
}

export async function login(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await findUserByEmail(email);
  const ok = user ? await verifyPassword(password, user.password_hash) : false;

  // Même message dans les deux cas : on ne révèle pas si l'email existe
  if (!user || !ok) return { error: "Email ou mot de passe incorrect." };

  await createSession(Number(user.id));
  redirect("/monitor");
}

export async function logout() {
  await destroySession();
  redirect("/auth/login");
}

export async function finishWelcome() {
  (await cookies()).delete("ntfy_reveal");
  redirect("/monitor");
}
