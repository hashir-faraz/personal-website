/* ---------- page settle: after scrolling stops, glide to the page you were heading to ----------
   Gated on pointer type (mouse/trackpad), NOT window size, so window size / OS scaling can't disable it.
   - Waits until wheel input (including trackpad inertia) has been quiet, so it never fights a gesture.
   - Direction-aware: a small nudge past a page edge carries on to the next page, a small nudge
     back returns, instead of always snapping to whichever edge happens to be nearest.
   - Its own rAF glide, cancelled instantly by any wheel/touch/key/mouse input.
   Sections taller than the window (pinned services, or long sections on small windows) allow
   free rest inside and expose a top-aligned and a bottom-aligned target. */
(function(){
  const fine=window.matchMedia('(pointer:fine)');
  const QUIET=180;
  let anim=0, tmr=0, lastInput=0, lastY=window.scrollY, dir=0;

  function snapData(){
    const vh=window.innerHeight, maxY=document.documentElement.scrollHeight-vh, pts=new Set(), zones=[];
    document.querySelectorAll('.page').forEach(s=>{
      const top=Math.round(s.getBoundingClientRect().top+window.scrollY), h=Math.round(s.offsetHeight);
      pts.add(Math.min(top,maxY));
      if(h>vh+120){ pts.add(Math.min(top+h-vh,maxY)); zones.push([top+4, top+h-vh-4]); }
    });
    return {pts:[...pts].sort((a,b)=>a-b),zones};
  }
  function stop(){ if(anim){cancelAnimationFrame(anim);anim=0;} }
  function glide(to){
    const from=window.scrollY, d=to-from, dur=Math.min(720,Math.max(360,Math.abs(d)*.55)), t0=performance.now();
    stop();
    const step=now=>{
      const p=Math.min(1,(now-t0)/dur), e=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
      window.scrollTo(0,Math.round(from+d*e));
      if(p<1) anim=requestAnimationFrame(step); else { anim=0; lastY=window.scrollY; }
    };
    anim=requestAnimationFrame(step);
  }
  function settle(){
    if(!fine.matches||anim) return;
    const wait=QUIET-(performance.now()-lastInput);
    if(wait>0){ tmr=setTimeout(settle,wait+10); return; }
    const y=window.scrollY, {pts,zones}=snapData();
    if(zones.some(z=>y>z[0]&&y<z[1])) return;
    let prev=null,next=null;
    for(const p of pts){ if(p<=y) prev=p; else if(next===null) next=p; }
    if(prev===null||next===null) { const t=prev??next; if(t!==null&&Math.abs(t-y)>1) glide(t); return; }
    if(y-prev<2) return;
    const f=(y-prev)/(next-prev);
    const target = dir>0 ? (f>.1?next:prev) : dir<0 ? (f<.9?prev:next) : (f<.5?prev:next);
    glide(target);
  }
  window.addEventListener('scroll',()=>{
    if(anim) return;
    const y=window.scrollY;
    if(y!==lastY) dir=y>lastY?1:-1;
    lastY=y;
    clearTimeout(tmr); tmr=setTimeout(settle,QUIET);
  },{passive:true});
  ['wheel','touchstart','keydown','mousedown'].forEach(ev=>window.addEventListener(ev,()=>{ lastInput=performance.now(); stop(); },{passive:true}));
  window.__glideTo=glide;
})();

