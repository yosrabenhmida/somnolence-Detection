"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions";
import styles from "../auth.module.css";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Connexion</h1>

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
            Mot de passe
            <input
              className={styles.input}
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>

          {state?.error && <p className={styles.error}>{state.error}</p>}

          <button className={styles.button} type="submit" disabled={pending}>
            {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className={styles.switch}>
          Pas encore de compte ?{" "}
          <Link href="/auth/signup">S&apos;inscrire</Link>
        </p>
      </div>
    </main>
  );
}
