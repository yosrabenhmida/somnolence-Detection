"use client";
import type { EpisodeRow } from "@/lib/episodes";
import styles from "@/app/history/history.module.css";

function duration(ms: number) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}

export default function EpisodeList({ episodes }: { episodes: EpisodeRow[] }) {
  const urgentCount = episodes.filter((e) => e.urgent).length;
  const ackCount = episodes.filter((e) => e.acknowledged).length;

  return (
    <>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{episodes.length}</span>
          <span className={styles.statLabel}>Épisodes</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{urgentCount}</span>
          <span className={styles.statLabel}>Alertes urgentes</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{ackCount}</span>
          <span className={styles.statLabel}>Confirmés « Je vais bien »</span>
        </div>
      </div>

      {episodes.length === 0 ? (
        <p className={styles.empty}>
          Aucun épisode enregistré pour l&apos;instant.
        </p>
      ) : (
        <ul className={styles.list}>
          {episodes.map((e) => (
            <li
              key={e.id}
              className={`${styles.item} ${
                e.maxLevel === "SLEEPY" ? styles.sleepy : styles.drowsy
              }`}
            >
              <div className={styles.main}>
                <span className={styles.date}>
                  {new Date(e.startedAt).toLocaleString("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                <span className={styles.meta}>
                  <span className={styles.level}>{e.maxLevel}</span>
                  {duration(e.endedAt - e.startedAt)}
                </span>
              </div>
              <div className={styles.tags}>
                <span
                  className={`${styles.tag} ${e.urgent ? styles.tagUrgent : ""}`}
                >
                  {e.urgent
                    ? "Alerte urgente"
                    : e.notified
                      ? "Proche notifié"
                      : "Alarme seulement"}
                </span>
                {e.acknowledged && (
                  <span className={`${styles.tag} ${styles.tagOk}`}>
                    Confirmé
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
