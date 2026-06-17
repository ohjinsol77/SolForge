(function () {
  "use strict";

  const REGISTRY = "https://registry.npmjs.org";
  const DOWNLOADS = "https://api.npmjs.org/downloads/point";
  const JSDELIVR = "https://data.jsdelivr.com/v1/package/npm";
  const CDN = "https://cdn.jsdelivr.net/npm";
  const CACHE_PREFIX = "sf-npm-cache:";
  const RECENT_KEY = "sf-npm-recent";
  const FAVORITE_KEY = "sf-npm-favorites";
  const COMPARE_KEY = "sf-npm-compare";
  const SEARCH_TTL = 10 * 60 * 1000;
  const META_TTL = 60 * 60 * 1000;
  const DOWNLOAD_TTL = 30 * 60 * 1000;
  const JSDELIVR_TTL = 60 * 60 * 1000;
  const dependencyTypes = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies", "bundledDependencies"];
  const memoryCache = new Map();
  const inFlight = new Map();

  const state = {
    searchAbort: null,
    searchTimer: 0,
    searchResults: [],
    packageName: "",
    meta: null,
    downloads: {},
    jsdelivr: null,
    files: [],
    dependencyLimit: 50,
    packageJson: { dependencies: {}, devDependencies: {} },
    loading: false
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function init() {
    if (!document.body.matches('[data-page="npm-package-info"]')) return;
    cleanupCache();
    bindEvents();
    renderRecent();
    renderFavorites();
    renderCompare();
    renderPackageJson();
    const queryPackage = new URLSearchParams(window.location.search).get("package");
    if (queryPackage) {
      $("#npmSearchInput").value = queryPackage;
      lookupPackage(queryPackage);
    } else {
      setStatus("패키지명을 검색하거나 입력 후 상세 조회를 누르세요.", "info");
    }
  }

  function bindEvents() {
    $("#npmSearchInput")?.addEventListener("input", onSearchInput);
    $("#npmSearchInput")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const value = getSearchValue();
        if (value.length >= 2) lookupPackage(value);
      }
    });
    $("#npmSearchButton")?.addEventListener("click", () => runSearch(getSearchValue(), { force: true }));
    $("#npmLookupButton")?.addEventListener("click", () => lookupPackage(getSearchValue()));
    $("#npmResetButton")?.addEventListener("click", resetTool);
    $("#npmFavoriteButton")?.addEventListener("click", toggleFavorite);
    $("#npmCopySummary")?.addEventListener("click", copySummary);
    $("#npmInstallManager")?.addEventListener("change", renderInstallCommand);
    $("#npmInstallVersion")?.addEventListener("change", () => {
      syncCdnVersion();
      renderInstallCommand();
      loadJsdelivrFiles();
    });
    $("#npmInstallRange")?.addEventListener("change", renderInstallCommand);
    $("#npmInstallDev")?.addEventListener("change", renderInstallCommand);
    $("#npmDependencyFilter")?.addEventListener("change", renderDependencies);
    $("#npmDependencySearch")?.addEventListener("input", () => {
      state.dependencyLimit = 50;
      renderDependencies();
    });
    $("#npmDependencyMore")?.addEventListener("click", () => {
      state.dependencyLimit += 50;
      renderDependencies();
    });
    $("#npmCdnVersion")?.addEventListener("change", loadJsdelivrFiles);
    $("#npmCdnPath")?.addEventListener("input", renderCdn);
    $("#npmAddCompare")?.addEventListener("click", addCompare);
    $("#npmClearCompare")?.addEventListener("click", clearCompare);
    $("#npmPackageJsonAdd")?.addEventListener("click", addPackageJson);
    $("#npmPackageJsonClear")?.addEventListener("click", () => {
      state.packageJson = { dependencies: {}, devDependencies: {} };
      renderPackageJson();
    });
    $$("[data-npm-copy]").forEach((button) => {
      button.addEventListener("click", () => copyElementText(button.dataset.npmCopy, button));
    });
  }

  function onSearchInput() {
    window.clearTimeout(state.searchTimer);
    const value = getSearchValue();
    if (looksSensitive(value)) {
      setStatus("민감키, 토큰, 내부 주소처럼 보이는 값은 입력하지 마세요.", "warn");
      return;
    }
    if (value.length < 2) {
      renderSearchResults([]);
      setStatus("검색어는 최소 2글자 이상 입력하세요.", "info");
      return;
    }
    state.searchTimer = window.setTimeout(() => runSearch(value), 500);
  }

  async function runSearch(query, options = {}) {
    if (!query || query.length < 2) {
      setStatus("검색어는 최소 2글자 이상 입력하세요.", "info");
      return;
    }
    if (looksSensitive(query)) {
      setStatus("민감키, 토큰, 내부 주소처럼 보이는 값은 입력하지 마세요.", "warn");
      return;
    }
    if (state.searchAbort) state.searchAbort.abort();
    state.searchAbort = new AbortController();
    setLoading(true);
    setStatus("npm 패키지를 검색하는 중입니다.", "info");
    try {
      const url = `${REGISTRY}/-/v1/search?text=${encodeURIComponent(query)}&size=10`;
      const result = await cachedFetch(url, `search:${query.toLowerCase()}`, SEARCH_TTL, { ...options, signal: state.searchAbort.signal });
      state.searchResults = (result.data.objects || []).slice(0, 10);
      renderSearchResults(state.searchResults);
      setStatus(result.stale ? "검색 API 실패로 캐시된 결과를 표시합니다." : `${state.searchResults.length}개 결과를 표시합니다.`, result.stale ? "warn" : "success");
    } catch (error) {
      if (error.name !== "AbortError") {
        renderSearchResults([]);
        setStatus(error.message || "검색에 실패했습니다. 잠시 후 다시 시도하세요.", "error");
      }
    } finally {
      setLoading(false);
    }
  }

  async function lookupPackage(name, options = {}) {
    const packageName = normalizePackageName(name);
    if (!packageName) {
      setStatus("패키지명을 입력하세요.", "info");
      return;
    }
    if (looksSensitive(packageName)) {
      setStatus("민감키, 토큰, 내부 주소처럼 보이는 값은 입력하지 마세요.", "warn");
      return;
    }
    setLoading(true);
    setStatus(`${packageName} 상세 정보를 불러오는 중입니다.`, "info");
    try {
      const encoded = encodeURIComponent(packageName);
      const metaResult = await cachedFetch(`${REGISTRY}/${encoded}`, `meta:${packageName}`, META_TTL, options);
      state.packageName = packageName;
      state.meta = metaResult.data;
      if (state.meta.error) throw new Error(state.meta.reason || "패키지를 찾을 수 없습니다.");
      updateUrl(packageName);
      addRecent(packageName);
      await Promise.allSettled([loadDownloads(packageName), loadJsdelivrRoot(packageName)]);
      populateVersionControls();
      renderDetail();
      await loadJsdelivrFiles();
      setStatus(metaResult.stale ? "메타 API 실패로 캐시된 데이터를 표시합니다." : "패키지 정보를 표시합니다.", metaResult.stale ? "warn" : "success");
    } catch (error) {
      state.meta = null;
      renderDetail();
      setStatus(error.message && error.message.includes("404") ? "패키지를 찾을 수 없습니다. 이름을 확인하고 재시도하세요." : (error.message || "패키지 조회에 실패했습니다."), "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadDownloads(packageName) {
    const periods = ["last-week", "last-month", "last-year"];
    const entries = await Promise.allSettled(periods.map((period) => cachedFetch(`${DOWNLOADS}/${period}/${encodeURIComponent(packageName)}`, `downloads:${period}:${packageName}`, DOWNLOAD_TTL)));
    state.downloads = {};
    entries.forEach((entry, index) => {
      if (entry.status === "fulfilled") state.downloads[periods[index]] = entry.value.data.downloads || 0;
      else state.downloads[periods[index]] = null;
    });
    renderDownloads();
  }

  async function loadJsdelivrRoot(packageName) {
    try {
      const result = await cachedFetch(jsdelivrApiUrl(packageName), `jsdelivr:${packageName}`, JSDELIVR_TTL);
      state.jsdelivr = result.data;
    } catch (_error) {
      state.jsdelivr = null;
    }
  }

  async function loadJsdelivrFiles() {
    if (!state.packageName) return;
    const version = $("#npmCdnVersion")?.value || latestVersion();
    try {
      const result = await cachedFetch(jsdelivrApiUrl(state.packageName, version), `jsdelivr:${state.packageName}:${version}`, JSDELIVR_TTL);
      state.files = prioritizeFiles(flattenFiles(result.data.files || []));
      if (!$("#npmCdnPath").value && state.files[0]) $("#npmCdnPath").value = state.files[0].path.replace(/^\//, "");
    } catch (_error) {
      state.files = [];
    }
    renderFiles();
    renderCdn();
  }

  async function cachedFetch(url, key, ttl, options = {}) {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const now = Date.now();
    const memory = memoryCache.get(cacheKey);
    if (!options.force && memory && now - memory.savedAt < ttl) return { data: memory.data, fromCache: true, stale: false };
    const local = readCache(cacheKey);
    if (!options.force && local && now - local.savedAt < ttl) {
      memoryCache.set(cacheKey, local);
      return { data: local.data, fromCache: true, stale: false };
    }
    if (!options.force && inFlight.has(cacheKey)) return inFlight.get(cacheKey);
    const request = fetch(url, { headers: { accept: "application/json" }, signal: options.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`API 오류: HTTP ${response.status}`);
        const data = await response.json();
        writeCache(cacheKey, data);
        return { data, fromCache: false, stale: false };
      })
      .catch((error) => {
        const stale = readCache(cacheKey);
        if (error.name !== "AbortError" && stale) {
          memoryCache.set(cacheKey, stale);
          return { data: stale.data, fromCache: true, stale: true };
        }
        throw error;
      })
      .finally(() => inFlight.delete(cacheKey));
    inFlight.set(cacheKey, request);
    return request;
  }

  function readCache(key) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.savedAt || !("data" in parsed)) return null;
      return parsed;
    } catch (_error) {
      return null;
    }
  }

  function writeCache(key, data) {
    const entry = { savedAt: Date.now(), data };
    memoryCache.set(key, entry);
    try {
      window.localStorage.setItem(key, JSON.stringify(entry));
    } catch (_error) {
      cleanupCache(true);
    }
  }

  function cleanupCache(aggressive = false) {
    try {
      const now = Date.now();
      Object.keys(window.localStorage).forEach((key) => {
        if (!key.startsWith(CACHE_PREFIX)) return;
        const entry = JSON.parse(window.localStorage.getItem(key) || "{}");
        const ttl = key.includes(":search:") ? SEARCH_TTL : key.includes(":downloads:") ? DOWNLOAD_TTL : META_TTL;
        if (aggressive || !entry.savedAt || now - entry.savedAt > ttl * 4) window.localStorage.removeItem(key);
      });
    } catch (_error) {
      // Cache cleanup is best effort only.
    }
  }

  function renderSearchResults(results) {
    const root = $("#npmSearchResults");
    if (!root) return;
    if (!results.length) {
      root.innerHTML = '<div class="list-item"><strong>검색 결과가 없습니다.</strong><small>2글자 이상 입력하거나 정확한 패키지명을 조회하세요.</small></div>';
      return;
    }
    root.innerHTML = results.map((result) => {
      const pkg = result.package || {};
      return `<button type="button" data-package-name="${escapeHtml(pkg.name)}"><strong>${escapeHtml(pkg.name)}</strong><small>${escapeHtml(pkg.description || "설명 없음")} · ${escapeHtml(pkg.version || "-")} · ${escapeHtml(pkg.publisher?.username || "")}</small></button>`;
    }).join("");
    $$("[data-package-name]", root).forEach((button) => {
      button.addEventListener("click", () => lookupPackage(button.dataset.packageName));
    });
  }

  function renderDetail() {
    if (!state.meta) {
      setText("#npmPackageTitle", "패키지를 선택하세요.");
      setText("#npmPackageDescription", "검색 결과에서 패키지를 선택하거나 정확한 패키지명을 조회하세요.");
      $("#npmMetaGrid").innerHTML = "";
      $("#npmKeywords").innerHTML = "";
      $("#npmLinks").innerHTML = "";
      return;
    }
    const meta = state.meta;
    const latest = latestVersion();
    const latestData = versionData(latest);
    const score = healthScore(meta, latestData);
    setText("#npmPackageTitle", meta.name);
    setText("#npmPackageDescription", meta.description || latestData.description || "설명 없음");
    setText("#npmHealthScore", `${score.score}점`);
    setText("#npmWeeklyDownloads", formatNumber(state.downloads["last-week"] ?? 0));
    $("#npmMetaGrid").innerHTML = [
      summaryCard("최신 버전", latest),
      summaryCard("라이선스", latestData.license || meta.license || "-"),
      summaryCard("작성자", formatAuthor(latestData.author || meta.author)),
      summaryCard("관리자", Array.isArray(meta.maintainers) ? `${meta.maintainers.length}명` : "-"),
      summaryCard("전체 버전", Object.keys(meta.versions || {}).length),
      summaryCard("마지막 배포", formatDateTime(meta.time?.[latest] || meta.time?.modified)),
      summaryCard("상태", latestData.deprecated || meta.deprecated ? "deprecated" : "정상"),
      summaryCard("건강도", `<span class="npm-score-ring" style="--score:${score.score}">${score.score}</span><small>보안진단 아님</small>`, true)
    ].join("");
    $("#npmKeywords").innerHTML = normalizeList(latestData.keywords || meta.keywords).slice(0, 20).map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("");
    $("#npmLinks").innerHTML = renderLinks(meta, latestData);
    renderInstallCommand();
    renderDependencies();
    renderDownloads();
    renderFavoriteButton();
  }

  function summaryCard(label, value, raw = false) {
    return `<div class="result-card"><span>${escapeHtml(label)}</span><strong>${raw ? value : escapeHtml(value)}</strong></div>`;
  }

  function renderLinks(meta, latestData) {
    const links = [
      ["npm", `https://www.npmjs.com/package/${meta.name}`],
      ["homepage", latestData.homepage || meta.homepage],
      ["repository", normalizeRepository(latestData.repository || meta.repository)],
      ["bugs", normalizeBugs(latestData.bugs || meta.bugs)]
    ].filter(([, url]) => url);
    return links.map(([label, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`).join("");
  }

  function populateVersionControls() {
    const versions = Object.keys(state.meta?.versions || {}).reverse();
    ["npmInstallVersion", "npmCdnVersion"].forEach((id) => {
      const select = $(`#${id}`);
      if (!select) return;
      select.innerHTML = versions.map((version) => `<option value="${escapeHtml(version)}">${escapeHtml(version)}</option>`).join("");
      select.value = latestVersion();
    });
  }

  function syncCdnVersion() {
    const cdnVersion = $("#npmCdnVersion");
    const installVersion = $("#npmInstallVersion");
    if (cdnVersion && installVersion) cdnVersion.value = installVersion.value;
  }

  function renderInstallCommand() {
    if (!state.meta) return;
    const manager = $("#npmInstallManager")?.value || "npm";
    const version = $("#npmInstallVersion")?.value || latestVersion();
    const range = $("#npmInstallRange")?.value || "";
    const dev = $("#npmInstallDev")?.checked;
    const spec = `${state.packageName}${range ? range + version : ""}`;
    const command = manager === "npm" ? `npm install ${dev ? "-D " : ""}${spec}` :
      manager === "yarn" ? `yarn add ${dev ? "-D " : ""}${spec}` :
        manager === "pnpm" ? `pnpm add ${dev ? "-D " : ""}${spec}` :
          `bun add ${dev ? "-d " : ""}${spec}`;
    setText("#npmInstallCommand", command);
  }

  function renderDependencies() {
    if (!state.meta) return;
    const latestData = versionData(latestVersion());
    const all = collectDependencies(latestData);
    const filter = $("#npmDependencyFilter")?.value || "all";
    const query = ($("#npmDependencySearch")?.value || "").toLowerCase();
    const filtered = all.filter((item) => (filter === "all" || item.type === filter) && item.name.toLowerCase().includes(query));
    $("#npmDependencyCounts").innerHTML = dependencyTypes.map((type) => summaryCard(type.replace("Dependencies", ""), all.filter((item) => item.type === type).length)).join("");
    $("#npmDependencyList").innerHTML = filtered.slice(0, state.dependencyLimit).map((item) => `<button type="button" data-dependency-name="${escapeHtml(item.name)}"><strong>${escapeHtml(item.name)} <span class="region-badge">${escapeHtml(item.type)}</span></strong><small>${escapeHtml(item.range)}</small></button>`).join("") || '<div class="list-item"><strong>표시할 의존성이 없습니다.</strong></div>';
    $("#npmDependencyMore").hidden = filtered.length <= state.dependencyLimit;
    $$("[data-dependency-name]").forEach((button) => button.addEventListener("click", () => {
      $("#npmSearchInput").value = button.dataset.dependencyName;
      lookupPackage(button.dataset.dependencyName);
    }));
  }

  function collectDependencies(version) {
    const result = [];
    dependencyTypes.forEach((type) => {
      const value = type === "bundledDependencies" ? (version.bundledDependencies || version.bundleDependencies) : version[type];
      if (Array.isArray(value)) value.forEach((name) => result.push({ type, name, range: "bundled" }));
      else Object.entries(value || {}).forEach(([name, rangeValue]) => result.push({ type, name, range: rangeValue }));
    });
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  function renderDownloads() {
    const root = $("#npmDownloadStats");
    if (!root) return;
    const labels = { "last-week": "지난 1주", "last-month": "지난 1개월", "last-year": "지난 1년" };
    const values = Object.values(state.downloads).filter((value) => Number.isFinite(value));
    const max = Math.max(1, ...values);
    root.innerHTML = Object.keys(labels).map((period) => {
      const value = state.downloads[period];
      const width = Number.isFinite(value) ? (value / max) * 100 : 0;
      return `<div class="mini-bar-row"><strong>${labels[period]}</strong><span class="mini-bar-track"><span class="mini-bar-fill" style="--bar-width:${width}%"></span></span><b>${Number.isFinite(value) ? formatNumber(value) : "실패"}</b></div>`;
    }).join("");
  }

  function renderFiles() {
    const root = $("#npmFileList");
    if (!root) return;
    root.innerHTML = state.files.slice(0, 80).map((file) => `<button type="button" data-file-path="${escapeHtml(file.path.replace(/^\//, ""))}"><code>${escapeHtml(file.path)}</code><small>${formatBytes(file.size || 0)}</small></button>`).join("") || '<div class="list-item"><strong>jsDelivr 파일 목록을 불러오지 못했습니다.</strong><small>직접 파일 경로를 입력할 수 있습니다.</small></div>';
    $$("[data-file-path]", root).forEach((button) => {
      button.addEventListener("click", () => {
        $("#npmCdnPath").value = button.dataset.filePath;
        renderCdn();
      });
    });
  }

  function renderCdn() {
    if (!state.meta) return;
    const version = $("#npmCdnVersion")?.value || latestVersion();
    const path = ($("#npmCdnPath")?.value || "").replace(/^\/+/, "");
    const base = `${CDN}/${state.packageName}@${version}`;
    const url = path ? `${base}/${path}` : base;
    setText("#npmCdnUrl", url);
    setText("#npmCdnScript", `<script src="${url}"></script>`);
    setText("#npmCdnImport", `import pkg from "${url}";`);
    setText("#npmCdnCss", `<link rel="stylesheet" href="${url}">`);
  }

  function flattenFiles(files, prefix = "") {
    return files.flatMap((file) => {
      const path = `${prefix}/${file.name}`.replace(/\/+/g, "/");
      if (file.type === "directory") return flattenFiles(file.files || [], path);
      return [{ path, size: file.size || 0 }];
    });
  }

  function prioritizeFiles(files) {
    const score = (file) => {
      const path = file.path.toLowerCase();
      if (path.endsWith(".min.js")) return 0;
      if (path.endsWith(".mjs")) return 1;
      if (path.endsWith(".js")) return 2;
      if (path.endsWith(".cjs")) return 3;
      if (path.endsWith(".css")) return 4;
      return 10;
    };
    return files.sort((a, b) => score(a) - score(b) || a.path.localeCompare(b.path));
  }

  function healthScore(meta, latestData) {
    let score = 0;
    const reasons = [];
    if (latestData.deprecated || meta.deprecated) reasons.push("deprecated 표시가 있습니다.");
    if (recentWithin(meta.time?.[latestVersion()], 365)) score += 18;
    if (latestData.license || meta.license) score += 12;
    if (normalizeRepository(latestData.repository || meta.repository)) score += 14;
    if ((state.downloads["last-week"] || 0) >= 1000) score += 14;
    if ((meta.maintainers || []).length > 0) score += 10;
    if (latestData.readme || meta.readme) score += 12;
    const depCount = collectDependencies(latestData).length;
    score += depCount <= 20 ? 12 : depCount <= 60 ? 8 : 4;
    if (!latestData.deprecated && !meta.deprecated) score += 8;
    return { score: Math.max(0, Math.min(100, score)), reasons };
  }

  function addCompare() {
    if (!state.meta) return;
    const compare = getCompare().filter((item) => item.name !== state.packageName);
    const latest = latestVersion();
    const latestData = versionData(latest);
    compare.unshift({
      name: state.packageName,
      version: latest,
      license: latestData.license || state.meta.license || "-",
      downloads: state.downloads["last-week"] || 0,
      published: state.meta.time?.[latest] || "",
      dependencies: collectDependencies(latestData).length,
      repository: normalizeRepository(latestData.repository || state.meta.repository) ? "있음" : "없음",
      size: state.files.length ? formatBytes(state.files.reduce((sum, file) => sum + (file.size || 0), 0)) : "-"
    });
    saveCompare(compare.slice(0, 3));
    renderCompare();
  }

  function getCompare() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(COMPARE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch (_error) {
      return [];
    }
  }

  function saveCompare(compare) {
    try {
      window.localStorage.setItem(COMPARE_KEY, JSON.stringify(compare.slice(0, 3)));
    } catch (_error) {
      // Compare storage is optional.
    }
  }

  function renderCompare() {
    const root = $("#npmCompareBody");
    if (!root) return;
    const compare = getCompare();
    root.innerHTML = compare.length ? compare.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.version)}</td><td>${escapeHtml(item.license)}</td><td>${formatNumber(item.downloads)}</td><td>${escapeHtml(formatDateTime(item.published))}</td><td>${item.dependencies}</td><td>${escapeHtml(item.repository)}</td><td>${escapeHtml(String(item.size))}</td></tr>`).join("") : '<tr><td colspan="8">비교할 패키지를 추가하세요.</td></tr>';
  }

  function clearCompare() {
    saveCompare([]);
    renderCompare();
  }

  function addPackageJson() {
    if (!state.meta) return;
    const type = $("#npmPackageJsonType")?.value || "dependencies";
    const range = $("#npmPackageJsonRange")?.value || "";
    state.packageJson[type][state.packageName] = `${range}${latestVersion()}`;
    renderPackageJson();
  }

  function renderPackageJson() {
    const output = $("#npmPackageJsonOutput");
    if (!output) return;
    output.value = JSON.stringify({ name: "solforge-package-set", private: true, ...state.packageJson }, null, 2);
  }

  function toggleFavorite() {
    if (!state.packageName) return;
    const favorites = getFavorites();
    const next = favorites.includes(state.packageName) ? favorites.filter((item) => item !== state.packageName) : [state.packageName, ...favorites].slice(0, 20);
    try {
      window.localStorage.setItem(FAVORITE_KEY, JSON.stringify(next));
    } catch (_error) {
      // Favorites are optional.
    }
    renderFavorites();
    renderFavoriteButton();
  }

  function renderFavoriteButton() {
    const button = $("#npmFavoriteButton");
    if (!button || !state.packageName) return;
    button.textContent = getFavorites().includes(state.packageName) ? "즐겨찾기 해제" : "즐겨찾기";
  }

  function getFavorites() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(FAVORITE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
    } catch (_error) {
      return [];
    }
  }

  function renderFavorites() {
    renderChipList("#npmFavoriteList", getFavorites(), "즐겨찾기가 없습니다.");
  }

  function addRecent(packageName) {
    const recent = getRecent().filter((item) => item !== packageName);
    recent.unshift(packageName);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 10)));
    } catch (_error) {
      // Recent lookup is optional.
    }
    renderRecent();
  }

  function getRecent() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
    } catch (_error) {
      return [];
    }
  }

  function renderRecent() {
    renderChipList("#npmRecentList", getRecent(), "최근 조회가 없습니다.");
  }

  function renderChipList(selector, items, empty) {
    const root = $(selector);
    if (!root) return;
    root.innerHTML = items.length ? items.map((item) => `<button type="button" data-chip-package="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("") : `<span>${empty}</span>`;
    $$("[data-chip-package]", root).forEach((button) => button.addEventListener("click", () => {
      $("#npmSearchInput").value = button.dataset.chipPackage;
      lookupPackage(button.dataset.chipPackage);
    }));
  }

  function copySummary() {
    if (!state.meta) return;
    const latest = latestVersion();
    const latestData = versionData(latest);
    copyText([
      `name: ${state.packageName}`,
      `description: ${state.meta.description || ""}`,
      `latest: ${latest}`,
      `license: ${latestData.license || state.meta.license || "-"}`,
      `weekly downloads: ${state.downloads["last-week"] ?? "-"}`
    ].join("\n"), $("#npmCopySummary"));
  }

  function resetTool() {
    state.searchResults = [];
    state.packageName = "";
    state.meta = null;
    state.downloads = {};
    state.jsdelivr = null;
    state.files = [];
    state.dependencyLimit = 50;
    $("#npmSearchInput").value = "";
    $("#npmCdnPath").value = "";
    renderSearchResults([]);
    renderDetail();
    renderDownloads();
    renderFiles();
    updateUrl("");
    setStatus("초기화했습니다.", "success");
  }

  function latestVersion() {
    return state.meta?.["dist-tags"]?.latest || Object.keys(state.meta?.versions || {}).pop() || "";
  }

  function versionData(version) {
    return state.meta?.versions?.[version] || {};
  }

  function getSearchValue() {
    return normalizePackageName($("#npmSearchInput")?.value || "");
  }

  function normalizePackageName(value) {
    return String(value || "").trim().replace(/^npm\s+i(?:nstall)?\s+/, "").replace(/^yarn\s+add\s+/, "").replace(/^pnpm\s+add\s+/, "").split(/\s+/)[0] || "";
  }

  function looksSensitive(value) {
    return /(token|secret|apikey|api_key|password|passwd|bearer|ghp_|npm_|sk-)/i.test(value) || /https?:\/\/(localhost|10\.|192\.168\.|172\.)/i.test(value);
  }

  function normalizeRepository(repository) {
    if (!repository) return "";
    const value = typeof repository === "string" ? repository : repository.url || "";
    return value.replace(/^git\+/, "").replace(/\.git$/, "");
  }

  function normalizeBugs(bugs) {
    if (!bugs) return "";
    return typeof bugs === "string" ? bugs : bugs.url || bugs.email || "";
  }

  function normalizeList(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") return value.split(/[,\s]+/).filter(Boolean);
    return [];
  }

  function formatAuthor(author) {
    if (!author) return "-";
    if (typeof author === "string") return author;
    return author.name || author.email || author.url || "-";
  }

  function jsdelivrApiUrl(packageName, version = "") {
    const spec = version ? `${packageName}@${version}` : packageName;
    return encodeURI(`${JSDELIVR}/${spec}`);
  }

  function updateUrl(packageName) {
    const params = new URLSearchParams(window.location.search);
    if (packageName) params.set("package", packageName);
    else params.delete("package");
    window.history.replaceState(null, "", `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function setLoading(loading) {
    state.loading = loading;
    ["npmSearchButton", "npmLookupButton", "npmResetButton"].forEach((id) => {
      const button = $(`#${id}`);
      if (button) button.disabled = loading;
    });
  }

  function setStatus(message, type = "info") {
    const status = $("#npmStatus");
    if (!status) return;
    status.textContent = message;
    status.dataset.status = type;
  }

  function setText(selector, value) {
    const element = $(selector);
    if (element) element.textContent = String(value);
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("ko-KR");
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function recentWithin(value, days) {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return Date.now() - date.getTime() <= days * 86400000;
  }

  function formatBytes(bytes) {
    if (!bytes) return "-";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function copyElementText(id, button) {
    const element = document.getElementById(id);
    const text = element?.value || element?.textContent || "";
    await copyText(text, button);
  }

  async function copyText(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      flashButton(button, "복사됨");
    } catch (_error) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.append(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      textarea.remove();
      flashButton(button, ok ? "복사됨" : "복사 실패");
    }
  }

  function flashButton(button, label) {
    if (!button) return;
    const original = button.textContent;
    button.textContent = label;
    window.setTimeout(() => {
      button.textContent = original;
    }, 1200);
  }

  document.addEventListener("DOMContentLoaded", init);
}());
