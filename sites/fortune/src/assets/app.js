(() => {
  const grid = document.getElementById("fortune-grid");
  if (!grid) return;

  const translations = window.SF_SITE_TRANSLATIONS || {};
  const lang = window.SF_SITE_LOCALE === "en" ? "en" : "ko";
  const locale = lang === "en" ? "en-US" : "ko-KR";
  const signs = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];

  function t(key, values = {}) {
    let output = translations[key] || key;
    for (const [name, value] of Object.entries(values)) output = output.replace(`{${name}}`, value);
    return output;
  }

  const today = new Date();
  const daySeed = Number(`${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`);
  signs.forEach((sign, index) => {
    const themeIndex = (daySeed + index * 5 + today.getDay()) % 12;
    const element = document.getElementById(`fortune-${sign}`);
    if (element) element.textContent = t(`dynamic.theme.${themeIndex}`);
  });

  const date = document.getElementById("daily-date");
  if (date) {
    const formatted = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(today);
    date.textContent = t("dynamic.date", { date: formatted });
  }
})();
