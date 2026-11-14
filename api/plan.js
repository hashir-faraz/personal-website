/* Serves the budget planner with the right link preview for whoever it is being shared with.

   Chat apps (WhatsApp, Slack, LinkedIn, Google Chat) read the raw HTML and never run JavaScript,
   so the title and picture have to be in the HTML the server sends. The planner itself still runs
   in the browser exactly as before.

   Two kinds of address come through here (see vercel.json):
     /plan/<id>               a shared plan. The company's name goes in the link's title; the
                              picture is a generic pre-made one (a custom picture took too long).
     /tools/budget-planner/   the planner itself.
   Add ?lang=ar to either and the preview is Arabic.

   The company name comes from one quick lookup (plan_preview). It does not count as an "open" in
   Supabase, and if it is slow the preview simply carries no name. The public key below is the same
   one the planner page already uses. */

const fs = require('fs');
const path = require('path');

const SB_URL = 'https://zybfmjymfnlgnxkzxqka.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5YmZtanltZm5sZ254a3p4cWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjY1NzEsImV4cCI6MjExMDE0MjU3MX0.pSdR7SXq6rcE84S7n8LGWXdqB52ITFcf1nDRb8baTh8';

/* the four pictures in /assets/previews (made by api/plan-image.js). Change ?v= to make chat apps
   fetch a new design. */
const img = (kind, lang) => 'https://hashirfaraz.com/assets/previews/' + kind + '-' + lang + '.jpg?v=1';

/* the company name is typed by a stranger: it must never reach the page as markup */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function setMeta(html, attr, name, value) {
  const re = new RegExp('(<meta\\s+' + attr + '="' + name + '"\\s+content=")[^"]*(")');
  return html.replace(re, (m, a, b) => a + value + b);
}

function apply(html, o) {
  html = html.replace(/<title>[^<]*<\/title>/, () => '<title>' + o.title + '</title>');
  html = setMeta(html, 'name', 'description', o.desc);
  html = setMeta(html, 'property', 'og:title', o.title);
  html = setMeta(html, 'property', 'og:description', o.desc);
  html = setMeta(html, 'property', 'og:url', o.url);
  html = setMeta(html, 'property', 'og:image', o.image);
  html = setMeta(html, 'property', 'og:image:type', 'image/jpeg');
  html = setMeta(html, 'property', 'og:image:alt', o.alt);
  html = setMeta(html, 'property', 'og:locale', o.ar ? 'ar_AR' : 'en_GB');
  html = setMeta(html, 'name', 'twitter:title', o.title);
  html = setMeta(html, 'name', 'twitter:description', o.desc);
  html = setMeta(html, 'name', 'twitter:image', o.image);
  return html;
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  const tool = q.tool === '1';
  const id = String(q.id || '');
  const valid = !tool && /^[A-Za-z0-9-]{3,80}$/.test(id);
  const langParam = q.lang === 'ar' ? 'ar' : q.lang === 'en' ? 'en' : null;

  let html = fs.readFileSync(path.join(process.cwd(), 'tools/budget-planner/index.html'), 'utf8');

  if (tool) {
    const ar = langParam === 'ar';
    html = apply(html, ar ? {
      ar: true,
      title: 'مخطّط ميزانية 12 شهر — هاشر فراز',
      desc: 'أجب عن سؤالين واحصل على سنة كاملة من الإيرادات والتكاليف والأرباح — جدول أرباح وخسائر تقدر تطبعه.',
      url: 'https://hashirfaraz.com/tools/budget-planner/?lang=ar',
      image: img('tool', 'ar'),
      alt: 'مخطّط ميزانية 12 شهر: جدول أرباح وخسائر لسنة كاملة'
    } : {
      ar: false,
      title: '12-Month Budget Planner — Hashir Faraz',
      desc: 'Answer two questions and get a full year of revenue, costs and profit — a real P&amp;L you can print.',
      url: 'https://hashirfaraz.com/tools/budget-planner/',
      image: img('tool', 'en'),
      alt: 'A full year of profit &amp; loss, without the spreadsheet — the 12-Month Budget Planner'
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(html);
    return;
  }

  /* a plan link is a private-ish page: keep it out of search results */
  html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex">');

  let info = null;
  if (valid) {
    try {
      const r = await fetch(SB_URL + '/rest/v1/rpc/plan_preview', {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_id: id }),
        signal: AbortSignal.timeout(1500)
      });
      if (r.ok) info = await r.json();
    } catch (e) { /* no company name in the title; the rest of the preview is unaffected */ }
  }

  /* ?lang=ar on the link wins (it is what the Arabic Share button copies); otherwise the plan's own language */
  const ar = langParam ? langParam === 'ar' : !!(info && info.lang === 'ar');
  let name = info && info.company ? String(info.company).trim() : '';
  if (name.length > 60) name = name.slice(0, 59) + '…';
  const n = esc(name);

  html = apply(html, {
    ar,
    title: ar ? (n ? n + ' — ' : '') + 'خطة ميزانية 12 شهر' : (n ? n + ' — ' : '') + '12-Month Budget Plan',
    desc: ar
      ? 'سنة كاملة من الإيرادات والتكاليف والأرباح' + (n ? ' لـ ' + n : '') + '.'
      : 'A full year of revenue, costs and profit' + (n ? ' for ' + n : '') + '.',
    url: 'https://hashirfaraz.com/plan/' + (valid ? id : ''),
    image: img('plan', ar ? 'ar' : 'en'),
    alt: ar ? 'خطة مالية لـ 12 شهر' : 'A 12-month financial plan'
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  /* short, so a renamed company shows up soon; the planner loads the live plan itself */
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(html);
};
