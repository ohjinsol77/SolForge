const pages = [
  {
    slug: "index",
    key: "home",
    snapshot: true,
    sections: ["marketCap", "dominance", "volume", "sentiment"],
    links: ["market-context", "bitcoin", "ethereum", "risk"]
  },
  {
    slug: "market-context",
    key: "marketContext",
    sections: ["marketCap", "volume", "dominance", "sentiment", "timeframe", "checklist"]
  },
  {
    slug: "bitcoin",
    key: "bitcoin",
    sections: ["purpose", "issuance", "network", "signals", "risks", "checklist"]
  },
  {
    slug: "ethereum",
    key: "ethereum",
    sections: ["purpose", "fees", "consensus", "ecosystem", "signals", "risks"]
  },
  {
    slug: "risk",
    key: "risk",
    sections: ["volatility", "leverage", "custody", "contracts", "stablecoin", "liquidity"]
  },
  {
    slug: "methodology",
    key: "methodology",
    sections: ["sources", "refresh", "currency", "missing", "editorial", "disclaimer"]
  },
  {
    slug: "about",
    key: "about",
    sections: ["mission", "scope", "bilingual", "independence"]
  },
  {
    slug: "privacy",
    key: "privacy",
    sections: ["inputs", "apis", "hosting", "advertising", "contact"]
  }
];

const nav = [
  { slug: "index", key: "nav.home" },
  { slug: "market-context", key: "nav.market" },
  { slug: "bitcoin", key: "nav.bitcoin" },
  { slug: "ethereum", key: "nav.ethereum" },
  { slug: "risk", key: "nav.risk" }
];

module.exports = { nav, pages };
