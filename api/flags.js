const WORKER_ORIGIN = "https://polytrack-hub-api.sawyerbobk563.workers.dev";
const FLAGS_TITLE = "__POLYTRACK_GAME_FLAGS__";

// Helper to fetch from Cloudflare Worker safely with custom UA
async function cfFetch(path, options = {}) {
  const url = new URL(path, WORKER_ORIGIN);
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    ...(options.headers || {}),
  };
  return fetch(url.toString(), {
    ...options,
    headers,
  });
}

// Read flags from fallback D1 bug_reports store
async function readFlagsFromD1() {
  try {
    const res = await cfFetch("/api/admin/bugs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Vercel-Admin-Verified": "1",
      },
      body: JSON.stringify({ action: "list" }),
    });

    // A failed read is not the same as "no badges": report it so callers can keep
    // the last known state instead of clearing every badge.
    if (!res.ok) return null;

    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    const flagRecords = items.filter((x) => x.title === FLAGS_TITLE);

    if (flagRecords.length === 0) {
      return { verified: [], buggy: [], notMobile: [], oldIds: [] };
    }

    // Most recent record is first or highest id
    const latest = flagRecords[0];
    const oldIds = flagRecords.map((x) => x.id);

    try {
      const parsed = JSON.parse(latest.description);
      return {
        verified: Array.isArray(parsed.verified) ? parsed.verified : [],
        buggy: Array.isArray(parsed.buggy) ? parsed.buggy : [],
        notMobile: Array.isArray(parsed.notMobile) ? parsed.notMobile : [],
        oldIds,
      };
    } catch {
      return { verified: [], buggy: [], notMobile: [], oldIds };
    }
  } catch {
    return null;
  }
}

// Write flags to fallback D1 bug_reports store
async function writeFlagsToD1(verified, buggy, notMobile, oldIds = []) {
  try {
    // 1. Post new flags record
    const postRes = await cfFetch("/api/bugs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: FLAGS_TITLE,
        description: JSON.stringify({ verified, buggy, notMobile }),
        gameUrl: "https://polytrack.internal/flags",
        pageUrl: "/flags",
        browserInfo: "Vercel Proxy Sync",
      }),
    });

    // Never delete the previous record when the new one was not stored:
    // that would wipe every badge instead of reporting a failed save.
    if (!postRes.ok) return false;

    // 2. Clean up previous records if any exist
    if (Array.isArray(oldIds) && oldIds.length > 0) {
      for (const id of oldIds) {
        if (!id) continue;
        try {
          await cfFetch("/api/admin/bugs", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Vercel-Admin-Verified": "1",
            },
            body: JSON.stringify({ action: "delete", id }),
          });
        } catch {}
      }
    }

    return postRes.ok;
  } catch {
    return false;
  }
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Password");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // 1. GET requests (Public read for all visitors & devices)
  if (req.method === "GET") {
    // Try upstream Worker /api/games/flags first
    try {
      const upRes = await cfFetch("/api/games/flags", {
        headers: { Accept: "application/json" },
      });
      if (upRes.ok) {
        const data = await upRes.json();
        return res.status(200).json({
          ok: true,
          verified: Array.isArray(data.verified) ? data.verified : [],
          buggy: Array.isArray(data.buggy) ? data.buggy : [],
          notMobile: Array.isArray(data.notMobile) ? data.notMobile : [],
        });
      }
    } catch {}

    // Fallback: Read from D1 storage record
    const d1Data = await readFlagsFromD1();
    if (!d1Data) {
      return res.status(503).json({
        ok: false,
        error: "Game badges are temporarily unavailable.",
      });
    }
    return res.status(200).json({
      ok: true,
      verified: d1Data.verified,
      buggy: d1Data.buggy,
      notMobile: d1Data.notMobile,
    });
  }

  // 2. POST requests (Admin updates)
  if (req.method === "POST") {
    let body = {};
    if (typeof req.body === "string") {
      try {
        body = JSON.parse(req.body);
      } catch {
        body = {};
      }
    } else if (req.body && typeof req.body === "object") {
      body = req.body;
    }

    const configuredPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || process.env.VERCEL_ADMIN_PASSWORD;
    const givenPassword = String(req.headers["x-admin-password"] || body.password || "");

    if (configuredPassword) {
      if (!givenPassword || !safeEqual(givenPassword, configuredPassword)) {
        return res.status(401).json({ ok: false, error: "Incorrect admin password." });
      }
    }

    // Try upstream Worker /api/admin/flags first
    try {
      const upRes = await cfFetch("/api/admin/flags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Vercel-Admin-Verified": "1",
          "X-Admin-Password": givenPassword,
        },
        body: JSON.stringify(body),
      });

      if (upRes.ok) {
        const data = await upRes.json();
        return res.status(200).json(data);
      }
    } catch {}

    // Fallback: Handle action directly using D1 storage
    const current = await readFlagsFromD1();
    if (!current) {
      return res.status(503).json({
        ok: false,
        error: "Could not read the current badges, so nothing was changed. Please try again.",
      });
    }
    let verifiedSet = new Set(current.verified);
    let buggySet = new Set(current.buggy);
    let notMobileSet = new Set(current.notMobile);

    const action = String(body.action || "get");
    const gameId = String(body.gameId || body.id || "").trim();

    if (action === "toggle_verified" && gameId) {
      if (verifiedSet.has(gameId)) verifiedSet.delete(gameId);
      else verifiedSet.add(gameId);
    } else if (action === "set_verified" && gameId) {
      if (body.verified) verifiedSet.add(gameId);
      else verifiedSet.delete(gameId);
    } else if (action === "clear_verified") {
      verifiedSet.clear();
    } else if (action === "toggle_buggy" && gameId) {
      if (buggySet.has(gameId)) buggySet.delete(gameId);
      else buggySet.add(gameId);
    } else if (action === "set_buggy" && gameId) {
      if (body.buggy) buggySet.add(gameId);
      else buggySet.delete(gameId);
    } else if (action === "clear_buggy") {
      buggySet.clear();
    } else if (action === "toggle_not_mobile" && gameId) {
      if (notMobileSet.has(gameId)) notMobileSet.delete(gameId);
      else notMobileSet.add(gameId);
    } else if (action === "set_not_mobile" && gameId) {
      if (body.notMobile) notMobileSet.add(gameId);
      else notMobileSet.delete(gameId);
    } else if (action === "clear_not_mobile") {
      notMobileSet.clear();
    } else if (action === "sync_all") {
      if (Array.isArray(body.verified)) {
        verifiedSet = new Set(body.verified.filter(Boolean));
      }
      if (Array.isArray(body.buggy)) {
        buggySet = new Set(body.buggy.filter(Boolean));
      }
      if (Array.isArray(body.notMobile)) {
        notMobileSet = new Set(body.notMobile.filter(Boolean));
      }
    }

    const nextVerified = Array.from(verifiedSet);
    const nextBuggy = Array.from(buggySet);
    const nextNotMobile = Array.from(notMobileSet);

    if (action !== "get") {
      const saved = await writeFlagsToD1(nextVerified, nextBuggy, nextNotMobile, current.oldIds);
      if (!saved) {
        // Report the stored state instead of pretending the change was saved:
        // the admin UI otherwise confirms a sync and then reverts the selection.
        return res.status(502).json({
          ok: false,
          error: "Could not save game badges. Please try again.",
          verified: current.verified,
          buggy: current.buggy,
          notMobile: current.notMobile,
        });
      }
    }

    return res.status(200).json({
      ok: true,
      verified: nextVerified,
      buggy: nextBuggy,
      notMobile: nextNotMobile,
    });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
};
