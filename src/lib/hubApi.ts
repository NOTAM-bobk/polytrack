const HUB_API = "/api/hub";

export interface HubMessage {
  id: string;
  createdAt: string;
  author: string;
  text: string;
}

export interface GameStats {
  id: string;
  name: string;
  url: string;
  clicks: number;
}

export async function loadMessages(): Promise<HubMessage[]> {
  const response = await fetch(`${HUB_API}/messages?limit=100`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Message service unavailable");
  const data = await response.json();
  return Array.isArray(data.messages) ? data.messages : [];
}

export async function sendMessage(author: string, text: string): Promise<HubMessage> {
  const response = await fetch(`${HUB_API}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ author, text }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.message) throw new Error(data.error || "Message could not be sent");
  return data.message;
}

export async function recordPageView(): Promise<number> {
  const response = await fetch(`${HUB_API}/views`, { method: "POST", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("View counter unavailable");
  const data = await response.json();
  return Number(data.total || 0);
}

export async function loadGameStats(): Promise<GameStats[]> {
  const response = await fetch(`${HUB_API}/api/games/stats`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Game stats unavailable");
  const data = await response.json();
  return Array.isArray(data.games) ? data.games : [];
}

export async function recordGameClick(game: { id: string; name: string; url: string }): Promise<GameStats | null> {
  const response = await fetch(`${HUB_API}/api/games/click`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(game),
  });
  if (!response.ok) throw new Error("Game click could not be recorded");
  const data = await response.json();
  return data.game || null;
}