/* ---------- services: the section pins for one frame while vertical scroll slides the track sideways ---------- */
(function(){
  const sec=document.getElementById('p-services');
  const pin=sec.querySelector('.svc-pin'), view=sec.querySelector('.svc-view'), track=sec.querySelector('.svc-track');
  const cats=[...track.querySelectorAll('.svc-cat')], tabs=[...sec.querySelectorAll('.svc-rail button')];
  const told=new Set();
  let dist=0, pad=0, raf=0;
  view.classList.add('pinned');
  function measure(){
    track.style.transform='none';
    dist=Math.max(0,track.scrollWidth-view.clientWidth);
    pad=cats[0].offsetLeft;
    sec.style.height=(pin.offsetHeight+dist)+'px';
    update();
  }
  function update(){
    raf=0;
    const x=dist?Math.min(dist,Math.max(0,-sec.getBoundingClientRect().top)):0;
    const vw=view.clientWidth;
    track.style.transform='translate3d('+(-x)+'px,0,0)';
    let on=0;
    cats.forEach((c,i)=>{
      // share of the category that has scrolled into view, drawn as the rail underline
      const seen=Math.min(1,Math.max(0,(x+vw-c.offsetLeft)/c.offsetWidth));
      tabs[i].style.setProperty('--seen',seen.toFixed(3));
      if(c.offsetLeft<x+vw*.6) on=i;
    });
    tabs.forEach((t,i)=>t.classList.toggle('on',i===on));
    const row=cats[on].dataset.row;
    if(on>0&&!told.has(row)){told.add(row); if(window.gtag) gtag('event','services_row_scroll',{row});}
  }
  tabs.forEach((t,i)=>t.addEventListener('click',()=>{
    const x=Math.min(dist,Math.max(0,cats[i].offsetLeft-pad));
    const y=Math.round(sec.getBoundingClientRect().top+window.scrollY+x);
    if(window.__glideTo) window.__glideTo(y); else window.scrollTo(0,y);
  }));
  // sideways trackpad swipes over the track move the page too; on the Arabic page the
  // viewport is mirrored, so a swipe has to be read the other way round to feel right
  const rtl = document.documentElement.dir === 'rtl';
  view.addEventListener('wheel',e=>{
    if(dist&&Math.abs(e.deltaX)>Math.abs(e.deltaY)){e.preventDefault();window.scrollBy(0,rtl?-e.deltaX:e.deltaX);}
  },{passive:false});
  window.addEventListener('scroll',()=>{ if(!raf) raf=requestAnimationFrame(update); },{passive:true});
  window.addEventListener('resize',measure);
  window.addEventListener('load',measure);
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(measure);
  measure();
})();

/* ---------- rotors — inside-out reveal (width collapse/expand) ---------- */
(function(){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rotors=[];
  document.querySelectorAll('.rotor').forEach(rotor=>{
    const words = rotor.dataset.words.split(',');
    const measure = w=>{
      const probe=document.createElement('span');
      probe.style.cssText='position:absolute;visibility:hidden;white-space:nowrap;font:inherit';
      probe.textContent=w;
      rotor.appendChild(probe);
      const px=probe.offsetWidth;
      probe.remove();
      return px;
    };
    const st={rotor,words,measure,i:0};
    rotors.push(st);
    rotor.style.width = measure(rotor.textContent.trim())+'px';
    if(reduce) return;
    setInterval(()=>{
      rotor.style.width='0px';
      setTimeout(()=>{
        st.i=(st.i+1)%words.length;
        rotor.textContent=words[st.i];
        rotor.style.width=measure(words[st.i])+'px';
      },360);
    },2800);
  });
  // re-measure once webfonts are in, so widths (and centering) are exact
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(()=>{
      rotors.forEach(st=>{ st.rotor.style.width=st.measure(st.rotor.textContent.trim())+'px'; });
    });
  }
})();

/* ---------- logo marquee: endless loop ----------
   Each row gets two extra copies (so the strip is always longer than the window, at any size),
   then slides exactly one set width per cycle; speed is kept constant in px/s. */
(function(){
  const rows=[...document.querySelectorAll('.mq-row')];
  const SPEED=[20,16];
  rows.forEach(row=>{
    const set=[...row.children];
    row.dataset.n=set.length;
    for(let k=0;k<2;k++) set.forEach(img=>{ const c=img.cloneNode(); c.alt=''; c.setAttribute('aria-hidden','true'); row.appendChild(c); });
  });
  function size(){
    rows.forEach((row,i)=>{
      const kids=row.children, period=kids[+row.dataset.n].offsetLeft-kids[0].offsetLeft;
      if(period<=0) return;
      row.style.setProperty('--shift',(-period)+'px');
      row.style.animationDuration=(period/SPEED[i%2])+'s';
    });
  }
  window.addEventListener('resize',size);
  window.addEventListener('load',size);
  size();
})();

/* ---------- floating button: hidden while page 1 is on screen ---------- */
(function(){
  const hero=document.getElementById('p-problem');
  const fab=document.querySelector('.float-wa');
  if(!hero||!fab||!('IntersectionObserver' in window)) return;
  new IntersectionObserver(es=>{
    fab.classList.toggle('hide', es[0].isIntersecting);
  },{threshold:.25}).observe(hero);
})();

