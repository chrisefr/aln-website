function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// HTML collapses whitespace, so a source string's blank-line paragraph
// breaks (e.g. Survey123 long-text answers) silently vanish unless we turn
// them into real <p> tags. Splits on blank lines for paragraphs, and turns
// any remaining single newlines within a paragraph into <br>.
function renderMultilineText(str) {
  const paragraphs = String(str)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return '';
  return paragraphs
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function renderPage({ kind, title, description, objectid, rows, attachments, mapUrl }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': kind,
    name: title,
    description,
  };

  const rowsHtml = rows
    .map(
      (r) =>
        `      <dt>${escapeHtml(r.label)}</dt>\n      <dd>${renderMultilineText(r.value)}</dd>`
    )
    .join('\n');

  const attachmentsHtml = attachments.length
    ? `  <section>
    <h2>Images</h2>
${attachments
  .map(
    (a) =>
      `    <img src="${escapeHtml(a.url)}" alt="${escapeHtml(title)}" style="max-width:100%;height:auto;margin:0.5rem 0;">`
  )
  .join('\n')}
  </section>\n`
    : '';

  // NOTE (scaffold): images are linked at full original size/resolution here.
  // We already confirmed one project photo was 8.5MB - resizing/optimizing
  // is a deliberately deferred step, not done in this scaffold.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — African Landscape Network</title>
<meta name="description" content="${escapeHtml(description)}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
<article>
  <h1>${escapeHtml(title)}</h1>
${renderMultilineText(description)}
${attachmentsHtml}  <section>
    <h2>Details</h2>
    <dl>
${rowsHtml}
    </dl>
  </section>
  <p><a href="${escapeHtml(mapUrl)}">View on map (objectid ${objectid}) →</a></p>
</article>
</body>
</html>
`;
}

// Turns a name into up to 2 uppercase initials, for the avatar shown in
// place of a profile photo (e.g. "Amara Ndlovu" -> "AN").
function initialsFromName(name) {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Individuals detail page - matches the Individual.dc.html template
// designed in Claude Design (project fdb15054-19cf-432e-b9f1-acd5267d2613),
// implemented here with plain string templating instead of that project's
// dc-runtime (x-dc/sc-if/sc-for), which is design-canvas-only tooling and
// doesn't ship. Every section is conditional on the record actually having
// that data - unlike the old scaffold, a section with nothing to show is
// omitted rather than rendered blank.
function renderIndividualPage({
  name,
  professionalStatus,
  about,
  countryOfPractice,
  tertiaryQualifications,
  nationality,
  languages,
  sectorsOfWork,
  institutions,
  biographyLink,
  profileImageUrl,
  profileImageWidth,
  profileImageHeight,
  cvUrl,
  mapUrl,
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    description: about,
  };
  if (profileImageUrl) jsonLd.image = profileImageUrl;

  const imageDims =
    profileImageWidth && profileImageHeight
      ? ` width="${profileImageWidth}" height="${profileImageHeight}"`
      : '';
  const photoHtml = profileImageUrl
    ? `<img src="${escapeHtml(profileImageUrl)}" alt="${escapeHtml(name)}"${imageDims}>`
    : `<div class="entry-avatar">${escapeHtml(initialsFromName(name))}</div>`;

  const practiceRows = [
    ['Country of practice', countryOfPractice],
    ['Nationality', nationality],
    ['Tertiary qualifications', tertiaryQualifications],
    ['Language proficiency', languages],
  ].filter(([, value]) => value);

  const practiceRowsHtml = practiceRows
    .map(([label, value]) => `        <dt>${escapeHtml(label)}</dt>\n        <dd>${escapeHtml(value)}</dd>`)
    .join('\n');

  const sectors = String(sectorsOfWork || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const sectorsHtml = sectors.map((s) => `          <span class="chip">${escapeHtml(s)}</span>`).join('\n');

  const institutionsHtml = institutions
    .map((line) => `          <li>${escapeHtml(line)}</li>`)
    .join('\n');

  const aboutHtml = about ? renderMultilineText(about) : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(name)} — African Landscape Network</title>
<meta name="description" content="${escapeHtml(about)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Public+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>

  <div class="site-v2">

  <header class="site-header">
    <div class="site-header-inner">
      <a href="/index.html" class="brand">
        <span class="brand-mark">ALN</span>
        <span class="brand-name">African Landscape Network</span>
      </a>
      <nav class="site-nav">
        <a href="/index.html">Home</a>
        <a href="/index.html#individuals">Individuals &amp; Entities</a>
        <a href="/index.html#projects">Projects Map</a>
        <a href="/filters.html">Filters</a>
        <a href="/about.html">About</a>
        <a href="/individuals/" class="active">Individuals (static)</a>
        <a href="/projects/">Projects (static)</a>
      </nav>
      <button class="menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false" aria-controls="mobileNav">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>

  <div class="mobile-nav" id="mobileNav">
    <div class="mobile-nav-top">
      <button class="mobile-nav-close" id="mobileNavClose" aria-label="Close menu">&times;</button>
    </div>
    <nav class="mobile-nav-links">
      <a href="/index.html">Home</a>
      <a href="/index.html#individuals">Individuals &amp; Entities Map</a>
      <a href="/index.html#projects">Projects Map</a>
      <a href="/filters.html">Filters</a>
      <a href="/about.html">About</a>
      <a href="/individuals/" class="active">Individuals (static)</a>
      <a href="/projects/">Projects (static)</a>
    </nav>
  </div>

  <div class="page-hero entry-hero">
    <div class="section-inner">
      <div class="entry-head">
        <div class="entry-photo">${photoHtml}</div>
        <div class="entry-head-text">
          <p class="eyebrow">Individuals &amp; Entities</p>
          <h1>${escapeHtml(name)}</h1>
${professionalStatus ? `          <p class="role">${escapeHtml(professionalStatus)}</p>\n` : ''}        </div>
      </div>
    </div>
  </div>

  <section class="section entry-body" id="profile">
    <div class="section-inner">
      <div class="entry-grid">

        <div>
${aboutHtml ? `          <div class="detail-card">
            <h3>About</h3>
${aboutHtml}
          </div>\n` : ''}${practiceRows.length ? `          <div class="detail-card">
            <h3>Practice details</h3>
            <dl class="detail-row">
${practiceRowsHtml}
            </dl>
          </div>\n` : ''}${sectors.length ? `          <div class="detail-card">
            <h3>Sectors of work</h3>
            <div class="chip-row">
${sectorsHtml}
            </div>
          </div>\n` : ''}${institutions.length ? `          <div class="detail-card">
            <h3>Member of other institutions</h3>
            <ul class="plain">
${institutionsHtml}
            </ul>
          </div>\n` : ''}${biographyLink ? `          <p class="entry-source">Extended biography: <a href="${escapeHtml(biographyLink)}" target="_blank" rel="noopener">${escapeHtml(biographyLink)}</a></p>\n` : ''}
        </div>

        <aside>
          <div class="detail-card entry-actions">
            <h3>This profile</h3>
${cvUrl ? `            <a class="btn-outline" href="${escapeHtml(cvUrl)}">Download CV</a>\n` : ''}            <a class="btn" href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener">View on Interactive Map</a>
          </div>
        </aside>

      </div>
    </div>
  </section>

  <footer class="site-footer">
    <div class="site-footer-inner">
      <div class="footer-brand">
        <span class="brand-mark">ALN</span>
        <p>A platform connecting landscape-focused individuals, entities and projects across Africa.</p>
      </div>
      <div class="footer-col">
        <p class="footer-heading">Navigate</p>
        <a href="/index.html">Home</a>
        <a href="/index.html#individuals">Individuals &amp; Entities Map</a>
        <a href="/index.html#projects">Projects Map</a>
        <a href="/filters.html">Filters</a>
        <a href="/about.html">About</a>
      </div>
      <div class="footer-col">
        <p class="footer-heading">Contact</p>
        <a href="mailto:aln@iflaworld.org">aln@iflaworld.org</a>
        <p class="footer-orgs">IFLA &middot; IFLA Africa &middot; ICOMOS &middot; ICOMOS&ndash;ISCCL &middot; UNESCO</p>
      </div>
    </div>
    <div class="site-footer-bottom">African Landscape Network</div>
  </footer>

  </div>

  <script>
    (function(){
      var btn = document.getElementById('menuBtn');
      var panel = document.getElementById('mobileNav');
      var closeBtn = document.getElementById('mobileNavClose');
      function openMenu(){ panel.classList.add('open'); btn.setAttribute('aria-expanded','true'); }
      function closeMenu(){ panel.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
      btn.addEventListener('click', openMenu);
      closeBtn.addEventListener('click', closeMenu);
      Array.prototype.slice.call(panel.querySelectorAll('a')).forEach(function(a){
        a.addEventListener('click', closeMenu);
      });
      var mq = window.matchMedia('(min-width:1100px)');
      mq.addEventListener('change', function(e){ if (e.matches) closeMenu(); });
    })();
  </script>

</body>
</html>
`;
}

