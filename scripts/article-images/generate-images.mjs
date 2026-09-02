#!/usr/bin/env node
// Generates hero + thumbnail images for the site's articles using Google's
// Gemini image model ("Nano Banana Pro" / gemini-3-pro-image), styled to
// the brand palette, and wires the results into the relevant .dc.html
// files — unless the article is flagged for human review first.
//
// Usage:
//   node scripts/article-images/generate-images.mjs --dry-run
//   node scripts/article-images/generate-images.mjs --only SavingsToLife
//   node scripts/article-images/generate-images.mjs --topic retirement
//   node scripts/article-images/generate-images.mjs               # everything
//
// See scripts/article-images/README.md for full setup instructions,
// including exactly where to put your GEMINI_API_KEY.

import fs from 'node:fs/promises';
import path from 'node:path';

import {
  REPO_ROOT,
  OUTPUT_DIR,
  REVIEW_DIR,
  MANIFEST_PATH,
  DEFAULT_MODEL,
  HERO_IMAGE_CONFIG,
  THUMB_IMAGE_CONFIG,
} from './lib/config.mjs';
import { loadEnv } from './lib/env.mjs';
import { discoverArticles, parseArticle } from './lib/articles.mjs';
import { buildThumbMap } from './lib/topicPages.mjs';
import { assessSensitivity } from './lib/review.mjs';
import { buildHeroPrompt, buildThumbPrompt } from './lib/prompt.mjs';
import { generateImage, extensionForMime } from './lib/gemini.mjs';
import { setSlotSrc } from './lib/htmlPatch.mjs';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const args = { dryRun: false, force: false, limit: Infinity, only: null, topic: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--force') args.force = true;
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--topic') args.topic = argv[++i];
    else if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  console.log(`
Generate hero + thumbnail images for articles via Gemini (gemini-3-pro-image).

Options:
  --dry-run          Build prompts and print what would happen; no API calls, no writes.
  --only <substring>  Only process articles whose file path contains this string.
  --topic <name>      Only process one topic folder (divorce, retirement, inheritance,
                       moneymindset, relationships, adultchildren, ageingparents).
  --limit <n>          Process at most n articles.
  --force              Regenerate even if hero/thumb images already exist for an article.
  --help               Show this message.

Examples:
  node scripts/article-images/generate-images.mjs --dry-run
  node scripts/article-images/generate-images.mjs --only SavingsToLife --force
  node scripts/article-images/generate-images.mjs --topic retirement
`);
}

async function loadManifest() {
  try {
    return JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  } catch {
    return {};
  }
}

