#!/usr/bin/env node
// Promotes images sitting in needs-review/ into the live site, once a
// human has actually looked at them and signed off. Moves the files into
// assets/generated/ and wires them into the same slots
// generate-images.mjs would have used automatically for a non-flagged
// article — the article's own hero slot, plus the matching thumbnail
// (and featured banner, where one exists) on its Topic page.
//
// Usage:
//   node scripts/article-images/approve-images.mjs               # approve everything pending
//   node scripts/article-images/approve-images.mjs --only Survive
//   node scripts/article-images/approve-images.mjs --topic divorce
//   node scripts/article-images/approve-images.mjs --dry-run

import fs from 'node:fs/promises';
import path from 'node:path';

import { REPO_ROOT, OUTPUT_DIR, MANIFEST_PATH } from './lib/config.mjs';
import { parseArticle } from './lib/articles.mjs';
import { buildThumbMap } from './lib/topicPages.mjs';
import { setSlotSrc } from './lib/htmlPatch.mjs';
import { relHref } from './lib/paths.mjs';

function parseArgs(argv) {
  const args = { dryRun: false, only: null, topic: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--topic') args.topic = argv[++i];
  }
  return args;
}

async function loadManifest() {
  try {
    return JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  } catch {
    return {};
  }
}

async function saveManifest(manifest) {
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

async function moveIntoOutputDir(fromRelPath, outDir) {
  const from = path.join(REPO_ROOT, fromRelPath);
  const to = path.join(outDir, path.basename(fromRelPath));
  await fs.mkdir(outDir, { recursive: true });
  await fs.rename(from, to);
  return to;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = await loadManifest();
  const thumbMap = await buildThumbMap();

  let entries = Object.entries(manifest).filter(([, e]) => e.flagged);
  if (args.topic) entries = entries.filter(([, e]) => e.topic === args.topic);
  if (args.only) entries = entries.filter(([key]) => key.includes(args.only));

  if (entries.length === 0) {
    console.log('Nothing pending approval.');
    return;
  }

  console.log(`Approving ${entries.length} article(s) previously flagged for review...`);

  for (const [relPath, entry] of entries) {
    const articleAbs = path.join(REPO_ROOT, relPath);
    console.log(`\n${relPath} — ${entry.title}`);
    console.log(`  Was flagged: ${entry.flagReason}`);

    if (args.dryRun) {
      console.log(`  [dry-run] would move ${entry.heroPath} and ${entry.thumbPath} into assets/generated/${entry.topic}/`);
      console.log('  [dry-run] would link hero + thumb into the article and its topic page');
      continue;
    }

    const outDir = path.join(OUTPUT_DIR, entry.topic);
    const heroFile = await moveIntoOutputDir(entry.heroPath, outDir);
    const thumbFile = await moveIntoOutputDir(entry.thumbPath, outDir);

    const parsed = await parseArticle(articleAbs);
    const patchedFiles = new Set();

    if (parsed.hero) {
      const html = await fs.readFile(articleAbs, 'utf8');
      const patched = setSlotSrc(html, parsed.hero.id, relHref(articleAbs, heroFile));
      if (patched) {
        await fs.writeFile(articleAbs, patched);
        patchedFiles.add(relPath);
        console.log(`  Linked hero into ${relPath} (slot ${parsed.hero.id})`);
      }
    }

    const refs = thumbMap.get(articleAbs) || [];
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

    manifest[relPath] = {
      ...entry,
      flagged: false,
      flagReason: null,
      heroPath: path.relative(REPO_ROOT, heroFile),
      thumbPath: path.relative(REPO_ROOT, thumbFile),
      patchedFiles: [...patchedFiles],
      approvedAt: new Date().toISOString(),
    };
    await saveManifest(manifest);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
