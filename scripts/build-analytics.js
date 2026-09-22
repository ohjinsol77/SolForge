const fs=require('fs'),path=require('path');
const { generatedCategoryRecords, loadToolCatalog } = require('./build-tool-pages');
const translations={};
for(const lang of ['ko','en']){const locale=require(`../src/locales/${lang}.json`);translations[lang]=Object.fromEntries(Object.entries(locale).filter(([k])=>k.startsWith('admin.')).map(([k,v])=>[k.slice(6),v]));fs.writeFileSync(`dist/assets/admin-${lang}.json`,JSON.stringify(translations[lang]));}
fs.writeFileSync('server/admin-copy.mjs',`export const translations=${JSON.stringify(translations)};\n`);
const routes={},titles={};
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(file.endsWith('.html')){const normalized=file.split(path.sep).join('/'); const site=normalized.startsWith('sites/')?normalized.split('/')[1]+'.solforge.cloud':'solforge.cloud'; const route='/'+normalized.split('/dist/').pop().replace(/^dist\//,''); (routes[site]||=[]).push(route); let html=fs.readFileSync(file,'utf8'); titles[site+route]=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||route).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');if(!html.includes('/assets/js/analytics.js'))html=html.replace('</body>','<script defer src="https://solforge.cloud/assets/js/analytics.js"></script></body>');if(entry.name==='privacy.html'&&!html.includes('data-analytics-policy')){const lang=file.split(path.sep).includes('en')?'en':'ko';html=html.replace('</main>',`<section data-analytics-policy class="panel"><p data-i18n="admin.privacy">${translations[lang].privacy}</p></section></main>`);}if(!html.includes('data-admin-link')){const lang=file.split(path.sep).includes('en')?'en':'ko';const link=`<a data-admin-link href="https://solforge.cloud/admin/${lang}">${translations[lang].footerLink}</a>`;html=html.replace(/<footer\b[\s\S]*?<\/footer>/,footer=>footer.includes('</nav>')?footer.replace('</nav>',link+'</nav>'):footer.includes('</div>')?footer.replace(/<\/div>(\s*<\/footer>)$/,link+'</div>$1'):footer.replace('</footer>','<div>'+link+'</div></footer>'));}fs.writeFileSync(file,html);}}}
for(const base of ['dist','sites/crypto/dist','sites/stocks/dist','sites/fortune/dist'])for(const lang of ['ko','en'])if(fs.existsSync(path.join(base,lang)))walk(path.join(base,lang));
console.log('Analytics scripts, bilingual privacy notices and admin copy generated.');

fs.writeFileSync('server/analytics-routes.mjs',`export const routes=${JSON.stringify(routes)}; export const titles=${JSON.stringify(titles)};\n`);

const catalog=loadToolCatalog('ko');
const englishCopy=JSON.parse(fs.readFileSync('dist/assets/js/tool-copy-en.js','utf8').replace(/^window\.SF_TOOL_COPY\s*=\s*/, '').replace(/;\s*$/,''));
const localizedKo=catalog;
const localizedEn=catalog.map(item=>({...item,...(englishCopy[item.href]||{})}));
const heading=file=>{const html=fs.readFileSync(file,'utf8');return (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').trim();};
const categories=generatedCategoryRecords(catalog).map(({id,file})=>({key:`category:${id}`,kind:'category',id,ko:heading(path.join('dist','ko',file)),en:heading(path.join('dist','en',file))}));
const tools=localizedKo.map((item,index)=>({key:`tool:${item.href.replace(/^\.\.\//,'')}`,kind:'tool',id:item.href,category:item.category,ko:item.title,en:localizedEn[index].title}));
const menuEntries=[{key:'directory:all',kind:'directory',id:'all',ko:'전체 도구',en:'All tools'},...categories,...tools];
fs.writeFileSync('server/menu-catalog.mjs',`export const entries=${JSON.stringify(menuEntries)};\n`);
