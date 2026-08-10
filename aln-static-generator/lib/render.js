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

// Curated individuals page - fixed field order matching ALN's own popup
// template, not a generic field dump. Every section is always present (even
// blank) to match that template's structure; only the image and CV are
// conditional, since not every record has one.
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
  cvName,
  objectid,
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
  const imageHtml = profileImageUrl
    ? `  <img src="${escapeHtml(profileImageUrl)}" alt="${escapeHtml(name)}"${imageDims} style="max-width:320px;width:100%;height:auto;margin:0.5rem 0;">\n`
    : '';

  const institutionsHtml = institutions.length
    ? institutions.map((line) => escapeHtml(line)).join('<br>')
    : '';

  const biographyLinkHtml = biographyLink
    ? `<a href="${escapeHtml(biographyLink)}">${escapeHtml(biographyLink)}</a>`
    : '';

  const cvHtml = cvUrl
    ? `  <p><strong>CV:</strong><br><a href="${escapeHtml(cvUrl)}">${escapeHtml(cvName || 'Download CV')}</a></p>\n`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(name)} — African Landscape Network</title>
<meta name="description" content="${escapeHtml(about)}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
<article>
  <h1>${escapeHtml(name)}</h1>
${imageHtml}  <p><strong>${escapeHtml(professionalStatus)}</strong></p>
${renderMultilineText(about)}
  <p>${escapeHtml(countryOfPractice)}</p>
  <p>${escapeHtml(tertiaryQualifications)}</p>
  <p><strong>Nationality:</strong> ${escapeHtml(nationality)}</p>
  <p><strong>Language proficiency:</strong><br>${escapeHtml(languages)}</p>
  <p><strong>Sectors of work:</strong><br>${escapeHtml(sectorsOfWork)}</p>
  <p><strong>Member of other institutions:</strong><br>${institutionsHtml}</p>
  <p><strong>Biography link:</strong><br>${biographyLinkHtml}</p>
${cvHtml}  <p><a href="${escapeHtml(mapUrl)}">View on map (objectid ${objectid}) →</a></p>
</article>
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
