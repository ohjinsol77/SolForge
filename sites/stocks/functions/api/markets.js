const DOMESTIC_URL = "https://polling.finance.naver.com/api/realtime/domestic/index/KOSPI,KOSDAQ";
const GLOBAL_INDEXES = {
  gspc: ".INX",
  ixic: ".IXIC",
  dji: ".DJI",
  n225: ".N225"
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
  const requests = [
    fetchJson(DOMESTIC_URL).then((payload) => {
      const domestic = Object.fromEntries((payload?.datas || []).map((item) => [item.itemCode, item]));
      indexes.ks11 = normalize(domestic.KOSPI);
      indexes.kq11 = normalize(domestic.KOSDAQ);
    }),
    ...Object.entries(GLOBAL_INDEXES).map(([id, code]) =>
      fetchJson(`https://api.stock.naver.com/index/${encodeURIComponent(code)}/basic`).then((payload) => {
        indexes[id] = normalize(payload);
      })
    )
  ];

  await Promise.allSettled(requests);
  for (const [id, value] of Object.entries(indexes)) if (!value) delete indexes[id];

  if (!Object.keys(indexes).length) {
    return json({ error: "market_data_unavailable" }, 502, "no-store");
  }

  return json({ source: "NAVER Finance", fetchedAt: new Date().toISOString(), indexes });
}
