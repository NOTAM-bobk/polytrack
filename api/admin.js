const WORKER_ORIGIN = "https://polytrack-hub-api.sawyerbobk563.workers.dev";

// In-memory rate limiting map for Vercel instances
const rateLimitMap = new Map();

function checkRateLimit(ip, maxAttempts = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now - record.firstSeen > windowMs) {
    return { allowed: true, count: 0, resetIn: Math.ceil(windowMs / 1000) };
  }
  if (record.count >= maxAttempts) {
    const remainingSec = Math.max(1, Math.ceil((windowMs - (now - record.firstSeen)) / 1000));
    return { allowed: false, count: record.count, resetIn: remainingSec };
  }
  return { allowed: true, count: record.count, resetIn: Math.max(1, Math.ceil((windowMs - (now - record.firstSeen)) / 1000)) };
}

function recordAttempt(ip, success, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  if (success) {
    rateLimitMap.delete(ip);
    return;
  }
  const record = rateLimitMap.get(ip);
  if (!record || now - record.firstSeen > windowMs) {
    rateLimitMap.set(ip, { count: 1, firstSeen: now });
  } else {
    record.count += 1;
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

  const rawIp = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  const clientIp = String(rawIp).split(",")[0].trim();

  // Rate limit check
  const rl = checkRateLimit(clientIp, 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return res.status(429).json({
      ok: false,
      error: `Too many failed admin attempts. Please wait ${Math.ceil(rl.resetIn / 60)} minute(s) before trying again.`,
      resetIn: rl.resetIn,
    });
  }

  const configuredPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || process.env.VERCEL_ADMIN_PASSWORD;

  if (!configuredPassword) {
    return res.status(503).json({
      ok: false,
      error: "ADMIN_PASSWORD is not configured in Vercel environment variables yet.",
      needsSetup: true,
    });
  }

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

  const givenPassword = String(req.headers["x-admin-password"] || body.password || "");

  if (!givenPassword) {
    return res.status(401).json({
      ok: false,
      error: "Password required.",
    });
  }

  if (!safeEqual(givenPassword, configuredPassword)) {
    recordAttempt(clientIp, false);
    return res.status(401).json({
      ok: false,
      error: "Incorrect admin password.",
    });
  }

  // Password successfully verified
  recordAttempt(clientIp, true);

  try {
    const isFlagsAction =
      body.target === "flags" ||
      req.url.includes("flags") ||
      (typeof body.action === "string" && (
        body.action.includes("verified") ||
        body.action.includes("buggy") ||
        body.action.includes("flag")
      ));

    const endpoint = isFlagsAction ? "/api/admin/flags" : "/api/admin/bugs";
    const upstreamUrl = new URL(endpoint, WORKER_ORIGIN);
    const upstreamRes = await fetch(upstreamUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Vercel-Admin-Verified": "1",
        "X-Admin-Password": givenPassword,
      },
      body: JSON.stringify(body),
    });

    const data = await upstreamRes.json().catch(() => ({ ok: false, error: "Invalid upstream response" }));
    return res.status(upstreamRes.status).json(data);
  } catch {
    return res.status(502).json({
      ok: false,
      error: "Could not reach the database backend.",
    });
  }
};
