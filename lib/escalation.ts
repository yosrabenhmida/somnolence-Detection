import type { AlertLevel } from "./types";

export type EscalationAction = "NOTIFY" | "URGENT";
import type { Thresholds } from "./types";

export const DEFAULT_THRESHOLDS: Thresholds = {
  earThreshold: 0.2,
  windowSeconds: 10,
  perclosDrowsy: 0.2,
  perclosSleepy: 0.4,
  closedSecondsSleepy: 3,
};

export const ESCALATION = {
  noFaceSeconds: 5, // visage absent plus longtemps = traité comme SLEEPY
  confirmAfterSeconds: 8, // sans réaction depuis le début de l'alarme : revérification
  urgentAfterSeconds: 15, // après la notification : message URGENT
  recoverSeconds: 5, // NORMAL pendant ce temps = on remet tout à zéro
};
export type EscalationConfig = {
  confirmAfterSeconds: number;
  urgentAfterSeconds: number;
  recoverSeconds: number;
};

type Stage = "IDLE" | "NOTIFIED" | "URGENT";

export class EscalationManager {
  private alarmSince: number | null = null;
  private normalSince: number | null = null;
  private notifiedAt: number | null = null;
  private stage: Stage = "IDLE";

  constructor(private cfg: EscalationConfig) {}

  // Appelée à chaque image. Retourne une action à envoyer, ou null.
  update(
    now: number,
    level: AlertLevel,
    eyesClosedNow: boolean,
  ): EscalationAction | null {
    if (level === "NORMAL") {
      if (this.normalSince === null) this.normalSince = now;
      if (now - this.normalSince >= this.cfg.recoverSeconds * 1000)
        this.reset();
      return null;
    }

    this.normalSince = null;
    if (this.alarmSince === null) this.alarmSince = now;

    if (this.stage === "IDLE") {
      const waited = (now - this.alarmSince) / 1000;
      // revérification : toujours SLEEPY ET yeux fermés sur l'image actuelle
      if (
        waited >= this.cfg.confirmAfterSeconds &&
        level === "SLEEPY" &&
        eyesClosedNow
      ) {
        this.stage = "NOTIFIED";
        this.notifiedAt = now;
        return "NOTIFY";
      }
      return null;
    }

    if (this.stage === "NOTIFIED" && this.notifiedAt !== null) {
      const since = (now - this.notifiedAt) / 1000;
      if (since >= this.cfg.urgentAfterSeconds && level === "SLEEPY") {
        this.stage = "URGENT";
        return "URGENT";
      }
    }
    return null;
  }

  reset() {
    this.alarmSince = null;
    this.normalSince = null;
    this.notifiedAt = null;
    this.stage = "IDLE";
  }
}
