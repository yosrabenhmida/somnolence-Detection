import Link from "next/link";
import { getSession } from "@/lib/auth";
import { findUserById } from "@/lib/users";
import { logout } from "@/app/auth/actions";
import styles from "./AccountMenu.module.css";

export default async function AccountMenu() {
  const session = await getSession();
  const user = session ? await findUserById(session.userId) : undefined;

  if (!user) {
    return (
      <div className={styles.menu}>
        <Link href="/auth/login" className={styles.link}>
          Se connecter
        </Link>
      </div>
    );
  }

  const initial = String(user.email).charAt(0).toUpperCase();

  return (
    <div className={styles.menu}>
      <details className={styles.details}>
        <summary className={styles.summary}>
          <span className={styles.avatar}>{initial}</span>
          <span className={styles.email}>{String(user.email)}</span>
        </summary>

        <div className={styles.dropdown}>
          <Link href="/settings" className={styles.item}>
            Réglages
          </Link>
          <Link href="/history" className={styles.item}>
            Historique
          </Link>
          <form action={logout}>
            <button type="submit" className={styles.item}>
              Se déconnecter
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
