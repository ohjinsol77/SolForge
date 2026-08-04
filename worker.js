const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const COINGECKO_API = "https://api.coingecko.com/api/v3";
const FEAR_GREED_API = "https://api.alternative.me/fng/?limit=31&format=json";
const STOCK_RANGES = new Set(["1mo", "3mo", "6mo", "1y"]);
const STOCK_SYMBOL = /^[A-Z0-9.^=_-]{1,24}$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/yahoo-chart") return yahooChart(request, url);
    if (url.pathname.startsWith("/api/crypto/")) return cryptoData(request, url);
    return env.ASSETS.fetch(request);
  }
};

async function yahooChart(request, url) {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed." }, 405, { Allow: "GET" });
  }

  const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();
  const range = url.searchParams.get("range") || "3mo";
  if (!STOCK_SYMBOL.test(symbol)) return json({ error: "Invalid stock symbol." }, 400);
  if (!STOCK_RANGES.has(range)) return json({ error: "Invalid chart range." }, 400);

  const upstream = new URL(`${YAHOO_CHART}/${encodeURIComponent(symbol)}`);
  upstream.searchParams.set("range", range);
  upstream.searchParams.set("interval", "1d");
  upstream.searchParams.set("includePrePost", "false");
  upstream.searchParams.set("events", "div,splits");

  try {
    const response = await fetch(upstream, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 (compatible; SolForge/1.0; +https://solforge.cloud)"
      },
      cf: { cacheEverything: true, cacheTtl: 300 }
    });
    if (!response.ok) {
      return json({ error: `Stock data provider returned HTTP ${response.status}.` }, 502);
    }
    return new Response(response.body, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=60, s-maxage=300",
        "x-content-type-options": "nosniff"
      }
    });
  } catch (_error) {
    return json({ error: "Stock data provider is temporarily unavailable." }, 502);
  }
}

async function cryptoData(request, url) {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed." }, 405, { Allow: "GET" });
  }

  const resource = url.pathname.slice("/api/crypto/".length);
  if (resource === "fng") return proxyJson(FEAR_GREED_API, 1800);
  if (resource === "global") return proxyJson(`${COINGECKO_API}/global`, 300);
  if (resource === "categories") return proxyJson(`${COINGECKO_API}/coins/categories`, 300);
  if (resource !== "markets") return json({ error: "Unknown crypto resource." }, 404);

  const currency = url.searchParams.get("vs_currency") === "krw" ? "krw" : "usd";
  const ids = url.searchParams.get("ids") || "";
  if (ids && (!/^[a-z0-9,-]+$/i.test(ids) || ids.length > 1200)) {
    return json({ error: "Invalid coin identifiers." }, 400);
  }
  const upstream = new URL(`${COINGECKO_API}/coins/markets`);
  upstream.searchParams.set("vs_currency", currency);
  upstream.searchParams.set("order", url.searchParams.get("order") === "volume_desc" ? "volume_desc" : "market_cap_desc");
  upstream.searchParams.set("per_page", String(Math.min(250, Math.max(1, Number(url.searchParams.get("per_page")) || 20))));
  upstream.searchParams.set("page", "1");
  upstream.searchParams.set("sparkline", url.searchParams.get("sparkline") === "true" ? "true" : "false");
  upstream.searchParams.set("price_change_percentage", "24h,7d");
  upstream.searchParams.set("locale", "ko");
  if (ids) upstream.searchParams.set("ids", ids);
  return proxyJson(upstream, 300);
}

async function proxyJson(url, cacheTtl) {
  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 (compatible; SolForge/1.0; +https://solforge.cloud)"
      },
      cf: { cacheEverything: true, cacheTtl }
    });
    if (!response.ok) {
      return json({ error: `Data provider returned HTTP ${response.status}.` }, 502);
    }
    return new Response(response.body, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": `public, max-age=60, s-maxage=${cacheTtl}`,
        "x-content-type-options": "nosniff"
      }
    });
  } catch (_error) {
    return json({ error: "Data provider is temporarily unavailable." }, 502);
  }
}

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers
    }
  });
}
