#!/usr/bin/env node
// One-time (and re-runnable) pass to resize + recompress every already-
// generated hero/thumb image in place, for images that were written
// before generate-images.mjs started optimizing automatically. Filenames
// are never changed — only the bytes at each path — so no article or
// Topic page needs re-patching.
//
// Usage:
//   node scripts/article-images/optimize-existing-images.mjs
//   node scripts/article-images/optimize-existing-images.mjs --dry-run

import fs from 'node:fs/promises';
import path from 'node:path';

import { REPO_ROOT, OUTPUT_DIR, REVIEW_DIR } from './lib/config.mjs';
import { optimizeHero, optimizeThumb } from './lib/imageOptimize.mjs';

function parseArgs(argv) {
  return { dryRun: argv.includes('--dry-run') };
}

async function walkImages(dir) {
  const found = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await walkImages(full)));
    } else if (/-(hero|thumb)\.(jpe?g|png|webp)$/i.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const files = [...(await walkImages(OUTPUT_DIR)), ...(await walkImages(REVIEW_DIR))];
  if (files.length === 0) {
    console.log('No generated images found.');
    return;
  }

  console.log(`Found ${files.length} image(s) to optimize.${args.dryRun ? ' [dry-run]' : ''}\n`);

  let totalBefore = 0;
  let totalAfter = 0;
  let failed = 0;

  for (const file of files) {
    const rel = path.relative(REPO_ROOT, file);
    const isThumb = /-thumb\.[a-z]+$/i.test(file);
    try {
      const before = await fs.readFile(file);
      const after = await (isThumb ? optimizeThumb(before) : optimizeHero(before));
      totalBefore += before.length;
      totalAfter += after.length;
      const pct = (100 * (1 - after.length / before.length)).toFixed(0);
      console.log(
        `${rel}: ${(before.length / 1024).toFixed(0)}KB -> ${(after.length / 1024).toFixed(0)}KB (-${pct}%)`
      );
      if (!args.dryRun) await fs.writeFile(file, after);
    } catch (err) {
      failed += 1;
      console.error(`${rel}: FAILED — ${err.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total: ${(totalBefore / 1024 / 1024).toFixed(1)}MB -> ${(totalAfter / 1024 / 1024).toFixed(1)}MB`);
  if (failed) console.log(`Failed: ${failed}`);
  if (args.dryRun) console.log('[dry-run] nothing written.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
