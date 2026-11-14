/* Serves the budget planner for a /plan/<id> link, with that company's name in the
   link preview (the title WhatsApp, Slack, LinkedIn and Google Chat show).

   Chat apps read the raw HTML and never run JavaScript, so the name has to be in the HTML
   the server sends. The planner itself still loads the plan in the browser as before.

   Only the company name and language are looked up (plan_preview), which does not count as
   an "open" in Supabase. The public key below is the same one the planner page already uses. */

const fs = require('fs');
const path = require('path');

const SB_URL = 'https://zybfmjymfnlgnxkzxqka.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5YmZtanltZm5sZ254a3p4cWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjY1NzEsImV4cCI6MjExMDE0MjU3MX0.pSdR7SXq6rcE84S7n8LGWXdqB52ITFcf1nDRb8baTh8';

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

module.exports = async function handler(req, res) {
  const id = String((req.query && req.query.id) || '');
  const valid = /^[A-Za-z0-9-]{3,80}$/.test(id);
  /* the planner's own page opened in Arabic (/tools/budget-planner/?lang=ar) comes through here too,
     so its link preview can be in Arabic; the English page is plain static HTML */
  const toolAr = !!(req.query && req.query.tool === 'ar');

  let html = fs.readFileSync(path.join(process.cwd(), 'tools/budget-planner/index.html'), 'utf8');

  /* a plan link is a private-ish page: keep it out of search results (the tool page itself stays public) */
  if (!toolAr) html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex">');

  let info = null;
  if (valid) {
    try {
      const r = await fetch(SB_URL + '/rest/v1/rpc/plan_preview', {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_id: id }),
        signal: AbortSignal.timeout(2500)
      });
      if (r.ok) info = await r.json();
    } catch (e) { /* no preview name: the normal planner preview stays */ }
  }

  if (info && info.company) {
    let name = String(info.company).trim();
    if (name.length > 60) name = name.slice(0, 59) + '…';
    const ar = info.lang === 'ar';
    const title = esc(ar ? name + ' — خطة ميزانية 12 شهر' : name + ' — 12-Month Budget Plan');
    const desc = esc(ar
      ? 'سنة كاملة من الإيرادات والتكاليف والأرباح لـ ' + name + '. افتح الخطة وكمّل عليها.'
      : 'A full year of revenue, costs and profit for ' + name + '. Open the plan and keep working on it.');
    const url = 'https://hashirfaraz.com/plan/' + id;
    const img = 'https://hashirfaraz.com/api/plan-image?id=' + id + '&v=' + (info.v || 0);
    const alt = esc(ar ? 'الخطة المالية لـ ' + name : 'The 12-month financial plan for ' + name);

    html = html.replace(/<title>[^<]*<\/title>/, () => '<title>' + title + '</title>');
    html = setMeta(html, 'name', 'description', desc);
    html = setMeta(html, 'property', 'og:title', title);
    html = setMeta(html, 'property', 'og:description', desc);
    html = setMeta(html, 'property', 'og:url', url);
    html = setMeta(html, 'name', 'twitter:title', title);
    html = setMeta(html, 'name', 'twitter:description', desc);
    html = setMeta(html, 'property', 'og:image', img);
    html = setMeta(html, 'property', 'og:image:alt', alt);
    html = setMeta(html, 'name', 'twitter:image', img);
    if (ar) html = setMeta(html, 'property', 'og:locale', 'ar_AR');
  }

  if (toolAr) {
    const title = 'مخطّط ميزانية 12 شهر — هاشر فراز';
    const desc = 'أجب عن سؤالين واحصل على سنة كاملة من الإيرادات والتكاليف والأرباح — جدول أرباح وخسائر تقدر تطبعه.';
    const img = 'https://hashirfaraz.com/api/plan-image?mode=tool&lang=ar';
    html = html.replace(/<title>[^<]*<\/title>/, () => '<title>' + title + '</title>');
    html = setMeta(html, 'name', 'description', desc);
    html = setMeta(html, 'property', 'og:title', title);
    html = setMeta(html, 'property', 'og:description', desc);
    html = setMeta(html, 'property', 'og:url', 'https://hashirfaraz.com/tools/budget-planner/?lang=ar');
    html = setMeta(html, 'property', 'og:image', img);
    html = setMeta(html, 'property', 'og:image:alt', 'مخطّط ميزانية 12 شهر: جدول أرباح وخسائر لسنة كاملة');
    html = setMeta(html, 'property', 'og:locale', 'ar_AR');
    html = setMeta(html, 'name', 'twitter:title', title);
    html = setMeta(html, 'name', 'twitter:description', desc);
    html = setMeta(html, 'name', 'twitter:image', img);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  /* short, so a renamed company shows up soon; the planner loads the live plan itself */
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.status(200).send(html);
};
