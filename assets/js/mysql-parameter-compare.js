(function () {
  "use strict";

  const DATA_ROOT = "https://mysql-params.tmtms.net/json";
  const MAX_VERSIONS = 4;
  const DEFAULT_VERSIONS = ["8.0.46", "8.4.11"];
  const VALID_TYPES = new Set([
    "mysqld", "mysql", "variable", "status", "charset", "collation",
    "privilege", "function", "statement", "ischema", "pschema", "keyword", "error"
  ]);

  const elements = {
    family: document.querySelector("#versionFamilySelect"),
    release: document.querySelector("#versionReleaseSelect"),
    add: document.querySelector("#addVersionButton"),
    selected: document.querySelector("#selectedVersions"),
    selectedCount: document.querySelector("#selectedVersionCount"),
    search: document.querySelector("#parameterSearch"),
    diff: document.querySelector("#differenceOnly"),
    tabs: [...document.querySelectorAll("[data-parameter-type]")],
    content: document.querySelector("#parameterContent"),
    empty: document.querySelector("#parameterEmpty"),
    loading: document.querySelector("#parameterLoading"),
    error: document.querySelector("#parameterError"),
    errorMessage: document.querySelector("#parameterErrorMessage"),
    retry: document.querySelector("#retryParameterButton"),
    shell: document.querySelector("#parameterTableShell"),
    head: document.querySelector("#parameterTableHead"),
    body: document.querySelector("#parameterTableBody"),
    filteredEmpty: document.querySelector("#filteredEmpty"),
    total: document.querySelector("#totalParameterCount"),
    changed: document.querySelector("#changedParameterCount"),
    lifecycle: document.querySelector("#lifecycleParameterCount"),
    visible: document.querySelector("#visibleParameterCount"),
    status: document.querySelector("#dataStatus"),
    statusDot: document.querySelector("#dataStatusDot")
  };

  if (!elements.family || !elements.content) return;

  const runtimeCopy = Object.fromEntries(
    [...document.querySelectorAll("#parameterRuntimeCopy [data-copy]")]
      .map((element) => [element.dataset.copy, element.textContent.trim()])
  );
  const state = {
    versions: [],
    selectedVersions: [],
    type: "mysqld",
    rows: [],
    cache: new Map(),
    requestId: 0,
    searchTimer: 0
  };

  function copy(key, values = {}) {
    let value = runtimeCopy[key] || key;
    for (const [name, replacement] of Object.entries(values)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
    return value;
  }

  function setStatus(mode, message) {
    elements.statusDot.className = `status-dot ${mode || ""}`.trim();
    elements.status.textContent = message;
  }

  function showView(view) {
    elements.empty.hidden = view !== "empty";
    elements.loading.hidden = view !== "loading";
    elements.error.hidden = view !== "error";
    elements.shell.hidden = view !== "table";
  }

  function versionFamily(version) {
    return String(version).split(".")[0];
  }

  function versionSort(a, b) {
    const left = a.split(".").map(Number);
    const right = b.split(".").map(Number);
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
      const difference = (right[index] || 0) - (left[index] || 0);
      if (difference) return difference;
    }
    return 0;
  }

  function parseInitialState() {
    const params = new URLSearchParams(window.location.search);
    const requestedType = params.get("type");
    if (requestedType && VALID_TYPES.has(requestedType)) state.type = requestedType;
    const versions = (params.get("versions") || params.get("vers") || "")
      .split(",")
      .map((version) => version.trim())
      .filter(Boolean)
      .slice(0, MAX_VERSIONS);
    state.selectedVersions = [...new Set(versions)];
    elements.diff.checked = params.get("diff") === "true";
    elements.search.value = params.get("q") || "";
    updateTabs();
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete("vers");
    if (state.type === "mysqld") url.searchParams.delete("type");
    else url.searchParams.set("type", state.type);
    if (state.selectedVersions.length) url.searchParams.set("versions", state.selectedVersions.join(","));
    else url.searchParams.delete("versions");
    if (elements.diff.checked) url.searchParams.set("diff", "true");
    else url.searchParams.delete("diff");
    if (elements.search.value.trim()) url.searchParams.set("q", elements.search.value.trim());
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function updateTabs() {
    elements.tabs.forEach((tab) => {
      const active = tab.dataset.parameterType === state.type;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
  }

  async function loadVersions() {
    setStatus("loading", copy("status-loading"));
    try {
      const response = await fetch(`${DATA_ROOT}/versions.json`, { mode: "cors" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const versions = await response.json();
      if (!Array.isArray(versions) || !versions.length) throw new Error("Invalid version list");
      state.versions = versions.map(String).sort(versionSort);
      state.selectedVersions = state.selectedVersions.filter((version) => state.versions.includes(version));
      if (!state.selectedVersions.length) {
        state.selectedVersions = DEFAULT_VERSIONS.filter((version) => state.versions.includes(version));
        if (!state.selectedVersions.length) state.selectedVersions = state.versions.slice(0, 2).reverse();
      }
      populateFamilies();
      renderSelectedVersions();
      setStatus("ready", copy("status-ready", { count: state.versions.length }));
      syncUrl();
      await loadComparison();
    } catch (error) {
      elements.family.innerHTML = `<option>${escapeHtml(copy("version-error"))}</option>`;
      elements.errorMessage.textContent = copy("version-error");
      setStatus("error", copy("version-error"));
      showView("error");
    }
  }

  function populateFamilies() {
    const families = [...new Set(state.versions.map(versionFamily))]
      .sort((a, b) => Number(b) - Number(a));
    elements.family.innerHTML = families.map((family) =>
      `<option value="${escapeHtml(family)}">${escapeHtml(copy("family", { version: family }))}</option>`
    ).join("");
    const preferred = state.selectedVersions.length
      ? versionFamily(state.selectedVersions[state.selectedVersions.length - 1])
      : (families.includes("8") ? "8" : families[0]);
    elements.family.value = families.includes(preferred) ? preferred : families[0];
    elements.family.disabled = false;
    populateReleases();
  }

  function populateReleases() {
    const family = elements.family.value;
    const releases = state.versions.filter((version) => versionFamily(version) === family);
    elements.release.innerHTML = releases.map((version) => {
      const selected = state.selectedVersions.includes(version);
      return `<option value="${escapeHtml(version)}"${selected ? " disabled" : ""}>MySQL ${escapeHtml(version)}${selected ? " ✓" : ""}</option>`;
    }).join("");
    const available = releases.find((version) => !state.selectedVersions.includes(version));
    if (available) elements.release.value = available;
    elements.release.disabled = !available || state.selectedVersions.length >= MAX_VERSIONS;
    elements.add.disabled = elements.release.disabled;
  }

  function renderSelectedVersions() {
    elements.selectedCount.textContent = String(state.selectedVersions.length);
    elements.selected.innerHTML = state.selectedVersions.map((version) => [
      `<span class="version-chip">MySQL ${escapeHtml(version)}`,
      `<button type="button" data-remove-version="${escapeHtml(version)}" aria-label="${escapeHtml(copy("remove", { version }))}">×</button>`,
      "</span>"
    ].join("")).join("");
    populateReleases();
  }

  function addSelectedVersion() {
    const version = elements.release.value;
    if (!version) return;
    if (state.selectedVersions.includes(version)) {
      announce(copy("duplicate"));
      return;
    }
    if (state.selectedVersions.length >= MAX_VERSIONS) {
      announce(copy("limit"));
      return;
    }
    state.selectedVersions.push(version);
    renderSelectedVersions();
    syncUrl();
    loadComparison();
  }

  function removeSelectedVersion(version) {
    state.selectedVersions = state.selectedVersions.filter((item) => item !== version);
    renderSelectedVersions();
    syncUrl();
    loadComparison();
  }

  function announce(message) {
    setStatus("ready", message);
    window.setTimeout(() => {
      if (state.versions.length) setStatus("ready", copy("status-ready", { count: state.versions.length }));
    }, 1800);
  }

  async function fetchDataset(type, version) {
    const key = `${type}:${version}`;
    if (state.cache.has(key)) return state.cache.get(key);
    const promise = fetch(`${DATA_ROOT}/${encodeURIComponent(version)}/${encodeURIComponent(type)}/base.json`, { mode: "cors" })
      .then((response) => {
        if (!response.ok) throw new Error(`${version}: HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error(`${version}: invalid JSON`);
        return data;
      })
      .catch((error) => {
        state.cache.delete(key);
        throw error;
      });
    state.cache.set(key, promise);
    return promise;
  }

  async function loadComparison() {
    const requestId = ++state.requestId;
    elements.content.classList.add("is-switching");
    if (!state.selectedVersions.length) {
      state.rows = [];
      resetSummary();
      showView("empty");
      window.requestAnimationFrame(() => elements.content.classList.remove("is-switching"));
      return;
    }
    showView("loading");
    setStatus("loading", copy("status-loading"));
    try {
      const datasets = await Promise.all(
        state.selectedVersions.map((version) => fetchDataset(state.type, version))
      );
      if (requestId !== state.requestId) return;
      state.rows = buildRows(datasets);
      updateSummary(state.rows);
      renderTable();
      showView("table");
      const loadedAt = new Intl.DateTimeFormat(document.documentElement.lang || "ko", {
        hour: "2-digit", minute: "2-digit"
      }).format(new Date());
      setStatus("ready", copy("status-loaded", { time: loadedAt }));
    } catch (error) {
      if (requestId !== state.requestId) return;
      elements.errorMessage.textContent = `${copy("data-error")} (${error.message})`;
      showView("error");
      setStatus("error", copy("data-error"));
    } finally {
      if (requestId === state.requestId) {
        window.requestAnimationFrame(() => elements.content.classList.remove("is-switching"));
      }
    }
  }

  function buildRows(datasets) {
    const names = [...new Set(datasets.flatMap((dataset) => Object.keys(dataset)))].sort((a, b) => a.localeCompare(b));
    return names.map((name) => {
      const values = datasets.map((dataset) => Object.prototype.hasOwnProperty.call(dataset, name) ? String(dataset[name]) : null);
      const unique = new Set(values.map((value) => value === null ? "__MISSING__" : value));
      const hasValue = values.some((value) => value !== null);
      const hasMissing = values.some((value) => value === null);
      return {
        name,
        values,
        same: unique.size === 1,
        lifecycle: hasValue && hasMissing,
        changed: !hasMissing && unique.size > 1
      };
    });
  }

  function updateSummary(rows) {
    elements.total.textContent = rows.length.toLocaleString();
    elements.changed.textContent = rows.filter((row) => row.changed).length.toLocaleString();
    elements.lifecycle.textContent = rows.filter((row) => row.lifecycle).length.toLocaleString();
  }

  function resetSummary() {
    elements.total.textContent = "—";
    elements.changed.textContent = "—";
    elements.lifecycle.textContent = "—";
    elements.visible.textContent = "0";
  }

  function filteredRows() {
    const query = elements.search.value.trim().toLocaleLowerCase();
    return state.rows.filter((row) => {
      if (elements.diff.checked && row.same) return false;
      if (query && !row.name.toLocaleLowerCase().includes(query)) return false;
      return true;
    });
  }

  function renderTable() {
    const rows = filteredRows();
    elements.head.innerHTML = `<tr><th scope="col">${escapeHtml(copy("parameter"))}</th>${state.selectedVersions.map((version, index) =>
      `<th scope="col">MySQL ${escapeHtml(version)}<small>${index === 0 ? "BASELINE" : `COMPARE ${index}`}</small></th>`
    ).join("")}</tr>`;
    elements.body.innerHTML = rows.map(renderRow).join("");
    elements.visible.textContent = rows.length.toLocaleString();
    elements.filteredEmpty.hidden = rows.length !== 0;
    document.querySelector(".parameter-table-wrap").hidden = rows.length === 0;
    if (elements.search.value.trim() || elements.diff.checked) {
      setStatus("ready", copy("status-filtered", { count: rows.length.toLocaleString() }));
    }
  }

  function renderRow(row) {
    let previous = null;
    let sawValue = false;
    const cells = row.values.map((value, index) => {
      let cellClass = "";
      let badge = "";
      if (value === null) {
        cellClass = "cell-missing";
        badge = copy("missing");
      } else if (index > 0 && !sawValue) {
        cellClass = "cell-added";
        badge = copy("added");
      } else if (index > 0 && previous !== null && value !== previous) {
        cellClass = "cell-changed";
        badge = copy("changed");
      }
      if (value !== null) {
        previous = value;
        sawValue = true;
      }
      if (value === null) {
        return `<td class="cell-missing"><span class="missing-state"><i aria-hidden="true">×</i><strong>${escapeHtml(badge)}</strong></span></td>`;
      }
      return `<td class="${cellClass}">${badge ? `<span class="cell-badge">${escapeHtml(badge)}</span>` : ""}<span class="cell-value">${escapeHtml(value)}</span></td>`;
    }).join("");
    const href = manualLink(row.name);
    return `<tr><th scope="row"><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.name)}</a></th>${cells}</tr>`;
  }

  function manualLink(name) {
    const version = state.selectedVersions[state.selectedVersions.length - 1] || "8.4";
    const parts = version.split(".");
    const series = `${parts[0]}.${parts[1] || "0"}`;
    const pages = {
      mysqld: "server-options.html",
      mysql: "mysql-command-options.html",
      variable: "server-system-variables.html",
      status: "server-status-variables.html",
      charset: "charset-charsets.html",
      collation: "charset-collation-names.html",
      privilege: "privileges-provided.html",
      function: "built-in-function-reference.html",
      statement: "sql-statements.html",
      ischema: "information-schema-table-reference.html",
      pschema: "performance-schema-table-reference.html",
      keyword: "keywords.html",
      error: "server-error-reference.html"
    };
    const page = pages[state.type] || "server-option-variable-reference.html";
    return `https://dev.mysql.com/doc/refman/${encodeURIComponent(series)}/en/${page}#:~:text=${encodeURIComponent(name.replaceAll("-", "_"))}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  elements.family.addEventListener("change", populateReleases);
  elements.add.addEventListener("click", addSelectedVersion);
  elements.selected.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-version]");
    if (button) removeSelectedVersion(button.dataset.removeVersion);
  });
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const type = tab.dataset.parameterType;
      if (type === state.type) return;
      state.type = type;
      updateTabs();
      syncUrl();
      loadComparison();
    });
    tab.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const current = elements.tabs.indexOf(tab);
      const offset = event.key === 'ArrowRight' ? 1 : -1;
      const next = elements.tabs[(current + offset + elements.tabs.length) % elements.tabs.length];
      next.focus();
      next.click();
    });
  });
  elements.diff.addEventListener("change", () => {
    syncUrl();
    if (state.rows.length) renderTable();
  });
  elements.search.addEventListener("input", () => {
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(() => {
      syncUrl();
      if (state.rows.length) renderTable();
    }, 120);
  });
  elements.retry.addEventListener("click", () => {
    if (state.versions.length) loadComparison();
    else loadVersions();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !/input|select|textarea/i.test(document.activeElement?.tagName || "")) {
      event.preventDefault();
      elements.search.focus();
    }
  });

  parseInitialState();
  loadVersions();
}());
