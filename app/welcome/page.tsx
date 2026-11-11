import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { finishWelcome } from "../auth/actions";
import styles from "../auth/auth.module.css";

async function WelcomeContent() {
  const topic = (await cookies()).get("ntfy_reveal")?.value;
  // Déjà vu (ou expiré) : on ne le remontre pas
  if (!topic) redirect("/monitor");

  return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Ton canal d&apos;alertes</h1>

        <p className={styles.text}>
          Voici ton canal ntfy personnel. Il ne sera affiché{" "}
          <strong>qu&apos;une seule fois</strong> : note-le maintenant.
        </p>

        <code className={styles.code}>{topic}</code>

        <ol className={styles.steps}>
          <li>
            Installe l&apos;application <strong>ntfy</strong> sur ton téléphone
            (ou celui du proche à alerter).
          </li>
          <li>
            Appuie sur <strong>+</strong> (s&apos;abonner à un canal).
          </li>
          <li>Colle le nom ci-dessus, puis valide.</li>
        </ol>

        <p className={styles.text}>
          Ne le partage qu&apos;avec les personnes qui doivent recevoir les
          alertes : quiconque connaît ce nom peut les lire.
        </p>

        <form action={finishWelcome}>
          <button
            className={styles.button}
            type="submit"
            style={{ width: "100%" }}
          >
            J&apos;ai noté mon canal, continuer
          </button>
        </form>
      </div>
    </main>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeContent />
    </Suspense>
  );
}
