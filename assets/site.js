/* Общий скрипт сайта City House. Основа — прототип v3; данные (дома, планировки, точки карт) приходят
   из <script type="application/json"> на странице — их собирает build.py из pages/*.json.
   Каждый модуль запускается, только если его разметка есть на странице. */
(function(){
"use strict";
const $=id=>document.getElementById(id), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const SITE=window.SITE||{base:"/",endpoint:"",ym:""};
const rub=n=>n.toLocaleString('ru-RU').replace(/,/g,' ')+' ₽';
const readJSON=el=>{try{return JSON.parse(el.textContent)}catch(e){return null}};

/* ==== меню на узком экране ==== */
(function(){
  const h=document.querySelector('.site-head'),b=h&&h.querySelector('.burger');if(!b)return;
  b.onclick=()=>{const o=h.classList.toggle('open');b.setAttribute('aria-expanded',o)};
  $$('nav a',h).forEach(a=>a.addEventListener('click',()=>{h.classList.remove('open');b.setAttribute('aria-expanded',false)}));
})();

/* ==== метки источника: utm и реферер живут до конца визита, уходят с заявкой ==== */
(function(){
  const KEYS=["utm_source","utm_medium","utm_campaign","utm_content","utm_term","yclid"];
  let src={};try{src=JSON.parse(sessionStorage.getItem("src")||"{}")}catch(e){}
  const qs=new URLSearchParams(location.search);
  if(KEYS.some(k=>qs.get(k))){src={};KEYS.forEach(k=>{if(qs.get(k))src[k]=qs.get(k)})}
  if(!src.ref)src.ref=document.referrer||"прямой заход";
  if(!src.landing)src.landing=location.pathname;
  try{sessionStorage.setItem("src",JSON.stringify(src))}catch(e){}
  window.LEAD_SRC=src;
})();

/* ==== проявление полос при прокрутке ==== */
(function(){
  const els=$$('.rv');
  if(!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('in'));return}
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
  els.forEach(e=>io.observe(e));
})();

/* ==== калькулятор ипотеки ==== */
const K={price:0,prog:'fam',cfg:null};
function calc(){
  if(!K.cfg)return;
  const dp=+$('kDp').value,rate=+$('kRate').value,term=+$('kTerm').value;
  $('kDpL').textContent=dp+'%';$('kRateL').textContent=String(rate).replace('.',',')+'%';
  $('kTermL').textContent=term+(term%10===1&&term!==11?' год':(term%10>=2&&term%10<=4&&(term<12||term>14)?' года':' лет'));
  const down=K.price*dp/100;let loan=K.price-down,own=0;
  if(K.prog==='fam'&&loan>K.cfg.fam_limit){own=loan-K.cfg.fam_limit;loan=K.cfg.fam_limit}
  const r=rate/1200,n=term*12,pay=r?loan*r/(1-Math.pow(1+r,-n)):loan/n;
  $('kPay').textContent=rub(Math.round(pay/100)*100);$('kLoan').textContent=rub(Math.round(loan));$('kDown').textContent=rub(Math.round(down));
  $('kOwnRow').style.display=own?'flex':'none';$('kOwn').textContent=rub(Math.round(own));$('kCash').textContent=rub(Math.round(down+own));
}
(function(){
  const box=document.querySelector('[data-calc]');if(!box)return;
  K.cfg=JSON.parse(box.dataset.calc);K.price=K.cfg.default;
  $$('#kHouse button').forEach(b=>b.onclick=()=>{$$('#kHouse button').forEach(x=>x.classList.toggle('on',x===b));K.price=+b.dataset.v;calc()});
  $$('#kProg button').forEach(b=>b.onclick=()=>{
    $$('#kProg button').forEach(x=>x.classList.toggle('on',x===b));K.prog=b.dataset.v;
    $('kRate').value=K.prog==='fam'?K.cfg.fam_rate:K.cfg.std_rate;
    $('kNote').textContent=K.prog==='fam'?K.cfg.note_fam:K.cfg.note_std;calc();
  });
  ['kDp','kRate','kTerm'].forEach(id=>$(id).oninput=calc);
  calc();
})();

/* ==== конфигуратор: дом на участке, солнце, планировка с комнатами ==== */
(function(){
  const dataEl=$('cfg-data');if(!dataEl)return;
  const DATA=readJSON(dataEl),HOUSES=DATA.houses,PLANS=DATA.plans,PLOTS=DATA.plots;
  let cur=DATA.default,plot=3,floor=0,ORDER=[],atEnd=false;
  function drawHouse(){
    const h=HOUSES[cur],g=$('house');let x0,w0;
    if(h.two){const pair=plot===1?[1,2]:[2,3];x0=PLOTS[pair[0]].x;w0=PLOTS[pair[1]].x+PLOTS[pair[1]].w-x0}
    else{x0=PLOTS[plot].x;w0=PLOTS[plot].w}
    $$('.plot').forEach(p=>{const n=+p.dataset.p;p.classList.toggle('on',h.two?(plot===1?n<3:n>1):n===plot)});
    const s=h.shape,cx=x0+w0/2,yb=574-88,x=cx-s.w/2,y=yb-s.h;
    const FP=s.kind==='L'?`<path d="M${x} ${y}h${s.w*.62}v${s.h*.45}h${s.w*.38}v${s.h*.55}h${-s.w}z"/>`:`<rect x="${x}" y="${y}" width="${s.w}" height="${s.h}"/>`;
    let body=`<g class="shadow" id="shadow">${FP}</g>`;
    if(s.kind==='L')body+=`<path class="hs" d="M${x} ${y}h${s.w*.62}v${s.h*.45}h${s.w*.38}v${s.h*.55}h${-s.w}z"/><rect class="ter" x="${x+s.w*.64}" y="${y+8}" width="${s.w*.34}" height="${s.h*.38}" rx="2"/><circle cx="${x+s.w*.81}" cy="${y-28}" r="14" fill="#c98a3c" opacity=".85"/>`;
    else body+=`<rect class="hs" x="${x}" y="${y}" width="${s.w}" height="${s.h}"/><rect class="ter" x="${x+10}" y="${y-30}" width="${s.w-20}" height="26" rx="2"/>`;
    body+=`<rect class="park" x="${cx-40}" y="${yb+18}" width="80" height="58" rx="3" opacity=".7"/><text x="${cx}" y="${y+s.h/2+5}" text-anchor="middle">${h.name.replace('Дом ','').replace(', ',' · ')}</text>`;
    g.style.opacity=0;g.style.transform='translateY(-14px)';
    setTimeout(()=>{g.innerHTML=body;g.style.opacity=1;g.style.transform='none';drawSun()},180);
    const img=$('cImg');img.style.opacity=0;
    setTimeout(()=>{img.onload=()=>img.style.opacity=1;img.src=h.img;img.alt=h.name},200);
    $('cName').textContent=h.name;$('cPrice').textContent=rub(h.price);
    $('cPlot').textContent=h.two?(plot===1?'Участки 1 и 2 · 16 соток':'Участки 2 и 3 · 16 соток, угловой у леса'):PLOTS[plot].t;
    $('cSpecs').innerHTML=h.specs.map(([a,b])=>`<div><span>${a}</span>${b}</div>`).join('');
  }
  // солнце: Москва, 55,6° с.ш., середина октября; верх схемы смотрит на 333° (к лесу)
  function sunPos(t){const r=Math.PI/180,lat=55.6*r,dec=-7*r,H=(t-12.25)*15*r;
    const el=Math.asin(Math.sin(lat)*Math.sin(dec)+Math.cos(lat)*Math.cos(dec)*Math.cos(H))/r;
    const az=Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(lat)-Math.tan(dec)*Math.cos(lat))/r+180;return {el,az}}
  const SIDES=['севера','северо-востока','востока','юго-востока','юга','юго-запада','запада','северо-запада'];
  function drawSun(){
    const t=+$('sunR').value,{el,az}=sunPos(t),th=(az-333)*Math.PI/180,dx=Math.sin(th),dy=-Math.cos(th);
    const hh=Math.floor(t),mm=Math.round((t-hh)*60);$('sunT').textContent=hh+':'+String(mm).padStart(2,'0');
    const up=el>0,k=Math.max(0,Math.min(1,el/22));
    $('sunTxt').textContent=up?'солнце с '+SIDES[Math.round(az/45)%8]:'солнце село';
    const x1=.5+.5*dx,y1=.5+.5*dy;
    $('sunGlow').innerHTML=up?`<defs><linearGradient id="sg" x1="${x1}" y1="${y1}" x2="${1-x1}" y2="${1-y1}"><stop offset="0" stop-color="#ffd58a" stop-opacity="${.65*k+.12}"/><stop offset=".55" stop-color="#ffd58a" stop-opacity="0"/></linearGradient></defs>`+
      Object.values(PLOTS).map(p=>`<rect x="${p.x}" y="112" width="${p.w}" height="462" fill="url(#sg)" pointer-events="none"/>`).join(''):'';
    $('night').innerHTML=up?'':'<rect x="0" y="0" width="900" height="640" fill="#0a120d" opacity=".5" pointer-events="none"/>';
    const sh=$('shadow');
    if(sh){const L=up?Math.min(140,26/Math.tan(Math.max(el,3)*Math.PI/180)):0;sh.setAttribute('transform',`translate(${-dx*L} ${-dy*L})`);sh.style.opacity=up?.32:0}
    const cx=450,cy=340,R=Math.min(Math.abs(dx)>1e-3?440/Math.abs(dx):1e9,Math.abs(dy)>1e-3?300/Math.abs(dy):1e9)-34,sx=cx+dx*R,sy=cy+dy*R;
    $('sunIcon').innerHTML=up?`<g transform="translate(${sx} ${sy})" pointer-events="none"><circle r="30" fill="#ffd58a" opacity=".25"/><circle r="15" fill="#ffc861"/>${[0,45,90,135,180,225,270,315].map(a=>`<line x1="0" y1="-20" x2="0" y2="-27" stroke="#ffc861" stroke-width="3" stroke-linecap="round" transform="rotate(${a})"/>`).join('')}</g>`:'';
  }
  $('sunR').oninput=drawSun;
  function drawPlan(){
    const P=PLANS[HOUSES[cur].plan];if(floor>=P.floors.length)floor=0;const F=P.floors[floor];
    $('floors').innerHTML=P.floors.map((f,i)=>`<button type="button" data-f="${i}" class="${i===floor?'on':''}">${f.t}</button>`).join('');
    $$('#floors button').forEach(b=>b.onclick=()=>{floor=+b.dataset.f;drawPlan()});
    const pi=$('planImg');pi.src=F.img;pi.alt='Планировка: '+HOUSES[cur].name+', '+F.t;
    const cr=F.crop||[0,F.h],ch=cr[1]-cr[0],bx=$('planBox');
    bx.style.aspectRatio=`${F.w}/${ch}`;bx.style.width=`min(100%, calc((100vh - 300px) * ${(F.w/ch).toFixed(3)}))`;
    pi.style.top=`${(-cr[0]/ch*100).toFixed(2)}%`;
    const sv=$('planSvg');sv.setAttribute('viewBox',`0 ${cr[0]} ${F.w} ${ch}`);
    sv.innerHTML=F.rooms.map((r,i)=>`<rect class="rm${r[6]?' has':''}" data-i="${i}" x="${r[2]}" y="${r[3]}" width="${r[4]}" height="${r[5]}" rx="4"/>`+(r[6]?`<circle class="dot" cx="${r[2]+r[4]-22}" cy="${r[3]+22}" r="${F.w/90}"/>`:'')).join('');
    const tip=$('planTip');
    $$('.rm',sv).forEach(el=>{const r=F.rooms[+el.dataset.i];
      el.onmouseenter=()=>{tip.textContent=r[0]+(r[1]?' · '+r[1]:'')+(r[6]?' — нажмите':'');tip.classList.add('show')};
      el.onmousemove=e=>{const b=bx.getBoundingClientRect();tip.style.left=(e.clientX-b.left)+'px';tip.style.top=(e.clientY-b.top)+'px'};
      el.onmouseleave=()=>tip.classList.remove('show');
      if(r[6])el.onclick=()=>selRoom(+el.dataset.i)});
    ORDER=F.rooms.map((r,i)=>[r,i]).filter(([r])=>r[6]).sort((a,b)=>(a[0][2]+a[0][4]/2)-(b[0][2]+b[0][4]/2)||a[0][3]-b[0][3]).map(([,i])=>i);
    $('planNav').style.visibility=ORDER.length?'':'hidden';
    if(ORDER.length)selRoom(ORDER[atEnd?ORDER.length-1:0]);else if(P.viz){$('vizVars').innerHTML='';showViz(...P.viz)}
    atEnd=false;
  }
  function selRoom(i){const F=PLANS[HOUSES[cur].plan].floors[floor],r=F.rooms[i];
    $$('#planSvg .rm').forEach(x=>x.classList.toggle('sel',+x.dataset.i===i));
    $('rCount').textContent=(ORDER.indexOf(i)+1)+' / '+ORDER.length;selVar(r,0)}
  function selVar(r,k){const n=r[6].length,vv=$('vizVars');
    vv.innerHTML=n>1?'<span>Варианты интерьера</span>'+r[6].map((s,j)=>`<button type="button" data-k="${j}" class="${j===k?'on':''}" style="background-image:url(${s})" aria-label="Вариант ${j+1} из ${n}"></button>`).join(''):'';
    $$('button',vv).forEach(b=>b.onclick=()=>selVar(r,+b.dataset.k));
    showViz(r[6][k],r[0],(r[1]?r[1]+' · ':'')+(n>1?`вариант ${k+1} из ${n}`:'вариант интерьера'))}
  function stepRoom(d){const P=PLANS[HOUSES[cur].plan];if(!ORDER.length)return;
    const sel=document.querySelector('#planSvg .rm.sel'),k=ORDER.indexOf(sel?+sel.dataset.i:ORDER[0])+d;
    if(k>=0&&k<ORDER.length)return selRoom(ORDER[k]);
    const nf=floor+d;if(nf>=0&&nf<P.floors.length&&P.floors[nf].rooms.some(r=>r[6])){floor=nf;atEnd=d<0;drawPlan()}
    else selRoom(ORDER[(k+ORDER.length)%ORDER.length])}
  function showViz(src,name,sub){const im=$('vizImg');im.style.opacity=0;
    setTimeout(()=>{im.onload=()=>im.style.opacity=1;im.src=src;im.alt=name},180);$('vizName').textContent=name;$('vizSub').textContent=sub}
  $('rPrev').onclick=()=>stepRoom(-1);$('rNext').onclick=()=>stepRoom(1);
  document.addEventListener('keydown',e=>{
    if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight'||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
    const b=$('planx').getBoundingClientRect();if(b.top<innerHeight*.6&&b.bottom>innerHeight*.4){e.preventDefault();stepRoom(e.key==='ArrowRight'?1:-1)}});
  $$('#types button').forEach(b=>b.onclick=()=>{
    $$('#types button').forEach(x=>x.classList.toggle('on',x===b));cur=b.dataset.t;floor=0;drawHouse();drawPlan();
    const kh=HOUSES[cur].price;$$('#kHouse button').forEach(x=>x.classList.toggle('on',+x.dataset.v===kh));K.price=kh;calc()});
  $$('.plot').forEach(p=>p.onclick=()=>{plot=+p.dataset.p;drawHouse()});
  drawHouse();drawPlan();
})();

