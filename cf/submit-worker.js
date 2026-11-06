/**
 * Submission API for the Education Games hub.
 *
 * POST /api/submit      { url?, message }        store a suggestion
 * POST /api/admin/list  header x-admin-password  list what was entered
 * GET  /api/health                               deployment check
 *
 * Storage is a D1 database bound as env.DB. The admin password is a Worker
 * secret named ADMIN_PASSWORD and is never sent to the browser.
 */

const MAX_MESSAGE = 2000;
const MIN_MESSAGE = 3;
const MAX_URL = 500;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const LIST_LIMIT = 200;

/* The hub and every subdomain of it may post; local dev ports are allowed so
   the page can be tested without deploying. */
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

/* Runs once per isolate; CREATE TABLE IF NOT EXISTS keeps redeploys harmless. */
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
            env.DB.prepare(
                "CREATE INDEX IF NOT EXISTS submissions_created_at ON submissions (created_at)"
            ),
            env.DB.prepare(
                "CREATE INDEX IF NOT EXISTS submissions_ip ON submissions (ip_hash, created_at)"
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
    for (let i = 0; i < length; i += 1) {
        diff |= (a[i] || 0) ^ (b[i] || 0);
    }
    return diff === 0;
}

function cleanLink(raw) {
    const value = String(raw === null || raw === undefined ? "" : raw).trim();
    if (!value) { return { value: "" }; }
    if (value.length > MAX_URL) { return { error: "That link is longer than " + MAX_URL + " characters." }; }
    if (/[\s<>"]/.test(value)) { return { error: "That link has spaces or characters a URL cannot contain." }; }

    let candidate = value;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
        if (!/^[^\s/?#]+\.[^\s/?#]{2,}/.test(candidate)) {
            return { error: "That does not look like a link." };
        }
        candidate = "https://" + candidate;
    }

    let parsed;
    try {
        parsed = new URL(candidate);
    } catch (error) {
        return { error: "That does not look like a link." };
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { error: "Only http and https links can be submitted." };
    }
    if (!parsed.hostname || parsed.hostname.indexOf(".") === -1) {
        return { error: "That link has no usable domain." };
    }
    return { value: parsed.toString() };
}

async function handleSubmit(request, env) {
    let body;
    try {
        body = await request.json();
    } catch (error) {
        return fail(request, "Send a JSON body.", 400);
    }
    if (!body || typeof body !== "object") { return fail(request, "Send a JSON object.", 400); }

    const message = String(body.message === null || body.message === undefined ? "" : body.message).trim();
    if (message.length < MIN_MESSAGE) {
        return fail(request, "Write at least " + MIN_MESSAGE + " characters so we know what to add.", 422);
    }
    if (message.length > MAX_MESSAGE) {
        return fail(request, "Keep it under " + MAX_MESSAGE + " characters.", 422);
    }

    const link = cleanLink(body.url);
    if (link.error) { return fail(request, link.error, 422); }

    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const ipHash = await digest(ip);
    const cutoff = new Date(Date.now() - RATE_WINDOW_MS).toISOString();

    const recent = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM submissions WHERE ip_hash = ? AND created_at > ?"
    ).bind(ipHash, cutoff).first();

    if (recent && Number(recent.total) >= RATE_MAX) {
        return fail(request, "That is a lot of suggestions in a short time. Try again in a few minutes.", 429);
    }

    const createdAt = new Date().toISOString();
    const result = await env.DB.prepare(
        "INSERT INTO submissions (created_at, url, message, ip_hash) VALUES (?, ?, ?, ?)"
    ).bind(createdAt, link.value, message, ipHash).run();

    const id = (result && result.meta && result.meta.last_row_id) || null;
    return json(request, { ok: true, id: id, createdAt: createdAt }, 201);
}

async function handleAdminList(request, env) {
    if (!env.ADMIN_PASSWORD) {
        return fail(request, "The admin password has not been set on this deployment yet.", 503);
    }

    let given = request.headers.get("x-admin-password") || "";
    if (!given) {
        try {
            const body = await request.json();
            given = body && typeof body.password === "string" ? body.password : "";
        } catch (error) {
            given = "";
        }
    }

    if (!sameSecret(given, env.ADMIN_PASSWORD)) {
        return fail(request, "Wrong password.", 401);
    }

    const rows = await env.DB.prepare(
        "SELECT id, created_at, url, message, status FROM submissions ORDER BY id DESC LIMIT " + LIST_LIMIT
    ).all();

    const total = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM submissions"
    ).first();

    const items = (rows && rows.results ? rows.results : []).map(function (row) {
        return {
            id: row.id,
            createdAt: row.created_at,
            url: row.url,
            message: row.message,
            status: row.status
        };
    });

    return json(request, {
        ok: true,
        total: total ? Number(total.total) : items.length,
        limit: LIST_LIMIT,
        items: items
    });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname.replace(/\/+$/, "") || "/";

        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders(request) });
        }

        try {
            if (path === "/" || path === "/api/health") {
                return json(request, {
                    ok: true,
                    service: "submit-api",
                    adminConfigured: Boolean(env.ADMIN_PASSWORD)
                });
            }

            await ensureSchema(env);

            if (path === "/api/submit") {
                if (request.method !== "POST") {
                    return fail(request, "Use POST.", 405);
                }
                return await handleSubmit(request, env);
            }

            if (path === "/api/admin/list") {
                if (request.method !== "POST") {
                    return fail(request, "Use POST.", 405);
                }
                return await handleAdminList(request, env);
            }

            return fail(request, "No such endpoint.", 404);
        } catch (error) {
            return fail(request, "The submission store is unavailable right now.", 500);
        }
    }
};
