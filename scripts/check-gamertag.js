const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const sourceHtml = fs.readFileSync(path.join(ROOT, "tools", "gaming-calculators.html"), "utf8");
const sourceJs = fs.readFileSync(path.join(ROOT, "assets", "js", "gaming-calculators.js"), "utf8");
const koreanWords = sourceHtml.match(/<script type="application\/json" id="tagKoreanWords">([\s\S]*?)<\/script>/)?.[1];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(koreanWords, "Korean gamertag word bank is missing");
assert((sourceHtml.match(/<option value="(?:tech|myth|speed|fantasy|cosmic|nature|stealth|cute|royal|chaos)"/g) || []).length === 10, "Expected 10 gamertag themes");
assert(sourceHtml.includes('id="tagMinLength" type="number" min="2" max="10"'), "Korean minimum length limits are missing");
assert(sourceHtml.includes('id="tagMaxLength" type="number" min="2" max="10"'), "Korean maximum length limits are missing");

function element(value = "") {
  return {
    value,
    checked: false,
    dataset: {},
    innerHTML: "",
    textContent: "",
    listeners: {},
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    }
  };
}

const elements = {
  generateTags: element(),
  tagMode: element("english"),
  tagTheme: element("tech"),
  tagFormat: element("pascal"),
  tagMinLength: element("2"),
  tagMaxLength: element("6"),
  tagCount: element("12"),
  tagNumbers: element(),
  tagResult: element(),
  tagKoreanWords: element(),
  gamertagPanel: element()
};
elements.tagNumbers.checked = true;
elements.tagKoreanWords.textContent = koreanWords;

const document = {
  body: { matches: () => true },
  querySelector(selector) {
    if (selector === "[data-gamertag-tool]") return elements.gamertagPanel;
    return selector.startsWith("#") ? elements[selector.slice(1)] || null : null;
  },
  querySelectorAll() {
    return [];
  },
  getElementById(id) {
    return elements[id] || null;
  }
};

vm.runInNewContext(sourceJs, { document, history: { replaceState() {} }, Math, Set, Array, JSON, Number, String });

function generate(overrides) {
  for (const [id, value] of Object.entries(overrides)) {
    if (id === "tagNumbers") elements[id].checked = value;
    else elements[id].value = String(value);
  }
  elements.generateTags.listeners.click();
  return [...elements.tagResult.innerHTML.matchAll(/<span>([^<]+)<\/span>/g)].map((match) => match[1]);
}

let names = generate({ tagMode: "english", tagTheme: "cosmic", tagFormat: "snake", tagCount: 36, tagNumbers: false });
assert(names.length === 36 && new Set(names).size === 36, "English mode should create 36 unique choices");
assert(names.every((name) => /^[a-z]+_[a-z]+$/.test(name)), "English underscore format is invalid");

names = generate({ tagMode: "korean", tagTheme: "nature", tagMinLength: 2, tagMaxLength: 2, tagCount: 36, tagNumbers: false });
assert(elements.gamertagPanel.dataset.gamertagMode === "korean", "Korean mode was not activated");
assert(names.length === 36 && names.every((name) => Array.from(name).length === 2), "Korean two-character mode is invalid");
assert(names.every((name) => /^[가-힣]+$/.test(name)), "Korean mode returned a non-Hangul character");

names = generate({ tagMode: "korean", tagTheme: "myth", tagMinLength: 10, tagMaxLength: 10, tagCount: 24, tagNumbers: true });
assert(names.length === 24 && names.every((name) => Array.from(name).length === 10), "Korean ten-character mode is invalid");
assert(names.every((name) => /[0-9]+$/.test(name) && /^[가-힣]+[0-9]+$/.test(name)), "Korean numeric suffix option is invalid");

names = generate({ tagMode: "korean", tagMinLength: 0, tagMaxLength: 99, tagCount: 12, tagNumbers: false });
assert(elements.tagMinLength.value === "2" && elements.tagMaxLength.value === "10", "Korean length inputs were not clamped to 2-10");
assert(names.every((name) => Array.from(name).length >= 2 && Array.from(name).length <= 10), "Korean length range was not enforced");

console.log("Checked gamertag generator: 10 themes, English formats, Korean 2-10 character limits, unique counts, and optional numbers.");
