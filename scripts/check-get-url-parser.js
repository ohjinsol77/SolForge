const assert = require("assert");
const { parseGetUrl } = require("../assets/js/get-url-parser.js");

const full = parseGetUrl("https://api.example.com:8443/search?q=%ED%95%9C%EA%B8%80+%EA%B2%80%EC%83%89&tag=js&tag=web&item[]=1&item[]=2&flag&empty=#result");
assert.equal(full.method, "GET");
assert.equal(full.host, "api.example.com:8443");
assert.equal(full.pathname, "/search");
assert.equal(full.hash, "#result");
assert.equal(full.summary.parameters, 7);
assert.equal(full.summary.uniqueKeys, 5);
assert.equal(full.summary.duplicateKeys, 2);
assert.equal(full.summary.arrayEntries, 2);
assert.equal(full.summary.flags, 1);
assert.equal(full.summary.emptyValues, 2);
assert.equal(full.entries[0].value, "한글 검색");
assert.deepEqual(full.structured.tag, ["js", "web"]);
assert.deepEqual(full.structured["item[]"], ["1", "2"]);
assert(full.entries.filter((entry) => entry.key === "tag").every((entry) => entry.types.includes("duplicate")));
assert(full.entries.filter((entry) => entry.key === "item[]").every((entry) => entry.types.includes("array")));
assert(full.entries.find((entry) => entry.key === "flag").types.includes("flag"));
assert(full.entries.find((entry) => entry.key === "empty").types.includes("emptyValue"));

const schemeless = parseGetUrl("localhost:3000/api?userId=42&enabled=true");
assert.equal(schemeless.normalizedUrl, "https://localhost:3000/api?userId=42&enabled=true");
assert.equal(schemeless.addedProtocol, true);
assert.deepEqual(schemeless.structured, { userId: "42", enabled: "true" });

const encoded = parseGetUrl("https://example.com/?redirect=https%3A%2F%2Fexample.org%2Fa%3Fx%3D1%26y%3D2&q=a%26b");
assert.equal(encoded.entries[0].value, "https://example.org/a?x=1&y=2");
assert.equal(encoded.entries[1].value, "a&b");

const unusual = parseGetUrl("https://example.com/?=orphan&bad=%E0%A4%A");
assert(unusual.entries[0].types.includes("emptyKey"));
assert(unusual.entries[1].types.includes("decodeError"));

const prototypeKey = parseGetUrl("https://example.com/?__proto__=safe&constructor=value");
assert.equal(prototypeKey.structured.__proto__, "safe");
assert.equal(prototypeKey.structured.constructor, "value");

const noQuery = parseGetUrl("https://example.com/path");
assert.equal(noQuery.summary.parameters, 0);
assert.deepEqual(noQuery.structured, {});

assert.throws(() => parseGetUrl(""), /invalid_url/);
assert.throws(() => parseGetUrl("ftp://example.com/file"), /invalid_url/);
assert.throws(() => parseGetUrl("not a valid host"));

console.log("Checked GET URL parsing: encoded values, duplicate keys, arrays, flags, empty values, malformed encoding, and schemeless hosts.");
