const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const STOCK_RANGES = new Set(["1mo", "3mo", "6mo", "1y"]);
const STOCK_SYMBOL = /^[A-Z0-9.^=_-]{1,24}$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/yahoo-chart") return yahooChart(request, url);
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
