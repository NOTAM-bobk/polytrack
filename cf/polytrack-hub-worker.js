const ALLOWED = [
  "http://localhost:3002",
  "http://127.0.0.1:3002",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];
const HUB = /^https:\/\/([a-z0-9-]+\.)?benlaunches\.icu$/;
let ready;

const cors = (r) => {
  const o = r.headers.get("Origin") || "";
  const h = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-admin-password, x-vercel-admin-verified",
    "Access-Control-Max-Age": "86400",
  };
  if (ALLOWED.includes(o) || HUB.test(o)) {
    h["Access-Control-Allow-Origin"] = o;
  }
  return h;
};

const json = (r, d, s = 200) => {
  const h = cors(r);
  h["content-type"] = "application/json; charset=utf-8";
  h["cache-control"] = "no-store";
  return new Response(JSON.stringify(d), { status: s, headers: h });
};

const fail = (r, e, s = 400, extra = {}) => json(r, { ok: false, error: e, ...extra }, s);

const read = async (r) => {
  try {
    const b = await r.json();
    return b && typeof b === "object" ? b : null;
  } catch {
    return null;
  }
};

const clean = (v, n, f = "") => String(v == null ? "" : v).trim().slice(0, n) || f;

const ip = (r) => r.headers.get("cf-connecting-ip") || r.headers.get("x-forwarded-for") || "unknown";

const digest = async (v) => {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
};

const equal = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let n = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) n |= (x[i] || 0) ^ (y[i] || 0);
  return n === 0;
};

function schema(e) {
  if (!ready) {
    ready = e.DB.batch([
      e.DB.prepare(
        "CREATE TABLE IF NOT EXISTS chat_messages(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,author TEXT NOT NULL,text TEXT NOT NULL,ip_hash TEXT NOT NULL DEFAULT '')"
      ),
      e.DB.prepare(
        "CREATE TABLE IF NOT EXISTS page_views(id INTEGER PRIMARY KEY CHECK(id=1),total INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL)"
      ),
      e.DB.prepare(
        "CREATE TABLE IF NOT EXISTS submissions(id INTEGER PRIMARY KEY AUTOINCREMENT,created_at TEXT NOT NULL,url TEXT NOT NULL DEFAULT '',message TEXT NOT NULL,ip_hash TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'new')"
      ),
      e.DB.prepare(
        "CREATE TABLE IF NOT EXISTS game_clicks(game_id TEXT PRIMARY KEY,game_name TEXT NOT NULL,game_url TEXT NOT NULL DEFAULT '',clicks INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL)"
      ),
      e.DB.prepare(
        "CREATE TABLE IF NOT EXISTS bug_reports(id INTEGER PRIMARY KEY AUTOINCREMENT,created_at TEXT NOT NULL,title TEXT NOT NULL DEFAULT '',description TEXT NOT NULL,game_url TEXT NOT NULL DEFAULT '',page_url TEXT NOT NULL DEFAULT '',browser_info TEXT NOT NULL DEFAULT '',ip_hash TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'open')"
      ),
      e.DB.prepare(
        "CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL DEFAULT 1,first_seen INTEGER NOT NULL,last_seen INTEGER NOT NULL)"
      ),
    ]).catch((x) => {
      ready = null;
      return Promise.reject(x);
    });
  }
  return ready;
}

async function checkRateLimit(db, key, maxRequests, windowSeconds) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const row = await db.prepare("SELECT count, first_seen FROM rate_limits WHERE key = ?").bind(key).first();
    if (!row) {
      await db.prepare("INSERT INTO rate_limits (key, count, first_seen, last_seen) VALUES (?, 1, ?, ?)").bind(key, now, now).run();
      return { allowed: true, remaining: maxRequests - 1, resetIn: windowSeconds };
    }

    if (now - row.first_seen > windowSeconds) {
      await db.prepare("UPDATE rate_limits SET count = 1, first_seen = ?, last_seen = ? WHERE key = ?").bind(now, now, key).run();
      return { allowed: true, remaining: maxRequests - 1, resetIn: windowSeconds };
    }

    if (row.count >= maxRequests) {
      const resetIn = Math.max(1, windowSeconds - (now - row.first_seen));
      return { allowed: false, remaining: 0, resetIn };
    }

    await db.prepare("UPDATE rate_limits SET count = count + 1, last_seen = ? WHERE key = ?").bind(now, key).run();
    return {
      allowed: true,
      remaining: maxRequests - (row.count + 1),
      resetIn: Math.max(1, windowSeconds - (now - row.first_seen)),
    };
  } catch {
    return { allowed: true, remaining: 1, resetIn: windowSeconds };
  }
}

