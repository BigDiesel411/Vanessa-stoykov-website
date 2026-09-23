#!/usr/bin/env node
// One-off generator for the 6 "fictional character" <image-slot>s across
// The Vanessa Stoykov Podcast's 5 episode pages (VSP-Episode-*.dc.html).
//
// These boxes depict made-up case-study characters from Vanessa's novel
// "The Breakfast Club for 40-Somethings" (Karen & Russ in episode 1,
// Jasper in episode 2, Jane in episode 3, Josie in episode 4, Brad in
// episode 5) — not real people, so the normal real-photo-only caution
// doesn't apply here. Each box previously held a hand-styled monogram
// placeholder (a solid-colour square with a single giant initial letter)
// rather than an <image-slot>; that markup was already swapped for a
// real <image-slot> by hand before this script runs, so all this does is
// generate a photorealistic portrait for each character — using their
// own already-written bio on the page as the scene brief — and wire it
// in, same brand style and pipeline (Gemini model, prompt.mjs's
// STYLE_GUIDE, imageOptimize) as every other real-person editorial photo
// on the site.
//
// Usage:
//   node scripts/article-images/generate-vsp-characters.mjs --dry-run
//   node scripts/article-images/generate-vsp-characters.mjs

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
  'This is a fictional case-study character from a novel, not a real person — a warm, ' +
  'relatable editorial portrait that matches how this scene brief describes them. Photorealistic, ' +
  'tightly-cropped square portrait or close waist-up shot, natural Australian light, contemporary ' +
  'setting suited to their situation. No text, no logos, no watermarks.';

const CHARACTERS = [
  {
    id: 'vsp-ep1-char-karen',
    file: 'VSP-Episode-1-The-Power-Of-Time.dc.html',
    outFile: 'vsp-char-karen.jpg',
    brief:
      'Karen: a busy mum of three in her mid 40s, starting to realise her kids are growing up and ' +
      'she has been left behind — her husband has his career, her kids have their own worlds, and ' +
      'it has been a long time since she thought about anything for herself. A quiet, thoughtful ' +
      'moment at home, warmth with a touch of wistfulness.',
  },
  {
    id: 'vsp-ep1-char-russ',
    file: 'VSP-Episode-1-The-Power-Of-Time.dc.html',
    outFile: 'vsp-char-russ.jpg',
    brief:
      "Russ: Karen's husband, a great dad and provider in his mid-to-late 40s, but someone who has " +
      "let his career take priority and hasn't made his wife's fulfilment a focus of the marriage. " +
      'Capable, a little guarded, a man comfortable at work but not quite present at home.',
  },
  {
    id: 'vsp-ep2-char-jasper',
    file: 'VSP-Episode-2-The-Power-Of-Focus.dc.html',
    outFile: 'vsp-char-jasper.jpg',
    brief:
      'Jasper: a good-time guy in his mid 40s who never really grew up — the likeable larrikin who ' +
      'has lived from job to job and party to party and has moved back in with his mum. Charming ' +
      'and easygoing on the surface, casual dress, a bit of a rogue, but with a hint underneath of ' +
      'not quite having it together.',
  },
  {
    id: 'vsp-ep3-char-jane',
    file: 'VSP-Episode-3-The-Power-Of-Belief.dc.html',
    outFile: 'vsp-char-jane.jpg',
    brief:
      'Jane: a bubbly, fun mother of twin 8-year-old girls, mid 40s and divorced. A qualified lawyer ' +
      'working part-time in-house so she can be there for her kids. Warm, a little tired but still ' +
      'hopeful — about love, and about her own financial future.',
  },
  {
    id: 'vsp-ep4-char-josie',
    file: 'VSP-Episode-4-Desires-And-Choices.dc.html',
    outFile: 'vsp-char-josie.jpg',
    brief:
      'Josie: a successful business owner running a multi-million-dollar communications and events ' +
      'business, mid 40s, never married. Polished, sharp, confident professional style — a woman ' +
      'used to being in charge of a room, with a guardedness underneath about love and money.',
  },
  {
    id: 'vsp-ep5-char-brad',
    file: 'VSP-Episode-5-Action.dc.html',
    outFile: 'vsp-char-brad.jpg',
    brief:
      'Brad: a tech entrepreneur in his mid-to-late 40s who left Australia for Silicon Valley and ' +
      'built a wildly successful global start-up, now worth billions. Polished, confident, ' +
      'expensive-casual style befitting a tech founder — but with a quiet undertone of isolation, ' +
      'someone who dates but never quite commits.',
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

  const outDir = path.join(OUTPUT_DIR, 'vsp');

  for (const char of CHARACTERS) {
    const filePath = path.join(REPO_ROOT, char.file);
    const prompt = [STYLE_GUIDE, '', `Character: ${char.brief}`, '', TONE_NOTE].join('\n');

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`${char.id} (${char.file}) -> assets/generated/vsp/${char.outFile}`);

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
    const outFile = path.join(outDir, char.outFile);
    await fs.writeFile(outFile, bytes);
    console.log(`  Wrote ${path.relative(REPO_ROOT, outFile)} (${(bytes.length / 1024).toFixed(0)}KB)`);

    const html = await fs.readFile(filePath, 'utf8');
    const patched = setSlotSrc(html, char.id, relHref(filePath, outFile));
    if (!patched) {
      console.log(`  WARNING: couldn't find image-slot id="${char.id}" in ${char.file} to patch.`);
      continue;
    }
    await fs.writeFile(filePath, patched);
    console.log(`  Linked into ${char.file}`);

    await new Promise((r) => setTimeout(r, 1200));
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
