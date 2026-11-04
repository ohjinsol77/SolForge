const {chromium}=require('@playwright/test');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const server=http.createServer((req,res)=>{let file=path.join(process.cwd(),'dist',decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.extname(file))file+='.html';try{const content=fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(content);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true});
 try{
 for(const lang of ['ko','en'])for(const game of ['cps-test','aim-trainer','reaction-test']){
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/game-rankings?*',async route=>{const q=new URL(route.request().url()).searchParams,body=route.request().postDataJSON();
   const result={id:'shared-id',game,nickname:'Champion',example:!body,score:game==='reaction-test'?210:12.5,created:Date.now()};
   await route.fulfill({json:body?.action==='start'?{id:'session-id'}:body||q.has('result')?{result}:{rows:[result]}});
  });
  await page.route(/googlesyndication|doubleclick|google-analytics/,r=>r.abort());
  await page.goto(`${base}/${lang}/tools/${game}?result=shared-id`,{waitUntil:"domcontentloaded"});
  await page.getByText('Champion ·',{exact:false}).waitFor();
  assert.equal(await page.locator('#rankNickname').count(),1);
  assert.equal(await page.locator('small[data-i18n="games.example.label"]').count(),1);
  assert.ok((await page.locator('#tool-workspace').innerText()).includes(lang==='en'?'This is an example, not a result submitted by a real player.':'실제 이용자가 제출한 기록이 아닌 예시입니다.'));
  assert.ok((await page.locator('#tool-workspace').innerText()).includes(lang==='en'?'Official ranked challenge':'공식 기록 도전'));
  assert.equal(await page.locator('#languageToggle').getAttribute('href'),`/${lang==='en'?'ko':'en'}/tools/${game}?result=shared-id`);
  if(game==='cps-test'){
   await page.clock.install();await page.getByRole('button',{name:lang==='en'?'Start challenge':'도전 시작',exact:true}).click();
   await page.getByRole('button',{name:lang==='en'?'Left click':'좌클릭',exact:true}).click();await page.clock.runFor(10100);
   await page.locator('#rankNickname').fill('Champion');await page.locator('form button').filter({hasText:lang==='en'?'Submit ranking':'랭킹 등록'}).click();
   await page.getByRole('button',{name:lang==='en'?'Copy link':'링크 복사'}).waitFor();
  }
  if(game==='aim-trainer'){
   await page.getByRole('button',{name:lang==='en'?'Start challenge':'도전 시작',exact:true}).click();
   const box=await page.locator('.aim-arena').boundingBox();assert.equal(box.width,322);assert.equal(box.height,242);
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${lang}/${game}`);await page.close();
 }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
