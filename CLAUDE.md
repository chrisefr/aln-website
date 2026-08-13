# African Landscape Network — Website Project Brief

## What this is
A static HTML landing page for the African Landscape Network (ALN), replacing an existing ArcGIS StoryMap at:
https://storymaps.arcgis.com/stories/c2dbf452f2ab42949c5d518c15701ba8

The goal is a standalone static site with better SEO and design control, hosted on Netlify.

## Current state
- Three hand-written pages at project root, each linking `css/style.css`: `index.html` (landing page), `about.html` (background/vision info), `filters.html` (map filter guide)
- All images live in `images/`
- `netlify.toml` configures the site for Netlify (publish root, cache headers for `images/` and `css/`)
- No build tools, no frameworks — plain HTML, CSS, JavaScript (nav/footer markup is duplicated across the three pages by hand, not templated)
- Google Fonts loaded via CDN (Barlow + Barlow Condensed)

Note: two image files originally had uppercase `.JPG` extensions while `index.html` referenced them in lowercase (`.jpg`). This worked on Windows (case-insensitive filesystem) but would have 404'd on Netlify's case-sensitive filesystem. Both files were renamed to lowercase `.jpg` during the reorg.

## Colour palette
- Navy (primary background): #0e2a3f
- Navy deep: #0a1f30
- Terracotta (headings): #c15b2c
- Teal (accent/links): #3fc7c2
- Gold (buttons): #b98e56
- Ink (body headings): #16324a
- Sand (alternate section background, `iteration/freereign` on): #f3e9da

## Page structure
As of 2026-08-11 the original single-page StoryMap layout was split into three pages so the landing page stays focused on the two maps. Background/reference content moved out, per the user's request to simplify the landing page — no section copy was changed, only where it lives.

**`index.html`** (top to bottom):
1. Hero — full-bleed photo with a dark gradient overlay and the title/subtitle positioned over the bottom of the image (single `.hero` block, not a separate banner)
2. Sticky navigation bar (Home / Individuals & Entities Map / Projects Map / Filters / About) — highlights the in-page section currently in view (scrollspy); Filters and About are cross-page links so they're excluded from the scrollspy targets
3. Intro text + two CTA buttons (Individuals & Entities Map / Projects Map)
4. Image carousel (10 landscape photos, 2 visible at a time on desktop, prev/next + dot navigation, hover caption from each image's alt text)
5. Individuals & Entities Map section (text + buttons + live ArcGIS map embed) — marker `01`
6. Projects Map section (text + buttons + live ArcGIS map embed) — marker `02`
7. Footer, with quick links to Filters and About

**`about.html`** — background info moved off the landing page: a `.page-head` banner, then ALN Vision (`01`, diagram + text two-column), African Landscape Convention (`02`, book cover + text two-column), Credits (`03`, org table + disclaimer), footer.

**`filters.html`** — the filter explainer moved off the landing page: a `.page-head` banner, then the single Filters section (`01`: 6 filter categories, each with image pairs and explanatory text), footer.

Sections alternate between the paper (`--paper`) and sand (`--sand`) backgrounds for visual rhythm within each page, and each carries a faint decorative section number, restarting per page — this is styling only, no section content/copy was changed to add it. The nav and footer markup is duplicated by hand on all three pages (no templating); keep them in sync when editing one.

## Images
All images currently in the root folder alongside index.html.
Target structure: move to `images/` subfolder.

Key images:
- `Image Bo-Kaap colourful street, Cape Town (hero photo).jpg` — hero
- `Carousel 1.jpg` through `Carousel 10.jpg` — carousel
- `ALN Vision.jpg` — vision diagram
- `African Landscape Convention.jpg` — convention book cover
- `Screenshot Individuals & Entities interactive map + thumbnail gallery.jpg`
- `Screenshot Projects Map interactive viewer (Africa map + project thumbnails).jpg`
- Filter section images (various, named descriptively)

## External links to preserve (StoryMap destinations)
The existing maps live on ArcGIS and should remain as link destinations:
- Individuals & Entities Map: to be confirmed
- Projects Map: to be confirmed

## Planned next steps
1. ~~Reorganise folder structure (images/ subfolder, css/ subfolder)~~ — done
2. ~~Set up Netlify deployment (netlify.toml)~~ — done (site can now be dragged into Netlify or connected via Git)
3. Improve mobile responsiveness
4. Consider Decap CMS for non-technical content editing by ALN colleagues
5. Add visitor analytics — likely GoatCounter (free tier, one script tag, no cookie-consent banner needed, not tied to Netlify)

## Hosting
- Platform: Netlify
- Git: to be initialised
- Domain: to be confirmed

## People
- Chris: technical lead, Git/Netlify
- Marike: creative lead, content and design direction (non-technical — should not need to touch code)
