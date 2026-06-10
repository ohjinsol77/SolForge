(function () {
  "use strict";

  const SQL_KEYWORDS = new Set([
    "ADD", "ALL", "ALTER", "ANALYZE", "AND", "AS", "ASC", "BETWEEN", "BY", "CASE",
    "CAST", "CHANGE", "COLLATE", "COLUMN", "CONSTRAINT", "CREATE", "CROSS", "DATABASE",
    "DELETE", "DESC", "DISTINCT", "DROP", "ELSE", "END", "EXISTS", "EXPLAIN", "FALSE",
    "FOR", "FORCE", "FOREIGN", "FROM", "FULL", "GROUP", "HAVING", "IF", "IN", "INDEX",
    "INNER", "INSERT", "INTERVAL", "INTO", "IS", "JOIN", "KEY", "LEFT", "LIKE", "LIMIT",
    "LOCK", "NOT", "NULL", "ON", "OR", "ORDER", "OUTER", "PRIMARY", "PROCEDURE", "REFERENCES",
    "REGEXP", "RIGHT", "SCHEMA", "SELECT", "SET", "STRAIGHT_JOIN", "TABLE", "THEN", "TO",
    "TRUE", "UNION", "UNIQUE", "UPDATE", "USE", "USING", "VALUES", "WHEN", "WHERE", "WITH"
  ]);

  const MULTI_KEYWORDS = [
    "LEFT OUTER JOIN", "RIGHT OUTER JOIN", "FULL OUTER JOIN", "UNION ALL", "GROUP BY",
    "ORDER BY", "INSERT INTO", "DELETE FROM", "CREATE TABLE", "ALTER TABLE", "DROP TABLE",
    "PRIMARY KEY", "FOREIGN KEY", "IS NOT", "NOT IN", "NOT LIKE"
  ];

  const MAJOR_CLAUSES = new Set([
    "WITH", "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET",
    "UNION", "UNION ALL", "INSERT INTO", "UPDATE", "DELETE FROM", "VALUES", "SET"
  ]);

  const JOIN_CLAUSES = new Set([
    "JOIN", "LEFT JOIN", "LEFT OUTER JOIN", "RIGHT JOIN", "RIGHT OUTER JOIN",
    "INNER JOIN", "CROSS JOIN", "FULL JOIN", "FULL OUTER JOIN", "STRAIGHT_JOIN"
  ]);

  const CONDITIONALS = new Set(["AND", "OR", "WHEN", "ELSE"]);
  const ENTITY_CONTEXT = new Set(["FROM", "JOIN", "UPDATE", "INTO", "TABLE", "DATABASE", "SCHEMA", "DESC", "DESCRIBE"]);
  const FUNCTION_NAMES = new Set(["COUNT", "SUM", "AVG", "MIN", "MAX", "IFNULL", "COALESCE", "DATE_FORMAT", "CONCAT", "LOWER", "UPPER", "JSON_EXTRACT", "ROUND"]);

  const SAMPLES = {
    sql: "with paid_orders as (select o.user_id,count(*) order_count,sum(o.total_amount) total_amount,max(o.created_at) last_order_at from app_db.orders o where o.status in ('paid','ready') and o.deleted_at is null group by o.user_id) select u.id,u.name,ifnull(p.order_count,0) order_count,ifnull(p.total_amount,0) total_amount from app_db.users u left join paid_orders p on p.user_id=u.id where u.status='active' and (u.country='KR' or u.country='US') order by total_amount desc,u.name asc limit 20;",
    explain: [
      "id\tselect_type\ttable\tpartitions\ttype\tpossible_keys\tkey\tkey_len\tref\trows\tfiltered\tExtra",
      "1\tSIMPLE\tu\tNULL\tref\tidx_status,idx_country\tidx_status\t82\tconst\t240\t85.00\tUsing where",
      "1\tSIMPLE\to\tNULL\tref\tidx_user_status,idx_created_at\tidx_user_status\t8\tapp_db.u.id\t14\t73.50\tUsing index condition",
      "1\tSIMPLE\tp\tNULL\tALL\tNULL\tNULL\tNULL\tNULL\t120000\t18.00\tUsing temporary; Using filesort"
    ].join("\n")
  };

  const state = {
    formattedSql: ""
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function init() {
    initTheme();
    markActiveLinks();
    initFormatter();
    initExplain();
    initCalculators();
  }

  function initTheme() {
    const toggle = $("#themeToggle");
    const label = $("#themeToggleLabel");
    const savedTheme = localStorage.getItem("solforge-theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(savedTheme || (prefersDark ? "dark" : "light"), toggle, label);
    if (!toggle) return;
    toggle.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      setTheme(next, toggle, label);
    });
  }

  function setTheme(theme, toggle, label) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("solforge-theme", theme);
    if (toggle) toggle.setAttribute("aria-pressed", String(theme === "dark"));
    if (label) label.textContent = theme === "dark" ? "Light" : "Dark";
  }

  function markActiveLinks() {
    const path = normalizePath(window.location.pathname);
    $$("[data-nav-link], [data-top-link]").forEach((link) => {
      const href = link.getAttribute("href") || "";
      const linkPath = normalizePath(new URL(href, window.location.href).pathname);
      link.classList.toggle("active", linkPath === path);
    });
  }

  function normalizePath(path) {
    if (!path || path === "/public/") return "/";
    return path.replace(/\/index\.html$/, "/");
  }

  function initFormatter() {
    const input = $("#sqlInput");
    const output = $("#sqlOutput");
    const copy = $("#copySql");
    const sample = $("[data-load-sample=\"sql\"]");
    if (!input || !output) return;

    const render = () => {
      const raw = input.value.trim();
      if (!raw) {
        state.formattedSql = "";
        output.innerHTML = "<span class=\"tok-comment\">정렬된 쿼리가 여기에 표시됩니다.</span>";
        return;
      }
      state.formattedSql = formatSql(raw);
      output.innerHTML = highlightSql(state.formattedSql);
    };

    input.addEventListener("input", render);
    if (sample) {
      sample.addEventListener("click", () => {
        input.value = SAMPLES.sql;
        render();
      });
    }
    if (copy) copy.addEventListener("click", () => copyText(state.formattedSql));
    render();
  }

  function initExplain() {
    const input = $("#explainInput");
    const visual = $("#planVisual");
    if (!input || !visual) return;

    const render = () => {
      const raw = input.value.trim();
      if (!raw) {
        renderExplainState([]);
        return;
      }
      const rows = parseExplain(raw);
      renderExplainState(rows);
    };

    const sample = $("[data-load-sample=\"explain\"]");
    if (sample) {
      sample.addEventListener("click", () => {
        input.value = SAMPLES.explain;
        render();
      });
    }
    input.addEventListener("input", render);
    render();
  }

  function initCalculators() {
    initDateCalculator();
    initAgeCalculator();
    initAnniversaryCalculator();
    initSchoolCalculator();
  }

  function initDateCalculator() {
    const form = $("#dateCalcForm");
    if (!form) return;
    const start = $("#dateStart");
    const end = $("#dateEnd");
    const includeEnd = $("#includeEnd");
    const base = $("#dateBase");
    const mode = $("#dateMode");
    const years = $("#dateYears");
    const months = $("#dateMonths");
    const days = $("#dateDays");
    const output = $("#dateCalcResult");

    const today = toInputDate(new Date());
    start.value ||= today;
    end.value ||= today;
    base.value ||= today;

    const render = () => {
      const startDate = parseInputDate(start.value);
      const endDate = parseInputDate(end.value);
      const baseDate = parseInputDate(base.value);
      const diffDays = Math.round((stripTime(endDate) - stripTime(startDate)) / 86400000) + (includeEnd.checked ? 1 : 0);
      const moved = addDateParts(baseDate, {
        years: signedNumber(years.value, mode.value),
        months: signedNumber(months.value, mode.value),
        days: signedNumber(days.value, mode.value)
      });
      const dday = Math.round((stripTime(endDate) - stripTime(new Date())) / 86400000);
      output.innerHTML = [
        resultMain(`${formatNumber(diffDays)}일`, "두 날짜 사이의 차이"),
        resultList([
          ["D-Day 기준", dday === 0 ? "D-Day" : dday > 0 ? `D-${formatNumber(dday)}` : `D+${formatNumber(Math.abs(dday))}`],
          ["날짜 더하기/빼기 결과", formatKoreanDate(moved)],
          ["포함 계산", includeEnd.checked ? "종료일 포함" : "종료일 제외"]
        ])
      ].join("");
    };

    form.addEventListener("input", render);
    render();
  }

  function initAgeCalculator() {
    const form = $("#ageCalcForm");
    if (!form) return;
    const birth = $("#birthDate");
    const target = $("#ageTargetDate");
    const output = $("#ageCalcResult");
    birth.value ||= "1995-01-01";
    target.value ||= toInputDate(new Date());

    const render = () => {
      const birthDate = parseInputDate(birth.value);
      const targetDate = parseInputDate(target.value);
      const age = calculateAge(birthDate, targetDate);
      const koreanAge = targetDate.getFullYear() - birthDate.getFullYear() + 1;
      const adult = age.years >= 19 ? "만 19세 이상" : "만 19세 미만";
      output.innerHTML = [
        resultMain(`만 ${age.years}세`, "국제 기준 나이"),
        resultList([
          ["세부 나이", `${age.years}년 ${age.months}개월 ${age.days}일`],
          ["한국식 세는 나이", `${koreanAge}세`],
          ["성년 여부 참고", adult],
          ["기준일", formatKoreanDate(targetDate)]
        ])
      ].join("");
    };

    form.addEventListener("input", render);
    render();
  }

  function initAnniversaryCalculator() {
    const form = $("#anniversaryCalcForm");
    if (!form) return;
    const base = $("#anniversaryBase");
    const dayCount = $("#anniversaryDays");
    const output = $("#anniversaryResult");
    base.value ||= toInputDate(new Date());
    dayCount.value ||= "100";

    const render = () => {
      const baseDate = parseInputDate(base.value);
      const count = Math.max(1, toNumber(dayCount.value));
      const target = addDateParts(baseDate, { days: count - 1 });
      const left = Math.round((stripTime(target) - stripTime(new Date())) / 86400000);
      output.innerHTML = [
        resultMain(formatKoreanDate(target), `${formatNumber(count)}일째 되는 날`),
        resultList([
          ["오늘 기준", left === 0 ? "오늘" : left > 0 ? `${formatNumber(left)}일 남음` : `${formatNumber(Math.abs(left))}일 지남`],
          ["시작일 포함", "첫날을 1일로 계산"],
          ["추천 용도", "100일, 200일, 프로젝트 마일스톤"]
        ])
      ].join("");
    };

    form.addEventListener("input", render);
    render();
  }

  function initSchoolCalculator() {
    const form = $("#schoolCalcForm");
    if (!form) return;
    const birthYear = $("#schoolBirthYear");
    const output = $("#schoolResult");
    birthYear.value ||= String(new Date().getFullYear() - 7);

    const render = () => {
      const year = Math.max(1900, toNumber(birthYear.value));
      const elementaryIn = year + 7;
      const elementaryOut = elementaryIn + 6;
      const middleIn = elementaryOut;
      const middleOut = middleIn + 3;
      const highIn = middleOut;
      const highOut = highIn + 3;
      output.innerHTML = [
        resultMain(`${elementaryIn}년 3월`, "초등학교 입학 예상"),
        resultList([
          ["초등학교 졸업", `${elementaryOut}년 2월`],
          ["중학교 입학", `${middleIn}년 3월`],
          ["중학교 졸업", `${middleOut}년 2월`],
          ["고등학교 입학", `${highIn}년 3월`],
          ["고등학교 졸업", `${highOut}년 2월`]
        ])
      ].join("");
    };

    form.addEventListener("input", render);
    render();
  }

  function tokenizeSql(sql, keepSpaces) {
    const tokens = [];
    let i = 0;
    while (i < sql.length) {
      const char = sql[i];
      const next = sql[i + 1];

      if (/\s/.test(char)) {
        let value = char;
        i += 1;
        while (i < sql.length && /\s/.test(sql[i])) value += sql[i++];
        if (keepSpaces) tokens.push({ type: "space", value });
        continue;
      }
      if (char === "-" && next === "-") {
        let value = "--";
        i += 2;
        while (i < sql.length && sql[i] !== "\n") value += sql[i++];
        tokens.push({ type: "comment", value });
        continue;
      }
      if (char === "/" && next === "*") {
        let value = "/*";
        i += 2;
        while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) value += sql[i++];
        if (i < sql.length) {
          value += "*/";
          i += 2;
        }
        tokens.push({ type: "comment", value });
        continue;
      }
      if (char === "'" || char === "\"" || char === "`") {
        const quote = char;
        let value = quote;
        i += 1;
        while (i < sql.length) {
          value += sql[i];
          if (sql[i] === "\\" && i + 1 < sql.length) {
            i += 1;
            value += sql[i];
          } else if (sql[i] === quote) {
            i += 1;
            break;
          }
          i += 1;
        }
        tokens.push({ type: quote === "`" ? "identifier" : "string", value });
        continue;
      }
      if (/[0-9]/.test(char)) {
        let value = char;
        i += 1;
        while (i < sql.length && /[0-9.]/.test(sql[i])) value += sql[i++];
        tokens.push({ type: "number", value });
        continue;
      }
      if (char === "@" || char === ":" || char === "$") {
        let value = char;
        i += 1;
        while (i < sql.length && /[\w$]/.test(sql[i])) value += sql[i++];
        tokens.push({ type: "variable", value });
        continue;
      }
      if (/[A-Za-z_]/.test(char)) {
        let value = char;
        i += 1;
        while (i < sql.length && /[\w$]/.test(sql[i])) value += sql[i++];
        const upper = value.toUpperCase();
        tokens.push({ type: SQL_KEYWORDS.has(upper) ? "keyword" : "word", value: SQL_KEYWORDS.has(upper) ? upper : value });
        continue;
      }
      if ("=<>!".includes(char) && "=<>".includes(next || "")) {
        tokens.push({ type: "operator", value: char + next });
        i += 2;
        continue;
      }
      tokens.push({ type: /[+\-*/%<>.=]/.test(char) ? "operator" : "symbol", value: char });
      i += 1;
    }
    return keepSpaces ? tokens : mergeSqlKeywords(tokens);
  }

  function mergeSqlKeywords(tokens) {
    const merged = [];
    for (let i = 0; i < tokens.length; i += 1) {
      let matched = null;
      for (const phrase of MULTI_KEYWORDS) {
        const parts = phrase.split(" ");
        const slice = tokens.slice(i, i + parts.length);
        if (slice.length === parts.length && slice.every((token, index) => token.value.toUpperCase() === parts[index])) {
          matched = phrase;
          break;
        }
      }
      if (matched) {
        merged.push({ type: "keyword", value: matched });
        i += matched.split(" ").length - 1;
      } else {
        merged.push(tokens[i]);
      }
    }
    return merged;
  }

  function formatSql(sql) {
    const tokens = tokenizeSql(sql, true);
    const lines = [];
    let line = "";
    let indent = 0;
    let clause = "";
    let clauseIndent = 0;
    let parenDepth = 0;

    const push = () => {
      const text = line.trim();
      if (text) lines.push(`${"  ".repeat(Math.max(indent + clauseIndent, 0))}${text}`);
      line = "";
    };

    const append = (value) => {
      if (!line) {
        line = value;
        return;
      }
      if (/^[,.;)]$/.test(value)) {
        line += value;
        return;
      }
      if (value === "(" || value === "." || line.endsWith("(") || line.endsWith(".")) {
        line += value;
        return;
      }
      line += ` ${value}`;
    };

    const setClause = (name) => {
      if (line) push();
      clauseIndent = 0;
      clause = name;
      append(name);
      if (["SELECT", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "SET", "VALUES"].includes(name)) {
        push();
        clauseIndent = 1;
      }
    };

    tokens.forEach((token, index) => {
      const value = token.value;
      const upper = value.toUpperCase();
      const prev = tokens[index - 1];
      const next = tokens[index + 1];
      const prevValue = prev ? prev.value.toUpperCase() : "";
      const isFunctionCall = token.type === "word" && next && next.value === "(";

      if (token.type === "comment") {
        push();
        append(value);
        push();
        return;
      }

      if (MAJOR_CLAUSES.has(upper)) {
        if (upper === "UNION" || upper === "UNION ALL") {
          push();
          clauseIndent = 0;
          append(upper);
          push();
          clause = "";
          return;
        }
        setClause(upper);
        return;
      }

      if (JOIN_CLAUSES.has(upper)) {
        push();
        clauseIndent = 0;
        clause = "JOIN";
        append(upper);
        return;
      }

      if (upper === "ON") {
        push();
        clauseIndent = 1;
        clause = "ON";
        append("ON");
        return;
      }

      if (CONDITIONALS.has(upper) && ["WHERE", "ON", "HAVING"].includes(clause)) {
        push();
        append(upper);
        return;
      }

      if (upper === "CASE") {
        append("CASE");
        push();
        indent += 1;
        clauseIndent = 0;
        clause = "CASE";
        return;
      }

      if (["WHEN", "THEN", "ELSE"].includes(upper)) {
        push();
        append(upper);
        return;
      }

      if (upper === "END") {
        push();
        indent = Math.max(indent - 1, 0);
        append("END");
        return;
      }

      if (value === "(") {
        append("(");
        if (!FUNCTION_NAMES.has(prevValue) && prevValue !== "IN" && prevValue !== "VALUES") {
          parenDepth += 1;
          push();
          indent += 1;
          clauseIndent = 0;
        }
        return;
      }

      if (value === ")") {
        if (parenDepth > 0 && !line.trim().endsWith("(")) {
          push();
          indent = Math.max(indent - 1, 0);
          parenDepth -= 1;
          append(")");
        } else {
          append(")");
        }
        return;
      }

      if (value === ",") {
        append(",");
        if (["SELECT", "GROUP BY", "ORDER BY", "SET", "VALUES"].includes(clause) || parenDepth > 0) push();
        return;
      }

      if (value === ";") {
        append(";");
        push();
        clause = "";
        clauseIndent = 0;
        return;
      }

      if (token.type === "operator" && value !== ".") {
        append(value);
        return;
      }

      append(isFunctionCall && SQL_KEYWORDS.has(upper) ? upper : value);
    });

    push();
    return lines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\(\n\s*\)/g, "()")
      .trim();
  }

  function highlightSql(sql) {
    const tokens = tokenizeSql(sql);
    let previousMeaningful = "";
    let nextIsAlias = false;
    return tokens.map((token, index) => {
      if (token.type === "space") return escapeHtml(token.value);
      if (token.type === "comment") return wrap("tok-comment", token.value);
      if (token.type === "string") return wrap("tok-string", token.value);
      if (token.type === "number") return wrap("tok-number", token.value);
      if (token.type === "variable") return wrap("tok-variable", token.value);
      if (token.type === "identifier") return wrap("tok-entity", token.value);
      if (token.type === "operator") return wrap("tok-operator", token.value);
      if (token.type === "keyword") {
        previousMeaningful = token.value;
        nextIsAlias = token.value === "AS";
        return wrap("tok-keyword", token.value);
      }
      if (token.type === "word") {
        const next = tokens[index + 1];
        if (next && next.value === "(") {
          previousMeaningful = token.value;
          return wrap("tok-function", token.value);
        }
        if (nextIsAlias) {
          nextIsAlias = false;
          previousMeaningful = token.value;
          return wrap("tok-alias", token.value);
        }
        if (ENTITY_CONTEXT.has(previousMeaningful) || previousMeaningful === ".") {
          previousMeaningful = token.value;
          return wrap("tok-entity", token.value);
        }
        previousMeaningful = token.value;
      }
      if (token.value === ".") previousMeaningful = ".";
      return escapeHtml(token.value);
    }).join("");
  }

  function parseExplain(raw) {
    const text = raw.trim();
    if (!text) return [];
    if (text[0] === "{" || text[0] === "[") {
      try {
        return normalizeExplainRows(parseExplainJson(JSON.parse(text)));
      } catch (error) {
        return [];
      }
    }
    if (text.includes("\t")) return normalizeExplainRows(parseDelimited(text, "\t"));
    if (text.includes("|")) return normalizeExplainRows(parsePipeTable(text));
    return normalizeExplainRows(parseDelimited(text, /\s{2,}/));
  }

  function parseDelimited(text, delimiter) {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = splitLine(lines[0], delimiter).map(normalizeHeader);
    return lines.slice(1).map((line) => {
      const cells = splitLine(line, delimiter);
      return headers.reduce((row, header, index) => {
        row[header] = cleanCell(cells[index] || "");
        return row;
      }, {});
    }).filter((row) => Object.values(row).some(Boolean));
  }

  function splitLine(line, delimiter) {
    return delimiter instanceof RegExp ? line.split(delimiter) : line.split(delimiter);
  }

  function parsePipeTable(text) {
    const lines = text.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.includes("|") && !/^\+[-+]+\+$/.test(line));
    if (lines.length < 2) return [];
    const headers = lines[0].split("|").map(cleanCell).filter(Boolean).map(normalizeHeader);
    return lines.slice(1).map((line) => {
      const cells = line.split("|").map(cleanCell).filter((cell, index, arr) => {
        return !(index === 0 && cell === "") && !(index === arr.length - 1 && cell === "");
      });
      return headers.reduce((row, header, index) => {
        row[header] = cells[index] || "";
        return row;
      }, {});
    });
  }

  function parseExplainJson(json) {
    const rows = [];
    const root = Array.isArray(json) ? json[0] : json;
    function visit(node, depth, label) {
      if (!node || typeof node !== "object") return;
      if (node.query_cost) {
        rows.queryCost = Number(node.query_cost);
      }
      if (node.table) {
        const table = node.table;
        rows.push({
          id: String(rows.length + 1),
          select_type: label || "JSON",
          table: table.table_name || table.name || "(derived)",
          type: table.access_type || "",
          possible_keys: Array.isArray(table.possible_keys) ? table.possible_keys.join(", ") : "",
          key: table.key || "",
          ref: table.ref || "",
          rows: String(table.rows_examined_per_scan || table.rows_produced_per_join || ""),
          filtered: String(table.filtered || ""),
          extra: [
            table.attached_condition ? "attached condition" : "",
            table.using_index ? "Using index" : "",
            table.using_temporary_table ? "Using temporary" : "",
            table.using_filesort ? "Using filesort" : ""
          ].filter(Boolean).join("; "),
          json_cost: table.cost_info && (table.cost_info.read_cost || table.cost_info.eval_cost || table.cost_info.prefix_cost),
          depth
        });
      }
      ["query_block", "ordering_operation", "grouping_operation", "duplicates_removal"].forEach((key) => {
        if (node[key]) visit(node[key], depth, key.replace(/_/g, " "));
      });
      if (Array.isArray(node.nested_loop)) {
        node.nested_loop.forEach((child, index) => visit(child, depth + 1, `nested loop ${index + 1}`));
      }
    }
    visit(root, 0, "query block");
    return rows;
  }

  function normalizeExplainRows(rows) {
    return rows.map((row, index) => {
      const normalized = {};
      Object.keys(row).forEach((key) => normalized[normalizeHeader(key)] = cleanCell(row[key]));
      const accessType = (normalized.type || normalized.access_type || "").toLowerCase();
      const rowCount = toNumber(normalized.rows || normalized.rows_examined_per_scan);
      const filtered = toNumber(normalized.filtered || 100);
      const key = normalized.key && normalized.key !== "NULL" ? normalized.key : "";
      const possible = normalized.possible_keys && normalized.possible_keys !== "NULL" ? normalized.possible_keys : "";
      const extra = normalized.extra || normalized.Extra || "";
      const cost = estimateCost(accessType, rowCount, filtered, extra, normalized.json_cost);
      return {
        ...normalized,
        id: normalized.id || String(index + 1),
        table: normalized.table || normalized.table_name || `(step ${index + 1})`,
        type: accessType || "unknown",
        key,
        possible_keys: possible,
        rows: rowCount ? String(rowCount) : (normalized.rows || "?"),
        filtered: filtered ? String(filtered) : (normalized.filtered || "?"),
        extra,
        estimated_cost: cost,
        risk: classifyPlan(accessType, rowCount, extra, key),
        join_target: inferJoinTarget(normalized.ref || ""),
        join_kind: inferJoinKind(index, accessType, key)
      };
    });
  }

  function renderExplainState(rows) {
    const visual = $("#planVisual");
    const summary = $("#explainSummary");
    const dashboard = $("#planDashboard");
    const insights = $("#planInsights");
    renderExplainTable(rows);

    if (!rows.length) {
      if (summary) summary.textContent = "Waiting for input";
      if (dashboard) dashboard.innerHTML = "";
      if (insights) insights.innerHTML = "";
      if (visual) visual.innerHTML = "<div class=\"plan-empty\">EXPLAIN 결과를 붙여넣으면 실행 흐름, 조인, 인덱스 사용 여부와 비용 추정이 표시됩니다.</div>";
      return;
    }

    const totalRows = rows.reduce((sum, row) => sum + toNumber(row.rows), 0);
    const totalCost = rows.reduce((sum, row) => sum + row.estimated_cost, 0);
    const noIndex = rows.filter((row) => !row.key || row.type === "all").length;
    const joins = Math.max(rows.length - 1, 0);
    if (summary) summary.textContent = `${rows.length} steps · cost ${formatNumber(totalCost)}`;
    if (dashboard) {
      dashboard.innerHTML = [
        stat("Plan steps", rows.length),
        stat("Estimated rows", formatNumber(totalRows)),
        stat("Estimated cost", formatNumber(totalCost)),
        stat("No-index scans", noIndex)
      ].join("");
    }
    if (visual) visual.innerHTML = renderPlanFlow(rows);
    if (insights) insights.innerHTML = renderInsights(rows, joins);
  }

  function renderPlanFlow(rows) {
    if (rows.length === 1) {
      return `<div class="plan-flow"><div class="plan-node root-node">${renderNode(rows[0], 0, rows)}</div></div>`;
    }
    return `<div class="plan-flow">${rows.map((row, index) => {
      if (index === 0) {
        return `<div class="plan-node root-node">${renderNode(row, index, rows)}</div>`;
      }
      return [
        "<div class=\"plan-node-row\">",
        `<div class="plan-node">${renderNode(rows[index - 1], index - 1, rows, true)}</div>`,
        "<div class=\"plan-arrow\" aria-hidden=\"true\"></div>",
        `<div class="plan-node">${renderNode(row, index, rows)}</div>`,
        "</div>"
      ].join("");
    }).join("")}</div>`;
  }

  function renderNode(row, index, rows, compact) {
    const totalCost = Math.max(...rows.map((item) => item.estimated_cost), 1);
    const width = Math.min(100, Math.max(6, Math.round((row.estimated_cost / totalCost) * 100)));
    const riskClass = row.risk.level === "danger" ? "danger" : row.risk.level === "warn" ? "warn" : "good";
    return [
      "<div class=\"node-top\">",
      "<div>",
      `<p class="node-title">${escapeHtml(index + 1)}. ${escapeHtml(row.table)}</p>`,
      `<p class="node-subtitle">${escapeHtml(row.select_type || "SIMPLE")} · ${escapeHtml(row.join_kind)}</p>`,
      "</div>",
      `<span class="tag ${riskClass}">${escapeHtml(row.risk.label)}</span>`,
      "</div>",
      "<div class=\"node-tags\">",
      `<span class="tag ${row.key ? "good" : "danger"}">${row.key ? `index: ${escapeHtml(row.key)}` : "no index"}</span>`,
      `<span class="tag ${row.type === "all" ? "danger" : "good"}">access: ${escapeHtml(row.type.toUpperCase())}</span>`,
      `<span class="tag">rows: ${escapeHtml(row.rows)}</span>`,
      `<span class="tag">filtered: ${escapeHtml(row.filtered)}%</span>`,
      "</div>",
      `<div class="cost-bar" title="estimated cost ${escapeHtml(formatNumber(row.estimated_cost))}"><span style="--cost-width: ${width}%"></span></div>`,
      compact ? "" : [
        "<div class=\"node-detail\">",
        `<span><b>possible</b> ${escapeHtml(row.possible_keys || "none")}</span>`,
        `<span><b>ref</b> ${escapeHtml(row.ref || "none")}</span>`,
        `<span><b>cost</b> ${escapeHtml(formatNumber(row.estimated_cost))}</span>`,
        `<span><b>extra</b> ${escapeHtml(row.extra || "none")}</span>`,
        "</div>"
      ].join("")
    ].join("");
  }

  function renderInsights(rows, joins) {
    const joinItems = rows.slice(1).map((row, index) => {
      const left = rows[index].table;
      const condition = row.ref && row.ref !== "NULL" ? row.ref : row.join_target || "condition not copied";
      return `<li>${escapeHtml(left)} → ${escapeHtml(row.table)} · ${escapeHtml(condition)}</li>`;
    });
    const indexItems = rows.map((row) => {
      const text = row.key ? `${row.table}: ${row.key} 사용` : `${row.table}: 인덱스 미사용 또는 full scan`;
      return `<li>${escapeHtml(text)}</li>`;
    });
    const hotspotItems = rows.slice().sort((a, b) => b.estimated_cost - a.estimated_cost).slice(0, 3).map((row) => {
      return `<li>${escapeHtml(row.table)} · cost ${escapeHtml(formatNumber(row.estimated_cost))} · ${escapeHtml(row.risk.reason)}</li>`;
    });
    return [
      insight("Join flow", joinItems.length ? joinItems : [`<li>조인 단계가 감지되지 않았습니다. steps: ${joins}</li>`]),
      insight("Index usage", indexItems),
      insight("Cost hotspots", hotspotItems)
    ].join("");
  }

  function renderExplainTable(rows) {
    const table = $("#explainTable");
    if (!table) return;
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    if (!rows.length) {
      thead.innerHTML = "";
      tbody.innerHTML = "";
      return;
    }
    const headers = ["id", "select_type", "table", "type", "possible_keys", "key", "ref", "rows", "filtered", "estimated_cost", "extra"];
    thead.innerHTML = `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;
    tbody.innerHTML = rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header] || "")}</td>`).join("")}</tr>`).join("");
  }

  function stat(label, value) {
    return `<div class="stat-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function insight(title, items) {
    return `<article class="insight-card"><h3>${escapeHtml(title)}</h3><ul>${items.join("")}</ul></article>`;
  }

  function estimateCost(accessType, rows, filtered, extra, jsonCost) {
    if (jsonCost) return Math.max(1, Number(jsonCost));
    const accessWeight = {
      system: 0.2,
      const: 0.4,
      eq_ref: 0.7,
      ref: 1,
      range: 1.6,
      index: 2.4,
      all: 4.5,
      unknown: 2
    }[accessType || "unknown"] || 2;
    const filterWeight = Math.max(0.05, Math.min(1, (filtered || 100) / 100));
    const extraWeight = /filesort|temporary/i.test(extra || "") ? 1.8 : 1;
    return Math.max(1, Math.round((rows || 1) * accessWeight * filterWeight * extraWeight));
  }

  function classifyPlan(accessType, rows, extra, key) {
    if (accessType === "all" || !key || /filesort|temporary/i.test(extra || "") || rows > 100000) {
      return { level: "danger", label: "Review", reason: "full scan, filesort, temporary table, or high row count" };
    }
    if (["index", "range"].includes(accessType) || rows > 10000) {
      return { level: "warn", label: "Watch", reason: "large index/range scan or elevated row count" };
    }
    return { level: "good", label: "Good", reason: "selective access path detected" };
  }

  function inferJoinTarget(ref) {
    const match = String(ref).match(/([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)$/);
    return match ? match[1] : "";
  }

  function inferJoinKind(index, accessType, key) {
    if (index === 0) return "driving table";
    if (key && ["eq_ref", "ref", "const"].includes(accessType)) return "indexed nested loop join";
    if (key) return "indexed join step";
    return "scan join step";
  }

  function normalizeHeader(header) {
    const key = cleanCell(header).toLowerCase().replace(/\s+/g, "_");
    const aliases = {
      selecttype: "select_type",
      table_name: "table",
      rows_examined_per_scan: "rows",
      access_type: "type",
      extra: "extra"
    };
    return aliases[key] || key;
  }

  function cleanCell(value) {
    return String(value == null ? "" : value).trim().replace(/^"|"$/g, "");
  }

  function toNumber(value) {
    const number = Number(String(value || "").replace(/,/g, ""));
    return Number.isFinite(number) ? number : 0;
  }

  function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(number);
  }

  function resultMain(value, label) {
    return `<div class="result-main"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function resultList(items) {
    return `<ul class="result-list">${items.map(([label, value]) => `<li><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></li>`).join("")}</ul>`;
  }

  function parseInputDate(value) {
    if (!value) return stripTime(new Date());
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function stripTime(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function toInputDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addDateParts(date, parts) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setFullYear(next.getFullYear() + (parts.years || 0));
    next.setMonth(next.getMonth() + (parts.months || 0));
    next.setDate(next.getDate() + (parts.days || 0));
    return next;
  }

  function signedNumber(value, mode) {
    const number = toNumber(value);
    return mode === "subtract" ? -number : number;
  }

  function calculateAge(birthDate, targetDate) {
    let years = targetDate.getFullYear() - birthDate.getFullYear();
    let months = targetDate.getMonth() - birthDate.getMonth();
    let days = targetDate.getDate() - birthDate.getDate();
    if (days < 0) {
      months -= 1;
      days += new Date(targetDate.getFullYear(), targetDate.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
  }

  function formatKoreanDate(date) {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  }

  async function copyText(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    showToast();
  }

  function showToast() {
    const toast = $("#copyToast");
    if (!toast) return;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1400);
  }

  function wrap(className, value) {
    return `<span class="${className}">${escapeHtml(value)}</span>`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  document.addEventListener("DOMContentLoaded", init);
}());
