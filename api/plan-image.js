/* The picture shown when a link is pasted into WhatsApp, Slack, LinkedIn and so on.

   Two versions, drawn on the fly with @vercel/og:
     /api/plan-image?id=<plan>      a shared plan: the company's name, a card with its real year
                                    totals, and its P&L sheet showing behind the card
     /api/plan-image?mode=tool      the planner page itself, before anyone has a plan: the logo, the
                                    name of the tool and an example year
     ...&lang=ar                    the tool version in Arabic (a plan follows its own language)

   Arabic is mirrored: text on the right, cards on the left, table columns reversed, and no letter
   spacing (it breaks the joins). Fonts and the logo are embedded so nothing is fetched. */

import { ImageResponse } from '@vercel/og';
import { MANROPE_800, MANROPE_500, CAIRO_700 } from './_fonts.js';
import { LOGO, LOGO_RATIO } from './_logo.js';

export const config = { runtime: 'edge' };

const SB_URL = 'https://zybfmjymfnlgnxkzxqka.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5YmZtanltZm5sZ254a3p4cWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjY1NzEsImV4cCI6MjExMDE0MjU3MX0.pSdR7SXq6rcE84S7n8LGWXdqB52ITFcf1nDRb8baTh8';

const INDIGO = '#3533CD', DEEP = '#28279B', INK = '#101014', GREY = '#85858F', LINE = '#E7E6E1';
const GREEN = '#0A8754', RED = '#C8374B';

