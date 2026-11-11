/**
 * Cloudflare API for the Education Games hub.
 *
 * GET  /api/health
 * GET  /api/messages?limit=100
 * POST /api/messages              { author, text }
 * POST /api/views                  increments the shared page-view counter
 * GET  /api/views                  returns the shared page-view counter
 * POST /api/submit                 { url?, message }        store a suggestion
 * POST /api/admin/list             header x-admin-password list suggestions
 *
 * Storage is a D1 database bound as env.DB. ADMIN_PASSWORD is a Worker secret.
 */

const MAX_MESSAGE = 2000;
const MIN_MESSAGE = 3;
const MAX_URL = 500;
const MAX_CHAT_TEXT = 280;
const MAX_AUTHOR = 32;
const CHAT_LIMIT = 100;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const CHAT_RATE_MAX = 12;
const LIST_LIMIT = 200;

const BASE_ORIGINS = [
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:8080",
    "http://127.0.0.1:8080"
];

const HUB = /^https:\/\/([a-z0-9-]+\.)?benlaunches\.icu$/;
const STYLE_DEV = /^https:\/\/[a-z0-9-]+\.style\.dev$/;

function corsHeaders(request) {
    const origin = request.headers.get("Origin") || "";
    const allowed = BASE_ORIGINS.includes(origin) || HUB.test(origin) || STYLE_DEV.test(origin);
    const headers = {
        Vary: "Origin",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, x-admin-password",
        "Access-Control-Max-Age": "86400"
    };
    if (allowed) { headers["Access-Control-Allow-Origin"] = origin; }
    return headers;
}

function json(request, data, status) {
    const headers = corsHeaders(request);
    headers["content-type"] = "application/json; charset=utf-8";
    headers["cache-control"] = "no-store";
    return new Response(JSON.stringify(data), { status: status || 200, headers });
}

function fail(request, message, status) {
    return json(request, { ok: false, error: message }, status || 400);
}

let schemaReady = null;

function ensureSchema(env) {
    if (!schemaReady) {
        schemaReady = env.DB.batch([
            env.DB.prepare(
                "CREATE TABLE IF NOT EXISTS submissions (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "created_at TEXT NOT NULL, " +
                "url TEXT NOT NULL DEFAULT '', " +
                "message TEXT NOT NULL, " +
                "ip_hash TEXT NOT NULL DEFAULT '', " +
                "status TEXT NOT NULL DEFAULT 'new')"
            ),
            env.DB.prepare("CREATE INDEX IF NOT EXISTS submissions_created_at ON submissions (created_at)"),
            env.DB.prepare("CREATE INDEX IF NOT EXISTS submissions_ip ON submissions (ip_hash, created_at)"),
            env.DB.prepare(
                "CREATE TABLE IF NOT EXISTS chat_messages (" +
                "id TEXT PRIMARY KEY, " +
                "created_at TEXT NOT NULL, " +
                "author TEXT NOT NULL, " +
                "text TEXT NOT NULL, " +
                "ip_hash TEXT NOT NULL DEFAULT '')"
            ),
            env.DB.prepare("CREATE INDEX IF NOT EXISTS chat_messages_created_at ON chat_messages (created_at)"),
            env.DB.prepare("CREATE INDEX IF NOT EXISTS chat_messages_ip ON chat_messages (ip_hash, created_at)"),
            env.DB.prepare(
                "CREATE TABLE IF NOT EXISTS page_views (" +
                "id INTEGER PRIMARY KEY CHECK (id = 1), " +
                "total INTEGER NOT NULL DEFAULT 0, " +
                "updated_at TEXT NOT NULL)"
            )
        ]).catch(function (error) {
            schemaReady = null;
            throw error;
        });
    }
    return schemaReady;
}

async function digest(value) {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash))
        .map(function (byte) { return byte.toString(16).padStart(2, "0"); })
        .join("");
}

function sameSecret(given, expected) {
    if (typeof given !== "string" || typeof expected !== "string") { return false; }
    const a = new TextEncoder().encode(given);
    const b = new TextEncoder().encode(expected);
    let diff = a.length ^ b.length;
    const length = Math.max(a.length, b.length);
    for (let i = 0; i < length; i += 1) { diff |= (a[i] || 0) ^ (b[i] || 0); }
    return diff === 0;
}

function getIp(request) {
    return request.headers.get("cf-connecting-ip") || "unknown";
}

