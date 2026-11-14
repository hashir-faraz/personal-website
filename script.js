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

/* ---------- services card: "tell me what you're looking for" ----------
   Submit stays soft until there is a phone number or an email in. WhatsApp always works, and carries
   whatever has been typed. The message is stored through one database function (supabase/leads.sql). */
(function(){
  const form=document.querySelector('.svc-form'); if(!form) return;
  const contact=form.elements.contact, need=form.elements.need, send=form.querySelector('.ff-send');
  const wa=form.querySelector('.ff-wa'), note=form.querySelector('.ff-note');
  const SB_URL='https://zybfmjymfnlgnxkzxqka.supabase.co';
  const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5YmZtanltZm5sZ254a3p4cWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjY1NzEsImV4cCI6MjExMDE0MjU3MX0.pSdR7SXq6rcE84S7n8LGWXdqB52ITFcf1nDRb8baTh8';
  const lang=document.documentElement.lang==='ar'?'ar':'en';
  const base=wa.getAttribute('href').split('?')[0], pre=wa.dataset.pre, fallback=wa.dataset.default;
  const hint=note.innerHTML;
  const valid=v=>{ v=v.trim(); return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || v.replace(/\D/g,'').length>=7; };
  function sync(){
    send.disabled=!valid(contact.value);
    const t=need.value.trim();
    wa.href=base+'?text='+encodeURIComponent(t?pre+t:fallback);
    if(note.classList.contains('ok')||note.classList.contains('err')){ note.className='ff-note'; note.innerHTML=hint; }
  }
  contact.addEventListener('input',sync); need.addEventListener('input',sync);
  form.addEventListener('submit',e=>{
    e.preventDefault();
    if(send.disabled||form.elements.company.value) return;
    send.disabled=true;
    fetch(SB_URL+'/rest/v1/rpc/submit_lead',{method:'POST',
      headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({p_contact:contact.value.trim(),p_need:need.value.trim(),p_lang:lang,p_source:'services_end'})})
    .then(r=>{ if(!r.ok) throw new Error(r.status);
      note.className='ff-note ok'; note.textContent=note.dataset.ok;
      if(window.gtag) gtag('event','lead_submit',{form:'services_end'});
      if(window.fbq) fbq('track','Lead');
      contact.value=''; need.value=''; wa.href=base+'?text='+encodeURIComponent(fallback);
    })
    .catch(()=>{ note.className='ff-note err'; note.textContent=note.dataset.err; send.disabled=!valid(contact.value); });
  });
  sync();
})();

/* ---------- analyst credentials: the little "i" opens on hover, focus and tap ---------- */
(function(){
  const box=document.querySelector('.creds'); if(!box) return;
  const btn=box.querySelector('.cred-i');
  const set=on=>{ box.classList.toggle('open',on); btn.setAttribute('aria-expanded',on?'true':'false'); };
  btn.addEventListener('click',e=>{ e.stopPropagation(); set(!box.classList.contains('open')); });
  document.addEventListener('click',e=>{ if(!box.contains(e.target)) set(false); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') set(false); });
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