/* ---------- demo tabs: switch after-demo AND before-scene together ---------- */
document.querySelectorAll('.seg').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.seg').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.demo').forEach(d=>d.classList.remove('active'));
    document.querySelectorAll('.bscene').forEach(s=>s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.demo).classList.add('active');
    const scene=document.getElementById(btn.dataset.before);
    void scene.offsetWidth; // reflow so entrance animations restart
    scene.classList.add('active');
  });
});

/* ---------- sales pipeline demo ---------- */
(function(){
  const stages=['Contacted','Meeting','Quote','Closed'];
  const leads=[
    {n:'Lead A',v:18000,lc:'12 Mar',s:3},
    {n:'Lead B',v:26000,lc:'28 Mar',s:2},
    {n:'Lead C',v:15000,lc:'02 Mar',s:0},
    {n:'Lead D',v:21000,lc:'25 Mar',s:2},
  ];
  // s = number of boxes ticked: 0 open, 1 cold, 2 warm, 3 hot, 4 closed
  const names=['open','cold','warm','hot','closed'];
  const labels=['Open','Cold','Warm','Hot','Closed'];
  const weights=[0,0.25,0.5,0.95,1];
  const box=document.getElementById('leads');
  const fmt=n=>'QAR '+Math.round(n).toLocaleString();
  function render(){
    box.innerHTML='';
    leads.forEach(l=>{
      const row=document.createElement('div');row.className='lead';
      row.innerHTML='<b>'+l.n+'</b><span class="num">'+fmt(l.v)+'</span><span class="date">'+l.lc+'</span>';
      const ck=document.createElement('div');ck.className='checks';
      stages.forEach((s,si)=>{
        const lab=document.createElement('label');lab.className='chk';
        const inp=document.createElement('input');inp.type='checkbox';inp.checked=si<l.s;
        inp.onchange=()=>{ l.s = inp.checked ? si+1 : si; render(); };
        lab.appendChild(inp);
        ck.appendChild(lab);
      });
      row.appendChild(ck);
      const chip=document.createElement('span');
      chip.className='chip '+names[l.s];chip.textContent=labels[l.s];
      row.appendChild(chip);
      box.appendChild(row);
    });
    let hot=0,warm=0,cold=0,proj=0;
    leads.forEach(l=>{
      proj+=l.v*weights[l.s];
      if(l.s>=3)hot+=l.v; else if(l.s===2)warm+=l.v; else if(l.s===1)cold+=l.v;
    });
    document.getElementById('k-hot').textContent=fmt(hot);
    document.getElementById('k-warm').textContent=fmt(warm);
    document.getElementById('k-cold').textContent=fmt(cold);
    document.getElementById('k-proj').textContent=fmt(proj);
  }
  render();
})();