/* ==== фигуры: фото проявляется внутри формы, цифры отсчитываются ==== */
(function(){
  const box=$('shapes');if(!box)return;const sh=$$('.shape',box);
  const act=el=>sh.forEach(x=>x.classList.toggle('on',x===el));
  sh.forEach(el=>{el.addEventListener('mouseenter',()=>act(el));el.addEventListener('click',()=>act(el))});
  const count=el=>{const n=el.querySelector('.n'),to=+n.dataset.to,sm=n.querySelector('small').outerHTML,t0=performance.now();
    (function f(t){const p=Math.max(0,Math.min(1,(t-t0)/1400)),v=Math.round(to*(1-Math.pow(1-p,3)));n.innerHTML=v+sm;if(p<1)requestAnimationFrame(f)})(t0)};
  if(!('IntersectionObserver' in window))return;
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){sh.forEach((el,i)=>setTimeout(()=>count(el),i*180));io.disconnect()}}),{threshold:.3});
  io.observe(box);
  if(matchMedia('(hover:none)').matches){let i=0;setInterval(()=>{i=(i+1)%sh.length;act(sh[i])},2800)}
})();

/* ==== живая карта: Leaflet грузится при подлёте к карте, тайлы OSM с серым фильтром (CSS) ==== */
(function(){
  const maps=$$('[data-lmap]');if(!maps.length)return;
  const IC={home:'<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',park:'<path d="M12 3c-3.3 0-6 2.6-6 5.8 0 1 .3 2 .8 2.8A4.3 4.3 0 0 0 9 19.3h2V22h2v-2.7h2a4.3 4.3 0 0 0 2.2-7.7c.5-.8.8-1.8.8-2.8C18 5.6 15.3 3 12 3z"/>',metro:'<path d="M3 18h18v-1.6h-1.5L15.4 5 12 11.6 8.6 5 4.5 16.4H3zm6-8.3 3 5.4 3-5.4 2.3 6.7H6.7z"/>',city:'<path d="M5 21V8l5-3v16zm6 0V3l6 3v15zm7 0v-9l3 1.5V21z"/>',
    shop:'<path d="M3 6h18l-2 9H6zM6 15l-1 4h14M8 21a1 1 0 1 0 0-.1M17 21a1 1 0 1 0 0-.1"/>',school:'<path d="M12 4 1 9l11 5 9-4.1V16h2V9zM5 13v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4l-7 3.2z"/>',pharm:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>'};
  let loading=null;
  const load=()=>loading||(loading=new Promise((ok,no)=>{
    const css=document.createElement('link');css.rel='stylesheet';css.href=SITE.base+'assets/vendor/leaflet/leaflet.css';document.head.appendChild(css);
    const s=document.createElement('script');s.src=SITE.base+'assets/vendor/leaflet/leaflet.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)}));
  function init(el){
    const D=readJSON(el.parentNode.querySelector('[data-lmap-data]'));if(!D||!window.L)return;
    const near=D.near||[],P={};D.points.forEach(p=>P[p.k]=p);
    const m=L.map(el,{scrollWheelZoom:false}).setView([D.points[0].lat,D.points[0].lon],D.zoom||13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(m);
    D.points.forEach(p=>{const nm=p.href?`<a href="${p.href}">${p.name}</a>`:p.name;
      L.marker([p.lat,p.lon],{icon:L.divIcon({className:'',html:`<div class="mk ${p.icon}${near.includes(p.k)?' near '+(p.pos||'up'):(p.pos?' '+p.pos:'')}"><i><svg viewBox="0 0 24 24" width="16" height="16" fill="#fff">${IC[p.icon]||IC.home}</svg></i><b>${nm}<small>${p.sub||''}</small></b></div>`,iconSize:[0,0]})}).addTo(m)});
    if(D.line)L.polyline(D.line,{color:'#806a4a',weight:3,dashArray:'6 8'}).addTo(m);
    m.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    m.on('click',()=>m.scrollWheelZoom.enable());
    const far=()=>el.classList.toggle('far',m.getZoom()<16);far();m.on('zoomend',far);
    const all=L.latLngBounds(D.points.map(p=>[p.lat,p.lon]));
    if(D.fit)m.fitBounds(all,{paddingTopLeft:[60,60],paddingBottomRight:[60,110]});
    $$('.map-pins button',el.parentNode).forEach(b=>b.onclick=()=>{
      $$('.map-pins button',el.parentNode).forEach(x=>x.classList.toggle('on',x===b));const k=b.dataset.p;
      if(k==='all')m.flyToBounds(all,{paddingTopLeft:[60,60],paddingBottomRight:[60,150]});
      else if(k==='near')m.flyToBounds(L.latLngBounds(near.map(n=>[P[n].lat,P[n].lon])),{paddingTopLeft:[80,90],paddingBottomRight:[240,170],maxZoom:16});
      else m.flyTo([P[k].lat,P[k].lon],k==='city'?14:(D.fit?13:15))});
  }
  const go=el=>load().then(()=>init(el)).catch(()=>{});
  if(!('IntersectionObserver' in window)){maps.forEach(go);return}
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);go(e.target)}}),{rootMargin:'600px 0px'});
  maps.forEach(el=>io.observe(el));
})();

