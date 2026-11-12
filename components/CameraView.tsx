import type { RefObject } from "react";
import styles from "./CameraView.module.css";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  ear: number | null;
  closedFor: number;
  noFaceFor: number;
  status: string;
};

export default function CameraView({
  videoRef,
  ear,
  closedFor,
  noFaceFor,
  status,
}: Props) {
  return (
    <div className={styles.card}>
      <video ref={videoRef} className={styles.video} muted playsInline />

      <span className={`${styles.corner} ${styles.tl}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.tr}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.bl}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.br}`} aria-hidden="true" />

      <span className={styles.top}>{status}</span>

      <div className={styles.bottom}>
        <span className={styles.chip}>
          EAR {ear === null ? "aucun visage" : ear.toFixed(3)}
        </span>
        <span className={styles.chip}>
          Yeux fermés {closedFor.toFixed(1)} s
        </span>
      </div>

      {noFaceFor > 0 && (
        <div className={styles.noFace}>
          Visage absent depuis {noFaceFor.toFixed(1)} s
        </div>
      )}
    </div>
  );
}
