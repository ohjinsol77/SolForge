(()=>{
 if(navigator.doNotTrack==='1'||navigator.globalPrivacyControl||!/^\/(ko|en)\//.test(location.pathname))return;
 const hosts=['solforge.cloud','crypto.solforge.cloud','stocks.solforge.cloud','fortune.solforge.cloud'];if(!hosts.includes(location.hostname))return;
 const canonicalPath=p=>p.endsWith('/')?p+'index.html':p.endsWith('.html')?p:p+'.html';
 let visitor=document.cookie.match(/(?:^|;\s*)sf_visitor=([a-f0-9-]{36})(?:;|$)/)?.[1];
 if(!visitor){visitor=crypto.randomUUID();document.cookie=`sf_visitor=${visitor}; Domain=.solforge.cloud; Path=/; Max-Age=2592000; SameSite=Lax; Secure`;}
 let referrer='',keyword='';try{const ref=new URL(document.referrer);referrer=ref.hostname;if(!hosts.includes(ref.hostname)){if(/(^|\.)(google\.[a-z.]+|bing.com|search.naver.com|search.daum.net)$/.test(ref.hostname))keyword=ref.searchParams.get('q')||ref.searchParams.get('query')||'';}}catch{}
 const params=new URLSearchParams(location.search);keyword=params.get('utm_term')||keyword;
 const campaign=['utm_source','utm_medium','utm_campaign'].map(k=>params.get(k)||'').join(' / ').replace(/^( \/ )+|( \/ )+$/g,'');
 function send(kind,target=''){fetch('https://solforge.cloud/api/analytics/event',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',keepalive:true,body:JSON.stringify({id:crypto.randomUUID(),visitor,path:canonicalPath(location.pathname),kind,target,referrer,campaign:campaign.slice(0,120),keyword:keyword.slice(0,120)})}).catch(()=>{});}
 send('pageview');let last=0;
 document.addEventListener('click',e=>{if(Date.now()-last<1000)return;const el=e.target.closest('a[href],button[id]');if(!el)return;let target='';if(el.tagName==='A'){try{const u=new URL(el.href);if(hosts.includes(u.hostname)&&/^\/(ko|en)\/[a-z0-9/_-]*\.html$/.test(canonicalPath(u.pathname)))target=canonicalPath(u.pathname);}catch{}}else if(/^[a-zA-Z][\w-]{0,79}$/.test(el.id))target='#'+el.id;if(target){last=Date.now();send('click',target);}});
})();
