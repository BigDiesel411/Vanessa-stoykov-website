#!/usr/bin/env node
// Generates extra body images (the `-mid.jpg` figure that comes after the
// hero, further down a long article) — same brand style, same Gemini
// model, same 16:9/2K sizing as a hero image, just wired into a second
// <figure data-image-target="..."> instead of the first.
//
// generate-images.mjs owns the hero + thumbnail for each article and
// skips it once those exist; this script is deliberately separate (same
// precedent as generate-brand-assets.mjs) so it can't accidentally
// re-trigger hero/thumb generation, and so a mid image's own "already
// generated" check is independent of the hero's.
//
// Usage:
//   node scripts/article-images/generate-mid-images.mjs --dry-run
//   node scripts/article-images/generate-mid-images.mjs --files-from mid-batch.txt
//   node scripts/article-images/generate-mid-images.mjs --only bank-of-mum-and-dad

import fs from 'node:fs/promises';
import path from 'node:path';

import { REPO_ROOT, OUTPUT_DIR, REVIEW_DIR, DEFAULT_MODEL, HERO_IMAGE_CONFIG } from './lib/config.mjs';
import { loadEnv } from './lib/env.mjs';
import { discoverArticles, parseArticle } from './lib/articles.mjs';
import { assessSensitivity } from './lib/review.mjs';
import { buildHeroPrompt } from './lib/prompt.mjs';
import { generateImage } from './lib/gemini.mjs';
import { optimizeHero } from './lib/imageOptimize.mjs';
import { setFigureImageSrc } from './lib/htmlPatch.mjs';
import { relHref } from './lib/paths.mjs';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const args = { dryRun: false, force: false, only: null, filesFrom: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--force') args.force = true;
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--files-from') args.filesFrom = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

async function loadFileList(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return new Set(
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
  );
}

function printHelp() {
  console.log(`
Generate extra body ("-mid.jpg" style) images for articles that have more
than one <figure data-image-target="..."> — the hero (first figure) is
left alone; this only fills in the second-and-later figures.

Options:
  --dry-run             Build prompts and print what would happen; no API calls, no writes.
  --only <substring>    Only process articles whose relPath contains this string.
  --files-from <path>   Only process articles whose relPath appears in this newline-delimited file.
  --force               Regenerate even if the target image file already exists.
  --help                Show this message.
`);
}

async function processFigure({ article, figure, index, apiKey, model, args }) {
  const parsed = await parseArticle(article.absPath);
  const sensitivity = assessSensitivity(article.topic, `${parsed.title} ${parsed.bodyText}`);
  const baseDir = sensitivity.flagged ? REVIEW_DIR : OUTPUT_DIR;
  const outDir = path.join(baseDir, article.topic);
  const outFile = path.join(outDir, figure.heroTarget);

  const alreadyExists = await fs.access(outFile).then(() => true).catch(() => false);

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`${article.relPath}  [figure ${index + 1}: ${figure.heroTarget}]`);
  console.log(`  Scene brief: ${figure.placeholder || '(none)'}`);
  console.log(`  Review status: ${sensitivity.flagged ? `FLAGGED — ${sensitivity.reason}` : 'auto-publish'}`);

  const prompt = buildHeroPrompt({ title: parsed.title, topic: article.topic, hero: figure });

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
    const patched = setFigureImageSrc(html, figure.heroTarget, relHref(article.absPath, outFile));
    if (patched) {
      await fs.writeFile(article.absPath, patched);
      console.log(`  Linked into ${article.relPath}`);
    } else {
      console.log(`  WARNING: couldn't find a matching figure to patch — check the markup.`);
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
  if (args.only) articles = articles.filter((a) => a.relPath.includes(args.only));
  if (args.filesFrom) {
    const wanted = await loadFileList(args.filesFrom);
    articles = articles.filter((a) => wanted.has(a.relPath));
  }

  const results = { published: 0, flagged: 0, skipped: 0, dryRun: 0, failed: 0 };
  const failures = [];
  let figureCount = 0;

  for (const article of articles) {
    const parsed = await parseArticle(article.absPath);
    if (!parsed.extraFigures.length) continue;
    for (let i = 0; i < parsed.extraFigures.length; i++) {
      figureCount++;
      try {
        const status = await processFigure({ article, figure: parsed.extraFigures[i], index: i, apiKey, model, args });
        results[status === 'dry-run' ? 'dryRun' : status] += 1;
        if (!args.dryRun) await sleep(1200);
      } catch (err) {
        console.error(`  ERROR: ${err.message}`);
        results.failed += 1;
        failures.push({ article: article.relPath, figure: parsed.extraFigures[i].heroTarget, error: err.message });
      }
    }
  }

  if (figureCount === 0) {
    console.log('No extra (non-hero) figures found in the matched articles.');
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
    for (const f of failures) console.log(`  - ${f.article} (${f.figure}): ${f.error}`);
  }
  if (results.flagged) {
    console.log(`\nImages needing human review are in: ${path.relative(REPO_ROOT, REVIEW_DIR)}/`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
