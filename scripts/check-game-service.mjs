// Exercise the actual deployed D1-backed API; browser mocks cannot detect missing migrations.
const origin = process.env.SOLFORGE_TEST_URL || 'https://solforge.cloud';
for (const game of ['cps-test', 'aim-trainer', 'reaction-test']) {
 const response = await fetch(`${origin}/api/game-rankings?game=${game}`, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
 const payload = await response.json();
 if (!response.ok || !Array.isArray(payload.rows)) throw new Error(`${game}: ranking API returned ${response.status}. Check the ANALYTICS_DB binding and apply D1 migrations before deploying.`);
 console.log(`PASS ${game}: live ranking API (${payload.rows.length} rows)`);
}
