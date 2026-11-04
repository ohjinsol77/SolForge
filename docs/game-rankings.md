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
