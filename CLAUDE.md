# Personal website (hashirfaraz.com)

Plain static site hosted on GitHub Pages from `main`. No build step, no framework. Owner is a non-coder: explain simply, keep replies short.

## Files
- `index.html` — homepage content only (the 7 sections below)
- `styles.css` — all homepage styling
- `script.js` — all homepage behaviour (scroll settling, service tabs, the contact form, the credentials tip)
- `free-resources/` — the resources library page (linked from the nav and section 7)
- `tools/budget-planner/` — 12-month budget planner, the one tool listed in the library. Self-contained single file; saves to localStorage under `hf_budget_v2`. Two screens: a setup questionnaire (business name + what it sells, with tap-to-add agency presets) then the plan, where Build, Sheet and Dashboard sit stacked under one another and the segmented control scrolls between them. The plan opens seeded with sample figures, which render light grey until the user types over them. Currency, start date and a Real-months switch (off = M1–M12) sit above the editor, not in the questionnaire. Every figure is a series: a row label with four pills beside it (constant, percent, fixed amount, custom), then a starting-number box and a change box with − and + either side (±1 per press; the sign is the number's own, so a minus makes it "Decreases", shown red, and a plus "Increases", green). Custom replaces both boxes with the twelve-month table. A service card has three numbered things to fill in: name, price, customers; a service can be deleted from the top right of its header. No year/average totals under rows. Costs are grouped categories, one of which (Team) is positions with salary × headcount. Only one section is open at a time. A three-step coach (`hf_budget_coach`) points at the first field, then the rail, on a first visit. Share copies a link with the whole plan packed into the hash (`#p=`), so no server is involved
- `tools/` — older tools. `agency-pricing-planner/` and `revenue-analysis/` are archived: the URLs still work but they are no longer linked from anywhere
- `resources.html` — redirect to `/free-resources/`, kept for old links
- `proposal/` — other pages
- `ar/` — the Arabic site: `ar/index.html` and `ar/free-resources/index.html`, mirroring the English pages. `ar.css` is the shared right-to-left layer, loaded after the page's own CSS on every page in both languages (its rules are guarded by `html[dir="rtl"]`). The planner is not duplicated: it is bilingual in one file, switched by `?lang=ar`
- `assets/` — images and favicon. `CNAME` — custom domain, do not edit

## Homepage sections (in order, id in index.html)
1. Problem — `p-problem` (dark hero with nav)
2. Services — `p-services`
3. Free Resources — `p-resources` (a preview card of the tools, with the plain tick-tags)
4. Analyst — `p-analyst` (credentials line has an info tip: hover, tap or focus)
5. Hassle — `p-hassle`
6. Pricing — `p-pricing` (three cards: Free Resources at QAR 0, Performance Management Setup at QAR 1,299, Setup + Business Analyst at QAR 699/month)
7. Final — `p-final` (dark closing call to action)

The end of the services track (section 2) is a contact form, not a link: phone/email plus what they need. Submit stays soft until a phone number or email is in; WhatsApp always works and carries the typed message. Submissions go to the `leads` table in Supabase through `submit_lead` (`supabase/leads.sql` must be run once). The Effortless Visibility demos were removed.

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
Revenue streams → Total revenue → blank line → Costs (every category, no cost-of-sales split) → Total costs → blank line → Net profit. No gross profit or gross margin: the plan prices a team, not a unit. The two totals are shaded by each month's rank among the twelve (green for revenue, red for costs), suppressed on a flat year and while the figures are still samples. Net profit has black rules and a red/green fill per month (redder = worse, greener = better); revenue and costs fills are always on, one mid tint when the year is flat.

## Printing
Each of the two sheets prints as exactly one A4 landscape page. `printOne()` lays each out at the printable width and scales it to the 1054x725px area (less 3% for print rounding), centred: the P&L reflows to that width first, the dashboard cannot (widening it makes the charts taller) so it keeps its 1120px design width. The saved PDF is named from `document.title`, which `printOne()` swaps to `Financial Plan - <business>` for the duration. Sample-grey rows are forced back to ink for print; `hashirfaraz.com` stays a real clickable link.

## Dashboard and PDF
The dashboard has three tabs (Revenue, Net profit, Net margin); each is one `.dpane` and prints as its own A4 landscape page, so the dashboard PDF is three pages. **Save as PDF** downloads a real file: each page is drawn off-screen with html2canvas and placed with jsPDF (both loaded from cdnjs the first time the button is pressed; if they cannot load it falls back to the print dialog). Sheet and dashboard footers carry only "Built with" and the logo; the plan's own name stays at the top. Share turns the button blue and says "Link copied" instead of showing a toast. Costs start at 0 (faded) rather than sample figures; a team position is just position, salary, how many. Build view has no hover tooltips on fields.
