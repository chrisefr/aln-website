# African Landscape Network — Website Project Brief

## What this is
A static HTML landing page for the African Landscape Network (ALN), replacing an existing ArcGIS StoryMap at:
https://storymaps.arcgis.com/stories/c2dbf452f2ab42949c5d518c15701ba8

The goal is a standalone static site with better SEO and design control, hosted on Netlify.

## Current state
- `index.html` at project root, linking `css/style.css`
- All images live in `images/`
- `netlify.toml` configures the site for Netlify (publish root, cache headers for `images/` and `css/`)
- No build tools, no frameworks — plain HTML, CSS, JavaScript
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

## Page structure (top to bottom)
1. Hero — full-bleed photo with a dark gradient overlay and the title/subtitle/date positioned over the bottom of the image (single `.hero` block, not a separate banner)
2. Sticky navigation bar (ALN Vision / African Landscape Convention / Individuals & Entities Map / Projects Map / Credits) — highlights the section currently in view (scrollspy)
3. Intro text + two CTA buttons (Individuals & Entities Map / Projects Map)
4. Image carousel (10 landscape photos, 2 visible at a time on desktop, prev/next + dot navigation, hover caption from each image's alt text)
5. ALN Vision section (diagram + text, two-column)
6. African Landscape Convention section (book cover + text, two-column)
7. Individuals & Entities Map section (text + buttons + live ArcGIS map embed)
8. Projects Map section (text + buttons + live ArcGIS map embed)
9. Filters section (6 filter categories, each with image pairs and explanatory text)
10. Credits section (table of organisations + disclaimer)
11. Footer

Sections alternate between the paper (`--paper`) and sand (`--sand`) backgrounds for visual rhythm, and each carries a faint decorative section number (01–06) — this is styling only, no section content/copy was changed to add it.

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

## Hosting
- Platform: Netlify
- Git: to be initialised
- Domain: to be confirmed

## People
- Chris: technical lead, Git/Netlify
- Marike: creative lead, content and design direction (non-technical — should not need to touch code)
