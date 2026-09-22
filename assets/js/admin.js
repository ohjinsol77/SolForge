(async () => {
  const lang = document.documentElement.lang;
  const t = await fetch(`/assets/admin-${lang}.json`).then((response) => response.json());
  const $ = (id) => document.getElementById(id);
  let generation = 0;
  let menuEntries = [];
  let menuVisibility = {};
  const showLogin = () => {
    $("login").hidden = false;
    $("dashboard").hidden = true;
    $("logout").hidden = true;
  };
  const setView = (view) => {
    document.querySelectorAll("[data-admin-panel]").forEach((panel) => { panel.hidden = panel.id !== `${view}-view`; });
    document.querySelectorAll("[data-admin-view]").forEach((button) => {
      const active = button.dataset.adminView === view;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
  };
  const renderStats = (data) => {
    $("visitors").textContent = Number(data.summary.visitors).toLocaleString(lang);
    $("views").textContent = Number(data.summary.views).toLocaleString(lang);
    for (const key of ["daily", "pages", "referrers", "campaigns", "keywords", "clicks"]) {
      $(key).replaceChildren();
      const rows = data[key];
      if (!rows.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 3;
        cell.textContent = t.empty;
        row.append(cell);
        $(key).append(row);
      }
      for (const item of rows) {
        const row = document.createElement("tr");
        for (const value of [item.label || t.direct, item.views, item.visitors]) {
          const cell = document.createElement("td");
          cell.textContent = String(value);
          if (key === "daily" && row.children.length === 1) {
            const bar = document.createElement("progress");
            bar.max = Math.max(1, ...rows.map((entry) => entry.views));
            bar.value = item.views;
            bar.setAttribute("aria-label", t.views);
            cell.append(bar);
          }
          row.append(cell);
        }
        $(key).append(row);
      }
    }
  };
  const renderMenuSettings = () => {
    const target = $("menu-settings");
    target.replaceChildren();
    for (const entry of menuEntries) {
      const row = document.createElement("tr");
      const name = document.createElement("td");
      name.textContent = entry.kind === "tool" ? `${entry[lang]} · ${entry.category}` : entry[lang];
      const value = document.createElement("td");
      const select = document.createElement("select");
      select.dataset.menuKey = entry.key;
      select.setAttribute("aria-label", `${entry[lang]} ${t.menuVisibility}`);
      [["public", t.public], ["hidden", t.hidden], ["admin", t.adminOnly]].forEach(([optionValue, label]) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = label;
        select.append(option);
      });
      select.value = menuVisibility[entry.key] || "public";
      value.append(select);
      row.append(name, value);
      target.append(row);
    }
  };
  const load = async () => {
    const current = ++generation;
    $("status").textContent = "";
    try {
      const [statsResponse, menuResponse] = await Promise.all([
        fetch(`/admin/api/stats?days=${$("days").value}&site=${encodeURIComponent($("site").value)}`, { cache: "no-store" }),
        fetch("/admin/api/menu-settings", { cache: "no-store" })
      ]);
      if (current !== generation) return;
      if (statsResponse.status === 401 || menuResponse.status === 401) { showLogin(); return; }
      if (!statsResponse.ok || !menuResponse.ok) throw Error();
      const stats = await statsResponse.json();
      const menus = await menuResponse.json();
      menuEntries = menus.entries || [];
      menuVisibility = menus.visibility || {};
      renderStats(stats);
      renderMenuSettings();
      $("login").hidden = true;
      $("dashboard").hidden = false;
      $("logout").hidden = false;
      setView("stats");
    } catch {
      $("status").textContent = t.error;
    }
  };
  $("login").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.target.querySelector("button");
    button.disabled = true;
    try {
      const response = await fetch("/admin/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: $("password").value }) });
      $("password").value = "";
      if (!response.ok) { $("status").textContent = response.status === 429 ? t.limited : response.status === 401 ? t.invalid : t.error; return; }
      await load();
    } catch { $("status").textContent = t.error; } finally { button.disabled = false; }
  });
  $("change-password").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector("button");
    const status = $("password-status");
    if ($("new-password").value !== $("confirm-password").value) { status.textContent = t.passwordMismatch; return; }
    button.disabled = true;
    status.textContent = "";
    try {
      const response = await fetch("/admin/api/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: $("current-password").value, newPassword: $("new-password").value, confirmPassword: $("confirm-password").value }) });
      if (!response.ok) { if (response.status === 401 || response.status === 409) { generation++; form.reset(); showLogin(); $("status").textContent = t.signInAgain; } else status.textContent = response.status === 403 ? t.currentPasswordInvalid : response.status === 400 ? t.passwordHint : response.status === 429 ? t.limited : t.error; return; }
      generation++;
      form.reset();
      showLogin();
      $("status").textContent = t.passwordChanged;
      $("password").focus();
    } catch { status.textContent = t.error; } finally { button.disabled = false; }
  });
  $("save-menu-settings").addEventListener("click", async () => {
    const button = $("save-menu-settings");
    const status = $("menu-status");
    button.disabled = true;
    status.textContent = "";
    const settings = [...document.querySelectorAll("[data-menu-key]")].map((select) => ({ key: select.dataset.menuKey, visibility: select.value }));
    try {
      const response = await fetch("/admin/api/menu-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings }) });
      if (response.status === 401) { generation++; showLogin(); $("status").textContent = t.signInAgain; return; }
      if (!response.ok) throw Error();
      menuVisibility = (await response.json()).visibility || menuVisibility;
      status.textContent = t.menuSaved;
    } catch { status.textContent = t.menuSaveError; } finally { button.disabled = false; }
  });
  $("logout").onclick = async () => { try { const response = await fetch("/admin/api/logout", { method: "POST" }); if (!response.ok) throw Error(); generation++; showLogin(); } catch { $("status").textContent = t.error; } };
  document.querySelectorAll("[data-admin-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.adminView)));
  ["days", "site"].forEach((id) => $(id).addEventListener("change", load));
  $("refresh").onclick = load;
  await load();
})();
