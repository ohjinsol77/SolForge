const YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const COINGECKO_API = "https://api.coingecko.com/api/v3";
const COINPAPRIKA_TICKERS = "https://api.coinpaprika.com/v1/tickers";
const BINANCE_TICKER = "https://api.binance.com/api/v3/ticker/24hr";
const EXCHANGE_RATE_API = "https://open.er-api.com/v6/latest/USD";
const COINBASE_RATES = "https://api.coinbase.com/v2/exchange-rates?currency=USD";
const FEAR_GREED_API = "https://api.alternative.me/fng/?limit=31&format=json";
const STOCK_RANGES = new Set(["1mo", "3mo", "6mo", "1y"]);
const STOCK_SYMBOL = /^[A-Z0-9.^=_-]{1,24}$/i;
const BINANCE_COINS = [
  ["bitcoin", "BTC", "Bitcoin"],
  ["ethereum", "ETH", "Ethereum"],
  ["binancecoin", "BNB", "BNB"],
  ["solana", "SOL", "Solana"],
  ["ripple", "XRP", "XRP"],
  ["dogecoin", "DOGE", "Dogecoin"],
  ["cardano", "ADA", "Cardano"],
  ["tron", "TRX", "TRON"],
  ["avalanche-2", "AVAX", "Avalanche"],
  ["chainlink", "LINK", "Chainlink"],
  ["sui", "SUI", "Sui"],
  ["stellar", "XLM", "Stellar"],
  ["bitcoin-cash", "BCH", "Bitcoin Cash"],
  ["litecoin", "LTC", "Litecoin"],
  ["polkadot", "DOT", "Polkadot"],
  ["hedera-hashgraph", "HBAR", "Hedera"],
  ["uniswap", "UNI", "Uniswap"],
  ["near", "NEAR", "NEAR Protocol"],
  ["aptos", "APT", "Aptos"],
  ["internet-computer", "ICP", "Internet Computer"]
];

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
    if (response.ok) {
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
        .map((coin) => normalizeFallbackCoin({
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          rank: coin.rank,
          quote: coin.quotes?.[quoteKey],
          lastUpdated: coin.last_updated
        }));
      return marketResponse(result);
    }
  } catch (_error) {
    // Try the exchange-based fallback below.
  }
  return binanceMarkets(options);
}

async function binanceMarkets(options) {
  try {
    const metadata = new Map(BINANCE_COINS.map(([id, symbol, name], index) => [`${symbol}USDT`, { id, symbol, name, rank: index + 1 }]));
    const symbols = [...metadata.keys()];
    const url = new URL(BINANCE_TICKER);
    url.searchParams.set("symbols", JSON.stringify(symbols));
    url.searchParams.set("type", "MINI");
    const response = await providerFetch(url, 300);
    if (!response.ok) return coinbaseMarkets(options);
    const tickers = await response.json();
    const requested = options.ids ? new Set(options.ids.split(",").filter(Boolean)) : null;
    const multiplier = options.currency === "krw" ? await usdKrwRate() : 1;
    const result = (Array.isArray(tickers) ? tickers : [])
      .map((ticker) => {
        const coin = metadata.get(ticker.symbol);
        if (!coin || (requested && !requested.has(coin.id))) return null;
        const open = Number(ticker.openPrice);
        const price = Number(ticker.lastPrice);
        const volume = Number(ticker.quoteVolume);
        const change24h = open ? (price - open) / open * 100 : null;
        return normalizeFallbackCoin({
          ...coin,
          quote: {
            price: price * multiplier,
            volume_24h: volume * multiplier,
            market_cap: null,
            percent_change_24h: change24h,
            percent_change_7d: null
          },
          lastUpdated: new Date(Number(ticker.closeTime) || Date.now()).toISOString()
        });
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.total_volume || 0) - Number(a.total_volume || 0))
      .slice(0, options.perPage);
    return marketResponse(result);
  } catch (_error) {
    return coinbaseMarkets(options);
  }
}

async function coinbaseMarkets(options) {
  try {
    const response = await providerFetch(COINBASE_RATES, 300);
    if (!response.ok) return json({ error: `Crypto market providers returned HTTP ${response.status}.` }, 502);
    const data = await response.json();
    const rates = data?.data?.rates || {};
    const requested = options.ids ? new Set(options.ids.split(",").filter(Boolean)) : null;
    const krwRate = Number(rates.KRW);
    const multiplier = options.currency === "krw" && Number.isFinite(krwRate) && krwRate > 0 ? krwRate : 1;
    const result = BINANCE_COINS
      .map(([id, symbol, name], index) => {
        if (requested && !requested.has(id)) return null;
        const inverseRate = Number(rates[symbol]);
        if (!Number.isFinite(inverseRate) || inverseRate <= 0) return null;
        return normalizeFallbackCoin({
          id,
          symbol,
          name,
          rank: index + 1,
          quote: {
            price: multiplier / inverseRate,
            volume_24h: null,
            market_cap: null,
            percent_change_24h: null,
            percent_change_7d: null
          },
          lastUpdated: new Date().toISOString()
        });
      })
      .filter(Boolean)
      .slice(0, options.perPage);
    if (!result.length) return json({ error: "Crypto market providers returned no usable data." }, 502);
    return marketResponse(result);
  } catch (_error) {
    return json({ error: "Crypto market providers are temporarily unavailable." }, 502);
  }
}

async function usdKrwRate() {
  const sources = [
    {
      url: EXCHANGE_RATE_API,
      read: (data) => data?.rates?.KRW
    },
    {
      url: COINBASE_RATES,
      read: (data) => data?.data?.rates?.KRW
    },
    {
      url: `${YAHOO_CHART}/${encodeURIComponent("KRW=X")}?range=1d&interval=1d`,
      read: (data) => data?.chart?.result?.[0]?.meta?.regularMarketPrice
    }
  ];

  for (const source of sources) {
    try {
      const response = await providerFetch(source.url, 300);
      if (!response.ok) continue;
      const rate = Number(source.read(await response.json()));
      if (Number.isFinite(rate) && rate > 0) return rate;
    } catch (_error) {
      // Try the next exchange-rate source.
    }
  }
  throw new Error("Exchange rate unavailable.");
}

function normalizeFallbackCoin({ id, symbol, name, rank, quote = {}, lastUpdated }) {
  return {
    id,
    symbol: String(symbol || "").toLowerCase(),
    name: name || id,
    image: "/assets/img/favicon.svg",
    current_price: quote.price ?? null,
    market_cap: quote.market_cap ?? null,
    market_cap_rank: rank ?? null,
    total_volume: quote.volume_24h ?? null,
    price_change_percentage_24h: quote.percent_change_24h ?? null,
    price_change_percentage_24h_in_currency: quote.percent_change_24h ?? null,
    price_change_percentage_7d_in_currency: quote.percent_change_7d ?? null,
    sparkline_in_7d: { price: [] },
    last_updated: lastUpdated || null
  };
}

function marketResponse(result) {
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=300",
      "x-content-type-options": "nosniff"
    }
  });
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
