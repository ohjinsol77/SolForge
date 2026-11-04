const GAMES = new Set(['cps-test', 'aim-trainer', 'reaction-test']);
const reply = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
export async function gameRankings(request, env) {
 const url = new URL(request.url);
 const game = url.searchParams.get('game');
 if (!GAMES.has(game)) return reply({error:'game'},400);
 if (!env.ANALYTICS_DB) return reply({error:'unavailable'},503);
 const db = env.ANALYTICS_DB, now = Date.now();
 try {
 if (request.method === 'GET') {
  const id = url.searchParams.get('result');
  if (id) {
   const result = await db.prepare('SELECT id,game,nickname,score,details,created FROM game_results WHERE id=? AND game=?').bind(id,game).first();
   return result ? reply({result:{...result,example:result.id.startsWith('example-v1-')}}) : reply({error:'missing'},404);
  }
  const order = game === 'reaction-test' ? 'ASC' : 'DESC';
  const rows = await db.prepare(`WITH best AS (SELECT id,nickname,score,created,ROW_NUMBER() OVER(PARTITION BY player ORDER BY score ${order},created ASC,id ASC) AS n FROM game_results WHERE game=? AND rules='v1' AND created>=?) SELECT id,nickname,score,created FROM best WHERE n=1 ORDER BY score ${order},created ASC,id ASC LIMIT 100`).bind(game,now-30*86400000).all();
  return reply({rows:rows.results.map(row=>({...row,example:row.id.startsWith('example-v1-')})), since:now-30*86400000});
 }
 if (request.method !== 'POST') return reply({error:'method'},405,{Allow:'GET, POST'});
 if (request.headers.get('origin') !== url.origin || !request.headers.get('content-type')?.startsWith('application/json')) return reply({error:'origin'},403);
 if (Number(request.headers.get('content-length')) > 8192) return reply({error:'size'},413);
 const raw = await request.text();
 if(raw.length>8192) return reply({error:'size'},413);
 const body=JSON.parse(raw);
 let player=request.headers.get('cookie')?.match(/(?:^|;\s*)sf_player=([a-f0-9-]{36})(?:;|$)/)?.[1];
 if (!player) player=crypto.randomUUID();
 if (body.action==='start') {
  if (env.ANALYTICS_LIMITER && !(await env.ANALYTICS_LIMITER.limit({key:`game:${request.headers.get('cf-connecting-ip') || player}`})).success) return reply({error:'rate'},429);
  const recent=await db.prepare('SELECT COUNT(*) AS n FROM game_sessions WHERE player=? AND started>?').bind(player,now-60000).first();
  if(recent.n>=12) return reply({error:'rate'},429);
  const id=crypto.randomUUID();
  await db.prepare('INSERT INTO game_sessions(id,player,game,started) VALUES(?,?,?,?)').bind(id,player,game,now).run();
  return reply({id},200,{'Set-Cookie':`sf_player=${player}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`});
 }
 const nickname=String(body.nickname||'').normalize('NFKC').trim();
 if(!/^[\p{L}\p{N}_ .-]{2,20}$/u.test(nickname)) return reply({error:'nickname'},400);
 const session=await db.prepare('SELECT * FROM game_sessions WHERE id=? AND player=? AND game=?').bind(body.session,player,game).first();
 const min=game==='cps-test'?10000:game==='aim-trainer'?20000:4500;
 if(!session || session.submitted || now-session.started<min || now-session.started>900000) return reply({error:'session'},400);
 const d=body.details||{}; let score;
 if(game==='cps-test') {
  if(!Number.isInteger(d.clicks)||d.clicks<0||d.clicks>300) return reply({error:'score'},400);
  score=d.clicks/10;
 } else if(game==='aim-trainer') {
  if(!Number.isInteger(d.hits)||!Number.isInteger(d.misses)||d.hits<0||d.hits>400||d.misses<0||d.misses>2000) return reply({error:'score'},400);
  score=Math.round(d.hits*d.hits/Math.max(1,d.hits+d.misses)*100)/100;
 } else {
  if(!Array.isArray(d.trials)||d.trials.length!==5||d.trials.some(v=>!Number.isInteger(v)||v<100||v>3000)) return reply({error:'score'},400);
  score=Math.round(d.trials.reduce((a,b)=>a+b,0)/5);
 }
 const id=crypto.randomUUID();
 // The conditional insert and consumed flag run in one D1 transaction; retries cannot duplicate a result.
 const result=await db.batch([
  db.prepare('INSERT INTO game_results(id,player,game,nickname,score,details,created) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM game_sessions WHERE id=? AND submitted=0)').bind(id,player,game,nickname,score,JSON.stringify(d),now,session.id),
  db.prepare('UPDATE game_sessions SET submitted=1 WHERE id=? AND submitted=0').bind(session.id)
 ]);
 if(!result[0].meta.changes) return reply({error:'session'},409);
 return reply({result:{id,game,nickname,score,created:now}});
 } catch(error) { console.error('game rankings',error); return reply({error:'unavailable'},503); }
}
export async function cleanupGames(env) {
 if(!env.ANALYTICS_DB) return;
 await env.ANALYTICS_DB.batch([
  env.ANALYTICS_DB.prepare('DELETE FROM game_sessions WHERE started < ?').bind(Date.now()-86400000),
  env.ANALYTICS_DB.prepare('DELETE FROM game_results WHERE created < ?').bind(Date.now()-365*86400000)
 ]);
}

export async function sharedGamePage(request, env) {
 const url = new URL(request.url);
 const match = url.pathname.match(/^\/(ko|en)\/tools\/(cps-test|aim-trainer|reaction-test)\/?$/);
 const id = url.searchParams.get('result');
 if (!match || !id || !env.ANALYTICS_DB) return null;
 try {
  const row = await env.ANALYTICS_DB.prepare('SELECT nickname,score FROM game_results WHERE id=? AND game=?').bind(id,match[2]).first();
  if (!row) return null;
  const en=match[1]==='en', unit=match[2]==='reaction-test'?'ms':match[2]==='cps-test'?'CPS':en?'points':'점';
  const prefix=id.startsWith('example-v1-')?(en?'Example result · ':'예시 기록 · '):'';
  const title=`${prefix}${row.nickname} · ${row.score} ${unit} | SolForge`;
  const description=en?'Challenge my score under the same rules and join the last 30 days leaderboard.':'동일한 규칙으로 내 기록에 도전하고 최근 30일 리더보드에 참여하세요.';
  const response=await env.ASSETS.fetch(request);
  const transformed=new HTMLRewriter()
   .on('title',{element(el){el.setInnerContent(title);}})
   .on('meta[property="og:title"]',{element(el){el.setAttribute('content',title);}})
   .on('meta[property="og:description"], meta[name="description"]',{element(el){el.setAttribute('content',`${title} — ${description}`);}})
   .on('meta[property="og:url"]',{element(el){el.setAttribute('content',url.href);}})
   .on('meta[name="robots"]',{element(el){el.setAttribute('content','noindex, follow');}})
   .transform(response);
  transformed.headers.set('Cache-Control','no-store');
  return transformed;
 } catch {return null;}
}
