import fs from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT, TOPICS } from './config.mjs';

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

// Filenames under a topic folder that are never articles, regardless of
// which naming convention future articles use. Add to this list rather
// than tightening the article match itself — new patterns like
// "stop-saying-im-bad-with-money.html" should still count as articles.
const NON_ARTICLE_PATTERNS = [
  /^Topic-.*\.html$/i, // per-topic index/listing pages (Topic-Divorce.dc.html, etc.)
];

/** Any .html file in a topic folder is an article unless it's a known
 *  site-structure page (topic index pages, etc.) or a hidden/dotfile. */
export function isArticleFile(filename) {
  if (filename.startsWith('.')) return false;
  if (!/\.html$/i.test(filename)) return false;
  return !NON_ARTICLE_PATTERNS.some((re) => re.test(filename));
}

/** Find every article file under each topic folder. */
export async function discoverArticles() {
  const articles = [];
  for (const topic of TOPICS) {
    const dir = path.join(REPO_ROOT, topic);
    let entries;
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue; // topic folder missing entirely — skip it
    }
    for (const file of entries.sort()) {
      if (isArticleFile(file)) {
        const absPath = path.join(dir, file);
        articles.push({ topic, file, absPath, relPath: path.join(topic, file) });
      }
    }
  }
  return articles;
}

/** Turn a filename into a readable fallback title: hyphens/underscores to
 *  spaces, title-cased — used only when no title markup is found at all. */
function titleFromFilename(absPath) {
  const base = path.basename(absPath).replace(/\.dc\.html$/i, '').replace(/\.html$/i, '');
  return base
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Try several title conventions, from the site's own design-canvas
 *  template down to a filename-derived guess, so a differently-authored
 *  article (different naming style, not built with the canvas tool)
 *  still gets a usable title for image prompts. */
function extractTitle(html, absPath) {
  const dcMatch = html.match(/ARTICLE<\/div>\s*<h2[^>]*>(.*?)<\/h2>/s);
  if (dcMatch) return stripTags(dcMatch[1]);

  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/is);
  if (h1Match) return stripTags(h1Match[1]);

  const titleTagMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
  if (titleTagMatch) return stripTags(titleTagMatch[1]);

  const h2Match = html.match(/<h2[^>]*>(.*?)<\/h2>/is);
  if (h2Match) return stripTags(h2Match[1]);

  return titleFromFilename(absPath);
}

/** Scope keyword scanning to the actual article body, not the shared nav
 *  and footer (which link to every topic, including "Divorce", and would
 *  otherwise false-positive every single article). Tries the site's own
 *  design-canvas template markers first, then falls back to generic
 *  <main>/<article>...<footer> boundaries for a differently-built page,
 *  and finally the whole page if neither is found. */
function extractBodyText(html) {
  const dcMarker = '<section style="padding:72px 24px 0;">';
  let start = html.indexOf(dcMarker);

  if (start === -1) {
    const mainMatch = html.match(/<(main|article)[ >]/i);
    if (mainMatch) start = mainMatch.index;
  }

  const footerMatch = html.match(/<footer[ >]/i);
  const footerStart = footerMatch ? footerMatch.index : -1;

  const bodyHtml =
    start !== -1 && footerStart !== -1 && footerStart > start
      ? html.slice(start, footerStart)
      : start !== -1
        ? html.slice(start)
        : html;

  return stripTags(bodyHtml);
}

/**
 * Parse one article file: title, every <image-slot> (id + placeholder
 * caption written by whoever built the page — a ready-made scene brief),
 * and the full plain-text body for keyword scanning.
 */
export async function parseArticle(absPath) {
  const html = await fs.readFile(absPath, 'utf8');

  const title = extractTitle(html, absPath);

  const slots = [];
  const slotRe = /<image-slot\s+([^>]*?)>/g;
  let m;
  while ((m = slotRe.exec(html))) {
    const attrs = m[1];
    const idMatch = attrs.match(/\bid="([^"]*)"/);
    const placeholderMatch = attrs.match(/\bplaceholder="([^"]*)"/);
    if (!idMatch) continue;
    slots.push({
      id: idMatch[1],
      placeholder: placeholderMatch ? decodeEntities(placeholderMatch[1]) : '',
      hasSrc: /\bsrc="[^"]*"/.test(attrs),
    });
  }

  const hero = slots.find((s) => s.id.endsWith('-hero')) || null;
  const others = slots.filter((s) => s !== hero);
  const bodyText = extractBodyText(html);

  return { absPath, title, slots, hero, others, bodyText, html };
}