/* ==== карта кварталов: подсветка по году ==== */
$$('#pmapSide button').forEach(b=>b.onclick=()=>{
  const was=b.classList.contains('on');$$('#pmapSide button').forEach(x=>x.classList.remove('on'));
  $$('.pmap-svg .pt').forEach(p=>p.classList.remove('dim','hi'));if(was)return;b.classList.add('on');
  $$('.pmap-svg .pt').forEach(p=>{const hit=p.dataset.y.split(' ').includes(b.dataset.y);p.classList.toggle('hi',hit);p.classList.toggle('dim',!hit)});
});

/* ==== полноэкранный слайдер архитектуры: автопрокрутка с полосками прогресса ==== */
(function(){
  const box=$('ax');if(!box)return;const sl=$$('.ax-s',box),bars=$$('#axBars button');let i=0,t=null;
  const go=n=>{i=(n+sl.length)%sl.length;sl.forEach((x,k)=>x.classList.toggle('on',k===i));
    bars.forEach((b,k)=>{b.classList.toggle('past',k<i);b.classList.remove('on');void b.offsetWidth;b.classList.toggle('on',k===i)});
    clearTimeout(t);t=setTimeout(()=>go(i+1),6500)};
  bars.forEach((b,k)=>b.onclick=()=>go(k));$('axPrev').onclick=()=>go(i-1);$('axNext').onclick=()=>go(i+1);
  let x0=null;box.addEventListener('touchstart',e=>x0=e.touches[0].clientX,{passive:true});
  box.addEventListener('touchend',e=>{if(x0===null)return;const d=e.changedTouches[0].clientX-x0;if(Math.abs(d)>40)go(i+(d<0?1:-1));x0=null});
  if('IntersectionObserver' in window)new IntersectionObserver(([e])=>{if(e.isIntersecting&&t===null)go(0)},{threshold:.35}).observe(box);
})();

