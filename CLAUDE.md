# Personal website (hashirfaraz.com)

Plain static site hosted on GitHub Pages from `main`. No build step, no framework. Owner is a non-coder: explain simply, keep replies short.

## Files
- `index.html` — homepage content only (the 8 sections below)
- `styles.css` — all homepage styling
- `script.js` — all homepage behaviour (scroll settling, service tabs, demos)
- `free-resources/` — the resources library page (linked from the nav and section 7)
- `tools/budget-planner/` — 12-month budget planner, the one tool listed in the library. Self-contained single file; saves to localStorage under `hf_budget_v2`. Two screens: a setup questionnaire (business name + what it sells, with tap-to-add agency presets) then the plan, where Build, Sheet and Dashboard sit stacked under one another and the segmented control scrolls between them. The plan opens seeded with sample figures, which render light grey until the user types over them. Currency, start date and a Real-months switch (off = M1–M12) sit above the editor, not in the questionnaire. Every figure is a series: a starting-number box and a change box side by side, with one rail of four buttons under them (constant, percent, amount, custom — custom opens the per-month override drawer). Costs are grouped categories, one of which (Team) is positions with salary × headcount. Only one section is open at a time. A three-step coach (`hf_budget_coach`) points at the first field, then the rail, on a first visit. Share copies a link with the whole plan packed into the hash (`#p=`), so no server is involved
- `tools/` — older tools. `agency-pricing-planner/` and `revenue-analysis/` are archived: the URLs still work but they are no longer linked from anywhere
- `resources.html` — redirect to `/free-resources/`, kept for old links
- `proposal/` — other pages
- `ar/` — the Arabic site: `ar/index.html` and `ar/free-resources/index.html`, mirroring the English pages. `ar.css` is the shared right-to-left layer, loaded after the page's own CSS on every page in both languages (its rules are guarded by `html[dir="rtl"]`). The planner is not duplicated: it is bilingual in one file, switched by `?lang=ar`
- `assets/` — images and favicon. `CNAME` — custom domain, do not edit

## Homepage sections (in order, id in index.html)
1. Problem — `p-problem` (dark hero with nav)
2. Services — `p-services`
3. Demos — `p-demos`
4. Analyst — `p-analyst`
5. Hassle — `p-hassle`
6. Pricing — `p-pricing`
7. Resources — `p-resources`
8. Final — `p-final` (dark closing call to action)

## Working rules
- Read only the section/file relevant to the request.
- Preview locally with the `site` entry in `.claude/launch.json` (port 8765).
- Commit only when asked.

## Language
English and Arabic (Khaleeji / Qatari register, standard accounting terms). Every page carries a switch in its nav; the pages are paired with `hreflang`. Arabic sets `lang="ar" dir="rtl"` and adds Cairo **after** Manrope in the font stack, so figures stay in Manrope and only the words change. The simulated app screens on the homepage, and the planner's charts and figure columns, stay left-to-right — that is how the software they imitate reads.

## Type
Manrope only, across every page (plus Cairo for Arabic glyphs). Figures line up with `font-variant-numeric:tabular-nums`, not a second typeface.

## Accessibility baseline (keep these)
- `--ink-hint` (#6F6F79) is the grey for small text that carries meaning; `--ink-3`/`--ink-4` are for decoration only.
- Tooltips open on hover, on tap (the small `i`) and on keyboard focus — never hover alone.
- Collapsible headers carry `aria-expanded`, toggles `aria-pressed`, growth buttons `role="radio"`.
- `:focus-visible` rings and a `prefers-reduced-motion` block are in the planner's stylesheet.

## The planner's P&L
Revenue streams → Total revenue → blank line → Costs (every category, no cost-of-sales split) → Total costs → blank line → Net profit. No gross profit or gross margin: the plan prices a team, not a unit. The two totals are shaded by each month's rank among the twelve (green for revenue, red for costs), suppressed on a flat year and while the figures are still samples. Net profit is a brand band, not a black bar.

## Printing
Each of the two sheets prints as exactly one A4 landscape page. `printOne()` lays each out at the printable width and scales it to the 1054x725px area (less 3% for print rounding), centred: the P&L reflows to that width first, the dashboard cannot (widening it makes the charts taller) so it keeps its 1120px design width. The saved PDF is named from `document.title`, which `printOne()` swaps to `Financial Plan - <business>` for the duration. Sample-grey rows are forced back to ink for print; `hashirfaraz.com` stays a real clickable link.
