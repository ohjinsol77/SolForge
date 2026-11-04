(async function () {
 'use strict';
 const KEYS={"공식 기록 도전": "games.ranked.000", "10초 동안 좌클릭 · CPS = 클릭 수 ÷ 10": "games.ranked.001", "20초 · 320×240 경기장 · 42px 타겟 · 점수 = 명중 수 × 명중률": "games.ranked.002", "5회 평균 반응속도 · 대기 0.9~3.5초 · 성급한 클릭은 전체 시도 초기화": "games.ranked.003", "동일한 규칙으로 측정합니다. 기기·화면·입력 지연은 다를 수 있습니다. 탭 전환이나 창 크기 변경 시 도전이 취소됩니다.": "games.ranked.004", "도전 시작": "games.ranked.005", "닉네임 (2~20자, 공개 표시)": "games.ranked.006", "랭킹 등록 및 공유 링크 만들기": "games.ranked.007", "최근 30일 리더보드": "games.ranked.008", "사용자별 최고 기록 100명 · 동점이면 먼저 등록한 기록 우선 · 공유 결과는 1년간 보관 · 브라우저 측정값이므로 자동 입력을 완전히 차단할 수 없습니다.": "games.ranked.009", "랭킹 새로고침": "games.ranked.010", "불러오는 중": "games.ranked.011", "점": "games.ranked.012", "아직 등록된 기록이 없습니다.": "games.ranked.013", "순위": "games.ranked.014", "닉네임": "games.ranked.015", "점수": "games.ranked.016", "등록일": "games.ranked.017", "기록 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.": "games.ranked.018", "도전이 취소되었습니다. 다시 시작해 주세요.": "games.ranked.019", "측정 완료! 닉네임을 입력해 등록하세요.": "games.ranked.020", "좌클릭": "games.ranked.021", "타겟": "games.ranked.022", "명중": "games.ranked.023", "실패": "games.ranked.024", "기다리세요": "games.ranked.025", "지금 클릭!": "games.ranked.026", "공유 결과": "games.ranked.027", "공유 링크": "games.ranked.028", "링크 복사": "games.ranked.029", "복사 완료": "games.ranked.030", "닉네임은 한글·영문·숫자·공백·밑줄·마침표·하이픈으로 2~20자를 입력하세요.": "games.ranked.031", "등록하지 못했습니다. 다시 시도하거나 새 도전을 시작해 주세요.": "games.ranked.032", "공유 기록이 없거나 보관 기간이 지났습니다.": "games.ranked.033"};
 const game=document.body.dataset.pageTool;
 const $=s=>document.querySelector(s);
 const t=s=>window.sfT?window.sfT(s):s;
 const panel=$(`[data-gaming-panel]`);
 if(!panel) return;
 const text=(tag,value,parent)=>{const el=document.createElement(tag);el.textContent=value;parent.append(el);return el;};
 const label=(tag,ko,parent)=>{const el=text(tag,t(ko),parent);const key=KEYS[ko]||Object.entries(KEYS).find(([value])=>t(value)===ko)?.[1];if(key)el.dataset.i18n=key;return el;};
 // Reuse the existing tool shell while removing adjustable practice controls.
 panel.replaceChildren();
 label('h2','공식 기록 도전',panel);
 const rules={
  'cps-test':'10초 동안 좌클릭 · CPS = 클릭 수 ÷ 10',
  'aim-trainer':'20초 · 320×240 경기장 · 42px 타겟 · 점수 = 명중 수 × 명중률',
  'reaction-test':'5회 평균 반응속도 · 대기 0.9~3.5초 · 성급한 클릭은 전체 시도 초기화'
 };
 label('p',rules[game],panel);
 label('p','동일한 규칙으로 측정합니다. 기기·화면·입력 지연은 다를 수 있습니다. 탭 전환이나 창 크기 변경 시 도전이 취소됩니다.',panel);
 const start=label('button','도전 시작',panel);start.type='button';start.className='primary-link';
 const status=text('p','',panel);status.setAttribute('role','status');
 const area=document.createElement('div');area.style.touchAction='none';panel.append(area);
 const scoreBox=text('p','',panel);scoreBox.setAttribute('aria-live','polite');
 const form=document.createElement('form');form.hidden=true;panel.append(form);
 const nickLabel=label('label','닉네임 (2~20자, 공개 표시)',form);nickLabel.htmlFor='rankNickname';
 const nick=document.createElement('input');nick.id='rankNickname';nick.minLength=2;nick.maxLength=20;nick.required=true;nick.autocomplete='nickname';form.append(nick);
 const {randomFunNickname}=await import('/assets/js/fun-names.mjs?v=20261104-names');
 nick.value=randomFunNickname(document.documentElement.lang);
 try {nick.value=localStorage.getItem('sf-rank-nickname')||nick.value;}catch{}
 const submit=label('button','랭킹 등록 및 공유 링크 만들기',form);submit.type='submit';submit.className='primary-link';
 const share=document.createElement('div');panel.append(share);
 label('h2','최근 30일 리더보드',panel);
 label('p','사용자별 최고 기록 100명 · 동점이면 먼저 등록한 기록 우선 · 공유 결과는 1년간 보관 · 브라우저 측정값이므로 자동 입력을 완전히 차단할 수 없습니다.',panel);
 const reload=label('button','랭킹 새로고침',panel);reload.type='button';reload.className='ghost-button';
 const board=document.createElement('div');panel.append(board);
 let session=null,details=null,running=false,busy=false,timer,timeout,end=0,count=0,hits=0,misses=0,trials=[],phase='idle',readyAt=0;
 const api=async(body,id)=>{
  const q=new URLSearchParams({game});if(id)q.set('result',id);
  const res=await fetch(`/api/game-rankings?${q}`,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
  const data=await res.json();if(!res.ok)throw Error(data.error);return data;
 };
 const format=s=>`${s}${game==='reaction-test'?' ms':game==='cps-test'?' CPS':` ${t('점')}`}`;
 async function load(){reload.disabled=true;board.textContent=t('불러오는 중');try{
  const {rows}=await api();board.replaceChildren();
  if(!rows.length)label('p','아직 등록된 기록이 없습니다.',board);
  else {const table=document.createElement('table');table.className='data-table';board.style.overflowX='auto';board.append(table);
   const head=document.createElement('thead');table.append(head);const tr=document.createElement('tr');head.append(tr);['순위','닉네임','점수','등록일'].forEach(v=>label('th',v,tr));
   const tbody=document.createElement('tbody');table.append(tbody);rows.forEach((r,i)=>{const row=document.createElement('tr');tbody.append(row);text('td',i+1,row);const cell=document.createElement('td');row.append(cell);const a=text('a',r.nickname,cell);a.href=`?result=${encodeURIComponent(r.id)}`;text('td',format(r.score),row);text('td',new Date(r.created).toLocaleDateString(document.documentElement.lang),row);});}
 }catch{board.textContent=t('기록 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');}finally{reload.disabled=false;}}
 reload.onclick=load;
 const stop=()=>{running=false;clearInterval(timer);clearTimeout(timeout);start.disabled=false;area.replaceChildren();};
 const cancel=()=>{if(running){stop();details=null;session=null;form.hidden=true;status.textContent=t('도전이 취소되었습니다. 다시 시작해 주세요.');}};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});window.addEventListener('resize',cancel);window.addEventListener('blur',cancel);
 const finish=()=>{details=game==='cps-test'?{clicks:count}:game==='aim-trainer'?{hits,misses}:{trials:[...trials]};stop();form.hidden=false;status.textContent=t('측정 완료! 닉네임을 입력해 등록하세요.');};
 const real=e=>e.isTrusted && e.button===0;
 start.onclick=async()=>{
  if(busy||running)return;busy=true;start.disabled=true;form.hidden=true;details=null;share.replaceChildren();status.textContent=t('불러오는 중');
  try{session=(await api({action:'start'})).id;running=true;status.textContent='';count=hits=misses=0;trials=[];scoreBox.textContent='';
   if(game==='reaction-test')reaction();else{
    const duration=game==='cps-test'?10000:20000;
    const pad=document.createElement(game==='cps-test'?'button':'div');area.append(pad);
    if(game==='cps-test'){
     pad.type='button';pad.className='reaction-pad';pad.textContent=t('좌클릭');
     pad.onpointerdown=e=>{if(!real(e)||!running)return;e.preventDefault();if(performance.now()>=end){finish();return;}count++;scoreBox.textContent=`${count} / ${(count/10).toFixed(2)} CPS`;};
    }else{
     pad.className='aim-arena';Object.assign(pad.style,{width:'320px',height:'240px',minHeight:'240px',maxWidth:'none',position:'relative',boxSizing:'content-box'});
     const target=document.createElement('button');target.type='button';target.setAttribute('aria-label',t('타겟'));pad.append(target);
     Object.assign(target.style,{position:'absolute',width:'42px',height:'42px',borderRadius:'50%',background:'#ef4444',padding:'0',touchAction:'none'});
     // The same deterministic target sequence and geometry for every attempt.
     let seed=20261104;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
     const place=()=>{target.style.left=`${Math.floor(random()*278)}px`;target.style.top=`${Math.floor(random()*198)}px`;};place();
     pad.onpointerdown=e=>{if(!real(e)||!running)return;e.preventDefault();if(performance.now()>=end){finish();return;}if(e.target===target){hits++;place();}else misses++;scoreBox.textContent=`${t('명중')}: ${hits} · ${t('실패')}: ${misses} · ${format(Math.round(hits*hits/Math.max(1,hits+misses)*100)/100)}`;};
    }
    end=performance.now()+duration;timer=setInterval(()=>{if(performance.now()>=end)finish();else status.textContent=`${((end-performance.now())/1000).toFixed(1)} s`;},40);
   }
  }catch{status.textContent=t('기록 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');start.disabled=false;}finally{busy=false;}
 };
 function reaction(){
  area.replaceChildren();const pad=document.createElement('button');pad.type='button';pad.className='reaction-pad armed';pad.textContent=t('기다리세요');area.append(pad);phase='waiting';readyAt=0;
  status.textContent=`${trials.length} / 5`;
  timeout=setTimeout(()=>{phase='ready';pad.className='reaction-pad ready';pad.textContent=t('지금 클릭!');requestAnimationFrame(()=>{readyAt=performance.now();});},900+Math.random()*2600);
  pad.onpointerdown=e=>{if(!real(e)||!running)return;e.preventDefault();if(phase!=='ready'||!readyAt){cancel();return;}
   const ms=Math.round(performance.now()-readyAt);readyAt=0;if(ms<100||ms>3000){cancel();return;}trials.push(ms);scoreBox.textContent=`${trials.join(' / ')} ms`;
   if(trials.length===5)finish();else reaction();};
 }
 async function showResult(r){
  share.replaceChildren();label('h3','공유 결과',share);text('p',`${r.nickname} · ${format(r.score)} · ${new Date(r.created).toLocaleDateString(document.documentElement.lang)}`,share);
  const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('result',r.id);
  const input=document.createElement('input');input.readOnly=true;input.value=url.href;input.setAttribute('aria-label',t('공유 링크'));share.append(input);
  const copy=label('button','링크 복사',share);copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(url.href);copy.textContent=t('복사 완료');}catch{input.select();}};
 }
 form.onsubmit=async e=>{e.preventDefault();if(!details||!session)return;submit.disabled=true;
  try{const {result}=await api({session,nickname:nick.value,details});try{localStorage.setItem('sf-rank-nickname',nick.value);}catch{}await showResult(result);form.hidden=true;details=null;await load();}
  catch(error){status.textContent=t(error.message==='nickname'?'닉네임은 한글·영문·숫자·공백·밑줄·마침표·하이픈으로 2~20자를 입력하세요.':'등록하지 못했습니다. 다시 시도하거나 새 도전을 시작해 주세요.');}finally{submit.disabled=false;}
 };
 await load();const id=new URL(location.href).searchParams.get('result');if(id){try{await showResult((await api(null,id)).result);}catch{share.textContent=t('공유 기록이 없거나 보관 기간이 지났습니다.');}}
})();