const T = {
  en: {
    eyebrow: '12-MONTH FINANCIAL PLAN', built: 'Built with', yearOne: 'YEAR 1', revenue: 'REVENUE',
    costs: 'COSTS', net: 'NET PROFIT', months: '12 MONTHS', example: 'EXAMPLE', year: 'YEAR',
    secRev: 'Revenue', totRev: 'Total revenue', secCost: 'Costs', totCost: 'Total costs', netRow: 'Net profit',
    toolTitle: '12-Month Budget Planner', toolSub: 'Revenue, costs and profit, month by month', fallbackName: 'Your business'
  },
  ar: {
    eyebrow: 'الخطة المالية · 12 شهر', built: 'مبني بـ', yearOne: 'السنة الأولى', revenue: 'الإيراد',
    costs: 'التكاليف', net: 'صافي الربح', months: '12 شهر', example: 'مثال', year: 'السنة',
    secRev: 'الإيراد', totRev: 'إجمالي الإيراد', secCost: 'التكاليف', totCost: 'إجمالي التكاليف', netRow: 'صافي الربح',
    toolTitle: 'مخطّط ميزانية 12 شهر', toolSub: 'الإيرادات والتكاليف والأرباح، شهرًا بشهر', fallbackName: 'شغلك'
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
  const part = (arr, f) => arr.map((v) => Math.round(v * f));
  const rest = (arr, ...others) => arr.map((v, i) => v - others.reduce((a, o) => a + o[i], 0));
  const ar = lang === 'ar';
  const r1 = part(r, 0.6), r2 = part(r, 0.3), r3 = rest(r, r1, r2);
  const x1 = part(x, 0.55), x2 = part(x, 0.15), x3 = part(x, 0.2), x4 = rest(x, x1, x2, x3);
  return {
    c: 'QAR', r, x, n: r.map((v, i) => v - x[i]), l: MONTHS[lang],
    s: [[ar ? 'عقود شهرية' : 'Retainers', r1], [ar ? 'مشاريع' : 'Projects', r2], [ar ? 'استشارات' : 'Consulting', r3]],
    k: [[ar ? 'الفريق' : 'Team', x1], [ar ? 'المكتب' : 'Workspace', x2], [ar ? 'التسويق' : 'Marketing', x3], [ar ? 'الإدارة' : 'Admin', x4]]
  };
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

/* The sheet behind the main card: the planner's Spreadsheet view, zoomed far out. Twelve month
   columns and a year column, revenue lines, costs, totals, net profit. It is texture, not
   content: small, light, nothing bold. Only its top strip and last columns show. */
function sheetCard(sum, t, rtl, ar) {
  const W = { label: 132, m: 34, year: 62 };
  const dir = rtl ? 'row-reverse' : 'row';
  const ls = ar ? 0 : 1;
  const SOFT = '#8A8A96';
  const l = sum && Array.isArray(sum.l) && sum.l.length === 12 ? sum.l : null;
  const lab = (i) => { const v = l ? String(l[i]) : 'M' + (i + 1); return ar ? v : v.toUpperCase(); };
  const pill = (w) => h('div', { width: w, height: 8, background: '#E6E6F2', borderRadius: 4 }, []);
  const lines = (a) => (Array.isArray(a) ? a : []).filter((x) => Array.isArray(x) && Array.isArray(x[1]) && x[1].length === 12);

  /* the header */
  const hcell = (txt, w) => h('div', { width: w, justifyContent: 'center', fontSize: 10, fontWeight: 500, color: '#8E8EA6', letterSpacing: ls }, txt);
  const header = h('div', { flexDirection: dir, height: 38, background: '#EEEEF8', alignItems: 'center' }, [
    h('div', { width: W.label, padding: '0 12px', justifyContent: rtl ? 'flex-end' : 'flex-start' }, []),
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => hcell(lab(i), W.m)),
    hcell(t.year, W.year)
  ]);

  /* kinds: sec (heading), line, tot, gap, net. vals is 12 numbers, or null for placeholders */
  const row = (kind, label, vals) => {
    const H = kind === 'gap' ? 10 : kind === 'net' ? 28 : kind === 'tot' ? 26 : 24;
    const bg = kind === 'net' ? '#E9F5EF' : 'transparent';
    const color = kind === 'tot' ? INK : SOFT;
    const cell = (v, w) => h('div', { width: w, justifyContent: 'center', fontSize: 11, fontWeight: 500,
      color: kind === 'net' ? (v >= 0 ? GREEN : RED) : color }, kind === 'net' ? signed(v) : (v === 0 ? '–' : compact(v)));
    const cells = kind === 'sec' || kind === 'gap' ? [] : vals
      ? [...vals.map((v) => cell(v, W.m)), cell(total(vals), W.year)]
      : [...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(() => h('div', { width: W.m, justifyContent: 'center' }, [pill(16)])),
         h('div', { width: W.year, justifyContent: 'center' }, [pill(24)])];
    return h('div', { flexDirection: dir, height: H, alignItems: 'center', background: bg,
      borderBottom: kind === 'line' ? '1px solid #F0F0F7' : '0 solid transparent' }, [
      h('div', { width: W.label, padding: '0 12px', fontSize: 11, fontWeight: 500, color: kind === 'sec' ? INDIGO : color,
        justifyContent: rtl ? 'flex-end' : 'flex-start', letterSpacing: kind === 'sec' ? ls : 0 },
        label ? (kind === 'sec' ? (ar ? label : label.toUpperCase()) : label.slice(0, 20)) : []),
      ...cells
    ]);
  };

  let rows = [];
  if (sum) {
    const rv = lines(sum.s).slice(0, 4), ct = lines(sum.k).slice(0, 6);
    rows = [
      row('sec', t.secRev),
      ...rv.map(([n, v]) => row('line', String(n), v)),
      row('tot', t.totRev, sum.r),
      row('gap'),
      row('sec', t.secCost),
      ...ct.map(([n, v]) => row('line', String(n), v)),
      row('tot', t.totCost, sum.x),
      row('gap'),
      row('net', t.netRow, sum.n)
    ];
  } else {
    rows = [row('sec', t.secRev), row('line', '', null), row('line', '', null), row('line', '', null), row('tot', '', null),
      row('gap'), row('sec', t.secCost), row('line', '', null), row('line', '', null), row('line', '', null), row('line', '', null),
      row('tot', '', null), row('gap'), row('net', '', null)];
  }

  const side = rtl ? { right: -12 } : { left: -12 };
  return h('div', {
    position: 'absolute', top: 30, ...side, width: W.label + W.m * 12 + W.year, flexDirection: 'column', background: '#FBFBFE',
    borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 60px rgba(10,10,60,0.30)',
    transform: 'rotate(' + (rtl ? -2 : 2) + 'deg)'
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
  const hl = headline.length;
  const size = tool ? (ar ? 70 : 76) : hl <= 12 ? 84 : hl <= 20 ? 70 : hl <= 32 ? 56 : 46;

  /* the planner's own picture carries the logo at the top; a shared plan carries none up there */
  const top = tool ? logo(34) : h('div', { height: 1 }, []);

  const headlineEl = h('div', { fontSize: size, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.06, letterSpacing: ar ? 0 : -2,
    maxWidth: 520, textAlign: rtl ? 'right' : 'left', lineClamp: 3 }, headline);
  const middle = tool
    ? h('div', { flexDirection: 'column', alignItems: align }, [headlineEl])
    : h('div', { flexDirection: 'column', alignItems: align }, [
        h('div', { fontSize: 22, fontWeight: 800, color: '#C9C8F2', letterSpacing: ls, marginBottom: 18 }, t.eyebrow),
        headlineEl
      ]);

  /* bottom: the planner's picture says what the tool does, in one quiet line; a shared plan
     carries only a small credit (whoever opens it was sent here, so there is nothing to sell) */
  const bottom = tool
    ? h('div', { fontSize: 24, fontWeight: 500, color: '#DCDBF7', maxWidth: 480, textAlign: rtl ? 'right' : 'left' }, t.toolSub)
    : h('div', { flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }, [
        h('div', { fontSize: 18, fontWeight: 500, color: '#C9C8F2' }, t.built),
        logo(22)
      ]);

  const text = h('div', {
    flexDirection: 'column', justifyContent: 'space-between', alignItems: align, width: 600, height: 630,
    padding: rtl ? '64px 68px 64px 0' : '64px 0 64px 68px'
  }, [top, middle, bottom]);

  const cards = h('div', { position: 'relative', width: 600, height: 630 }, [
    sheetCard(sum, t, rtl, ar),
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
