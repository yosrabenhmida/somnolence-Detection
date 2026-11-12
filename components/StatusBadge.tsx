import type { AlertLevel } from "@/lib/types";

export const LEVEL_COLORS: Record<AlertLevel, string> = {
  NORMAL: "#2dd4bf",
  DROWSY: "#f59e0b",
  SLEEPY: "#ef4444",
};

export default function StatusBadge({ level }: { level: AlertLevel }) {
  return (
    <span
      role="status"
      aria-live="polite"
      style={{
        display: "inline-block",
        padding: "12px 40px",
        borderRadius: 999,
        background: LEVEL_COLORS[level],
        color: "#07090d",
        fontFamily: "var(--font-display), system-ui, sans-serif",
        fontSize: 34,
        fontWeight: 700,
        letterSpacing: 1,
      }}
    >
      {level}
    </span>
  );
}
