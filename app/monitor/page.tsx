"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { eyeAspectRatio, LEFT_EYE, RIGHT_EYE } from "@/lib/ear";
import { ESCALATION } from "@/lib/escalation";
import { loadThresholds } from "@/lib/settingsStorage";
import { PERCLOSCalculator } from "@/lib/perclos";
import { DrowsinessClassifier } from "@/lib/classifier";
import { EscalationManager, type EscalationAction } from "@/lib/escalation";
import { alarm } from "@/lib/alarm";
import { useBackgroundGap, useWakeLock } from "@/lib/useKeepAwake";
import type { AlertLevel, Thresholds } from "@/lib/types";
import CameraView from "@/components/CameraView";
import StatusBadge, { LEVEL_COLORS } from "@/components/StatusBadge";
import styles from "./dashboard.module.css";
type OpenEpisode = {
  startedAt: number;
  maxLevel: "DROWSY" | "SLEEPY";
  notified: boolean;
  urgent: boolean;
};

function saveEpisode(ep: OpenEpisode, acknowledged: boolean) {
  const endedAt = Date.now();
  if (endedAt - ep.startedAt < 3000) return; // ignore les micro-épisodes
  fetch("/api/episodes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...ep, endedAt, acknowledged }),
    keepalive: true,
  }).catch(() => {});
}
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("TensorFlow Lite XNNPACK delegate")
    ) {
      return;
    }
    originalError(...args);
  };
}

type AlertStage = EscalationAction | "OK";

async function postAlert(stage: AlertStage): Promise<string> {
  try {
    const r = await fetch("/api/alerts/escalate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (r.ok) {
      if (stage === "OK") return "Ton proche a été prévenu que tu vas bien.";
      return stage === "NOTIFY"
        ? "Notification envoyée sur le téléphone."
        : "Alerte URGENTE envoyée sur le téléphone.";
    }
    if (r.status === 401) return "Session expirée : reconnecte-toi.";
    if (r.status === 429)
      return "Message déjà envoyé il y a peu (limite anti-spam).";
    return `Échec de l'envoi (code ${r.status}).`;
  } catch {
    return "Échec de l'envoi : serveur injoignable.";
  }
}

const RING_LENGTH = 628.3; // 2 * PI * 100

