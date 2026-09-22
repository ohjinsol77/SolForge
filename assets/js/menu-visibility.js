(function () {
  "use strict";

  const fallback = { admin: false, visibility: {} };
  const request = fetch("/api/menu-config", { credentials: "same-origin", cache: "no-store" })
    .then((response) => response.ok ? response.json() : fallback)
    .catch(() => fallback);

  window.SF_MENU_CONFIG_PROMISE = request;
  window.sfMenuKey = (kind, value) => `${kind}:${String(value || "").replace(/^\.\.\//, "")}`;
  window.sfMenuVisible = (key, config = fallback) => {
    const mode = config.visibility?.[key] || "public";
    return mode === "public" || (mode === "admin" && config.admin === true);
  };
}());
