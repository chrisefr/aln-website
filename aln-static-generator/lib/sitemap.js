// Builds an XML sitemap listing every generated URL. This is the intended
// discovery path for search engines: per the site-structure decision, detail
// pages are deliberately NOT linked from the main site nav (the ArcGIS map
// stays the human browse interface), so without a sitemap a crawler might
// never reach most of these 110+ pages even via the two index pages.
// See https://www.sitemaps.org/protocol.html for the format.

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// epochMs -> 'YYYY-MM-DD' (UTC), or null if missing/invalid. <lastmod> is
// optional per the spec, so entries without a usable EditDate just omit it.
function toLastmod(epochMs) {
  if (!epochMs || !Number.isFinite(epochMs)) return null;
  const d = new Date(epochMs);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function urlEntry(loc, lastmod) {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmodTag}\n  </url>`;
}

// items: array of { slug, editDate } (editDate optional, epoch ms).
// Produces one <url> per detail page plus one for the section's own index page.
function buildSitemap({ siteUrl, sections }) {
  const base = siteUrl.replace(/\/+$/, '');
  const entries = [];

  for (const { key, items } of sections) {
    entries.push(urlEntry(`${base}/${key}/`, null));
    for (const item of items) {
      entries.push(urlEntry(`${base}/${key}/${item.slug}/`, toLastmod(item.editDate)));
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}

module.exports = { buildSitemap };
