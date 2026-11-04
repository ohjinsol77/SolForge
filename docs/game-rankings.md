# Game rankings

The focused CPS, aim and reaction pages use `/api/game-rankings` and the existing `ANALYTICS_DB` D1 binding. Apply `0006_game_rankings.sql` before deploying the Worker. `npm run deploy` already builds, applies remote D1 migrations, and deploys in that order.

- CPS: 10 seconds, left pointer presses, clicks / 10; maximum accepted 30 CPS.
- Aim: 20 seconds, 320×240 CSS pixel arena, 42px target, identical deterministic target sequence; hits × accuracy (0–1), rounded to two decimals.
- Reaction: five trials, randomized 900–3500ms waits; average rounded to milliseconds. Early clicks or trials outside 100–3000ms cancel the attempt.
- Backgrounding, losing window focus, or resizing cancels an active attempt. The countdown uses elapsed monotonic time and rejects input after the deadline.
- Rankings show 100 best browser identities over a rolling 30-day window. Reaction sorts ascending; other games descending. Earlier submission wins ties. Identity uses an HTTP-only, Secure, SameSite cookie, not a unique nickname or account. Clearing cookies or using another device creates another identity.
- Public result links use opaque stored result IDs. The page and Open Graph preview show the saved nickname and computed score. Results remain available for one year; the daily cleanup removes older results and sessions older than a day.
- The server validates sessions, elapsed wall time, nickname, metric bounds and same-origin writes, recomputes the score and atomically consumes each session. Starts are rate limited. Client measurements cannot prove human input or eliminate hardware latency differences; this is a casual leaderboard, not an anti-cheat system.

Verification:

```sh
npm run build
npm run check
node --test tests/game-rankings.mjs
node tests/game-rankings-browser.cjs
```

The browser check uses mock API responses to verify bilingual rendering, language switching, fixed arena size, CPS completion and sharing. Server tests use an in-memory SQLite adapter to exercise real migration SQL and ranking queries. Production deployment is separate from pushing the source.

## Deployment verification

Apply the remote migration before publishing the Worker: `npm exec -- wrangler d1 migrations apply solforge-analytics --remote`. A source push or bare `wrangler deploy` does not apply D1 migrations. Run `npm run check:games:live` after deployment; `npm run deploy` now includes this real-service check. This verifies all three D1-backed leaderboard queries, rather than relying on browser mocks.

The tools are listed under `/ko/tools/challenge` and `/en/tools/challenge`; their existing tool/result URLs stay valid.

For a full local integration test, apply local migrations, start `npm exec -- wrangler dev --local --port 8787`, and run `node tests/game-rankings-integration.cjs`. It writes only to local D1 and covers timed play, nickname submission, stored scores, rankings, result pages and Open Graph metadata. Run `node tests/navigation-layout.cjs` to verify both languages, three skins and four viewport sizes.

## Initial records and nickname generation

`scripts/game-example-records.mjs` maintains 13 initial records per game (39 total). Nicknames are independently generated per game from the same shared name parts as Fun Name Generator, with unique player identities and no cross-game nickname overlap. Display dates are distributed independently over the past 28.5 days. These are synthetic initial records; internal IDs and source metadata remain available for operations, without badges or prefixes on the public leaderboard and shared page.

`assets/js/fun-names.mjs` is shared by Fun Name Generator and the challenge nickname default. A saved nickname takes precedence; otherwise a random localized name is prefilled and can be edited.

Prepare updates with `node scripts/game-example-records.mjs --sql test-results/game-examples.sql`, then explicitly apply the file to D1. Guarded upserts update only the reserved initial record set, preserve genuine submissions and keep existing result links valid. No build or deploy automatically refreshes these records.

To remove this initial set: `DELETE FROM game_results WHERE id LIKE 'example-v1-%' AND player LIKE 'example-v1-player-%' AND json_extract(details, '$.source') = 'fictional-example-v1';`
