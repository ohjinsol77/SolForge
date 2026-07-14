const DOMESTIC_URL = "https://polling.finance.naver.com/api/realtime/domestic/index/KOSPI,KOSDAQ";
const NAVER_FRONT_API = "https://m.stock.naver.com/front-api";
const GLOBAL_INDEXES = {
  gspc: ".INX",
  ixic: ".IXIC",
  dji: ".DJI",
  n225: ".N225"
};
const EXCHANGE_RATES = {
  usd: "FX_USDKRW",
  jpy: "FX_JPYKRW",
  eur: "FX_EURKRW"
};

function json(body, status = 200, cacheControl = "public, max-age=30, s-maxage=60") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
      "x-content-type-options": "nosniff"
    }
  });
}

function numeric(rawValue, displayValue) {
  const candidate = rawValue ?? displayValue;
  const value = typeof candidate === "number" ? candidate : Number(String(candidate ?? "").replaceAll(",", ""));
  return Number.isFinite(value) ? value : null;
}

function normalize(item) {
  const price = numeric(item?.closePriceRaw, item?.closePrice);
  const change = numeric(item?.compareToPreviousClosePriceRaw, item?.compareToPreviousClosePrice);
  const percent = numeric(item?.fluctuationsRatioRaw, item?.fluctuationsRatio);
  if (![price, change, percent].every(Number.isFinite)) return null;
  return {
    price,
    change,
    percent,
    marketStatus: item.marketStatus || null,
    asOf: item.localTradedAt || null
  };
}

function totalInfoMap(integration) {
  return Object.fromEntries((integration?.totalInfos || []).map((item) => [item.code, item.value]));
}

function normalizeDomestic(item, integration) {
  const base = normalize(item);
  if (!base) return null;
  const totals = totalInfoMap(integration);
  const breadth = integration?.upDownStockInfo || {};
  const flows = integration?.dealTrendInfo || {};
  return {
    ...base,
    open: numeric(item?.openPriceRaw, item?.openPrice),
    high: numeric(item?.highPriceRaw, item?.highPrice),
    low: numeric(item?.lowPriceRaw, item?.lowPrice),
    volume: numeric(item?.accumulatedTradingVolumeRaw),
    tradingValue: numeric(item?.accumulatedTradingValueRaw),
    high52: numeric(totals.highPriceOf52Weeks),
    low52: numeric(totals.lowPriceOf52Weeks),
    breadth: {
      upper: numeric(breadth.upperCount),
      rising: numeric(breadth.riseCount),
      steady: numeric(breadth.steadyCount),
      falling: numeric(breadth.fallCount),
      lower: numeric(breadth.lowerCount)
    },
    flows: {
      personal: numeric(flows.personalValue),
      foreign: numeric(flows.foreignValue),
      institutional: numeric(flows.institutionalValue),
      date: flows.bizdate || null
    }
  };
}

function normalizeExchange(payload) {
  const item = payload?.exchangeInfo;
  const price = numeric(item?.closePrice);
  const change = numeric(item?.fluctuations);
  const percent = numeric(item?.fluctuationsRatio);
  if (![price, change, percent].every(Number.isFinite)) return null;
  return {
    price,
    change,
    percent,
    marketStatus: item.marketStatus || null,
    asOf: item.localTradedAt || null
  };
}

function normalizeLeaders(payload) {
  if (!payload?.isSuccess) return [];
  return (payload?.result?.stocks || [])
    .filter((item) => item?.stockEndType === "stock")
    .map((item) => ({
      code: String(item.itemCode || ""),
      name: String(item.name || ""),
      price: numeric(item.currentPrice),
      change: numeric(item.fluctuations),
      percent: numeric(item.fluctuationsRatio),
      tradingValue: numeric(item.accumulatedTradingValue)
    }))
    .filter((item) => item.code && item.name && [item.price, item.change, item.percent, item.tradingValue].every(Number.isFinite))
    .slice(0, 5);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    cf: { cacheEverything: true, cacheTtl: 30 }
  });
  if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
  return response.json();
}

export async function onRequestGet() {
  const indexes = {};
  const exchangeRates = {};
  const leaders = {};
  const integrations = {};
  let domesticPayload = null;

  const requests = [
    fetchJson(DOMESTIC_URL).then((payload) => {
      domesticPayload = payload;
    }),
    ...["KOSPI", "KOSDAQ"].map((code) =>
      fetchJson(`${NAVER_FRONT_API}/stock/domestic/integration?code=${code}&endType=index`).then((payload) => {
        if (payload?.isSuccess) integrations[code] = payload.result;
      })
    ),
    ...Object.entries(GLOBAL_INDEXES).map(([id, code]) =>
      fetchJson(`https://api.stock.naver.com/index/${encodeURIComponent(code)}/basic`).then((payload) => {
        indexes[id] = normalize(payload);
      })
    ),
    ...Object.entries(EXCHANGE_RATES).map(([id, code]) =>
      fetchJson(`https://api.stock.naver.com/marketindex/exchange/${code}`).then((payload) => {
        exchangeRates[id] = normalizeExchange(payload);
      })
    ),
    ...["KOSPI", "KOSDAQ"].map((category) =>
      fetchJson(`${NAVER_FRONT_API}/domestic/stock/list?sortType=priceTop&category=${category}&domesticStockExchangeType=KRX&page=1&pageSize=15`).then((payload) => {
        leaders[category.toLowerCase()] = normalizeLeaders(payload);
      })
    )
  ];

  await Promise.allSettled(requests);

  const domesticItems = Object.fromEntries((domesticPayload?.datas || []).map((item) => [item.itemCode, item]));
  indexes.ks11 = normalize(domesticItems.KOSPI);
  indexes.kq11 = normalize(domesticItems.KOSDAQ);
  const domestic = {
    kospi: normalizeDomestic(domesticItems.KOSPI, integrations.KOSPI),
    kosdaq: normalizeDomestic(domesticItems.KOSDAQ, integrations.KOSDAQ)
  };

  for (const [id, value] of Object.entries(indexes)) if (!value) delete indexes[id];
  for (const [id, value] of Object.entries(exchangeRates)) if (!value) delete exchangeRates[id];
  for (const [id, value] of Object.entries(domestic)) if (!value) delete domestic[id];
  for (const [id, value] of Object.entries(leaders)) if (!value?.length) delete leaders[id];

  if (!Object.keys(indexes).length && !Object.keys(domestic).length) {
    return json({ error: "market_data_unavailable" }, 502, "no-store");
  }

  return json({
    source: "NAVER Finance",
    fetchedAt: new Date().toISOString(),
    indexes,
    domestic,
    exchangeRates,
    leaders
  });
}
