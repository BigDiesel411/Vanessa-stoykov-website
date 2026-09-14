#!/usr/bin/env node
// Generates the two site-wide fallback images every article and every
// social share references but which never actually existed in the repo:
//
//   assets/og-default.jpg          — default social share card (og:image /
//                                    twitter:image) for articles with no
//                                    image of their own. Exactly 1200x630,
//                                    the standard share-image size.
//   assets/article-placeholder.jpg — generic placeholder shown wherever an
//                                    article's real hero hasn't loaded or
//                                    been generated yet. Same footprint as
//                                    a normal generated hero image.
//
// Unlike the rest of this toolkit, this script needs an image-resize step
// to hit an exact pixel size (Gemini's imageConfig only offers fixed
// aspect ratios + 1K/2K/4K tiers, not arbitrary dimensions), so it depends
// on `sharp` — install it ad hoc before running:
//   npm install sharp --no-save
// (sharp is NOT a dependency of the main article pipeline — this is the
// one script in this directory that needs it.)
//
// Usage: node scripts/article-images/generate-brand-assets.mjs [--dry-run]

import fs from 'node:fs/promises';
import path from 'node:path';

import { REPO_ROOT, DEFAULT_MODEL, BRAND } from './lib/config.mjs';
import { loadEnv } from './lib/env.mjs';
import { generateImage } from './lib/gemini.mjs';

const OG_DEFAULT_PATH = path.join(REPO_ROOT, 'assets', 'og-default.jpg');
const PLACEHOLDER_PATH = path.join(REPO_ROOT, 'assets', 'article-placeholder.jpg');

const OG_PROMPT = [
  `A minimal, professional social-media share card for Vanessa Stoykov, an Australian`,
  `financial-wellbeing personal brand. Solid deep navy blue background (${BRAND.navy}),`,
  `flat and clean with no photo or illustration of people. Centered large bold display`,
  `typography in a tall condensed sans-serif style (like Bebas Neue), all-caps, in`,
  `crisp white: "VANESSA STOYKOV". Beneath it, smaller elegant text reads "Courageous`,
  `Conversations". A thin horizontal gold (${BRAND.gold}) rule sits between the two`,
  `lines as the only accent color besides white and navy. Flat modern graphic design,`,
  `generous negative space, no clutter, no watermark, no additional logos — just the`,
  `typography and the gold rule. High contrast, crisp, professional, trustworthy.`,
].join(' ');

const PLACEHOLDER_PROMPT = [
  `A neutral, elegant placeholder background image for a website article hero, in the`,
  `visual style of an Australian financial-wellbeing brand. Deep navy blue background`,
  `(${BRAND.navy}) with a very subtle abstract geometric pattern or soft gradient`,
  `texture — fine, low-contrast, almost tone-on-tone. No text, no people, no logos, no`,
  `icons that could be mistaken for real content. A soft, understated gold (${BRAND.gold})`,
  `glow or thin accent line in one corner for warmth. Calm, minimal, professional —`,
  `reads clearly as a placeholder waiting to be replaced by a real photo, not as`,
  `finished content itself.`,
].join(' ');

function parseArgs(argv) {
  return { dryRun: argv.includes('--dry-run') };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('og-default.jpg prompt:\n  ' + OG_PROMPT + '\n');
  console.log('article-placeholder.jpg prompt:\n  ' + PLACEHOLDER_PROMPT + '\n');

  if (args.dryRun) {
    console.log('[dry-run] no API calls made, nothing written.');
    return;
  }

  loadEnv();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found — see scripts/article-images/README.md.');
    process.exitCode = 1;
    return;
  }
  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;

  let sharp;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch {
    console.error(
      'This script needs sharp to crop og-default.jpg to an exact 1200x630 — install it first:\n' +
        '  npm install sharp --no-save'
    );
    process.exitCode = 1;
    return;
  }

  console.log('Generating og-default.jpg...');
  const ogImg = await generateImage({
    apiKey,
    model,
    prompt: OG_PROMPT,
    aspectRatio: '16:9', // closest supported ratio to 1200:630 (~1.91:1); cropped to exact size below
    imageSize: '2K',
  });
  await sharp(ogImg.data).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 92 }).toFile(OG_DEFAULT_PATH);
  console.log(`Wrote ${path.relative(REPO_ROOT, OG_DEFAULT_PATH)} (1200x630)`);

  console.log('\nGenerating article-placeholder.jpg...');
  const placeholderImg = await generateImage({
    apiKey,
    model,
    prompt: PLACEHOLDER_PROMPT,
    aspectRatio: '16:9', // matches HERO_IMAGE_CONFIG — same footprint as a real generated hero
    imageSize: '2K',
  });
  await fs.mkdir(path.dirname(PLACEHOLDER_PATH), { recursive: true });
  await fs.writeFile(PLACEHOLDER_PATH, placeholderImg.data);
  console.log(`Wrote ${path.relative(REPO_ROOT, PLACEHOLDER_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
