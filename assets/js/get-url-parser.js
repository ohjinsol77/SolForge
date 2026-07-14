(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SolForgeGetUrlParser = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function decodeQueryPart(value) {
    const source = String(value || "").replace(/\+/g, " ");
    try {
      return { value: decodeURIComponent(source), error: false };
    } catch (_error) {
      return { value: source, error: true };
    }
  }

  function normalizeUrl(value) {
    const source = String(value || "").trim();
    if (!source) throw new TypeError("invalid_url");

    let candidate = source;
    let addedProtocol = false;
    if (candidate.startsWith("//")) {
      candidate = `https:${candidate}`;
      addedProtocol = true;
    } else if (!/^[a-z][a-z\d+.-]*:\/\//i.test(candidate)) {
      candidate = `https://${candidate}`;
      addedProtocol = true;
    }

    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol) || !url.hostname) throw new TypeError("invalid_url");
    return { url, addedProtocol, source };
  }

  function parameterTypes(entry, count) {
    const types = [];
    if (!entry.key) types.push("emptyKey");
    if (!entry.hasEquals) types.push("flag");
    if (/\[(?:\d*)\]$/.test(entry.key)) types.push("array");
    if (count > 1) types.push("duplicate");
    if (entry.value === "") types.push("emptyValue");
    if (entry.decodeError) types.push("decodeError");
    if (!types.length) types.push("single");
    return types;
  }

  function toStructuredObject(entries) {
    const output = {};
    entries.forEach((entry) => {
      const key = entry.key;
      if (Object.prototype.hasOwnProperty.call(output, key)) {
        if (!Array.isArray(output[key])) output[key] = [output[key]];
        output[key].push(entry.value);
      } else {
        Object.defineProperty(output, key, {
          configurable: true,
          enumerable: true,
          writable: true,
          value: entry.types.includes("array") ? [entry.value] : entry.value
        });
      }
    });
    return output;
  }

  function parseGetUrl(value) {
    const normalized = normalizeUrl(value);
    const url = normalized.url;
    const query = url.search.startsWith("?") ? url.search.slice(1) : url.search;
    const rawSegments = query ? query.split("&").filter((segment) => segment !== "") : [];
    const parsed = rawSegments.map((segment, index) => {
      const equalsAt = segment.indexOf("=");
      const hasEquals = equalsAt >= 0;
      const rawKey = hasEquals ? segment.slice(0, equalsAt) : segment;
      const rawValue = hasEquals ? segment.slice(equalsAt + 1) : "";
      const key = decodeQueryPart(rawKey);
      const decodedValue = decodeQueryPart(rawValue);
      return {
        index: index + 1,
        raw: segment,
        rawKey,
        rawValue,
        key: key.value,
        value: decodedValue.value,
        hasEquals,
        decodeError: key.error || decodedValue.error
      };
    });

    const counts = parsed.reduce((map, entry) => {
      map.set(entry.key, (map.get(entry.key) || 0) + 1);
      return map;
    }, new Map());
    const entries = parsed.map((entry) => ({
      ...entry,
      occurrence: parsed.slice(0, entry.index).filter((candidate) => candidate.key === entry.key).length,
      types: parameterTypes(entry, counts.get(entry.key) || 0)
    }));
    const duplicateKeys = Array.from(counts.values()).filter((count) => count > 1).length;

    return {
      method: "GET",
      input: normalized.source,
      normalizedUrl: url.href,
      baseUrl: `${url.origin}${url.pathname}`,
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname || "/",
      hash: url.hash,
      rawQuery: query,
      addedProtocol: normalized.addedProtocol,
      entries,
      structured: toStructuredObject(entries),
      summary: {
        parameters: entries.length,
        uniqueKeys: counts.size,
        duplicateKeys,
        arrayEntries: entries.filter((entry) => entry.types.includes("array")).length,
        emptyValues: entries.filter((entry) => entry.value === "").length,
        flags: entries.filter((entry) => !entry.hasEquals).length,
        decodeErrors: entries.filter((entry) => entry.decodeError).length
      }
    };
  }

  return { parseGetUrl };
}));
