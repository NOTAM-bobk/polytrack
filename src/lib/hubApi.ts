export interface HubMessage {
  id: string;
  createdAt: string;
  author: string;
  text: string;
}

export async function loadMessages(): Promise<HubMessage[]> {
  const response = await fetch("/api/messages?limit=100", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Message service unavailable");
  const data = await response.json();
  return Array.isArray(data.messages) ? data.messages : [];
}

export async function sendMessage(author: string, text: string): Promise<HubMessage> {
  const response = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ author, text }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.message) throw new Error(data.error || "Message could not be sent");
  return data.message;
}

export async function recordPageView(): Promise<number> {
  const response = await fetch("/api/views", { method: "POST", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("View counter unavailable");
  const data = await response.json();
  return Number(data.total || 0);
}
