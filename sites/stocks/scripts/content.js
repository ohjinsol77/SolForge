const pages = [
  { slug: "index", key: "home", feature: "market-board", sections: ["marketStructure", "korea", "global", "company"], links: ["korea-market", "global-market", "indicators", "company-reading"] },
  { slug: "korea-market", key: "koreaMarket", sections: ["kospi", "kosdaq", "participants", "currency", "sectors", "disclosures"] },
  { slug: "global-market", key: "globalMarket", sections: ["indexes", "rates", "dollar", "earnings", "sectors", "sessions"] },
  { slug: "indicators", key: "indicators", sections: ["price", "volume", "marketCap", "valuation", "profitability", "stability"] },
  { slug: "company-reading", key: "companyReading", sections: ["business", "revenue", "earnings", "balance", "cashflow", "governance"] },
  { slug: "risk", key: "risk", sections: ["volatility", "concentration", "currency", "liquidity", "leverage", "events"] },
  { slug: "methodology", key: "methodology", sections: ["sources", "refresh", "delay", "adjustment", "missing", "disclaimer"] },
  { slug: "about", key: "about", sections: ["mission", "scope", "bilingual", "independence"] },
  { slug: "privacy", key: "privacy", sections: ["inputs", "apis", "hosting", "advertising", "contact"] }
];

const nav = [
  { slug: "index", key: "nav.home" },
  { slug: "korea-market", key: "nav.korea" },
  { slug: "global-market", key: "nav.global" },
  { slug: "indicators", key: "nav.indicators" },
  { slug: "risk", key: "nav.risk" }
];

module.exports = { nav, pages };
