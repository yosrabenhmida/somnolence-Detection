export type NtfyMessage = {
  title: string;
  message: string;
  priority: 1 | 2 | 3 | 4 | 5;
  tags: string[];
};

// Le canal (topic) est maintenant fourni par l'appelant : un canal par utilisateur
export async function sendNtfy(topic: string, msg: NtfyMessage): Promise<void> {
  const server = process.env.NTFY_SERVER ?? "https://ntfy.sh";
  if (!topic) throw new Error("canal ntfy manquant");

  const res = await fetch(server, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, ...msg }),
  });
  if (!res.ok) throw new Error(`ntfy a répondu ${res.status}`);
}
