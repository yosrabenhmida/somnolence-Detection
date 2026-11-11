import { Suspense } from "react";
import AccountMenu from "@/components/AccountMenu";

export default function MonitorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <AccountMenu />
      </Suspense>
      {children}
    </>
  );
}
