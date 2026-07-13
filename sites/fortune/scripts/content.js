const pages = [
  { slug: "index", key: "home", feature: "daily-zodiac", sections: ["tradition", "rhythm", "relationships", "reflection"], links: ["daily-guide", "zodiac", "constellations", "culture"] },
  { slug: "daily-guide", key: "dailyGuide", sections: ["overall", "focus", "relationship", "routine", "caution", "reflection"] },
  { slug: "zodiac", key: "zodiac", sections: ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"] },
  { slug: "constellations", key: "constellations", sections: ["fire", "earth", "air", "water", "boundaries", "reading"] },
  { slug: "dream-symbols", key: "dreamSymbols", sections: ["water", "fire", "animals", "journey", "home", "falling", "finding", "context"] },
  { slug: "culture", key: "culture", sections: ["twelve", "western", "almanac", "differences", "modern", "respect"] },
  { slug: "methodology", key: "methodology", sections: ["rotation", "date", "sources", "prediction", "safety", "disclaimer"] },
  { slug: "about", key: "about", sections: ["mission", "scope", "bilingual", "independence"] },
  { slug: "privacy", key: "privacy", sections: ["inputs", "storage", "hosting", "advertising", "contact"] }
];

const nav = [
  { slug: "index", key: "nav.home" },
  { slug: "daily-guide", key: "nav.daily" },
  { slug: "zodiac", key: "nav.zodiac" },
  { slug: "constellations", key: "nav.constellations" },
  { slug: "dream-symbols", key: "nav.dreams" }
];

module.exports = { nav, pages };