function VigilanceRing({ open, color }: { open: number; color: string }) {
  const value = Math.max(0, Math.min(1, open));
  return (
    <div className={styles.ring}>
      <svg
        width="230"
        height="230"
        viewBox="0 0 230 230"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="115" cy="115" r="100" stroke="#1d2530" strokeWidth="16" />
        <circle
          cx="115"
          cy="115"
          r="100"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${value * RING_LENGTH} ${RING_LENGTH}`}
          transform="rotate(-90 115 115)"
          style={{ transition: "stroke-dasharray 0.4s, stroke 0.3s" }}
        />
      </svg>
      <div className={styles.ringCenter}>
        <span className={styles.ringValue}>{Math.round(value * 100)} %</span>
        <span className={styles.ringLabel}>yeux ouverts</span>
      </div>
    </div>
  );
}

export default function MonitorPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const calcRef = useRef<PERCLOSCalculator | null>(null);
  const escalationRef = useRef<EscalationManager | null>(null);
  const alertSentRef = useRef(false);
  const episodeRef = useRef<OpenEpisode | null>(null);
  const wakeLock = useWakeLock();
  const { gap, dismiss } = useBackgroundGap();

  const [ear, setEar] = useState<number | null>(null);
  const [perclos, setPerclos] = useState(0);
  const [closedFor, setClosedFor] = useState(0);
  const [noFaceFor, setNoFaceFor] = useState(0);
  const [level, setLevel] = useState<AlertLevel>("NORMAL");
  const [status, setStatus] = useState("Chargement du modèle...");
  const [soundOn, setSoundOn] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [active, setActive] = useState<Thresholds | null>(null);
  const [lastStage, setLastStage] = useState<EscalationAction | null>(null);

  const toggleSound = () => {
    if (soundOn) {
      alarm.disable();
      setSoundOn(false);
    } else {
      alarm.enable();
      setSoundOn(true);
    }
  };

  const testNotification = async () => {
    setAlertMsg("Envoi du test...");
    setAlertMsg(await postAlert("NOTIFY"));
  };

  // Bouton « Je vais bien » : coupe l'alarme, remet tout à zéro, prévient le proche
  const confirmAwake = async () => {
    calcRef.current?.reset();
    escalationRef.current?.reset();
    alarm.stop();
    if (episodeRef.current) {
      saveEpisode(episodeRef.current, true);
      episodeRef.current = null;
    }
    setLastStage(null);

    if (alertSentRef.current) {
      alertSentRef.current = false;
      setAlertMsg("Envoi de la confirmation...");
      setAlertMsg(await postAlert("OK"));
    } else {
      setAlertMsg(null);
    }
  };

  useEffect(() => {
    let landmarker: FaceLandmarker | null = null;
    let raf = 0;
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function init() {
      // Seuils de l'utilisateur, lus dans la base via /api/settings
      const th = await loadThresholds();
      if (cancelled) return;
      setActive(th);

      const calc = new PERCLOSCalculator(th.windowSeconds * 1000);
      const classifier = new DrowsinessClassifier(th);
      const escalation = new EscalationManager(ESCALATION);
      calcRef.current = calc;
      escalationRef.current = escalation;

      const fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
      );
      landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        },
        runningMode: "VIDEO",
        numFaces: 1,
      });

      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (cancelled || !videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        landmarker?.close();
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("Détection en cours");

      let lastFace = performance.now();

      const loop = () => {
        const video = videoRef.current;
        if (video && landmarker && video.readyState >= 2) {
          const now = performance.now();
          const res = landmarker.detectForVideo(video, now);
          const lm = res.faceLandmarks[0];

          let effective: AlertLevel;
          let eyesClosedNow: boolean;

          if (lm) {
            lastFace = now;
            const right = eyeAspectRatio(RIGHT_EYE.map((i) => lm[i]));
            const left = eyeAspectRatio(LEFT_EYE.map((i) => lm[i]));
            const avg = (left + right) / 2;

            eyesClosedNow = avg < th.earThreshold;
            calc.add(now, eyesClosedNow);
            effective = classifier.classify(calc);

            setEar(avg);
            setPerclos(calc.perclos());
            setClosedFor(calc.closedSeconds());
            setNoFaceFor(0);
          } else {
            calc.reset();
            const missing = (now - lastFace) / 1000;
            // visage absent trop longtemps : on ne peut plus surveiller, donc alerte
            effective =
              missing >= ESCALATION.noFaceSeconds ? "SLEEPY" : "NORMAL";
            eyesClosedNow = true;

            setEar(null);
            setPerclos(0);
            setClosedFor(0);
            setNoFaceFor(missing);
          }

          setLevel(effective);
          alarm.set(effective);
          const ep = episodeRef.current;
          if (effective !== "NORMAL") {
            if (!ep) {
              episodeRef.current = {
                startedAt: Date.now(),
                maxLevel: effective,
                notified: false,
                urgent: false,
              };
            } else if (effective === "SLEEPY") {
              ep.maxLevel = "SLEEPY";
            }
          } else if (ep) {
            saveEpisode(ep, false);
            episodeRef.current = null;
          }

          const action = escalation.update(now, effective, eyesClosedNow);
          if (action) {
            alertSentRef.current = true;
            setLastStage(action);
            if (episodeRef.current) {
              episodeRef.current.notified = true;
              if (action === "URGENT") episodeRef.current.urgent = true;
            }
            postAlert(action).then(setAlertMsg);
          }
        }
        raf = requestAnimationFrame(loop);
      };
      loop();
    }

    init().catch(() => setStatus("Erreur : caméra ou modèle indisponible"));

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
      alarm.stop();
      if (episodeRef.current) {
        saveEpisode(episodeRef.current, false);
        episodeRef.current = null;
      }
    };
  }, []);

  const color = LEVEL_COLORS[level];
  const notified = lastStage === "NOTIFY" || lastStage === "URGENT";
  const urgent = lastStage === "URGENT";
  // Le bouton reste visible tant qu'une alarme sonne ou qu'une alerte n'a pas été confirmée
  const needsAck = level !== "NORMAL" || lastStage !== null;

  return (
    <main
      className={styles.page}
      style={{ "--accent": color } as CSSProperties}
    >
      <header className={styles.header}>
        <h1 className={styles.title}>Surveillance du conducteur</h1>
        <span className={styles.live}>
          <span className={styles.dot} />
          {status}
        </span>
      </header>

      {gap !== null && (
        <div className={styles.banner} role="alert">
          <span>
            Surveillance interrompue pendant {Math.round(gap)} s : la page était
            en arrière-plan. Garde cet onglet au premier plan.
          </span>
          <button
            type="button"
            onClick={dismiss}
            className={styles.bannerButton}
          >
            OK
          </button>
        </div>
      )}

      {(wakeLock === "unsupported" || wakeLock === "inactive") && (
        <div className={styles.banner} role="status">
          <span>
            {wakeLock === "unsupported"
              ? "Ce navigateur ne peut pas garder l'écran allumé : désactive la mise en veille de l'appareil."
              : "L'écran n'est plus maintenu allumé : il peut s'éteindre et arrêter la surveillance."}
          </span>
        </div>
      )}

      <div className={styles.grid}>
        <CameraView
          videoRef={videoRef}
          ear={ear}
          closedFor={closedFor}
          noFaceFor={noFaceFor}
          status={status}
        />

        <div className={styles.side}>
          <section className={styles.ringCard}>
            <VigilanceRing open={1 - perclos} color={color} />
            <StatusBadge level={level} />
          </section>

          {needsAck && (
            <button type="button" onClick={confirmAwake} className={styles.ack}>
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m5 12 5 5L20 7" />
              </svg>
              Je vais bien
            </button>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={toggleSound}
              className={styles.button}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11 5 6 9H2v6h4l5 4z" />
                {soundOn ? (
                  <path d="M16 9a4 4 0 0 1 0 6" />
                ) : (
                  <path d="m17 9 5 6m0-6-5 6" />
                )}
              </svg>
              {soundOn ? "Couper le son" : "Activer le son"}
            </button>
            <button
              type="button"
              onClick={testNotification}
              className={styles.button}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
              </svg>
              Tester la notification
            </button>
          </div>

          {!soundOn && (
            <p className={styles.warn}>
              Son désactivé : aucune alarme ne sonnera.
            </p>
          )}
          {alertMsg && (
            <p className={styles.msg} role="status">
              {alertMsg}
            </p>
          )}

          <ol className={styles.chain} aria-label="Chaîne d'alerte">
            <li
              className={`${styles.step} ${level !== "NORMAL" ? styles.on : ""}`}
            >
              <i /> Alarme
            </li>
            <li className={`${styles.step} ${notified ? styles.on : ""}`}>
              <i /> Notification
            </li>
            <li className={`${styles.step} ${urgent ? styles.on : ""}`}>
              <i /> Urgent
            </li>
          </ol>

          {active && (
            <p className={styles.hint}>
              Seuils actifs : EAR &lt; {active.earThreshold} · fenêtre{" "}
              {active.windowSeconds} s · DROWSY ≥{" "}
              {Math.round(active.perclosDrowsy * 100)} % · SLEEPY ≥{" "}
              {Math.round(active.perclosSleepy * 100)} % ou{" "}
              {active.closedSecondsSleepy} s fermés
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
