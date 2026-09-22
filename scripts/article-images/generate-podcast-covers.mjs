#!/usr/bin/env node
// One-off generator for Podcasts.dc.html's 4 cover-art <image-slot>s.
//
// These aren't article images, so the normal hero/thumb pipeline (real
// people, a specific scene brief from a real article) doesn't apply —
// and unlike an article, this page's own copy is explicit that none of
// the 4 shows have a real name, format or topic yet ("Series title to
// come", "Show title to come", "Details for this show will be added
// soon"). Generating 4 distinct "show-specific" covers would mean
// inventing fake show identities that don't exist. Instead this builds
// one consistent, on-brand abstract podcast-art motif (soundwave /
// microphone, navy/gold/pink palette, no text) with a few compositional
// variations, so the page reads as intentional placeholder art rather
// than a broken image, without claiming to represent real content.
//
// Usage:
//   node scripts/article-images/generate-podcast-covers.mjs --dry-run
//   node scripts/article-images/generate-podcast-covers.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT, OUTPUT_DIR, DEFAULT_MODEL, BRAND } from './lib/config.mjs';
import { loadEnv } from './lib/env.mjs';
import { generateImage } from './lib/gemini.mjs';
import { optimizeImage } from './lib/imageOptimize.mjs';
import { setSlotSrc } from './lib/htmlPatch.mjs';

const COVER_WIDTH = 900;

const STYLE_GUIDE =
  `Abstract podcast cover-art design for Vanessa Stoykov, an Australian financial-wellbeing ` +
  `brand for confident adults. Square 1:1 format, bold and modern, graphic-design style — ` +
  `not a photo of a person. Deep navy blue (${BRAND.navy}) as the dominant background tone, ` +
  `warm gold (${BRAND.gold}) as a bright accent, soft light blue (${BRAND.lightBlue}) and soft ` +
  `dusty pink (${BRAND.softPink}) as gentle supporting tones. Clean, confident, editorial — ` +
  `think a premium finance/life podcast cover, not clip art. No text, no logos, no watermarks, ` +
  `no readable words of any kind.`;

const SLOTS = [
  {
    id: 'podcast-new-series-art',
    outFile: 'podcast-new-series-art.jpg',
    brief:
      'A radiating soundwave pattern in concentric arcs, like ripples from a single point, ' +
      'suggesting a conversation just beginning. Gold accent arcs against the navy field.',
  },
  {
    id: 'podcast-show-1',
    outFile: 'podcast-show-1.jpg',
    brief:
      'An abstract microphone silhouette formed from soft overlapping geometric shapes, ' +
      'centered, with a subtle soft light blue glow behind it.',
  },
  {
    id: 'podcast-show-2',
    outFile: 'podcast-show-2.jpg',
    brief:
      'Layered horizontal soundwave bars of varying heights across the middle of the frame, ' +
      'rendered in soft dusty pink and gold on the navy field, like an audio waveform.',
  },
  {
    id: 'podcast-show-3',
    outFile: 'podcast-show-3.jpg',
    brief:
      'Two overlapping speech-bubble-like rounded shapes suggesting dialogue, in gold and ' +
      'soft light blue, off-center composition with generous negative space.',
  },
];

function parseArgs(argv) {
  return { dryRun: argv.includes('--dry-run') };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnv();
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;

  if (!args.dryRun && !apiKey) {
    console.error('No GEMINI_API_KEY found — see scripts/article-images/README.md.');
    process.exitCode = 1;
    return;
  }

  const outDir = path.join(OUTPUT_DIR, 'podcasts');
  const podcastsHtmlPath = path.join(REPO_ROOT, 'Podcasts.dc.html');
  let html = await fs.readFile(podcastsHtmlPath, 'utf8');

  for (const slot of SLOTS) {
    const prompt = [STYLE_GUIDE, '', `Composition: ${slot.brief}`].join('\n');
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`${slot.id} -> assets/generated/podcasts/${slot.outFile}`);
    if (args.dryRun) {
      console.log(`  [dry-run] prompt:\n    ${prompt.replace(/\n/g, '\n    ')}`);
      continue;
    }

    console.log('  Generating image...');
    const img = await generateImage({
      apiKey,
      model,
      prompt,
      aspectRatio: '1:1',
      imageSize: '1K',
    });
    const bytes = await optimizeImage(img.data, COVER_WIDTH);
    await fs.mkdir(outDir, { recursive: true });
    const outFile = path.join(outDir, slot.outFile);
    await fs.writeFile(outFile, bytes);
    console.log(`  Wrote ${path.relative(REPO_ROOT, outFile)} (${(bytes.length / 1024).toFixed(0)}KB)`);

    const srcValue = `assets/generated/podcasts/${slot.outFile}`;
    const patched = setSlotSrc(html, slot.id, srcValue);
    if (!patched) {
      console.log(`  WARNING: couldn't find image-slot id="${slot.id}" to patch.`);
      continue;
    }
    html = patched;
    console.log(`  Linked into Podcasts.dc.html`);

    await new Promise((r) => setTimeout(r, 1200));
  }

  if (!args.dryRun) {
    await fs.writeFile(podcastsHtmlPath, html);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
