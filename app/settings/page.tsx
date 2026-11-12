"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DEFAULT_THRESHOLDS } from "@/lib/config";
import {
  loadThresholds,
  saveThresholds,
  resetThresholds,
  validateThresholds,
} from "@/lib/settingsStorage";
import type { Thresholds } from "@/lib/types";
import styles from "./settings.module.css";

function Field(props: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  suffix?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldText}>
        <span className={styles.label}>{props.label}</span>
        <span className={styles.hint}>{props.hint}</span>
      </span>
      <span className={styles.inputWrap}>
        <input
          className={styles.input}
          type="number"
          step={props.step}
          value={Number.isNaN(props.value) ? "" : props.value}
          onChange={(e) => props.onChange(parseFloat(e.target.value))}
        />
        <span className={styles.suffix}>{props.suffix}</span>
      </span>
    </label>
  );
}

function SettingsForm({ initial }: { initial: Thresholds }) {
  const [t, setT] = useState<Thresholds>(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof Thresholds, value: number) =>
    setT((prev) => ({ ...prev, [key]: value }));

  const onSave = async () => {
    const error = validateThresholds(t);
    if (error) {
      setIsError(true);
      setMessage(error);
      return;
    }
    setBusy(true);
    const ok = await saveThresholds(t);
    setBusy(false);
    setIsError(!ok);
    setMessage(
      ok
        ? "Réglages enregistrés."
        : "Échec de l'enregistrement (es-tu connecté ?).",
    );
  };

  const onReset = async () => {
    setBusy(true);
    const ok = await resetThresholds();
    setBusy(false);
    if (ok) {
      setT(DEFAULT_THRESHOLDS);
      setIsError(false);
      setMessage("Valeurs par défaut rétablies.");
    } else {
      setIsError(true);
      setMessage("Échec de la réinitialisation (es-tu connecté ?).");
    }
  };

  return (
    <>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Détection des yeux</h2>
        <Field
          label="Seuil EAR"
          hint="Un œil est considéré fermé quand l'EAR passe sous cette valeur."
          value={t.earThreshold}
          step={0.01}
          onChange={(v) => set("earThreshold", v)}
        />
        <hr className={styles.divider} />
        <Field
          label="Fenêtre du PERCLOS"
          hint="Durée sur laquelle on mesure la part du temps yeux fermés."
          value={t.windowSeconds}
          step={1}
          suffix="secondes"
          onChange={(v) => set("windowSeconds", v)}
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Niveaux d&apos;alerte</h2>
        <Field
          label="PERCLOS pour DROWSY"
          hint="Part du temps yeux fermés à partir de laquelle l'état passe à DROWSY."
          value={Math.round(t.perclosDrowsy * 100)}
          step={1}
          suffix="%"
          onChange={(v) => set("perclosDrowsy", v / 100)}
        />
        <hr className={styles.divider} />
        <Field
          label="PERCLOS pour SLEEPY"
          hint="Part du temps yeux fermés à partir de laquelle l'état passe à SLEEPY."
          value={Math.round(t.perclosSleepy * 100)}
          step={1}
          suffix="%"
          onChange={(v) => set("perclosSleepy", v / 100)}
        />
        <hr className={styles.divider} />
        <Field
          label="Fermeture continue pour SLEEPY"
          hint="Durée d'yeux fermés sans interruption qui déclenche SLEEPY."
          value={t.closedSecondsSleepy}
          step={1}
          suffix="secondes"
          onChange={(v) => set("closedSecondsSleepy", v)}
        />
      </section>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className={styles.primary}
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={busy}
          className={styles.secondary}
        >
          Valeurs par défaut
        </button>
      </div>

      {message && (
        <p
          role="status"
          className={`${styles.msg} ${isError ? styles.error : styles.ok}`}
        >
          {message}
        </p>
      )}
    </>
  );
}

export default function SettingsPage() {
  const [initial, setInitial] = useState<Thresholds | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadThresholds().then((th) => {
      if (!cancelled) setInitial(th);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Réglages</h1>
        <p className={styles.subtitle}>
          Ajuste la sensibilité de la détection de somnolence.
        </p>
        <Link href="/monitor" className={styles.back}>
          ← Retour à la surveillance
        </Link>
      </header>
      {initial ? <SettingsForm initial={initial} /> : <p>Chargement...</p>}
    </main>
  );
}
