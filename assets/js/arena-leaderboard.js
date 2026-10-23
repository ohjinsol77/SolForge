(function () {
  "use strict";

  const GROUPS = [
    { id: "text", label: "대화", configs: ["text", "text_style_control", "text_factuality"] },
    { id: "coding", label: "코딩", configs: ["webdev"] },
    { id: "vision", label: "비전·문서", configs: ["vision", "vision_style_control", "document", "document_style_control"] },
    { id: "search", label: "검색", configs: ["search", "search_style_control", "search_factuality"] },
    { id: "image", label: "이미지", configs: ["text_to_image", "image_edit"] },
    { id: "video", label: "영상", configs: ["text_to_video", "image_to_video", "video_edit"] },
    { id: "agent", label: "에이전트", configs: ["agent", "agent_bash_recovery_steps", "agent_bash_reliability", "agent_bash_reliability_no_prereq", "agent_praise_complaint", "agent_steerability", "agent_task_outcome_explicit", "agent_tool_hallucination"] }
  ];
  const CONFIG_LABELS = {
    text: "일반 대화", text_style_control: "문체 제어", text_factuality: "사실성",
    webdev: "웹 개발", vision: "이미지 이해", vision_style_control: "문체 제어", document: "문서 이해", document_style_control: "문서 문체 제어",
    search: "웹 검색", search_style_control: "문체 제어", search_factuality: "사실성",
    text_to_image: "텍스트로 이미지 생성", image_edit: "이미지 편집",
    text_to_video: "텍스트로 영상 생성", image_to_video: "이미지로 영상 생성", video_edit: "영상 편집",
    agent: "종합 에이전트", agent_bash_recovery_steps: "터미널 오류 복구", agent_bash_reliability: "터미널 작업 신뢰도",
    agent_bash_reliability_no_prereq: "사전 조건 없는 터미널 신뢰도", agent_praise_complaint: "칭찬·불만 처리", agent_steerability: "지시 반영 능력",
    agent_task_outcome_explicit: "작업 완료 여부", agent_tool_hallucination: "도구 사용 정확도"
  };
  const PAGE_SIZE = 30;
  const state = { data: null, group: "text", config: "text", page: 1, query: "", requestId: 0 };
  const $ = (selector) => document.querySelector(selector);
  const lang = document.documentElement.lang === "en" ? "en" : "ko";
  const numberFormat = new Intl.NumberFormat(lang === "ko" ? "ko-KR" : "en-US", { maximumFractionDigits: 2 });

  function text(value) {
    return window.sfT ? window.sfT(value) : value;
  }

  function init() {
    if (!document.body.matches('[data-page="arena-leaderboard"]')) return;
    renderGroupTabs();
    bindEvents();
    loadData();
  }

  function renderGroupTabs() {
    const root = $("#arenaGroupTabs");
    root.innerHTML = GROUPS.map((group) => `<button type="button" role="tab" id="arena-tab-${group.id}" aria-controls="arenaSubTabs" aria-selected="${group.id === state.group}" tabindex="${group.id === state.group ? 0 : -1}" data-arena-group="${group.id}">${escapeHtml(text(group.label))}</button>`).join("");
    root.querySelectorAll("[data-arena-group]").forEach((button) => button.addEventListener("click", () => selectGroup(button.dataset.arenaGroup)));
    renderSubTabs();
  }

  function renderSubTabs() {
    const group = GROUPS.find((item) => item.id === state.group) || GROUPS[0];
    if (!group.configs.includes(state.config)) state.config = group.configs[0];
    $("#arenaSubTabs").innerHTML = group.configs.map((config) => `<button type="button" role="tab" aria-selected="${config === state.config}" aria-controls="arenaTableWrap" data-arena-config="${config}">${escapeHtml(text(CONFIG_LABELS[config]))}</button>`).join("");
    $("#arenaSubTabs").querySelectorAll("[data-arena-config]").forEach((button) => button.addEventListener("click", () => {
      state.config = button.dataset.arenaConfig;
      state.page = 1;
      renderSubTabs();
      loadData(1);
    }));
  }

  function selectGroup(id) {
    if (!GROUPS.some((group) => group.id === id)) return;
    state.group = id;
    state.config = GROUPS.find((group) => group.id === id).configs[0];
    state.page = 1;
    renderGroupTabs();
    loadData(1);
  }

  function bindEvents() {
    $("#arenaSearch").addEventListener("input", (event) => {
      state.query = event.target.value.trim().toLocaleLowerCase(lang);
      renderRows();
    });
    $("#arenaReload").addEventListener("click", () => loadData());
    $("#arenaPagination").addEventListener("click", (event) => {
      const button = event.target.closest("[data-arena-page]");
      const page = Number(button?.dataset.arenaPage);
      if (!Number.isSafeInteger(page) || page < 1 || page === state.page) return;
      loadData(page);
      $("#arenaRankingTitle").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function loadData(page = state.page) {
    const requestId = ++state.requestId;
    const config = state.config;
    state.page = page;
    setStatus(text("최신 공개 순위를 확인하고 있습니다."), "loading");
    $("#arenaTableWrap").hidden = true;
    $("#arenaPagination").hidden = true;
    $("#arenaReload").disabled = true;
    try {
      const query = new URLSearchParams({ config, page: String(page) });
      const response = await fetch(`/api/arena-leaderboard?${query}`, { headers: { accept: "application/json" }, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload?.rows)) throw new Error(payload?.error || "Arena 데이터를 불러오지 못했습니다.");
      if (requestId !== state.requestId) return;
      state.data = payload;
      const dates = payload.rows.map((row) => row.leaderboard_publish_date).filter(Boolean).sort();
      $("#arenaSourceDate").textContent = dates.at(-1) ? formatDate(dates.at(-1)) : "—";
      $("#arenaUpdatedAt").textContent = `${text("SolForge 확인 시각")}: ${formatDateTime(payload.fetchedAt)}`;
      renderRows();
    } catch (error) {
      if (requestId === state.requestId) setStatus(text(error.message || "순위를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."), "error");
    } finally {
      if (requestId === state.requestId) $("#arenaReload").disabled = false;
    }
  }

  function renderRows() {
    const rows = Array.isArray(state.data?.rows) ? state.data.rows : [];
    const filtered = rows.filter((row) => {
      const content = `${row.model_name || ""} ${row.organization || ""} ${row.license || ""}`.toLocaleLowerCase(lang);
      return content.includes(state.query);
    });
    $("#arenaDatasetName").textContent = text(CONFIG_LABELS[state.config]);
    $("#arenaModelCount").textContent = state.data ? numberFormat.format(state.data.totalRows) : "—";
    $("#arenaRows").innerHTML = filtered.map(renderRow).join("");
    $("#arenaTableWrap").hidden = !filtered.length;
    if (!state.data) return;
    setStatus(filtered.length ? "" : text(state.query ? "검색 결과가 없습니다." : "이 순위에 표시할 항목이 없습니다."), filtered.length ? "ready" : "empty");
    renderPagination(Math.ceil((Number(state.data.totalRows) || 0) / PAGE_SIZE));
  }

  function renderRow(row) {
    const score = row.rating ?? row.score;
    const low = row.rating_lower ?? row.score_ci_lower;
    const high = row.rating_upper ?? row.score_ci_upper;
    const sample = row.vote_count ?? row.observation_count ?? row.session_count;
    const interval = Number.isFinite(Number(low)) && Number.isFinite(Number(high))
      ? `<small>${escapeHtml(text("95% 신뢰 구간"))} ${numberFormat.format(Number(low))}–${numberFormat.format(Number(high))}</small>`
      : "";
    const sampleLabel = row.vote_count != null ? text("표") : row.observation_count != null ? text("관측") : text("세션");
    return `<tr><td class="arena-rank" data-label="${escapeHtml(text("순위"))}">${escapeHtml(row.rank ?? "—")}</td><th scope="row" data-label="${escapeHtml(text("모델"))}"><span class="arena-model-name">${escapeHtml(row.model_name || "—")}</span><small>${escapeHtml(row.license || text("라이선스 정보 없음"))}</small></th><td data-label="${escapeHtml(text("개발사"))}">${escapeHtml(row.organization || "—")}</td><td class="arena-score" data-label="${escapeHtml(text("점수"))}">${score == null ? "—" : numberFormat.format(Number(score))}${interval}</td><td data-label="${escapeHtml(text("평가 수"))}">${sample == null ? "—" : `${numberFormat.format(Number(sample))} ${escapeHtml(sampleLabel)}`}</td><td data-label="${escapeHtml(text("라이선스"))}">${escapeHtml(row.license || "—")}</td></tr>`;
  }

  function renderPagination(totalPages) {
    const root = $("#arenaPagination");
    if (totalPages <= 1) {
      root.innerHTML = "";
      root.hidden = true;
      return;
    }
    const start = Math.max(2, state.page - 2);
    const end = Math.min(totalPages - 1, state.page + 2);
    const pages = totalPages <= 7
      ? Array.from({ length: totalPages }, (_, index) => index + 1)
      : [1, ...(start > 2 ? ["ellipsis-start"] : []), ...Array.from({ length: end - start + 1 }, (_, index) => start + index), ...(end < totalPages - 1 ? ["ellipsis-end"] : []), totalPages];
    root.innerHTML = pages.map((page) => {
      if (typeof page !== "number") return '<span class="arena-page-ellipsis" aria-hidden="true">…</span>';
      return `<button type="button" class="arena-page-button" data-arena-page="${page}" aria-label="${escapeHtml(text("페이지"))} ${page}" ${page === state.page ? 'aria-current="page"' : ""}>${page}</button>`;
    }).join("");
    root.hidden = false;
  }

  function setStatus(message, type) {
    const status = $("#arenaStatus");
    status.textContent = message;
    status.dataset.state = type;
    status.hidden = !message;
  }

  function formatDate(value) {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", { dateStyle: "medium", timeZone: "UTC" }).format(parsed);
  }

  function formatDateTime(value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
  }

  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
})();