function cleanLink(raw) {
    const value = String(raw === null || raw === undefined ? "" : raw).trim();
    if (!value) { return { value: "" }; }
    if (value.length > MAX_URL) { return { error: "That link is longer than " + MAX_URL + " characters." }; }
    if (/[\s<>\"]/.test(value)) { return { error: "That link has spaces or characters a URL cannot contain." }; }
    let candidate = value;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
        if (!/^[^\s/?#]+\.[^\s/?#]{2,}/.test(candidate)) { return { error: "That does not look like a link." }; }
        candidate = "https://" + candidate;
    }
    let parsed;
    try { parsed = new URL(candidate); } catch (error) { return { error: "That does not look like a link." }; }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") { return { error: "Only http and https links can be submitted." }; }
    if (!parsed.hostname || parsed.hostname.indexOf(".") === -1) { return { error: "That link has no usable domain." }; }
    return { value: parsed.toString() };
}

async function readJson(request) {
    try {
        const body = await request.json();
        return body && typeof body === "object" ? body : null;
    } catch (error) {
        return null;
    }
}

async function handleMessages(request, env) {
    if (request.method === "GET") {
        const url = new URL(request.url);
        const requestedLimit = Number(url.searchParams.get("limit") || CHAT_LIMIT);
        const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : CHAT_LIMIT, 1), CHAT_LIMIT);
        const rows = await env.DB.prepare(
            "SELECT id, created_at, author, text FROM chat_messages ORDER BY created_at DESC LIMIT " + limit
        ).all();
        const messages = (rows && rows.results ? rows.results : []).reverse().map(function (row) {
            return { id: row.id, createdAt: row.created_at, author: row.author, text: row.text };
        });
        return json(request, { ok: true, messages: messages });
    }

    if (request.method !== "POST") { return fail(request, "Use GET or POST.", 405); }
    const body = await readJson(request);
    if (!body) { return fail(request, "Send a JSON object.", 400); }
    const author = String(body.author || "Guest").trim().slice(0, MAX_AUTHOR) || "Guest";
    const text = String(body.text || "").trim();
    if (text.length < 1) { return fail(request, "Write a message first.", 422); }
    if (text.length > MAX_CHAT_TEXT) { return fail(request, "Keep messages under " + MAX_CHAT_TEXT + " characters.", 422); }

    const ipHash = await digest(getIp(request));
    const cutoff = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const recent = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM chat_messages WHERE ip_hash = ? AND created_at > ?"
    ).bind(ipHash, cutoff).first();
    if (recent && Number(recent.total) >= CHAT_RATE_MAX) {
        return fail(request, "You are sending messages too quickly. Try again in a few minutes.", 429);
    }

    const createdAt = new Date().toISOString();
    const id = crypto.randomUUID();
    await env.DB.prepare(
        "INSERT INTO chat_messages (id, created_at, author, text, ip_hash) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, createdAt, author, text, ipHash).run();
    return json(request, { ok: true, message: { id: id, createdAt: createdAt, author: author, text: text } }, 201);
}

async function handleViews(request, env) {
    if (request.method === "GET") {
        const row = await env.DB.prepare("SELECT total FROM page_views WHERE id = 1").first();
        return json(request, { ok: true, total: row ? Number(row.total) : 0 });
    }
    if (request.method !== "POST") { return fail(request, "Use GET or POST.", 405); }
    const updatedAt = new Date().toISOString();
    await env.DB.prepare(
        "INSERT INTO page_views (id, total, updated_at) VALUES (1, 1, ?) " +
        "ON CONFLICT(id) DO UPDATE SET total = page_views.total + 1, updated_at = excluded.updated_at"
    ).bind(updatedAt).run();
    const row = await env.DB.prepare("SELECT total FROM page_views WHERE id = 1").first();
    return json(request, { ok: true, total: row ? Number(row.total) : 1 });
}

async function handleSubmit(request, env) {
    const body = await readJson(request);
    if (!body) { return fail(request, "Send a JSON object.", 400); }
    const message = String(body.message || "").trim();
    if (message.length < MIN_MESSAGE) { return fail(request, "Write at least " + MIN_MESSAGE + " characters so we know what to add.", 422); }
    if (message.length > MAX_MESSAGE) { return fail(request, "Keep it under " + MAX_MESSAGE + " characters.", 422); }
    const link = cleanLink(body.url);
    if (link.error) { return fail(request, link.error, 422); }
    const ipHash = await digest(getIp(request));
    const cutoff = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const recent = await env.DB.prepare("SELECT COUNT(*) AS total FROM submissions WHERE ip_hash = ? AND created_at > ?").bind(ipHash, cutoff).first();
    if (recent && Number(recent.total) >= RATE_MAX) { return fail(request, "That is a lot of suggestions in a short time. Try again in a few minutes.", 429); }
    const createdAt = new Date().toISOString();
    const result = await env.DB.prepare("INSERT INTO submissions (created_at, url, message, ip_hash) VALUES (?, ?, ?, ?)").bind(createdAt, link.value, message, ipHash).run();
    return json(request, { ok: true, id: result && result.meta ? result.meta.last_row_id : null, createdAt: createdAt }, 201);
}

async function handleAdminList(request, env) {
    if (!env.ADMIN_PASSWORD) { return fail(request, "The admin password has not been set on this deployment yet.", 503); }
    let given = request.headers.get("x-admin-password") || "";
    if (!given) {
        const body = await readJson(request);
        given = body && typeof body.password === "string" ? body.password : "";
    }
    if (!sameSecret(given, env.ADMIN_PASSWORD)) { return fail(request, "Wrong password.", 401); }
    const rows = await env.DB.prepare("SELECT id, created_at, url, message, status FROM submissions ORDER BY id DESC LIMIT " + LIST_LIMIT).all();
    const total = await env.DB.prepare("SELECT COUNT(*) AS total FROM submissions").first();
    const items = (rows && rows.results ? rows.results : []).map(function (row) {
        return { id: row.id, createdAt: row.created_at, url: row.url, message: row.message, status: row.status };
    });
    return json(request, { ok: true, total: total ? Number(total.total) : items.length, limit: LIST_LIMIT, items: items });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname.replace(/\/+$/, "") || "/";
        if (request.method === "OPTIONS") { return new Response(null, { status: 204, headers: corsHeaders(request) }); }
        try {
            if (path === "/" || path === "/api/health") {
                return json(request, { ok: true, service: "polytrack-hub-api", adminConfigured: Boolean(env.ADMIN_PASSWORD) });
            }
            await ensureSchema(env);
            if (path === "/api/messages") { return await handleMessages(request, env); }
            if (path === "/api/views") { return await handleViews(request, env); }
            if (path === "/api/submit") {
                if (request.method !== "POST") { return fail(request, "Use POST.", 405); }
                return await handleSubmit(request, env);
            }
            if (path === "/api/admin/list") {
                if (request.method !== "POST") { return fail(request, "Use POST.", 405); }
                return await handleAdminList(request, env);
            }
            return fail(request, "No such endpoint.", 404);
        } catch (error) {
            return fail(request, "The hub API is unavailable right now.", 500);
        }
    }
};
