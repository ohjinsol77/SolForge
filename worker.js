const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const COINGECKO_API = "https://api.coingecko.com/api/v3";
const COINPAPRIKA_TICKERS = "https://api.coinpaprika.com/v1/tickers";
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
  return cryptoMarkets(upstream, { currency, ids, order: upstream.searchParams.get("order"), perPage: Number(upstream.searchParams.get("per_page")) });
}

async function cryptoMarkets(coingeckoUrl, options) {
  try {
    const response = await providerFetch(coingeckoUrl, 300);
    if (response.ok) return jsonResponse(response.body, 300);
  } catch (_error) {
    // Use the secondary public market-data provider below.
  }

  try {
    const paprikaUrl = new URL(COINPAPRIKA_TICKERS);
    paprikaUrl.searchParams.set("quotes", "USD,KRW");
    paprikaUrl.searchParams.set("limit", "250");
    const response = await providerFetch(paprikaUrl, 300);
    if (!response.ok) return json({ error: `Data providers returned HTTP ${response.status}.` }, 502);
    const tickers = await response.json();
    const requested = options.ids ? new Set(options.ids.split(",").filter(Boolean)) : null;
    const quoteKey = options.currency.toUpperCase();
    const result = (Array.isArray(tickers) ? tickers : [])
      .filter((coin) => !requested || requested.has(coin.id))
      .sort((a, b) => {
        const aQuote = a.quotes?.[quoteKey] || {};
        const bQuote = b.quotes?.[quoteKey] || {};
        return options.order === "volume_desc"
          ? Number(bQuote.volume_24h || 0) - Number(aQuote.volume_24h || 0)
          : Number(bQuote.market_cap || 0) - Number(aQuote.market_cap || 0);
      })
      .slice(0, options.perPage)
      .map((coin) => {
        const quote = coin.quotes?.[quoteKey] || {};
        return {
          id: coin.id,
          symbol: String(coin.symbol || "").toLowerCase(),
          name: coin.name || coin.id,
          image: "/assets/img/favicon.svg",
          current_price: quote.price ?? null,
          market_cap: quote.market_cap ?? null,
          market_cap_rank: coin.rank ?? null,
          total_volume: quote.volume_24h ?? null,
          price_change_percentage_24h: quote.percent_change_24h ?? null,
          price_change_percentage_24h_in_currency: quote.percent_change_24h ?? null,
          price_change_percentage_7d_in_currency: quote.percent_change_7d ?? null,
          sparkline_in_7d: { price: [] },
          last_updated: coin.last_updated || null
        };
      });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=60, s-maxage=300",
        "x-content-type-options": "nosniff"
      }
    });
  } catch (_error) {
    return json({ error: "Crypto market providers are temporarily unavailable." }, 502);
  }
}

async function proxyJson(url, cacheTtl) {
  try {
    const response = await providerFetch(url, cacheTtl);
    if (!response.ok) {
      return json({ error: `Data provider returned HTTP ${response.status}.` }, 502);
    }
    return jsonResponse(response.body, cacheTtl);
  } catch (_error) {
    return json({ error: "Data provider is temporarily unavailable." }, 502);
  }
}

function providerFetch(url, cacheTtl) {
  return fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "Mozilla/5.0 (compatible; SolForge/1.0; +https://solforge.cloud)"
    },
    cf: { cacheEverything: true, cacheTtl }
  });
}

function jsonResponse(body, cacheTtl) {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=60, s-maxage=${cacheTtl}`,
      "x-content-type-options": "nosniff"
    }
  });
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
