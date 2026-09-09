#!/usr/bin/env node
// Prints a markdown summary of generation-log.json entries for a given
// list of article relPaths. Used by the GitHub Action to build the body
// of the pull request it opens after a run scoped to newly added
// articles (see --files-from in generate-images.mjs).
//
// Usage: node scripts/article-images/ci-summary.mjs path/to/added-articles.txt

import fs from 'node:fs/promises';
import { MANIFEST_PATH } from './lib/config.mjs';
import { isArticleFile } from './lib/articles.mjs';
import path from 'node:path';

async function loadFileList(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

async function loadManifest() {
  try {
    return JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  } catch {
    return {};
  }
}

async function main() {
  const listFile = process.argv[2];
  if (!listFile) {
    console.error('Usage: ci-summary.mjs <added-articles-file>');
    process.exitCode = 1;
    return;
  }

  const list = await loadFileList(listFile);
  const manifest = await loadManifest();

  const published = [];
  const flagged = [];
  const missing = [];
  const ignored = [];

  for (const relPath of list) {
    // The workflow's diff is broad on purpose (any .html file added under
    // a topic folder) — a non-article page (Topic-*.html, etc.) can show
    // up here without ever having been processed. Report it separately
    // rather than as a failure.
    if (!isArticleFile(path.basename(relPath))) {
      ignored.push(relPath);
      continue;
    }
    const entry = manifest[relPath];
    if (!entry) {
      missing.push(relPath);
      continue;
    }
    const line = `- **${entry.title}** (\`${relPath}\`)`;
    if (entry.flagged) flagged.push(`${line} — ${entry.flagReason}`);
    else published.push(line);
  }

  const lines = ['### Article image generation summary', ''];

  if (published.length) {
    lines.push('**Auto-linked (ready to merge as-is):**', ...published, '');
  }

  if (flagged.length) {
    lines.push(
      '**Flagged for human review** — images generated but intentionally NOT linked into any ' +
        'page (sitting in `needs-review/`, matching the divorce/inheritance/death/grief rule):',
      ...flagged,
      '',
      'To publish one you approve, run on this branch (or after merging):',
      '```',
      'node scripts/article-images/approve-images.mjs --only <part of the article filename>',
      '```',
      ''
    );
  }

  if (missing.length) {
    lines.push(
      '**No image generated** (failed, or nothing matched — check the workflow log):',
      ...missing.map((f) => `- \`${f}\``),
      ''
    );
  }

  if (ignored.length) {
    lines.push(
      '**Not an article** (skipped — matched a known site-structure filename pattern):',
      ...ignored.map((f) => `- \`${f}\``),
      ''
    );
  }

  if (!published.length && !flagged.length && !missing.length && !ignored.length) {
    lines.push('No new article files were detected in this push.');
  }

  console.log(lines.join('\n'));
}

main();
