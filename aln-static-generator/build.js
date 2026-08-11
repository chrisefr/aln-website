// Builds a static page for every record in both layers: fetch full dataset
// (paged) -> resolve fields per record -> fetch attachments -> download/
// resize images -> render -> write file. Both individuals and projects use
// curated templates mirroring ALN's own ArcGIS popup templates exactly (see
// buildIndividualProfile / buildProjectProfile in lib/transform.js). The
// generic field-dump template (buildFieldRows / renderPage) is no longer
// used by either layer but stays available in lib/ in case it's useful
// again later. Deliberately does NOT yet: handle the pending/approved
// status gate.

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { fetchAllRecords, fetchAttachments } = require('./lib/fetch');
const { buildIndividualProfile, buildProjectProfile, slugify } = require('./lib/transform');
const { renderIndividualPage, renderProjectPage, renderIndexPage } = require('./lib/render');
const { polygonAreaSquareMeters } = require('./lib/geo');
const { buildSitemap } = require('./lib/sitemap');
const { downloadAndResize, MAX_WIDTH } = require('./lib/images');
const { mapWithConcurrency } = require('./lib/pool');

// How many records' attachment-fetch+image-resize work runs at once. This
// was previously fully sequential (one record, one image at a time), which
// is what made a full build "take really long" - ~150 images each needing a
// network round-trip plus a resize, one after another. Bounded concurrency
// instead of unlimited parallelism, to stay polite to Esri's attachment
// endpoint rather than firing 100+ requests at once.
const CONCURRENCY = 6;

function newImageStats() {
  return {
    processed: 0,
    cached: 0,
    fresh: 0,
    originalBytes: 0, // sum of pre-resize byte sizes, fresh downloads only
    freshResizedBytes: 0, // sum of post-resize byte sizes, fresh downloads only
    cachedBytes: 0, // sum of on-disk byte sizes reused from a previous build
    failed: 0,
  };
}

function mergeImageStats(a, b) {
  a.processed += b.processed;
  a.cached += b.cached;
  a.fresh += b.fresh;
  a.originalBytes += b.originalBytes;
  a.freshResizedBytes += b.freshResizedBytes;
  a.cachedBytes += b.cachedBytes;
  a.failed += b.failed;
}

function formatMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Curated template for individuals - fixed field selection matching ALN's
// own ArcGIS popup, plus profile image and CV attachment. See
// buildIndividualProfile() in lib/transform.js for the field logic.
async function buildIndividualsLayer() {
  const layerKey = 'individuals';
  const featureServerUrl = config.featureServers[layerKey];
  const { fields, features } = await fetchAllRecords(featureServerUrl);
  console.log(`\n${layerKey}: fetched ${features.length} record(s)`);

  const { appid, layerId } = config.mapLinks[layerKey];
  const usedSlugs = new Set();
  const skipped = [];
  const imageStats = newImageStats();

  // Phase 1 (sequential, cheap): resolve every record's profile + slug in
  // original feature order. Slug collision handling ("first one keeps the
  // clean slug") needs a fixed order to stay deterministic across runs -
  // kept separate from phase 2's concurrency so network scheduling can never
  // change which record wins a slug collision.
  const workItems = [];
  for (const feature of features) {
    const attrs = feature.attributes;
    const objectid = attrs.objectid;

    const profile = buildIndividualProfile(attrs, fields, config.codeLookups);
    if (!profile.name) {
      skipped.push({ objectid, reason: 'no usable title' });
      continue;
    }

    let slug = slugify(profile.name) || `record-${objectid}`;
    if (usedSlugs.has(slug)) slug = `${slug}-${objectid}`;
    usedSlugs.add(slug);

    workItems.push({ attrs, objectid, profile, slug });
  }

  // Phase 2 (concurrent): the actual network-bound work - attachments list,
  // image download+resize, then render+write.
  let done = 0;
  const built = await mapWithConcurrency(workItems, CONCURRENCY, async ({ attrs, objectid, profile, slug }) => {
    const outDir = path.join(config.siteOutputDir, layerKey, slug);
    fs.mkdirSync(outDir, { recursive: true });

    let profileImageUrl = null;
    let profileImageWidth = null;
    let profileImageHeight = null;
    let cvUrl = null;
    let cvName = null;
    try {
      const attachmentsRaw = await fetchAttachments(featureServerUrl, objectid);
      // A handful of individuals records (older Survey123 submissions,
      // confirmed 2026-08-11 - e.g. objectid 6, Olivia Nthoi-Molefe) predate
      // ALN tagging attachments with a "keywords" value at all, so their
      // photo/CV attachments come back with keywords: "" and would otherwise
      // be silently dropped by the strict tag match below. Fall back to the
      // sole image/PDF attachment only when it's unambiguous (exactly one
      // untagged candidate) - with 2+ untagged images/PDFs on a record we
      // can't guess which one is the profile photo/CV, so leave it unset
      // rather than risk picking the wrong file.
      const untaggedImages = attachmentsRaw.filter((a) => !a.keywords && (a.contentType || '').startsWith('image/'));
      const untaggedPdfs = attachmentsRaw.filter((a) => !a.keywords && a.contentType === 'application/pdf');

      const { profileImage: profileImageKeywords, cv: cvKeywords } = config.individualAttachmentKeywords;
      const image =
        attachmentsRaw.find((a) => profileImageKeywords.includes(a.keywords)) ||
        (untaggedImages.length === 1 ? untaggedImages[0] : null);
      const cv =
        attachmentsRaw.find((a) => cvKeywords.includes(a.keywords)) ||
        (untaggedPdfs.length === 1 ? untaggedPdfs[0] : null);

      if (image) {
        const rawUrl = `${featureServerUrl}/0/${objectid}/attachments/${image.id}`;
        try {
          const result = await downloadAndResize(rawUrl, path.join(outDir, 'images'), 'profile', {
            maxWidth: MAX_WIDTH.profile,
          });
          profileImageUrl = `./images/${result.fileName}`;
          profileImageWidth = result.width;
          profileImageHeight = result.height;
          imageStats.processed += 1;
          if (result.cached) {
            imageStats.cached += 1;
            imageStats.cachedBytes += result.bytes;
          } else {
            imageStats.fresh += 1;
            imageStats.originalBytes += result.originalBytes;
            imageStats.freshResizedBytes += result.bytes;
          }
        } catch (err) {
          imageStats.failed += 1;
          console.warn(`  warning: profile image resize failed for objectid ${objectid}: ${err.message}`);
        }
      }

      // CV is a PDF, not an image - left as a direct link to the ArcGIS
      // attachment rather than self-hosted/resized.
      if (cv) {
        cvUrl = `${featureServerUrl}/0/${objectid}/attachments/${cv.id}`;
        cvName = cv.name;
      }
    } catch (err) {
      console.warn(`  warning: attachments fetch failed for objectid ${objectid}: ${err.message}`);
    }

    const mapUrl = `${config.mapBase}?appid=${appid}&layerId=${layerId}&oid=${objectid}`;

    const html = renderIndividualPage({
      ...profile,
      profileImageUrl,
      profileImageWidth,
      profileImageHeight,
      cvUrl,
      cvName,
      objectid,
      mapUrl,
    });

    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

    done += 1;
    if (done % 10 === 0 || done === workItems.length) {
      console.log(`  ${layerKey}: ${done}/${workItems.length} done`);
    }

    return {
      slug,
      title: profile.name,
      objectid,
      country: profile.country || null,
      editDate: attrs.EditDate,
    };
  });

  console.log(`${layerKey}: wrote ${built.length} page(s), skipped ${skipped.length}`);
  if (skipped.length) {
    for (const s of skipped) console.log(`  skipped objectid ${s.objectid}: ${s.reason}`);
  }
  return { built, imageStats };
}

