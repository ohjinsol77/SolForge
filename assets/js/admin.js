(async()=>{
 const lang=document.documentElement.lang;
 const t=await fetch(`/assets/admin-${lang}.json`).then(r=>r.json());
 const $=id=>document.getElementById(id); let generation=0;
 const showLogin=()=>{$('login').hidden=false;$('dashboard').hidden=true;$('logout').hidden=true;};
 async function load(){const current=++generation;$('status').textContent='';try{
  const r=await fetch(`/admin/api/stats?days=${$('days').value}&site=${encodeURIComponent($('site').value)}`,{cache:'no-store'});
  if(current!==generation)return;if(r.status===401){showLogin();return;}if(!r.ok)throw Error();const data=await r.json();
  $('login').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;
  for(const k of ['visitors','views'])$(k).textContent=Number(data.summary[k]).toLocaleString(lang);
  for(const k of ['daily','pages','referrers','campaigns','keywords','clicks']){
   $(k).replaceChildren();const rows=data[k];if(!rows.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=3;cell.textContent=t.empty;row.append(cell);$(k).append(row);}
   for(const item of rows){const tr=document.createElement('tr');for(const value of [item.label||t.direct,item.views,item.visitors]){const td=document.createElement('td');td.textContent=String(value);if(k==='daily'&&tr.children.length===1){const bar=document.createElement('progress');bar.max=Math.max(1,...rows.map(x=>x.views));bar.value=item.views;bar.setAttribute('aria-label',t.views);td.append(bar);}tr.append(td);}$(k).append(tr);}
  }
 }catch{$('status').textContent=t.error;}}
 $('login').addEventListener('submit',async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{const r=await fetch('/admin/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('password').value})});$('password').value='';if(!r.ok){$('status').textContent=r.status===429?t.limited:r.status===401?t.invalid:t.error;return;}await load();}catch{$('status').textContent=t.error;}finally{button.disabled=false;}});
 $('change-password').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.target,button=form.querySelector('button'),status=$('password-status');
  if($('new-password').value!==$('confirm-password').value){status.textContent=t.passwordMismatch;return;}
  button.disabled=true;status.textContent='';
  try{
    const r=await fetch('/admin/api/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:$('current-password').value,newPassword:$('new-password').value,confirmPassword:$('confirm-password').value})});
    if(!r.ok){if(r.status===401||r.status===409){generation++;form.reset();showLogin();$('status').textContent=t.signInAgain;}else status.textContent=r.status===403?t.currentPasswordInvalid:r.status===400?t.passwordHint:r.status===429?t.limited:t.error;return;}
    generation++;form.reset();showLogin();$('status').textContent=t.passwordChanged;$('password').focus();
  }catch{status.textContent=t.error;}finally{button.disabled=false;}
 });
 $('logout').onclick=async()=>{try{const r=await fetch('/admin/api/logout',{method:'POST'});if(!r.ok)throw Error();generation++;showLogin();}catch{$('status').textContent=t.error;}};
 for(const id of ['days','site'])$(id).onchange=load;$('refresh').onclick=load;await load();
})();
