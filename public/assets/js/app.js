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

  const CLAUSE_STARTERS = new Set([
    "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET",
    "UNION", "UNION ALL", "INSERT INTO", "UPDATE", "DELETE FROM", "VALUES", "SET",
    "WITH", "ON", "AND", "OR"
  ]);

  const JOIN_WORDS = new Set([
    "JOIN", "LEFT JOIN", "LEFT OUTER JOIN", "RIGHT JOIN", "RIGHT OUTER JOIN",
    "INNER JOIN", "CROSS JOIN", "FULL JOIN", "FULL OUTER JOIN", "STRAIGHT_JOIN"
  ]);

  const JOIN_STARTERS = new Set(["JOIN", "LEFT", "RIGHT", "INNER", "CROSS", "FULL", "STRAIGHT_JOIN"]);

  const ENTITY_CONTEXT = new Set([
    "FROM", "JOIN", "UPDATE", "INTO", "TABLE", "DATABASE", "SCHEMA", "DESC", "DESCRIBE"
  ]);

  const SAMPLES = {
    sql: "select u.id,u.name,count(o.id) total_amount,ifnull(max(o.created_at),'N/A') last_order from app_db.users u left join app_db.orders o on o.user_id=u.id and o.status in ('paid','ready') where u.status='active' and u.deleted_at is null group by u.id,u.name having total_amount > 2 order by total_amount desc, u.name asc limit 20;",
    explain: [
      "id\tselect_type\ttable\tpartitions\ttype\tpossible_keys\tkey\tkey_len\tref\trows\tfiltered\tExtra",
      "1\tSIMPLE\tu\tNULL\tref\tidx_status\tidx_status\t82\tconst\t240\t100.00\tUsing where; Using temporary; Using filesort",
      "1\tSIMPLE\to\tNULL\tref\tidx_user_status,idx_created_at\tidx_user_status\t8\tapp_db.u.id\t14\t73.50\tUsing index condition"
    ].join("\n")
  };

  const state = {
    formattedSql: ""
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const elements = {
    sqlInput: $("#sqlInput"),
    sqlOutput: $("#sqlOutput"),
    explainInput: $("#explainInput"),
    planVisual: $("#planVisual"),
    explainSummary: $("#explainSummary"),
    explainTable: $("#explainTable"),
    copySql: $("#copySql"),
    copyToast: $("#copyToast"),
    themeToggle: $("#themeToggle"),
    themeToggleLabel: $("#themeToggleLabel")
  };

  function init() {
    initTheme();
    bindNavigation();
    bindTools();
    renderSql();
    renderExplain();
  }

  function initTheme() {
    const savedTheme = localStorage.getItem("solforge-theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(savedTheme || (prefersDark ? "dark" : "light"));
    elements.themeToggle.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      setTheme(next);
    });
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("solforge-theme", theme);
    const isDark = theme === "dark";
    elements.themeToggle.setAttribute("aria-pressed", String(isDark));
    elements.themeToggleLabel.textContent = isDark ? "Light" : "Dark";
  }

  function bindNavigation() {
    const links = $$("[data-nav-link]");
    const sections = links
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`);
      });
    }, { rootMargin: "-24% 0px -62% 0px", threshold: [0.1, 0.25, 0.5] });

    sections.forEach((section) => observer.observe(section));
  }

  function bindTools() {
    elements.sqlInput.addEventListener("input", renderSql);
    elements.explainInput.addEventListener("input", renderExplain);
    elements.copySql.addEventListener("click", copyFormattedSql);
    $$("[data-load-sample]").forEach((button) => {
      button.addEventListener("click", () => {
        const type = button.dataset.loadSample;
        if (type === "sql") {
          elements.sqlInput.value = SAMPLES.sql;
          renderSql();
        }
        if (type === "explain") {
          elements.explainInput.value = SAMPLES.explain;
          renderExplain();
        }
      });
    });
  }

  function renderSql() {
    const input = elements.sqlInput.value.trim();
    if (!input) {
      state.formattedSql = "";
      elements.sqlOutput.innerHTML = "<span class=\"tok-comment\">Formatted query will appear here.</span>";
      return;
    }
    state.formattedSql = formatSql(input);
    elements.sqlOutput.innerHTML = highlightSql(state.formattedSql);
  }

  function tokenizeSql(sql) {
    const tokens = [];
    let i = 0;

    while (i < sql.length) {
      const char = sql[i];
      const next = sql[i + 1];

      if (/\s/.test(char)) {
        let value = char;
        i += 1;
        while (i < sql.length && /\s/.test(sql[i])) {
          value += sql[i];
          i += 1;
        }
        tokens.push({ type: "space", value });
        continue;
      }

      if (char === "-" && next === "-") {
        let value = "--";
        i += 2;
        while (i < sql.length && sql[i] !== "\n") {
          value += sql[i];
          i += 1;
        }
        tokens.push({ type: "comment", value });
        continue;
      }

      if (char === "/" && next === "*") {
        let value = "/*";
        i += 2;
        while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) {
          value += sql[i];
          i += 1;
        }
        if (i < sql.length) {
          value += "*/";
          i += 2;
        }
        tokens.push({ type: "comment", value });
        continue;
      }

      if (char === "'" || char === '"' || char === "`") {
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
        while (i < sql.length && /[0-9.]/.test(sql[i])) {
          value += sql[i];
          i += 1;
        }
        tokens.push({ type: "number", value });
        continue;
      }

      if (char === "@" || char === ":" || char === "$") {
        let value = char;
        i += 1;
        while (i < sql.length && /[\w$]/.test(sql[i])) {
          value += sql[i];
          i += 1;
        }
        tokens.push({ type: "variable", value });
        continue;
      }

      if (/[A-Za-z_]/.test(char)) {
        let value = char;
        i += 1;
        while (i < sql.length && /[\w$]/.test(sql[i])) {
          value += sql[i];
          i += 1;
        }
        tokens.push({ type: "word", value });
        continue;
      }

      tokens.push({ type: "symbol", value: char });
      i += 1;
    }

    return tokens;
  }

  function compactSqlTokens(tokens) {
    const compacted = [];
    tokens.forEach((token) => {
      if (token.type === "space") return;
      if (token.type === "word") {
        const upper = token.value.toUpperCase();
        const previous = compacted[compacted.length - 1];
        if (previous && (previous.type === "word" || previous.type === "keyword")) {
          const pair = `${previous.value.toUpperCase()} ${upper}`;
          if (CLAUSE_STARTERS.has(pair) || JOIN_WORDS.has(pair)) {
            previous.value = pair;
            previous.type = "keyword";
            return;
          }
        }
        token.type = SQL_KEYWORDS.has(upper) ? "keyword" : "word";
        token.value = token.type === "keyword" ? upper : token.value;
      }
      compacted.push(token);
    });
    return compacted;
  }

  function formatSql(sql) {
    const tokens = compactSqlTokens(tokenizeSql(sql));
    const lines = [];
    let line = "";
    let indent = 0;

    const pushLine = () => {
      const trimmed = line.trim();
      if (trimmed) {
        lines.push(`${"  ".repeat(Math.max(indent, 0))}${trimmed}`);
      }
      line = "";
    };

    const append = (value) => {
      if (!line) {
        line = value;
        return;
      }
      if (/^[,.;)(]$/.test(value)) {
        line += value;
        return;
      }
      if (line.endsWith("(") || value === ".") {
        line += value;
        return;
      }
      if (line.endsWith(".")) {
        line += value;
        return;
      }
      line += ` ${value}`;
    };

    tokens.forEach((token, index) => {
      const value = token.value;
      const upper = value.toUpperCase();
      const previous = tokens[index - 1];

      if (token.type === "comment") {
        pushLine();
        append(value);
        pushLine();
        return;
      }

      if (value === "(") {
        append(value);
        const next = tokens[index + 1];
        if (next && next.type === "keyword" && next.value === "SELECT") {
          indent += 1;
          pushLine();
        }
        return;
      }

      if (value === ")") {
        pushLine();
        indent = Math.max(indent - 1, 0);
        append(value);
        return;
      }

      if (value === ",") {
        append(value);
        const previousUpper = previous ? previous.value.toUpperCase() : "";
        if (!["COUNT", "SUM", "AVG", "MIN", "MAX", "IFNULL", "COALESCE"].includes(previousUpper)) {
          pushLine();
        }
        return;
      }

      if (value === ";") {
        append(value);
        pushLine();
        return;
      }

      if (CLAUSE_STARTERS.has(upper) || JOIN_WORDS.has(upper) || JOIN_STARTERS.has(upper)) {
        pushLine();
        if (upper === "AND" || upper === "OR" || upper === "ON") {
          append(upper);
        } else {
          append(upper);
        }
        return;
      }

      append(value);
    });

    pushLine();
    return lines.join("\n").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
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
      if (token.type === "symbol" && /[=<>!+\-*/%]/.test(token.value)) return wrap("tok-operator", token.value);

      if (token.type === "word") {
        const upper = token.value.toUpperCase();
        const next = findNextMeaningful(tokens, index + 1);
        if (SQL_KEYWORDS.has(upper)) {
          previousMeaningful = upper;
          nextIsAlias = upper === "AS";
          return wrap("tok-keyword", upper);
        }
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

  function findNextMeaningful(tokens, start) {
    for (let i = start; i < tokens.length; i += 1) {
      if (tokens[i].type !== "space") return tokens[i];
    }
    return null;
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

  async function copyFormattedSql() {
    if (!state.formattedSql) return;
    try {
      await navigator.clipboard.writeText(state.formattedSql);
    } catch (error) {
      const helper = document.createElement("textarea");
      helper.value = state.formattedSql;
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
    elements.copyToast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      elements.copyToast.classList.remove("show");
    }, 1400);
  }

  function renderExplain() {
    const raw = elements.explainInput.value.trim();
    if (!raw) {
      elements.explainSummary.textContent = "Waiting for input";
      elements.planVisual.innerHTML = "<div class=\"plan-empty\">EXPLAIN 결과가 여기에 시각화됩니다.</div>";
      renderExplainTable([]);
      return;
    }

    const parsed = parseExplain(raw);
    elements.explainSummary.textContent = `${parsed.rows.length} step${parsed.rows.length === 1 ? "" : "s"}`;
    renderPlan(parsed.rows);
    renderExplainTable(parsed.rows);
  }

  function parseExplain(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return { rows: [] };

    if (trimmed[0] === "{" || trimmed[0] === "[") {
      try {
        return { rows: parseExplainJson(JSON.parse(trimmed)) };
      } catch (error) {
        return { rows: [] };
      }
    }

    if (trimmed.includes("\t")) return { rows: parseDelimited(trimmed, "\t") };
    if (trimmed.includes("|")) return { rows: parsePipeTable(trimmed) };
    return { rows: parseDelimited(trimmed, /\s{2,}/) };
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
    if (delimiter instanceof RegExp) return line.split(delimiter);
    return line.split(delimiter);
  }

  function parsePipeTable(text) {
    const rows = text.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.includes("|") && !/^\+[-+]+\+$/.test(line));
    if (rows.length < 2) return [];
    const headers = rows[0].split("|").map(cleanCell).filter(Boolean).map(normalizeHeader);
    return rows.slice(1).map((line) => {
      const cells = line.split("|").map(cleanCell).filter((cell, index, arr) => {
        return !(index === 0 && cell === "") && !(index === arr.length - 1 && cell === "");
      });
      return headers.reduce((row, header, index) => {
        row[header] = cells[index] || "";
        return row;
      }, {});
    }).filter((row) => Object.values(row).some(Boolean));
  }

  function parseExplainJson(json) {
    const rows = [];
    const root = Array.isArray(json) ? json[0] : json;

    function visit(node, depth, label) {
      if (!node || typeof node !== "object") return;

      if (node.table) {
        rows.push({
          id: String(rows.length + 1),
          select_type: label || "JSON",
          table: node.table.table_name || node.table.name || "(derived)",
          type: node.table.access_type || "",
          key: node.table.key || "",
          rows: String(node.table.rows_examined_per_scan || node.table.rows_produced_per_join || ""),
          filtered: String(node.table.filtered || ""),
          extra: [
            node.table.attached_condition ? "attached condition" : "",
            node.table.using_index ? "using index" : "",
            node.table.using_temporary_table ? "using temporary" : "",
            node.table.using_filesort ? "using filesort" : ""
          ].filter(Boolean).join("; "),
          depth
        });
      }

      if (Array.isArray(node.nested_loop)) {
        node.nested_loop.forEach((child, index) => visit(child, depth + 1, `nested loop ${index + 1}`));
      }
      if (node.query_block) visit(node.query_block, depth, "query block");
      if (node.ordering_operation) visit(node.ordering_operation, depth, "ordering");
      if (node.grouping_operation) visit(node.grouping_operation, depth, "grouping");
      if (node.duplicates_removal) visit(node.duplicates_removal, depth, "duplicates removal");

      Object.keys(node).forEach((key) => {
        if (["table", "nested_loop", "query_block", "ordering_operation", "grouping_operation", "duplicates_removal"].includes(key)) return;
        if (node[key] && typeof node[key] === "object") visit(node[key], depth + 1, key);
      });
    }

    visit(root, 0, "query block");
    return rows;
  }

  function cleanCell(value) {
    return String(value).trim().replace(/^"|"$/g, "");
  }

  function normalizeHeader(header) {
    const key = cleanCell(header).toLowerCase().replace(/\s+/g, "_");
    const aliases = {
      possible_keys: "possible_keys",
      possible_key: "possible_keys",
      key_len: "key_len",
      selecttype: "select_type",
      select_type: "select_type",
      table_name: "table",
      rows_examined_per_scan: "rows"
    };
    return aliases[key] || key;
  }

  function renderPlan(rows) {
    if (!rows.length) {
      elements.planVisual.innerHTML = "<div class=\"plan-empty\">인식 가능한 EXPLAIN 행을 찾지 못했습니다.</div>";
      return;
    }

    const sorted = rows.slice().sort((a, b) => {
      const aId = Number(a.id || 0);
      const bId = Number(b.id || 0);
      return aId - bId;
    });

    elements.planVisual.innerHTML = sorted.map((row, index) => {
      const table = row.table || row.select_type || `step ${index + 1}`;
      const type = row.type || row.access_type || "scan";
      const key = row.key && row.key !== "NULL" ? row.key : "no key";
      const rowsCount = row.rows || row.rows_examined_per_scan || "?";
      const extra = row.extra || row.Extra || "";
      const risk = classifyPlan(row);
      return [
        "<article class=\"plan-step\">",
        `<span class=\"step-index\">${index + 1}</span>`,
        "<div>",
        `<p class=\"step-title\">${escapeHtml(table)} · ${escapeHtml(String(type).toUpperCase())}</p>`,
        `<p class=\"step-meta\">key: ${escapeHtml(key)} · rows: ${escapeHtml(rowsCount)}${extra ? ` · ${escapeHtml(extra)}` : ""}</p>`,
        "</div>",
        `<span class=\"risk-badge ${risk.className}\">${risk.label}</span>`,
        "</article>"
      ].join("");
    }).join("");
  }

  function classifyPlan(row) {
    const type = String(row.type || row.access_type || "").toLowerCase();
    const extra = String(row.extra || row.Extra || "").toLowerCase();
    const rows = Number(String(row.rows || "").replace(/,/g, ""));

    if (type === "all" || extra.includes("filesort") || extra.includes("temporary") || rows > 100000) {
      return { className: "danger", label: "Review" };
    }
    if (["index", "range"].includes(type) || rows > 10000) {
      return { className: "warn", label: "Watch" };
    }
    return { className: "", label: "Good" };
  }

  function renderExplainTable(rows) {
    const thead = elements.explainTable.querySelector("thead");
    const tbody = elements.explainTable.querySelector("tbody");
    if (!rows.length) {
      thead.innerHTML = "";
      tbody.innerHTML = "";
      return;
    }

    const preferred = ["id", "select_type", "table", "partitions", "type", "possible_keys", "key", "key_len", "ref", "rows", "filtered", "extra"];
    const allKeys = Array.from(rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set()));
    const headers = preferred.filter((key) => allKeys.includes(key)).concat(allKeys.filter((key) => !preferred.includes(key)));

    thead.innerHTML = `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;
    tbody.innerHTML = rows.map((row) => {
      return `<tr>${headers.map((header) => `<td>${escapeHtml(row[header] || "")}</td>`).join("")}</tr>`;
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", init);
}());
