/* The picture that appears when a plan link is pasted into WhatsApp, Slack, LinkedIn and so on:
   the company's name, big, beside a little financial sheet carrying its real year totals and a
   bar for each month's profit.

   Drawn on the fly with @vercel/og (it turns a layout into a PNG). The numbers come from the
   plan's saved summary (plan_preview). A plan with no summary yet gets the name and a
   skeleton sheet. Fonts are the site's own, kept in /assets/fonts. */

import { ImageResponse } from '@vercel/og';
import { MANROPE_800, MANROPE_500, CAIRO_700 } from './_fonts.js';

export const config = { runtime: 'edge' };

const SB_URL = 'https://zybfmjymfnlgnxkzxqka.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5YmZtanltZm5sZ254a3p4cWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1NjY1NzEsImV4cCI6MjExMDE0MjU3MX0.pSdR7SXq6rcE84S7n8LGWXdqB52ITFcf1nDRb8baTh8';

const INDIGO = '#3533CD', DEEP = '#28279B', INK = '#101014', GREY = '#85858F', LINE = '#E7E6E1';
const GREEN = '#0A8754', RED = '#C8374B';

/* the fonts are embedded in _fonts.js (base64), so there is nothing to download at run time */
function font(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function h(type, style, children) {
  return { type, props: { style: { display: 'flex', ...style }, children } };
}

function compact(n) {
  const a = Math.abs(n);
  let s;
  if (a >= 1e6) s = (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  else if (a >= 1e3) s = (a / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
  else s = String(Math.round(a));
  return s;
}

function bars(net) {
  const max = Math.max(1, ...net.map((v) => Math.abs(v)));
  const half = 52;
  return h('div', { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: half * 2 + 4 },
    net.map((v) => {
      const len = Math.max(4, Math.round((Math.abs(v) / max) * half));
      const up = v >= 0;
      return h('div', { flexDirection: 'column', width: 26, height: half * 2 + 4, justifyContent: 'center', alignItems: 'center' }, [
        h('div', { width: 26, height: half, alignItems: 'flex-end', justifyContent: 'center' },
          up ? [h('div', { width: 26, height: len, background: GREEN, borderRadius: 6 })] : []),
        h('div', { width: 26, height: 4, background: LINE }),
        h('div', { width: 26, height: half, alignItems: 'flex-start', justifyContent: 'center' },
          up ? [] : [h('div', { width: 26, height: len, background: RED, borderRadius: 6 })])
      ]);
    }));
}

function skeletonBars() {
  const pattern = [30, 38, 34, 46, 52, 48, 60, 58, 70, 66, 78, 84];
  return h('div', { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', height: 108 },
    pattern.map((p) => h('div', { width: 26, height: p, background: '#E3E2F7', borderRadius: 6 })));
}

function stat(label, value) {
  return h('div', { flexDirection: 'column' }, [
    h('div', { fontSize: 20, fontWeight: 500, color: GREY, letterSpacing: 1.5 }, label),
    h('div', { fontSize: 40, fontWeight: 800, color: INK, marginTop: 2 }, value)
  ]);
}

export default async function handler(req) {
  const u = new URL(req.url);
  const id = u.searchParams.get('id') || '';

  let info = null;
  if (/^[A-Za-z0-9-]{3,80}$/.test(id)) {
    try {
      const r = await fetch(SB_URL + '/rest/v1/rpc/plan_preview', {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_id: id })
      });
      if (r.ok) info = await r.json();
    } catch (e) { /* draw the generic card */ }
  }

  const name = String((info && info.company) || 'Your business').trim();
  const sum = info && info.sum && Array.isArray(info.sum.r) && info.sum.r.length === 12 ? info.sum : null;
  const arabic = /[؀-ۿ]/.test(name) || (info && info.lang === 'ar');
  const family = arabic ? 'Cairo, Manrope' : 'Manrope, Cairo';

  const m800 = font(MANROPE_800), m500 = font(MANROPE_500), c700 = font(CAIRO_700);

  const len = name.length;
  const size = len <= 12 ? 92 : len <= 20 ? 76 : len <= 32 ? 60 : 48;

  /* the right-hand sheet */
  let sheetBody;
  if (sum) {
    const cur = String(sum.c || '').slice(0, 4);
    const rev = sum.r.reduce((a, b) => a + b, 0);
    const cost = sum.x.reduce((a, b) => a + b, 0);
    const net = sum.n.reduce((a, b) => a + b, 0);
    const margin = rev > 0 ? Math.round((net / rev) * 100) : null;
    const good = net >= 0;
    sheetBody = [
      h('div', { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }, [
        h('div', { fontSize: 20, fontWeight: 800, color: INDIGO, letterSpacing: 3 }, 'YEAR 1'),
        h('div', { fontSize: 20, fontWeight: 500, color: GREY, letterSpacing: 2 }, cur)
      ]),
      h('div', { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 }, [
        stat('REVENUE', compact(rev)),
        stat('COSTS', compact(cost))
      ]),
      h('div', { width: '100%', height: 1, background: LINE, marginTop: 22 }),
      h('div', { flexDirection: 'column', marginTop: 18 }, [
        h('div', { fontSize: 20, fontWeight: 500, color: GREY, letterSpacing: 1.5 }, 'NET PROFIT'),
        h('div', { flexDirection: 'row', alignItems: 'center', marginTop: 2 }, [
          h('div', { fontSize: 76, fontWeight: 800, color: good ? GREEN : RED, letterSpacing: -2 },
            (good ? '' : '-') + compact(net)),
          margin === null ? h('div', {}, '') :
            h('div', { marginLeft: 20, padding: '6px 16px', borderRadius: 40, fontSize: 24, fontWeight: 800,
              color: good ? GREEN : RED, background: good ? '#E6F3ED' : '#FBEBED' }, margin + '%')
        ])
      ]),
      h('div', { width: '100%', marginTop: 20 }, [bars(sum.n.map((v) => v))])
    ];
  } else {
    const line = (w) => h('div', { width: w, height: 18, background: '#ECEBFB', borderRadius: 9 });
    sheetBody = [
      h('div', { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }, [
        h('div', { fontSize: 20, fontWeight: 800, color: INDIGO, letterSpacing: 3 }, 'YEAR 1'),
        h('div', { fontSize: 20, fontWeight: 500, color: GREY, letterSpacing: 2 }, '12 MONTHS')
      ]),
      h('div', { flexDirection: 'column', marginTop: 28, width: '100%' }, [
        h('div', { flexDirection: 'row', justifyContent: 'space-between', width: '100%' }, [line(150), line(110)]),
        h('div', { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 22 }, [line(190), line(110)]),
        h('div', { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 22 }, [line(120), line(110)])
      ]),
      h('div', { width: '100%', height: 1, background: LINE, marginTop: 30 }),
      h('div', { width: '100%', marginTop: 34 }, [skeletonBars()])
    ];
  }

  const tree = h('div', {
    width: 1200, height: 630, flexDirection: 'row', fontFamily: family,
    background: 'linear-gradient(135deg, ' + DEEP + ' 0%, ' + INDIGO + ' 58%, #5B59E6 100%)'
  }, [
    /* left: who it is for */
    h('div', { flexDirection: 'column', justifyContent: 'space-between', width: 640, height: 630, padding: '56px 0 56px 68px' }, [
      h('div', { fontSize: 22, fontWeight: 800, color: '#FFFFFF', letterSpacing: 5, opacity: 0.85 }, 'HASHIR FARAZ'),
      h('div', { flexDirection: 'column' }, [
        h('div', { fontSize: 22, fontWeight: 800, color: '#C9C8F2', letterSpacing: 4, marginBottom: 18 }, '12-MONTH FINANCIAL PLAN'),
        h('div', { fontSize: size, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.04, letterSpacing: -2, lineClamp: 3 }, name)
      ]),
      h('div', { flexDirection: 'row', alignItems: 'center' }, [
        h('div', { padding: '12px 24px', borderRadius: 40, background: '#FFFFFF', color: INDIGO, fontSize: 24, fontWeight: 800 }, 'Make yours free'),
        h('div', { marginLeft: 20, fontSize: 24, fontWeight: 500, color: '#DCDBF7' }, 'hashirfaraz.com')
      ])
    ]),
    /* right: the sheet */
    h('div', { width: 560, height: 630, alignItems: 'center', justifyContent: 'center' }, [
      h('div', {
        flexDirection: 'column', width: 470, padding: '34px 38px 34px', background: '#FFFFFF', borderRadius: 30,
        boxShadow: '0 30px 70px rgba(16,16,40,0.35)', transform: 'rotate(-3deg)'
      }, sheetBody)
    ])
  ]);

  return new ImageResponse(tree, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Manrope', data: m800, weight: 800, style: 'normal' },
      { name: 'Manrope', data: m500, weight: 500, style: 'normal' },
      { name: 'Cairo', data: c700, weight: 700, style: 'normal' }
    ],
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' }
  });
}
