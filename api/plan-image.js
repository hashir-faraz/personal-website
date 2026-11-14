/* Draws the four preview pictures used when a link is pasted into WhatsApp, Slack, LinkedIn and so on:

     /api/plan-image?mode=tool&lang=en|ar   the planner page itself
     /api/plan-image?mode=plan&lang=en|ar   any shared plan (the company name goes in the link's title)

   This function is only a generator. Drawing takes a few seconds, far too slow for a chat app that
   gives up waiting, so the results are saved as ordinary files in /assets/previews and those are
   what the links point at. To change the design: edit this file, run the four URLs on a preview
   deployment, save the results over the files in /assets/previews, commit.

   Arabic is mirrored: text on the right, cards on the left, table columns reversed, and no letter
   spacing (it breaks the joins). Fonts and the logo are embedded so nothing is fetched. */

import { ImageResponse } from '@vercel/og';
import { MANROPE_800, MANROPE_500, CAIRO_700 } from './_fonts.js';
import { LOGO, LOGO_RATIO } from './_logo.js';

export const config = { runtime: 'edge' };

const INDIGO = '#3533CD', DEEP = '#28279B', INK = '#101014', GREY = '#85858F', LINE = '#E7E6E1';
const GREEN = '#0A8754', RED = '#C8374B';

const T = {
  en: {
    eyebrow: '12-MONTH FINANCIAL PLAN', built: 'Built with', yearOne: 'YEAR 1', revenue: 'REVENUE',
    costs: 'COSTS', net: 'NET PROFIT', months: '12 MONTHS', example: 'EXAMPLE', year: 'YEAR',
    secRev: 'Revenue', totRev: 'Total revenue', secCost: 'Costs', totCost: 'Total costs', netRow: 'Net profit',
    planTitle: '12-Month Financial Plan', toolTitle: '12-Month Budget Planner', toolSub: 'Revenue, costs and profit by month', fallbackName: 'Your business'
  },
  ar: {
    eyebrow: 'الخطة المالية · 12 شهر', built: 'مبني بـ', yearOne: 'السنة الأولى', revenue: 'الإيراد',
    costs: 'التكاليف', net: 'صافي الربح', months: '12 شهر', example: 'مثال', year: 'السنة',
    secRev: 'الإيراد', totRev: 'إجمالي الإيراد', secCost: 'التكاليف', totCost: 'إجمالي التكاليف', netRow: 'صافي الربح',
    planTitle: ['الخطة المالية', '12 شهر'], toolTitle: 'مخطّط ميزانية 12 شهر', toolSub: 'الإيرادات والتكاليف والأرباح شهرًا بشهر', fallbackName: 'شغلك'
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
  return { type, props: { style: { display: 'flex', lineHeight: 1.2, ...style }, children } };
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
  const lab = (i) => { const v = l ? String(l[i]).split(' ')[0] : 'M' + (i + 1); return ar ? v : v.toUpperCase(); };
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

  const side = rtl ? { right: 6 } : { left: 6 };
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
  const tool = u.searchParams.get('mode') !== 'plan';
  const lang = u.searchParams.get('lang') === 'ar' ? 'ar' : 'en';
  const ar = lang === 'ar', rtl = ar;
  const t = T[lang];
  const family = ar ? 'Cairo, Manrope' : 'Manrope, Cairo';
  const align = rtl ? 'flex-end' : 'flex-start';

  /* both pictures show an example year: a shared plan's own figures stay out of the picture */
  const sum = sample(lang);

  const m800 = font(MANROPE_800), m500 = font(MANROPE_500), c700 = font(CAIRO_700);

  const headline = tool ? t.toolTitle : t.planTitle;
  const size = ar ? (tool ? 70 : 58) : 76;

  /* the planner's own picture carries the logo at the top and says what the tool does; a shared
     plan's picture carries a small credit at the bottom (whoever opens it was sent here) */
  const top = tool ? logo(34) : h('div', { height: 1 }, []);
  /* a title given as a list of lines is set line by line (Arabic wraps badly on its own) */
  const lineStyle = { fontSize: size, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.06, letterSpacing: ar ? 0 : -2,
    maxWidth: 520, textAlign: rtl ? 'right' : 'left', lineClamp: 3 };
  const headlineEl = Array.isArray(headline)
    ? h('div', { flexDirection: 'column', alignItems: align }, headline.map((ln) => h('div', lineStyle, ln)))
    : h('div', lineStyle, headline);
  const middle = h('div', { flexDirection: 'column', alignItems: align }, [headlineEl]);
  const bottom = tool
    ? h('div', { fontSize: 24, fontWeight: 500, color: '#DCDBF7', maxWidth: 520, textAlign: rtl ? 'right' : 'left' }, t.toolSub)
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
    mainCard(sum, t, rtl, ar, true)
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
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400' }
  });
}
