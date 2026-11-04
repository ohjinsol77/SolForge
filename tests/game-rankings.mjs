import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { gameRankings } from '../server/game-rankings.mjs';

function setup() {
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../migrations/0006_game_rankings.sql',import.meta.url),'utf8'));
 const prepare=(query)=>{let args=[];const obj={bind(...values){args=values;return obj;},async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){return {meta:{changes:sql.prepare(query).run(...args).changes}};}};return obj;};
 const env={ANALYTICS_DB:{prepare,async batch(statements){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}}};
 let cookie='';
 const request=async(game,body,query='')=>{
  const res=await gameRankings(new Request(`https://solforge.cloud/api/game-rankings?game=${game}${query}`,body?{method:'POST',headers:{Origin:'https://solforge.cloud','Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)}:{}),env);
  if(res.headers.has('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];return res;
 };
 return {sql,request,env};
}
test('all games compute scores on server, reject early/duplicate submissions, and resolve shared IDs',async()=>{
 for(const [game,details,score,elapsed] of [['cps-test',{clicks:72},7.2,10001],['aim-trainer',{hits:40,misses:10},32,20001],['reaction-test',{trials:[200,210,220,230,240]},220,5000]]) {
  const {sql,request}=setup();const session=(await (await request(game,{action:'start'})).json()).id;
  const body={session,nickname:'테스터',details,score:999999};
  assert.equal((await request(game,body)).status,400);
  sql.prepare('UPDATE game_sessions SET started=? WHERE id=?').run(Date.now()-elapsed,session);
  assert.equal((await request(game,{...body,nickname:'<script>'})).status,400);
  const res=await request(game,body);assert.equal(res.status,200);const {result}=await res.json();assert.equal(result.score,score);
  assert.equal((await request(game,body)).status,400);
  assert.equal((await (await request(game,null,`&result=${result.id}`)).json()).result.nickname,'테스터');
  assert.equal((await (await request(game)).json()).rows.length,1);
 }
});
test('30 day window, one best per player, score direction and deterministic ties',async()=>{
 const {sql,request}=setup();const now=Date.now();
 const insert=sql.prepare('INSERT INTO game_results(id,player,game,nickname,score,details,created) VALUES(?,?,?,?,?,?,?)');
 for(const game of ['cps-test','reaction-test']) {
  for(const [id,player,score,date] of [['old','old',100,now-31*86400000],['a','one',200,now-1000],['b','one',250,now-500],['c','two',250,now-900]])insert.run(game+id,player,game,player,score,'{}',date);
  const {rows}=await (await request(game)).json();assert.equal(rows.length,2);
  assert.deepEqual(rows.map(r=>r.id),game==='cps-test'?[game+'c',game+'b']:[game+'a',game+'c']);
 }
});
test('invalid games, cross-origin writes and out-of-range scores are rejected',async()=>{
 const {sql,request,env}=setup();assert.equal((await request('unknown')).status,400);
 const game='reaction-test',session=(await (await request(game,{action:'start'})).json()).id;
 sql.prepare('UPDATE game_sessions SET started=?').run(Date.now()-5000);
 assert.equal((await request(game,{session,nickname:'Valid',details:{trials:[1,2,3,4,5]}})).status,400);
 assert.equal((await gameRankings(new Request('https://solforge.cloud/api/game-rankings?game=cps-test',{method:'POST',headers:{Origin:'https://other.test','Content-Type':'application/json'},body:'{}'}),env)).status,403);
});
test('zero scores can be shared without invalid numeric values',async()=>{
 for(const [game,details,elapsed] of [['cps-test',{clicks:0},10001],['aim-trainer',{hits:0,misses:0},20001]]) {
  const {sql,request}=setup();const session=(await (await request(game,{action:'start'})).json()).id;
  sql.prepare('UPDATE game_sessions SET started=?').run(Date.now()-elapsed);
  const response=await request(game,{session,nickname:'Zero',details});assert.equal(response.status,200);assert.equal((await response.json()).result.score,0);
 }
});

test('examples are labelled, formula-consistent, idempotent and never overwrite genuine records',async()=>{
 const {exampleRecords,exampleSql}=await import('../scripts/game-example-records.mjs');
 const {sql,request}=setup();const records=exampleRecords();
 assert.equal(records.length,39);assert.equal(new Set(records.map(r=>r.nickname)).size,39);
 sql.exec(exampleSql(records));sql.exec(exampleSql(records));
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM game_results').get().n,39);
 for(const game of ['cps-test','aim-trainer','reaction-test']){
  const {rows}=await (await request(game)).json();assert.equal(rows.length,13);assert.ok(rows.every(r=>r.example));
  assert.equal(new Set(records.map(r=>r.player)).size,39);
  assert.ok(records.every(r=>r.created<Date.now() && r.created>Date.now()-30*86400000));
  const {result}=await (await request(game,null,`&result=${rows[0].id}`)).json();assert.equal(result.example,true);
  for(const r of records.filter(r=>r.game===game)){
   const d=JSON.parse(r.details);const score=game==='cps-test'?d.clicks/10:game==='aim-trainer'?Math.round(d.hits*d.hits/(d.hits+d.misses)*100)/100:Math.round(d.trials.reduce((a,b)=>a+b)/5);
   assert.equal(r.score,score);
  }
 }
});

test('shared fun-name logic preserves existing date results and produces valid nicknames',async()=>{
 const {funNamesForDate,randomFunNickname}=await import('../assets/js/fun-names.mjs');
 assert.deepEqual(funNamesForDate(new Date(1995,0,1)),{indian:'고요한 바람의 친구',chosun:'한양 박도령'});
 for(const lang of ['ko','en']) for(let i=0;i<100;i++) assert.match(randomFunNickname(lang),/^[\p{L}\p{N}_ .-]{2,20}$/u);
});