async function messages(r, e) {
  if (r.method === "GET") {
    const q = await e.DB.prepare("SELECT id,created_at,author,text FROM chat_messages ORDER BY created_at DESC LIMIT 100").all();
    return json(r, {
      ok: true,
      messages: (q.results || []).reverse().map((x) => ({
        id: x.id,
        createdAt: x.created_at,
        author: x.author,
        text: x.text,
      })),
    });
  }
  const b = await read(r);
  const text = clean(b?.text, 280);
  const author = clean(b?.author, 32, "Guest");
  if (!text) return fail(r, "Write a message first.", 422);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await e.DB.prepare("INSERT INTO chat_messages VALUES(?,?,?,?,?)").bind(id, createdAt, author, text, await digest(ip(r))).run();
  return json(r, { ok: true, message: { id, createdAt, author, text } }, 201);
}

async function views(r, e) {
  if (r.method === "GET") {
    const q = await e.DB.prepare("SELECT total FROM page_views WHERE id=1").first();
    return json(r, { ok: true, total: Number(q?.total || 0) });
  }
  await e.DB.prepare(
    "INSERT INTO page_views VALUES(1,1,?) ON CONFLICT(id) DO UPDATE SET total=total+1,updated_at=excluded.updated_at"
  )
    .bind(new Date().toISOString())
    .run();
  const q = await e.DB.prepare("SELECT total FROM page_views WHERE id=1").first();
  return json(r, { ok: true, total: Number(q?.total || 1) });
}

async function games(r, e) {
  if (r.method === "GET") {
    const q = await e.DB.prepare("SELECT game_id,game_name,game_url,clicks FROM game_clicks ORDER BY clicks DESC,game_name ASC LIMIT 200").all();
    return json(r, {
      ok: true,
      games: (q.results || []).map((x) => ({
        id: x.game_id,
        name: x.game_name,
        url: x.game_url,
        clicks: Number(x.clicks || 0),
      })),
    });
  }
  const b = await read(r);
  const id = clean(b?.id, 120);
  const name = clean(b?.name, 160, "Game");
  const url = clean(b?.url, 500);
  if (!id) return fail(r, "A game id is required.", 422);
  await e.DB.prepare(
    "INSERT INTO game_clicks VALUES(?,?,?,1,?) ON CONFLICT(game_id) DO UPDATE SET game_name=excluded.game_name,game_url=excluded.game_url,clicks=game_clicks.clicks+1,updated_at=excluded.updated_at"
  )
    .bind(id, name, url, new Date().toISOString())
    .run();
  const q = await e.DB.prepare("SELECT game_id,game_name,game_url,clicks FROM game_clicks WHERE game_id=?").bind(id).first();
  return json(r, { ok: true, game: { id: q.game_id, name: q.game_name, url: q.game_url, clicks: Number(q.clicks || 0) } }, 201);
}

async function submit(r, e) {
  const b = await read(r);
  const message = clean(b?.message, 2000);
  const raw = clean(b?.url, 500);
  if (message.length < 3) return fail(r, "Write at least 3 characters so we know what to add.", 422);
  let url = "";
  if (raw) {
    try {
      const u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw);
      if (!["http:", "https:"].includes(u.protocol) || !u.hostname.includes(".")) throw 0;
      url = u.toString();
    } catch {
      return fail(r, "That link is not valid.", 422);
    }
  }
  const q = await e.DB.prepare("INSERT INTO submissions(created_at,url,message,ip_hash) VALUES(?,?,?,?)")
    .bind(new Date().toISOString(), url, message, await digest(ip(r)))
    .run();
  return json(r, { ok: true, id: q.meta?.last_row_id || null }, 201);
}

async function admin(r, e) {
  if (!e.ADMIN_PASSWORD) return fail(r, "The admin password has not been set on this deployment yet.", 503);
  const b = await read(r);
  const given = r.headers.get("x-admin-password") || b?.password || "";
  if (!equal(given, e.ADMIN_PASSWORD)) return fail(r, "Wrong password.", 401);
  const q = await e.DB.prepare("SELECT id,created_at,url,message,status FROM submissions ORDER BY id DESC LIMIT 200").all();
  const t = await e.DB.prepare("SELECT COUNT(*) total FROM submissions").first();
  return json(r, {
    ok: true,
    total: Number(t?.total || 0),
    items: (q.results || []).map((x) => ({
      id: x.id,
      createdAt: x.created_at,
      url: x.url,
      message: x.message,
      status: x.status,
    })),
  });
}

