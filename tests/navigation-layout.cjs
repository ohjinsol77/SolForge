const { chromium } = require('@playwright/test');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
(async () => {
 const server = http.createServer((req,res) => {
  let file = path.join(process.cwd(), 'dist', decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if (!path.extname(file)) file += '.html';
  try {res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'); res.end(fs.readFileSync(file));} catch {res.writeHead(404);res.end();}
 });
 await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
 const base = `http://127.0.0.1:${server.address().port}`;
 const browser = await chromium.launch({headless:true});
 try {
  for (const lang of ['ko','en']) for (const skin of ['default','saas','terminal']) {
   const page = await browser.newPage();
   await page.route('**/api/game-rankings?*', route=>route.fulfill({json:{rows:[]}}));
   await page.route(/googlesyndication|doubleclick/, r=>r.abort());
   for (const size of [{width:1280,height:720},{width:1440,height:900},{width:1920,height:1080},{width:390,height:844}]) {
    await page.setViewportSize(size);
    await page.goto(`${base}/${lang}/tools/reaction-test`,{waitUntil:'domcontentloaded'});
    await page.locator('[data-nav-category="challenge"]').waitFor({state:'attached'});
    await page.evaluate(skin=>document.documentElement.dataset.skin=skin,skin);
    const challenge=page.locator('[data-nav-category="challenge"]');
    assert.equal(await challenge.getAttribute('open'),'');
    const links=await challenge.locator('.nav-submenu a').evaluateAll(elements=>elements.map(el=>el.getAttribute('href')));
    assert.deepEqual(links,[`/${lang}/tools/challenge`,...['cps-test','reaction-test','aim-trainer'].map(game=>`/${lang}/tools/${game}`)]);
    assert.equal(await page.locator('[data-nav-category="gameplay"] a[href$="reaction-test"]').count(),0);
    if (size.width>1120) {
     await page.evaluate(()=>window.scrollTo(0,450));
     const layout=await page.locator('.sidebar').evaluate(el=>({position:getComputedStyle(el).position,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,height:el.getBoundingClientRect().height,submenus:[...el.querySelectorAll('.nav-submenu')].map(sub=>({overflow:getComputedStyle(sub).overflowY,maxHeight:getComputedStyle(sub).maxHeight}))}));
     assert.equal(layout.position,'sticky');assert.ok(Math.abs(layout.top)<1);assert.equal(layout.height,size.height);assert.equal(layout.bottom,size.height);
     assert.ok(layout.submenus.every(sub=>sub.maxHeight==='none' && sub.overflow==='visible'));
    } else {
     await page.locator('.mobile-nav-toggle').click();
     const bounds=await page.locator('.side-nav').boundingBox();assert.ok(bounds.y+bounds.height<=size.height);
     await challenge.locator('a[href$="aim-trainer"]').scrollIntoViewIfNeeded();
     assert.ok(await challenge.locator('a[href$="aim-trainer"]').isVisible());
    }
    if(lang==='ko' && skin==='terminal' && size.width===1440) await page.screenshot({path:'test-results/navigation-terminal.png'});
    console.log(`PASS ${lang}/${skin} navigation ${size.width}×${size.height}`);
   }
   await page.goto(`${base}/${lang}/tools/challenge`,{waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('.catalog-card').count(),3);
   await page.close();
  }
 } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exit(1);});
