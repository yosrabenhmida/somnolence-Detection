import Link from "next/link";
import { getSession } from "@/lib/auth";
import { findUserById } from "@/lib/users";
import { logout } from "@/app/auth/actions";
import styles from "./SideRail.module.css";

type Active = "monitor" | "history" | "settings";

export default async function SideRail({ active }: { active: Active }) {
  const session = await getSession();
  const user = session ? await findUserById(session.userId) : undefined;
  const email = user ? String(user.email) : null;

  const item = (name: Active) =>
    `${styles.item} ${active === name ? styles.active : ""}`;

  return (
    <nav className={styles.rail} aria-label="Navigation principale">
      <div className={styles.top}>
        <Link
          href="/monitor"
          className={item("monitor")}
          aria-label="Surveillance"
          aria-current={active === "monitor" ? "page" : undefined}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </Link>

        <Link
          href="/history"
          className={item("history")}
          aria-label="Historique"
          aria-current={active === "history" ? "page" : undefined}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
            <path d="M12 8v4l3 2" />
          </svg>
        </Link>

        <Link
          href="/settings"
          className={item("settings")}
          aria-label="Réglages"
          aria-current={active === "settings" ? "page" : undefined}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h10" />
            <path d="M18 7h2" />
            <circle cx="16" cy="7" r="2" />
            <path d="M4 17h2" />
            <path d="M10 17h10" />
            <circle cx="8" cy="17" r="2" />
          </svg>
        </Link>
      </div>

      {email ? (
        <details className={styles.account}>
          <summary className={styles.avatar} aria-label="Mon compte">
            {email.charAt(0).toUpperCase()}
          </summary>
          <div className={styles.dropdown}>
            <span className={styles.email}>{email}</span>
            <form action={logout}>
              <button type="submit" className={styles.logout}>
                Se déconnecter
              </button>
            </form>
          </div>
        </details>
      ) : (
        <Link
          href="/auth/login"
          className={styles.item}
          aria-label="Se connecter"
        >
          ?
        </Link>
      )}
    </nav>
  );
}