/* ==== аккордеон «Почему это надёжно» ==== */
$$('.acc-h').forEach(b=>b.onclick=()=>{const it=b.parentElement,was=it.classList.contains('open');
  $$('.acc-i').forEach(i=>i.classList.remove('open'));if(!was)it.classList.add('open')});

/* ==== формы: проверка телефона у поля, отправка на приёмник (адрес есть только в боевой сборке) ==== */
$$('.form form').forEach(f=>{
  const ph=f.querySelector('input[name=phone]'),box=ph.closest('.fl'),ok=f.querySelector('input[name=agree]');
  ph.addEventListener('input',()=>{let d=ph.value.replace(/\D/g,'');if(d[0]==='8')d='7'+d.slice(1);if(d&&d[0]!=='7')d='7'+d;d=d.slice(0,11);
    ph.value=d?('+'+d[0]+(d.length>1?' '+d.slice(1,4):'')+(d.length>4?' '+d.slice(4,7):'')+(d.length>7?'-'+d.slice(7,9):'')+(d.length>9?'-'+d.slice(9,11):'')):'';box.classList.remove('bad')});
  f.onsubmit=e=>{
    e.preventDefault();
    if(ph.value.replace(/\D/g,'').length!==11){box.classList.add('bad');ph.focus();return}
    if(ok&&!ok.checked){ok.focus();ok.closest('.agree').classList.add('bad');return}
    f.page.value=location.pathname;f.src.value=JSON.stringify(window.LEAD_SRC||{});
    const done=()=>f.closest('.form').classList.add('sent');
    if(!SITE.endpoint)return done();
    fetch(SITE.endpoint,{method:'POST',body:new FormData(f)}).then(done,done);
    if(window.ym&&SITE.ym)window.ym(+SITE.ym,'reachGoal','lead');
  };
});
})();
