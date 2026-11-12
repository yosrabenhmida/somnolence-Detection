import { Suspense } from "react";
import { Space_Grotesk } from "next/font/google";
import SideRail from "@/components/SideRail";
import styles from "./monitor.module.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

export default function MonitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.shell} ${display.variable}`}>
      <Suspense fallback={<div className={styles.railPlaceholder} />}>
        <SideRail active="monitor" />
      </Suspense>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
