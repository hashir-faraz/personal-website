# Personal website (hashirfaraz.com)

Plain static site hosted on GitHub Pages from `main`. No build step, no framework. Owner is a non-coder: explain simply, keep replies short.

## Files
- `index.html` — homepage content only (the 8 sections below)
- `styles.css` — all homepage styling
- `script.js` — all homepage behaviour (scroll settling, service tabs, demos)
- `free-resources/` — the resources library page (linked from the nav and section 7)
- `tools/budget-planner/` — 12-month budget planner, the one tool listed in the library. Self-contained single file; saves to localStorage under `hf_budget_v2`. Two screens: a setup questionnaire (business name + what it sells) then the plan, where Build, Sheet and Dashboard sit stacked under one another and the segmented control scrolls between them. The plan opens seeded with sample figures, which render light grey until the user types over them. Currency, start date and a Real-months switch (off = M1–M12) sit above the editor, not in the questionnaire. Every figure is a series with three growth buttons (constant, percent, amount) plus per-month overrides; costs are grouped categories, one of which (Team) is positions with salary × headcount
- `tools/` — older tools. `agency-pricing-planner/` and `revenue-analysis/` are archived: the URLs still work but they are no longer linked from anywhere
- `resources.html` — redirect to `/free-resources/`, kept for old links
- `proposal/` — other pages
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

## Type
Manrope only, across every page. Figures line up with `font-variant-numeric:tabular-nums`, not a second typeface.

## Accessibility baseline (keep these)
- `--ink-hint` (#6F6F79) is the grey for small text that carries meaning; `--ink-3`/`--ink-4` are for decoration only.
- Tooltips open on hover, on tap (the small `i`) and on keyboard focus — never hover alone.
- Collapsible headers carry `aria-expanded`, toggles `aria-pressed`, growth buttons `role="radio"`.
- `:focus-visible` rings and a `prefers-reduced-motion` block are in the planner's stylesheet.

## Printing
Each of the two sheets prints as exactly one A4 landscape page. The P&L reflows to the page width; the dashboard cannot (widening it makes the charts taller), so `printOne()` keeps its 1120px design width and scales it to the 1054x725px printable area, centred. Sample-grey rows are forced back to ink for print.
