#!/usr/bin/env node
// Generates the second/body image for articles that use the older
// <image-slot id="...-mid"> mechanism instead of the newer
// <figure data-image-target="...-mid.jpg"> one (see generate-mid-images.mjs
// for that mechanism's equivalent). Same brand style, same Gemini model,
// same 16:9/2K sizing as a hero image — this only fills in non-hero
// <image-slot> entries whose id ends in "-mid" and have no src yet.
//
// Usage:
//   node scripts/article-images/generate-mid-slot-images.mjs --dry-run
//   node scripts/article-images/generate-mid-slot-images.mjs --topic adultchildren
//   node scripts/article-images/generate-mid-slot-images.mjs --only DrawTheLine

import fs from 'node:fs/promises';
import path from 'node:path';

import { REPO_ROOT, OUTPUT_DIR, REVIEW_DIR, DEFAULT_MODEL, HERO_IMAGE_CONFIG } from './lib/config.mjs';
import { loadEnv } from './lib/env.mjs';
import { discoverArticles, parseArticle } from './lib/articles.mjs';
import { assessSensitivity } from './lib/review.mjs';
import { buildHeroPrompt } from './lib/prompt.mjs';
import { generateImage } from './lib/gemini.mjs';
import { optimizeHero } from './lib/imageOptimize.mjs';
import { setSlotSrc } from './lib/htmlPatch.mjs';
import { relHref } from './lib/paths.mjs';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const args = { dryRun: false, force: false, only: null, topic: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--force') args.force = true;
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--topic') args.topic = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`
Generate the second body image for articles using an unfilled
<image-slot id="...-mid"> (as opposed to the newer -mid.jpg figure
mechanism, which generate-mid-images.mjs already covers).

Options:
  --dry-run             Build prompts and print what would happen; no API calls, no writes.
  --only <substring>    Only process articles whose relPath contains this string.
  --topic <name>        Only process one topic folder.
  --force               Regenerate even if the target image file already exists.
  --help                Show this message.
`);
}

async function processMidSlot({ article, parsed, slot, apiKey, model, args }) {
  const sensitivity = assessSensitivity(article.topic, `${parsed.title} ${parsed.bodyText}`);
  const baseDir = sensitivity.flagged ? REVIEW_DIR : OUTPUT_DIR;
  const outDir = path.join(baseDir, article.topic);
  const slug = article.file.replace(/\.dc\.html$/, '').replace(/\.html$/, '');
  const outFile = path.join(outDir, `${slug}-mid.jpg`);

  const alreadyExists = await fs.access(outFile).then(() => true).catch(() => false);

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`${article.relPath}  [slot: ${slot.id}]`);
  console.log(`  Scene brief: ${slot.placeholder || '(none)'}`);
  console.log(`  Review status: ${sensitivity.flagged ? `FLAGGED — ${sensitivity.reason}` : 'auto-publish'}`);

  const prompt = buildHeroPrompt({ title: parsed.title, topic: article.topic, hero: slot });

  if (args.dryRun) {
    console.log(`  [dry-run] prompt:\n    ${prompt.replace(/\n/g, '\n    ')}`);
    return 'dry-run';
  }

  if (alreadyExists && !args.force) {
    console.log('  Skipped (already generated — pass --force to regenerate).');
    return 'skipped';
  }

  await fs.mkdir(outDir, { recursive: true });
  console.log('  Generating image...');
  const img = await generateImage({
    apiKey,
    model,
    prompt,
    aspectRatio: HERO_IMAGE_CONFIG.aspectRatio,
    imageSize: HERO_IMAGE_CONFIG.imageSize,
  });
  const bytes = await optimizeHero(img.data);
  await fs.writeFile(outFile, bytes);
  console.log(`  Wrote ${path.relative(REPO_ROOT, outFile)} (${(bytes.length / 1024).toFixed(0)}KB)`);

  if (!sensitivity.flagged) {
    const html = await fs.readFile(article.absPath, 'utf8');
    const patched = setSlotSrc(html, slot.id, relHref(article.absPath, outFile));
    if (patched) {
      await fs.writeFile(article.absPath, patched);
      console.log(`  Linked into ${article.relPath}`);
    } else {
      console.log(`  WARNING: couldn't find a matching <image-slot id="${slot.id}"> to patch — check the markup.`);
    }
  } else {
    console.log('  Not wired into the article — sitting in needs-review/ for a human check.');
  }

  return sensitivity.flagged ? 'flagged' : 'published';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  loadEnv();
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;

  if (!args.dryRun && !apiKey) {
    console.error('No GEMINI_API_KEY found — see scripts/article-images/README.md.');
    process.exitCode = 1;
    return;
  }

  let articles = await discoverArticles();
  if (args.topic) articles = articles.filter((a) => a.topic === args.topic);
  if (args.only) articles = articles.filter((a) => a.relPath.includes(args.only));

  const results = { published: 0, flagged: 0, skipped: 0, dryRun: 0, failed: 0 };
  const failures = [];
  let slotCount = 0;

  for (const article of articles) {
    const parsed = await parseArticle(article.absPath);
    const midSlots = parsed.others.filter((s) => s.id.endsWith('-mid') && !s.hasSrc);
    if (!midSlots.length) continue;
    for (const slot of midSlots) {
      slotCount++;
      try {
        const status = await processMidSlot({ article, parsed, slot, apiKey, model, args });
        results[status === 'dry-run' ? 'dryRun' : status] += 1;
        if (!args.dryRun) await sleep(1200);
      } catch (err) {
        console.error(`  ERROR: ${err.message}`);
        results.failed += 1;
        failures.push({ article: article.relPath, slot: slot.id, error: err.message });
      }
    }
  }

  if (slotCount === 0) {
    console.log('No unfilled -mid <image-slot> entries found in the matched articles.');
    return;
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log('Summary:');
  console.log(`  Published (auto-linked):     ${results.published}`);
  console.log(`  Flagged for review:          ${results.flagged}`);
  console.log(`  Skipped (already generated): ${results.skipped}`);
  console.log(`  Dry-run previewed:           ${results.dryRun}`);
  console.log(`  Failed:                      ${results.failed}`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f.article} (${f.slot}): ${f.error}`);
  }
  if (results.flagged) {
    console.log(`\nImages needing human review are in: ${path.relative(REPO_ROOT, REVIEW_DIR)}/`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
