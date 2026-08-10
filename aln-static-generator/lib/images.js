// Downloads ArcGIS attachment images at build time and writes resized,
// re-encoded local copies instead of hotlinking the (sometimes huge - one
// project photo was seen at 8.5MB) originals directly from Esri's servers.
// Self-hosting also means the site doesn't depend on Esri's attachment
// endpoint staying up/public for its own images to render.
const fs = require('fs');
const path = require('path');
const { fetchWithRetry: fetch } = require('./http');

// This generator originally lived inside a Google-Drive-synced folder,
// where `npm install sharp` hung indefinitely (the virtual filesystem
// driver choked on npm's burst of small file writes - a plain single file
// write was fine, but the install itself never finished). The project has
// since moved to a plain local path/git repo where `npm install` just
// works normally, but this fallback is left in place: if `sharp` isn't in
// this project's own node_modules for any reason, it'll also check
// ALN_LOCAL_DEPS (or C:\Personal\alntemp, the workaround folder used during
// that migration) before giving up.
const LOCAL_DEPS_FALLBACK = process.env.ALN_LOCAL_DEPS || 'C:\\Personal\\alntemp';
let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  const fallbackPath = path.join(LOCAL_DEPS_FALLBACK, 'node_modules', 'sharp');
  if (fs.existsSync(fallbackPath)) {
    sharp = require(fallbackPath);
  } else {
    throw new Error(
      `Could not load "sharp" (${err.message}). Run "npm install" inside aln-static-generator/.`
    );
  }
}

// Displayed at max-width:320px in CSS (individuals profile photo) - 640 is
// 2x for retina without shipping a needlessly huge file.
// Gallery/project images are shown at full article width, so get more room.
const MAX_WIDTH = {
  profile: 640,
  gallery: 1600,
};
const JPEG_QUALITY = 80;

// Downloads `url`, resizes to `maxWidth` (never upscales), and re-encodes
// into `outDir/${baseName}.{jpg|webp}`. If a previous build already
// produced a file starting with `${baseName}.`, that's reused as-is (no
// re-download, no re-encode) - cache key is the baseName, not any content
// hash, so a changed attachment behind the same baseName needs its cached
// file deleted manually (attachments only ever grow/replace on ALN's side,
// not something this generator needs to detect automatically).
//
// Format choice: plain JPEG unless the source has *genuine* transparency
// (some pixel with alpha < 255) - many of ALN's source photos carry an
// alpha channel that's uniformly opaque (an export-tool artifact, not an
// intentional design choice), which would otherwise force lossless PNG for
// photographic content and produce multi-MB "resized" files that are
// barely smaller than the originals. Real transparency goes to lossy WebP
// instead of PNG, for the same reason - much smaller for the same content,
// alpha-capable, and universally supported by modern browsers.
async function downloadAndResize(url, outDir, baseName, { maxWidth }) {
  fs.mkdirSync(outDir, { recursive: true });

  const existing = fs.readdirSync(outDir).find((f) => f.startsWith(`${baseName}.`));
  if (existing) {
    const outPath = path.join(outDir, existing);
    const meta = await sharp(outPath).metadata();
    const bytes = fs.statSync(outPath).size;
    return { fileName: existing, width: meta.width, height: meta.height, bytes, originalBytes: null, cached: true };
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Attachment fetch failed (${res.status} ${res.statusText}) for ${url}`);
  }
  const originalBuf = Buffer.from(await res.arrayBuffer());

  // .rotate() with no args reads the EXIF orientation tag and bakes it into
  // the pixel data, since we strip EXIF (incl. orientation) below by not
  // asking sharp to keep it - without this, sideways/upside-down originals
  // would render sideways/upside-down once metadata is gone.
  const image = sharp(originalBuf).rotate();
  const sourceMeta = await image.metadata();
  const resized = image.resize({ width: maxWidth, withoutEnlargement: true });

  let ext, outputBuf;
  if (sourceMeta.hasAlpha) {
    const stats = await resized.clone().stats();
    const alphaChannel = stats.channels[stats.channels.length - 1];
    const isEffectivelyOpaque = alphaChannel.min === 255;

    if (isEffectivelyOpaque) {
      ext = 'jpg';
      outputBuf = await resized.clone().removeAlpha().jpeg({ quality: JPEG_QUALITY, progressive: true }).toBuffer();
    } else {
      ext = 'webp';
      outputBuf = await resized.clone().webp({ quality: JPEG_QUALITY }).toBuffer();
    }
  } else {
    ext = 'jpg';
    outputBuf = await resized.jpeg({ quality: JPEG_QUALITY, progressive: true }).toBuffer();
  }

  const fileName = `${baseName}.${ext}`;
  fs.writeFileSync(path.join(outDir, fileName), outputBuf);

  const finalMeta = await sharp(outputBuf).metadata();
  return {
    fileName,
    width: finalMeta.width,
    height: finalMeta.height,
    bytes: outputBuf.length,
    originalBytes: originalBuf.length,
    cached: false,
  };
}

module.exports = { downloadAndResize, MAX_WIDTH };
