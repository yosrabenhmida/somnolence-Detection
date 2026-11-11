"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { eyeAspectRatio, LEFT_EYE, RIGHT_EYE } from "@/lib/ear";
import { ESCALATION } from "@/lib/escalation";
import { loadThresholds } from "@/lib/settingsStorage";
import { PERCLOSCalculator } from "@/lib/perclos";
import { DrowsinessClassifier } from "@/lib/classifier";
import { EscalationManager, type EscalationAction } from "@/lib/escalation";
import { alarm } from "@/lib/alarm";
import type { AlertLevel, Thresholds } from "@/lib/types";

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

const COLORS: Record<AlertLevel, string> = {
  NORMAL: "#16a34a",
  DROWSY: "#ea580c",
  SLEEPY: "#dc2626",
};

async function postAlert(stage: EscalationAction): Promise<string> {
  try {
    const r = await fetch("/api/alerts/escalate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (r.ok) {
      return stage === "NOTIFY"
        ? "Notification envoyée sur le téléphone."
        : "Alerte URGENTE envoyée sur le téléphone.";
    }
    if (r.status === 429)
      return "Alerte déjà envoyée il y a peu (limite anti-spam).";
    return `Échec de l'envoi (code ${r.status}). Vérifie NTFY_TOPIC dans .env.local.`;
  } catch {
    return "Échec de l'envoi : serveur injoignable.";
  }
}

export default function MonitorPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ear, setEar] = useState<number | null>(null);
  const [perclos, setPerclos] = useState(0);
  const [closedFor, setClosedFor] = useState(0);
  const [noFaceFor, setNoFaceFor] = useState(0);
  const [level, setLevel] = useState<AlertLevel>("NORMAL");
  const [status, setStatus] = useState("Chargement du modèle...");
  const [soundOn, setSoundOn] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [active, setActive] = useState<Thresholds | null>(null);

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

          const action = escalation.update(now, effective, eyesClosedNow);
          if (action) {
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
    };
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Surveillance du conducteur</h1>
      <p>
        <Link href="/settings">Réglages →</Link>
      </p>
      <p>{status}</p>
      <video
        ref={videoRef}
        style={{ width: 480, transform: "scaleX(-1)" }}
        muted
        playsInline
      />
      <div
        style={{
          width: 480,
          marginTop: 12,
          padding: 12,
          textAlign: "center",
          fontSize: 28,
          fontWeight: 700,
          color: "white",
          background: COLORS[level],
          borderRadius: 8,
        }}
      >
        {level}
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <button
          onClick={toggleSound}
          style={{ padding: "10px 18px", fontSize: 16 }}
        >
          {soundOn ? "Couper le son" : "Activer le son"}
        </button>
        <button
          onClick={testNotification}
          style={{ padding: "10px 18px", fontSize: 16 }}
        >
          Tester la notification
        </button>
      </div>
      {!soundOn && (
        <p style={{ color: "#ea580c" }}>
          Son désactivé : aucune alarme ne sonnera.
        </p>
      )}
      {alertMsg && <p style={{ fontSize: 18 }}>{alertMsg}</p>}

      <p style={{ fontSize: 22 }}>
        EAR : {ear === null ? "aucun visage détecté" : ear.toFixed(3)}
      </p>
      <p style={{ fontSize: 22 }}>PERCLOS : {(perclos * 100).toFixed(0)} %</p>
      <p style={{ fontSize: 22 }}>
        Yeux fermés depuis : {closedFor.toFixed(1)} s
      </p>
      {noFaceFor > 0 && (
        <p style={{ fontSize: 22 }}>
          Visage absent depuis : {noFaceFor.toFixed(1)} s
        </p>
      )}
      {active && (
        <p style={{ fontSize: 15, opacity: 0.7 }}>
          Seuils actifs : EAR &lt; {active.earThreshold} · fenêtre{" "}
          {active.windowSeconds} s · DROWSY ≥{" "}
          {Math.round(active.perclosDrowsy * 100)} % · SLEEPY ≥{" "}
          {Math.round(active.perclosSleepy * 100)} % ou{" "}
          {active.closedSecondsSleepy} s fermés
        </p>
      )}
    </main>
  );
}
