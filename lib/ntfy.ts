export type NtfyMessage = {
  title: string;
  message: string;
  priority: 1 | 2 | 3 | 4 | 5;
  tags: string[];
};

// Le canal (topic) est fourni par l'appelant : un canal par utilisateur
export async function sendNtfy(topic: string, msg: NtfyMessage): Promise<void> {
  const server = process.env.NTFY_SERVER ?? "https://ntfy.sh";
  if (!topic) throw new Error("canal ntfy manquant");

  const res = await fetch(server, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, ...msg }),
    signal: AbortSignal.timeout(8000), // évite d'attendre indéfiniment
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ntfy a répondu ${res.status} ${detail.slice(0, 200)}`);
  }
}
