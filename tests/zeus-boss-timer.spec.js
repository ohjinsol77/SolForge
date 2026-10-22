const fs = require("fs");
const path = require("path");
const http = require("http");
const { test, expect } = require("@playwright/test");

const root = path.resolve(__dirname, "..", "dist");
let server;
let baseUrl;

test.beforeAll(async () => {
  const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml" };
  server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(`${root}${path.sep}`)) { response.writeHead(404).end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { response.writeHead(404).end(); return; }
      response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Content-Security-Policy": "default-src 'self' 'unsafe-inline' data: blob:; connect-src 'self'; frame-src 'none'" });
      response.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => { if (server) await new Promise((resolve) => server.close(resolve)); });
test.beforeEach(async ({ page }) => {
  // External ad scripts are blocked by the test server's CSP.
  await page.addInitScript(() => { window.PartnersCoupang = { G: class {} }; });
});

for (const lang of ["ko", "en"]) {
  test(`${lang}: images, timers, PIP selection and persistence`, async ({ page, context }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // Exercise the fallback used by browsers without Document PIP.
    await page.addInitScript(() => Object.defineProperty(window, "documentPictureInPicture", { value: null }));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${baseUrl}/${lang}/tools/zeus-boss-timer.html`);
    const cards = page.locator(".zeus-boss-tile");
    await expect(cards).toHaveCount(18);
    await expect.poll(() => cards.locator("img").evaluateAll((images) => images.filter((image) => image.complete && image.naturalWidth > 0).length)).toBe(18);
    expect(await cards.locator("img").evaluateAll((images) => images.every((image) => new URL(image.src).pathname.startsWith("/assets/img/zeus/bosses/")))).toBe(true);
    await expect(cards.locator("[data-next-time]")).toHaveCount(18);
    await expect(cards.locator("[data-countdown]")).toHaveCount(18);
    await expect(cards.locator("summary")).toHaveCount(18);
    expect(await page.locator(".zeus-pip-settings").evaluate((element) => element.getBoundingClientRect().top < document.querySelector("#zeusBossDirectory").getBoundingClientRect().top)).toBe(true);
    await page.locator(".zeus-pip-settings").evaluate((element) => element.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: test.info().outputPath("desktop.png") });

    await page.locator('[data-pip-select="none"]').click();
    await expect(page.locator("#openZeusPip")).toBeDisabled();
    await page.locator('[data-pip-boss="argos"]').check();
    await page.locator('[data-pip-boss="sealed-bdeles"]').check();
    const manual = page.locator('[data-zeus-boss-id="sealed-bdeles"]');
    await manual.locator("summary").click();
    await manual.locator('[name="hours"]').fill("19");
    await manual.locator('[name="minutes"]').fill("8");
    await manual.locator('[type="submit"]').click();
    await expect(manual.locator("[data-countdown]")).toHaveText(/^19:0[78]:\d{2}$/);
    await expect(manual.locator("[data-next-time]")).not.toContainText(lang === "ko" ? "입력하세요" : "Enter");

    const popupPromise = context.waitForEvent("page");
    await page.locator("#openZeusPip").click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    await expect(popup.locator("#pipZeusList article")).toHaveCount(2);
    await expect.poll(() => popup.locator("img").evaluateAll((images) => images.filter((image) => image.naturalWidth > 0).length)).toBe(2);
    await expect(popup.locator('[data-pip-id="sealed-bdeles"] [data-pip-countdown]')).toHaveText(/^19:0[78]:\d{2}$/);
    await page.locator('[data-pip-boss="trason"]').check();
    await expect(popup.locator("#pipZeusList article")).toHaveCount(3);
    await expect(popup.locator('[data-pip-id="trason"] [data-pip-countdown]')).toHaveText(lang === "ko" ? "시간 미설정" : "Time not set");

    // A time edit updates the already-open window without reopening PIP.
    await manual.locator('[name="mode"]').selectOption("datetime");
    const future = new Date(Date.now() + 5 * 3600000 + 9 * 3600000).toISOString().slice(0, 16);
    await manual.locator('[name="target"]').fill(future);
    await manual.locator('[type="submit"]').click();
    await expect(popup.locator('[data-pip-id="sealed-bdeles"] [data-pip-countdown]')).toHaveText(/^04:59:\d{2}$/);
    await popup.close();
    await page.reload();
    await expect(page.locator('[data-pip-boss="argos"]')).toBeChecked();
    await expect(page.locator('[data-pip-boss="arachne"]')).not.toBeChecked();
    await expect(manual.locator("[data-countdown]")).toHaveText(/^04:59:\d{2}$/);
    await page.locator(".zeus-pip-settings").evaluate((element) => element.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: test.info().outputPath("desktop.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await cards.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath("mobile.png") });
    expect(errors).toEqual([]);
  });
}

test("native Document PIP opens and shows selected boss images", async ({ page, context }) => {
  await page.goto(`${baseUrl}/ko/tools/zeus-boss-timer.html`);
  await page.locator('[data-pip-select="none"]').click();
  await page.locator('[data-pip-boss="arachne"]').check();
  await page.locator("#openZeusPip").click();
  await expect.poll(() => page.evaluate(() => window.documentPictureInPicture.window?.document.querySelectorAll("[data-pip-id]").length)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.documentPictureInPicture.window.document.querySelector("img").naturalWidth)).toBeGreaterThan(0);
  await page.evaluate(() => window.documentPictureInPicture.window.close());
});

test("site and open PIP reorder by remaining time and keep unset timers last", async ({ page, context }) => {
  await page.clock.install({ time: new Date("2026-10-22T11:30:00+09:00") });
  await page.addInitScript(() => {
    Object.defineProperty(window, "documentPictureInPicture", { value: null });
    const key = "solforge:zeus-boss-timer:v1";
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, JSON.stringify({ beep: false }));
    const timers = {};
    for (const [id, minutes] of [["iocanthos", -1], ["krisopagos", 15], ["trason", 15], ["amorphos", 60]]) {
      timers[id] = { mode: "remaining", target: new Date(Date.now() + minutes * 60000).toISOString() };
    }
    localStorage.setItem(`${key}:timers`, JSON.stringify(timers));
  });
  await page.goto(`${baseUrl}/ko/tools/zeus-boss-timer.html`);
  const siteOrder = () => page.locator("[data-zeus-boss-id]").evaluateAll((cards) => cards.map((card) => card.dataset.zeusBossId));
  const unset = ["kinyrauri", "alastor", "vedix", "gortis", "triphos", "giants-third-hand", "sealed-amorphos", "sealed-bdeles"];
  expect((await siteOrder()).slice(0, 4)).toEqual(["iocanthos", "krisopagos", "trason", "amorphos"]);
  expect((await siteOrder()).slice(-8)).toEqual(unset);
  const popupPromise = context.waitForEvent("page");
  await page.locator("#openZeusPip").click();
  const popup = await popupPromise;
  const pipOrder = () => popup.locator("[data-pip-id]").evaluateAll((cards) => cards.map((card) => card.dataset.pipId));
  await expect(popup.locator("[data-pip-id]")).toHaveCount(20);
  expect((await pipOrder()).slice(0, 5)).toEqual(["iocanthos", "krisopagos", "trason", "rift-12", "amorphos"]);
  expect((await pipOrder()).slice(-8)).toEqual(unset);

  const manual = page.locator('[data-zeus-boss-id="sealed-bdeles"]');
  await manual.locator("summary").click();
  await manual.locator('[name="minutes"]').fill("5");
  await manual.locator('[type="submit"]').click();
  expect((await siteOrder()).slice(0, 3)).toEqual(["iocanthos", "sealed-bdeles", "krisopagos"]);
  expect((await pipOrder()).slice(0, 3)).toEqual(["iocanthos", "sealed-bdeles", "krisopagos"]);
  await expect(manual.locator("details")).toHaveAttribute("open", "");

  // Clearing a timer immediately moves it back behind every configured timer.
  await manual.locator("[data-reset-timer]").click();
  expect((await siteOrder()).slice(-8)).toEqual(unset);
  expect((await pipOrder()).slice(-8)).toEqual(unset);
  await page.reload();
  expect((await siteOrder()).slice(0, 4)).toEqual(["iocanthos", "krisopagos", "trason", "amorphos"]);
  expect((await siteOrder()).slice(-8)).toEqual(unset);
});
