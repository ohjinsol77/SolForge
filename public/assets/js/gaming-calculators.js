(function () {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  if (document.body.matches('[data-page="gaming-calculators"]')) {
    initWorkbench();
    initCalculators();
  }

  function initWorkbench() {
    const buttons = $$("[data-calc-target]");
    const panels = $$("[data-calc-panel]");
    const filters = $$("[data-calc-filter]");
    const search = $("#calcSearch");
    let category = "all";

    const activate = (id, updateHash = true) => {
      if (!document.getElementById(id)?.matches("[data-calc-panel]")) return;
      buttons.forEach((button) => button.classList.toggle("active", button.dataset.calcTarget === id));
      panels.forEach((panel) => {
        const active = panel.id === id;
        panel.hidden = !active;
        panel.classList.toggle("active", active);
      });
      if (updateHash) history.replaceState(null, "", `#${id}`);
    };

    const filter = () => {
      const query = normalize(search.value);
      let visible = 0;
      buttons.forEach((button) => {
        const inCategory = category === "all" || button.dataset.category === category;
        const haystack = normalize(`${button.textContent} ${button.dataset.keywords || ""}`);
        const found = !query || query.split(" ").every((term) => haystack.includes(term));
        button.hidden = !(inCategory && found);
        if (!button.hidden) visible += 1;
      });
      $("#calcEmpty").hidden = visible > 0;
    };

    buttons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.calcTarget)));
    filters.forEach((button) => button.addEventListener("click", () => {
      category = button.dataset.calcFilter || "all";
      filters.forEach((item) => item.classList.toggle("active", item === button));
      filter();
    }));
    search.addEventListener("input", filter);

    const initial = location.hash.slice(1);
    activate(document.getElementById(initial)?.matches("[data-calc-panel]") ? initial : "sensitivity-converter", false);
    window.addEventListener("hashchange", () => activate(location.hash.slice(1), false));
  }

  function initCalculators() {
    bind(["sensOldDpi", "sensOld", "sensNewDpi"], sensitivity);
    bind(["fovValue", "fovMode", "fovAspectW", "fovAspectH"], fov);
    bind(["ttkHealth", "ttkDamage", "ttkRpm", "ttkHead"], ttk);
    bind(["crossColor", "crossLength", "crossGap", "crossThick"], crosshair);
    bind(["circleDiameter"], minecraftCircle);
    bind(["aspectW", "aspectH", "aspectNewW"], aspectRatio);
    bind(["ppiW", "ppiH", "ppiInch"], ppi);
    bind(["screenInch", "screenAspectW", "screenAspectH"], screenSize);
    bind(["fileSize", "fileUnit", "bandwidth"], downloadTime);
    bind(["raidLevel", "raidDisks", "raidSize"], raid);
    bind(["ramMt", "ramCl"], ramLatency);
    $("#generateTags").addEventListener("click", gamertag);
    sensitivity();
    fov();
    ttk();
    crosshair();
    gamertag();
    minecraftCircle();
    aspectRatio();
    ppi();
    screenSize();
    downloadTime();
    raid();
    ramLatency();
  }

  function sensitivity() {
    const oldDpi = positive("#sensOldDpi");
    const oldSens = positive("#sensOld");
    const newDpi = positive("#sensNewDpi");
    const edpi = oldDpi * oldSens;
    const newSens = edpi / newDpi;
    $("#sensResult").innerHTML = resultBlock(`${format(newSens, 4)} 새 감도`, `${format(edpi, 2)} eDPI 유지`, [["기존", `${oldDpi} DPI × ${oldSens}`], ["새 DPI", newDpi]]);
  }

  function fov() {
    const value = clamp(positive("#fovValue"), 1, 179) * Math.PI / 180;
    const ratio = positive("#fovAspectW") / positive("#fovAspectH");
    let horizontal;
    let vertical;
    if ($("#fovMode").value === "h") {
      horizontal = value;
      vertical = 2 * Math.atan(Math.tan(value / 2) / ratio);
    } else {
      vertical = value;
      horizontal = 2 * Math.atan(Math.tan(value / 2) * ratio);
    }
    $("#fovResult").innerHTML = resultBlock(`${degrees(horizontal)}° 수평`, `${degrees(vertical)}° 수직`, [["종횡비", `${positive("#fovAspectW")}:${positive("#fovAspectH")}`]]);
  }

  function ttk() {
    const health = positive("#ttkHealth");
    const damage = positive("#ttkDamage");
    const rpm = positive("#ttkRpm");
    const head = positive("#ttkHead");
    const interval = 60 / rpm;
    const bodyShots = Math.ceil(health / damage);
    const headShots = Math.ceil(health / (damage * head));
    $("#ttkResult").innerHTML = resultBlock(`${format(Math.max(0, bodyShots - 1) * interval, 3)}초`, "몸샷 기준 TTK", [["필요 탄 수", bodyShots], ["헤드샷 TTK", `${format(Math.max(0, headShots - 1) * interval, 3)}초`], ["헤드 필요 탄 수", headShots]]);
  }

  function crosshair() {
    const canvas = $("#crosshairCanvas");
    const context = canvas.getContext("2d");
    const length = clamp(positive("#crossLength"), 2, 96);
    const gap = clamp(positive("#crossGap"), 0, 64);
    const thick = clamp(positive("#crossThick"), 1, 24);
    const center = canvas.width / 2;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#0f172a";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = $("#crossColor").value;
    context.fillRect(center - thick / 2, center - gap - length, thick, length);
    context.fillRect(center - thick / 2, center + gap, thick, length);
    context.fillRect(center - gap - length, center - thick / 2, length, thick);
    context.fillRect(center + gap, center - thick / 2, length, thick);
    context.beginPath();
    context.arc(center, center, Math.max(1, thick / 2), 0, Math.PI * 2);
    context.fill();
    $("#crosshairDownload").href = canvas.toDataURL("image/png");
  }

  function gamertag() {
    const words = {
      tech: ["Neon", "Circuit", "Pixel", "Quantum", "Vector", "Byte"],
      myth: ["Rune", "Titan", "Oracle", "Aegis", "Dragon", "Nova"],
      speed: ["Dash", "Turbo", "Blitz", "Rapid", "Flash", "Vortex"]
    };
    const tails = ["Forge", "Shift", "Core", "Strike", "Pulse", "Unit"];
    const selected = words[$("#tagTheme").value] || words.tech;
    const withNumber = $("#tagNumbers").checked;
    const names = Array.from({ length: 12 }, () => {
      const base = `${pick(selected)}${pick(tails)}`;
      return withNumber ? `${base}${Math.floor(10 + Math.random() * 990)}` : base;
    });
    $("#tagResult").innerHTML = `<div class="tag-cloud">${names.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}</div>`;
  }

  function minecraftCircle() {
    const diameter = Math.floor(clamp(positive("#circleDiameter"), 3, 61));
    const radius = (diameter - 1) / 2;
    const lines = [];
    for (let y = 0; y < diameter; y += 1) {
      let line = "";
      for (let x = 0; x < diameter; x += 1) {
        const distance = Math.hypot(x - radius, y - radius);
        line += Math.abs(distance - radius) < 0.55 ? "█" : "·";
      }
      lines.push(line);
    }
    $("#circleOutput").textContent = lines.join("\n");
  }

  function aspectRatio() {
    const width = positive("#aspectW");
    const height = positive("#aspectH");
    const newWidth = positive("#aspectNewW");
    const newHeight = newWidth * height / width;
    $("#aspectResult").innerHTML = resultBlock(`${Math.round(newWidth)} × ${Math.round(newHeight)}`, "비율 유지 크기", [["비율", simplify(width, height)], ["배율", `${format(newWidth / width, 2)}x`]]);
  }

  function ppi() {
    const width = positive("#ppiW");
    const height = positive("#ppiH");
    const inch = positive("#ppiInch");
    const diagonalPixels = Math.hypot(width, height);
    const value = diagonalPixels / inch;
    $("#ppiResult").innerHTML = resultBlock(`${format(value, 2)} PPI`, `${Math.round(diagonalPixels).toLocaleString("ko-KR")} 대각선 픽셀`, [["픽셀 피치", `${format(25.4 / value, 3)}mm`]]);
  }

  function screenSize() {
    const inch = positive("#screenInch");
    const ratioW = positive("#screenAspectW");
    const ratioH = positive("#screenAspectH");
    const diagonalCm = inch * 2.54;
    const factor = diagonalCm / Math.hypot(ratioW, ratioH);
    const width = ratioW * factor;
    const height = ratioH * factor;
    $("#screenResult").innerHTML = resultBlock(`${format(width, 1)}cm × ${format(height, 1)}cm`, `${format(diagonalCm, 1)}cm 대각선`, [["권장 거리", `${format(diagonalCm * 1.2, 0)}~${format(diagonalCm * 1.8, 0)}cm`]]);
  }

  function downloadTime() {
    const mb = positive("#fileSize") * Number($("#fileUnit").value);
    const mbps = positive("#bandwidth");
    const seconds = mb * 8 / mbps;
    $("#downloadResult").innerHTML = resultBlock(duration(seconds), `${format(mb, 1)} MB at ${format(mbps, 1)} Mbps`, [["초", format(seconds, 1)], ["실효 80% 가정", duration(seconds / 0.8)]]);
  }

  function raid() {
    const level = $("#raidLevel").value;
    const disks = Math.max(0, Math.floor(positive("#raidDisks")));
    const size = positive("#raidSize");
    const usable = {
      0: disks * size,
      1: size,
      5: Math.max(0, disks - 1) * size,
      6: Math.max(0, disks - 2) * size,
      10: Math.floor(disks / 2) * size
    }[level];
    const min = { 0: 2, 1: 2, 5: 3, 6: 4, 10: 4 }[level];
    $("#raidResult").innerHTML = resultBlock(disks < min ? "디스크 부족" : `${format(usable, 2)} TB`, `RAID ${level}`, [["최소 디스크", min], ["원시 용량", `${format(disks * size, 2)} TB`]]);
  }

  function ramLatency() {
    const mt = positive("#ramMt");
    const cl = positive("#ramCl");
    const ns = cl * 2000 / mt;
    $("#ramResult").innerHTML = resultBlock(`${format(ns, 2)} ns`, `CL${cl} / ${mt} MT/s`, [["실클럭", `${format(mt / 2, 0)} MHz`]]);
  }

  function bind(ids, fn) {
    ids.forEach((id) => document.getElementById(id).addEventListener("input", fn));
  }

  function positive(selector) {
    return Math.max(0.000001, Number($(selector).value) || 0.000001);
  }

  function resultBlock(title, subtitle, rows = []) {
    return [`<strong>${escapeHtml(title)}</strong>`, `<p>${escapeHtml(subtitle)}</p>`, `<dl>${rows.map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`].join("");
  }

  function duration(seconds) {
    const total = Math.max(0, Math.round(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rest = total % 60;
    return hours ? `${hours}시간 ${minutes}분 ${rest}초` : minutes ? `${minutes}분 ${rest}초` : `${rest}초`;
  }

  function simplify(a, b) {
    const gcd = (x, y) => y ? gcd(y, x % y) : x;
    const divisor = gcd(Math.round(a), Math.round(b));
    return `${Math.round(a) / divisor}:${Math.round(b) / divisor}`;
  }

  function degrees(radians) {
    return format(radians * 180 / Math.PI, 2);
  }

  function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function format(value, digits = 2) {
    return Number(value).toLocaleString("ko-KR", { maximumFractionDigits: digits });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalize(value) {
    return String(value || "").toLocaleLowerCase("ko").replace(/[·•._/\\-]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}());
