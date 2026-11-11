import type { Thresholds } from "./types";

export const DEFAULT_THRESHOLDS: Thresholds = {
  earThreshold: 0.2,
  windowSeconds: 10,
  perclosDrowsy: 0.2,
  perclosSleepy: 0.4,
  closedSecondsSleepy: 3,
};
