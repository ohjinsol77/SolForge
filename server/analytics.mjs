import { routes, titles } from './analytics-routes.mjs';
import { adminPage } from './admin-page.mjs';
const hosts = new Set(['solforge.cloud','crypto.solforge.cloud','stocks.solforge.cloud','fortune.solforge.cloud']);
const enc = new TextEncoder();
const hex = b => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2,'0')).join('');
export const hash = async s => hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const json = (value,status=200,extra={}) => new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
const now = () => Math.floor(Date.now()/1000);
export async function passwordMatches(password, stored) {
  const [type,iterations,salt,expected] = (stored||'').split('$');
  if(type!=='pbkdf2' || Number(iterations)!==100000 || !salt || !expected) return false;
  const key = await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
  const actual = hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256));
  let diff = actual.length ^ expected.length;
  for(let i=0;i<actual.length;i++) diff |= actual.charCodeAt(i) ^ (expected.charCodeAt(i)||0);
  return diff===0;
}
async function currentPasswordHash(env) {
  await env.ANALYTICS_DB.prepare('INSERT OR IGNORE INTO admin_credentials(id,password_hash,updated_at) VALUES(1,?,?)').bind(env.ADMIN_PASSWORD_HASH,now()).run();
  const credential=await env.ANALYTICS_DB.prepare('SELECT password_hash FROM admin_credentials WHERE id=1').first();
  if(!credential?.password_hash)throw Error('Missing credential');
  return credential.password_hash;
}
async function makePasswordHash(password) {
  const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
  const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
  const digest=hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256));
  return `pbkdf2$100000$${salt}$${digest}`;
}
async function body(request) {
  if(!request.headers.get('content-type')?.startsWith('application/json')) throw Error('body');
  const reader=request.body?.getReader(); if(!reader) throw Error('body');
  let bytes=0, parts=[];
  while(true){ const {done,value}=await reader.read(); if(done) break; bytes+=value.byteLength; if(bytes>4096){await reader.cancel();throw Error('body');} parts.push(value); }
  const all=new Uint8Array(bytes);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}
  return JSON.parse(new TextDecoder().decode(all));
}
const cookie = token => `__Host-sf_admin=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${token?604800:0}`;
async function session(request,env,passwordHash){
  const token=request.headers.get('cookie')?.match(/(?:^|;\s*)__Host-sf_admin=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(!token)return null;
  const digest=await hash(token);
  const row=await env.ANALYTICS_DB.prepare('SELECT token FROM sessions WHERE token=? AND expires>? AND version=?').bind(digest,now(),await hash(passwordHash)).first();
  return row?digest:null;
}
export async function handleAnalytics(request,env) {
  const url=new URL(request.url), path=url.pathname;
  if(path!='/api/analytics/event'&&!path.startsWith('/admin'))return null;
  try{
    if(path==='/api/analytics/event')return await collect(request,env,url);
    if(url.hostname!=='solforge.cloud'&&!['localhost','127.0.0.1'].includes(url.hostname))return json({error:'Not found'},404);
    if(!env.ANALYTICS_DB||!env.ADMIN_PASSWORD_HASH||!env.ANALYTICS_SALT)return json({error:'Admin is not configured'},503);
    if(['/admin','/admin/'].includes(path))return Response.redirect(`${url.origin}/admin/ko`,302);
    if(['/admin/ko','/admin/en'].includes(path)&&request.method==='GET')return new Response(adminPage(path.endsWith('/en')?'en':'ko'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",'X-Content-Type-Options':'nosniff'}});
    if(request.method==='POST'&&request.headers.get('origin')!==url.origin)return json({error:'Forbidden'},403);
    const passwordHash=await currentPasswordHash(env);
    if(path==='/admin/api/login'&&request.method==='POST'){
      const key=await hash(`${env.ANALYTICS_SALT}:${request.headers.get('CF-Connecting-IP')||'local'}:${Math.floor(now()/900)}`);
      const attempts=await env.ANALYTICS_DB.prepare('INSERT INTO login_attempts(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now()+1800).first();
      if(attempts.count>8)return json({error:'Too many attempts'},429,{'Retry-After':'900'});
      const data=await body(request);
      if(typeof data.password!=='string'||data.password.length>256||!await passwordMatches(data.password,passwordHash))return json({error:'Invalid login'},401);
      const token=hex(crypto.getRandomValues(new Uint8Array(32)));
      await env.ANALYTICS_DB.prepare('INSERT INTO sessions(token,expires,version) VALUES(?,?,?)').bind(await hash(token),now()+604800,await hash(passwordHash)).run();
      return json({ok:true},200,{'Set-Cookie':cookie(token)});
    }
    const auth=await session(request,env,passwordHash);if(!auth)return json({error:'Unauthorized'},401);
    if(path==='/admin/api/logout'&&request.method==='POST'){
      await env.ANALYTICS_DB.prepare('DELETE FROM sessions WHERE token=?').bind(auth).run();return json({ok:true},200,{'Set-Cookie':cookie('')});
    }
    if(path==='/admin/api/password'&&request.method==='POST'){
      const key=await hash(`password-change:${env.ANALYTICS_SALT}:${request.headers.get('CF-Connecting-IP')||'local'}:${Math.floor(now()/900)}`);
      const attempts=await env.ANALYTICS_DB.prepare('INSERT INTO login_attempts(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now()+1800).first();
      if(attempts.count>8)return json({error:'Too many attempts'},429,{'Retry-After':'900'});
      const data=await body(request);
      if(typeof data.currentPassword!=='string'||data.currentPassword.length>256||!await passwordMatches(data.currentPassword,passwordHash))return json({error:'Incorrect current password'},403);
      if(typeof data.newPassword!=='string'||data.newPassword.length<12||data.newPassword.length>128||data.newPassword!==data.confirmPassword||data.newPassword===data.currentPassword)return json({error:'Invalid new password'},400);
      const nextHash=await makePasswordHash(data.newPassword);
      const result=await env.ANALYTICS_DB.prepare('UPDATE admin_credentials SET password_hash=?,updated_at=? WHERE id=1 AND password_hash=?').bind(nextHash,now(),passwordHash).run();
      if(result.meta.changes!==1)return json({error:'Password changed concurrently'},409);
      // Session versions invalidate all old sessions, including concurrent logins.
      return json({ok:true},200,{'Set-Cookie':cookie('')});
    }
    if(path==='/admin/api/stats'&&request.method==='GET')return await stats(env,url);
    return json({error:'Not found'},404);
  }catch(error){return json({error: error.message==='body'?'Invalid request':'Request failed'},error.message==='body'?400:500);}
}
async function collect(request,env,url){
  const origin=request.headers.get('origin');let host;try{host=new URL(origin).hostname;}catch{return json({},403);}
  if(!hosts.has(host)||origin!==`https://${host}`)return json({},403);
  const cors={'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='POST')return json({},405,cors);
  if(!env.ANALYTICS_DB||!env.ANALYTICS_SALT)return json({},503,cors);
  if(request.headers.get('DNT')==='1'||request.headers.get('Sec-GPC')==='1')return new Response(null,{status:204,headers:cors});
  let data;try{data=await body(request);}catch{return json({},400,cors);}
  if(!/^[a-f0-9-]{36}$/.test(data.id||'')||!/^[a-f0-9-]{36}$/.test(data.visitor||'')||!['pageview','click'].includes(data.kind)||typeof data.path!=='string'||!/^\/(ko|en)\/[a-z0-9/_-]*\.html$/.test(data.path))return json({},400,cors);
  if(!routes[host]?.includes(data.path))return json({},400,cors);
  const visitor=await hash(`${env.ANALYTICS_SALT}:${data.visitor}`);
  if(env.ANALYTICS_LIMITER&&!(await env.ANALYTICS_LIMITER.limit({key:visitor})).success)return json({},429,cors);
  const safe=value=>typeof value==='string'?value.replace(/[\u0000-\u001f]/g,'').slice(0,120):'';
  const target=data.kind==='click'?safe(data.target):'';
  if(target&&!/^(?:\/(ko|en)\/[a-z0-9/_-]*\.html|#[a-zA-Z][\w-]{0,79})$/.test(target))return json({},400,cors);
  const referrer=/^[a-z0-9.-]{1,120}$/.test(data.referrer||'')?data.referrer:'';
  await env.ANALYTICS_DB.prepare('INSERT OR IGNORE INTO events(id,time,day,visitor,site,path,kind,target,referrer,campaign,keyword) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(data.id,now(),new Date(Date.now()+32400000).toISOString().slice(0,10),visitor,host,data.path,data.kind,target,referrer,safe(data.campaign),safe(data.keyword)).run();
  return new Response(null,{status:204,headers:cors});
}
async function stats(env,url){
  const days=[7,30,90].includes(Number(url.searchParams.get('days')))?Number(url.searchParams.get('days')):30;
  const site=url.searchParams.get('site'); if(site&&site!=='all'&&!hosts.has(site))return json({},400);
  const since=new Date(Date.now()+32400000-(days-1)*86400000).toISOString().slice(0,10);
  const where='day>=?'+(hosts.has(site)?' AND site=?':''); const args=hosts.has(site)?[since,site]:[since];
  const query=sql=>env.ANALYTICS_DB.prepare(sql).bind(...args);
  const results=await env.ANALYTICS_DB.batch([
    query(`SELECT COUNT(*) views,COUNT(DISTINCT visitor) visitors FROM events WHERE ${where} AND kind='pageview'`),
    query(`SELECT day label,COUNT(*) views,COUNT(DISTINCT visitor) visitors FROM events WHERE ${where} AND kind='pageview' GROUP BY day ORDER BY day`),
    query(`SELECT site||path label,COUNT(*) views,COUNT(DISTINCT visitor) visitors FROM events WHERE ${where} AND kind='pageview' GROUP BY site,path ORDER BY views DESC LIMIT 30`),
    query(`SELECT referrer label,COUNT(*) views,COUNT(DISTINCT visitor) visitors FROM events WHERE ${where} AND kind='pageview' AND referrer NOT IN ('solforge.cloud','crypto.solforge.cloud','stocks.solforge.cloud','fortune.solforge.cloud') GROUP BY referrer ORDER BY views DESC LIMIT 20`),
    query(`SELECT campaign label,COUNT(*) views,COUNT(DISTINCT visitor) visitors FROM events WHERE ${where} AND kind='pageview' AND campaign!='' GROUP BY campaign ORDER BY views DESC LIMIT 20`),
    query(`SELECT keyword label,COUNT(*) views,COUNT(DISTINCT visitor) visitors FROM events WHERE ${where} AND kind='pageview' AND keyword!='' GROUP BY keyword ORDER BY views DESC LIMIT 20`),
    query(`SELECT site||path||' → '||target label,COUNT(*) views,COUNT(DISTINCT visitor) visitors FROM events WHERE ${where} AND kind='click' GROUP BY site,path,target ORDER BY views DESC LIMIT 30`)
  ]);
  const daily=Array.from({length:days},(_,i)=>{const label=new Date(Date.parse(since+'T00:00:00Z')+i*86400000).toISOString().slice(0,10);return results[1].results.find(row=>row.label===label)||{label,views:0,visitors:0};});
  return json({summary:results[0].results[0],daily,pages:results[2].results.map(row=>({...row,label:(titles[row.label]||row.label)+' · '+row.label})),referrers:results[3].results,campaigns:results[4].results,keywords:results[5].results,clicks:results[6].results});
}
export async function cleanup(env){if(!env.ANALYTICS_DB)return;await env.ANALYTICS_DB.batch([env.ANALYTICS_DB.prepare('DELETE FROM events WHERE time<?').bind(now()-90*86400),env.ANALYTICS_DB.prepare('DELETE FROM sessions WHERE expires<?').bind(now()),env.ANALYTICS_DB.prepare('DELETE FROM login_attempts WHERE expires<?').bind(now())]);}
