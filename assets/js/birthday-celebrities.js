(function () {
  "use strict";

  const ENDPOINT = "https://query.wikidata.org/sparql";
  const REQUEST_TIMEOUT = 30000;
  const FIRST_BIRTH_YEAR = 1850;
  const OCCUPATION_ROOTS = [
    "Q177220", "Q2252262", "Q639669", "Q33999", "Q10800557", "Q10798782",
    "Q2259451", "Q2405480", "Q521987", "Q245068", "Q44508716", "Q947873",
    "Q2722764", "Q4610556", "Q5716684", "Q17125263", "Q50279140",
    "Q57414145", "Q2045208"
  ];

  const state = {
    controller: null,
    requestId: 0
  };

  const $ = (selector) => document.querySelector(selector);

  function init() {
    if (!document.body.matches('[data-page="birthday-celebrities"]')) return;

    const monthSelect = $("#birthdayMonth");
    const daySelect = $("#birthdayDay");
    populateMonths(monthSelect);

    const params = new URLSearchParams(window.location.search);
    const now = new Date();
    const initialMonth = clampNumber(params.get("month"), 1, 12, now.getMonth() + 1);
    const initialDay = clampNumber(params.get("day"), 1, daysInMonth(initialMonth), now.getDate());
    monthSelect.value = String(initialMonth);
    populateDays(daySelect, initialMonth, initialDay);

    monthSelect.addEventListener("change", () => {
      populateDays(daySelect, Number(monthSelect.value), Number(daySelect.value));
      resetResults();
    });
    daySelect.addEventListener("change", resetResults);
    $("#birthdaySearchForm").addEventListener("submit", search);
  }

  function message(key, replacements = {}) {
    const bank = $("#birthdayMessages");
    let value = bank?.dataset[key] || "";
    Object.entries(replacements).forEach(([name, replacement]) => {
      value = value.replaceAll(`{${name}}`, String(replacement));
    });
    return value;
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
  }

  function daysInMonth(month) {
    return new Date(Date.UTC(2024, month, 0)).getUTCDate();
  }

  function populateMonths(select) {
    const fragment = document.createDocumentFragment();
    for (let month = 1; month <= 12; month += 1) {
      const option = document.createElement("option");
      option.value = String(month);
      option.textContent = message("monthOption", { value: month });
      fragment.append(option);
    }
    select.replaceChildren(fragment);
  }

  function populateDays(select, month, preferredDay) {
    const max = daysInMonth(month);
    const selected = Math.min(Math.max(preferredDay || 1, 1), max);
    const fragment = document.createDocumentFragment();
    for (let day = 1; day <= max; day += 1) {
      const option = document.createElement("option");
      option.value = String(day);
      option.textContent = message("dayOption", { value: day });
      fragment.append(option);
    }
    select.replaceChildren(fragment);
    select.value = String(selected);
  }

  function validDate(year, month, day) {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function buildDateValues(month, day) {
    const currentYear = new Date().getFullYear();
    const values = [];
    for (let year = FIRST_BIRTH_YEAR; year <= currentYear; year += 1) {
      if (!validDate(year, month, day)) continue;
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      values.push(`"${year}-${mm}-${dd}T00:00:00Z"^^xsd:dateTime`);
    }
    return values.join(" ");
  }

  function buildQuery(month, day) {
    const roots = OCCUPATION_ROOTS.map((id) => `wd:${id}`).join(" ");
    return `
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX hint: <http://www.bigdata.com/queryHints#>
PREFIX schema: <http://schema.org/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX ps: <http://www.wikidata.org/prop/statement/>
PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?person ?personLabel
  (SAMPLE(?birthDate) AS ?dateOfBirth)
  (MAX(COALESCE(?birthPrecisionValue, 0)) AS ?birthPrecision)
  (SAMPLE(?imageValue) AS ?image)
  (SAMPLE(?koArticleValue) AS ?koArticle)
  (MAX(COALESCE(?sitelinkValue, 0)) AS ?sitelinks)
  (MAX(IF(BOUND(?koArticleValue), 1, 0)) AS ?hasKoWiki)
  (GROUP_CONCAT(DISTINCT ?occupationLabel; separator=", ") AS ?occupations)
WHERE {
  hint:Query hint:optimizer "None".
  VALUES ?birthDate { ${buildDateValues(month, day)} }
  ?person wdt:P569 ?birthDate.
  ?person wdt:P27 wd:Q884.
  ?person wdt:P31 wd:Q5.
  ?person wdt:P106 ?matchedOccupation.
  ?matchedOccupation wdt:P279* ?occupationRoot.
  VALUES ?occupationRoot { ${roots} }
  OPTIONAL { ?person wdt:P18 ?imageValue. }
  OPTIONAL {
    ?koArticleValue schema:about ?person.
    ?koArticleValue schema:isPartOf <https://ko.wikipedia.org/>.
  }
  OPTIONAL { ?person wikibase:sitelinks ?sitelinkValue. }
  OPTIONAL {
    ?person p:P569 ?birthStatement.
    ?birthStatement ps:P569 ?birthDate.
    ?birthStatement psv:P569 ?birthValue.
    ?birthValue wikibase:timePrecision ?birthPrecisionValue.
  }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "ko,en".
    ?person rdfs:label ?personLabel.
    ?matchedOccupation rdfs:label ?occupationLabel.
  }
}
GROUP BY ?person ?personLabel
ORDER BY DESC(?hasKoWiki) DESC(?sitelinks) DESC(?birthPrecision)
LIMIT 50`;
  }

  async function search(event) {
    event.preventDefault();
    const month = Number($("#birthdayMonth").value);
    const day = Number($("#birthdayDay").value);
    const requestId = ++state.requestId;

    abortRequest();
    clearPanels();
    state.controller = new AbortController();
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      state.controller?.abort();
    }, REQUEST_TIMEOUT);

    setLoading(true);
    setStatus(message("loading", { date: formatMonthDay(month, day) }), "info");
    updateUrl(month, day);

    try {
      const body = new URLSearchParams({ query: buildQuery(month, day) });
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          accept: "application/sparql-results+json",
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body,
        signal: state.controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (requestId !== state.requestId) return;
      const people = payload?.results?.bindings || [];
      setLoading(false);
      if (!people.length) {
        showEmpty(message("empty", { date: formatMonthDay(month, day) }));
        setStatus(message("emptyStatus"), "info");
        return;
      }
      renderResults(people, month, day);
      setStatus(message("success", { count: people.length }), "success");
    } catch (error) {
      if (requestId !== state.requestId || (error.name === "AbortError" && !timedOut)) return;
      setLoading(false);
      const text = timedOut ? message("timeout") : message("apiError");
      showEmpty(text, true);
      setStatus(text, "error");
    } finally {
      window.clearTimeout(timeoutId);
      if (requestId === state.requestId) state.controller = null;
    }
  }

  function abortRequest() {
    if (state.controller) state.controller.abort();
    state.controller = null;
  }

  function resetResults() {
    state.requestId += 1;
    abortRequest();
    clearPanels();
    setStatus(message("ready"), "info");
  }

  function clearPanels() {
    $("#celebrityCardGrid").replaceChildren();
    $("#birthdayResults").hidden = true;
    $("#birthdayEmpty").hidden = true;
    $("#birthdayLoading").hidden = true;
  }

  function setLoading(active) {
    $("#birthdayLoading").hidden = !active;
    $("#birthdaySearchButton").disabled = active;
    $("#birthdaySearchButton").setAttribute("aria-busy", String(active));
  }

  function setStatus(text, tone) {
    const status = $("#birthdayStatus");
    status.textContent = text;
    status.dataset.tone = tone;
  }

  function showEmpty(text, isError = false) {
    const panel = $("#birthdayEmpty");
    panel.hidden = false;
    panel.dataset.tone = isError ? "error" : "empty";
    $("#birthdayEmptyText").textContent = text;
  }

  function renderResults(people, month, day) {
    const grid = $("#celebrityCardGrid");
    const fragment = document.createDocumentFragment();
    people.forEach((person) => fragment.append(createCard(person)));
    grid.replaceChildren(fragment);
    $("#birthdayResultsTitle").textContent = message("resultTitle", {
      date: formatMonthDay(month, day),
      count: people.length
    });
    $("#birthdayResults").hidden = false;
  }

  function createCard(binding) {
    const card = document.createElement("article");
    card.className = "celebrity-card";

    const portrait = document.createElement("div");
    portrait.className = "celebrity-portrait";
    const name = binding.personLabel?.value || binding.person?.value?.split("/").pop() || message("unknownName");
    const imageUrl = binding.image?.value;
    if (imageUrl) {
      const image = document.createElement("img");
      image.src = commonsThumbnail(imageUrl);
      image.alt = message("imageAlt", { name });
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("error", () => portrait.replaceChildren(createPlaceholder(name)));
      portrait.append(image);
    } else {
      portrait.append(createPlaceholder(name));
    }

    const body = document.createElement("div");
    body.className = "celebrity-card-body";
    const title = document.createElement("h3");
    title.textContent = name;
    const birth = document.createElement("p");
    birth.className = "celebrity-birth";
    birth.textContent = formatDate(binding.dateOfBirth?.value);
    const occupation = document.createElement("p");
    occupation.className = "celebrity-occupation";
    occupation.textContent = binding.occupations?.value || message("occupationFallback");
    const link = document.createElement("a");
    link.className = "celebrity-profile-link";
    link.href = binding.koArticle?.value || binding.person?.value || "https://www.wikidata.org/";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = binding.koArticle ? message("wikipediaLink") : message("wikidataLink");
    body.append(title, birth, occupation, link);
    card.append(portrait, body);
    return card;
  }

  function createPlaceholder(name) {
    const placeholder = document.createElement("div");
    placeholder.className = "celebrity-placeholder";
    placeholder.setAttribute("role", "img");
    placeholder.setAttribute("aria-label", message("defaultImageAlt", { name }));
    placeholder.textContent = "👤";
    return placeholder;
  }

  function commonsThumbnail(url) {
    try {
      const fileName = decodeURIComponent(new URL(url).pathname.split("/").pop());
      return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}?width=480`;
    } catch (_error) {
      return url;
    }
  }

  function formatMonthDay(month, day) {
    return message("dateLabel", { month, day });
  }

  function formatDate(value) {
    const match = String(value || "").match(/^(-?\d+)-(\d{2})-(\d{2})/);
    if (!match) return message("dateUnknown");
    return message("fullDate", {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3])
    });
  }

  function updateUrl(month, day) {
    const url = new URL(window.location.href);
    url.searchParams.set("month", String(month));
    url.searchParams.set("day", String(day));
    window.history.replaceState({}, "", url);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
