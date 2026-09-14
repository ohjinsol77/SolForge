const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");

const root = path.resolve(__dirname, "..");
const base = process.env.SOLFORGE_TEST_URL || "http://localhost:4173";

async function openEditor(page, lang) {
  // Expose the real encoder only in the test response, never in shipped code.
  await page.route("**/assets/js/grand-koleos-touch-keyboard.js*", async (route) => {
    const source = fs.readFileSync(path.join(root, "assets/js/grand-koleos-touch-keyboard.js"), "utf8");
    await route.fulfill({ contentType: "application/javascript", body: source.replace("  initializePortSelector();", "  initializePortSelector(); window.testTouch = { prepareBoardConfig, pageStates, loadFirmwarePackage };") });
  });
  await page.route(/googlesyndication|doubleclick/, (route) => route.abort());
  await page.goto(`${base}/${lang}/tools/grand-koleos-touch-keyboard.html`);
  await expect(page.locator("#gkAssignmentList button")).toHaveCount(6);
}

for (const lang of ["ko", "en"]) {
  test(`${lang}: names, independent actions, volume constraints and settings encoding`, async ({ page }, info) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await openEditor(page, lang);
    await page.locator("#gkButtonName").fill(lang === "ko" ? "내비 실행" : "Navigation");
    await page.locator("#gkHoldMode").selectOption("1");
    await page.locator('[data-gk-key="Ctrl"]').click();
    await page.locator('[data-gk-key="A"]').click();
    await expect(page.locator("#gkActiveCombo")).toHaveText("Ctrl + A");
    await page.locator("#gkActionTarget").selectOption("tap");
    await expect(page.locator("#gkActiveCombo")).toHaveText("Win + H");
    await expect(page.locator('#gkHoldMode option[value="2"]')).toHaveJSProperty("disabled", true);
    // Button 2 gets volume repeat; changing the tap action invalidates repetition.
    await page.locator('[data-gk-button="1"]').click();
    await page.locator("#gkClearButton").click();
    await page.locator('[data-gk-key="Volume Up"]').click();
    await page.locator("#gkHoldMode").selectOption("2");
    const bytes = await page.evaluate(async () => Array.from((await window.testTouch.prepareBoardConfig(0x310000)).data));
    const config = Buffer.from(bytes);
    expect(config.length).toBe(45056);
    expect(config.readUInt16LE(4)).toBe(2);
    expect(config.readUInt32LE(1216)).toBe(0x31584B47);
    expect(config.readUInt32LE(1228)).toBe(lang === "en" ? 1 : 0);
    expect(config[1232]).toBe(1);
    expect(config[1233]).toBe(2);
    expect(config[1234]).toBe(0x80);
    expect(config[1235]).toBe(97);
    expect(config[1244]).toBe(2);
    expect(config[1232 + 17 * 12]).toBe(0);
    expect(config[16 + 2 * 400 + 40 + 5 * 60 + 59]).toBe(26);
    const checksum = (bytes) => {
      let hash = 0x811c9dc5;
      for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
      return hash;
    };
    expect(config.readUInt32LE(8)).toBe(checksum(config.subarray(16, 1216)));
    expect(config.readUInt32LE(1224)).toBe((checksum(config.subarray(0, 1216)) ^ checksum(config.subarray(1228, 42920))) >>> 0);
    const mask = config.subarray(1448, 1448 + 1536);
    expect([...mask].some((byte) => (byte >> 4) > 0 && (byte >> 4) < 15)).toBeTruthy();
    fs.writeFileSync(info.outputPath(`settings-${lang}.bin`), config);
    await page.locator('[data-gk-key="A"]').click();
    await expect(page.locator("#gkHoldMode")).toHaveValue("0");
    await page.locator('[data-gk-button="0"]').click();
    await expect(page.locator("#gkButtonName")).toHaveValue(lang === "ko" ? "내비 실행" : "Navigation");
    await page.locator("#gkActionTarget").selectOption("hold");
    await expect(page.locator("#gkActiveCombo")).toHaveText("Ctrl + A");
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#gkClearAll").click();
    await expect(page.locator("#gkButtonName")).toHaveValue("");
    await expect(page.locator("#gkHoldMode")).toHaveValue("0");
    await expect(page.locator("#gkActiveCombo")).toHaveText("Win + H");
    expect(errors).toEqual([]);
  });
}

test("gesture direction, cancellation, stationary footer and page boundaries", async ({ page }) => {
  await openEditor(page, "ko");
  const canvas = page.locator("#gkPreview");
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  const point = (x, y) => ({ x: box.x + x * box.width / 480, y: box.y + y * box.height / 272 });
  const drag = async (x1, y1, x2, y2) => {
    const a = point(x1, y1), b = point(x2, y2);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(220);
  };
  await drag(230, 50, 230, 140);
  await expect(page.locator("#gkActiveButton")).toContainText("1 페이지");
  await drag(230, 50, 330, 50); // first-page resistance
  await expect(page.locator("#gkActiveButton")).toContainText("1 페이지");
  await drag(230, 50, 120, 50);
  await expect(page.locator("#gkActiveButton")).toContainText("2 페이지");
  await expect(canvas).toHaveCSS("transform", "none");
  await drag(230, 240, 120, 240); // tabs never start a swipe
  await expect(page.locator("#gkActiveButton")).toContainText("2 페이지");
  const third = point(390, 242);
  await page.mouse.click(third.x, third.y);
  await page.waitForTimeout(220);
  await expect(page.locator("#gkActiveButton")).toContainText("3 페이지");
  await expect(page.locator('[data-gk-button="5"]')).toBeDisabled();
  await drag(230, 50, 120, 50);
  await expect(page.locator("#gkActiveButton")).toContainText("3 페이지");
});

test("mobile layout, long labels and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openEditor(page, "en");
  await page.locator("#gkButtonName").fill("Long custom name");
  await expect(page.locator("#gkButtonName")).toHaveValue("Long custom name");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.locator("#gkPreview").screenshot({ path: test.info().outputPath("preview.png") });
});

test("published firmware integrity and rejection of incompatible cached manifests", async ({ page }) => {
  await openEditor(page, "en");
  const packageInfo = await page.evaluate(async () => {
    const { manifest, files } = await window.testTouch.loadFirmwarePackage();
    return { version: manifest.interactionVersion, size: manifest.configSize, files: files.length };
  });
  expect(packageInfo).toEqual({ version: 1, size: 45056, files: 4 });
  await page.route("**/grand-koleos-touch-keyboard/manifest.json", (route) => route.fulfill({
    contentType: "application/json", body: JSON.stringify({ configSize: 4096, files: [] })
  }));
  const failure = await page.evaluate(async () => {
    try { await window.testTouch.loadFirmwarePackage(); return "accepted"; }
    catch (error) { return error.message; }
  });
  expect(failure).toContain("Firmware validation failed");
});
