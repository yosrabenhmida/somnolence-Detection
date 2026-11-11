import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import AccountMenu from "@/components/AccountMenu";

async function HistoryContent() {
  const session = await getSession();
  if (!session) redirect("/auth/login");

  return (
    <>
      <AccountMenu />
      <main style={{ padding: "5rem 1.5rem 2rem", color: "#f2f2f2" }}>
        <h1>Historique</h1>
        <p>Les épisodes de somnolence apparaîtront ici.</p>
        <Link href="/monitor">← Retour à la surveillance</Link>
      </main>
    </>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: "5rem 1.5rem", color: "#f2f2f2" }}>
          Chargement…
        </main>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