async function saveManifest(manifest) {
  await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

function relHref(fromFile, toFile) {
  const rel = path.relative(path.dirname(fromFile), toFile);
  return rel.split(path.sep).join('/');
}

async function processArticle({ article, thumbMap, manifest, args, apiKey, model }) {
  const parsed = await parseArticle(article.absPath);
  const sensitivity = assessSensitivity(article.topic, `${parsed.title} ${parsed.bodyText}`);
  const baseDir = sensitivity.flagged ? REVIEW_DIR : OUTPUT_DIR;
  const slug = article.file.replace(/\.dc\.html$/, '');
  const outDir = path.join(baseDir, article.topic);

  const manifestKey = article.relPath;
  const prior = manifest[manifestKey];

  const alreadyDone =
    !args.force &&
    prior?.heroPath &&
    prior?.thumbPath &&
    (await fs
      .access(path.join(REPO_ROOT, prior.heroPath))
      .then(() => true)
      .catch(() => false));

  const heroPrompt = buildHeroPrompt({ title: parsed.title, topic: article.topic, hero: parsed.hero });
  const thumbPrompt = buildThumbPrompt({ title: parsed.title, topic: article.topic, hero: parsed.hero });

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`${article.relPath}`);
  console.log(`  Title: ${parsed.title}`);
  console.log(`  Hero slot: ${parsed.hero ? parsed.hero.id : '(none found)'}`);
  console.log(`  Review status: ${sensitivity.flagged ? `FLAGGED — ${sensitivity.reason}` : 'auto-publish'}`);

  if (args.dryRun) {
    console.log(`  [dry-run] hero prompt:\n    ${heroPrompt.replace(/\n/g, '\n    ')}`);
    console.log(`  [dry-run] thumb prompt:\n    ${thumbPrompt.replace(/\n/g, '\n    ')}`);
    return { status: 'dry-run' };
  }

  if (alreadyDone) {
    console.log('  Skipped (already generated — pass --force to regenerate).');
    return { status: 'skipped' };
  }

  await fs.mkdir(outDir, { recursive: true });

  console.log('  Generating hero image...');
  const heroImg = await generateImage({
    apiKey,
    model,
    prompt: heroPrompt,
    aspectRatio: HERO_IMAGE_CONFIG.aspectRatio,
    imageSize: HERO_IMAGE_CONFIG.imageSize,
  });
  const heroFile = path.join(outDir, `${slug}-hero.${extensionForMime(heroImg.mimeType)}`);
  await fs.writeFile(heroFile, heroImg.data);
  console.log(`  Wrote ${path.relative(REPO_ROOT, heroFile)}`);

  await sleep(1200);

  console.log('  Generating thumbnail image...');
  const thumbImg = await generateImage({
    apiKey,
    model,
    prompt: thumbPrompt,
    aspectRatio: THUMB_IMAGE_CONFIG.aspectRatio,
    imageSize: THUMB_IMAGE_CONFIG.imageSize,
  });
  const thumbFile = path.join(outDir, `${slug}-thumb.${extensionForMime(thumbImg.mimeType)}`);
  await fs.writeFile(thumbFile, thumbImg.data);
  console.log(`  Wrote ${path.relative(REPO_ROOT, thumbFile)}`);

  const patchedFiles = new Set();

  if (!sensitivity.flagged) {
    // Wire the hero image into the article's own hero slot.
    if (parsed.hero) {
      const html = await fs.readFile(article.absPath, 'utf8');
      const patched = setSlotSrc(html, parsed.hero.id, relHref(article.absPath, heroFile));
      if (patched) {
        await fs.writeFile(article.absPath, patched);
        patchedFiles.add(article.relPath);
        console.log(`  Linked hero into ${article.relPath} (slot ${parsed.hero.id})`);
      }
    }

    // Wire thumb (and any featured -hero banner) into topic-listing pages.
    const refs = thumbMap.get(article.absPath) || [];
    for (const ref of refs) {
      const html = await fs.readFile(ref.topicPageFile, 'utf8');
      const useHero = ref.slotId.endsWith('-hero');
      const target = useHero ? heroFile : thumbFile;
      const patched = setSlotSrc(html, ref.slotId, relHref(ref.topicPageFile, target));
      if (patched) {
        await fs.writeFile(ref.topicPageFile, patched);
        const label = path.relative(REPO_ROOT, ref.topicPageFile);
        patchedFiles.add(label);
        console.log(`  Linked ${useHero ? 'hero' : 'thumb'} into ${label} (slot ${ref.slotId})`);
      }
    }
  } else {
    console.log('  Not wired into any page — sitting in needs-review/ for a human check.');
  }

  manifest[manifestKey] = {
    title: parsed.title,
    topic: article.topic,
    flagged: sensitivity.flagged,
    flagReason: sensitivity.reason,
    heroPath: path.relative(REPO_ROOT, heroFile),
    thumbPath: path.relative(REPO_ROOT, thumbFile),
    patchedFiles: [...patchedFiles],
    model,
    generatedAt: new Date().toISOString(),
  };

  return { status: sensitivity.flagged ? 'flagged' : 'published' };
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
    console.error(`
No GEMINI_API_KEY found.

Set it before running this script for real:
  1. Get a key at https://aistudio.google.com/apikey
  2. Copy scripts/article-images/.env.example to .env in the repo root
  3. Open .env and paste your key: GEMINI_API_KEY=your-key-here
  4. Save, then re-run this command.

(You can preview what the script will do without a key using --dry-run.)
`);
    process.exitCode = 1;
    return;
  }

  let articles = await discoverArticles();
  if (args.topic) articles = articles.filter((a) => a.topic === args.topic);
  if (args.only) articles = articles.filter((a) => a.relPath.includes(args.only));
  articles = articles.slice(0, args.limit);

  if (articles.length === 0) {
    console.log('No matching articles found.');
    return;
  }

  console.log(`Found ${articles.length} article(s) to process. Model: ${model}`);

  const thumbMap = await buildThumbMap();
  const manifest = await loadManifest();
  const results = { published: 0, flagged: 0, skipped: 0, dryRun: 0, failed: 0 };
  const failures = [];

  for (const article of articles) {
    try {
      const { status } = await processArticle({ article, thumbMap, manifest, args, apiKey, model });
      results[status === 'dry-run' ? 'dryRun' : status] += 1;
      if (!args.dryRun) await saveManifest(manifest); // persist progress as we go
      if (!args.dryRun) await sleep(1200);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      results.failed += 1;
      failures.push({ article: article.relPath, error: err.message });
    }
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
    for (const f of failures) console.log(`  - ${f.article}: ${f.error}`);
  }
  if (results.flagged) {
    console.log(`\nImages needing human review are in: ${path.relative(REPO_ROOT, REVIEW_DIR)}/`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