/* ---------- cashflow: diverging monthly column with category filters ---------- */
(function(){
  const revCats=[{n:'Retainers'},{n:'Products'}];
  const expCats=[{n:'Payroll'},{n:'Rent'},{n:'Marketing'},{n:'Other'}];
  const rev=[ [30,16],[32,15],[29,18],[34,18],[37,20],[35,18],
              [38,21],[42,19],[41,23],[44,22],[46,25],[50,28] ];
  const exp=[ [22,9,6,4],[22,9,7,3],[23,9,8,5],[23,9,6,4],[24,9,9,5],[24,9,7,4],
              [24,10,8,6],[25,10,9,4],[25,10,11,5],[26,10,9,6],[26,10,12,5],[27,10,14,7] ];
  const on={r:[true,true],e:[true,true,true,true]};
  const upMax=Math.max(...rev.map(m=>m.reduce((a,b)=>a+b,0)));
  const downMax=Math.max(...exp.map(m=>m.reduce((a,b)=>a+b,0)));
  const span=upMax+downMax;
  const basePct=downMax/span*100;
  const bars=document.getElementById('finbars');
  bars.style.setProperty('--base', basePct+'%');

  function chips(holder,cats,key,color){
    cats.forEach((c,i)=>{
      const b=document.createElement('button');
      b.className='cfc on';b.style.setProperty('--c',color);
      b.textContent=c.n;
      b.onclick=()=>{on[key][i]=!on[key][i];b.classList.toggle('on');b.classList.toggle('off');draw();};
      holder.appendChild(b);
    });
  }
  const revHolder=document.getElementById('cf-rev'), expHolder=document.getElementById('cf-exp');
  if(!revHolder.querySelector('.cfc')){
    chips(revHolder,revCats,'r','#0A8754');
    chips(expHolder,expCats,'e','#2563EB');
  }

  function draw(){
    bars.innerHTML='<span class="zero"></span>';
    rev.forEach((rm,mi)=>{
      const em=exp[mi];
      const m=document.createElement('div');m.className='fin-m';
      const rTot=rm.reduce((a,v,i)=>a+(on.r[i]?v:0),0);
      const eTot=em.reduce((a,v,i)=>a+(on.e[i]?v:0),0);

      const rs=document.createElement('div');rs.className='fin-stack rev';
      rs.style.bottom=basePct+'%';rs.style.height=(rTot/span*100)+'%';
      rm.forEach((v,i)=>{ if(!on.r[i])return;
        const s=document.createElement('i');s.style.height='calc('+(v/(rTot||1)*100)+'% - 1px)';
        s.dataset.tip=revCats[i].n+' · '+v+'k';rs.appendChild(s);});

      const es=document.createElement('div');es.className='fin-stack exp';
      es.style.bottom=((downMax-eTot)/span*100)+'%';es.style.height=(eTot/span*100)+'%';
      em.forEach((v,i)=>{ if(!on.e[i])return;
        const s=document.createElement('i');s.style.height='calc('+(v/(eTot||1)*100)+'% - 1px)';
        s.dataset.tip=expCats[i].n+' · '+v+'k';es.appendChild(s);});

      const tl=document.createElement('span');tl.className='fin-lab';
      tl.textContent=rTot+'k';
      tl.style.bottom='calc('+(basePct+rTot/span*100)+'% + 3px)';

      const bl=document.createElement('span');bl.className='fin-lab';
      bl.textContent=eTot+'k';
      bl.style.bottom='calc('+((downMax-eTot)/span*100)+'% - 14px)';

      const net=rTot-eTot;
      const dot=document.createElement('span');dot.className='net-dot';
      dot.style.bottom=(basePct+net/span*100)+'%';
      dot.dataset.tip='Net '+(net>=0?'+':'')+net+'k';

      m.append(rs,es,tl,bl,dot);
      bars.appendChild(m);
    });
  }
  draw();

  // pretty tooltip
  const tip=document.createElement('div');tip.className='cftip';document.body.appendChild(tip);
  bars.addEventListener('mouseover',e=>{
    const t=e.target.closest('[data-tip]'); if(!t)return;
    const r=t.getBoundingClientRect();
    tip.textContent=t.dataset.tip;
    tip.style.left=(r.left+r.width/2)+'px';
    tip.style.top=r.top+'px';
    tip.classList.add('show');
  });
  bars.addEventListener('mouseout',()=>tip.classList.remove('show'));
})();