// Turns a '\n'-joined list (e.g. from buildNewlineList in lib/transform.js)
// into <br>-separated HTML.
function linesToHtml(str) {
  return String(str)
    .split('\n')
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join('<br>');
}

// Curated projects page - mirrors ALN's own Arcade-driven popup template
// exactly (see buildProjectProfile in lib/transform.js for where each value
// comes from and which Arcade expression it reproduces). Every section is
// always present (even blank) to match that template's structure; images are
// conditional since not every record has one.
function renderProjectPage({
  name,
  areaText,
  boundaryStatus,
  boundarySuffix,
  synopsis,
  relevantLink,
  statusText,
  completionYear,
  projectBudget,
  focusText,
  landscapeApplication,
  initiatedBy,
  nameOfClient,
  designedBy,
  entityName,
  alcList,
  alcSummary,
  sdgList,
  sdgSummary,
  recognition,
  recognitionDetail,
  recognitionLink,
  imagesReference,
  attachments,
  objectid,
  mapUrl,
}) {
  const description = String(synopsis || '').slice(0, 300);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name,
    description,
  };

  const attachmentsHtml = attachments.length
    ? `  <section>
    <h2>Images</h2>
${attachments
  .map((a) => {
    const dims = a.width && a.height ? ` width="${a.width}" height="${a.height}"` : '';
    return `    <img src="${escapeHtml(a.url)}" alt="${escapeHtml(name)}"${dims} style="max-width:100%;height:auto;margin:0.5rem 0;">`;
  })
  .join('\n')}
  </section>\n`
    : '';

  const relevantLinkHtml = relevantLink
    ? `<a href="${escapeHtml(relevantLink)}">${escapeHtml(relevantLink)}</a>`
    : '';
  const recognitionLinkHtml = recognitionLink
    ? `<a href="${escapeHtml(recognitionLink)}">${escapeHtml(recognitionLink)}</a>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(name)} — African Landscape Network</title>
<meta name="description" content="${escapeHtml(description)}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
<article>
  <h1>${escapeHtml(name)}</h1>
  <p>The area of the project is: <strong>${escapeHtml(areaText)}</strong>, and the boundary drawn is <strong>${escapeHtml(boundaryStatus)}</strong>${escapeHtml(boundarySuffix)}</p>
  <p><strong>Synopsis: </strong>${escapeHtml(synopsis)}<br>${relevantLinkHtml}</p>
  <p><strong>Project status:</strong> ${escapeHtml(statusText)} ${escapeHtml(String(completionYear))}  ${escapeHtml(projectBudget)}</p>
  <p><strong>Project focus:</strong> ${escapeHtml(focusText)}<br><strong>Landscape application:</strong> ${escapeHtml(landscapeApplication)}</p>
  <p><strong>Initiated or funded by:</strong> ${escapeHtml(initiatedBy)} entity<br><strong>Name of client:</strong> ${escapeHtml(nameOfClient)}</p>
  <p><strong>Designed/ created/ assessed by ${escapeHtml(designedBy)}: </strong>${escapeHtml(entityName)}</p>
  <p><strong>The project supports the following ALC principles:</strong><br>${linesToHtml(alcList)}</p>
  <p><strong>Summary of ALC principles that is supported within the project: </strong><br>${escapeHtml(alcSummary)}</p>
  <p><strong>The project supports the following SDG principles:</strong><br>${linesToHtml(sdgList)}</p>
  <p><strong>Summary of SDG principles that is supported within the project: </strong><br>${escapeHtml(sdgSummary)}</p>
  <p><strong>Formal recognition or designation of project:</strong> ${escapeHtml(recognition)}</p>
  <p>${escapeHtml(recognitionDetail)} ${recognitionLinkHtml}</p>
  <p><strong>References to images and graphics:</strong> ${escapeHtml(imagesReference)}</p>
${attachmentsHtml}  <p><a href="${escapeHtml(mapUrl)}">View on map (objectid ${objectid}) →</a></p>
</article>
</body>
</html>
`;
}

// The index/browse page for a whole layer. Deliberately not linked from the
// site's main nav (per the site-structure decision - the map is the intended
// human browse path) but this is the real crawl path for search engines:
// plain anchor text links to every generated detail page, not just entries
// in the sitemap.
function renderIndexPage({ title, description, items }) {
  const sorted = [...items].sort((a, b) => a.title.localeCompare(b.title));

  const itemsHtml = sorted
    .map((item) => {
      const suffix = item.country ? ` — ${escapeHtml(item.country)}` : '';
      return `    <li><a href="./${escapeHtml(item.slug)}/">${escapeHtml(item.title)}</a>${suffix}</li>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — African Landscape Network</title>
<meta name="description" content="${escapeHtml(description)}">
</head>
<body>
<article>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <ul>
${itemsHtml}
  </ul>
</article>
</body>
</html>
`;
}

module.exports = { renderPage, renderIndividualPage, renderProjectPage, renderIndexPage };
