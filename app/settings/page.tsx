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

function Field(props: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  suffix?: string;
}) {
  return (
    <label style={{ display: "block", marginBottom: 18 }}>
      <div style={{ fontWeight: 600 }}>{props.label}</div>
      <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 6 }}>
        {props.hint}
      </div>
      <input
        type="number"
        step={props.step}
        value={Number.isNaN(props.value) ? "" : props.value}
        onChange={(e) => props.onChange(parseFloat(e.target.value))}
        style={{ padding: 8, fontSize: 18, width: 140 }}
      />
      {props.suffix && <span style={{ marginLeft: 8 }}>{props.suffix}</span>}
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
      <Field
        label="Seuil EAR"
        hint="Un œil est considéré fermé quand l'EAR passe sous cette valeur."
        value={t.earThreshold}
        step={0.01}
        onChange={(v) => set("earThreshold", v)}
      />
      <Field
        label="Fenêtre du PERCLOS"
        hint="Durée sur laquelle on mesure la part du temps yeux fermés."
        value={t.windowSeconds}
        step={1}
        suffix="secondes"
        onChange={(v) => set("windowSeconds", v)}
      />
      <Field
        label="PERCLOS pour DROWSY"
        hint="Part du temps yeux fermés à partir de laquelle l'état passe à DROWSY."
        value={Math.round(t.perclosDrowsy * 100)}
        step={1}
        suffix="%"
        onChange={(v) => set("perclosDrowsy", v / 100)}
      />
      <Field
        label="PERCLOS pour SLEEPY"
        hint="Part du temps yeux fermés à partir de laquelle l'état passe à SLEEPY."
        value={Math.round(t.perclosSleepy * 100)}
        step={1}
        suffix="%"
        onChange={(v) => set("perclosSleepy", v / 100)}
      />
      <Field
        label="Fermeture continue pour SLEEPY"
        hint="Durée d'yeux fermés sans interruption qui déclenche SLEEPY."
        value={t.closedSecondsSleepy}
        step={1}
        suffix="secondes"
        onChange={(v) => set("closedSecondsSleepy", v)}
      />

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={onSave}
          disabled={busy}
          style={{ padding: "10px 18px", fontSize: 16 }}
        >
          Enregistrer
        </button>
        <button
          onClick={onReset}
          disabled={busy}
          style={{ padding: "10px 18px", fontSize: 16 }}
        >
          Valeurs par défaut
        </button>
      </div>

      {message && (
        <p style={{ marginTop: 16, color: isError ? "#dc2626" : "#16a34a" }}>
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
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>Réglages de détection</h1>
      <p>
        <Link href="/monitor">← Retour à la surveillance</Link>
      </p>
      {initial ? <SettingsForm initial={initial} /> : <p>Chargement...</p>}
    </main>
  );
}
