const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..");
const BASE_URL = process.env.SOLFORGE_TEST_URL || "http://localhost:4173";

function focusedToolFiles(lang) {
  const directory = path.join(ROOT, "dist", lang, "tools");
  return fs.readdirSync(directory)
    .filter((file) => file.endsWith(".html"))
    .filter((file) => /<body\b[^>]*\bdata-page-tool="/i.test(fs.readFileSync(path.join(directory, file), "utf8")))
    .sort();
}

function listenForRuntimeErrors(page, current) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`${current.slug}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/adsbygoogle|ERR_BLOCKED_BY_CLIENT|Failed to load resource/i.test(text)) return;
    errors.push(`${current.slug}: ${text}`);
  });
  return errors;
}

test.describe.configure({ mode: "parallel" });

for (const lang of ["ko", "en"]) {
  test(`all focused ${lang} tools initialize without runtime errors`, async ({ page }) => {
    test.setTimeout(240000);
    const current = { slug: "" };
    const errors = listenForRuntimeErrors(page, current);
    await page.route(/pagead2\.googlesyndication\.com|googleads\.g\.doubleclick\.net/, (route) => route.abort());
    const files = focusedToolFiles(lang);
    expect(files).toHaveLength(136);
    for (const file of files) {
      current.slug = `${lang}/${file}`;
      const response = await page.goto(`${BASE_URL}/${lang}/tools/${file}`, { waitUntil: "domcontentloaded" });
      expect(response?.status(), current.slug).toBe(200);
      const body = page.locator("body");
      expect(await body.getAttribute("data-page-tool"), current.slug).toBe(file.replace(/\.html$/, ""));
      expect(await body.getAttribute("data-page"), current.slug).toBeTruthy();
      expect(await page.locator("#tool-workspace").count(), current.slug).toBe(1);

      await page.locator("#tool-workspace input:not([type=file]), #tool-workspace select, #tool-workspace textarea").evaluateAll((controls) => {
        controls.forEach((control) => {
          if (control instanceof HTMLInputElement && control.type === "checkbox") control.checked = !control.checked;
          else if (control instanceof HTMLSelectElement && control.options.length > 1) control.selectedIndex = (control.selectedIndex + 1) % control.options.length;
          else if (control instanceof HTMLInputElement && control.type === "number") {
            const step = Number(control.step) || 1;
            const max = control.max === "" ? Infinity : Number(control.max);
            const next = (Number(control.value) || 0) + step;
            control.value = String(Math.min(max, next));
          } else if (control instanceof HTMLInputElement && !["date", "datetime-local", "month", "time", "color", "range"].includes(control.type)) {
            control.value = `${control.value || ""}x`;
          } else if (control instanceof HTMLTextAreaElement) {
            control.value = `${control.value || ""}x`;
          }
          control.dispatchEvent(new Event("input", { bubbles: true }));
          control.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });
      await page.waitForTimeout(15);
    }

    expect(errors, errors.join("\n")).toEqual([]);
  });
}

const standaloneToolRoutes = [
  "tempdb.html",
  "tools/mysql-query-prettier.html",
  "tools/mysql-explain-visual.html",
  "tools/npm-package-info.html",
  "tools/world-holidays.html",
  "tools/exchange-rates.html",
  "tools/korea-stocks.html",
  "tools/global-stocks.html",
  "tools/crypto-sentiment.html",
  "tools/mapleland-boss-timer.html"
];

test("all standalone tools load in Korean and English without runtime errors", async ({ page }) => {
  test.setTimeout(60000);
  const current = { slug: "" };
  const errors = listenForRuntimeErrors(page, current);
  await page.route(/pagead2\.googlesyndication\.com|googleads\.g\.doubleclick\.net/, (route) => route.abort());

  for (const lang of ["ko", "en"]) {
    for (const route of standaloneToolRoutes) {
      current.slug = `${lang}/${route}`;
      const response = await page.goto(`${BASE_URL}/${lang}/${route}`, { waitUntil: "domcontentloaded" });
      expect(response?.status(), current.slug).toBe(200);
      expect(await page.locator("main").count(), current.slug).toBe(1);
      await page.waitForTimeout(50);
    }
  }

  expect(errors, errors.join("\n")).toEqual([]);
});

test("representative tool actions and RAM verification complete", async ({ page }) => {
  test.setTimeout(30000);
  const current = { slug: "representative actions" };
  const errors = listenForRuntimeErrors(page, current);

  await page.goto(`${BASE_URL}/ko/tools/text-counter.html`);
  await page.locator("#textCounterInput").fill("abc 한글");
  await expect(page.locator("#textCounterStats")).toContainText("공백 포함");
  await expect(page.locator("#textCounterStats")).toContainText("6");

  await page.goto(`${BASE_URL}/ko/tools/age-calculator.html`);
  await expect(page.locator("#lifeAgeResult")).not.toBeEmpty();

  await page.goto(`${BASE_URL}/ko/tools/time-tool.html`);
  await expect(page.locator("#timeDiffResult")).not.toBeEmpty();

  await page.goto(`${BASE_URL}/ko/tools/ram-latency.html`);
  await expect(page.locator("#ramResult")).not.toBeEmpty();

  await page.goto(`${BASE_URL}/ko/tools/memory-test.html`);
  await page.locator("#startMemory").click();
  await expect(page.locator("#memoryStatus")).toContainText("단계");

  await page.goto(`${BASE_URL}/ko/tools/pip-clock.html`);
  await expect(page.locator("#pipClockTime")).not.toHaveText("--:--:--");

  await page.goto(`${BASE_URL}/ko/tools/dead-pixel.html`);
  const pixelAlpha = await page.locator("#deadPixelCanvas").evaluate((canvas) => canvas.getContext("2d").getImageData(0, 0, 1, 1).data[3]);
  expect(pixelAlpha).toBe(255);

  await page.goto(`${BASE_URL}/ko/tools/code-tool.html`);
  const codeCopyButton = page.locator('[data-advanced-copy="codeOutput"]');
  const codeResultHeader = codeCopyButton.locator("xpath=..");
  await expect(codeCopyButton).toBeVisible();
  expect(await codeCopyButton.evaluate((button) => getComputedStyle(button).position)).toBe("static");
  const [copyBox, headerBox] = await Promise.all([codeCopyButton.boundingBox(), codeResultHeader.boundingBox()]);
  expect(copyBox).not.toBeNull();
  expect(headerBox).not.toBeNull();
  expect(copyBox.x).toBeGreaterThanOrEqual(headerBox.x);
  expect(copyBox.x + copyBox.width).toBeLessThanOrEqual(headerBox.x + headerBox.width + 1);
  expect(copyBox.y).toBeGreaterThanOrEqual(headerBox.y);
  expect(copyBox.y + copyBox.height).toBeLessThanOrEqual(headerBox.y + headerBox.height + 1);

  await page.goto(`${BASE_URL}/ko/tools/ram-test.html`);
  await page.locator("#ramTestSize").fill("4");
  await page.locator("#runRamTest").click();
  await expect(page.locator("#ramProgress header strong")).toHaveText("100%", { timeout: 10000 });
  await expect(page.locator("#ramTestStats")).toContainText("검증 오류");
  await expect(page.locator("#ramTestStats")).toContainText("0");
  await expect(page.locator("#runRamTest")).toBeEnabled();

  await page.route("**/api/yahoo-chart**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      chart: {
        error: null,
        result: [{
          meta: {
            symbol: "AAPL",
            shortName: "Apple Inc.",
            currency: "USD",
            fullExchangeName: "NasdaqGS",
            regularMarketPrice: 225.5,
            previousClose: 223.1,
            regularMarketDayHigh: 226.2,
            regularMarketDayLow: 222.8,
            regularMarketVolume: 45000000
          },
          timestamp: [1785600000, 1785686400],
          indicators: {
            quote: [{
              open: [222, 224],
              high: [224, 226.2],
              low: [221, 222.8],
              close: [223.1, 225.5],
              volume: [41000000, 45000000]
            }]
          }
        }]
      }
    })
  }));
  await page.goto(`${BASE_URL}/ko/tools/global-stocks.html`);
  await expect(page.locator("#stockName")).toHaveText("Apple Inc.");
  await expect(page.locator("#stockPrice")).toContainText("225.50");

  expect(errors, errors.join("\n")).toEqual([]);
});

test("gamertag modes enforce English formats and Korean length limits", async ({ page }) => {
  await page.goto(`${BASE_URL}/ko/tools/gamertag-generator.html`);

  await expect(page.locator("#tagMinLength")).not.toBeVisible();
  await page.locator("#tagMode").selectOption("korean");
  await expect(page.locator("#tagMinLength")).toBeVisible();
  await expect(page.locator("#tagFormat")).not.toBeVisible();
  await page.locator("#tagMinLength").fill("2");
  await page.locator("#tagMaxLength").fill("2");
  await page.locator("#tagCount").selectOption("36");
  await page.locator("#tagNumbers").uncheck();
  await page.locator("#generateTags").click();

  let names = await page.locator("#tagResult .tag-cloud span").allTextContents();
  expect(names).toHaveLength(36);
  expect(names.every((name) => Array.from(name).length === 2 && /^[가-힣]+$/.test(name))).toBe(true);

  await page.locator("#tagMinLength").fill("10");
  await page.locator("#tagMaxLength").fill("10");
  await page.locator("#tagNumbers").check();
  await page.locator("#generateTags").click();
  names = await page.locator("#tagResult .tag-cloud span").allTextContents();
  expect(names.every((name) => Array.from(name).length === 10 && /^[가-힣]+[0-9]+$/.test(name))).toBe(true);

  await page.locator("#tagMode").selectOption("english");
  await expect(page.locator("#tagFormat")).toBeVisible();
  await page.locator("#tagFormat").selectOption("kebab");
  await page.locator("#tagCount").selectOption("24");
  await page.locator("#tagNumbers").uncheck();
  await page.locator("#generateTags").click();
  names = await page.locator("#tagResult .tag-cloud span").allTextContents();
  expect(names).toHaveLength(24);
  expect(names.every((name) => /^[a-z]+-[a-z]+$/.test(name))).toBe(true);

  await page.goto(`${BASE_URL}/en/tools/gamertag-generator.html`);
  await expect(page.getByRole("heading", { level: 1, name: "Gamertag & Korean ID Generator", exact: true })).toBeVisible();
});
