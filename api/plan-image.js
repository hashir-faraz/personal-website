/* The picture shown when a link is pasted into WhatsApp, Slack, LinkedIn and so on.

   Three versions, all drawn on the fly with @vercel/og:
     /api/plan-image?id=<plan>      a shared plan: the company's name, a sheet carrying its real
                                    year totals, and the P&L table peeking out from behind it
     /api/plan-image?mode=tool      the planner page itself (before anyone has a plan): a headline,
                                    an example sheet and a call to action
     ...&lang=ar                    the tool version in Arabic (a plan follows its own language)

   Arabic is mirrored: text on the right, cards on the left, table columns reversed, no letter
   spacing (it breaks the joins). Fonts and the logo are embedded so nothing is fetched. */

import { ImageResponse } from '@vercel/og';
import { MANROPE_800, MANROPE_500, CAIRO_700 } from './_fonts.js';
import { LOGO } from './_logo.js';

export const config = { runtime: 'edge' };

const SB_URL = 'https://zybfmjymfnlgnxkzxqka.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5YmZtanltZm5sZ254a3p4cWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjY1NzEsImV4cCI6MjExMDE0MjU3MX0.pSdR7SXq6rcE84S7n8LGWXdqB52ITFcf1nDRb8baTh8';

const INDIGO = '#3533CD', DEEP = '#28279B', INK = '#101014', GREY = '#85858F', LINE = '#E7E6E1';
const GREEN = '#0A8754', RED = '#C8374B';
const LOGO_RATIO = 420 / 259;

const T = {
  en: {
    eyebrow: '12-MONTH FINANCIAL PLAN', built: 'Built with', yearOne: 'YEAR 1', revenue: 'REVENUE',
    costs: 'COSTS', net: 'NET PROFIT', months: '12 MONTHS', example: 'EXAMPLE', pl: 'PROFIT & LOSS',
    year: 'YEAR', toDate: 'PROFIT TO DATE', toolEyebrow: 'FREE · NO SIGN-UP',
    toolTitle: '12-Month Budget Planner', cta: 'Build your plan free', fallbackName: 'Your business'
  },
  ar: {
    eyebrow: 'الخطة المالية · 12 شهر', built: 'مبني بـ', yearOne: 'السنة الأولى', revenue: 'الإيراد',
    costs: 'التكاليف', net: 'صافي الربح', months: '12 شهر', example: 'مثال', pl: 'الأرباح والخسائر',
    year: 'السنة', toDate: 'الربح المتراكم', toolEyebrow: 'مجاني · بدون تسجيل',
    toolTitle: 'مخطّط ميزانية 12 شهر', cta: 'ابنِ خطتك مجانًا', fallbackName: 'شغلك'
  }
};

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ar: ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس']
};

/* an example year for the planner's own picture: a slow start that turns profitable */
function sample(lang) {
  const r = [60000, 68000, 76000, 86000, 96000, 108000, 120000, 132000, 146000, 160000, 174000, 190000];
  const x = [78000, 78000, 80000, 82000, 84000, 88000, 92000, 96000, 100000, 104000, 108000, 112000];
  return { c: 'QAR', r, x, n: r.map((v, i) => v - x[i]), l: MONTHS[lang] };
}