// BUG REPORTING & ADMIN MANAGEMENT
async function bugs(r, e) {
  if (r.method !== "POST") return fail(r, "Use POST to submit bug reports.", 405);
  const clientIp = ip(r);
  const ipHash = await digest(clientIp);

  // Rate limit: 5 bug reports per 10 minutes (600s)
  const rl = await checkRateLimit(e.DB, "bug:" + ipHash, 5, 600);
  if (!rl.allowed) {
    return fail(
      r,
      `Rate limit reached. Please wait ${Math.ceil(rl.resetIn / 60)} minute(s) before submitting another report.`,
      429,
      { resetIn: rl.resetIn }
    );
  }

  const b = await read(r);
  const description = clean(b?.description, 3000);
  if (description.length < 3) {
    return fail(r, "Please describe the bug with at least 3 characters.", 422);
  }

  const title = clean(b?.title, 150, description.slice(0, 60) + (description.length > 60 ? "…" : ""));
  const gameUrl = clean(b?.gameUrl || b?.game_url, 500);
  const pageUrl = clean(b?.pageUrl || b?.page_url, 500);
  const browserInfo = clean(b?.browserInfo || b?.browser_info, 300);

  const createdAt = new Date().toISOString();
  const q = await e.DB.prepare(
    "INSERT INTO bug_reports (created_at, title, description, game_url, page_url, browser_info, ip_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'open')"
  )
    .bind(createdAt, title, description, gameUrl, pageUrl, browserInfo, ipHash)
    .run();

  return json(
    r,
    {
      ok: true,
      id: q.meta?.last_row_id || null,
      message: "Bug report submitted successfully! Thank you for helping improve the site.",
    },
    201
  );
}

async function adminBugs(r, e) {
  const clientIp = ip(r);
  const ipHash = await digest(clientIp);

  // Rate limit on admin attempts: max 10 attempts per 10 minutes (600s)
  const rl = await checkRateLimit(e.DB, "admin_bugs_attempt:" + ipHash, 10, 600);
  if (!rl.allowed) {
    return fail(
      r,
      `Too many admin login attempts. Please wait ${Math.ceil(rl.resetIn / 60)} minute(s) before trying again.`,
      429,
      { resetIn: rl.resetIn }
    );
  }

  const isVercelVerified = r.headers.get("x-vercel-admin-verified") === "1";
  const b = await read(r);
  const given = r.headers.get("x-admin-password") || b?.password || "";

  let authorized = false;
  if (isVercelVerified) {
    authorized = true;
  } else if (e.ADMIN_PASSWORD && equal(given, e.ADMIN_PASSWORD)) {
    authorized = true;
  }

  if (!authorized) {
    await checkRateLimit(e.DB, "admin_bugs_fail:" + ipHash, 5, 600);
    return fail(r, "Unauthorized. Incorrect admin password.", 401);
  }

  // Handle status update or delete actions
  if (r.method === "POST" && b?.action) {
    if (b.action === "status" && b.id) {
      const nextStatus = clean(b.status, 30, "open");
      await e.DB.prepare("UPDATE bug_reports SET status = ? WHERE id = ?").bind(nextStatus, b.id).run();
      return json(r, { ok: true, updated: true });
    }
    if (b.action === "delete" && b.id) {
      await e.DB.prepare("DELETE FROM bug_reports WHERE id = ?").bind(b.id).run();
      return json(r, { ok: true, deleted: true });
    }
  }

  // Fetch bugs
  const q = await e.DB.prepare(
    "SELECT id, created_at, title, description, game_url, page_url, browser_info, status FROM bug_reports ORDER BY id DESC LIMIT 200"
  ).all();
  const t = await e.DB.prepare("SELECT COUNT(*) as total FROM bug_reports").first();

  return json(r, {
    ok: true,
    total: Number(t?.total || 0),
    items: (q.results || []).map((x) => ({
      id: x.id,
      createdAt: x.created_at,
      title: x.title,
      description: x.description,
      gameUrl: x.game_url,
      pageUrl: x.page_url,
      browserInfo: x.browser_info,
      status: x.status,
    })),
  });
}

export default {
  async fetch(r, e) {
    const p = new URL(r.url).pathname.replace(/\/+$/, "") || "/";
    if (r.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(r) });
    try {
      if (p === "/" || p === "/api/health") {
        return json(r, { ok: true, service: "polytrack-hub-api", adminConfigured: !!e.ADMIN_PASSWORD });
      }
      await schema(e);
      if (p === "/api/messages") return messages(r, e);
      if (p === "/api/views") return views(r, e);
      if (p === "/api/games/stats") return games(r, e);
      if (p === "/api/games/click") return games(r, e);
      if (p === "/api/submit") return submit(r, e);
      if (p === "/api/admin/list") return admin(r, e);
      if (p === "/api/bugs") return bugs(r, e);
      if (p === "/api/admin/bugs") return adminBugs(r, e);
      return fail(r, "No such endpoint.", 404);
    } catch {
      return fail(r, "The hub API is unavailable right now.", 500);
    }
  },
};
