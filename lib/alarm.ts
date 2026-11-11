import type { AlertLevel } from "./types";

type Mode = "OFF" | "DROWSY" | "SLEEPY";

const PATTERNS = {
  DROWSY: { freq: 660, durationMs: 300, everyMs: 1200, volume: 0.15 },
  SLEEPY: { freq: 988, durationMs: 350, everyMs: 500, volume: 0.3 },
};

export class AlarmPlayer {
  private ctx: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private mode: Mode = "OFF";

  // À appeler depuis un clic (règle des navigateurs)
  enable() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.beep(880, 200, 0.15); // bip de confirmation
  }

  disable() {
    this.stop();
    void this.ctx?.suspend();
  }

  private beep(freq: number, durationMs: number, volume: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durationMs / 1000);
    osc.start(t);
    osc.stop(t + durationMs / 1000);
  }

  // Appelée à chaque image avec l'état courant
  set(level: AlertLevel) {
    const next: Mode = level === "NORMAL" ? "OFF" : level;
    if (next === this.mode) return;

    this.mode = next;
    this.clearTimer();
    if (next === "OFF") return;

    const p = PATTERNS[next];
    const play = () => this.beep(p.freq, p.durationMs, p.volume);
    play();
    this.timer = setInterval(play, p.everyMs);
  }

  stop() {
    this.mode = "OFF";
    this.clearTimer();
  }

  private clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

// Une seule alarme pour toute l'application
export const alarm = new AlarmPlayer();