function font(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function h(type, style, children) {
  return { type, props: { style: { display: 'flex', ...style }, children } };
}
function logo(height) {
  return { type: 'img', props: { src: LOGO, width: Math.round(height * LOGO_RATIO), height } };
}

function compact(n) {
  const a = Math.abs(n);
  let s;
  if (a >= 1e6) s = (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  else if (a >= 1e3) s = (a / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
  else s = String(Math.round(a));
  return s;
}
const signed = (n) => (n < 0 ? '-' : '') + compact(n);
const total = (a) => a.reduce((p, q) => p + q, 0);

/* twelve little bars, one per month's profit: green above the line, red below */
function bars(net) {
  const max = Math.max(1, ...net.map((v) => Math.abs(v)));
  const half = 46;
  return h('div', { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: half * 2 + 4 },
    net.map((v) => {
      const len = Math.max(4, Math.round((Math.abs(v) / max) * half));
      const up = v >= 0;
      return h('div', { flexDirection: 'column', width: 24, height: half * 2 + 4, justifyContent: 'center', alignItems: 'center' }, [
        h('div', { width: 24, height: half, alignItems: 'flex-end', justifyContent: 'center' },
          up ? [h('div', { width: 24, height: len, background: GREEN, borderRadius: 6 })] : []),
        h('div', { width: 24, height: 4, background: LINE }),
        h('div', { width: 24, height: half, alignItems: 'flex-start', justifyContent: 'center' },
          up ? [] : [h('div', { width: 24, height: len, background: RED, borderRadius: 6 })])
      ]);
    }));
}
function skeletonBars() {
  const pattern = [28, 36, 32, 44, 50, 46, 58, 56, 68, 64, 76, 82];
  return h('div', { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', height: 98 },
    pattern.map((p) => h('div', { width: 24, height: p, background: '#E3E2F7', borderRadius: 6 })));
}

/* the P&L table behind the main card. Only its top strip and its last column and a half show,
   so it carries column heads and figures, not row labels you could never read */
function backCard(sum, t, rtl, ar) {
  const W = { label: 170, m: 92, year: 104 };
  const ls = ar ? 0 : 1.5;
  const dir = rtl ? 'row-reverse' : 'row';
  const l = sum && Array.isArray(sum.l) && sum.l.length === 12 ? sum.l : null;
  const lab = (i) => { const v = l ? String(l[i]) : 'M' + (i + 1); return ar ? v : v.toUpperCase(); };
  const pill = () => h('div', { width: 44, height: 14, background: '#D9D8F2', borderRadius: 7 }, []);

  const head = (txt, w, color) => h('div', { width: w, justifyContent: 'center', fontSize: 17, fontWeight: 800, color, letterSpacing: ls }, txt);
  const header = h('div', { flexDirection: dir, height: 58, background: '#E4E3F8', alignItems: 'center' }, [
    h('div', { width: W.label, padding: '0 14px', fontSize: 15, fontWeight: 800, color: INDIGO, letterSpacing: ls,
      justifyContent: rtl ? 'flex-end' : 'flex-start' }, t.pl),
    head(lab(9), W.m, '#6B6AA8'), head(lab(10), W.m, '#6B6AA8'), head(lab(11), W.m, '#6B6AA8'),
    head(t.year, W.year, INDIGO)
  ]);

  /* cells: [{t:'12K', c:colour}] or null for a grey placeholder */
  const row = (label, cells, bg) => h('div', {
    flexDirection: dir, height: 66, alignItems: 'center', background: bg || 'transparent', borderBottom: '1px solid #DDDCF0'
  }, [
    h('div', { width: W.label, padding: '0 18px', fontSize: 19, fontWeight: 800, color: INK,
      justifyContent: rtl ? 'flex-end' : 'flex-start' }, label || []),
    ...cells.map((c, i) => h('div', { width: i === 3 ? W.year : W.m, justifyContent: 'center', fontSize: 22, fontWeight: 800,
      color: c ? c.c : INK }, c ? c.t : [pill()]))
  ]);

  let rows;
  if (sum) {
    const cum = (to) => total(sum.n.slice(0, to + 1));
    const ink = (v) => ({ t: compact(v), c: INK });
    const tone = (v) => ({ t: signed(v), c: v >= 0 ? GREEN : RED });
    rows = [
      row(t.revenue, [ink(sum.r[9]), ink(sum.r[10]), ink(sum.r[11]), ink(total(sum.r))]),
      row(t.costs, [ink(sum.x[9]), ink(sum.x[10]), ink(sum.x[11]), ink(total(sum.x))]),
      row(t.net, [tone(sum.n[9]), tone(sum.n[10]), tone(sum.n[11]), tone(total(sum.n))], '#E9F5EF'),
      row(t.toDate, [tone(cum(9)), tone(cum(10)), tone(cum(11)), tone(cum(11))]),
      row('', [null, null, null, null]),
      row('', [null, null, null, null])
    ];
  } else {
    rows = [0, 1, 2, 3, 4, 5].map(() => row('', [null, null, null, null]));
  }

  const side = rtl ? { right: 56 } : { left: 56 };
  return h('div', {
    position: 'absolute', top: 22, ...side, width: 550, height: 480, flexDirection: 'column', background: '#F2F2FC',
    borderRadius: 26, overflow: 'hidden', boxShadow: '0 24px 60px rgba(10,10,60,0.30)',
    transform: 'rotate(' + (rtl ? -3 : 3) + 'deg)'
  }, [header, ...rows]);
}

function stat(label, value, ls) {
  return h('div', { flexDirection: 'column' }, [
    h('div', { fontSize: 20, fontWeight: 500, color: GREY, letterSpacing: ls }, label),
    h('div', { fontSize: 38, fontWeight: 800, color: INK, marginTop: 2 }, value)
  ]);
}

/* the main card: year totals and the monthly profit bars */
function mainCard(sum, t, rtl, ar, tool) {
  const ls = ar ? 0 : 1.5;
  let body;
  if (sum) {
    const rev = total(sum.r), cost = total(sum.x), net = total(sum.n);
    const margin = rev > 0 ? Math.round((net / rev) * 100) : null;
    const good = net >= 0;
    const tag = tool ? t.example + ' · ' + String(sum.c || '').slice(0, 4) : String(sum.c || '').slice(0, 4);
    body = [
      h('div', { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }, [
        h('div', { fontSize: 20, fontWeight: 800, color: INDIGO, letterSpacing: ar ? 0 : 3 }, t.yearOne),
        h('div', { fontSize: 20, fontWeight: 500, color: GREY, letterSpacing: ar ? 0 : 2 }, tag)
      ]),
      h('div', { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 }, [
        stat(t.revenue, compact(rev), ls), stat(t.costs, compact(cost), ls)
      ]),
      h('div', { width: '100%', height: 1, background: LINE, marginTop: 22 }, []),
      h('div', { flexDirection: 'column', marginTop: 18 }, [
        h('div', { fontSize: 20, fontWeight: 500, color: GREY, letterSpacing: ls }, t.net),
        h('div', { flexDirection: 'row', alignItems: 'center', marginTop: 2 }, [
          h('div', { fontSize: 72, fontWeight: 800, color: good ? GREEN : RED, letterSpacing: -2 }, signed(net)),
          margin === null ? h('div', {}, []) :
            h('div', { marginLeft: 18, padding: '6px 16px', borderRadius: 40, fontSize: 24, fontWeight: 800,
              color: good ? GREEN : RED, background: good ? '#E6F3ED' : '#FBEBED' }, margin + '%')
        ])
      ]),
      h('div', { width: '100%', marginTop: 18 }, [bars(sum.n)])
    ];
  } else {
    const line = (w) => h('div', { width: w, height: 18, background: '#ECEBFB', borderRadius: 9 }, []);
    body = [
      h('div', { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }, [
        h('div', { fontSize: 20, fontWeight: 800, color: INDIGO, letterSpacing: ar ? 0 : 3 }, t.yearOne),
        h('div', { fontSize: 20, fontWeight: 500, color: GREY, letterSpacing: ar ? 0 : 2 }, t.months)
      ]),
      h('div', { flexDirection: 'column', marginTop: 28, width: '100%' }, [
        h('div', { flexDirection: 'row', justifyContent: 'space-between', width: '100%' }, [line(150), line(110)]),
        h('div', { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 22 }, [line(190), line(110)]),
        h('div', { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 22 }, [line(120), line(110)])
      ]),
      h('div', { width: '100%', height: 1, background: LINE, marginTop: 30 }, []),
      h('div', { width: '100%', marginTop: 30 }, [skeletonBars()])
    ];
  }
  const side = rtl ? { right: 24 } : { left: 24 };
  return h('div', {
    position: 'absolute', top: 76, ...side, flexDirection: 'column', width: 440, padding: '32px 34px', background: '#FFFFFF',
    borderRadius: 30, boxShadow: '0 30px 70px rgba(16,16,40,0.35)', transform: 'rotate(' + (rtl ? 3 : -3) + 'deg)'
  }, body);
}

export default async function handler(req) {
  const u = new URL(req.url);
  const id = u.searchParams.get('id') || '';
  const tool = u.searchParams.get('mode') === 'tool';

  let info = null;
  if (!tool && /^[A-Za-z0-9-]{3,80}$/.test(id)) {
    try {
      const r = await fetch(SB_URL + '/rest/v1/rpc/plan_preview', {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_id: id })
      });
      if (r.ok) info = await r.json();
    } catch (e) { /* draw the generic card */ }
  }

  const name = String((info && info.company) || '').trim();
  const lang = tool ? (u.searchParams.get('lang') === 'ar' ? 'ar' : 'en')
                    : (info && info.lang === 'ar') || /[؀-ۿ]/.test(name) ? 'ar' : 'en';
  const ar = lang === 'ar', rtl = ar;
  const t = T[lang];
  const family = ar ? 'Cairo, Manrope' : 'Manrope, Cairo';
  const ls = ar ? 0 : 4;

  const sum = tool ? sample(lang)
    : info && info.sum && Array.isArray(info.sum.r) && info.sum.r.length === 12 ? info.sum : null;

  const m800 = font(MANROPE_800), m500 = font(MANROPE_500), c700 = font(CAIRO_700);

  const align = rtl ? 'flex-end' : 'flex-start';
  const headline = tool ? t.toolTitle : (name || t.fallbackName);
  const eyebrow = tool ? t.toolEyebrow : t.eyebrow;
  const hl = headline.length;
  const size = tool ? (ar ? 70 : 76) : hl <= 12 ? 84 : hl <= 20 ? 70 : hl <= 32 ? 56 : 46;

  /* top of the text column: only the planner's own picture carries the logo up there */
  const top = tool
    ? h('div', { padding: '12px 24px', background: '#FFFFFF', borderRadius: 22 }, [logo(56)])
    : h('div', { height: 1 }, []);

  const middle = h('div', { flexDirection: 'column', alignItems: align }, [
    h('div', { fontSize: 22, fontWeight: 800, color: '#C9C8F2', letterSpacing: ls, marginBottom: 18 }, eyebrow),
    h('div', { fontSize: size, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.06, letterSpacing: ar ? 0 : -2,
      maxWidth: 520, textAlign: rtl ? 'right' : 'left', lineClamp: 3 }, headline)
  ]);

  /* bottom: a shared plan carries a quiet credit (its reader was sent here, no need to sell);
     the planner's own picture asks for the click */
  const bottom = tool
    ? h('div', { padding: '14px 30px', borderRadius: 40, background: '#FFFFFF', color: INDIGO, fontSize: 28, fontWeight: 800 }, t.cta)
    : h('div', { flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 14, padding: '8px 22px', background: '#FFFFFF', borderRadius: 40 }, [
        h('div', { fontSize: 20, fontWeight: 500, color: '#5A5A66' }, t.built),
        logo(44)
      ]);

  const text = h('div', {
    flexDirection: 'column', justifyContent: 'space-between', alignItems: align, width: 600, height: 630,
    padding: rtl ? '64px 68px 64px 0' : '64px 0 64px 68px'
  }, [top, middle, bottom]);

  const cards = h('div', { position: 'relative', width: 600, height: 630 }, [
    backCard(sum, t, rtl, ar),
    mainCard(sum, t, rtl, ar, tool)
  ]);

  const tree = h('div', {
    width: 1200, height: 630, flexDirection: rtl ? 'row-reverse' : 'row', fontFamily: family,
    background: 'linear-gradient(135deg, ' + DEEP + ' 0%, ' + INDIGO + ' 58%, #5B59E6 100%)'
  }, [text, cards]);

  return new ImageResponse(tree, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Manrope', data: m800, weight: 800, style: 'normal' },
      { name: 'Manrope', data: m500, weight: 500, style: 'normal' },
      { name: 'Cairo', data: c700, weight: 700, style: 'normal' }
    ],
    headers: { 'Cache-Control': tool ? 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400'
                                      : 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' }
  });
}
