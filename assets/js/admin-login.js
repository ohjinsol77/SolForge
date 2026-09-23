(async () => {
  const lang = document.documentElement.lang === "en" ? "en" : "ko";
  const t = await fetch(`/assets/admin-${lang}.json`).then((response) => response.json());
  const form = document.getElementById("login");
  const password = document.getElementById("password");
  const status = document.getElementById("status");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    status.textContent = "";
    try {
      const response = await fetch("/admin/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: password.value }) });
      password.value = "";
      if (!response.ok) { status.textContent = response.status === 429 ? t.limited : response.status === 401 ? t.invalid : t.error; return; }
      window.location.assign(`/admin/${lang}`);
    } catch { status.textContent = t.error; } finally { button.disabled = false; }
  });
})();
