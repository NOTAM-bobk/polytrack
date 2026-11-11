const HUB_API_ORIGIN = "https://polytrack-hub-api.sawyerbobk563.workers.dev";
const ALLOWED_ENDPOINTS = new Set(["messages", "views"]);

module.exports = async function handler(req, res) {
  const endpoint = req.query && req.query.endpoint;
  const method = req.method || "GET";

  if (!ALLOWED_ENDPOINTS.has(endpoint)) {
    res.status(404).json({ ok: false, error: "No such endpoint." });
    return;
  }

  if (endpoint === "messages" && method !== "GET" && method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ ok: false, error: "Use GET or POST." });
    return;
  }

  if (endpoint === "views" && method !== "GET" && method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ ok: false, error: "Use GET or POST." });
    return;
  }

  const requestUrl = new URL(req.url, "https://site.invalid");
  const upstreamUrl = new URL(`/api/${endpoint}`, HUB_API_ORIGIN);
  upstreamUrl.search = requestUrl.search;

  const headers = { Accept: "application/json" };
  const options = { method, headers, cache: "no-store" };
  if (method === "POST") {
    headers["Content-Type"] = "application/json";
    options.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  }

  try {
    const upstream = await fetch(upstreamUrl, options);
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(body);
  } catch {
    res.status(502).json({ ok: false, error: "The hub API is temporarily unavailable." });
  }
};
