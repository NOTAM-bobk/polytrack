const ALLOWED = ["http://localhost:3002", "http://127.0.0.1:3002", "http://localhost:8080", "http://127.0.0.1:8080"];
let schemaPromise;

function headers(request) {
  const origin = request.headers.get("Origin") || "";
  const result = { "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "content-type", "Access-Control-Max-Age": "86400", Vary: "Origin" };
  if (ALLOWED.includes(origin) || (origin.startsWith("https://") && origin.endsWith(".benlaunches.icu"))) result["Access-Control-Allow-Origin"] = origin;
  return result;
}

function json(request, data, status = 200) {
  const result = headers(request);
  result["content-type"] = "application/json; charset=utf-8";
  result["cache-control"] = "no-store";
  return new Response(JSON.stringify(data), { status, headers: result });
}

function error(request, message, status = 400) {
  return json(request, { ok: false, error: message }, status);
}

function ensureSchema(env) {
  if (!schemaPromise) {
    schemaPromise = env.DB.batch([
      env.DB.prepare("CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, author TEXT NOT NULL, text TEXT NOT NULL)"),
      env.DB.prepare("CREATE INDEX IF NOT EXISTS chat_messages_created_at ON chat_messages(created_at)"),
      env.DB.prepare("CREATE TABLE IF NOT EXISTS page_views (id INTEGER PRIMARY KEY CHECK (id = 1), total INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)"),
    ]).catch((failure) => {
      schemaPromise = undefined;
      throw failure;
    });
  }
  return schemaPromise;
}

async function readBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}

async function messages(request, env) {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const requested = Number(url.searchParams.get("limit") || 100);
    const limit = Math.min(Math.max(Number.isFinite(requested) ? requested : 100, 1), 100);
    const result = await env.DB.prepare("SELECT id, created_at, author, text FROM chat_messages ORDER BY created_at DESC LIMIT " + limit).all();
    return json(request, { ok: true, messages: (result.results || []).reverse().map((row) => ({ id: row.id, createdAt: row.created_at, author: row.author, text: row.text })) });
  }
  if (request.method !== "POST") return error(request, "Use GET or POST.", 405);
  const body = await readBody(request);
  const author = String((body && body.author) || "Guest").trim().slice(0, 32) || "Guest";
  const text = String((body && body.text) || "").trim();
  if (!text) return error(request, "Write a message first.", 422);
  if (text.length > 280) return error(request, "Keep messages under 280 characters.", 422);
  const createdAt = new Date().toISOString();
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO chat_messages (id, created_at, author, text) VALUES (?, ?, ?, ?)").bind(id, createdAt, author, text).run();
  return json(request, { ok: true, message: { id, createdAt, author, text } }, 201);
}

async function views(request, env) {
  if (request.method === "GET") {
    const row = await env.DB.prepare("SELECT total FROM page_views WHERE id = 1").first();
    return json(request, { ok: true, total: row ? Number(row.total) : 0 });
  }
  if (request.method !== "POST") return error(request, "Use GET or POST.", 405);
  const updatedAt = new Date().toISOString();
  await env.DB.prepare("INSERT INTO page_views (id, total, updated_at) VALUES (1, 1, ?) ON CONFLICT(id) DO UPDATE SET total = page_views.total + 1, updated_at = excluded.updated_at").bind(updatedAt).run();
  const row = await env.DB.prepare("SELECT total FROM page_views WHERE id = 1").first();
  return json(request, { ok: true, total: row ? Number(row.total) : 1 });
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(request) });
    try {
      if (path === "/" || path === "/api/health") return json(request, { ok: true, service: "polytrack-hub-api" });
      await ensureSchema(env);
      if (path === "/api/messages") return messages(request, env);
      if (path === "/api/views") return views(request, env);
      return error(request, "No such endpoint.", 404);
    } catch {
      return error(request, "The hub API is unavailable right now.", 500);
    }
  },
};
