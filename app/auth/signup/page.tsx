"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "../actions";
import styles from "../auth.module.css";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Créer un compte</h1>

        <form action={action} className={styles.form}>
          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>

          <label className={styles.label}>
            Mot de passe (8 caractères minimum)
            <input
              className={styles.input}
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <label className={styles.label}>
            Confirmer le mot de passe
            <input
              className={styles.input}
              type="password"
              name="confirm"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          {state?.error && <p className={styles.error}>{state.error}</p>}

          <button className={styles.button} type="submit" disabled={pending}>
            {pending ? "Création…" : "Créer mon compte"}
          </button>
        </form>

        <p className={styles.switch}>
          Déjà un compte ? <Link href="/auth/login">Se connecter</Link>
        </p>
      </div>
    </main>
  );
}
