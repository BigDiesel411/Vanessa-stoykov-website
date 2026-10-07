#!/usr/bin/env node
// One-off generator for the case-study portrait <image-slot>s across the
// 3 "Flourishing After 50" episode pages (Episode-*-....dc.html).
//
// Like the VSP character portraits (see generate-vsp-characters.mjs), these
// depict made-up case-study people used to illustrate each episode's topic
// (Megan in episode 1, Mark in episode 2, Cathy & John in episode 3) — not
// real people, so the normal real-photo-only caution doesn't apply. This
// script does NOT touch the real guests' photo slots (Chelsea, Andrea,
// Harry) or any episode banner/hero image — those are out of scope and are
// left exactly as they are.
//
// Usage:
//   node scripts/article-images/generate-fa50-casestudies.mjs --dry-run
//   node scripts/article-images/generate-fa50-casestudies.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT, OUTPUT_DIR, DEFAULT_MODEL } from './lib/config.mjs';
import { loadEnv } from './lib/env.mjs';
import { STYLE_GUIDE } from './lib/prompt.mjs';
import { generateImage } from './lib/gemini.mjs';
import { optimizeImage } from './lib/imageOptimize.mjs';
import { setSlotSrc } from './lib/htmlPatch.mjs';
import { relHref } from './lib/paths.mjs';

const PORTRAIT_WIDTH = 900;

const TONE_NOTE =
  'This is a fictional case-study person used to illustrate this episode, not a real person — a ' +
  'warm, relatable editorial portrait that matches how this scene brief describes them. ' +
  'Photorealistic, tightly-cropped square portrait, head and shoulders, natural Australian light, ' +
  'contemporary setting suited to their situation. No text, no logos, no watermarks.';

const CASE_STUDIES = [
  {
    id: 'fa50-ep1-megan',
    file: 'Episode-1-Debt-And-Money-Stress.dc.html',
    outFile: 'fa50-ep1-megan.jpg',
    brief:
      'Megan: 54 years old, feeling like her life has unravelled since her marriage ended. Debt has ' +
      'piled up, bills have gone unpaid, and the pressure has left her feeling too ashamed to ask ' +
      'for help. She avoids her friends and hides her struggles from her adult kids. A quiet, ' +
      'thoughtful moment, warmth with an undercurrent of worry and exhaustion.',
  },
  {
    id: 'fa50-ep2-mark',
    file: 'Episode-2-Starting-Over-After-Divorce.dc.html',
    outFile: 'fa50-ep2-mark.jpg',
    brief:
      'Mark: 54 years old, adjusting to life after a 26-year marriage. He rents a small unit that ' +
      "doesn't feel like home for his teenage kids, and he worries about whether he can ever afford " +
      'to buy again. A capable, decent dad trying to rebuild with some security and dignity, but ' +
      'with a hint of quiet worry underneath.',
  },
  {
    id: 'fa50-ep3-cathyjohn',
    file: 'Episode-3-Helping-Adult-Children.dc.html',
    outFile: 'fa50-ep3-cathyjohn.jpg',
    brief:
      'Cathy and John: a married couple in their late fifties (58), proud homeowners with no ' +
      'mortgage, comfortable and settled. Portrait of the two of them together, warm and close, ' +
      'thinking over a big decision about helping their adult daughter buy a home — content and ' +
      'at ease with each other, with a touch of thoughtful concern.',
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

  const outDir = path.join(OUTPUT_DIR, 'fa50');

  for (const cs of CASE_STUDIES) {
    const filePath = path.join(REPO_ROOT, cs.file);
    const prompt = [STYLE_GUIDE, '', `Case study: ${cs.brief}`, '', TONE_NOTE].join('\n');

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`${cs.id} (${cs.file}) -> assets/generated/fa50/${cs.outFile}`);

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
    const bytes = await optimizeImage(img.data, PORTRAIT_WIDTH);
    await fs.mkdir(outDir, { recursive: true });
    const outFile = path.join(outDir, cs.outFile);
    await fs.writeFile(outFile, bytes);
    console.log(`  Wrote ${path.relative(REPO_ROOT, outFile)} (${(bytes.length / 1024).toFixed(0)}KB)`);

    const html = await fs.readFile(filePath, 'utf8');
    const patched = setSlotSrc(html, cs.id, relHref(filePath, outFile));
    if (!patched) {
      console.log(`  WARNING: couldn't find image-slot id="${cs.id}" in ${cs.file} to patch.`);
      continue;
    }
    await fs.writeFile(filePath, patched);
    console.log(`  Linked into ${cs.file}`);

    await new Promise((r) => setTimeout(r, 1200));
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
