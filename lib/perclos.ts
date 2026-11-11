type Sample = { t: number; closed: boolean };

export class PERCLOSCalculator {
  private samples: Sample[] = [];
  private closedSince: number | null = null;
  private lastT = 0;

  constructor(private windowMs: number) {}

  add(t: number, closed: boolean) {
    this.samples.push({ t, closed });
    this.lastT = t;

    if (closed) {
      if (this.closedSince === null) this.closedSince = t;
    } else {
      this.closedSince = null;
    }

    // retire les mesures sorties de la fenêtre
    while (this.samples.length > 1 && t - this.samples[0].t > this.windowMs) {
      this.samples.shift();
    }
  }

  private span(): number {
    const n = this.samples.length;
    return n < 2 ? 0 : this.samples[n - 1].t - this.samples[0].t;
  }

  // vrai quand la fenêtre est remplie au moins à moitié
  isReady(): boolean {
    return this.span() >= this.windowMs * 0.5;
  }

  // part du temps passé yeux fermés dans la fenêtre (entre 0 et 1)
  perclos(): number {
    const s = this.samples;
    if (s.length < 2) return 0;
    let closedTime = 0;
    for (let i = 0; i < s.length - 1; i++) {
      if (s[i].closed) closedTime += s[i + 1].t - s[i].t;
    }
    const total = s[s.length - 1].t - s[0].t;
    return total > 0 ? closedTime / total : 0;
  }

  // durée de la fermeture en cours, en secondes
  closedSeconds(): number {
    return this.closedSince === null
      ? 0
      : (this.lastT - this.closedSince) / 1000;
  }

  reset() {
    this.samples = [];
    this.closedSince = null;
    this.lastT = 0;
  }
}
