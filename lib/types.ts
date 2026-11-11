export type AlertLevel = "NORMAL" | "DROWSY" | "SLEEPY";

export type Thresholds = {
  earThreshold: number; // EAR sous cette valeur = œil fermé
  windowSeconds: number; // durée de la fenêtre glissante du PERCLOS
  perclosDrowsy: number; // PERCLOS à partir duquel on passe en DROWSY
  perclosSleepy: number; // PERCLOS à partir duquel on passe en SLEEPY
  closedSecondsSleepy: number; // fermeture continue qui déclenche SLEEPY
};
