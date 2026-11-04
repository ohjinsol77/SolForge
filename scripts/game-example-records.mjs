import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Fictional examples, not measured participants or a representative population sample.
// Reaction times are centered near the browser-test reference at
// https://humanbenchmark.com/tests/reactiontime/statistics (median 273 ms).
const players = [
 ['모래시계',54,34,5,279], ['밤산책',47,29,6,306],
 ['mintleaf',62,44,4,244], ['구름한조각',51,32,5,291],
 ['orbit92',68,38,6,257], ['코코아잔',49,30,7,302],
 ['초록연필',57,32,5,268], ['nori',59,36,6,226],
 ['달빛러너',64,40,5,239], ['bluejay',55,42,4,274],
 ['느린오후',43,26,8,329], ['고양이발자국',52,33,6,286],
 ['루프탑',60,39,5,262]
];
export function exampleRecords(created = Date.now()) {
 return players.flatMap(([nickname,clicks,hits,misses,reaction], index) => {
  const player = `example-v1-player-${String(index + 1).padStart(2,'0')}`;
  const games = [
   ['cps-test',clicks / 10,{clicks}],
   ['aim-trainer',Math.round(hits * hits / (hits + misses) * 100) / 100,{hits,misses}],
   ['reaction-test',reaction,{trials:[reaction-14,reaction+9,reaction-5,reaction+18,reaction-8]}]
  ];
  return games.map(([game,score,details]) => ({
   id:`example-v1-${game}-${String(index + 1).padStart(2,'0')}`,
   player,game,nickname,score,created,
   details:JSON.stringify({...details,example:true,source:'fictional-example-v1'})
  }));
 });
}
export function exampleSql(records) {
 const literal = value => typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'","''")}'`;
 return '-- Explicitly labelled fictional examples. Idempotent; never overwrite real records.\n' + records.map(r =>
  `INSERT OR IGNORE INTO game_results(id,player,game,nickname,score,details,created,rules) VALUES (${[r.id,r.player,r.game,r.nickname,r.score,r.details,r.created,'v1'].map(literal).join(',')});`
 ).join('\n') + '\n';
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 const out = process.argv[process.argv.indexOf('--sql') + 1];
 if (!process.argv.includes('--sql') || !out) throw Error('Usage: node scripts/game-example-records.mjs --sql <output.sql>');
 const records = exampleRecords();writeFileSync(out,exampleSql(records));
 console.log(`Prepared ${records.length} labelled examples: 13 per game.`);
}
