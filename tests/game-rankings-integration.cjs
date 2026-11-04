// Run against a local `wrangler dev` with migrated D1, without API mocks.
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
(async () => {
 const base = process.env.SOLFORGE_TEST_URL || 'http://localhost:8787';
 if (!/^http:\/\/(?:localhost|127\.0\.0\.1):/.test(base)) throw Error('Use a local Worker to avoid writing automated results into production.');
 const browser = await chromium.launch({ headless: true });
 try {
  const page = await browser.newPage();
  await page.route(/googlesyndication|doubleclick/, r => r.abort());
  for (const game of ['cps-test', 'aim-trainer', 'reaction-test']) {
   await page.goto(`${base}/en/tools/${game}`, { waitUntil: 'domcontentloaded' });
   await page.getByRole('button', { name: 'Start challenge', exact: true }).click();
   if (game === 'cps-test') {
    await page.getByRole('button', { name: 'Left click', exact: true }).click({ clickCount: 5 });
   } else if (game === 'aim-trainer') {
    for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Target', exact: true }).click();
   } else {
    for (let i = 0; i < 5; i++) {
     const target = page.getByRole('button', { name: 'Click now!', exact: true });
     await target.waitFor();
     await page.waitForTimeout(170);
     await target.click();
    }
   }
   await page.locator('#rankNickname').waitFor({ state: 'visible', timeout: 25000 });
   await page.locator('#rankNickname').fill(`Local ${game}`);
   const submitted = page.waitForResponse(r => r.url().includes('/api/game-rankings') && r.request().method() === 'POST');
   await page.getByRole('button', { name: 'Submit ranking and create share link', exact: true }).click();
   const response = await submitted;
   assert.equal(response.status(), 200);
   const { result } = await response.json();
   assert.equal(result.game, game);
   assert.ok(Number.isFinite(result.score));
   await page.getByRole('button', { name: 'Copy link', exact: true }).waitFor();
   const shared = new URL(`${base}/en/tools/${game}`); shared.searchParams.set('result', result.id);
   const preview = await page.request.get(shared.href);
   assert.equal(preview.status(), 200);
   const html = await preview.text();
   assert.ok(html.includes(`Local ${game} · ${result.score}`));
   await page.goto(shared.href, { waitUntil: 'domcontentloaded' });
   await page.getByText(`Local ${game} ·`, { exact: false }).waitFor();
   const board = await page.request.get(`${base}/api/game-rankings?game=${game}`);
   assert.ok((await board.json()).rows.some(row => row.id === result.id));
   console.log(`PASS actual Worker + D1: ${game}, submit, stored score, leaderboard, shared page + OG metadata`);
  }
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
