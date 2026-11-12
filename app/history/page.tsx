import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { listEpisodes } from "@/lib/episodes";
import EpisodeList from "@/components/EpisodeList";
import styles from "./history.module.css";

async function HistoryContent() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const episodes = await listEpisodes(session.userId);

  return (
    <main className={styles.page}>
      <header>
        <h1 className={styles.title}>Historique</h1>
        <p className={styles.subtitle}>
          Les moments où la somnolence a été détectée.
        </p>
        <Link href="/monitor" className={styles.back}>
          ← Retour à la surveillance
        </Link>
      </header>
      <EpisodeList episodes={episodes} />
    </main>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<main className={styles.page}>Chargement…</main>}>
      <HistoryContent />
    </Suspense>
  );
}