/* ---------- post comparison: head-to-head ---------- */
(function(){
  const posts=[
    {n:'Reel A',t:'Reel',reach:48200,likes:2100,com:96,sh:310,sv:520},
    {n:'Carousel A',t:'Carousel',reach:21400,likes:1350,com:150,sh:88,sv:940},
    {n:'Static A',t:'Static',reach:9800,likes:610,com:42,sh:35,sv:120},
    {n:'Reel B',t:'Reel',reach:62500,likes:3400,com:210,sh:640,sv:410},
    {n:'Carousel B',t:'Carousel',reach:17800,likes:990,com:74,sh:120,sv:730},
    {n:'Reel C',t:'Reel',reach:30100,likes:1500,com:180,sh:220,sv:260},
  ];
  posts.forEach(p=>p.er=((p.likes+p.com+p.sh+p.sv)/p.reach*100));
  const selA=document.getElementById('pc-a'), selB=document.getElementById('pc-b');
  posts.forEach((p,i)=>{selA.add(new Option(p.n,i));selB.add(new Option(p.n,i));});
  selA.value=0; selB.value=1;
  const fmt=n=>n>=1000?(n/1000).toFixed(1).replace('.0','')+'k':(''+ (Math.round(n*10)/10));
  const metrics=[['Reach',p=>p.reach],['Comments',p=>p.com],['Shares',p=>p.sh],['Saves',p=>p.sv],['Engagement %',p=>p.er]];
  function render(){
    const a=posts[selA.value], b=posts[selB.value];
    const box=document.getElementById('h2h');
    box.innerHTML=metrics.map(([lab,f])=>{
      const va=f(a), vb=f(b), max=Math.max(va,vb)||1;
      const wa=(va/max*44).toFixed(1), wb=(vb/max*44).toFixed(1);
      const aw=va>vb, bw=vb>va;
      return '<div class="h2h-row"><div class="h2h-lab">'+lab+'</div>'+
        '<div class="h2h-track">'+
        '<span class="hbar a '+(aw?'glow':'dim')+'" style="width:'+wa+'%"></span>'+
        '<span class="hbar b '+(bw?'glow':'dim')+'" style="width:'+wb+'%"></span>'+
        '<span class="hval a" style="--w:'+wa+'%">'+fmt(va)+'</span>'+
        '<span class="hval b" style="--w:'+wb+'%">'+fmt(vb)+'</span>'+
        '</div></div>';
    }).join('');
  }
  selA.onchange=render; selB.onchange=render; render();
})();

/* ---------- team kpis: single member, score ring ---------- */
(function(){
  const m={n:'Team Member',k:[['Deals touched',32,30,0],['Follow-ups',28,35,0],['On-time %',92,90,0],['Quality /10',7.5,8,0],['Response time (hrs)',4.9,4,1],['Attendance %',96,95,0]]};
  document.getElementById('tk-name').textContent=m.n;
  document.getElementById('tk-meters').innerHTML=m.k.map(([lab,v,t,inv])=>{
    const hit = inv ? v<=t : v>=t;
    const span = t*1.4;
    const fill = Math.min(100, v/span*100);
    const tick = Math.min(96, t/span*100);
    return '<div class="meter"><div class="mrow"><span>'+lab+'</span><b>'+v+' <em>/ '+t+'</em></b></div>'+
      '<div class="mtrack"><i class="'+(hit?'hit':'')+'" style="width:'+fill+'%"></i><span class="tick" style="left:'+tick+'%"></span></div></div>';
  }).join('');
  const score=Math.round(m.k.reduce((a,[l,v,t,inv])=>a+Math.min(100,inv?t/Math.max(v,.01)*100:v/t*100),0)/m.k.length);
  document.getElementById('tk-score').textContent=score+'%';
  const c=270.2;
  document.getElementById('tk-ringfg').style.strokeDashoffset=c*(1-score/100);
})();

/* ---------- analytics: GA4 + Meta Pixel (IDs added at deploy) ---------- */
(function(){
  const GA_ID='G-LQL6JN983Z';          // <- paste GA4 Measurement ID
  const META_PIXEL_ID='868248209477462'; // <- paste Meta Pixel ID
  const live=id=>!/X{4,}/.test(id);
  if(live(GA_ID)){
    const s=document.createElement('script');s.async=true;
    s.src='https://www.googletagmanager.com/gtag/js?id='+GA_ID;
    document.head.appendChild(s);
    window.dataLayer=window.dataLayer||[];
    window.gtag=function(){dataLayer.push(arguments);};
    gtag('js',new Date());gtag('config',GA_ID);
  }
  if(live(META_PIXEL_ID)){
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init',META_PIXEL_ID);fbq('track','PageView');
  }
  // conversion event on every WhatsApp button
  document.querySelectorAll('a[data-tool]').forEach(a=>{
    a.addEventListener('click',()=>{ if(window.gtag)gtag('event','tool_open',{tool:a.dataset.tool}); });
  });
  document.querySelectorAll('a[href*="wa.me"]').forEach(a=>{
    const label=a.dataset.wa || (a.textContent.trim()||'whatsapp').toLowerCase().replace(/\s+/g,'_').slice(0,40) || 'whatsapp';
    a.addEventListener('click',()=>{
      if(window.gtag)gtag('event','whatsapp_click',{button:label});
      if(window.fbq)fbq('track','Contact',{content_name:label});
    });
  });
})();
