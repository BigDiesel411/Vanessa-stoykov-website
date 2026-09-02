import fs from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT, TOPICS } from './config.mjs';

/** Every Topic-*.dc.html file: some live at repo root, divorce/inheritance
 *  keep theirs inside their own topic folder. */
async function discoverTopicPages() {
  const files = [];
  const rootEntries = await fs.readdir(REPO_ROOT);
  for (const f of rootEntries) {
    if (/^Topic-.*\.dc\.html$/.test(f)) files.push(path.join(REPO_ROOT, f));
  }
  for (const topic of TOPICS) {
    const dir = path.join(REPO_ROOT, topic);
    let entries;
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const f of entries) {
      if (/^Topic-.*\.dc\.html$/.test(f)) files.push(path.join(dir, f));
    }
  }
  return files;
}

/**
 * Build a map from absolute article path -> list of {topicPageFile, slotId}
 * for every place that article is referenced with an <image-slot> nearby
 * (row thumbnails, and the "latest article" featured banner). Topic pages
 * link to articles with paths relative to their own directory, so hrefs are
 * resolved against each topic page's dirname before being used as map keys.
 */
export async function buildThumbMap() {
  const map = new Map();
  const topicPages = await discoverTopicPages();

  for (const topicPageFile of topicPages) {
    const html = await fs.readFile(topicPageFile, 'utf8');
    const dir = path.dirname(topicPageFile);
    const anchorRe = /<a\s+href="([^"]+\.dc\.html)"[^>]*>(.*?)<\/a>/gs;
    let m;
    while ((m = anchorRe.exec(html))) {
      const href = m[1];
      const block = m[2];
      const slotMatch = block.match(/<image-slot\s+id="([^"]+)"/);
      if (!slotMatch) continue;
      const articleAbs = path.resolve(dir, href);
      const entry = { topicPageFile, slotId: slotMatch[1] };
      if (!map.has(articleAbs)) map.set(articleAbs, []);
      map.get(articleAbs).push(entry);
    }
  }

  return map;
}
