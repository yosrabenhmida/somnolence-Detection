import type { AlertLevel, Thresholds } from "./types";
import { PERCLOSCalculator } from "./perclos";

export class DrowsinessClassifier {
  constructor(private th: Thresholds) {}

  classify(calc: PERCLOSCalculator): AlertLevel {
    // yeux fermés en continu : SLEEPY, même pendant le démarrage
    if (calc.closedSeconds() >= this.th.closedSecondsSleepy) return "SLEEPY";

    // on attend que la fenêtre soit assez remplie avant d'utiliser le PERCLOS
    if (!calc.isReady()) return "NORMAL";

    const p = calc.perclos();
    if (p >= this.th.perclosSleepy) return "SLEEPY";
    if (p >= this.th.perclosDrowsy) return "DROWSY";
    return "NORMAL";
  }
}