// Curated template for projects - mirrors ALN's Arcade-driven popup exactly,
// including the geodesic area calculation. See buildProjectProfile() in
// lib/transform.js for the field logic and lib/geo.js for the area
// calculation.
async function buildProjectsLayer() {
  const layerKey = 'projects';
  const featureServerUrl = config.featureServers[layerKey];
  const { fields, features } = await fetchAllRecords(featureServerUrl);
  console.log(`\n${layerKey}: fetched ${features.length} record(s)`);

  const allowedKeywords = new Set(config.publicAttachmentKeywords[layerKey] || []);
  const { appid, layerId } = config.mapLinks[layerKey];
  const usedSlugs = new Set();
  const skipped = [];
  const imageStats = newImageStats();

  // Phase 1 (sequential, cheap) - see buildIndividualsLayer for why this is
  // kept separate from phase 2's concurrency.
  const workItems = [];
  for (const feature of features) {
    const attrs = feature.attributes;
    const objectid = attrs.objectid;

    const areaM2 = polygonAreaSquareMeters(feature.geometry);
    const profile = buildProjectProfile(attrs, fields, config.codeLookups, areaM2);
    if (!profile.name) {
      skipped.push({ objectid, reason: 'no usable title' });
      continue;
    }

    let slug = slugify(profile.name) || `record-${objectid}`;
    if (usedSlugs.has(slug)) slug = `${slug}-${objectid}`;
    usedSlugs.add(slug);

    workItems.push({ attrs, objectid, profile, slug });
  }

  // Phase 2 (concurrent): attachments list, image download+resize (a
  // project can have several gallery images, so these run concurrently with
  // each other too, not just across records), then render+write.
  let done = 0;
  const built = await mapWithConcurrency(workItems, CONCURRENCY, async ({ attrs, objectid, profile, slug }) => {
    const outDir = path.join(config.siteOutputDir, layerKey, slug);
    fs.mkdirSync(outDir, { recursive: true });

    let attachments = [];
    try {
      const attachmentsRaw = await fetchAttachments(featureServerUrl, objectid);
      // Audited 2026-08-11: 8 of 44 projects (35 photos total, 4 of them
      // left with an entirely empty gallery) have real cover photos that
      // came through with keywords: "" instead of
      // "project_cover_images_and_graphi" and were being silently dropped by
      // a strict keyword match. Unlike the individuals layer's single
      // profile photo/CV, a project's gallery already expects multiple
      // images, so there's no "which one is it" ambiguity to resolve here -
      // any untagged image attachment is included alongside the tagged
      // ones. Still content-type gated so the one stray untagged PDF seen on
      // this layer doesn't get treated as a gallery image.
      const imageAttachments = attachmentsRaw.filter(
        (a) =>
          allowedKeywords.has(a.keywords) ||
          (!a.keywords && (a.contentType || '').startsWith('image/'))
      );

      const results = await Promise.all(
        imageAttachments.map(async (a) => {
          const rawUrl = `${featureServerUrl}/0/${objectid}/attachments/${a.id}`;
          try {
            const result = await downloadAndResize(rawUrl, path.join(outDir, 'images'), `image-${a.id}`, {
              maxWidth: MAX_WIDTH.gallery,
            });
            imageStats.processed += 1;
            if (result.cached) {
              imageStats.cached += 1;
              imageStats.cachedBytes += result.bytes;
            } else {
              imageStats.fresh += 1;
              imageStats.originalBytes += result.originalBytes;
              imageStats.freshResizedBytes += result.bytes;
            }
            return {
              name: a.name,
              contentType: a.contentType,
              url: `./images/${result.fileName}`,
              width: result.width,
              height: result.height,
            };
          } catch (err) {
            imageStats.failed += 1;
            console.warn(`  warning: image resize failed for objectid ${objectid}, attachment ${a.id}: ${err.message}`);
            return null;
          }
        })
      );
      attachments = results.filter(Boolean);
    } catch (err) {
      console.warn(`  warning: attachments fetch failed for objectid ${objectid}: ${err.message}`);
    }

    const mapUrl = `${config.mapBase}?appid=${appid}&layerId=${layerId}&oid=${objectid}`;

    const html = renderProjectPage({
      ...profile,
      attachments,
      objectid,
      mapUrl,
    });

    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

    done += 1;
    if (done % 10 === 0 || done === workItems.length) {
      console.log(`  ${layerKey}: ${done}/${workItems.length} done`);
    }

    return {
      slug,
      title: profile.name,
      objectid,
      country: profile.country || null,
      editDate: attrs.EditDate,
    };
  });

  console.log(`${layerKey}: wrote ${built.length} page(s), skipped ${skipped.length}`);
  if (skipped.length) {
    for (const s of skipped) console.log(`  skipped objectid ${s.objectid}: ${s.reason}`);
  }
  return { built, imageStats };
}

function writeIndexPage(layerKey, { title, description, items }) {
  const html = renderIndexPage({ title, description, items });
  const outDir = path.join(config.siteOutputDir, layerKey);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  console.log(`${layerKey}: wrote index page listing ${items.length} entries`);
}

async function main() {
  const individualsResult = await buildIndividualsLayer();
  const projectsResult = await buildProjectsLayer();
  const individuals = individualsResult.built;
  const projects = projectsResult.built;

  const imageStats = newImageStats();
  mergeImageStats(imageStats, individualsResult.imageStats);
  mergeImageStats(imageStats, projectsResult.imageStats);

  writeIndexPage('individuals', {
    title: 'Individuals',
    description:
      'People in the African Landscape Network — landscape architects, researchers, and practitioners working across the African continent.',
    items: individuals,
  });

  writeIndexPage('projects', {
    title: 'Projects',
    description:
      'Landscape projects hosted on the African Landscape Network, spanning design, research, and conservation work across Africa.',
    items: projects,
  });

  const sitemapXml = buildSitemap({
    siteUrl: config.siteUrl,
    sections: [
      { key: 'individuals', items: individuals },
      { key: 'projects', items: projects },
    ],
  });
  fs.writeFileSync(path.join(config.siteOutputDir, 'sitemap.xml'), sitemapXml, 'utf8');
  console.log(`sitemap: wrote sitemap.xml (${individuals.length + projects.length + 2} URLs) using siteUrl "${config.siteUrl}"`);
  if (config.siteUrl.includes('REPLACE-ME')) {
    console.log('  NOTE: config.siteUrl is still a placeholder - update it to the real domain before deploying, then rebuild.');
  }

  console.log(
    `\nimages: ${imageStats.processed} processed (${imageStats.fresh} downloaded+resized, ${imageStats.cached} reused from a previous build), ${imageStats.failed} failed`
  );
  if (imageStats.fresh > 0) {
    const pct = 100 * (1 - imageStats.freshResizedBytes / imageStats.originalBytes);
    console.log(
      `images: this run's fresh downloads: originals ${formatMB(imageStats.originalBytes)} -> resized ${formatMB(imageStats.freshResizedBytes)} (${pct.toFixed(0)}% smaller)`
    );
  }

  console.log(`\nTotal: ${individuals.length} individuals + ${projects.length} projects = ${individuals.length + projects.length} detail pages, plus 2 index pages, plus 1 sitemap`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
