# SolForge 관리자 / Admin

주소 / URL: `https://solforge.cloud/admin/ko` (English: `/admin/en`).

관리자 API는 Worker에서 세션을 검증합니다. 페이지 주소를 숨기는 것에 의존하지 않습니다. 비밀번호 원문은 저장소·정적 빌드에 포함되지 않습니다. 초기 PBKDF2-SHA256 100,000회 해시를 `ADMIN_PASSWORD_HASH` Worker secret에 등록하고, 관리자 화면에서 변경한 비밀번호는 서버 D1에 해시로만 저장합니다. 익명 식별자 해싱용 `ANALYTICS_SALT`도 secret입니다. 초기 원문은 프로젝트 밖 사용자 홈 `.codex/private/solforge-admin-password.txt`에 생성됩니다. 이 파일을 안전하게 보관하세요.

The Worker checks every admin API session. A Worker secret initializes the salted PBKDF2 hash; subsequent password hashes are stored in server-only D1. Sessions use a random token in a Secure, HttpOnly, SameSite=Strict cookie and expire after 7 days. Only token hashes are stored. Password rotation invalidates existing sessions. Login is limited to 8 attempts per 15-minute IP bucket; raw IPs are not stored.

## Setup

1. `npm run build`
2. `npx wrangler d1 create solforge-analytics --location apac --binding ANALYTICS_DB --update-config` (once; preserve returned database ID in wrangler.jsonc).
3. `npx wrangler d1 migrations apply solforge-analytics --remote`
4. `node scripts/set-admin-password.cjs` (once).
5. `npx wrangler secret bulk <PRIVATE_DIRECTORY>/solforge-admin-secrets.json`
6. `npm run check`, `npx wrangler deploy`. Deploy all three Pages sites after the full build.

Never place password values in shell command arguments or paste them into source files. Secret files stay outside the project. For local development use an ignored `.dev.vars`, never a committed environment file.

## Password changes / 비밀번호 변경

관리자 로그인 → 비밀번호 변경 → 현재 비밀번호와 새 비밀번호(12~128자)를 입력합니다. 변경 후 모든 기기의 세션이 해제되며 새 비밀번호로 다시 로그인해야 합니다. 새 비밀번호 원문은 저장하지 않으며, 초기 비밀번호 파일도 자동 갱신하지 않습니다.

The initial Worker secret seeds the D1 admin credential once. Later changes store only salted PBKDF2 hashes in `admin_credentials`; the original secret never overrides a changed password. Password changes use a conditional update to prevent concurrent changes from overwriting each other. Existing session versions immediately become invalid.

The CLI credential helper is for initial setup only; it refuses `--rotate`. For recovery through an authenticated Cloudflare operator, update the Worker bootstrap hash securely and delete all `sessions` rows and the single `admin_credentials` row so the next admin request initializes it with the new bootstrap hash. Never print passwords or SQL containing password values. Keep `ANALYTICS_SALT` unchanged.

## Measurements / 집계 기준

- Anonymous browser visitor IDs in a 30-day first-party cookie, hashed on the server. Different browsers/devices or cleared cookies count separately. This is not an exact person count.
- Page views, known page paths, static menu links and identified buttons. Tool input, files, query strings, dynamic text and raw IPs are not stored.
- Referral table excludes navigation between SolForge sites. Referrer hostname only; no full referrer URL. Campaign and supplied search terms are capped at 120 characters. Hidden Google queries cannot be recovered. Search Console requires separate integration.
- Coupang iframe clicks, orders and revenue cannot be measured by this tracker.
- DNT/GPC respected. Ad blockers or disabled JavaScript may reduce counts. Events are not audited billing data; a public endpoint cannot prevent all fabricated traffic.
- KST calendar days, 7/30/90-day filters. Daily cleanup retains 90 days of events and removes expired sessions and login attempts.
- No historical visits before deployment. Empty states show no fabricated data.

Run `npm run build` for all deploys so localized privacy notices and the shared tracker are included. Generated `server/admin-copy.mjs` and `server/analytics-routes.mjs` contain only public translations and allowed paths.
