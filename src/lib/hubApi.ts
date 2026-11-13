const HUB_API = "/api/hub";
const WORKER_ORIGIN = "https://polytrack-hub-api.sawyerbobk563.workers.dev";

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

export interface GameFlagsData {
  verified: string[];
  buggy: string[];
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
  const response = await fetch(`${HUB_API}/games/stats`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Game stats unavailable");
  const data = await response.json();
  return Array.isArray(data.games) ? data.games : [];
}

export async function recordGameClick(game: { id: string; name: string; url: string }): Promise<GameStats | null> {
  const response = await fetch(`${HUB_API}/games/click`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(game),
  });
  if (!response.ok) throw new Error("Game click could not be recorded");
  const data = await response.json();
  return data.game || null;
}

/**
 * Loads game flags (verified and bug-tagged) from the Cloudflare backend.
 * Public endpoint, available to all visitors and devices.
 */
export async function loadGameFlags(): Promise<GameFlagsData> {
  // 1. Try same-origin rewritten path
  try {
    const res = await fetch(`${HUB_API}/games/flags`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return {
        verified: Array.isArray(data.verified) ? data.verified : [],
        buggy: Array.isArray(data.buggy) ? data.buggy : [],
      };
    }
  } catch {}

  // 2. Fallback directly to Cloudflare Worker
  try {
    const directRes = await fetch(`${WORKER_ORIGIN}/api/games/flags`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (directRes.ok) {
      const data = await directRes.json();
      return {
        verified: Array.isArray(data.verified) ? data.verified : [],
        buggy: Array.isArray(data.buggy) ? data.buggy : [],
      };
    }
  } catch {}

  throw new Error("Game flags are unavailable from the Cloudflare backend");
}

/**
 * Updates game flags (verified or bug-tagged) on the Cloudflare backend.
 * Protected by admin password.
 */
export async function updateAdminGameFlags(
  pwd: string,
  payload: {
    action: "toggle_verified" | "set_verified" | "clear_verified" | "toggle_buggy" | "set_buggy" | "clear_buggy" | "sync_all" | "get";
    gameId?: string;
    verified?: boolean | string[];
    buggy?: boolean | string[];
  }
): Promise<GameFlagsData> {
  const reqBody = { ...payload, target: "flags", password: pwd };

  // 1. Try Vercel /api/admin function
  let res: Response | null = null;
  try {
    res = await fetch("/api/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Password": pwd,
      },
      body: JSON.stringify(reqBody),
    });
  } catch {
    res = null;
  }

  // 2. Fallback to /api/hub/admin/flags
  if (!res || res.status === 404 || !res.ok) {
    try {
      const directHubRes = await fetch(`${HUB_API}/admin/flags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": pwd,
        },
        body: JSON.stringify(reqBody),
      });
      if (directHubRes.ok) {
        res = directHubRes;
      }
    } catch {}
  }

  // 3. Fallback direct to Cloudflare Worker
  if (!res || res.status === 404 || !res.ok) {
    try {
      const directWorkerRes = await fetch(`${WORKER_ORIGIN}/api/admin/flags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": pwd,
        },
        body: JSON.stringify(reqBody),
      });
      if (directWorkerRes.ok) {
        res = directWorkerRes;
      }
    } catch {}
  }

  if (!res || !res.ok) {
    const errData = res ? await res.json().catch(() => ({})) : {};
    throw new Error(errData.error || "Failed to update flags on Cloudflare backend");
  }

  const data = await res.json();
  return {
    verified: Array.isArray(data.verified) ? data.verified : [],
    buggy: Array.isArray(data.buggy) ? data.buggy : [],
  };
}
