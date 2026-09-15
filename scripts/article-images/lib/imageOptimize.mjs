// Resizes + re-compresses generated images for the web. Gemini's raw
// output runs ~2.5MB per hero image at full resolution — way more than a
// browser needs for a 100%-width banner or a 140px list thumbnail — so
// every image gets downsized and re-encoded here before it ever lands on
// disk (see generate-images.mjs), and optimize-existing-images.mjs applies
// the same treatment retroactively to whatever was generated before this
// existed.
//
// Depends on `sharp` — the same ad-hoc, gitignored dependency
// generate-brand-assets.mjs already needs (see its header comment and the
// README for why the rest of this toolkit stays dependency-free but this
// one capability doesn't): install with `npm install sharp --no-save`.

// Target widths: generous enough to stay crisp on a retina display at the
// size these actually render (hero: full-width banners up to ~1280px CSS
// width on this site's article layout; thumb: a ~140px-wide list row
// image), without shipping resolution nobody's screen will ever use.
export const HERO_MAX_WIDTH = 1600;
export const THUMB_MAX_WIDTH = 640;

// mozjpeg at this quality is where "well under 500KB" and "no visible
// quality loss" both hold in practice for photographic content at these
// widths — verified against real generated images, see
// scripts/article-images/README.md.
const JPEG_QUALITY = 82;

let sharpModule;
async function loadSharp() {
  if (sharpModule) return sharpModule;
  try {
    sharpModule = (await import('sharp')).default;
  } catch {
    throw new Error(
      'Image optimization needs sharp — install it first: npm install sharp --no-save'
    );
  }
  return sharpModule;
}

/**
 * Resize (down only, never up — never-upscale keeps a already-small
 * generated image untouched instead of blurring it) to maxWidth and
 * re-encode as a quality-optimized JPEG. Returns a Buffer.
 */
export async function optimizeImage(buffer, maxWidth) {
  const sharp = await loadSharp();
  return sharp(buffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

export async function optimizeHero(buffer) {
  return optimizeImage(buffer, HERO_MAX_WIDTH);
}

export async function optimizeThumb(buffer) {
  return optimizeImage(buffer, THUMB_MAX_WIDTH);
}
